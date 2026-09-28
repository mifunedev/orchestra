import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import psycopg
import pytest
import respx
from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGenerationChunk
from langgraph.store.memory import InMemoryStore
from pydantic import PrivateAttr

from src.integrations.aegra.app import create_app

pytestmark = pytest.mark.skipif(
    not os.environ.get("AEGRA_DATABASE_URL"),
    reason="Requires the isolated database provisioned by backend/scripts/test-aegra-chat-stream.sh",
)


class ToolCallingModel(FakeMessagesListChatModel):
    _seen: list = PrivateAttr(default_factory=list)

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        self._seen.append(list(messages))
        return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        response = self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        message = response.generations[0].message
        yield ChatGenerationChunk(message=AIMessageChunk(**message.model_dump(exclude={"type"})))

    def get_num_tokens_from_messages(self, messages, tools=None):
        return len(messages) * 10


def events(response):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    result = []
    for block in response.text.replace("\r\n", "\n").split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line and not line.startswith(":"))
        if "event" in fields and "data" in fields:
            result.append((fields["event"], json.loads(fields["data"])))
    assert not any(event == "error" for event, _ in result), result
    return result


@pytest.fixture
async def harness(monkeypatch):
    from src.integrations.aegra import authority
    from src.routes.v0.api_tokens import router as token_router
    from src.routes.v0.auth import read_user_details
    from src.routes.v0.tool import router as tool_router
    from src.schemas.models import User
    from src.utils import auth as orchestra_auth

    async with await psycopg.AsyncConnection.connect(os.environ["AEGRA_DATABASE_URL"]) as connection:
        cursor = await connection.execute("SELECT current_database()")
        assert (await cursor.fetchone())[0].startswith("us001_aegra_")
        cursor = await connection.execute("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
        assert (await cursor.fetchone())[0] == 0, "The Aegra test database must be fresh"
        cursor = await connection.execute("SELECT count(*) FROM pg_extension WHERE extname = 'vector'")
        assert (await cursor.fetchone())[0] == 0

    users = [
        User(
            id=uuid4(),
            username=name,
            email=f"{name}@example.com",
            name=name,
            created_at=datetime.now(timezone.utc),
        )
        for name in ("aegra-owner", "aegra-other")
    ]

    class UserDirectory:
        def __init__(self, db, user_id=None):
            self.user_id = user_id

        async def get_by_email(self, email):
            return next((user for user in users if user.email == email), None)

        async def get_by_id(self):
            return next((user for user in users if str(user.id) == str(self.user_id)), None)

    @asynccontextmanager
    async def identity_session():
        yield None

    monkeypatch.setattr(orchestra_auth, "AsyncSessionLocal", identity_session)
    monkeypatch.setattr(orchestra_auth, "UserRepo", UserDirectory)
    monkeypatch.setattr("src.tools.APP_ENV", "test")
    monkeypatch.setenv("ORCHESTRA_API_URL", "http://orchestra.test")
    store = InMemoryStore()
    orchestra = FastAPI()
    orchestra.state.store = store
    orchestra.get("/api/auth/user")(read_user_details)
    orchestra.include_router(tool_router, prefix="/api")
    orchestra.include_router(token_router, prefix="/api")
    authority_calls = []

    @orchestra.middleware("http")
    async def count_authority_requests(request, call_next):
        if request.url.path == "/api/auth/user":
            authority_calls.append(request.url.path)
        return await call_next(request)

    @asynccontextmanager
    async def authority_client():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=orchestra), base_url="http://orchestra.test"
        ) as client:
            yield client

    monkeypatch.setattr(authority, "client", authority_client)
    owner, other = [{"Authorization": f"Bearer {orchestra_auth.create_access_token(user)}"} for user in users]
    FastAPICache.init(InMemoryBackend(), prefix="aegra-us001-" + uuid4().hex)
    try:
        with respx.mock:
            app = create_app()
            async with app.router.lifespan_context(app):
                async with (
                    httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://aegra.test") as client,
                    authority_client() as orchestra_client,
                ):
                    assert (await orchestra_client.get("/api/auth/user", headers=other)).status_code == 200
                    yield SimpleNamespace(
                        client=client,
                        owner=owner,
                        other=other,
                        user_id=str(users[0].id),
                        store=store,
                        orchestra=orchestra_client,
                        authority_calls=authority_calls,
                    )
    finally:
        FastAPICache.reset()


@pytest.mark.asyncio
async def test_new_aegra_thread_two_turns_tool_stream_and_isolation(harness, monkeypatch):
    from src.controllers.llm import LLMController
    from src.repos.thread_repo import ThreadRepo
    from src.utils import stream

    client, owner, other = harness.client, harness.owner, harness.other
    legacy_calls = []

    def forbidden(*args, **kwargs):
        legacy_calls.append(True)
        raise AssertionError("Aegra must not enter Orchestra streaming")

    monkeypatch.setattr(stream, "stream_generator", forbidden)
    monkeypatch.setattr(LLMController, "llm_stream", forbidden)
    monkeypatch.setattr("src.tools.test.random.randint", lambda lower, upper: 72)
    model = ToolCallingModel(
        responses=[
            AIMessage(
                content="", tool_calls=[{"name": "get_weather", "args": {"location": "Oslo"}, "id": "weather-1"}]
            ),
            AIMessage(content="Oslo is sunny at 72 degrees."),
            AIMessage(content="Earlier we checked Oslo: sunny at 72 degrees."),
        ]
    )
    monkeypatch.setattr("langchain.chat_models.init_chat_model", lambda **kwargs: model)
    response = await client.post("/api/aegra/threads", json={}, headers=owner)
    assert response.status_code == 200, response.text
    thread_id = response.json()["thread_id"]
    path = f"/api/aegra/threads/{thread_id}"
    request = {
        "assistant_id": "orchestra",
        "input": {"messages": [{"role": "user", "content": "Check Oslo weather."}]},
        "config": {"configurable": {"model": "openai:gpt-4.1-mini", "tools": ["get_weather"]}},
        "stream_mode": ["messages", "updates", "values"],
    }
    count = len(harness.authority_calls)
    first = events(await client.post(f"{path}/runs/stream", json=request, headers=owner))
    assert len(harness.authority_calls) == count + 1
    encoded = json.dumps(first)
    assert "weather-1" in encoded
    assert "get_weather" in encoded
    assert f"The weather in Oslo is sunny and 72 degrees as seen by {harness.user_id}" in encoded
    assert "Oslo is sunny at 72 degrees." in encoded
    assert any(name.startswith("messages") for name, _ in first)
    run_id = next(data["run_id"] for name, data in first if name == "metadata")
    run = await client.get(f"{path}/runs/{run_id}", headers=owner)
    assert run.status_code == 200
    assert run.json()["status"] == "success"
    attached = await client.get(f"{path}/runs/{run_id}/stream", headers=owner)
    assert attached.status_code == 200, attached.text
    assert attached.headers["content-type"].startswith("text/event-stream")

    request["input"]["messages"][0]["content"] = "What did we check earlier?"
    count = len(harness.authority_calls)
    second = events(await client.post(f"{path}/runs/stream", json=request, headers=owner))
    assert len(harness.authority_calls) == count + 1
    assert "Earlier we checked Oslo" in json.dumps(second)
    assert any(message.type == "tool" and message.tool_call_id == "weather-1" for message in model._seen[-1])
    assert any(message.content == "Check Oslo weather." for message in model._seen[-1])
    state = await client.get(f"{path}/state", headers=owner)
    assert state.status_code == 200, state.text
    assert "weather-1" in json.dumps(state.json())
    assert "What did we check earlier?" in json.dumps(state.json())

    for headers in ({}, {"Authorization": "Bearer invalid"}):
        assert (await client.post("/api/aegra/threads", json={}, headers=headers)).status_code == 401
        assert (await client.get(f"{path}/runs/{run_id}/stream", headers=headers)).status_code == 401
        assert (await client.post(f"{path}/runs/stream", json=request, headers=headers)).status_code == 401
    for suffix in ("", "/state", f"/runs/{run_id}", f"/runs/{run_id}/stream"):
        assert (await client.get(path + suffix, headers=other)).status_code in (403, 404)
    assert (await client.post(f"{path}/runs/stream", json=request, headers=other)).status_code in (403, 404)
    request["config"]["configurable"]["tools"] = ["not-an-orchestra-tool"]
    assert (await client.post(f"{path}/runs/stream", json=request, headers=owner)).status_code == 422
    request["config"]["configurable"] = {"user_id": str(uuid4())}
    assert (await client.post(f"{path}/runs/stream", json=request, headers=owner)).status_code == 422
    assert await ThreadRepo(harness.user_id, harness.store).get(thread_id) is None
    assert await harness.store.asearch(()) == []
    token = await harness.orchestra.post("/api/tokens", json={"name": "us001"}, headers=owner)
    assert token.status_code == 200, token.text
    key_headers = {"x-api-key": token.json()["token"]}
    assert (await client.get(path, headers=key_headers)).status_code == 200
    revoked = await harness.orchestra.delete(f"/api/tokens/{token.json()['api_token']['id']}", headers=owner)
    assert revoked.status_code == 200
    assert (await client.post(f"{path}/runs/stream", json=request, headers=key_headers)).status_code == 401
    assert not legacy_calls
    async with await psycopg.AsyncConnection.connect(os.environ["AEGRA_DATABASE_URL"]) as connection:
        cursor = await connection.execute("SELECT count(*) FROM thread WHERE thread_id = %s", (thread_id,))
        assert (await cursor.fetchone())[0] == 1
        cursor = await connection.execute("SELECT count(*) FROM runs WHERE thread_id = %s", (thread_id,))
        assert (await cursor.fetchone())[0] == 2
        cursor = await connection.execute("SELECT count(*) FROM checkpoints WHERE thread_id = %s", (thread_id,))
        assert (await cursor.fetchone())[0] > 0
        cursor = await connection.execute("SELECT row_to_json(r)::text FROM runs r WHERE thread_id = %s", (thread_id,))
        persisted = str(await cursor.fetchall())
        assert owner["Authorization"].removeprefix("Bearer ") not in persisted
        assert key_headers["x-api-key"] not in persisted
        cursor = await connection.execute("SELECT count(*) FROM pg_extension WHERE extname = 'vector'")
        assert (await cursor.fetchone())[0] == 0
        cursor = await connection.execute("SELECT to_regclass('public.users')")
        assert (await cursor.fetchone())[0] is None


def test_no_legacy_database_bootstrap():
    backend = Path(__file__).parents[2]
    forbidden = {backend / "conftest.py", backend / "tests/conftest.py"}
    loaded = {
        Path(module.__file__).resolve() for module in tuple(sys.modules.values()) if getattr(module, "__file__", None)
    }
    assert not forbidden & loaded


def test_service_registration():
    config = json.loads((Path(__file__).parents[2] / "src/integrations/aegra/aegra.json").read_text())
    assert config["graphs"] == {"orchestra": "./graph.py:graph"}
    assert config["auth"]["path"] == "src.integrations.aegra.auth:auth"
