# Orchestra on Aegra

This service exposes Aegra's native thread and run-stream API at `/api/v1`.
The Aegra service does not expose the former `/api/aegra` alias. The legacy Orchestra backend
continues to serve `/api`, including `POST /api/llm/stream` and
`/api/threads/search`, with unchanged payloads and behavior. The service
registers only the `orchestra` graph.

## Configuration

Install the backend's locked dependencies. Set:

- `POSTGRES_CONNECTION_STRING`: the Orchestra database URL required by existing backend imports.
- `AEGRA_DATABASE_URL`: a PostgreSQL URI for a separate, already provisioned Aegra database. Its database name must differ from Orchestra's.
- `ORCHESTRA_API_URL`: the trusted Orchestra HTTP origin, without a path or credentials.
- The normal Orchestra model-provider environment variables.

Entrypoint, from `backend/`:

```sh
uv run --locked uvicorn src.integrations.aegra.app:create_app --factory --host 127.0.0.1 --port 2026
```

Run a persistent service in a named tmux session, not an attached recovery shell.
The entrypoint must initialize Aegra before any other Aegra runtime imports.
Aegra applies its own migrations and owns its threads, runs, checkpoints, and store.
The service does not create an Orchestra thread or enter Orchestra's streaming controller.
The service disables Redis, cron, and unsupported native API operations for this single-process path.

## Client contract

Forward the existing Orchestra `Authorization` or `x-api-key` header on every request.
Each request validates credentials against Orchestra `/api/auth/user`.
Aegra's native owner checks protect threads, state, runs, and stream attachment.
Credentials remain in request-local execution context; they are not placed in run
configuration, user records, metadata, or checkpoints. In-process Aegra execution
inherits that context. Distributed execution is intentionally unsupported.

1. `POST /api/v1/threads` with `{}`.
2. `POST /api/v1/threads/{thread_id}/runs/stream` with:

```json
{
  "assistant_id": "orchestra",
  "input": {"messages": [{"role": "user", "content": "Hello"}]},
  "config": {"configurable": {"model": "openai:gpt-4.1-mini", "tools": []}},
  "stream_mode": ["messages", "updates", "values"]
}
```

Send only the next user message on subsequent turns. Aegra restores history from
its checkpoints. Consume native SSE events, including metadata, message chunks,
tool-bearing updates, final values, and errors; there is no server-side event mapper.
`GET /api/v1/threads/{thread_id}/state` reads persisted state.
`GET /api/v1/threads/{thread_id}/runs/{run_id}/stream` attaches to a native stream.
Requests without valid credentials return `401`. A different authenticated user
cannot read or run a thread they do not own. The development proxy directs
`/api/v1` to Aegra on port 2026 and other `/api` requests to Orchestra.

Requested tools must exist in the authenticated Orchestra `/api/tools` catalog.
The real Orchestra graph executes tool proxies through the authenticated
`/api/tools/invoke` endpoint, retaining Orchestra's tool implementation and user
scoping. The service rejects caller-supplied tool definitions and credentials in graph input.
The service rejects files, MCP, subagents, caller-supplied state, checkpoint overrides,
and context identity overrides before run creation.

## Vector-free verification

After operator approval for a disposable database, run from the repository root:

```sh
bash backend/scripts/test-aegra-chat-stream.sh
```

The runner requires the **existing, running** Docker container named `postgres`,
its configured non-superuser PostgreSQL account with database-creation permission,
Docker access, Python 3, and `uv`. It creates exactly one uniquely named
`us001_aegra_*` database from `template0`. It never starts a container, provisions
extensions, changes roles, or modifies existing databases. It redacts credentials
and drops only its own database, checking absence afterward. Cleanup also handles
pytest failure and normal interruption signals; a hard kill cannot run cleanup.

The runner executes this command from `backend/`:

```sh
uv run --locked python -m pytest --confcutdir=tests/integration --import-mode=importlib tests/integration/test_aegra_chat_stream.py -q --tb=short --show-capture=no
```

The runner supplies `AEGRA_DATABASE_URL` only for the fresh native Aegra database.
`POSTGRES_CONNECTION_STRING` is an unconnected localhost:1 sentinel for existing
Orchestra imports. The runner unsets `TEST_POSTGRES_CONNECTION_STRING`.
The runner excludes both legacy conftests. The test checks their absence from imported modules.
Do not substitute ordinary root pytest collection: that invokes unrelated
Orchestra database bootstrap outside this test's scope.
