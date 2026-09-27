## Manual review

Operator approval covered disposable local resources only. The redacted transcript records 2026-09-27 UTC at worker commit `980d391ac2e11522b962632739b790937b1c4552`. Run the commands in a fresh isolated checkout of PR #1015 inside the local sandbox. The recorded worker path `.worktrees/task/1014-aegra-review` was temporary. Never set `TEST_POSTGRES_CONNECTION_STRING` to an operator database. The tests use the fresh `pgvector/pgvector:pg17` testcontainers fixture, not the running `pgvector` service. The image digest observed with `docker image inspect pgvector/pgvector:pg17 --format '{{index .RepoDigests 0}}'` was `pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f` (exit 0). The initial `docker ps -a` contained the existing `pgvector`, `postgres`, `mongo`, `pgadmin`, `exec_server`, and `agro-sbx-local` containers. The initial `tmux list-sessions` contained `us002-port22`.

**A. Guard the database boundary**

Prerequisites: Docker, tmux, `uv`, Python, and access to the disposable Docker fixture. The observed local versions were Python `3.13.15`, `uv 0.12.15`, Node `v22.23.2`, and npm `10.9.8`. Run in the local sandbox, from `backend/`.

1. Refuse an externally supplied database URL before starting pytest:

   ```bash
   TEST_POSTGRES_CONNECTION_STRING=blocked sh -c 'test -z "${TEST_POSTGRES_CONNECTION_STRING:-}" || { printf "Refuse non-disposable TEST_POSTGRES_CONNECTION_STRING\n"; exit 2; }'
   ```

   Observed output: `Refuse non-disposable TEST_POSTGRES_CONNECTION_STRING`. Observed exit: 2. The guard starts no database, app, or migration.

2. Check the prerequisite without connecting to a database:

   ```bash
   env -u TEST_POSTGRES_CONNECTION_STRING sh -c 'test -z "${TEST_POSTGRES_CONNECTION_STRING:-}" || { printf "Refuse non-disposable TEST_POSTGRES_CONNECTION_STRING\n"; exit 2; }; printf "Disposable fixture prerequisite satisfied\n"'
   ```

   Observed output: `Disposable fixture prerequisite satisfied`. Observed exit: 0. Stop if step 1 does not refuse a supplied URL or step 2 exits nonzero.

**B. Run the migration and protocol probes**

Prerequisites: step A passed, Docker can create a fresh `pgvector/pgvector:pg17` testcontainer, and `uv` can resolve `aegra-api==0.10.7`. Run in the local sandbox, from `backend/`. The pytest fixture creates a fresh container and migrates and seeds Orchestra revision `0001` and a user. The protocol test creates a separate unique database in that container and starts a named tmux Aegra process. The fixture and protocol context manager stop the container, kill that session, and drop the unique database on exit.

1. Run both live probes and the legacy stream regression:

   ```bash
   env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_PROBE_LIVE=1 uv run pytest -q --disable-warnings tests/unit/utils/test_aegra_migration_probe.py tests/integration/test_aegra_compatibility.py tests/integration/test_aegra_protocol_probe.py tests/integration/test_distributed_stream.py
   ```

   Observed output: `.................. [100%]` and `18 passed, 5 warnings in 3.99s`. Observed exit: 0. The live migration assertion requires Aegra to exit nonzero with `Can't locate revision identified by '0001'`; it then compares the `alembic_version` revision and seeded user before and after. The migration rejection blocks a cutover. The test does not call Orchestra's revision-clearing recovery on an operator database.

2. Check the installed package in an isolated `uv` environment:

   ```bash
   uv run --no-project --with aegra-api==0.10.7 python -c 'import importlib.metadata as m; print("aegra-api", m.version("aegra-api")); print("Requires-Python", m.metadata("aegra-api")["Requires-Python"])'
   ```

   Observed output: `aegra-api 0.10.7` and `Requires-Python >=3.12`. Observed exit: 0. The pinned package metadata is at https://pypi.org/pypi/aegra-api/0.10.7/json. The earlier SDK metadata check selected `@langchain/langgraph-sdk@1.12.0`: https://registry.npmjs.org/@langchain%2flanggraph-sdk/1.12.0. Its peer requirement is `@langchain/core ^1.1.48`. The current review did not install or execute the SDK. The metadata does not prove SDK integration with Orchestra. The separate protocol evidence records a prior scratch SDK search and stream: [protocol.md](protocol.md). The exact Compose `pgvector/pgvector:pg16` image remains unverified; the earlier pull failed with Docker credentials. PostgreSQL `postgres:16` is not that image. See [migration.md](migration.md).

3. If step 1 fails, do not try a production database. Read the error, then run the cleanup checks in step D. The known safe failed assertion is the Aegra migration rejection of revision `0001`, which the live test requires while preserving the seeded row. An unexpected pytest failure is a blocker, not permission to clear or stamp the revision.

The observed protocol assertions cover `GET /` metadata 200 and the previously observed `GET /health` 200. Missing credentials return 401 on protected routes. Alice receives 200 on `POST /assistants/search` and `POST /threads/{id}/runs`; Bob receives 200 on shared assistant search but 404 for Alice's run. `POST /threads/{id}/stream/events`, `GET /threads/{id}/runs/{run_id}/stream`, and `POST /threads/{id}/runs/{run_id}/cancel?wait=1` return 401 without credentials, 404 to Bob on Alice's resource, and 200 to Alice. `POST /threads/{id}/runs/stream` returns 200 SSE for a new Bob thread, but 404 for Alice on that Bob thread. These results use fixture-only bearer identities, not Orchestra tokens or tenant policy. The Aegra paths are not Orchestra's `POST /api/llm/stream` or `GET /api/threads/{thread_id}/stream?run_id=…`; the prior route probe observed 404 on both Orchestra paths.

The completed stream has named `metadata`, `values`, `updates`, `values`, and `end` events with `id:` cursors. Its terminal JSON is `{"status":"success"}`, not `[DONE]`. `Last-Event-ID` on the v1 run stream replays later frames and an `end` frame. The v1 cursor in v2 `since` returns 422. Cancellation returns status `interrupted`; the later stream ends with `{"status":"interrupted"}`. The earlier six-second v2 observation received only a heartbeat, so v2 event replay remains unverified. See [protocol.md](protocol.md) and the pinned [live protocol assertions](https://github.com/mifunedev/orchestra/blob/980d391ac2e11522b962632739b790937b1c4552/backend/tests/integration/test_aegra_protocol_probe.py).

**C. Check the client contract**

Prerequisites: Node and npm; the worker checkout initially had no `frontend/node_modules`. Run in the local sandbox, from `frontend/`. Install only in the isolated review checkout. Do not install in or edit another checkout.

1. Run the focused test and clean up the worker-local dependencies:

   ```bash
   npm ci --ignore-scripts --no-audit --no-fund --cache .npm-cache && npm test -- src/tests/integration/distributedStream.test.ts src/tests/services/aegraEventCompatibility.test.ts; result=$?; printf 'FRONTEND_EXIT=%s\n' "$result"; rm -rf node_modules .npm-cache; printf 'FRONTEND_CLEANUP_EXIT=%s\n' "$?"; exit "$result"
   ```

   Observed output includes `Tests  13 passed (13)`, `FRONTEND_EXIT=0`, and `FRONTEND_CLEANUP_EXIT=0`. Observed exit: 0. The fixture confirms `FetchStreamReader` drops Aegra's named frames and does not retain the cursor. A base-URL change alone does not adapt the `StreamEvent` contract. If installation or tests fail, the `;`-separated cleanup still deletes `node_modules` and `.npm-cache`; stop and report the nonzero test exit. If the cleanup command fails, delete `frontend/node_modules` and `frontend/.npm-cache` from the worker checkout. Verify `frontend/node_modules` and `frontend/.npm-cache` are absent.

**D. Verify cleanup**

Prerequisites: steps B and C have ended. Run in the local sandbox, from the isolated review checkout. The backend fixture calls `stop()` at pytest session end. The protocol fixture kills its unique tmux session and drops its unique database in `finally`. The npm command removed its two worker-local directories. Do not remove `us002-port22` or any pre-existing Docker container.

1. Check worker-local disposable paths and shared resource names:

   ```bash
   test ! -e frontend/node_modules && test ! -e frontend/.npm-cache
   git status --short
   docker ps -a --format '{{.Image}} {{.Names}}'
   docker ps -a --filter name=aegra --filter name=testcontainers --format '{{.Names}}'
   tmux list-sessions -F '#S'
   ```

   Observed: `test` exited 0. Before the evidence write, `git status --short` returned no entries. The Docker list contained only the six existing containers named above. The filtered list was empty. Immediately after the probes, the tmux list contained only `us002-port22`; each inspection command exited 0. At final post-commit inspection, `tmux list-sessions -F '#S'` reported `no server running on /tmp/tmux-1000/default` and exited 1. The session disappeared after the successful cleanup check. The worker did not stop `us002-port22`. Neither inspection found a probe session. The Docker filter remained empty, and the worker dependency paths remained absent. If a pytest fixture fails before `finally`, inspect new `aegra-probe-*` sessions and the new testcontainers container. Remove only resources created by this run. Never remove an existing container or an operator database.

**Risk and next decision.** Aegra cannot resolve Orchestra revision `0001`; shared migration ownership creates the highest risk. Do not point Aegra at Orchestra's database until an explicit separate schema or migration ownership design preserves existing revisions and rows. Next, decide whether to fund that isolated ownership design and Orchestra-auth adapter before production SDK or route integration. The advisor must link this evidence in draft PR #1015. The advisor must state the pg16, SDK integration, tenant-auth, and v2 replay gaps. The worker does not edit the PR.
