# Manual review: single-database pilot evidence

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

The worker committed this first runtime test as `57717b6f` on an isolated branch. This test did not exercise archive/restore. Pytest's session-finish cleanup stopped its disposable testcontainer.

## Integrated narrow pilot and disposable restore

The operator approved one database with separate `public` and `aegra` schemas. The approved pilot covers Aegra 0.10.7 upgrade, startup revision precheck, ORM, checkpoint, and non-indexed Store. Aegra uses an `aegra`-only search path. Orchestra keeps its indexed Store in `public`. Do not invoke Aegra Alembic downgrade or Aegra indexed Store. This boundary does not prove production rollback or all Aegra paths.

The advisor integrated worker commit `030d3f72` as `1a2ebe4a`. The integrated opt-in runtime test ran from the task branch's `backend/` directory in a separate pytest process:

```bash
env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_schema_runtime.py
```

The command exited 0: `1 passed, 5 warnings in 3.96s`. The disposable test used `pgvector/pgvector:pg17` and database `test`. The Aegra role had `search_path = aegra`, no `public` fallback, and no `SELECT` on `public.users` or `public.alembic_version`. The upgrade resolved `aegra.alembic_version` to `a3f7c1d9e2b4`; Orchestra's `public.alembic_version` remained `0001`. The test set `RUN_MIGRATIONS_ON_STARTUP=false`. The startup revision precheck, ORM, checkpoint pool, and non-indexed Store pool reported effective schemas `['pg_catalog', 'aegra']`. Checkpoint and Store round trips passed.

The disposable restore test ran in this order:

1. The test captured `public` revision and user rows, relations, indexes, extensions, and namespace and relation ACLs after fixture setup.
2. Inside the testcontainer, `pg_dump -n aegra -Fc` wrote a custom archive. The test checked the archive TOC for `aegra`-only entries and required revision, checkpoint, and Store data. The dependency preflight refused cross-schema dependents. It excepted only verified internal `pg_toast` tables owned by the Aegra role and attached to `aegra` relations.
3. The Aegra role changed only its revision row and deleted its checkpoint and Store proof rows. The test checked that the `public` snapshot still matched.
4. Inside the testcontainer, `pg_restore --schema=aegra --clean --if-exists` restored the archive with exit-on-error. The test compared the restored Aegra revision, checkpoint rows, and Store rows to their saved values. It checked the `public` snapshot after archive, mutation, and restore. All comparisons passed.
5. The test deleted the archive inside the disposable testcontainer. The session fixture stopped the testcontainer. A later Docker query with the testcontainers label returned no rows.

The ownership opt-in test passed in a separate pytest process. A combined invocation of ownership and runtime tests in ONE pytest process failed at `CREATE SCHEMA aegra`: the session-scoped conftest reused one disposable database. Run the probes in separate pytest processes as the PRD requires. A negative preflight with a dummy operator URL exited 4 before migrations. Targeted Ruff and `compileall` checks passed. Neither probe tested auth or production rollback.

Docker events showed removal of our labeled testcontainer. During the same period, Docker events recorded the stop, rename, and removal of an unlabeled pre-existing `pgvector` container named `postgres`. Docker events also recorded creation of an unlabeled container using a different image with a `127.0.0.1:5432` binding. The actor and cause of those unlabeled container changes are unknown. Do not claim the pre-existing container stayed untouched or attribute its replacement to this test. Do not modify the new container as part of this pilot.

## CI

The initial plan-only commit `1cedf6b6` passed backend and frontend checks in [run 36350139276](https://github.com/mifunedev/orchestra/actions/runs/36350139276); CI skipped E2E. The previous blocker proof ran only in an uncommitted worker worktree. [Run 36350893298](https://github.com/mifunedev/orchestra/actions/runs/36350893298) passed for the evidence-only commit `aef80527`. The migration commit `221affc4` and runtime worker commit `57717b6f` had no final CI result at the time of the earlier review. This document records no CI verdict for integrated commit `1a2ebe4a`.

## US-004: isolated Aegra authentication pilot

The advisor ran the accepted US-004 test from the integrated task branch's `backend/` directory. The opt-in fixture used one disposable `pgvector/pgvector:pg17` database. The test installed Aegra 0.10.7 through `uv run --no-sync --with aegra-api==0.10.7` in child processes. Orchestra kept its revision `public.alembic_version=0001`; Aegra migrated to `aegra.alembic_version=a3f7c1d9e2b4`. The Aegra `aegra_migrator` role used database-scoped `search_path=aegra`. The Aegra role's effective schemas excluded `public`. Role checks denied `SELECT` on `public.users` and `public.store` and denied `CREATE` on schema `public`. The fixture served Orchestra's existing `GET /api/auth/user` from a separate HTTP process with the public database role. The Aegra adapter forwarded credentials to that fixed loopback endpoint. The Aegra process received no Orchestra public database URL. The test asserted that the process did not import `src.services.db`.

```bash
env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_auth_adapter.py
```

The advisor observed exit 0: `1 passed, 5 warnings in 9.44s`. The hardened test had also passed in `10.85s` before the cleanup patch `7b551ee6`. The runs are local integration results, not CI results. Through Aegra's ASGI transport, `/assistants/search` returned 401 for missing, invalid, expired, and revoked credentials. Valid JWT and API-key requests returned 200. `/runs/stream` returned 200 and yielded a proof event. The direct authentication handler used the persisted user ID despite a forged `x-user-id` header. The search requests included forged `user_id` and `tenant_id` JSON fields; their HTTP statuses alone do not prove resource ownership or namespace isolation. No forged tenant header was separately asserted. Mocked redirect, malformed, and non-200 auth responses, plus an unreachable auth port, failed authentication with 401. The test asserted that Orchestra updated the valid API key's `public.store` token `last_used_at`. Non-token Store rows, public table rows, revision, user rows, and public catalog snapshots matched their baselines. The test assertions do not audit every database operation.

The guarded launcher refused missing or unloadable `auth.path`, a public database URL in Aegra's environment, and temporarily granted `CREATE` on `public`. A separate run set a dummy `TEST_POSTGRES_CONNECTION_STRING`; pytest exited 4 before migrations or a database connection. The integrated Orchestra auth regression ran separately from `backend/`:

```bash
env -u TEST_POSTGRES_CONNECTION_STRING uv run --no-sync pytest -q tests/unit/utils/test_identity_resolver.py tests/unit/utils/test_auth_dependency_scope.py tests/integration/test_api_tokens.py tests/integration/test_public_assistants.py
```

The advisor observed exit 0: `29 passed, 5 warnings in 1.91s`.

For the final cleanup check, `docker ps -a --filter label=org.testcontainers` returned no rows. The advisor's final `find` search for owned `aegra-auth-*` tmux sockets returned no matches. Two earlier integrated reruns left `/tmp/tmux-1000/aegra-auth-503614` and `/tmp/tmux-1000/aegra-auth-489270`. The advisor used `tmux -L <socket-name> list-sessions` to verify no server remained, then removed only those exact sockets. The final test version in `7b551ee6` removes its own socket. This review does not assign unrelated Docker events to the auth test.

The pilot did not run a full network Aegra stream. The pilot did not prove cross-user authorization, client-supplied resource-owner safety, or Store namespace isolation. The pilot did not exercise other Aegra paths, indexed Store, or downgrade. The pilot did not prove production isolation or rollback. US-005 must test two users and resource ownership before service use.

## Earlier decision

The advisor accepted US-004 locally for this disposable API-backed pilot. At that review, US-005 resource authorization and US-007 manual-review acceptance remained pending. Keep PR #1017 draft pending separate review. Do not treat the disposable restore or this auth pilot as production isolation or rollback proof.

## US-007: final disposable review on `768b62d1`

The operator approved local disposable resources. This worker ran the tests from `backend/` in `.worktrees/task/1016-aegra-final-evidence`. Each live probe ran in a separate pytest process. Every command below removed `TEST_POSTGRES_CONNECTION_STRING` from its environment. No command used an operator database. The fixture used one `pgvector/pgvector:pg17` database per process, with Orchestra in `public` and Aegra 0.10.7 in `aegra`. These runs did not change production wiring.

The first ownership command exited 2 before pytest started. `uv run --no-sync` created an empty `.venv` and reported `Failed to spawn: pytest` and `No such file or directory (os error 2)`. No test ran. The immediate cleanup queries returned no Testcontainers-labeled container and no owned `aegra-auth-*` tmux socket. The worker stopped before running another probe. After the advisor identified the missing test dependency, the worker ran `env -u TEST_POSTGRES_CONNECTION_STRING uv sync --group dev` from `backend/`; it exited 0. `env -u TEST_POSTGRES_CONNECTION_STRING uv run --no-sync pytest --version` exited 0 and reported `pytest 9.1.0`. The tracked lockfile did not change.

The worker then ran the following commands in this order from `backend/`:

```bash
env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_schema_ownership.py
env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_schema_runtime.py
env -u TEST_POSTGRES_CONNECTION_STRING AEGRA_OWNERSHIP_LIVE=1 uv run --no-sync pytest -q -s tests/integration/test_aegra_auth_adapter.py
env -u TEST_POSTGRES_CONNECTION_STRING uv run --no-sync pytest -q tests/unit/utils/test_identity_resolver.py tests/unit/utils/test_auth_dependency_scope.py tests/integration/test_api_tokens.py tests/integration/test_public_assistants.py
```

| Process | Exit | Pytest result | Observed scope |
|---|---:|---|---|
| Schema ownership | 0 | 1 passed, 5 warnings in 1.64s | `public.alembic_version=0001`, `aegra.alembic_version=a3f7c1d9e2b4`, `public_unchanged=True`. |
| Schema runtime and restore | 0 | 1 passed, 5 warnings in 4.02s | Database `test`; Alembic, startup precheck, asyncpg ORM, psycopg checkpoint, and non-indexed Store reported `['pg_catalog', 'aegra']` and Aegra revision `a3f7c1d9e2b4`. The test verified the checkpoint/Store round trips and schema-only archive/restore assertions. |
| Auth adapter and two-user authorization | 0 | 1 passed, 5 warnings in 9.98s | The test asserted the route statuses, identity mapping, namespace scoping, token update, and public snapshots described below. |
| Orchestra auth regressions | 0 | 29 passed, 5 warnings in 1.41s | Identity resolver, auth dependency scope, API-token lifecycle, and public-assistant tests. No tests skipped. |

The fixture set the dedicated Aegra role's database-scoped `search_path` to `aegra` only. The effective schemas excluded `public`. The Aegra role could not `SELECT public.users` or `public.store` and could not `CREATE` on schema `public`. The ownership test also denied public DDL and rejected a forced public search path. The auth test checked both revisions and kept the Aegra process free of the Orchestra public database URL. A separate Orchestra HTTP process served `GET /api/auth/user` on the same disposable database. Orchestra alone updated the API token's `public.store` `last_used_at`; the test verified the update. The auth test compared public user rows, revision, tables, catalog, other table rows, and non-token Store rows with their baselines. No exercised Aegra-owned connection showed direct access to `public`. These assertions do not audit every query or every Aegra route.

The auth test asserted these protected `/assistants/search` statuses: missing, invalid, expired, and revoked credentials each returned 401; valid JWT and API key each returned 200. A forged `x-user-id` header did not change the persisted identity. The client also sent forged `user_id` and `tenant_id` search fields; the response status alone does not prove isolation. Mocked redirect, malformed, and non-200 Orchestra auth responses failed with 401. An unreachable Orchestra auth port also failed with 401. The guarded launcher refused missing or invalid `auth.path`, a public database URL, and a temporary public `CREATE` grant. The run did not repeat the earlier dummy operator-URL refusal test; earlier evidence records pytest exit 4 before migration.

The two-user assertions covered these outcomes:

- The first user created and read an assistant and a thread with persisted first-user owner metadata, despite forged second-user metadata in the create requests. First-user assistant and thread updates with forged second-user owner returned 403. Correct-owner updates returned 200.
- The second user's assistant and thread searches returned 200 with results that excluded the first user's IDs. These are **filtered results**, not HTTP 403. Cross-user assistant and thread reads, updates, and deletes returned 404.
- The first user's forged `metadata.owner` on `threads.create_run` returned 403. A valid run creation returned 200, and the returned and later read `run.user_id` matched the persisted first-user identity. The second user's own thread and run creation, read, and run cancellation returned 200; the second user's run also carried the second user's persisted `user_id`.
- The second user's cross-user run list returned 200 without the first user's run ID. Cross-user run read and stream returned 403 or 404, and cancel returned 403 or 404. The assertions checked that denial responses did not contain the first user's private message. The first user's own run stream returned 200.
- First-user Store put and delete returned 204; own get and search returned 200; own namespace listing returned 200. Second-user reads of the first user's item returned 404. Second-user Store search and namespace listing returned 200 without first-user data. A forged first-user namespace in a second-user put remained scoped to the second user: second-user get returned 200 and first-user get returned 404. A second-user delete against the first user's logical key returned 204 without deleting the first user's value. First-user delete removed that value; the later get returned 404.
- The fallback auth handler denied an unhandled cron search with 403. A separate `/runs/stream` ASGI request returned 200 and yielded the proof event. This test did not run a full network Aegra stream.

The first uncommitted US-005 `create_run` mutation attempt **failed**. Aegra 0.10.7 copied the handler value and did not apply mutated run owner metadata. The accepted handler rejects forged `metadata.owner` with 403 instead of relying on mutation. The accepted test also verifies that a successful run's `user_id` equals the persisted authenticated identity. Do not treat the failed mutation as an accepted protection.

After **each** probe, the worker ran these read-only cleanup commands and saw no output rows or paths:

```bash
docker ps -a --filter 'label=org.testcontainers' --format '{{.ID}} {{.Image}} {{.Names}} {{.Status}}'
find /tmp/tmux-$(id -u) -maxdepth 1 -type s -name 'aegra-auth-*' -print 2>/dev/null
```

The same checks returned no matches after the initial exit 2 and after the regression process. The auth test's `finally` block killed its named Orchestra auth tmux session, checked that no server remained, and removed its own socket if present. The pytest session fixture stopped each disposable testcontainer. The worker deleted no unrelated container. The label query does not establish the state or actor of any unlabeled container.

The final review did not test every Aegra route, full network streaming, semantic indexing, Alembic downgrade, production rollback, or cutover. The review did not prove universal absence of Aegra access to `public`. No production data moved. US-007 acceptance and any later integration decision remain with the advisor and operator. Keep the PR draft and unmerged; this worker did not push or change a PR.
