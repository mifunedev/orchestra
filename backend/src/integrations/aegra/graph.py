from deepagents.backends import CompositeBackend, StateBackend
from langgraph_sdk import Auth
from langchain_core.runnables import RunnableConfig

from src.agents import init_graph
from src.integrations.aegra import authority
from src.integrations.aegra.auth import Options
from src.integrations.aegra.mcp_backend import AuthenticatedMcpSandboxBackend
from src.schemas.contexts import ContextSchema
from src.services.prompt.defaults import get_default_system_prompt


def state_backend(runtime):
    return CompositeBackend(default=StateBackend(runtime), routes={})


def mcp_backend(runtime):
    return CompositeBackend(default=AuthenticatedMcpSandboxBackend(), routes={})


async def sandbox_backend():
    data = await authority.request("GET", "/api/settings", authority.current().headers)
    defaults = data.get("defaults") if isinstance(data, dict) else None
    if not isinstance(defaults, dict):
        raise Auth.exceptions.HTTPException(status_code=502, detail="Invalid Orchestra settings response")
    selection = defaults.get("sandbox")
    if selection in (None, "state", "auto"):
        return state_backend
    if selection == "mcp":
        if not isinstance(defaults.get("mcp_sandbox_url"), str) or not defaults["mcp_sandbox_url"].strip():
            raise Auth.exceptions.HTTPException(status_code=422, detail="MCP Sandbox URL is not configured")
        return mcp_backend
    raise Auth.exceptions.HTTPException(status_code=422, detail="Unsupported Aegra sandbox selection")


async def graph(config: RunnableConfig):
    session = authority.current()
    configurable = config.get("configurable", {})
    user = configurable.get("langgraph_auth_user")
    if user is not None and user.identity != session.identity:
        raise PermissionError("Orchestra identity mismatch")
    options = Options.model_validate({key: configurable[key] for key in ("model", "tools") if key in configurable})
    backend = await sandbox_backend()
    available = await authority.catalog() if options.tools else {}
    tools = []
    for name in options.tools:
        if name not in available:
            raise PermissionError("Unknown or unauthorized Orchestra tool")
        tools.append(authority.tool_proxy(available[name]))
    return init_graph(
        model=options.model,
        tools=tools,
        subagents=[],
        system_prompt=get_default_system_prompt(),
        context_schema=ContextSchema,
        middleware=[],
        backend=backend,
    )
