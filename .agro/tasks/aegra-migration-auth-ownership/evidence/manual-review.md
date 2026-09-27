# Manual review: single-database gate evidence

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

   Observed output: no matching containers; `TEST_POSTGRES_CONNECTION_STRING unset`. The testcontainer's `pytest_sessionfinish` cleanup stopped its container. A separate read-only check used:

   ```bash
   docker ps -a --filter 'ancestor=pgvector/pgvector:pg17' --format '{{.ID}} {{.Image}} {{.Names}} {{.CreatedAt}} {{.Status}}'
   docker ps -a --filter 'label=org.testcontainers' --format '{{.ID}} {{.Image}} {{.Names}} {{.CreatedAt}} {{.Status}}'
   ```

   The image query showed one pre-existing `pgvector` container, created at `2026-09-27 09:42:15 -0600 MDT`; the label query returned no rows. The worker did not delete the pre-existing container. The worker did not start an Aegra server or named tmux session. The worker did not use an operator database.

## What remains unverified

The failed test did not reach the after-snapshot assertions. This run did not verify public-table or seeded-user preservation after the attempt. A denied revision-table read does not prove that Aegra left every public object unchanged. This run did not test an `aegra`-only search path, startup precheck, ORM, checkpoint/store round trips, or extension behavior. The worker did not test Orchestra auth or two-user authorization. The worker did not attempt a second database or production cutover.

## Approved `aegra`-only migration proof

After the operator approved a new disposable probe, a fresh worker ran US-001 on branch `task/1016-aegra-only-proof`. The fixture used the same database for Orchestra and Aegra. The fixture admin created the `aegra` schema and role, revoked `CREATE` on `public` from `PUBLIC`, and set the role's database-scoped `search_path` to `aegra` only. This admin ACL setup occurred before the public snapshot. The Aegra role did not run the admin commands.

1. The worker ran this command from its isolated `backend/` worktree:

   ```bash
   env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_schema_ownership.py
   ```

   Before calling Aegra 0.10.7's bundled `run_migrations()`, the test checked `current_schemas(true)` for the absence of `public`. The unqualified `to_regclass('alembic_version')` returned null. A negative preflight rejected a forced `public` search path; restricted-role `CREATE`, `ALTER`, and `DROP` attempts against `public` failed. The test compared admin-role snapshots after migration.

   Observed excerpt:

   ```text
   ownership proof: public=0001 aegra=a3f7c1d9e2b4 public_unchanged=True
   1 passed, 5 warnings
   ```

   Exit status: 0. The snapshot compared all `public.users` rows, the `public` table-name list, and `public.alembic_version` before and after the Aegra upgrade. The snapshot did not compare `public` ACLs or other catalog metadata. The operational Aegra migration did not show a query or write to `public`.

2. The advisor cherry-picked worker commit `8d1ff6f5` as `221affc4` onto the task branch and reran the same test with `UV_PROJECT_ENVIRONMENT` pointing at the completed worker's backend virtualenv. The task worktree's fresh virtualenv did not contain pytest; an initial `uv run --no-sync` attempt failed before pytest could run tests. The integrated rerun exited 0 with `1 passed, 5 warnings`.

3. A separate negative test set `TEST_POSTGRES_CONNECTION_STRING` to an unreachable dummy URL with `AEGRA_OWNERSHIP_LIVE=1`. The conftest preflight exited before migrations or a database connection. Pytest reported `_pytest.outcomes.Exit: Aegra ownership probe refuses TEST_POSTGRES_CONNECTION_STRING before migrations`, with CLI exit status 4.

4. Cleanup check: `docker ps -a --filter 'ancestor=pgvector/pgvector:pg17'` showed only the pre-existing `pgvector` container created at `2026-09-27 09:42:15 -0600 MDT`; `docker ps -a --filter 'label=org.testcontainers'` returned no rows. The worker did not delete the pre-existing container.

The worker tested Aegra startup, ORM, checkpoint, and store paths in the next disposable probe. The next section separates those observations from the remaining design blocker.

## Runtime connection proof and blocker

The worker ran the following opt-in command from `.worktrees/task/1016-runtime-schema-proof/backend/`:

```bash
AEGRA_OWNERSHIP_LIVE=1 uv run pytest -s -q tests/integration/test_aegra_schema_runtime.py
```

Observed exit status: 0 (`1 passed, 5 warnings`). Aegra 0.10.7's revision precheck, asyncpg ORM, and psycopg checkpoint/store pool reported database `test`, effective schemas `['pg_catalog', 'aegra']`, and revision `a3f7c1d9e2b4`. Checkpoint and non-indexed store round trips passed. The test compared the public revision, seeded user, relations, indexes, and extension catalog after each stage; those snapshots matched the post-admin-setup baseline. A restricted-role `SELECT public.users` failed. The worker did not run Aegra with a `public` search-path fallback.

The worker did **not** test optional semantic indexing or a downgrade. Tagged Aegra 0.10.7 source contains an explicit `public` dependency in the migration downgrade:

```text
alembic/versions/20260512000000_switch_uuid_defaults_to_gen_random_uuid.py:29-30
ALTER TABLE assistant ALTER COLUMN assistant_id SET DEFAULT public.uuid_generate_v4()::text
ALTER TABLE runs ALTER COLUMN run_id SET DEFAULT public.uuid_generate_v4()::text
```

The worker did not execute this downgrade; the test observed no public access from that code. The source-defined path prevents a blanket claim that every Aegra migration operation avoids `public`. LangGraph's optional indexed store also contains `CREATE EXTENSION vector`; the fixture has `vector` installed in `public` by its admin before the Aegra role connects. The worker did not test indexing or call an external embedding API. The worker did not verify what indexing requires from the isolated role.

The worker committed its bounded runtime test as `57717b6f` on the isolated branch but did not push or integrate it into PR #1017. No US-002 acceptance or auth implementation followed. Pytest's session-finish cleanup stopped its disposable testcontainer; an image-wide Docker check found only the pre-existing `pgvector` container, which the worker did not delete.

## CI

The initial plan-only commit `1cedf6b6` passed backend and frontend checks in [run 36350139276](https://github.com/mifunedev/orchestra/actions/runs/36350139276); CI skipped E2E. The previous blocker proof ran only in an uncommitted worker worktree. [Run 36350893298](https://github.com/mifunedev/orchestra/actions/runs/36350893298) passed for the evidence-only commit `aef80527`. The migration commit `221affc4` and runtime worker commit `57717b6f` have no final CI result on PR #1017 yet.

## Decision needed

Stop the strict no-`public` proof: Aegra 0.10.7 contains a downgrade that references `public`, and optional indexing remains unverified. The exercised upgrade and non-indexed runtime paths passed, but they cannot certify all migration paths. Request an operator decision before any downgrade, indexing, auth work, second database, or production cutover. Keep PR #1017 draft.
