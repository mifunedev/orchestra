import os
from collections.abc import Mapping

import httpx
from langgraph_sdk import Auth


auth = Auth()


@auth.authenticate
async def authenticate(headers: Mapping[str, str]) -> dict:
    authorization = headers.get("authorization", "")
    api_key = headers.get("x-api-key", "")
    forwarded = {}
    if api_key:
        forwarded["x-api-key"] = api_key
    elif authorization.lower().startswith("bearer ") and authorization[7:].strip():
        forwarded["authorization"] = authorization
    else:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Unauthorized")

    port = os.environ.get("ORCHESTRA_AEGRA_AUTH_PORT", "8000")
    if not port.isdecimal() or not 0 < int(port) < 65536:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Unauthorized")
    url = f"http://127.0.0.1:{port}/api/auth/user"
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=False, trust_env=False) as client:
            response = await client.get(url, headers=forwarded)
        if response.status_code != 200:
            raise Auth.exceptions.HTTPException(status_code=401, detail="Unauthorized")
        payload = response.json()
        identity = payload["user"]["id"]
        if not isinstance(identity, str) or not identity.strip():
            raise ValueError("Invalid identity")
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise Auth.exceptions.HTTPException(status_code=401, detail="Unauthorized") from None
    return {"identity": identity}


@auth.on
async def deny_unhandled(ctx: Auth.types.AuthContext, value: dict) -> bool:
    return False


@auth.on.assistants.create
@auth.on.threads.create
async def create_owned(ctx: Auth.types.AuthContext, value: dict) -> None:
    value["metadata"] = {**(value.get("metadata") or {}), "owner": ctx.user.identity}


@auth.on.assistants.search
@auth.on.assistants.read
@auth.on.assistants.delete
@auth.on.threads.search
@auth.on.threads.read
@auth.on.threads.delete
async def read_owned(ctx: Auth.types.AuthContext, value: dict) -> dict:
    return {"owner": ctx.user.identity}


@auth.on.assistants.update
@auth.on.threads.update
@auth.on.threads.create_run
async def change_owned(ctx: Auth.types.AuthContext, value: dict) -> dict | bool:
    metadata = value.get("metadata") or {}
    if "owner" in metadata and metadata["owner"] != ctx.user.identity:
        return False
    return {"owner": ctx.user.identity}


@auth.on.store.put
@auth.on.store.get
@auth.on.store.delete
async def scope_store_item(ctx: Auth.types.AuthContext, value: dict) -> dict:
    return {"namespace": [ctx.user.identity, *(value.get("namespace") or ())]}


@auth.on.store.search
async def scope_store_search(ctx: Auth.types.AuthContext, value: dict) -> dict:
    return {"namespace_prefix": [ctx.user.identity, *(value.get("namespace_prefix") or ())]}


@auth.on.store.list_namespaces
async def scope_store_namespaces(ctx: Auth.types.AuthContext, value: dict) -> dict:
    return {"prefix": [ctx.user.identity, *(value.get("prefix") or ())]}
