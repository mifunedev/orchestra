# Testing Guide

This document describes the testing strategy and patterns used in the Orchestra backend.

## Overview

The test suite uses pytest with async support to test FastAPI endpoints, database operations, and business logic. Tests are isolated from external services through mocking to ensure reliability in CI environments.

## Test Structure

```
tests/
├── conftest.py          # Shared fixtures and test configuration
├── unit/                # Unit tests for individual components
│   ├── repos/          # Repository layer tests
│   └── services/       # Service layer tests
├── integration/         # Integration tests for API endpoints
│   └── test_*.py       # API route tests
└── mock/               # Mock data and utilities
```

## Running Tests

### Local Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/integration/test_project_routes.py

# Run specific test
uv run pytest tests/integration/test_project_routes.py::test_create_project

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Watch mode (requires pytest-watch)
uv run pytest-watch
```

### CI Environment

Tests run automatically in GitHub Actions on every push and pull request. The CI environment:

-   Uses a PostgreSQL service container (pgvector/pgvector:pg16)
-   Runs database migrations before tests
-   Mocks all external HTTP calls (Airtable, LLM APIs)
-   Uses test credentials: `admin@example.com` / `test1234`

## Test Isolation Strategy

### Database Isolation

Each test uses a fresh database session with transaction rollback:

```python
@pytest.fixture
async def test_db(test_engine):
    """Provide a test database session."""
    async_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        yield session
```

The `async_client` fixture overrides the FastAPI dependency to use the test database:

```python
app.dependency_overrides[get_async_db] = override_get_async_db
```

### External Service Mocking

All external HTTP calls are mocked using `respx` to prevent network requests during tests.

#### Airtable Service Mocking

The `mock_airtable_service` fixture (autouse=True) automatically mocks all Airtable API calls:

```python
@pytest.fixture(autouse=True)
async def mock_airtable_service():
    """Mock AirtableService to prevent real API calls during tests."""
    with respx.mock:
        # Mock Airtable API endpoints - return httpx.Response objects
        respx.post("https://api.airtable.com/v0/app6sU4AprV9uZze6/Contacts").mock(
            return_value=respx.MockResponse(status_code=200, json={"id": "mock_record_id", "fields": {}})
        )
        yield
```

This fixture runs automatically for all tests. No explicit mocking is needed in individual test files.

#### Custom HTTP Mocking

For tests that need specific HTTP responses, use `respx` directly:

```python
import respx


async def test_custom_api_call(async_client):
    with respx.mock:
        respx.get("https://api.example.com/data").mock(
            return_value=respx.MockResponse(status_code=200, json={"status": "success", "data": []})
        )

        response = await async_client.get("/api/endpoint")
        assert response.status_code == 200
```

### Test User Fixture

The `test_user` fixture ensures a test user exists before running auth tests:

```python
@pytest.fixture
async def test_user(test_db):
    """Ensure test user exists in database."""
    user_repo = UserRepo(test_db)
    user = await user_repo.get_by_email("admin@example.com")

    if not user:
        # Create test user if not exists
        user = User(
            email="admin@example.com",
            username="admin",
            full_name="Test Admin",
            hashed_password=User.hash_password("test1234"),
            access=1,
        )
        test_db.add(user)
        await test_db.commit()
        await test_db.refresh(user)

    return user
```

## Common Fixtures

### `async_client`

Provides an async HTTP client for testing FastAPI endpoints:

```python
async def test_endpoint(async_client):
    response = await async_client.get("/api/endpoint")
    assert response.status_code == 200
```

### `auth_headers`

Provides authentication headers for protected endpoints:

```python
async def test_protected_endpoint(async_client, auth_headers):
    response = await async_client.get("/api/protected", headers=auth_headers)
    assert response.status_code == 200
```

### `test_db`

Provides a database session for direct database operations:

```python
async def test_database_operation(test_db):
    user_repo = UserRepo(test_db)
    user = await user_repo.get_by_email("admin@example.com")
    assert user is not None
```

### `test_store`

Provides an in-memory LangGraph store for testing agent operations:

```python
async def test_agent_operation(test_store):
    await test_store.put(("namespace", "key"), {"data": "value"})
    result = await test_store.get(("namespace", "key"))
    assert result["data"] == "value"
```

## Writing New Tests

### Integration Test Pattern

```python
import pytest


async def test_create_resource(async_client, auth_headers):
    """Test creating a new resource."""
    # Arrange
    payload = {"name": "Test Resource", "description": "Test description"}

    # Act
    response = await async_client.post("/api/resources", json=payload, headers=auth_headers)

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Resource"
    assert "id" in data
```

### Unit Test Pattern

```python
import pytest
from src.services.example_service import ExampleService


class TestExampleService:
    async def test_process_data(self, test_db):
        """Test data processing logic."""
        # Arrange
        service = ExampleService(test_db)
        input_data = {"value": 42}

        # Act
        result = await service.process(input_data)

        # Assert
        assert result["processed"] is True
        assert result["value"] == 42
```

## Troubleshooting

### Database Connection Errors

If you see errors like `[Errno -2] Name or service not known`:

1. **Local Development**: Ensure PostgreSQL is running

    ```bash
    docker compose up postgres
    ```

2. **CI Environment**: Check that the PostgreSQL service is configured in `.github/workflows/test.yml`

3. **Connection String**: Verify `POSTGRES_CONNECTION_STRING` in your `.env` file:
    ```
    POSTGRES_CONNECTION_STRING=postgresql://admin:test1234@localhost:5432/lg_template_dev?sslmode=disable
    ```

### Test User Not Found

If auth tests fail with "User not found":

1. The `test_user` fixture should automatically create the user
2. Check that migrations have been run: `uv run alembic upgrade head`
3. Manually seed the user: `python -m seeds.user_seeder`

### External API Calls in Tests

If you see real HTTP requests during tests:

1. Ensure `respx` is installed: `uv sync --dev`
2. Check that `mock_airtable_service` fixture is active
3. Add custom mocks for other external services

### Slow Tests

If tests are running slowly:

1. Check for real database connections (should use test database)
2. Verify external HTTP calls are mocked
3. Use `pytest -v --durations=10` to identify slow tests

## Best Practices

### DO

✅ Use fixtures for common setup (database, auth, mocks)  
✅ Mock external HTTP calls with `respx`  
✅ Test observable behavior, not implementation details  
✅ Use descriptive test names that explain what is being tested  
✅ Follow Arrange-Act-Assert pattern  
✅ Clean up resources in fixtures (use `yield`)  
✅ Use `async`/`await` for all async operations

### DON'T

❌ Make real HTTP calls to external APIs  
❌ Use production database credentials in tests  
❌ Share mutable state between tests  
❌ Test internal implementation details  
❌ Skip error cases (test both success and failure paths)  
❌ Use `time.sleep()` (use proper async patterns)  
❌ Commit test database files

## Continuous Integration

### GitHub Actions Workflow

The test workflow (`.github/workflows/test.yml`):

1. Starts PostgreSQL service container
2. Installs Python dependencies with `uv`
3. Waits for PostgreSQL to be ready
4. Runs database migrations
5. Executes test suite with `pytest`

### Environment Variables

CI tests use these environment variables:

-   `APP_ENV=test` - Enables test mode
-   `POSTGRES_CONNECTION_STRING` - Points to service container
-   `OPENAI_API_KEY` - For LLM integration tests (optional)
-   `ANTHROPIC_API_KEY` - For LLM integration tests (optional)

### Test Markers

Use pytest markers to categorize tests:

```python
@pytest.mark.integration
async def test_full_integration():
    """Test that requires real external services."""
    pass


@pytest.mark.slow
async def test_slow_operation():
    """Test that takes a long time."""
    pass
```

Run specific markers:

```bash
pytest -m integration  # Run only integration tests
pytest -m "not slow"   # Skip slow tests
```

## References

-   [pytest Documentation](https://docs.pytest.org/)
-   [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
-   [respx Documentation](https://lundberg.github.io/respx/)
-   [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
-   [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
