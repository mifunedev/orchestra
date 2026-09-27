# Protocol probe: Aegra 0.10.7

The worker used a fresh database in a disposable `pgvector/pgvector:pg17` container. It ran Aegra 0.10.7 with the no-LLM graph in `backend/tests/fixtures/aegra_probe_graph.py` and the two-identity authentication fixture in `backend/tests/fixtures/aegra_probe_auth.py`. A scratch installation of `@langchain/langgraph-sdk` 1.12.0 with its `@langchain/core` peer searched assistants and streamed a run. The worker did not change the active Orchestra runtime.

## Observed routes and identity

| Request | No credential | Alice | Bob on Alice's resource |
|---|---:|---:|---:|
| `GET /health` | 200 | 200 | 200 |
| `POST /assistants/search` | 401 | 200 | 200; Bob can list the shared assistant |
| `POST /threads/{id}/runs` | 401 | 200 | 404 |
| `GET /threads/{id}/runs/{run_id}/stream` | 401 | 200 | 404 |
| `POST /threads/{id}/runs/{run_id}/cancel` | 401 | 200 | 404 |
| `POST /threads/{id}/stream/events` | 401 | 200 | 404 |

Aegra returned 404 for Orchestra's `POST /api/llm/stream` and `GET /api/threads/{id}/stream?run_id=…` paths. `POST /threads/{id}/runs/stream` returned 200 SSE. These outcomes require the fixture authentication hook. They do not prove compatibility with Orchestra's token or tenant model.

## Observed stream and replay

A completed run emitted named `metadata`, `values`, `updates`, `values`, and `end` frames with JSON objects. Each frame included an `id:` cursor. The terminal payload was `{"status":"success"}`, not `[DONE]`. A replay GET with `Last-Event-ID` set to the first `values` cursor returned later events and ended with `end`. Cancellation returned 200 and status `interrupted`; its later stream ended with `{"status":"interrupted"}`.

The v2 `/threads/{id}/stream/events` route returned 200. A six-second observation yielded a heartbeat but no replayed event. A v1 cursor in `since` returned 422. Numeric `since: 2` returned 200 without an observed event. The probe does not establish v2 replay.

`frontend/src/tests/services/aegraEventCompatibility.test.ts` holds the observed frame sample. The current `FetchStreamReader` drops those frames and does not retain their cursor. A later integration needs an explicit mapping and new recovery semantics. A base-URL change cannot produce compatible messages.

## Cleanup

The worker removed its named tmux session, disposable container, scratch SDK installation, temporary captures, and generated build output. The worker left an unrelated pre-existing `us002-port22` tmux session untouched. The worker reported a clean worktree after cleanup.
