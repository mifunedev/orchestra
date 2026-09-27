# PRD: Aegra compatibility probe

Status: DRAFT

## User Stories

### US-001: Check migration ownership

**Description:** As a maintainer, I want an isolated database probe so that I can assess whether Aegra preserves Orchestra revisions and existing data.

**Acceptance Criteria:**

- [ ] Record the selected Aegra release, SDK release, Python requirements, and package source in the task evidence. Do not reuse the pins from closed PR #977 without verification.
- [ ] Seed a disposable PostgreSQL database with an existing Orchestra revision and one data record before the probe.
- [ ] Run the Aegra migration path against the disposable database. Assert that the existing record and Orchestra revision remain intact, or record the exact failed assertion and stop before any cutover claim.
- [ ] Add a focused probe test that detects a changed revision or seeded record. Do not run `backend/src/utils/migrations.py` against an operator database.
- [ ] Compare package requirements with the pg16 Compose image and pg17 test image. Mark an untested database version as unverified. Do not change `infra/docker-compose.yml` or `README.md` in this PR.

### US-002: Probe protocol and client stream contracts

**Description:** As a maintainer, I want an isolated Aegra request path so that I can compare its behavior with Orchestra without changing the active app.

**Acceptance Criteria:**

- [ ] Use a disposable Aegra process and database. Keep `backend/main.py`, `backend/src/routes/v0/llm.py`, and `frontend/src/hooks/useChat.ts` unchanged.
- [ ] Record the Aegra route paths and HTTP results for one health or metadata request and one Agent Protocol run request. Compare them with `/api/llm/stream` and `/api/threads/{thread_id}/stream`.
- [ ] Exercise missing, valid, and cross-user credentials on the available probe routes. Record status codes and identify any route that cannot enforce current tenant rules.
- [ ] Exercise one streamed run, cancellation, and reconnect or replay. Record the emitted event names, terminal signal, cursor behavior, and errors. State when the installed release lacks a capability.
- [ ] Add focused, fixture-based tests for the observed event mapping against `frontend/src/lib/entities/stream.ts`. Do not wire the SDK into production chat.

### US-003: Record live manual review

**Description:** As an operator, I want a reproducible review so that I can decide whether to fund a later integration step.

**Acceptance Criteria:**

- [ ] With operator approval for disposable local resources, run the probe and save a redacted command transcript to `.agro/tasks/aegra-compatibility-probe/evidence/manual-review.md`.
- [ ] Record exact package versions, database image, result or blocker for each boundary, and the cleanup command in the transcript.
- [ ] Delete every database, process, and file created outside the worktree for the probe. Record the cleanup result.
- [ ] The draft PR links the evidence, states what remains unverified, identifies the highest migration or auth risk, and recommends one next decision.

## Summary

Current `development` has no Aegra integration. `backend/main.py` owns FastAPI, MCP, migrations, and scheduler startup. `backend/src/utils/migrations.py` can clear `alembic_version` after an unknown revision. `frontend/src/lib/services/threadService.ts` starts direct SSE or distributed polling. Closed PRs #977 and #992 supply questions, not mergeable code. On 2026-09-27, PyPI reported `aegra-api` 0.10.7 and npm reported `@langchain/langgraph-sdk` 1.12.0. These release numbers do not prove runtime compatibility. This task tests Aegra in an isolated, disposable environment and keeps the production runtime unchanged.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `backend/migrations/env.py` | `run_migrations_online` | Current Orchestra Alembic configuration. |
| `backend/src/utils/migrations.py` | `run_migrations`, `_stamp_head_with_clear` | Existing revision recovery hazard. |
| `backend/main.py` | `lifespan`, `app` | Active runtime that this probe must not replace. |
| `backend/src/routes/v0/llm.py` | `llm_stream` | Current chat stream endpoint. |
| `backend/src/routes/v0/thread.py` | `stream_thread` | Current distributed replay endpoint. |
| `backend/src/utils/auth.py` | `get_optional_user`, `get_optional_user_from_token` | Current auth behavior. |
| `frontend/src/lib/services/threadService.ts` | `initiateStream` | Current sync and distributed response selection. |
| `frontend/src/lib/entities/stream.ts` | `StreamEvent` | Client event contract to compare. |
| `infra/docker-compose.yml` | `postgres` | Current pg16 image and database credentials. |
| `backend/conftest.py` | `_start_test_postgres` | Current pg17 disposable test fixture. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Production HTTP routes | None | Compare paths; do not mount Aegra in the active app. |
| Frontend chat UI | None | Compare event shapes; do not edit `useChat.ts`. |
| Probe tests and evidence | Add | Store focused checks and a reproducible, redacted transcript. |

## Storage

Use only a disposable local PostgreSQL database for the live probe. Seed one Orchestra revision and one record before testing Aegra. Never use an operator or production database. Keep all schema and revision changes out of the active app.

## Architectural Decisions

An isolated compatibility probe precedes any Aegra cutover. Do not share `alembic_version` without a proven ownership rule. Do not add a second production streaming path. Select package versions from current release metadata and record why the selected pair is compatible.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `backend/tests/unit/utils/test_aegra_migration_probe.py` | Revision and record snapshots detect mutation. | Migration ownership hazard. |
| `backend/tests/integration/test_distributed_stream.py` | Current response and replay contract remains unchanged. | Legacy contract regression. |
| `frontend/src/tests/integration/distributedStream.test.ts` | Sync and distributed initiation cases stay green. | Current client path. |
| `frontend/src/tests/services/aegraEventCompatibility.test.ts` | Captured Aegra events map or fail explicitly against `StreamEvent`. | Client event feasibility without active chat wiring. |
| `.agro/tasks/aegra-compatibility-probe/evidence/manual-review.md` | Live commands, responses, database preservation, and cleanup. | Live compatibility or a precise blocker. |

Run `uv run pytest tests/unit/utils/test_aegra_migration_probe.py tests/integration/test_distributed_stream.py` from `backend/`. Run `npm test -- src/tests/integration/distributedStream.test.ts src/tests/services/aegraEventCompatibility.test.ts` from `frontend/`. Run `uv run ruff check` from `backend/` and `npm run build` from `frontend/` after the focused tests.

## Design Principles

Use a small reversible probe. Treat failed compatibility checks as findings. Do not claim that a fixture proves tenant isolation. Do not copy code or deployment instructions from closed PRs without current evidence. Preserve the unrelated edit to `frontend/src/hooks/useChat.ts` in the main checkout.

## Out of Scope

Do not replace Orchestra routes, scheduler, workers, auth, or streaming. Do not edit production migrations, Compose, README setup commands, or the active frontend chat hook. Do not merge the draft PR.

## Open Questions

- Which current Aegra release and SDK pair can run beside the current dependency set? Resolve from release metadata and the live probe; record an incompatibility as a blocker.
- Does the selected release support reconnect or replay? Record the observed behavior without inventing parity.

## Acceptance Criteria

- [ ] A fresh draft PR targets `development` and contains only the approved probe scope.
- [ ] Focused tests and checks pass; the PR separates observed behavior from unverified integration claims.
- [ ] The unrelated `frontend/src/hooks/useChat.ts` edit remains unchanged in the main checkout.
- [ ] The live transcript identifies what passed, what failed, and the next decision. No disposable resource remains.

## Lessons

- Aegra rejects Orchestra revision `0001` ([migration evidence](evidence/migration.md)). Outcome: dropped from this PR because production migration ownership is outside the approved probe scope.
- Orchestra's reader drops Aegra's named SSE frames ([protocol evidence](evidence/protocol.md)). Outcome: dropped from this PR because production client adaptation is outside the approved probe scope.

PR #1015 records the next decision.
