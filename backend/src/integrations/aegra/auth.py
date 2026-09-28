from typing import Literal

from langgraph_sdk import Auth
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from src.integrations.aegra import authority


auth = Auth()
auth.authenticate(authority.authenticate)


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user"]
    content: str = Field(min_length=1)


class ChatInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[Message] = Field(min_length=1, max_length=1)


class Options(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str = "openai:gpt-4.1-mini"
    tools: list[str] = Field(default_factory=list)


class Config(BaseModel):
    model_config = ConfigDict(extra="forbid")
    configurable: Options = Field(default_factory=Options)


@auth.on
async def authorize(ctx, value):
    if ctx.resource == "threads" and ctx.action in {"create", "read", "search"}:
        return True
    if ctx.resource == "assistants" and ctx.action == "read":
        return True
    return False


@auth.on.threads.create_run
async def authorize_run(ctx, value):
    if value.get("assistant_id") != "orchestra":
        raise Auth.exceptions.HTTPException(status_code=422, detail="Only the Orchestra chat graph is supported")
    unsupported = ("context", "command", "checkpoint", "checkpoint_id", "interrupt_before", "interrupt_after")
    if any(value.get(key) for key in unsupported) or value.get("stream_subgraphs"):
        raise Auth.exceptions.HTTPException(status_code=422, detail="Unsupported new-thread input")
    try:
        ChatInput.model_validate(value.get("input"))
        options = Config.model_validate(value.get("config") or {}).configurable
    except ValidationError:
        raise Auth.exceptions.HTTPException(
            status_code=422, detail="Unsupported new-thread input or configuration"
        ) from None
    session = authority.current()
    if session.identity != ctx.user.identity:
        raise Auth.exceptions.HTTPException(status_code=403, detail="Orchestra identity mismatch")
    if options.tools:
        available = await authority.catalog()
        for name in options.tools:
            if name not in available:
                raise Auth.exceptions.HTTPException(
                    status_code=422, detail=f"Unknown or unauthorized Orchestra tool: {name}"
                )
            authority.tool_proxy(available[name])
    value["config"] = {"configurable": options.model_dump()}
    value["context"] = {"model": options.model, "user_id": session.identity}
