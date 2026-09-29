import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.routes.v0.sandbox import router
from src.services.db import get_store
from src.utils.auth import verify_credentials

INIT = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
READY = {"jsonrpc": "2.0", "method": "notifications/initialized"}
LIST = {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
CALL = {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "execute", "arguments": {}}}


@pytest.fixture
def proxy():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    user = SimpleNamespace(id="alice")
    store = object()
    app.dependency_overrides[verify_credentials] = lambda: user
    app.dependency_overrides[get_store] = lambda: store
    repo = Mock()
    repo._get_or_create = AsyncMock(
        return_value=SimpleNamespace(default_sandbox="mcp", default_mcp_sandbox_url="https://sandbox.example/mcp/")
    )
    repo._decrypt_keys.return_value = {"MCP_SANDBOX_API_KEY": "secret-alice"}
    with patch("src.routes.v0.sandbox.UserSettingsRepo", return_value=repo) as repo_class:
        yield app, user, store, repo, repo_class


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(proxy):
    app, _, _, _, _ = proxy
    app.dependency_overrides.pop(verify_credentials)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/sandbox/mcp", json=INIT)
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "sandbox,url", [(None, "https://sandbox.example"), ("state", "https://sandbox.example"), ("mcp", None)]
)
async def test_not_configured_rejects_without_upstream(proxy, sandbox, url):
    app, _, _, repo, _ = proxy
    repo._get_or_create.return_value = SimpleNamespace(default_sandbox=sandbox, default_mcp_sandbox_url=url)
    with patch("src.routes.v0.sandbox.httpx.AsyncClient") as upstream:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/sandbox/mcp", json=INIT)
    assert response.status_code == 409
    upstream.assert_not_called()
    repo._decrypt_keys.assert_not_called()


@pytest.mark.asyncio
async def test_user_settings_and_key_scoped_per_request(proxy):
    app, user, store, _, repo_class = proxy
    calls = []

    def repo_for(user_id, passed_store):
        assert passed_store is store
        repo = Mock()
        repo._get_or_create = AsyncMock(
            return_value=SimpleNamespace(default_sandbox="mcp", default_mcp_sandbox_url=f"https://{user_id}.example")
        )
        repo._decrypt_keys.return_value = {"MCP_SANDBOX_API_KEY": f"secret-{user_id}"}
        return repo

    repo_class.side_effect = repo_for

    def upstream(request):
        calls.append(request)
        return httpx.Response(200, json={"jsonrpc": "2.0", "result": {}})

    upstream_client = httpx.AsyncClient
    with patch("src.routes.v0.sandbox.httpx.AsyncClient") as client_class:
        client_class.side_effect = lambda **kwargs: upstream_client(transport=httpx.MockTransport(upstream), **kwargs)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for name in ("alice", "bob"):
                user.id = name
                response = await client.post(
                    "/api/sandbox/mcp",
                    json=INIT,
                    headers={"authorization": "Bearer orchestra-token", "x-api-key": "caller-key"},
                )
                assert response.status_code == 200
                assert f"secret-{name}" not in response.text
    assert [str(call.url) for call in calls] == ["https://alice.example/mcp", "https://bob.example/mcp"]
    assert [call.headers["x-api-key"] for call in calls] == ["secret-alice", "secret-bob"]
    assert all("authorization" not in call.headers for call in calls)
    assert [entry.args[0] for entry in repo_class.call_args_list] == ["alice", "bob"]


@pytest.mark.asyncio
async def test_handshake_session_sse_json_and_retry_status(proxy):
    app, _, _, _, _ = proxy
    requests = []
    sse = b'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n\n'

    def upstream(request):
        requests.append(request)
        method = json.loads(request.content)["method"]
        if method == "initialize":
            return httpx.Response(
                200,
                content=b'{"jsonrpc":"2.0","id":1,"result":{}}',
                headers={"content-type": "application/json", "mcp-session-id": "session-1"},
            )
        if method == "notifications/initialized":
            return httpx.Response(202)
        if method == "tools/list":
            return httpx.Response(200, content=sse, headers={"content-type": "text/event-stream"})
        return httpx.Response(400, content=b'{"error":"session expired"}', headers={"content-type": "application/json"})

    upstream_client = httpx.AsyncClient
    with patch("src.routes.v0.sandbox.httpx.AsyncClient") as client_class:
        client_class.side_effect = lambda **kwargs: upstream_client(transport=httpx.MockTransport(upstream), **kwargs)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            first = await client.post("/api/sandbox/mcp", json=INIT)
            assert first.headers["mcp-session-id"] == "session-1"
            assert first.content == b'{"jsonrpc":"2.0","id":1,"result":{}}'
            assert first.headers["content-type"] == "application/json"
            for payload, expected_status, expected_body, content_type in (
                (READY, 202, b"", None),
                (LIST, 200, sse, "text/event-stream"),
                (CALL, 400, b'{"error":"session expired"}', "application/json"),
            ):
                response = await client.post("/api/sandbox/mcp", json=payload, headers={"mcp-session-id": "session-1"})
                assert response.status_code == expected_status
                assert response.content == expected_body
                if content_type:
                    assert response.headers["content-type"] == content_type
    assert len(requests) == 4
    assert all(str(req.url) == "https://sandbox.example/mcp" for req in requests)
    assert all(req.headers["mcp-session-id"] == "session-1" for req in requests[1:])
    assert all(req.headers["x-api-key"] == "secret-alice" for req in requests)


@pytest.mark.asyncio
async def test_unavailable_and_key_echo_do_not_leak(proxy):
    app, _, _, _, _ = proxy
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("src.routes.v0.sandbox.httpx.AsyncClient") as upstream:
            upstream.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.ConnectError("secret-alice network failure")
            )
            response = await client.post("/api/sandbox/mcp", json=INIT)
        assert response.status_code == 502
        assert "secret-alice" not in response.text
        with patch("src.routes.v0.sandbox.httpx.AsyncClient") as upstream:
            upstream.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=httpx.Response(200, content=b"secret-alice")
            )
            response = await client.post("/api/sandbox/mcp", json=INIT)
        assert response.status_code == 502
        assert "secret-alice" not in response.text


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"jsonrpc": "2.0", "method": "resources/list", "id": 1},
        {"jsonrpc": "2.0", "method": "tools/list", "id": 1, "url": "https://attacker.example"},
        {"jsonrpc": "2.0", "method": ["tools/list"], "id": 1},
    ],
)
async def test_reject_non_transport_requests(proxy, payload):
    app, _, _, _, _ = proxy
    with patch("src.routes.v0.sandbox.httpx.AsyncClient") as upstream:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/sandbox/mcp", json=payload)
    assert response.status_code == 400
    upstream.assert_not_called()
