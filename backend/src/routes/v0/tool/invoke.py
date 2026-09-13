from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from typing import Optional, List

from src.services.tool import ToolService
from src.schemas.entities import InvokeTool
from src.schemas.models import ProtectedUser
from src.utils.auth import verify_credentials
from src.constants.examples import Examples
from src.services.db import get_store
from langgraph.store.base import BaseStore

from src.utils.logger import log_error

invoke_router = APIRouter()


@invoke_router.post("/invoke", name="Invoke Tools", operation_id="orchestra_invoke_tools")
async def invoke_tools(
    request: Request,
    tools: List[InvokeTool] = Body(..., examples=[Examples.INVOKE_TOOLS_EXAMPLE]),
    user: Optional[ProtectedUser] = Depends(verify_credentials),
    store: BaseStore = Depends(get_store),
):
    try:
        service = ToolService(user_id=user.id if user else None, store=store)
        tool_results: List[dict] = []
        for tool in tools:
            result = None
            if tool.config:
                result = await service.invoke_ephemeral_tool(tool.name, tool.config, tool.args)
            else:
                # Try default tools first
                try:
                    result = await service.invoke_default_tool(tool.name, tool.args)
                except ValueError:
                    # Try user tools
                    # We get all user tools and find exact match to avoid semantic search fuzziness
                    user_tools = await service.tool_repo.search()
                    target_tool = next((t for t in user_tools if t.name == tool.name), None)

                    if target_tool:
                        result = await service.invoke_structured_tool(target_tool, tool.args)
                    else:
                        result = {"error": f"Tool {tool.name} not found"}

            tool_result = InvokeTool(name=tool.name, args=tool.args, result=result, config=tool.config)
            tool_results.append(tool_result.model_dump())
        return {"tools": tool_results}
    except Exception as e:
        log_error(f"Error invoking tools: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
