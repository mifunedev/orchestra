import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from langgraph.store.base import BaseStore

from src.repos.user_settings_repo import UserSettingsRepo
from src.schemas.models import User
from src.services.db import get_store
from src.utils.auth import verify_credentials

router = APIRouter(tags=["Sandbox"])
_ALLOWED_METHODS = {"initialize", "notifications/initialized", "tools/list", "tools/call"}


@router.post("/sandbox/mcp")
async def proxy_sandbox_mcp(
    request: Request,
    user: User = Depends(verify_credentials),
    store: BaseStore = Depends(get_store),
) -> Response:
    repo = UserSettingsRepo(str(user.id), store)
    settings = await repo._get_or_create()
    if settings.default_sandbox != "mcp" or not settings.default_mcp_sandbox_url:
        raise HTTPException(status_code=409, detail="MCP sandbox is not configured as the default sandbox")

    base = settings.default_mcp_sandbox_url.rstrip("/")
    if base.endswith("/mcp"):
        base = base[:-4]
    try:
        url = httpx.URL(f"{base}/mcp")
    except httpx.InvalidURL:
        raise HTTPException(status_code=409, detail="Invalid MCP sandbox URL configuration") from None
    if url.scheme not in ("http", "https") or not url.host or url.userinfo or url.query or url.fragment:
        raise HTTPException(status_code=409, detail="Invalid MCP sandbox URL configuration")

    try:
        body = await request.body()
        payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON-RPC request") from None
    if (
        not isinstance(payload, dict)
        or payload.get("jsonrpc") != "2.0"
        or not isinstance(payload.get("method"), str)
        or payload["method"] not in _ALLOWED_METHODS
        or set(payload) - {"jsonrpc", "method", "id", "params"}
        or ("params" in payload and not isinstance(payload["params"], dict))
        or (payload["method"] == "notifications/initialized") != ("id" not in payload)
    ):
        raise HTTPException(status_code=400, detail="Unsupported MCP JSON-RPC request")

    api_key = repo._decrypt_keys(settings).get("MCP_SANDBOX_API_KEY")
    headers = {
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
    }
    if api_key:
        headers["x-api-key"] = api_key
    session = request.headers.get("mcp-session-id")
    if session:
        headers["mcp-session-id"] = session
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0), trust_env=False) as client:
            upstream = await client.post(url, content=body, headers=headers)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="MCP sandbox unreachable") from None

    if api_key and (
        api_key.encode() in upstream.content
        or any(api_key in upstream.headers.get(name, "") for name in ("mcp-session-id", "content-type"))
    ):
        raise HTTPException(status_code=502, detail="MCP sandbox returned unsafe content")
    response_headers = {}
    if "mcp-session-id" in upstream.headers:
        response_headers["mcp-session-id"] = upstream.headers["mcp-session-id"]
    if "content-type" in upstream.headers:
        response_headers["content-type"] = upstream.headers["content-type"]
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)
