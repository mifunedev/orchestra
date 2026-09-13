from fastapi import Body, HTTPException, Response, status, Depends, APIRouter
from fastapi.responses import JSONResponse
from fastapi_cache.decorator import cache
from langgraph.store.base import BaseStore

from src.constants.examples import Examples
from src.schemas.models import ProtectedUser
from src.utils.auth import verify_credentials
from src.services.tool import ToolService
from src.routes.v0.tool.info import info_router
from src.routes.v0.tool.invoke import invoke_router
from src.repos.tool_repo import SavedTool
from src.services.db import get_store

router = APIRouter(tags=["Tool"], prefix="/tools")


################################################################################
### List MCP Info
################################################################################
@router.get(
    "",
    name="List Tools",
    responses={
        status.HTTP_200_OK: {
            "description": "All tools.",
            "content": {"application/json": {"example": {"tools": []}}},
        }
    },
    operation_id="orchestra_list_tools",
)
@cache(expire=30)
async def list_tools(
    user: ProtectedUser = Depends(verify_credentials),
    store: BaseStore = Depends(get_store),
):
    tool_service = ToolService(user_id=user.id, store=store)
    tools_response = await tool_service.tool_details()
    return JSONResponse(content={"tools": tools_response}, status_code=status.HTTP_200_OK)


################################################################################
### Create Tool
################################################################################
@router.post(
    "",
    name="Create Tool",
    status_code=status.HTTP_201_CREATED,
    operation_id="orchestra_create_tool",
)
async def create_tool(
    tool: SavedTool = Body(..., openapi_examples=Examples.TOOL_CREATE_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: BaseStore = Depends(get_store),
):
    try:
        tool_service = ToolService(user_id=user.id, store=store)
        created_tool = await tool_service.tool_repo.create(tool)
        if not created_tool:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create tool")
        # If you truly want no body, this is fine:
        return Response(status_code=status.HTTP_201_CREATED)
        # Or, if you want to return the created resource:
        # return JSONResponse(status_code=status.HTTP_201_CREATED, content={"id": created_tool.id})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


################################################################################
### Delete Tool
################################################################################
@router.delete(
    "/{tool_name}",
    name="Delete Tool",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="orchestra_delete_tool",
)
async def delete_tool(
    tool_name: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: BaseStore = Depends(get_store),
):
    try:
        tool_service = ToolService(user_id=user.id, store=store)
        await tool_service.tool_repo.delete(tool_name)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


router.include_router(info_router)
router.include_router(invoke_router)
