"""Auth must not hold a pooled DB connection for the duration of a request.

Previously these dependencies took `db: AsyncSession = Depends(get_async_db, scope="function")`.
Function scope releases the session when the *path operation function* returns — which for
/llm/invoke is after a full agent turn, and for the SSE path after the whole stream. One
pooled connection was therefore pinned per in-flight request, exhausting the pool and
returning 500 for every authenticated route (issue #955).

Auth now opens its own short-lived session around the user lookup, so these tests assert
the stronger property: no session dependency at all.
"""

import inspect
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from starlette.requests import Request
from starlette.responses import StreamingResponse

from src.utils import auth
from src.utils.auth import (
    get_optional_user,
    get_optional_user_from_token,
    resolve_identity,
    verify_credentials,
)

AUTH_DEPENDENCIES = (
    get_optional_user_from_token,
    get_optional_user,
    verify_credentials,
)


def test_auth_does_not_take_a_session_dependency() -> None:
    """A `db` parameter here means the connection is held for the whole request again."""
    for dependency in AUTH_DEPENDENCIES:
        parameters = inspect.signature(dependency).parameters
        assert "db" not in parameters, (
            f"{dependency.__name__}() declares a 'db' dependency. FastAPI runs dependency "
            f"teardown after the endpoint returns, so this pins a pooled connection for the "
            f"entire request — the pool-exhaustion regression from issue #955."
        )


def test_resolver_opens_its_own_short_lived_session() -> None:
    source = inspect.getsource(resolve_identity)
    assert "async with session_factory()" in source
    assert "Depends(get_async_db" not in source


@pytest.mark.asyncio
async def test_session_closes_before_sse_response_streams(monkeypatch) -> None:
    active = 0

    class Session:
        async def __aenter__(self):
            nonlocal active
            active += 1
            return self

        async def __aexit__(self, *_):
            nonlocal active
            active -= 1

    identity = SimpleNamespace(id="user-id", email="user@example.com")
    token = SimpleNamespace(id="token-id", user_id="user-id")
    monkeypatch.setattr(
        auth, "ApiTokenRepo", lambda *_: SimpleNamespace(
            get_by_hash_global=AsyncMock(return_value=token), update_last_used=AsyncMock()
        )
    )
    monkeypatch.setattr(
        auth, "UserRepo", lambda *_args, **_kwargs: SimpleNamespace(
            get_by_id=AsyncMock(return_value=SimpleNamespace(protected=lambda: identity))
        )
    )
    monkeypatch.setattr(auth, "AsyncSessionLocal", Session)
    request = Request({
        "type": "http", "headers": [(b"x-api-key", b"stream-key")],
        "app": SimpleNamespace(state=SimpleNamespace(store=object())),
    })
    resolved = await auth.verify_credentials(request, None)
    assert resolved.id == "user-id"
    assert active == 0

    async def events():
        assert active == 0
        yield "data: ready\\n\\n"
        assert active == 0

    response = StreamingResponse(events(), media_type="text/event-stream")
    chunks = [chunk async for chunk in response.body_iterator]
    assert chunks == ["data: ready\\n\\n"]
    assert active == 0
