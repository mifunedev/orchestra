from typing import Callable, Optional, Dict, Type
from langchain_core.tools import StructuredTool
from langchain_core.tools import BaseTool, tool as create_tool
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt
from langgraph.prebuilt.interrupt import HumanInterruptConfig, HumanInterrupt
from pydantic import BaseModel
from src.utils.api import APIClient
from src.schemas.contexts import ContextSchema
from langgraph.runtime import get_runtime
from src.utils.logger import logger
from src.utils.format import format_schema_to_model


def tool_ctx() -> ContextSchema:
    runtime = get_runtime(ContextSchema)
    if runtime and runtime.context and runtime.context.user_id:
        logger.debug(f"user_id: {runtime.context.user_id}")
        return runtime.context


def add_human_in_the_loop(
    tool: Callable | BaseTool,
    *,
    interrupt_config: HumanInterruptConfig = None,
) -> BaseTool:
    """Wrap a tool to support human-in-the-loop review."""
    if not isinstance(tool, BaseTool):
        tool = create_tool(tool)

    if interrupt_config is None:
        interrupt_config = {
            "allow_accept": True,
            "allow_edit": True,
            "allow_respond": True,
        }

    @create_tool(tool.name, description=tool.description, args_schema=tool.args_schema)
    def call_tool_with_interrupt(config: RunnableConfig, **tool_input):
        request: HumanInterrupt = {
            "action_request": {"action": tool.name, "args": tool_input},
            "config": interrupt_config,
            "description": "Please review the tool call",
        }
        response = interrupt([request])[0]
        # approve the tool call
        if response["type"] == "accept":
            tool_response = tool.invoke(tool_input, config)
        # update tool call args
        elif response["type"] == "edit":
            tool_input = response["args"]["args"]
            tool_response = tool.invoke(tool_input, config)
        # respond to the LLM with user feedback
        elif response["type"] == "response":
            user_feedback = response["args"]
            tool_response = user_feedback
        else:
            raise ValueError(f"Unsupported interrupt response type: {response['type']}")

        return tool_response

    return call_tool_with_interrupt


def get_user_id(config: RunnableConfig) -> str:
    user_id = config["configurable"].get("user_id")
    if user_id is None:
        raise ValueError("User ID needs to be provided to save a memory.")

    return user_id


def get_thread_id(config: RunnableConfig) -> str:
    thread_id = config["configurable"].get("thread_id")
    if thread_id is None:
        raise ValueError("Thread ID needs to be provided to save a memory.")

    return thread_id


def attach_tool_details(tool: StructuredTool):
    from src.tools.search import SEARCH_TOOLS
    from src.tools.code import PYTHON_CODE_INTERPRETER_TOOLS
    from src.tools.test import TEST_TOOLS
    from src.tools.finance import FINANCE_TOOLS
    from src.tools.ms_teams import MICROSOFT_TEAMS_TOOLS
    from src.tools.thread_search import THREAD_SEARCH_TOOLS

    if tool.name in [n.name for n in SEARCH_TOOLS]:
        tool.tags = ["search"]
    if tool.name in [n.name for n in PYTHON_CODE_INTERPRETER_TOOLS]:
        tool.tags = ["python"]
    if tool.name in [n.name for n in MICROSOFT_TEAMS_TOOLS]:
        tool.tags = ["ms_teams"]
    if tool.name in [n.name for n in TEST_TOOLS]:
        tool.tags = ["test"]
    if tool.name in [n.name for n in FINANCE_TOOLS]:
        tool.tags = ["finance"]
    if tool.name in [n.name for n in THREAD_SEARCH_TOOLS]:
        tool.tags = ["threads"]
    return tool


def create_api_tool(
    name: str,
    description: str,
    base_url: str,
    method: str,
    endpoint: str,
    args_schema: Optional[dict] = None,
    headers: Optional[Dict[str, str]] = None,
):
    try:
        # 1) Build the Pydantic model *once* from the dict spec
        args_model: Optional[Type[BaseModel]] = None
        if args_schema is not None:
            args_model = format_schema_to_model(args_schema, model_name=f"{name}_Args")

        async def api_call(**tool_args):
            # 2) Use that model for validation + defaults
            if args_model is not None:
                payload = args_model(**tool_args).model_dump()
            else:
                payload = tool_args

            api_client = APIClient(base_url=base_url, headers=headers)

            method_lower = method.lower()

            res = await api_client._request(
                method=method_lower,
                endpoint=endpoint,
                data=payload,
                headers=headers,
            )
            return res

        # 3) Wire the model class into the tool as args_schema
        return StructuredTool.from_function(
            coroutine=api_call,
            name=name,
            description=description,
            args_schema=args_model,  # <- Pydantic model class, not dict
        )
    except Exception as e:
        logger.exception(f"Error creating API tool {name}: {e}")
        raise


## Example usage:
# args_schema_spec = {
#     "limit": {
#         "default": 5,
#         "description": "The number of threads to return",
#         "type": int,
#         "required": True,
#     },
#     "metadata": {
#         "id": {
#             "required": False,
#             "description": "Thread ID to fetch",
#             "type": str,
#         }
#     }
# }
# tool = create_api_tool(
#     name="get_threads",
#     description="Use this to get threads",
#     base_url="http://localhost:8000/api",
#     method="POST",
#     endpoint="/threads/search",
#     headers={'Authorization': f'Bearer {AUTH_TOKEN}'},
#     args_schema=args_schema_spec,  # <- the dict spec
# )
