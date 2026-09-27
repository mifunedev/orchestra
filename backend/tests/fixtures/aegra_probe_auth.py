from langgraph_sdk import Auth


auth = Auth()


@auth.authenticate
async def authenticate(headers: dict) -> dict:
    token = headers.get("authorization", "").removeprefix("Bearer ")
    if token not in {"probe-alice", "probe-bob"}:
        raise Auth.exceptions.HTTPException(status_code=401, detail="Probe credential required")
    return {"identity": token.removeprefix("probe-"), "is_authenticated": True}
