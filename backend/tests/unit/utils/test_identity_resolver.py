from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from starlette.requests import Request

from src.constants import JWT_ALGORITHM, JWT_SECRET_KEY
from src.utils import auth

USER_ID = "2f691fa4-b107-4a92-94b4-78170647640e"
EMAIL = "user@example.com"


class Sessions:
    def __init__(self):
        self.active = 0
        self.opened = 0

    def __call__(self):
        return self

    async def __aenter__(self):
        self.active += 1
        self.opened += 1
        return self

    async def __aexit__(self, *_):
        self.active -= 1


def user(id=USER_ID, email=EMAIL):
    identity = SimpleNamespace(id=id, email=email, username="user", name="User")
    return SimpleNamespace(protected=lambda: identity)


def signed(claims=None, *, expires=True):
    payload = {"user": {"id": USER_ID, "email": EMAIL, "sub": EMAIL}}
    if expires:
        payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=10)
    if claims:
        payload.update(claims)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


@pytest.fixture
def repos(monkeypatch):
    token = SimpleNamespace(id="token-id", user_id=USER_ID)
    token_repo = SimpleNamespace(get_by_hash_global=AsyncMock(return_value=token), update_last_used=AsyncMock())
    user_repo = SimpleNamespace(get_by_email=AsyncMock(return_value=user()), get_by_id=AsyncMock(return_value=user()))
    monkeypatch.setattr(auth, "ApiTokenRepo", lambda *_: token_repo)
    monkeypatch.setattr(auth, "UserRepo", lambda *args, **kwargs: user_repo)
    return token_repo, user_repo


@pytest.mark.asyncio
async def test_jwt_returns_detached_canonical_user(repos):
    _, user_repo = repos
    sessions = Sessions()
    identity = await auth.resolve_identity({}, signed(), object(), sessions)
    assert identity.id == USER_ID
    assert sessions.opened == 1
    assert sessions.active == 0
    user_repo.get_by_email.assert_awaited_once_with(EMAIL)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "bearer",
    [
        None,
        "not-a-jwt-secret-string",
        signed(expires=False),
        signed({"exp": datetime.now(timezone.utc) - timedelta(seconds=1)}),
        signed({"user": {"id": USER_ID, "email": EMAIL}}),
        signed({"user": {"id": "different", "email": EMAIL, "sub": EMAIL}}),
        signed({"user": {"id": USER_ID, "email": EMAIL, "sub": "other@example.com"}}),
        signed({"user": {"id": USER_ID, "email": EMAIL, "sub": EMAIL}, "exp": "invalid"}),
        signed({"user": "not-a-user"}),
    ],
)
async def test_invalid_jwt_fails_closed(repos, bearer):
    sessions = Sessions()
    with pytest.raises(HTTPException) as error:
        await auth.resolve_identity({}, bearer, object(), sessions)
    assert error.value.status_code == 401
    assert sessions.active == 0


@pytest.mark.asyncio
async def test_deleted_or_changed_jwt_user_fails_closed(repos):
    _, user_repo = repos
    sessions = Sessions()
    for persisted in (None, user(id="other"), user(email="changed@example.com")):
        user_repo.get_by_email.return_value = persisted
        with pytest.raises(HTTPException) as error:
            await auth.resolve_identity({}, signed(), object(), sessions)
        assert error.value.status_code == 401
        assert sessions.active == 0


@pytest.mark.asyncio
async def test_api_key_lookup_usage_and_session_teardown(repos):
    token_repo, user_repo = repos
    sessions = Sessions()

    async def update_after_close(_):
        assert sessions.active == 0

    token_repo.update_last_used.side_effect = update_after_close
    identity = await auth.resolve_identity({"x-api-key": "secret-api-key"}, signed(), object(), sessions)
    assert identity.id == USER_ID
    token_repo.get_by_hash_global.assert_awaited_once_with(auth.hash_token("secret-api-key"))
    user_repo.get_by_id.assert_awaited_once_with()
    token_repo.update_last_used.assert_awaited_once_with("token-id")
    assert sessions.opened == 1
    assert sessions.active == 0


@pytest.mark.asyncio
async def test_revoked_deleted_and_invalid_api_key_fail_closed(repos):
    token_repo, user_repo = repos
    sessions = Sessions()
    token_repo.get_by_hash_global.return_value = None
    with pytest.raises(HTTPException) as error:
        await auth.resolve_identity({"x-api-key": "revoked"}, signed(), object(), sessions)
    assert error.value.status_code == 401
    assert sessions.opened == 0
    token_repo.get_by_hash_global.return_value = SimpleNamespace(id="token-id", user_id=USER_ID)
    user_repo.get_by_id.return_value = None
    with pytest.raises(HTTPException) as error:
        await auth.resolve_identity({"x-api-key": "deleted"}, signed(), object(), sessions)
    assert error.value.status_code == 401
    assert sessions.active == 0
    token_repo.update_last_used.assert_not_awaited()
    user_repo.get_by_id.return_value = user(id="wrong-user")
    with pytest.raises(HTTPException) as error:
        await auth.resolve_identity({"x-api-key": "mismatched-owner"}, signed(), object(), sessions)
    assert error.value.status_code == 401
    token_repo.update_last_used.assert_not_awaited()
    with pytest.raises(HTTPException):
        await auth.resolve_identity({"x-api-key": "no-store"}, signed(), None, sessions)


@pytest.mark.asyncio
async def test_api_key_failure_does_not_log_secrets(repos, monkeypatch):
    token_repo, _ = repos
    secret = "private-api-key-token"
    jwt_secret = "private-jwt-token"
    logged = []
    monkeypatch.setattr(auth.logger, "warning", lambda message: logged.append(message))
    token_repo.get_by_hash_global.side_effect = RuntimeError(secret)
    with pytest.raises(HTTPException):
        await auth.resolve_identity({"x-api-key": secret}, jwt_secret, object(), Sessions())
    with pytest.raises(HTTPException):
        await auth.resolve_identity({}, jwt_secret, object(), Sessions())
    assert secret not in str(logged)
    assert jwt_secret not in str(logged)


@pytest.mark.asyncio
async def test_verify_credentials_sets_request_state_after_session_closes(repos, monkeypatch):
    sessions = Sessions()
    monkeypatch.setattr(auth, "AsyncSessionLocal", sessions)
    store = object()
    request = Request({"type": "http", "headers": [], "app": SimpleNamespace(state=SimpleNamespace(store=store))})
    token = signed()
    identity = await auth.verify_credentials(request, HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    assert request.state.user is identity
    assert request.state.token == token
    assert sessions.active == 0
