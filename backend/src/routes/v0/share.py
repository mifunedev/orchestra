"""API routes for thread sharing functionality."""

from typing import Any, Callable

from fastapi import APIRouter, Body, Depends, HTTPException, Path, status, Request
from fastapi.responses import Response
from fastapi_cache.decorator import cache
from langgraph.store.postgres import AsyncPostgresStore

from src.schemas.entities.share import (
    CreateShareRequest,
    ShareResponse,
)
from src.schemas.models import ProtectedUser
from src.services.share import ShareService
from src.services.db import get_store, get_checkpoint_db
from src.utils.auth import verify_credentials
from src.utils.logger import logger

router = APIRouter(tags=["Share"])


def share_cache_key_builder(
    func: Callable[..., Any],
    namespace: str = "",
    request: Request | None = None,
    response: Response | None = None,
    args: tuple[Any, ...] = (),
    kwargs: dict[str, Any] | None = None,
) -> str:
    """Cache key builder for shared threads - uses token only (no user isolation)."""
    if kwargs is None:
        kwargs = {}
    token = kwargs.get("token", "")
    return f"share:{func.__name__}:{token}"


@router.post(
    "/threads/{thread_id}/share",
    name="Create Share Link",
    operation_id="orchestra_create_share",
    status_code=status.HTTP_201_CREATED,
)
async def create_share(
    thread_id: str = Path(..., description="Thread ID to share"),
    request: CreateShareRequest = Body(default=CreateShareRequest()),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Create a shareable link for a thread.

    Only the thread owner can create share links.

    Args:
        thread_id: ID of the thread to share
        request: Share options (expiration, follow-up settings)

    Returns:
        ShareResponse with full token (returned only once)
    """
    try:
        async with get_checkpoint_db() as checkpointer:
            share_service = ShareService(
                user_id=user.id,
                store=store,
                checkpointer=checkpointer,
            )

            token, share = await share_service.create_share(thread_id, request)

            return ShareResponse(
                token=token,
                prefix=share.token_prefix,
                thread_id=thread_id,
                share_url=f"/share/{token}",
                expires_at=share.expires_at,
                allow_follow_up=share.allow_follow_up,
                show_files=share.show_files,
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Error creating share: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create share link",
        )


@router.get(
    "/shares/{token}",
    name="Get Shared Thread",
    operation_id="orchestra_get_shared_thread",
)
@cache(expire=300, key_builder=share_cache_key_builder)
async def get_shared_thread(
    request: Request,  # Required for caching
    token: str = Path(..., description="Share token"),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Get a shared thread by token.

    No authentication required. Rate limited to prevent abuse.

    Args:
        token: Full share token (shr_xxx...)

    Returns:
        Shared thread data including messages and files
    """
    # Validate token format
    if not token.startswith("shr_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token format",
        )

    try:
        async with get_checkpoint_db() as checkpointer:
            share_service = ShareService(
                user_id=None,
                store=store,
                checkpointer=checkpointer,
            )

            result = await share_service.get_shared_thread(token)

            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Share not found or has expired",
                )

            shared_thread, share = result

            return {
                "thread": shared_thread.model_dump(),
                "config": {
                    "allow_follow_up": share.allow_follow_up,
                    "follow_up_model": share.follow_up_model,
                    "show_files": share.show_files,
                },
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting shared thread: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load shared thread",
        )


@router.delete(
    "/threads/{thread_id}/share",
    name="Revoke Share Link",
    operation_id="orchestra_revoke_share",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_share(
    thread_id: str = Path(..., description="Thread ID to revoke share for"),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Revoke the share link for a thread.

    Only the thread owner can revoke shares.

    Args:
        thread_id: ID of the thread whose share to revoke
    """
    try:
        async with get_checkpoint_db() as checkpointer:
            share_service = ShareService(
                user_id=user.id,
                store=store,
                checkpointer=checkpointer,
            )

            success = await share_service.revoke_share(thread_id)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Share not found or access denied",
                )

            return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error revoking share: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke share",
        )


@router.get(
    "/shares",
    name="List User Shares",
    operation_id="orchestra_list_shares",
)
async def list_shares(
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """List all share links created by the current user.

    Returns:
        List of share links with metadata
    """
    try:
        async with get_checkpoint_db() as checkpointer:
            share_service = ShareService(
                user_id=user.id,
                store=store,
                checkpointer=checkpointer,
            )

            shares = await share_service.list_user_shares()

            return {
                "shares": [
                    {
                        "prefix": s.token_prefix,
                        "thread_id": s.thread_id,
                        "share_url": "/share/[token]",  # Don't expose full token
                        "allow_follow_up": s.allow_follow_up,
                        "show_files": s.show_files,
                        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                        "view_count": s.view_count,
                        "created_at": s.created_at.isoformat() if s.created_at else None,
                        "is_valid": s.is_valid,
                    }
                    for s in shares
                ]
            }
    except Exception as e:
        logger.exception(f"Error listing shares: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list shares",
        )
