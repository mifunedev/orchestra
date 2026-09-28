# PRD: One-database Aegra ownership and Orchestra auth

Status: DRAFT

## User Stories

### US-001: Prove one-database schema ownership

**Description:** As an operator, I want separate migration schemas in one database so that Aegra can replace agent state without changing Orchestra's revision history.

**Acceptance Criteria:**

- [ ] An opt-in test creates one database with `public` and `aegra` schemas inside a disposable `pgvector/pgvector:pg17` testcontainer. The test refuses `TEST_POSTGRES_CONNECTION_STRING` and any operator database.
- [ ] Orchestra migrates `public` to revision `0001` and seeds one user. Aegra 0.10.7 upgrades only the `aegra` schema through its supported migration entry point.
- [ ] A dedicated Aegra role uses database-scoped `search_path = aegra`, without a `public` fallback. The test checks the database name, `current_schemas(true)`, and unqualified revision resolution before the upgrade.
- [ ] The test compares `public.alembic_version`, the seeded user, and the public table list before and after Aegra upgrade. Both schema-qualified version tables have independent revisions.
- [ ] The Aegra role cannot create, alter, or drop `public` objects. A negative preflight rejects a `public` search path before any Aegra migration. Disable automatic startup migrations in this probe.

### US-002: Prove supported Aegra runtime and rollback paths

**Description:** As an operator, I want Aegra's upgrade-only, non-indexed runtime and a schema-scoped rollback method to leave Orchestra-owned objects unchanged.

**Acceptance Criteria:**

- [ ] An opt-in disposable probe checks database name and effective schema on Alembic, ORM, checkpoint, and non-indexed store connections. Each exercised Aegra path resolves to `aegra` without a `public` fallback.
- [ ] Aegra's startup revision precheck reads `aegra.alembic_version` and does not change the `public` revision or table list. Startup migrations stay disabled.
- [ ] Checkpoint and non-indexed store round trips stay in `aegra`. Do not run Aegra Alembic downgrade or indexed Store; Orchestra keeps its indexed Store in `public`.
- [ ] In the disposable database only, back up `aegra` schema and data, preflight the archive's schema scope, change only Aegra-owned data, restore the archive, and prove the Aegra revision and stored data return while snapshots of Orchestra's `public` rows and catalog objects remain unchanged. Refuse any operator database, keep secrets out of output, and clean up the testcontainer.
- [ ] Record that this is an upgrade-only, non-indexed pilot with a tested schema-scoped restore, not support for Aegra downgrades, indexed Store, production rollback, or universal absence of public access.

### US-003: Share Orchestra credential validation

**Description:** As a maintainer, I want one credential resolver so that Orchestra routes and an Aegra adapter use the same user identity and revocation rules.

**Acceptance Criteria:**

- [ ] Extract request-independent credential validation from `backend/src/utils/auth.py`. Preserve existing JWT, `x-api-key`, user lookup, and token revocation behavior on Orchestra routes.
- [ ] For a valid JWT or API token, the resolver returns the database user's stable ID. Invalid, expired, revoked, missing-expiry, and deleted-user credentials fail closed.
- [ ] The resolver scopes each user lookup to a short-lived database session. A regression test shows no session remains held during an SSE response.
- [ ] Preserve the current API token `last_used_at` update on successful token authentication. Do not log a raw JWT or API key on failure.
- [ ] The existing API-token, auth-session, and public-assistant tests pass. The API-token lifecycle test runs without a skip.

### US-004: Authenticate the isolated Aegra service

**Description:** As an operator, I want Aegra to accept Orchestra identities so that a test run does not create a second user authority.

**Acceptance Criteria:**

- [ ] Aegra 0.10.7 loads the adapter through its supported `auth.path` setting in an opt-in configuration. The production Orchestra app does not mount Aegra routes.
- [ ] The adapter maps a verified Orchestra user ID to Aegra `identity`. It ignores client-supplied user and tenant fields.
- [ ] Missing, invalid, expired, or revoked credentials return 401 on protected Aegra routes. A missing auth configuration prevents the isolated service from starting; it never falls back to Aegra's shared anonymous identity.
- [ ] The adapter uses a separate, least-privilege role in the same database for `public` identity and token lookup. The Aegra migration role cannot create, alter, or drop `public` tables.
- [ ] API token lookup and resource streaming do not pin a pooled Orchestra connection for the duration of a run.

### US-005: Deny cross-user Aegra resources

**Description:** As an operator, I want explicit resource authorization so that an authenticated user cannot read or change another user's runs or data.

**Acceptance Criteria:**

- [ ] Explicit Aegra auth handlers cover assistant, thread, run-through-thread, and store operations used by the opt-in test. An unhandled operation fails closed.
- [ ] Two valid Orchestra users can access their own threads and runs. Cross-user search, read, stream, cancel, and store operations return a denial without exposing another user's data.
- [ ] Client-supplied owner metadata and store namespaces do not override the verified user ID.
- [ ] Tests exercise missing and revoked API tokens as well as valid JWTs against the adapter. The current Orchestra routes continue to pass their auth tests.

### US-006: Map data ownership and retirement

**Description:** As an operator, I want a verified ownership map so that Aegra replaces eligible state without deleting Orchestra-specific data.

**Acceptance Criteria:**

- [ ] Record each current assistant, thread, run, checkpoint, user, API-token, project, file, memory, setting, and schedule persistence path in `.agro/tasks/aegra-migration-auth-ownership/evidence/ownership.md`.
- [ ] For each path, state the current owner, candidate Aegra owner or Orchestra retention, field mapping status, and a test required before retirement. Do not claim equivalence from matching names alone.
- [ ] Mark assistants, threads, runs, and checkpoints as replacement candidates. Keep user and app-specific data until a separate migration and parity test passes.
- [ ] Record the order of data backfill, read-switch, rollback, and deletion for later work. Do not delete any table, namespace, queue, or object in this task.

### US-007: Record manual review evidence

**Description:** As an operator, I want a disposable live transcript so that I can decide whether to authorize a later integration.

**Acceptance Criteria:**

- [ ] After operator approval for disposable local resources, run the opt-in one-database, two-schema, two-user probe. Save a redacted command transcript in `.agro/tasks/aegra-migration-auth-ownership/evidence/manual-review.md`.
- [ ] Record exact database image, Aegra version, schema-qualified revisions, effective search paths, credential permissions, route statuses, and failure paths. Mark each untested claim as unverified.
- [ ] Stop the probe service and delete only resources created by the review. Record the cleanup commands and observed results.
- [ ] Keep PR #1015 draft and unmerged. If a new PR is authorized, base it on `development`; link the transcript, ownership map, risks, and the next decision without merging it.

## Summary

Draft PR #1015 found that Aegra 0.10.7 rejects Orchestra revision `0001` on a shared database. PR #1015's fixture-only auth denied cross-user runs, but did not use Orchestra credentials. Current `backend/src/utils/migrations.py` can clear an unknown revision. Aegra reads an unqualified `alembic_version` table and runs bundled migrations on startup by default. Orchestra validates JWTs and API tokens through `backend/src/utils/auth.py`. This plan uses one PostgreSQL database with separate `public` and `aegra` migration schemas. The operator approved an upgrade-only, non-indexed Aegra pilot; the rollback gate uses a disposable `aegra`-schema backup/restore instead of Alembic downgrade. Aegra can own agent state after migration and parity tests; Orchestra keeps user and app-specific state where Aegra has no proven replacement. This bounded stage proves the single-database boundary and maps later replacements. The stage does not switch live data. The new task does not depend on merging or cherry-picking PR #1015.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `backend/migrations/env.py` | `run_migrations_online` | Current Orchestra revision ownership. |
| `backend/src/utils/migrations.py` | `run_migrations`, `_stamp_head_with_clear` | Recovery hazard; never call the clear-and-stamp fallback on the shared database. |
| `backend/src/utils/auth.py` | `verify_credentials`, `get_optional_user` | Existing credential policy and guest access. |
| `backend/src/repos/api_token_repo.py` | `get_by_hash_global`, `update_last_used` | Token lookup and usage metadata. |
| `backend/src/services/db.py` | `AsyncSessionLocal`, `get_shared_store`, `close_shared_store` | Current session and store lifetimes. |
| `backend/src/schemas/models/auth.py` | `User`, `ProtectedUser` | Canonical user ID and user record. |
| `backend/main.py` | `lifespan`, `app` | Current runtime; do not mount Aegra. |
| `backend/conftest.py` | `_start_test_postgres` | Disposable pg17 test fixture. |
| `backend/src/services/assistant.py` | assistant persistence | Candidate Aegra ownership; mapping unverified. |
| `backend/src/repos/thread_repo.py` | thread snapshots | Candidate Aegra ownership; files and todos need mapping. |
| `backend/src/services/checkpoint.py` | checkpoint service | Candidate Aegra ownership; migration unverified. |
| `backend/tests/integration/test_api_tokens.py` | `test_api_token_lifecycle` | Existing create, use, revoke contract. |
| `backend/tests/unit/utils/test_auth_dependency_scope.py` | `test_auth_does_not_take_a_session_dependency` | Connection-lifetime regression. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Orchestra HTTP routes | Preserve | Keep existing JWT, API-token, guest, and stream behavior. |
| Aegra opt-in sidecar | Add | Use the same database with a dedicated schema and role. Load Orchestra auth through `auth.path`. |
| Aegra resource hooks | Add | Deny access outside the verified identity. |
| Data ownership map | Add | Name replacement candidates, retained data, and retirement gates. |
| Production deployment | None | Do not enable the sidecar or change Compose in this task. |

## Storage

Use ONE PostgreSQL database in the disposable fixture. Orchestra keeps `public.alembic_version`; Aegra must create `aegra.alembic_version`. Give Aegra a dedicated role with database-scoped `search_path = aegra`, without a `public` fallback. Give the auth adapter another constrained role for Orchestra users and API-token store data in `public`. Prove the token usage update without giving the Aegra migrator write access to `public`. Do not modify an operator database or reset revision history. Redis and MinIO are separate persistence surfaces; this plan does not add a second PostgreSQL database.

## Architectural Decisions

Keep schema isolation unverified until the disposable upgrade, startup precheck, ORM query, and checkpoint/non-indexed store round trip preserve the tested `public` baseline. Require an `aegra`-only backup/restore to preserve that baseline too. Do not run Alembic downgrade or indexed Store in this stage. The tagged downgrade references `public.uuid_generate_v4()`; the installed vector extension in `public` prevents an `aegra`-only indexed Store with the resolved LangGraph migrations. Aegra 0.10.7 has no verified version-table override. Set `RUN_MIGRATIONS_ON_STARTUP=false` for the opt-in sidecar and run an explicit Aegra upgrade with its restricted role. If a connection resolves to `public` or requires writes there, stop; do not create a second database as a fallback. Keep Orchestra's migration configuration unchanged. Map credentials to the persisted Orchestra user ID and use explicit Aegra authorization hooks. Preserve guest access only on Orchestra routes. Move eligible agent data in later tested steps; retire old storage only after backfill, parity, read-switch, and rollback proof.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `backend/tests/integration/test_aegra_schema_ownership.py` (new) | One database, two schemas, separate revisions, role search paths, and denied public DDL. | Migration ownership. |
| `backend/tests/integration/test_aegra_schema_runtime.py` (new) | Aegra upgrade, startup precheck, ORM, checkpoint/non-indexed store round trips, and an Aegra-only archive/restore with unchanged public snapshots. | Exercised runtime and pilot rollback boundary without Alembic downgrade. |
| `backend/tests/unit/utils/test_identity_resolver.py` (new) | JWT, API token, expiry, deleted user, revocation, redaction, and short session. | Shared identity policy. |
| `backend/tests/integration/test_api_tokens.py` | Create, use, revoke, and `last_used_at`. | Orchestra route parity. |
| `backend/tests/unit/utils/test_auth_dependency_scope.py` | No session held across streaming. | Pool safety. |
| `backend/tests/integration/test_public_assistants.py` | Guest access stays on Orchestra routes. | Existing public-assistant behavior. |
| `backend/tests/integration/test_aegra_auth_adapter.py` (new) | Startup guard, two-user thread/run/assistant/store authorization. | Aegra auth boundary. |
| `.agro/tasks/aegra-migration-auth-ownership/evidence/ownership.md` (new) | Current and candidate owners, mapping gaps, and retirement gates. | Replacement sequence. |
| `.agro/tasks/aegra-migration-auth-ownership/evidence/manual-review.md` (new) | Live commands, failures, and cleanup. | Reproducible decision evidence. |

Run `uv run pytest tests/unit/utils/test_identity_resolver.py tests/unit/utils/test_auth_dependency_scope.py tests/integration/test_api_tokens.py tests/integration/test_public_assistants.py` from `backend/`. Require `test_api_token_lifecycle` to execute without a skip. Run the opt-in Aegra tests with `AEGRA_OWNERSHIP_LIVE=1 uv run pytest tests/integration/test_aegra_schema_ownership.py tests/integration/test_aegra_schema_runtime.py tests/integration/test_aegra_auth_adapter.py` from `backend/` only after each prerequisite story passes. Run `uv run ruff check` from `backend/`. Do not run a live test with `TEST_POSTGRES_CONNECTION_STRING` set.

## Design Principles

Make ownership explicit through different schemas and roles inside one database. Use one credential resolver for both credential types. Fail closed when auth configuration or a resource hook is absent. Keep all test resources disposable and all production routes unchanged. Treat a failed safety assertion as a blocker, not as permission to stamp or clear a revision.

## Out of Scope

Do not merge or modify PR #1015. Do not add a second PostgreSQL database. Do not cut over Orchestra's runtime, streaming client, scheduler, or worker in this stage. Do not drop existing tables or namespaces. Do not support unauthenticated public assistants on the Aegra sidecar in this task. Do not change production Compose, deploy Aegra, or migrate an operator database.

## Open Questions

- Which exact Aegra 0.10.7 auth resource actions must the adapter register for the selected probe routes? Enumerate them from the tagged route map before implementation. Default-deny the remaining actions.
- Which minimum store grants permit token lookup and `last_used_at` updates without Aegra migration access to `public`? Prove the grants in the disposable database.
- Do the exercised Aegra 0.10.7 ORM, Alembic upgrade, checkpoint, and non-indexed store operations honor the dedicated role's `search_path`? Do not infer indexed Store or downgrade support from this proof; defer those paths to a separate decision.

## Acceptance Criteria

- [ ] The opt-in fixture proves independent `public` and `aegra` migration histories in ONE database; it preserves Orchestra's revision, user, and table list.
- [ ] Orchestra JWT and API-token behavior stays green; Aegra rejects missing and cross-user credentials on the tested routes.
- [ ] The ownership map names replacement candidates, retained data, and tests required before any retirement.
- [ ] The manual transcript records exact outcomes and removes every disposable resource.
- [ ] PR #1015 remains draft and unmerged. This PRD receives explicit operator approval before any issue, branch, worker, or PR for the new task.

## Lessons

The advisor fills this section after implementation and before review.
