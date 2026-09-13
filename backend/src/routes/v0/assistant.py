import uuid
from typing import Literal, Optional
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Request,
    status,
    Path,
    Response,
    Query,
)
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi_cache.decorator import cache
from pydantic import BaseModel, Field

from langgraph.store.postgres import AsyncPostgresStore

from src.contexts.service import ServiceContext
from src.constants.examples import Examples
from src.schemas.models import ProtectedUser
from src.services.db import get_store
from src.utils.auth import verify_credentials
from src.utils.logger import logger
from src.services.assistant import (
    AssistantSearch,
    Assistant,
    AssistantService,
    ASSISTANT_EXAMPLES,
)
from src.schemas.entities.llm import PublicAssistant

embed_security = HTTPBearer(auto_error=False)


class EmbedChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000, description="The user message")
    thread_id: Optional[str] = Field(default=None, description="Thread ID for conversation continuity")


################################################################################
### Create Assistant
################################################################################
router = APIRouter(tags=["Assistant"], prefix="/assistants")


@router.post("/search", name="Query Assistants", operation_id="orchestra_search_assistants")
@cache(expire=30)
async def search_assistants(
    assistant_search: AssistantSearch = Body(openapi_examples=Examples.ASSISTANT_SEARCH_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)
    # If id is provided, return the assistant
    if "id" in assistant_search.filter:
        assistant = await service_context.assistant_service.get(assistant_search.filter["id"])
        return {"assistants": [assistant.model_dump()]}
    # If id is not provided, return all assistants
    assistants: list[Assistant] = await service_context.assistant_service.search()
    if assistants:
        return {"assistants": [assistant.model_dump() for assistant in assistants]}
    return {"assistants": []}


@router.post("", name="Create Assistant", operation_id="orchestra_create_assistant")
async def create_assistant(
    assistant: Assistant = Body(..., examples={"currency_agent": ASSISTANT_EXAMPLES["currency_agent"]}),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        assistant_id = str(uuid.uuid4())
        service_context = ServiceContext(user_id=user.id, store=store)
        existing_assistant = await service_context.assistant_service.get(assistant_id)
        if existing_assistant:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assistant already exists")
        assistant = await service_context.assistant_service.update(assistant_id, assistant.model_dump())
        return {"assistant_id": assistant_id}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Error creating assistant: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{assistant_id}", name="Update Assistant", operation_id="orchestra_update_assistant")
async def update_assistant(
    assistant_id: str = Path(..., description="The ID of the assistant to update"),
    assistant: Assistant = Body(..., examples={"currency_agent": Examples.ASSISTANT_EXAMPLES["currency_agent"]}),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        service_context = ServiceContext(user_id=user.id, store=store)
        await service_context.assistant_service.update(assistant_id, assistant.model_dump())
        return {"assistant_id": assistant_id}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Error creating assistant: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{assistant_id}", name="Delete Assistant", operation_id="orchestra_delete_assistant")
async def delete_assistant(
    assistant_id: str = Path(..., description="The ID of the assistant to delete"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)
    await service_context.assistant_service.delete(assistant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


################################################################################
### Public Assistant Routes
################################################################################
@router.get(
    "/public",
    name="List Public Assistants",
    operation_id="orchestra_list_public_assistants",
)
async def list_public_assistants(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort_by: Literal["fork_count", "updated_at", "published_at"] = Query(default="published_at"),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags to filter by (OR match)"),
    store: AsyncPostgresStore = Depends(get_store),
):
    """List all public assistants - no authentication required."""
    service = AssistantService(user_id=None, store=store)

    # Parse comma-separated tags into a list
    tags_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None

    assistants = await service.search_public(limit=limit, offset=offset, sort_by=sort_by, tags=tags_list)

    return {
        "assistants": [PublicAssistant.from_assistant(a).model_dump() for a in assistants],
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/public/{assistant_id}",
    name="Get Public Assistant",
    operation_id="orchestra_get_public_assistant",
)
async def get_public_assistant(
    assistant_id: str = Path(..., description="The ID of the public assistant"),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Get public assistant info (limited fields) - no authentication required."""
    # Input validation
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    service = AssistantService(user_id=None, store=store)
    assistant = await service.get_public(assistant_id)

    if not assistant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public assistant not found")

    return {"assistant": PublicAssistant.from_assistant(assistant).model_dump()}


@router.post(
    "/public/{assistant_id}/fork",
    name="Fork Public Assistant",
    operation_id="orchestra_fork_public_assistant",
    status_code=status.HTTP_201_CREATED,
)
async def fork_public_assistant(
    assistant_id: str = Path(..., description="The ID of the public assistant to fork"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Fork a public assistant into the authenticated user's workspace."""
    # Input validation
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    service = AssistantService(user_id=None, store=store)
    new_assistant_id = await service.fork(assistant_id, user.id)

    if not new_assistant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public assistant not found")

    return {"assistant_id": new_assistant_id}


################################################################################
### Embed Routes
################################################################################
@router.get(
    "/public/{assistant_id}/embed",
    name="Get Embed Config",
    operation_id="orchestra_get_embed_config",
)
async def get_embed_config(
    assistant_id: str = Path(..., description="The ID of the public assistant"),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Get embed configuration for a public assistant - no authentication required."""
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    service = AssistantService(user_id=None, store=store)
    assistant = await service.get_public(assistant_id)

    if not assistant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public assistant not found")

    return {
        "agent_id": assistant.id,
        "name": assistant.name,
        "description": assistant.description,
        "model": assistant.model,
        "theme": assistant.metadata.get("theme", "default"),
    }


@router.post(
    "/public/{assistant_id}/embed-token",
    name="Generate Embed Token",
    operation_id="orchestra_generate_embed_token",
)
async def generate_embed_token(
    assistant_id: str = Path(..., description="The ID of the public assistant"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Generate an embed token for a public assistant - requires auth and ownership."""
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    service = AssistantService(user_id=None, store=store)
    assistant = await service.get_public(assistant_id)

    if not assistant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public assistant not found")

    if assistant.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the agent owner can generate embed tokens"
        )

    from src.utils.embed import create_embed_token

    token = create_embed_token(assistant_id)

    return {"token": token}


@router.post(
    "/public/{assistant_id}/embed-chat",
    name="Embed Chat",
    operation_id="orchestra_embed_chat",
    response_model=None,
)
async def embed_chat(
    request: Request,
    assistant_id: str = Path(..., description="The ID of the public assistant"),
    body: EmbedChatRequest = Body(...),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(embed_security),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Chat with a public assistant via embed widget. Accepts optional embed JWT for higher rate limits.

    - Without token: 10 messages/day per IP
    - With valid embed token: 100 messages/day (or token-specified limit)

    Streams SSE response and returns thread_id for conversation continuity.
    """
    # Validate assistant ID format
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    # Verify assistant exists and is public
    service = AssistantService(user_id=None, store=store)
    assistant = await service.get_public(assistant_id)

    if not assistant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public assistant not found")

    # Authenticate embed token if provided
    from src.utils.embed import verify_embed_token, check_embed_rate_limit

    token_payload = None
    if credentials and credentials.credentials:
        token_payload = verify_embed_token(credentials.credentials, assistant_id)

    # Rate limit check
    client_ip = request.client.host if request.client else None
    await check_embed_rate_limit(
        agent_id=assistant_id,
        jti=token_payload.get("jti") if token_payload else None,
        rate_limit=token_payload.get("rate_limit") if token_payload else None,
        client_ip=client_ip,
    )

    # Build LLMRequest from the assistant config + user message
    from src.schemas.entities.llm import LLMInput, Config

    thread_id = body.thread_id or str(uuid.uuid4())

    llm_input = LLMInput(
        messages=[LLMInput.ChatMessage(role="user", content=body.message)],
        files={},
    )
    metadata = Config(
        thread_id=thread_id,
        assistant_id=assistant_id,
    )
    llm_request = assistant.to_llm_request(input=llm_input, metadata=metadata)

    # Use existing streaming infrastructure
    from src.agents import init_config
    from src.controllers.llm import LLMController

    config = init_config(llm_request, user_id=None)
    llm_controller = LLMController(user_id=None, store=store, config=config)
    stream = await llm_controller.llm_stream(llm_request)

    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Thread-Id": thread_id,
        },
    )


################################################################################
### Publish/Unpublish Assistant
################################################################################
@router.post(
    "/{assistant_id}/publish",
    name="Publish Assistant",
    operation_id="orchestra_publish_assistant",
)
async def publish_assistant(
    assistant_id: str = Path(..., description="The ID of the assistant to publish"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Make an assistant publicly accessible."""
    # Input validation
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    try:
        service_context = ServiceContext(user_id=user.id, store=store)

        # Verify ownership by checking user's namespace
        assistant = await service_context.assistant_service.get(assistant_id)
        if not assistant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found")

        success = await service_context.assistant_service.publish(assistant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to publish assistant",
            )
        return {"assistant_id": assistant_id, "public": True}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Error publishing assistant: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{assistant_id}/publish",
    name="Unpublish Assistant",
    operation_id="orchestra_unpublish_assistant",
)
async def unpublish_assistant(
    assistant_id: str = Path(..., description="The ID of the assistant to unpublish"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Remove public access from an assistant."""
    # Input validation
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    try:
        service_context = ServiceContext(user_id=user.id, store=store)

        # Verify ownership by checking user's namespace
        assistant = await service_context.assistant_service.get(assistant_id)
        if not assistant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found")

        success = await service_context.assistant_service.unpublish(assistant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unpublish assistant",
            )
        return {"assistant_id": assistant_id, "public": False}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Error unpublishing assistant: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


################################################################################
### Distillation Routes
################################################################################
@router.post(
    "/{assistant_id}/distill",
    name="Distill Assistant Prompt",
    operation_id="orchestra_distill_assistant",
)
async def distill_assistant(
    assistant_id: str = Path(..., description="The ID of the assistant to distill"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Manually trigger prompt distillation for an assistant. Requires ownership."""
    # Input validation
    try:
        uuid.UUID(assistant_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assistant ID format",
        )

    # Verify ownership
    service_context = ServiceContext(user_id=user.id, store=store)
    assistant = await service_context.assistant_service.get(assistant_id)

    if not assistant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found")

    if assistant.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assistant owner can trigger distillation",
        )

    # Run distillation
    from src.services.prompt.optimize import PromptOptimizer

    optimizer = PromptOptimizer(model=assistant.model)
    revision_id = await optimizer.distill(user_id=user.id, assistant_id=assistant_id, store=store)

    if revision_id is not None:
        return {"revision_id": revision_id, "status": "completed"}
    else:
        return {"revision_id": None, "status": "no_improvement"}
