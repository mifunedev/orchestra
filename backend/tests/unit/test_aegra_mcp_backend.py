import importlib
from types import SimpleNamespace

import httpx
import pytest
from deepagents.backends import CompositeBackend, StateBackend

from src.agents.mcp_sandbox import McpSandboxError
from src.integrations.aegra import authority
from src.integrations.aegra.mcp_backend import AuthenticatedMcpSandboxBackend


graph_module = importlib.import_module("src.integrations.aegra.graph")


@pytest.fixture
def owner(monkeypatch):
    monkeypatch.setenv("ORCHESTRA_API_URL", "http://orchestra.test")
    token = authority.credentials.set(authority.Credentials("owner", {"Authorization": "Bearer owner-token"}))
    yield
    authority.credentials.reset(token)


async def build_graph(monkeypatch, sandbox, *, url=None, tools=None):
    requests = []
    created = []

    async def request(method, path, headers):
        requests.append((method, path, headers))
        return {"defaults": {"sandbox": sandbox, "mcp_sandbox_url": url}}

    monkeypatch.setattr(authority, "request", request)
    monkeypatch.setattr(graph_module, "init_graph", lambda **kwargs: created.append(kwargs) or kwargs)
    monkeypatch.setattr(graph_module, "get_default_system_prompt", lambda: "system")
    config = {"configurable": {"tools": tools or [], "langgraph_auth_user": SimpleNamespace(identity="owner")}}
    result = await graph_module.graph(config)
    return result, requests, created


@pytest.mark.asyncio
async def test_saved_mcp_uses_authenticated_proxy_without_saving_key(monkeypatch, owner):
    graph, requests, _ = await build_graph(monkeypatch, "mcp", url="https://private.example/mcp")
    backend = graph["backend"](object())
    assert isinstance(backend, CompositeBackend)
    assert isinstance(backend.default, AuthenticatedMcpSandboxBackend)
    assert backend.default._base_url == "http://orchestra.test/api/sandbox"
    assert backend.default._api_key is None
    assert requests == [("GET", "/api/settings", {"Authorization": "Bearer owner-token"})]
    backend.default._session_id = "session-1"
    assert backend.default._build_headers(include_session=True) == {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": "session-1",
        "Authorization": "Bearer owner-token",
    }
    assert "private.example" not in repr(graph)
    assert "owner-token" not in repr(backend.default.__dict__)


@pytest.mark.asyncio
@pytest.mark.parametrize("selection", ["state", "auto", None])
async def test_state_or_unset_uses_state_backend(monkeypatch, owner, selection):
    graph, _, _ = await build_graph(monkeypatch, selection, url="https://private.example/mcp")
    assert isinstance(graph["backend"](object()).default, StateBackend)


@pytest.mark.asyncio
async def test_explicit_daytona_fails_instead_of_using_state(monkeypatch, owner):
    with pytest.raises(Exception, match="Unsupported Aegra sandbox selection"):
        await build_graph(monkeypatch, "daytona")


@pytest.mark.asyncio
async def test_missing_mcp_url_fails_instead_of_using_state(monkeypatch, owner):
    for url in (None, "  "):
        with pytest.raises(Exception, match="MCP Sandbox URL is not configured"):
            await build_graph(monkeypatch, "mcp", url=url)


@pytest.mark.asyncio
async def test_requested_tools_keep_catalog_authorization(monkeypatch, owner):
    definition = {"name": "search", "args_schema": {"type": "object", "properties": {}}}

    async def catalog():
        return {"search": definition}

    monkeypatch.setattr(authority, "catalog", catalog)
    graph, _, _ = await build_graph(monkeypatch, "mcp", url="http://private.test/mcp", tools=["search"])
    assert [tool.name for tool in graph["tools"]] == ["search"]
    with pytest.raises(PermissionError, match="Unknown or unauthorized"):
        await build_graph(monkeypatch, "state", tools=["not-in-catalog"])


def test_authenticated_client_disables_environment_proxy_and_redirects(monkeypatch, owner):
    monkeypatch.setenv("HTTP_PROXY", "http://proxy.invalid:8080")
    monkeypatch.setenv("HTTPS_PROXY", "http://proxy.invalid:8080")
    original_client = httpx.Client
    clients = []
    configurations = []

    def record_client(*args, **kwargs):
        configurations.append(kwargs)
        client = original_client(*args, **kwargs)
        clients.append(client)
        return client

    monkeypatch.setattr(httpx, "Client", record_client)
    backend = AuthenticatedMcpSandboxBackend()
    try:
        assert len(clients) == 2
        assert clients[0].is_closed
        assert backend._client is clients[1]
        assert configurations[1]["trust_env"] is False
        assert configurations[1]["follow_redirects"] is False
        assert configurations[1]["timeout"].read == 120.0
    finally:
        backend._client.close()


def test_identity_cannot_reuse_first_users_backend(monkeypatch, owner):
    backend = AuthenticatedMcpSandboxBackend()
    first = backend._build_headers()
    token = authority.credentials.set(authority.Credentials("other", {"x-api-key": "other-token"}))
    try:
        with pytest.raises(PermissionError, match="identity mismatch"):
            backend._build_headers()
        second = AuthenticatedMcpSandboxBackend()
        assert second._build_headers()["x-api-key"] == "other-token"
        assert "Authorization" not in second._build_headers()
        assert "x-api-key" not in first
    finally:
        authority.credentials.reset(token)


def test_unreachable_proxy_reports_mcp_error_without_state_fallback(monkeypatch, owner):
    backend = graph_module.mcp_backend(object()).default

    def unavailable(request):
        assert request.url == "http://orchestra.test/api/sandbox/mcp"
        assert request.headers["authorization"] == "Bearer owner-token"
        raise httpx.ConnectError("proxy unavailable")

    backend._client.close()
    backend._client = httpx.Client(transport=httpx.MockTransport(unavailable))
    try:
        with pytest.raises(McpSandboxError, match="MCP initialize failed"):
            backend.execute("pwd")
    finally:
        backend._client.close()
