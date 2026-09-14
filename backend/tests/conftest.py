import pytest
import asyncio
import respx
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from main import app
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from src.constants import DB_URI
from src.services.db import get_async_db, get_store, get_store_db, get_checkpoint_db
from src.utils.db import get_asyncpg_connect_args, get_asyncpg_url
from langgraph.store.memory import InMemoryStore
from taskiq import InMemoryBroker


async def ensure_database_exists(db_uri: str) -> None:
    """Create the database if it doesn't exist."""
    if "/" not in db_uri:
        return

    url = make_url(db_uri)
    db_name = url.database
    postgres_uri = url.set(database="postgres")

    try:
        engine = create_async_engine(
            get_asyncpg_url(postgres_uri),
            isolation_level="AUTOCOMMIT",
            connect_args=get_asyncpg_connect_args(postgres_uri, statement_cache_size=None),
        )
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": db_name},
            )
            if not result.fetchone():
                await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
        await engine.dispose()
    except (OperationalError, ProgrammingError):
        pass


# Ensure database exists before tests run
asyncio.run(ensure_database_exists(DB_URI))


class TestInMemoryStore(InMemoryStore):
    """Wrapper around InMemoryStore that allows setting fields attribute."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields = ["page_content", "metadata"]


@pytest.fixture(autouse=True)
def reset_store_singleton():
    """Clear the process store singleton around every test.

    `get_shared_store()` caches in a module global that outlives any
    `with patch("src.services.db.get_store_db", ...)` block. Without this, the
    first test to construct the singleton pins its double for the whole session:
    every later patch is silently ignored, and the suite becomes
    collection-order-dependent.

    Deliberately **synchronous**. pytest does not apply async autouse fixtures to
    `unittest.IsolatedAsyncioTestCase` classes (`tests/unit/services/prompt/
    test_distill.py` has two), and those build a fresh event loop per test
    method — exactly the case where a cached, loop-bound store does the most
    damage. Dropping the references is enough here; tests that create a *real*
    store are responsible for awaiting `close_shared_store()` themselves.
    """
    from src.services import db as db_module

    db_module._reset_shared_store_state()
    yield
    db_module._reset_shared_store_state()


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture
async def test_engine():
    """Create a fresh async engine for each test."""
    url = get_asyncpg_url(DB_URI)

    try:
        engine = create_async_engine(
            url,
            echo=False,
            poolclass=NullPool,  # No connection pooling for tests
            connect_args=get_asyncpg_connect_args(DB_URI),
        )

        # Test connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

        yield engine
        await engine.dispose()
    except Exception as e:
        pytest.fail(
            f"Failed to connect to test database.\n"
            f"Connection string: {url}\n"
            f"Error: {e}\n\n"
            f"Make sure PostgreSQL is running and accessible.\n"
            f"For CI: Ensure PostgreSQL service is configured in workflow.\n"
            f"For local: Start PostgreSQL with the docker run block in README.md, "
            f"or check your .env file."
        )


@pytest.fixture
async def test_db(test_engine):
    """Provide a test database session."""
    async_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        yield session


@pytest.fixture
async def test_store():
    """Provide a test store (in-memory for faster tests)."""
    store = TestInMemoryStore()
    yield store


@pytest.fixture
async def test_postgres_store():
    """Provide a real postgres store with setup() called."""
    async with get_store_db() as store:
        await store.setup()
        yield store


@pytest.fixture
async def test_checkpoint_saver():
    """Provide a real postgres checkpoint saver with setup() called."""
    async with get_checkpoint_db() as saver:
        await saver.setup()
        yield saver


@pytest.fixture
async def async_client(test_store, test_db):
    """Async HTTP client for testing with store and db overrides."""
    from fastapi import Request

    # Override dependencies
    async def override_get_async_db():
        yield test_db

    def override_get_store(req: Request):
        return test_store

    app.dependency_overrides[get_async_db] = override_get_async_db
    app.dependency_overrides[get_store] = override_get_store
    app.state.store = test_store

    transport = ASGITransport(app=app)
    # Patch is_authorized_model to allow all models in tests (no API keys = empty free list)
    with patch("src.utils.auth.is_authorized_model", return_value=True):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client_postgres(test_postgres_store, test_db):
    """Async HTTP client for testing with real postgres store."""
    from fastapi import Request

    # Override dependencies
    async def override_get_async_db():
        yield test_db

    def override_get_store(req: Request):
        return test_postgres_store

    app.dependency_overrides[get_async_db] = override_get_async_db
    app.dependency_overrides[get_store] = override_get_store
    app.state.store = test_postgres_store

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
async def mock_external_services():
    """Mock external services to prevent real API calls during tests."""
    with respx.mock:
        # Mock Airtable API endpoints
        respx.post("https://api.airtable.com/v0/app6sU4AprV9uZze6/Contacts").mock(
            return_value=respx.MockResponse(status_code=200, json={"id": "mock_record_id", "fields": {}})
        )
        respx.get("https://api.airtable.com/v0/app6sU4AprV9uZze6/Contacts").mock(
            return_value=respx.MockResponse(
                status_code=200,
                json={"records": [{"id": "mock_record_id", "fields": {}}]},
            )
        )
        respx.route(
            method="PATCH",
            url__regex=r"^https://api\.airtable\.com/v0/app6sU4AprV9uZze6/Contacts/.+$",
        ).mock(return_value=respx.MockResponse(status_code=200, json={"id": "mock_record_id", "fields": {}}))

        # Mock OpenAI Chat API endpoints
        respx.post(url__regex=r"^https://api\.openai\.com/v1/chat/completions.*").mock(
            return_value=respx.MockResponse(
                status_code=200,
                json={
                    "id": "chatcmpl-mock",
                    "object": "chat.completion",
                    "created": 1234567890,
                    "model": "gpt-4",
                    "choices": [
                        {
                            "index": 0,
                            "message": {
                                "role": "assistant",
                                "content": "Mock response",
                            },
                            "finish_reason": "stop",
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 10,
                        "completion_tokens": 20,
                        "total_tokens": 30,
                    },
                },
            )
        )

        # Mock the OpenAI Responses API. Reasoning models are routed here rather
        # than to chat/completions -- see src/utils/reasoning.py.
        respx.post(url__regex=r"^https://api\.openai\.com/v1/responses.*").mock(
            return_value=respx.MockResponse(
                status_code=200,
                json={
                    "id": "resp-mock",
                    "object": "response",
                    "created_at": 1234567890,
                    "model": "gpt-5-mock",
                    "status": "completed",
                    "output": [
                        {
                            "id": "msg-mock",
                            "type": "message",
                            "role": "assistant",
                            "status": "completed",
                            "content": [{"type": "output_text", "text": "Mock response", "annotations": []}],
                        }
                    ],
                    "usage": {
                        "input_tokens": 10,
                        "output_tokens": 20,
                        "total_tokens": 30,
                    },
                },
            )
        )

        # Mock OpenAI Embeddings API endpoints
        respx.post(url__regex=r"^https://api\.openai\.com/v1/embeddings.*").mock(
            return_value=respx.MockResponse(
                status_code=200,
                json={
                    "object": "list",
                    "data": [
                        {
                            "object": "embedding",
                            "embedding": [0.1] * 1536,  # Mock embedding vector
                            "index": 0,
                        }
                    ],
                    "model": "text-embedding-ada-002",
                    "usage": {"prompt_tokens": 10, "total_tokens": 10},
                },
            )
        )

        # Mock Anthropic API endpoints
        respx.post(url__regex=r"^https://api\.anthropic\.com/.*").mock(
            return_value=respx.MockResponse(
                status_code=200,
                json={
                    "id": "msg_mock",
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "text", "text": "Mock response"}],
                    "model": "claude-3-opus-20240229",
                    "stop_reason": "end_turn",
                    "usage": {"input_tokens": 10, "output_tokens": 20},
                },
            )
        )

        yield


# @pytest.fixture
# async def test_user(test_db):
#     """Ensure test user exists in database."""
#     user_repo = UserRepo(test_db)
#     user = await user_repo.get_by_email("admin@example.com")

#     if not user:
#         # Create test user if not exists
#         user = User(
#             email="admin@example.com",
#             username="admin",
#             full_name="Test Admin",
#             hashed_password=User.hash_password("test1234"),
#             access=1,
#         )
#         test_db.add(user)
#         await test_db.commit()
#         await test_db.refresh(user)

#     return user


# @pytest.fixture
# async def auth_headers(async_client, test_user):
#     """Get authentication headers for testing."""
#     data = {"email": "admin@example.com", "password": "test1234"}
#     response = await async_client.post("/api/auth/login", json=data)
#     assert response.status_code == 200, f"Login failed: {response.text}"
#     token = response.json()["access_token"]
#     return {"Authorization": f"Bearer {token}", "accept": "application/json"}


###############################################################################
# TaskIQ / Redis Fixtures for Distributed Workers Testing
###############################################################################
@pytest.fixture
def in_memory_broker():
    """Provide an InMemoryBroker for testing tasks without Redis."""
    return InMemoryBroker()


@pytest.fixture
async def fake_redis():
    """Provide a FakeRedis async client for testing Redis streams."""
    import fakeredis.aioredis

    client = fakeredis.aioredis.FakeRedis(decode_responses=False)
    yield client
    await client.flushall()
    await client.aclose()


@pytest.fixture
def sample_llm_request_dict():
    """Provide a sample LLMRequest as dict for task testing."""
    return {
        "input": {"messages": [{"role": "user", "content": "Hello, test!"}]},
        "model": "openai:gpt-4.1-mini",
        "metadata": {"user_id": None, "thread_id": None},
    }


@pytest.fixture
def sample_config_dict():
    """Provide a sample config dict for task testing."""
    return {
        "configurable": {
            "thread_id": "test-thread-123",
            "assistant_id": "test-assistant",
        },
        "metadata": {"files": {}, "todos": []},
    }
