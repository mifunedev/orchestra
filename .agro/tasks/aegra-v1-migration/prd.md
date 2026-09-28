# PRD: Aegra v1 agent API and eligibility routing

Status: DRAFT

The operator approved this plan. PR #1020 merged into `experiment/aegra` before implementation.

## User Stories

### US-001: Expose the Aegra v1 agent API

**Description:** As an API client, I want Aegra threads and runs under `/api/v1` so that I can distinguish them from legacy `/api` operations.

**Acceptance Criteria:**

- [ ] First add failing route tests for Aegra thread creation and run streaming under `/api/v1`.
- [ ] An authorized client creates a thread with `POST /api/v1/threads` and streams a run with `POST /api/v1/threads/{thread_id}/runs/stream` using Aegra-native payloads and events.
- [ ] An unauthenticated request to each v1 route returns `401`; a second user cannot read or run the first user's thread.
- [ ] Legacy `POST /api/llm/stream` and `/api/threads/search` retain their existing payloads and behavior.
- [ ] The frontend proxy directs `/api/v1` to the Aegra service and legacy `/api` to the Orchestra backend.
- [ ] The experiment exposes no permanent duplicate Aegra contract under `/api/aegra` after v1 clients move.

### US-002: Select an engine before new-thread creation

**Description:** As a chat user, I want supported interactions on v1 and unsupported ones on v0 so that legacy features remain available.

**Acceptance Criteria:**

- [ ] First add failing UI tests for a new text chat with an authorized tool and for new chats with files, MCP, A2A, subagents, public assistants, or a custom system prompt.
- [ ] Before any thread creation request, the UI selects v1 for a supported text interaction with authorized Orchestra tools.
- [ ] Before any thread creation request, the UI selects legacy v0 when the interaction requests a feature that v1 does not support; the legacy request keeps that feature's input.
- [ ] Each thread keeps one engine for later turns; a failed or interrupted v1 run never retries through `/api/llm/stream`.
- [ ] Existing legacy threads stay on their existing routes. No request dual-writes thread, run, or checkpoint state.
- [ ] Verify in browser using agent-browser skill.

### US-003: Recover engine ownership after reload

**Description:** As a returning user, I want server-owned thread routing so that reloads and other devices cannot send a thread to the wrong store.

**Acceptance Criteria:**

- [ ] First add failing tests that clear `localStorage` before opening one v1 thread and one legacy thread.
- [ ] The UI discovers authorized v1 threads through Aegra thread search or an equivalent server-owned record; it does not use `localStorage` as the authority for engine ownership.
- [ ] After a reload without local markers, opening a v1 thread reads its Aegra state and opening a legacy thread reads its existing Orchestra state.
- [ ] A second user cannot discover or read the first user's v1 thread through the new lookup path.
- [ ] The UI does not send a v1 thread identifier to legacy checkpoint search or write a legacy thread row for it.
- [ ] Verify in browser using agent-browser skill.

### US-004: Review both paths and clean up

**Description:** As an operator, I want observed v0 and v1 journeys so that I can decide whether the experiment is ready for further parity work.

**Acceptance Criteria:**

- [ ] After operator approval for disposable resources, record redacted commands, HTTP statuses, and annotated screenshots in `.agro/tasks/aegra-v1-migration/evidence/manual-review.md`.
- [ ] In agent-browser, create a v1 thread, invoke an Orchestra tool, see its result and streamed reply, and send a second turn.
- [ ] In agent-browser, create a new thread with one unsupported feature and observe the legacy v0 path retain that input.
- [ ] Reload with browser-local ownership flags cleared; confirm both threads open under their original engines.
- [ ] Stop only review processes and delete only task-created disposable databases; verify their absence.

## Summary

The accepted #1019 slice on `feat/1019-aegra-stream-api` proves new-thread Aegra tool use and a second turn. PR #1020 merged into `experiment/aegra` and supplies the starting Aegra integration for this plan. The slice currently routes every new UI chat to `/api/aegra` and rejects unsupported inputs. The UI records Aegra thread ownership in `localStorage`. Legacy `backend/src/routes/v0` serves the public `/api` prefix rather than `/api/v0`. This plan adds an explicit Aegra v1 agent contract and selects legacy v0 for unsupported interactions before a thread exists. `development` remains unchanged during the experiment.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `backend/src/routes/v0/__init__.py` | `create_api_router` | Preserves the existing legacy `/api` prefix. |
| `backend/src/routes/v0/llm.py` | `llm_stream` | Existing stream route for v0 interactions. |
| `backend/src/routes/v0/thread.py` | `search_threads` | Existing legacy thread and checkpoint lookup. |
| `backend/src/integrations/aegra/app.py` | `RequestBoundary`, `create_app` | Exposes the native Aegra thread and run endpoints. |
| `backend/src/integrations/aegra/auth.py` | `authorize`, `authorize_run` | Limits v1 operations and request inputs. |
| `frontend/vite.config.ts` | `server.proxy` | Directs v1 requests to the Aegra service. |
| `frontend/src/hooks/useChat.ts` | `handleAegraSubmit`, `handleSubmit` | Selects an engine and submits a new interaction. |
| `frontend/src/lib/services/threadService.ts` | `isAegraThread`, `searchThreads`, `streamAegraThread` | Creates and discovers threads under their owners. |
| `frontend/src/hooks/useInitialThreadRedirect.ts` | `useInitialThreadRedirect` | Keeps a live v1 chat off the legacy checkpoint route. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Legacy v0 `/api` | Preserve | Keep existing URLs, payloads, and thread ownership. |
| Aegra v1 `/api/v1` | Replace experiment alias | Expose native Aegra thread and run-stream operations. |
| New-chat UI | Select | Route supported interactions to v1 and unsupported interactions to v0 before thread creation. |
| Thread history | Extend | Discover both engines from server-owned state after reload. |

## Storage

Keep Aegra threads, runs, and checkpoints in Aegra's separate database. Keep legacy threads in Orchestra's existing store. Read both owners when the UI discovers threads. Do not backfill, dual-write, or move old thread records in this task. Use existing Aegra ownership and search before proposing another ownership table.

## Architectural Decisions

Use `v0` and `v1` to name agent API generations, not two interchangeable serializers for one thread. Keep the legacy public `/api` routes during the experiment. Expose Aegra-native requests and SSE through `/api/v1` rather than creating another server-side event mapper. Select the engine from requested capabilities before creation. Once a thread exists, its original engine owns every turn and read. Retain Orchestra credential and tool authority behind v1. Do not treat browser storage as the ownership authority.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `backend/tests/integration/test_aegra_chat_stream.py` | v1 URL, authorized tool run, second user denied. | New public prefix and identity boundary. |
| `frontend/src/hooks/useChat.test.tsx` | Supported v1 request, unsupported v0 request, no cross-engine retry. | Pre-creation selection and stable ownership. |
| `frontend/src/hooks/useInitialThreadRedirect.test.tsx` | v1 and legacy route selection after reload. | Engine-aware navigation. |
| `frontend/src/lib/services/threadService.ts` tests | V1 discovery with empty browser storage. | Server-owned lookup. |
| `.agro/tasks/aegra-v1-migration/evidence/manual-review.md` | Two browser journeys, isolation, and cleanup. | Review evidence. |

Run the focused Aegra backend runner from the repository root against a task-created disposable database. Run the focused frontend tests and `npm run build` from `frontend/`. Run the repository CI jobs on the experiment branch. Do not start a review database without operator approval.

## Design Principles

Keep one owner per thread. Preserve legacy inputs until v1 supports them. Prefer Aegra's native event protocol over another custom SSE loop. Make routing testable before creation, and keep an explicit rollback path for new-thread assignments.

## Out of Scope

Do not merge `experiment/aegra` into `development` in this task. Do not migrate old thread state, add distributed workers, provision vector support, or deploy to production. Do not promise full feature parity, retire legacy routes, or add a new v2 API. Each unsupported capability can move from v0 to v1 only after a separate parity test proves it.

## Open Questions

The operator must approve disposable review resources before US-004 starts. Promotion criteria for `development` require a separate operator decision after parity evidence exists. Neither approval blocks the current implementation stories.

## Acceptance Criteria

- [ ] `/api/v1` runs a new Aegra thread and authorized Orchestra tool without changing public legacy `/api` behavior.
- [ ] Supported new chats default to v1; unsupported interactions choose v0 before creating a thread.
- [ ] A v1 failure does not fall back to v0, and later turns stay with their original engine.
- [ ] Server-owned discovery recovers v1 and v0 thread routing after browser storage is cleared.
- [ ] Annotated browser evidence covers both paths and all task-created review resources are cleaned up.

## Lessons

Filled by the advisor after verified implementation.
