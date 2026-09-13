# https://langchain-ai.github.io/langgraph/reference/checkpoints/#langgraph.checkpoint.postgres.BasePostgresSaver
import os
import uuid
from fastapi import APIRouter, Body, HTTPException, Depends, Query, status
from fastapi.responses import Response, UJSONResponse, StreamingResponse
from fastapi_cache.decorator import cache
from langgraph.graph.state import RunnableConfig
from src.schemas.entities.store import Thread
from src.contexts.service import ServiceContext
from src.schemas.entities import SearchFilter, ThreadSemanticSearchRequest
from src.schemas.entities.hitl import (
    InterruptListResponse,
    ResumeRequest,
    ResumeResponse,
)
from src.utils.logger import logger
from src.constants.examples import Examples
from src.schemas.models import ProtectedUser
from src.services.db import get_store, get_checkpoint_db
from src.services.checkpoint import CheckpointService
from src.utils.auth import verify_credentials, get_optional_user_from_token
from src.agents import init_graph
from langgraph.store.postgres import AsyncPostgresStore
from langgraph.checkpoint.base import (
    empty_checkpoint,
    CheckpointMetadata,
    ChannelVersions,
)

from src.utils.stream import distributed_stream_exists, stream_from_redis

router = APIRouter(tags=["Thread"])


@router.post(
    "/threads/search",
    name="Query Threads in Checkpointer",
    operation_id="orchestra_search_threads",
    tags=["mcp"],
)
@cache(expire=15)
async def search_threads(
    search_filter: SearchFilter = Body(openapi_examples=Examples.THREAD_SEARCH_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            if "thread_id" in search_filter.filter and "checkpoint_id" not in search_filter.filter:
                checkpoints = await service_context.checkpoint_service.list_checkpoints(
                    thread_id=search_filter.filter["thread_id"]
                )
                thread: Thread = await service_context.thread_service.get(search_filter.filter["thread_id"])
                if thread and len(checkpoints) > 0:
                    checkpoints[0]["metadata"]["files"] = thread.files
                    checkpoints[0]["metadata"]["todos"] = thread.todos
                    # Backfill agent_name from thread snapshot into checkpoint messages
                    if thread.messages:
                        agent_name_map: dict[str, str | None] = {}
                        for msg in thread.messages:
                            msg_dict = msg if isinstance(msg, dict) else msg.model_dump()
                            msg_id = msg_dict.get("id")
                            if msg_id and "agent_name" in msg_dict:
                                agent_name_map[msg_id] = msg_dict["agent_name"]
                        if agent_name_map:
                            for msg in checkpoints[0].get("values", {}).get("messages", []):
                                msg_id = msg.get("id")
                                if msg_id and msg_id in agent_name_map and "agent_name" not in msg:
                                    msg["agent_name"] = agent_name_map[msg_id]
                return {"checkpoints": checkpoints}

            threads = await service_context.thread_service.search(search_filter)
            return {"threads": threads}
    except Exception as e:
        logger.exception(f"Error searching threads: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/threads/search/semantic",
    name="Semantic Search Over Threads",
    operation_id="orchestra_semantic_search_threads",
    tags=["mcp"],
)
async def semantic_search_threads(
    request: ThreadSemanticSearchRequest = Body(openapi_examples=Examples.THREAD_SEMANTIC_SEARCH_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        # Validate query is not empty
        if not request.query or request.query.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="query field is required and must not be empty",
            )

        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)

            # Perform semantic search
            search_results = await service_context.thread_service.thread_snapshot_repo.search(
                query=request.query,
                limit=request.limit,
                assistant_id=request.assistant_id,
            )

            # Enrich results with thread titles
            enriched_results = []
            for result in search_results:
                thread_id = result.get("thread_id")
                if thread_id:
                    # Fetch thread data to get title
                    thread_data = await service_context.thread_service.get(thread_id)
                    title = "Untitled Thread"
                    if thread_data and thread_data.value:
                        # Try to get title from thread data, fallback to first message
                        title = thread_data.value.get("title", title)

                    enriched_results.append(
                        {
                            "thread_id": thread_id,
                            "title": title,
                            "excerpt": result.get("excerpt", ""),
                            "score": result.get("score", 0.0),
                            "updated_at": result.get("updated_at"),
                        }
                    )

            return {"results": enriched_results}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error performing semantic search: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/threads",
    name="Create Thread",
    operation_id="orchestra_create_thread",
    tags=["mcp"],
)
async def create_thread(
    thread: Thread = Body(openapi_examples=Examples.THREAD_CREATE_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            assistant_id = thread.metadata.get("assistant_id", None)
            if assistant_id:
                assistant = await service_context.assistant_service.get(assistant_id)
                if not assistant:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Assistant not found",
                    )

            thread.id = str(uuid.uuid4())
            checkpoint = empty_checkpoint()
            await service_context.thread_service.update(thread.id, thread.model_dump(exclude_none=True))
            saved = await checkpointer.aput(
                config=RunnableConfig(
                    configurable={
                        "thread_id": thread.id,
                        "checkpoint_id": checkpoint.get("id"),
                        "checkpoint_ns": checkpoint.get("ns", ""),
                        "assistant_id": assistant_id,
                    }
                ),
                checkpoint=checkpoint,
                metadata=CheckpointMetadata(
                    source="input",
                    step=-1,
                    files=thread.files,
                    todos=thread.todos,
                    assistant_id=thread.metadata.get("assistant_id", None),
                ),
                new_versions=ChannelVersions(),
            )
            return saved["configurable"]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating thread: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/threads/{thread_id}",
    name="Get Thread",
    operation_id="orchestra_get_thread",
    tags=["mcp"],
)
async def get_thread(
    thread_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            thread = await service_context.thread_service.get(thread_id)
            if not thread:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
            return {"thread": thread.model_dump(exclude_none=True)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting thread: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e


@router.get(
    "/threads/{thread_id}/stream",
    name="Stream Thread Results",
    operation_id="orchestra_stream_thread",
    tags=["Thread"],
)
async def stream_thread(
    thread_id: str,
    run_id: str = Query(...),
    after: str | None = Query(default=None),
    user: ProtectedUser = Depends(get_optional_user_from_token),
    store: AsyncPostgresStore = Depends(get_store),
):
    """
    Stream results from a distributed worker via SSE.

    Use this endpoint after POST /llm/stream returns {"distributed": true, "run_id": "..."}.
    The client should connect to this endpoint to receive the streaming
    response from the background worker.

    Args:
        thread_id: The thread ID returned from the distributed /llm/stream call.
        run_id: The run ID returned from the distributed /llm/stream call.
        after: Optional Redis stream entry ID to resume after.

    Returns:
        StreamingResponse with SSE events containing the agent output.
    """
    try:
        thread = None
        if user:
            async with get_checkpoint_db() as checkpointer:
                service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
                thread = await service_context.thread_service.get(thread_id)

        thread_metadata = thread.metadata if thread and thread.metadata else {}
        active_run_id = thread_metadata.get("active_run_id")
        stream_status = thread_metadata.get("stream_status")

        if active_run_id and active_run_id != run_id:
            if stream_status == "running":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Thread {thread_id} is running a different active run: {active_run_id}",
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run {run_id} is no longer retained for thread {thread_id}",
            )

        sse_headers = {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }

        # Fix 4: Detect stale "running" status from a dead worker
        max_stream_lifetime = int(os.getenv("MAX_STREAM_LIFETIME_SECONDS", "600"))
        active_stream_started_at = thread_metadata.get("active_stream_started_at")
        if stream_status == "running" and active_stream_started_at:
            from src.utils.format import get_time
            from datetime import datetime

            try:
                started = datetime.fromisoformat(active_stream_started_at)
                now = datetime.fromisoformat(get_time())
                elapsed = (now - started).total_seconds()
                if elapsed > max_stream_lifetime:
                    logger.warning(
                        f"Stale running stream detected for thread {thread_id} run {active_run_id}: "
                        f"started {elapsed:.0f}s ago (limit {max_stream_lifetime}s)"
                    )
                    # Update stream_status to error so future requests don't hit this path
                    if user:
                        async with get_checkpoint_db() as checkpointer:
                            svc = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
                            await svc.thread_service.update(
                                thread_id,
                                {**thread_metadata, "stream_status": "error"},
                            )
                    raise HTTPException(
                        status_code=status.HTTP_410_GONE,
                        detail=f"Stream for thread {thread_id} run {active_run_id} has expired (worker likely crashed)",
                    )
            except (ValueError, TypeError):
                pass  # If timestamp is unparseable, skip stale detection

        # Fix 1: When stream_status is "running" and run_id matches, skip the
        # distributed_stream_exists() pre-check. The worker may not have created
        # the Redis stream key yet, but stream_from_redis() has its own internal
        # 30-second wait loop that handles this gracefully.
        if active_run_id == run_id and stream_status == "running":
            return StreamingResponse(
                stream_from_redis(thread_id, run_id, after or "0"),
                media_type="text/event-stream",
                headers=sse_headers,
            )

        # For completed/errored/aborted streams, check if Redis still has the data
        stream_exists = await distributed_stream_exists(thread_id, run_id)
        if not stream_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Distributed stream for thread {thread_id} run {run_id} was not found",
            )

        return StreamingResponse(
            stream_from_redis(thread_id, run_id, after or "0"),
            media_type="text/event-stream",
            headers=sse_headers,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error streaming thread {thread_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e


@router.post(
    "/threads/{thread_id}/abort",
    name="Abort Thread Task",
    operation_id="orchestra_abort_thread",
    tags=["Thread"],
    status_code=status.HTTP_202_ACCEPTED,
)
async def abort_thread(
    thread_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """
    Send abort signal to a running distributed worker task.

    The worker will gracefully terminate at the next iteration checkpoint,
    sending an 'aborted' event before closing the stream.

    Security:
    - Requires authentication
    - Verifies user owns the thread before signaling abort
    - Logs abort request for audit trail

    Args:
        thread_id: The thread ID of the running task

    Returns:
        202 Accepted: Abort signal sent (worker may not receive immediately)
        403 Forbidden: User does not own this thread
        404 Not Found: Thread does not exist
    """
    from src.services.abort import AbortService

    abort_service = AbortService(user_id=user.id, store=store)

    try:
        result = await abort_service.request_abort(thread_id)
        return {"status": "accepted", "thread_id": thread_id, "message": result}
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error aborting thread {thread_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch(
    "/threads/{thread_id}",
    name="Update Thread",
    operation_id="orchestra_update_thread",
    tags=["mcp"],
)
async def update_thread(
    thread_id: str,
    thread: Thread = Body(...),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            # Get existing thread data
            existing = await service_context.thread_service.get(thread_id)
            if not existing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

            # Merge updates with existing data
            updated_data = {**existing.value, **thread.model_dump(exclude_none=True)}
            changed_fields = ", ".join(thread.model_dump(exclude_none=True).keys())
            update_message = f"Thread {thread_id} updated with fields: {changed_fields}"
            logger.info(update_message)
            await service_context.thread_service.update(thread_id, updated_data)
            return UJSONResponse(
                status_code=status.HTTP_200_OK,
                content={"thread_id": thread_id, "message": update_message},
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating thread: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete(
    "/threads/{thread_id}",
    name="Delete Thread",
    operation_id="orchestra_delete_thread",
    tags=["mcp"],
)
async def delete_thread(
    thread_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store=Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            await service_context.delete_thread(thread_id)
            return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error deleting thread: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete(
    "/a/{assistant_id}/threads/{thread_id}",
    name="Delete Assistant Thread",
    operation_id="orchestra_delete_assistant_thread",
    tags=["mcp"],
)
async def delete_assistant_thread(
    assistant_id: str,
    thread_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store=Depends(get_store),
):
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)
            await service_context.delete_thread(thread_id)
            return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"Error deleting thread: {e}")
        raise HTTPException(status_code=500, detail=str(e))


################################################################################
### HITL Endpoints
################################################################################
@router.get(
    "/threads/{thread_id}/interrupts",
    response_model=InterruptListResponse,
    name="Get Thread Interrupts",
    operation_id="orchestra_get_thread_interrupts",
    tags=["HITL"],
)
async def get_thread_interrupts(
    thread_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """
    Get pending interrupts for a thread.

    Returns interrupt information including tool name, arguments, and allowed actions
    for human-in-the-loop approval workflows.
    """
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)

            # First, verify the thread exists
            thread = await service_context.thread_service.get(thread_id)
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Thread {thread_id} not found",
                )

            # Create a minimal graph to query interrupt state
            # The graph needs the checkpointer to access state
            graph = init_graph(
                tools=[],
                checkpointer=checkpointer,
                store=store,
            )

            # Create checkpoint service with the graph
            checkpoint_service = CheckpointService(
                user_id=user.id,
                checkpointer=checkpointer,
                graph=graph,
            )

            # Get interrupts from the checkpoint state
            interrupts = await checkpoint_service.get_interrupts(thread_id)

            return InterruptListResponse(
                thread_id=thread_id,
                has_interrupts=len(interrupts) > 0,
                interrupts=interrupts,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting interrupts for thread {thread_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/threads/{thread_id}/resume",
    response_model=ResumeResponse,
    name="Resume Thread with Decision",
    operation_id="orchestra_resume_thread",
    tags=["HITL"],
)
async def resume_thread(
    thread_id: str,
    request: ResumeRequest = Body(...),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """
    Resume an interrupted thread with a human decision.

    Submits a decision (accept, edit, response, or reject) to resume a paused
    thread. The decision must be one of the allowed actions for the current interrupt.
    """
    try:
        async with get_checkpoint_db() as checkpointer:
            service_context = ServiceContext(user_id=user.id, store=store, checkpointer=checkpointer)

            # First, verify the thread exists
            thread = await service_context.thread_service.get(thread_id)
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Thread {thread_id} not found",
                )

            # Create a minimal graph to interact with the thread state
            graph = init_graph(
                tools=[],
                checkpointer=checkpointer,
                store=store,
            )

            # Create checkpoint service with the graph
            checkpoint_service = CheckpointService(
                user_id=user.id,
                checkpointer=checkpointer,
                graph=graph,
            )

            # Get current interrupts to validate decision_type
            interrupts = await checkpoint_service.get_interrupts(thread_id)

            if not interrupts:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"No pending interrupt for thread {thread_id}",
                )

            # Validate each decision against the interrupt's allowed_actions
            for i, decision in enumerate(request.decisions):
                if i < len(interrupts):
                    interrupt = interrupts[i]
                    if decision.decision_type not in interrupt.config.allowed_actions:
                        allowed = [a.value for a in interrupt.config.allowed_actions]
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Decision type '{decision.decision_type.value}' "
                                f"not allowed. Allowed actions: {allowed}"
                            ),
                        )

            # Resume the thread with the provided decisions
            result = await checkpoint_service.resume_with_decision(
                thread_id=thread_id,
                decisions=request.decisions,
            )

            if not result.success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result.message,
                )

            return result

    except HTTPException:
        raise
    except ValueError as e:
        # Handle case where resume_with_decision raises ValueError
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Error resuming thread {thread_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
