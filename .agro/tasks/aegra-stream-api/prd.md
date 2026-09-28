# PRD: New UI threads on Aegra

Status: DRAFT

## User Stories

### US-001: Run an Orchestra graph with a tool on Aegra

**Description:** As a chat user, I want my new thread to use an Orchestra tool through Aegra so that I can complete a task.

**Acceptance Criteria:**

- [ ] First add a failing integration test for a new Aegra thread with two turns and one deterministic Orchestra tool call.
- [ ] Register the real Orchestra chat graph with Aegra. The test observes the tool call, tool result, streamed reply, and persisted second-turn context.
- [ ] Authenticate each run with Orchestra's current credential authority. Reject missing credentials, unknown tools, and cross-user thread or stream access.
- [ ] Keep new Aegra thread and run data outside Orchestra's existing tables. The test finds no new Orchestra thread row for the Aegra run.
- [ ] No new-thread request invokes Orchestra `stream_generator` or `LLMController.llm_stream`.

### US-002: Create an Aegra thread through the current UI

**Description:** As a chat user, I want New Thread to stream Aegra replies and tool results so that I can use the current chat view.

**Acceptance Criteria:**

- [ ] First add failing UI tests for first-message thread creation, tool events, reply completion, errors, and a second message.
- [ ] After New Thread and the first message, the UI creates an Aegra thread and displays its tool call, result, and streamed reply.
- [ ] A second message in that thread runs through Aegra and uses the first turn's history.
- [ ] Keep existing Orchestra-owned threads on their current routes. Do not dual-write a new thread or redirect an old thread to Aegra.
- [ ] Reject unsupported new-thread inputs before execution. Do not reject supported Orchestra tools.
- [ ] Verify in browser using agent-browser skill.

### US-003: Review the UI journey

**Description:** As an operator, I want observed browser and API evidence so that I can accept the new-thread path.

**Acceptance Criteria:**

- [ ] After operator approval for disposable local resources, record redacted commands and route responses in `.agro/tasks/aegra-stream-api/evidence/manual-review.md`.
- [ ] Record an agent-browser journey with annotated screenshots: New Thread, a tool call and result, a streamed reply, and a second turn.
- [ ] Confirm that a second user cannot read the new thread or attach to its run stream.
- [ ] Stop the review service and delete only resources created for this review. Use the evidence for the PR `## Manual review` section.

## Summary

The existing New Thread control clears the current chat state. The first message currently reaches Orchestra `POST /api/llm/stream`. Orchestra owns SSE formatting in `backend/src/utils/stream.py`. Aegra must own the stream for new UI threads, including an Orchestra tool call. Keep legacy thread behavior unchanged. This task starts from the current `development` branch; no prior Aegra pilot, branch, probe, schema design, or migration is a prerequisite.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `frontend/src/components/buttons/NewThreadButton.tsx` | `handleClick` | Clears chat state before a new first message. |
| `frontend/src/hooks/useChat.ts` | `useChat` | Submits input and displays stream events. |
| `frontend/src/lib/services/threadService.ts` | `initiateStream`, `streamThread` | Current Orchestra stream request. |
| `frontend/src/lib/utils/streamSource.ts` | `SyncStreamSource` | Current stream event boundary. |
| `backend/src/agents/__init__.py` | `construct_agent`, `init_config` | Real chat graph and tool configuration. |
| `backend/src/routes/v0/auth.py` | `read_user_details` | Existing credential authority at `/api/auth/user`. |
| `backend/src/routes/v0/llm.py` | `llm_stream` | Existing route for old threads; not the new-thread stream owner. |
| `backend/src/utils/stream.py` | `stream_generator` | Existing SSE loop; do not copy it. |
| `backend/src/integrations/aegra/` | `create_app`, `graph`, `auth` | New isolated Aegra service, real graph, and Orchestra identity boundary. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| New UI thread | Replace | Use Aegra thread creation and run streaming for the first and later turns. |
| Orchestra tools | Reuse | Run authorized tools in the Aegra-hosted graph and show their events. |
| Existing threads | Preserve | Leave existing Orchestra requests and history unchanged. |
| Browser route | Add | Expose a protected Aegra route for the new-thread client. |

## Storage

Use Aegra's own store for new threads, runs, and checkpoints. Keep it separate from Orchestra's existing tables and migration history. Use a disposable local Aegra store for review. Do not backfill, dual-write, or delete old state.

## Architectural Decisions

Use Aegra's native thread and run-stream API. Add one client event mapper, not a second server-side SSE loop. Implement only the credential validation and user scoping needed for this path. Use Orchestra `/api/auth/user` as the existing identity authority. Reject access across users. Do not import the prior pilot or its single-database schema design. Keep existing Orchestra streaming for existing threads; new threads must not call it.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `backend/tests/integration/test_aegra_chat_stream.py` (new) | New thread, two turns, deterministic tool, credential failure, cross-user denial. | Aegra runtime and isolation. |
| `backend/scripts/test-aegra-chat-stream.sh` (new) | Create and drop one fresh Aegra database in the existing container. | Repeatable vector-free backend test. |
| `frontend/src/tests/utils/aegraStream.test.ts` (new) | Tool event mapping, reply, error, completion. | Client transport. |
| `frontend/src/hooks/useChat.test.tsx` | New-thread dispatch, second turn, legacy route unchanged. | UI routing. |
| `.agro/tasks/aegra-stream-api/evidence/manual-review.md` (new) | Browser journey, API response, resource cleanup. | Manual review. |

Run `bash backend/scripts/test-aegra-chat-stream.sh` from the repository root. The runner excludes the vector-dependent Orchestra test fixtures. Run `npm test -- src/tests/utils/aegraStream.test.ts src/hooks/useChat.test.tsx` and `npm run build` from `frontend/`. Use only disposable local state in integration tests.

## Design Principles

Keep one stream owner for each thread. Reuse the existing identity authority and graph tools. Add no migration or compatibility framework. Fail closed on unauthorized access. Test the UI path with the real graph.

## Out of Scope

Do not add vector or support distributed workers or Redis stream polling. Do not migrate old threads, replace existing-thread streams, or change their API. Do not support public assistants, files, MCP, subagents, or production deployment in this task. Do not import or finish a prior Aegra attempt.

## Open Questions

None. The implementation selects the local Aegra browser route and records it in the test and manual review. Operator approval is still required to start the plan or use disposable local resources.

## Acceptance Criteria

- [ ] New Thread in the current UI creates an Aegra-owned thread after the first message.
- [ ] The UI shows an authorized Orchestra tool call, its result, and an Aegra-streamed reply.
- [ ] A second message uses the same Aegra thread and its prior context.
- [ ] Cross-user access fails, existing-thread behavior stays unchanged, and the browser journey has annotated screenshots.

## Lessons

Filled by the advisor before undraft.
