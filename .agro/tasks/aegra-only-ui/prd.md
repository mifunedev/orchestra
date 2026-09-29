# PRD: Aegra-only chat in the experiment

Status: DRAFT

The operator replaced the dual-engine UI direction in `.agro/tasks/aegra-v1-migration/prd.md` on 2026-09-28. This plan supersedes that plan's frontend chat routing and history criteria. The completed v1 API and browser evidence remain valid.

## User Stories

### US-001: Show only Aegra thread history

**Description:** As a chat user, I want to see only my Aegra threads so that old database threads stay out of this UI.

**Acceptance Criteria:**

- [ ] First add failing tests for Aegra-only thread listing, pagination, native state reload, and a legacy-only thread ID.
- [ ] Sidebar and direct thread navigation use Aegra search and state. Neither operation calls the legacy thread or checkpoint API.
- [ ] A legacy-only thread URL displays an unavailable-thread message. It does not load or modify its old record.
- [ ] Aegra file state still appears in the Files panel after reload.
- [ ] Verify the result in a browser with the agent-browser skill.

### US-002: Reject unsupported chat input before creation

**Description:** As a chat user, I want the experiment to use only Aegra chat runs so that an unsupported input never creates a legacy chat.

**Acceptance Criteria:**

- [ ] First add failing tests for an attachment, MCP, A2A, subagent, public assistant, custom prompt, and checkpoint override.
- [ ] Supported text and authorized-tool chats create and stream through `/api/v1` only.
- [ ] Unsupported chat input shows a clear error and retains the user's draft. It creates no v1 or legacy thread and sends no legacy run request.
- [ ] An existing native thread keeps its owner after an unsupported request or v1 failure. No request retries through `/api/llm/stream`.
- [ ] Verify the result in a browser with the agent-browser skill.

### US-003: Remove legacy chat actions from the UI

**Description:** As a chat user, I want history actions to use only Aegra operations so that I cannot invoke an old chat route.

**Acceptance Criteria:**

- [ ] A sidebar, search, project, or assistant view does not list a legacy chat thread.
- [ ] A native thread does not offer a delete, project move, share, replay, or legacy recovery action that would call an old chat API. If an equivalent Aegra operation is unavailable, the UI omits the action or states that it is unavailable.
- [ ] Browser tests and focused UI tests detect an unexpected call to `/api/threads/search`, `/api/llm/stream`, or `/api/threads/{id}` from chat history, creation, or recovery.
- [ ] Account login, settings, models, and tool catalog remain available through the Orchestra backend.
- [ ] Verify the result in a browser with the agent-browser skill.

### US-004: Review the Aegra-only experience

**Description:** As an operator, I want observed native and unsupported journeys so that I can review the new experiment without changing old records.

**Acceptance Criteria:**

- [ ] Record redacted HTTP statuses, UI results, and screenshots in `.agro/tasks/aegra-only-ui/evidence/manual-review.md`.
- [ ] Reload an existing Aegra thread and confirm its messages and generated file appear without a legacy chat request.
- [ ] Open a legacy-only URL and confirm it shows an unavailable message without a legacy chat request.
- [ ] Attempt an unsupported new input and confirm the draft and error remain without creating any thread.
- [ ] Leave existing databases and old thread records unchanged. Stop only task-owned review processes.

## Summary

PR #1022 currently combines native Aegra threads with legacy chat history and uses legacy streaming for unsupported interactions. The operator chose to retire legacy **chat** support in the experiment. Keep Aegra as the sole chat owner in this frontend. Keep Orchestra as the authority for identity, settings, model and tool catalog, and tool execution until a separate migration replaces those dependencies.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `frontend/src/lib/services/threadService.ts` | `searchAegraThreads`, `resolveThreadOwner` | Discover and verify native thread IDs without a legacy lookup. |
| `frontend/src/hooks/useThread.ts` | `loadThread`, `fetchThreads`, `loadMoreThreads` | Load native state, native history, and native pagination. |
| `frontend/src/hooks/useChat.ts` | `handleSubmit`, `handleAegraSubmit` | Reject unsupported input before native thread creation. |
| `frontend/src/pages/threads/ThreadPage.tsx` | `useActiveStreamRecovery`, `useLoadThreadEffect` | Show unavailable old links without legacy recovery requests. |
| `frontend/src/components/drawers/app-sidebar.tsx` | `ThreadItem`, `loadMoreThreads` | Show native rows and prevent legacy actions. |
| `frontend/src/hooks/useThreadSearch.ts`, `frontend/src/components/lists/ListProjectThreads.tsx` | search and project history | Remove or replace independent legacy chat searches. |
| `backend/src/integrations/aegra/authority.py` | `authenticate`, `catalog`, `tool_proxy` | Keep authorized backend identity and tool dependencies. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Experimental chat UI | Retire | Remove legacy chat history, creation, recovery, and action paths. |
| Native `/api/v1` | Reuse | Keep authenticated thread search, state, creation, and run streaming. |
| Legacy public `/api` | Preserve | Keep existing backend behavior for other clients and account/tool dependencies. |
| Unsupported chat input | Reject | Show a clear error before any thread or run request. |

## Storage

Use the separate Aegra database for experimental chat threads and files. Do not delete, copy, or migrate old Orchestra threads. Keep the Orchestra database available for identity, settings, models, and tools. Do not add a thread ownership table.

## Architectural Decisions

The operator's decision changes the approved UI ownership contract. Hiding legacy rows alone is insufficient because unsupported inputs and old links would still use legacy chat. Remove all experimental UI paths to legacy chat. Fail closed on unknown or old thread IDs. Preserve the legacy server API and data as a reversible boundary; replacing account and tool authority needs a separate decision.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `frontend/src/hooks/useThread.test.tsx` | Native-only history, pagination, state, old ID | No legacy thread lookup. |
| `frontend/src/hooks/useChat.test.tsx` | Supported v1, unsupported input, failure | No legacy run or creation. |
| `frontend/src/hooks/useInitialThreadRedirect.test.tsx` | Native navigation and old ID | No ownership fallback. |
| `frontend/src/context/ChatContext.test.tsx` | Native file reload and passive files | File provenance stays native. |
| `.agro/tasks/aegra-only-ui/evidence/manual-review.md` | Existing thread, old URL, unsupported input | Observed browser behavior. |

Run `npm test`, `npm run build`, scoped ESLint, and scoped Prettier in `frontend/`. Check the PR's backend and frontend CI jobs after pushing.

## Design Principles

Keep one chat owner in this experiment. Keep old records untouched. Reject an unsupported interaction before creation. Keep one authority for authentication and tools. Do not add a second event or ownership adapter.

## Out of Scope

Do not merge into `development` or `experiment/aegra`. Do not remove public legacy backend routes or delete or migrate old data. Do not replace Orchestra authentication or tools, add parity for unsupported Aegra inputs, or deploy production workers.

## Open Questions

None. The operator selected Aegra-only chat support for this experiment.

## Acceptance Criteria

- [ ] No experimental UI action lists, reads, creates, or streams a legacy chat.
- [ ] Supported chats and existing Aegra threads work through native v1 routes, including file reload.
- [ ] Unsupported requests fail before thread creation and preserve the draft.
- [ ] Account authentication and tool authorization still work through Orchestra.
- [ ] Browser evidence and CI confirm the change without modifying old records.

## Lessons

Filled by the advisor after verification.
