# Manual review: blocked single-database gate

## Scope

On 2026-09-27, a bounded worker attempted US-001 in a disposable `pgvector/pgvector:pg17` testcontainer. The worker used ONE PostgreSQL database with `public` and `aegra` schemas. The test command ran in the sandbox from `.worktrees/task/1016-schema-proof/backend/`. This worker-only test is not committed to PR #1017 because its `aegra, public` search path violates the revised safety gate. No startup, checkpoint, store, auth, two-user, or production tests followed.

## Observed command and failure

1. The worker verified `TEST_POSTGRES_CONNECTION_STRING` was unset, then ran:

   ```bash
   test -z "${TEST_POSTGRES_CONNECTION_STRING:-}" || exit 2
   AEGRA_OWNERSHIP_LIVE=1 uv run pytest -q tests/integration/test_aegra_schema_ownership.py
   ```

   The worker test migrated Orchestra to `public.alembic_version=0001`, then created schema `aegra` and a restricted Aegra role. The role's effective search path was `aegra, public`, not the revised plan's `aegra`-only path. The test invoked the bundled Aegra 0.10.7 `run_migrations()` through `uv run --no-project --with aegra-api==0.10.7`. The Aegra migration precheck queried unqualified `alembic_version` before Aegra had its own revision table.

   Observed error excerpt (credentials and connection URI omitted):

   ```text
   asyncpg.exceptions.InsufficientPrivilegeError: permission denied for table alembic_version
   [SQL: SELECT alembic_version.version_num FROM alembic_version]
   FAILED tests/integration/test_aegra_schema_ownership.py::test_aegra_schema_ownership
   1 failed, 5 warnings in 1.52s
   ```

   Exit status: 1. Because `aegra.alembic_version` did not exist yet, the unqualified query attempted to read `public.alembic_version`. PostgreSQL denied the read. **The Aegra path reached `public`; the safety gate failed.** The worker did not retry with an `aegra`-only search path or create a shadow revision table.

2. Cleanup check from the worker worktree:

   ```bash
   docker ps -a --filter name=testcontainers --filter name=aegra --format '{{.Image}} {{.Names}}'
   test -z "${TEST_POSTGRES_CONNECTION_STRING:-}" && printf 'TEST_POSTGRES_CONNECTION_STRING unset\n'
   ```

   Observed output: no matching containers; `TEST_POSTGRES_CONNECTION_STRING unset`. The testcontainer's `pytest_sessionfinish` cleanup stopped its container. The worker did not start an Aegra server or named tmux session. The worker did not use an operator database.

## What remains unverified

The failed test did not reach the after-snapshot assertions. This run did not verify public-table or seeded-user preservation after the attempt. A denied revision-table read does not prove that Aegra left every public object unchanged. This run did not test an `aegra`-only search path, startup precheck, ORM, checkpoint/store round trips, or extension behavior. The worker did not test Orchestra auth or two-user authorization. The worker did not attempt a second database or production cutover.

## CI

The initial plan-only commit `1cedf6b6` passed backend and frontend checks in [run 36350139276](https://github.com/mifunedev/orchestra/actions/runs/36350139276); CI skipped E2E. The worker ran the blocker proof only in the uncommitted worker worktree. CI does not validate the failed gate.

## Decision needed

The advisor must stop implementation and request operator approval before a new single-database probe with an `aegra`-only role. An alternative design must also keep Aegra connections out of `public`. Do not add a second PostgreSQL database, stamp or clear Orchestra's revision, or start the auth adapter.
