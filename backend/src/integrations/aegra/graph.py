from deepagents.backends import CompositeBackend, StateBackend
from langchain_core.runnables import RunnableConfig

from src.agents import init_graph
from src.integrations.aegra import authority
from src.integrations.aegra.auth import Options
from src.schemas.contexts import ContextSchema
from src.services.prompt.defaults import get_default_system_prompt


def state_backend(runtime):
    return CompositeBackend(default=StateBackend(runtime), routes={})


async def graph(config: RunnableConfig):
    session = authority.current()
    configurable = config.get("configurable", {})
    user = configurable.get("langgraph_auth_user")
    if user is not None and user.identity != session.identity:
        raise PermissionError("Orchestra identity mismatch")
    options = Options.model_validate({key: configurable[key] for key in ("model", "tools") if key in configurable})
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
        backend=state_backend,
    )
