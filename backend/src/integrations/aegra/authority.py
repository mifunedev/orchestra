import json
import os
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx
from langchain_core.tools import StructuredTool, ToolException
from langgraph_sdk import Auth


@dataclass(frozen=True)
class Credentials:
    identity: str
    headers: dict[str, str] = field(repr=False)


credentials: ContextVar[Credentials | None] = ContextVar("orchestra_aegra_credentials", default=None)


def api_url() -> str:
    value = os.environ["ORCHESTRA_API_URL"].rstrip("/")
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("ORCHESTRA_API_URL must be an HTTP origin without credentials")
    if parsed.path or parsed.query or parsed.fragment:
        raise ValueError("ORCHESTRA_API_URL must not contain a path, query or fragment")
    return value


@asynccontextmanager
async def client():
    async with httpx.AsyncClient(base_url=api_url(), timeout=30, follow_redirects=False, trust_env=False) as session:
        yield session


async def request(method: str, path: str, headers: dict[str, str], **kwargs):
    try:
        async with client() as session:
            response = await session.request(method, path, headers=headers, **kwargs)
    except httpx.HTTPError:
        raise Auth.exceptions.HTTPException(status_code=503, detail="Orchestra authority unavailable") from None
    if response.status_code in (401, 403):
        raise Auth.exceptions.HTTPException(status_code=response.status_code, detail="Orchestra credentials rejected")
    if not response.is_success:
        raise Auth.exceptions.HTTPException(status_code=502, detail="Orchestra authority request failed")
    try:
        return response.json()
    except ValueError:
        raise Auth.exceptions.HTTPException(status_code=502, detail="Invalid Orchestra authority response") from None


async def authenticate(headers: dict[str, str]):
    credentials.set(None)
    forwarded = {name: value for name, value in headers.items() if name.lower() in {"authorization", "x-api-key"}}
    if not forwarded:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Orchestra credentials required")
    data = await request("GET", "/api/auth/user", forwarded)
    identity = data.get("user", {}).get("id") if isinstance(data, dict) else None
    if not isinstance(identity, str) or not identity:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Orchestra identity missing")
    credentials.set(Credentials(identity=identity, headers=forwarded))
    return {"identity": identity, "is_authenticated": True}


def current() -> Credentials:
    session = credentials.get()
    if session is None:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Orchestra credentials required")
    return session


async def catalog() -> dict[str, dict]:
    data = await request("GET", "/api/tools", current().headers)
    tools = data.get("tools") if isinstance(data, dict) else None
    if not isinstance(tools, list):
        raise Auth.exceptions.HTTPException(status_code=502, detail="Invalid Orchestra tool catalog")
    return {tool["name"]: tool for tool in tools if isinstance(tool, dict) and isinstance(tool.get("name"), str)}


def tool_proxy(definition: dict) -> StructuredTool:
    name = definition["name"]
    schema = definition.get("args_schema")
    if not isinstance(schema, dict):
        raise Auth.exceptions.HTTPException(status_code=422, detail=f"Tool has no supported argument schema: {name}")

    async def invoke(**args):
        data = await request("POST", "/api/tools/invoke", current().headers, json=[{"name": name, "args": args}])
        results = data.get("tools", []) if isinstance(data, dict) else []
        if len(results) != 1 or results[0].get("name") != name:
            raise ToolException("Invalid Orchestra tool response")
        result = results[0].get("result")
        if isinstance(result, dict) and "error" in result:
            raise ToolException("Orchestra tool invocation failed")
        return result if isinstance(result, str) else json.dumps(result)

    return StructuredTool(
        name=name,
        description=definition.get("description") or name,
        args_schema=schema,
        coroutine=invoke,
    )
