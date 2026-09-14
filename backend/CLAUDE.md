# CLAUDE.md - Backend

This file provides guidance to AI agents when working with the Orchestra backend.

## Quick Start

### 1. Enable Virtual Environment

```bash
cd backend

# Create virtual environment (if not exists)
uv venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
uv sync
```

### 2. Environment Configuration

The backend uses the environment file at the repository root, `.env`.

```bash
# Copy example env if setting up for first time
cp ../.example.env ../.env
```

### 3. Start the Application

**Default (port 8000):**
```bash
make dev
```

**With explicit port (use if default port is taken):**
```bash
# Port 8001
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001 --log-level debug --env-file ../.env

# Port 8002
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8002 --log-level debug --env-file ../.env
```

**Auto-increment port if default is taken:**
```bash
# Check if port 8000 is in use, increment to next available
PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
uv run uvicorn main:app --reload --host 0.0.0.0 --port $PORT --log-level debug --env-file ../.env
```

## Common Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start dev server on port 8000 |
| `make test` | Run all tests |
| `make format` | Format code with Ruff |
| `make seeds.user` | Seed default users |
| `make migrate.up` | Run all pending migrations |
| `make migrate.down` | Rollback one migration |
| `make migrate.history` | View migration history |

## Database Migrations

All migration commands use the env file at the repository root, `.env`:

```bash
# Apply all migrations
make migrate.up

# Rollback one migration
make migrate.down

# Create new migration
make migrate.revision
# Then edit the generated file in migrations/versions/
```

## Testing

```bash
# Run all tests
make test

# Run specific test file
uv run pytest tests/unit/services/test_assistant_service.py

# Run with verbose output
uv run pytest -v

# Run with coverage
uv run pytest --cov=src --cov-report=html
```

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── repos/           # Database repositories
│   ├── schemas/         # Pydantic models
│   ├── common/          # Shared utilities
│   └── utils/           # Helper functions
├── migrations/          # Alembic database migrations
├── seeds/               # Database seeders
├── scripts/             # Dev utilities
└── tests/
    ├── unit/            # Unit tests
    └── integration/     # Integration tests
```

## Code Style

- Python 3.12+ features required
- Follow PEP 8 conventions
- Type hints required for all functions
- Use Pydantic for data validation
- Run `make format` after making changes

## API Documentation

When the server is running:
- Swagger UI: `http://localhost:8000/api`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## API Validation on Completion

**IMPORTANT**: When completing tasks that involve API changes, provide curl request examples for manual validation BEFORE marking the task as done.

### Required curl Examples

For any new or modified endpoints, include:

1. **Authentication** (if endpoint requires auth):
```bash
# Login to get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "test1234"}'
```

2. **Endpoint under test** with all relevant scenarios:
```bash
# Example: Create resource
curl -X POST http://localhost:8000/api/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"field": "value"}'

# Example: Get resource
curl -X GET http://localhost:8000/api/<endpoint>/<id> \
  -H "Authorization: Bearer <token>"

# Example: Update resource
curl -X PUT http://localhost:8000/api/<endpoint>/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"field": "updated_value"}'

# Example: Delete resource
curl -X DELETE http://localhost:8000/api/<endpoint>/<id> \
  -H "Authorization: Bearer <token>"
```

### Validation Checklist

Before outputting `<promise>DONE</promise>`:
- [ ] All tests pass (`make test`)
- [ ] Provide curl examples for each modified/new endpoint
- [ ] Include expected response format in comments
- [ ] Cover success and error cases where applicable
