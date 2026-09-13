import httpx
import ujson
import logging
import urllib.parse
from typing import Dict, Optional, Any
from langgraph.prebuilt import ToolRuntime
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class APIClient:
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url.rstrip("/")  # Normalize base (remove trailing /)
        self.client = httpx.AsyncClient(base_url=self.base_url, headers=headers)

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        # Use httpx's base_url + endpoint (handles joining perfectly)
        try:
            if method in ["post", "put", "patch", "delete"]:
                response = await self.client.request(method, endpoint, json=data, params=params, headers=headers)
            else:
                response = await self.client.request(method, endpoint, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            full_url = urllib.parse.urljoin(self.base_url + "/", endpoint)
            logging.error(f"APIClient {method.upper()} {full_url} failed: {e}")
            raise

    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        return await self._request("get", endpoint, params=params, headers=headers)

    async def post(
        self,
        endpoint: str,
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ):
        return await self._request("post", endpoint, data, headers=headers)

    async def put(
        self,
        endpoint: str,
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ):
        return await self._request("put", endpoint, data, headers=headers)

    async def patch(
        self,
        endpoint: str,
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ):
        return await self._request("patch", endpoint, data, headers=headers)

    async def delete(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        return await self._request("delete", endpoint, params=params, headers=headers)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


class ToolArgs(BaseModel):
    name: str = Field(description="The name of the tool. Must be snake_case (lowercase, numbers, underscores).")
    description: str = Field(
        description="The description of the tool. Provide concise formatting instructions for the tool."
    )
    base_url: str = Field(description="The base URL of the tool")
    method: str = Field(description="The method of the tool")
    endpoint: str = Field(description="The endpoint of the tool")
    args_schema: Optional[dict] = Field(description="The arguments schema of the tool")
    headers: Optional[Dict[str, str]] = Field(description="The headers of the tool")
    runtime: Any


@tool(args_schema=ToolArgs)
async def create_tool(
    name: str,
    description: str,
    base_url: str,
    method: str,
    endpoint: str,
    args_schema: Optional[dict] = None,
    headers: Optional[Dict[str, str]] = None,
    runtime: ToolRuntime = None,
):
    """Create a custom API tool. If api_token is required provide a placeholder for the token like {{api_token}}.

    Examples:
        ```python
        await create_tool(
            name="get_server_health",
            description="Use this to get the health of the server and app version.",
            base_url="http://localhost:8000/api",
            method="GET",
            endpoint="/info/health",
        )

        await create_tool(
            name="create_blog_post",
            description="Use this to create a blog post.",
            base_url="https://jsonplaceholder.typicode.com",
            method="POST",
            endpoint="/posts",
            args_schema={
                "title": {
                    "type": "str",
                    "description": "The title of the blog post",
                    "required": True,
                },
                "body": {
                    "type": "str",
                    "description": "The body of the blog post",
                    "required": True,
                },
                "tags": {
                    "type": "array",
                    "description": "Tags for SEO",
                    "required": true,
                    "items": {
                        "type": "str",
                        "description": "Tag for SEO",
                        "required": false
                    }
                },
            },
            headers={
                "Content-type": "application/json; charset=UTF-8",
            },
        )
        ```

    Args:
        name: The name of the tool to create.
        description: The description of the tool to create.
        base_url: The base URL of the tool to create.
        method: The method of the tool to create.
        endpoint: The endpoint of the tool to create.
        args_schema: The arguments schema of the tool to create.
        headers: The headers of the tool to create.
    """
    try:
        from src.repos.tool_repo import APIConfig, SavedTool, ToolConfig, ToolRepo

        user_id = runtime.context.user_id
        if not user_id:
            raise ValueError("User ID is required to create API tool.")
        tool_repo = ToolRepo(user_id=user_id, store=runtime.store)
        await tool_repo.create(
            SavedTool(
                name=name,
                description=description,
                type="api",
                config=ToolConfig(
                    api_tool=APIConfig(
                        base_url=base_url,
                        method=method,
                        endpoint=endpoint,
                        args_schema=args_schema,
                        headers=headers,
                    )
                ),
            )
        )
        return f"API tool {name} created successfully."
    except Exception as e:
        logging.error(f"Error creating API tool {name}: {e}")
        return f"Error creating API tool {name}: {e}"


class ToolArgs(BaseModel):
    name: str = Field(description="The name of the tool. Must be snake_case (lowercase, numbers, underscores).")
    description: str = Field(
        description="The description of the tool. Provide concise formatting instructions for the tool."
    )
    base_url: str = Field(description="The base URL of the tool")
    method: str = Field(description="The method of the tool")
    endpoint: str = Field(description="The endpoint of the tool")
    args_schema: Optional[dict] = Field(description="The arguments schema of the tool")
    headers: Optional[Dict[str, str]] = Field(description="The headers of the tool")
    runtime: Any


@tool(args_schema=ToolArgs)
async def edit_tool(
    name: str,
    description: str,
    base_url: str,
    method: str,
    endpoint: str,
    args_schema: Optional[dict] = None,
    headers: Optional[Dict[str, str]] = None,
    runtime: ToolRuntime = None,
):
    """Edit a custom API tool by name.

    Examples:
        ```python
        await create_tool(
            name="get_server_health",
            description="Use this to get the health of the server and app version.",
            base_url="http://localhost:8000/api",
            method="GET",
            endpoint="/info/health",
        )

        await create_tool(
            name="create_blog_post",
            description="Use this to create a blog post.",
            base_url="https://jsonplaceholder.typicode.com",
            method="POST",
            endpoint="/posts",
            args_schema={
                "title": {
                    "type": "str",
                    "description": "The title of the blog post",
                    "required": True,
                },
                "body": {
                    "type": "str",
                    "description": "The body of the blog post",
                    "required": True,
                },
                "tags": {
                    "type": "array",
                    "description": "Tags for SEO",
                    "required": true,
                    "items": {
                        "type": "str",
                        "description": "Tag for SEO",
                        "required": false
                    }
                },
            },
            headers={
                "Content-type": "application/json; charset=UTF-8",
            },
        )
        ```

    Args:
        name: The name of the tool to edit.
        description: The description of the tool to edit.
        base_url: The base URL of the tool to edit.
        method: The method of the tool to edit.
        endpoint: The endpoint of the tool to edit.
        args_schema: The arguments schema of the tool to edit.
        headers: The headers of the tool to edit.
    """
    try:
        from src.repos.tool_repo import APIConfig, SavedTool, ToolConfig, ToolRepo

        user_id = runtime.context.user_id
        if not user_id:
            raise ValueError("User ID is required to edit API tool.")
        tool_repo = ToolRepo(user_id=user_id, store=runtime.store)
        await tool_repo.edit(
            name,
            SavedTool(
                name=name,
                description=description,
                type="api",
                config=ToolConfig(
                    api_tool=APIConfig(
                        base_url=base_url,
                        method=method,
                        endpoint=endpoint,
                        args_schema=args_schema,
                        headers=headers,
                    )
                ),
            ),
        )
        return f"API tool {name} edited successfully."
    except Exception as e:
        logging.error(f"Error editing API tool {name}: {e}")
        return f"Error editing API tool {name}: {e}"


class GetToolInfoArgs(BaseModel):
    name: str = Field(description="The name of the tool. Must be snake_case (lowercase, numbers, underscores).")
    runtime: Any = None


@tool(args_schema=GetToolInfoArgs)
async def get_tool_info(name: str, runtime: ToolRuntime = None):
    """Get the information of a tool by name."""
    from src.repos.tool_repo import ToolRepo

    user_id = runtime.context.user_id
    if not user_id:
        raise ValueError("User ID is required to get tool information.")
    tool_repo = ToolRepo(user_id=user_id, store=runtime.store)
    tool = await tool_repo.search(filter={"name": name})
    return ujson.dumps(tool)


API_TOOLS = [
    create_tool,
    edit_tool,
    get_tool_info,
]
