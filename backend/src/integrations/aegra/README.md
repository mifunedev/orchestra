# Orchestra on Aegra

This service exposes Aegra's native thread and run-stream API at `/api/aegra`.
Legacy Orchestra routes are unchanged. Only the `orchestra` graph is registered.

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
It does not create an Orchestra thread or enter Orchestra's streaming controller.
Redis, cron, and unsupported native API operations are disabled for this single-process path.

## Client contract

Forward the existing Orchestra `Authorization` or `x-api-key` header on every request.
Each request validates credentials against Orchestra `/api/auth/user`.
Aegra's native owner checks protect threads, state, runs, and stream attachment.
Credentials remain in request-local execution context; they are not placed in run
configuration, user records, metadata, or checkpoints. In-process Aegra execution
inherits that context. Distributed execution is intentionally unsupported.

1. `POST /api/aegra/threads` with `{}`.
2. `POST /api/aegra/threads/{thread_id}/runs/stream` with:

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
`GET /api/aegra/threads/{thread_id}/state` reads persisted state.
`GET /api/aegra/threads/{thread_id}/runs/{run_id}/stream` attaches to a native stream.

Requested tools must exist in the authenticated Orchestra `/api/tools` catalog.
The real Orchestra graph executes tool proxies through the authenticated
`/api/tools/invoke` endpoint, retaining Orchestra's tool implementation and user
scoping. No caller-supplied tool definition or credential is accepted in graph input.
Files, MCP, subagents, caller-supplied state, checkpoint overrides, and context
identity overrides are rejected before run creation.

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

It supplies `AEGRA_DATABASE_URL` only for the fresh native Aegra database.
`POSTGRES_CONNECTION_STRING` is an unconnected localhost:1 sentinel needed by
existing Orchestra imports. `TEST_POSTGRES_CONNECTION_STRING` is unset. Both
legacy conftests are excluded and the test asserts that neither was imported.
Do not substitute ordinary root pytest collection: that invokes unrelated
Orchestra database bootstrap outside this test's scope.

The test uses native Aegra migrations, persistence, checkpointing, and streaming;
the real Orchestra graph, credential validator, token routes, tool catalog, and
weather tool are not mocked. Only the identity database session/user directory,
Orchestra's store (in memory), HTTP transport (ASGI), and model-provider boundary
are substituted. Unexpected external HTTP calls fail. No HTTP server is started.

Assertions cover two turns, tool call/result, streamed reply, persisted history,
authority validation on each run, missing/invalid/revoked credentials, unknown
tools, identity spoofing, and cross-user thread/state/run/stream denial. The
Orchestra store stays empty before token creation and contains no new thread.
Native SQL confirms Aegra thread/run/checkpoint rows, no Orchestra users table,
no vector extension, and no credentials in persisted run rows. Both legacy
streaming entry points are failure sentinels and remain uncalled.

This scope does not exercise Orchestra's SQL identity/store implementation or
accept the UI/browser journey; those remain separate review concerns.

### Execution history and cleanup

The integration test was written before the integration source. Its first
module-load check failed with `ModuleNotFoundError` (exit 1); database-backed
pytest was deferred until permission was granted. `uv lock && uv sync --locked`
exited 0 with `aegra-api==0.10.7` pinned.

Earlier two-database tests were superseded by the operator's vector-free scope
change. All of the following databases were created by this worker, subsequently
dropped, and verified absent; no earlier experiment database was used:

| Orchestra database | Aegra database | Superseded result |
| --- | --- | --- |
| `us001_orchestra_dc21a13d1cd4` | `us001_aegra_dc21a13d1cd4` | Setup failed before pytest |
| `us001_orchestra_b01acab59ee0` | `us001_aegra_b01acab59ee0` | Pytest exit 1: second-user fixture |
| `us001_orchestra_9757a0bce134` | `us001_aegra_9757a0bce134` | Pytest exit 0: 2 passed |
| `us001_orchestra_3173a787427d` | `us001_aegra_3173a787427d` | Pytest exit 0: 2 passed |
| `us001_orchestra_865ec35a219a` | `us001_aegra_865ec35a219a` | Pytest exit 0: 8 passed |

Vector-free exploratory runs also cleaned up their sole database:

| Aegra database | Result |
| --- | --- |
| `us001_aegra_64e7816deb8f` | Pytest exit 2: import path; corrected by `python -m pytest` |
| `us001_aegra_62c900d3b713` | Pytest exit 0: 2 passed |

Tracked runner verification (`bash backend/scripts/test-aegra-chat-stream.sh`):

| Aegra database | Result |
| --- | --- |
| `us001_aegra_520519f3b7354ba2b371297686f800f4` | Exit 0: 3 passed |
| `us001_aegra_a98f5a68791a4827b54db8f001ca9ace` | Controlled child-command failure: exit 17; cleanup still verified |
| `us001_aegra_b32bf347acaa4cf3a72f601817b7db5f` | Clean rerun, exit 0: 3 passed |

Every tracked-runner database was dropped and checked absent. Current verification
also passed shell syntax, Python compilation, Ruff lint, and Ruff formatting checks
(exit 0). Six dependency/deprecation warnings remain in the focused pytest run.
These results are evidence for advisor review, not worker acceptance of US-001.
