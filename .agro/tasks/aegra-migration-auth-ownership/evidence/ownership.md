# Candidate data ownership map

This map describes code-defined persistence on `development` at `62a7b714`, not live row counts or a completed migration. The single-database schema gate failed. Every Aegra target below remains a **candidate**. The operator must not remove any table, namespace, queue, or object on this evidence alone.

| Data | Current owner and path | Candidate owner | Field mapping / retirement gate |
|---|---|---|---|
| Assistants | Orchestra's LangGraph Store namespaces; `backend/src/services/assistant.py` | Aegra assistant records in `aegra` | Unverified. Compare IDs, private/public visibility, publishing fields, configuration, and permissions before backfill or read-switch. |
| Threads and snapshots | Orchestra `threads` Store namespace; `backend/src/repos/thread_repo.py` | Aegra threads in `aegra` | Unverified. Compare messages, files, todos, metadata, ownership, pagination, and history round trips. |
| Runs and streaming | Orchestra's current route/runtime, `backend/src/routes/v0/thread.py` and `backend/src/utils/stream.py` | Aegra runs in `aegra` | Unverified. Verify stream frames, replay, cancellation, failed-run recovery, and client compatibility before route switch. |
| Checkpoints | `AsyncPostgresSaver` setup in `backend/src/services/db.py` and `backend/src/services/checkpoint.py` | Aegra-managed checkpoint tables in `aegra` | Unverified. Compare replay/resume and pending writes for existing threads; prove no public table conflict. |
| Users | Orchestra's `public.users`; `backend/migrations/versions/0000_init.py`, `backend/src/repos/user_repo.py` | Retain Orchestra | Aegra auth must map to stable Orchestra user IDs. No user-table retirement in this stage. |
| API tokens and third-party tokens | Orchestra `public.tokens` and Store API-token namespaces; `backend/migrations/versions/0001_add_tokens_table.py`, `backend/src/repos/api_token_repo.py` | Retain Orchestra | Prove hash lookup, revocation, `last_used_at`, encryption, and least-privilege public access before any auth cutover. |
| Projects, sources, documents | Orchestra Store repos `backend/src/repos/project_repo.py`, `source_repo.py`, `doc_repo.py` | Retain Orchestra | No verified Aegra equivalent. Map references to assistant/thread IDs before changing either side. |
| Files and objects | Orchestra metadata and MinIO object store; `backend/src/services/storage.py` | Retain Orchestra and MinIO | Verify metadata and object-link migration before any retirement; No test has verified Aegra support. |
| Memories | Orchestra `backend/src/repos/memory_repo.py` and `backend/src/services/memory.py` | Retain Orchestra | No verified namespace, embedding, or retrieval parity. |
| User settings and provider keys | Orchestra `backend/src/repos/user_settings_repo.py` | Retain Orchestra | Preserve encryption and user scoping. No Aegra replacement proven. |
| Schedules | Orchestra `schedules` persistence in `backend/src/services/schedule.py` | Retain Orchestra | Aegra scheduling equivalence and pending-job transfer remain unverified. |
| Queues, SSE cache, rate limits | Redis through `backend/src/workers/broker.py`, `backend/src/utils/stream.py`, and settings cache | Undecided | Aegra compatibility does not justify removing Redis. Verify active-job drain and all consumers first. |

## Later cutover sequence

1. Pass a fresh single-database schema and runtime proof without any Aegra role reaching `public`.
2. Define and test field-level mappings, including public assistants, referenced files, history, and error states. Count existing records and test reversibility on a disposable snapshot.
3. Backfill eligible data while Orchestra remains authoritative. Compare record counts, owner IDs, reads, and replay results.
4. Switch one read/write surface only after parity and rollback tests. Keep a known-good source until read-switch validation passes.
5. Retire each old namespace, table, or queue only after the operator approves a separate change and the rollback period ends. Keep Orchestra's users and app-specific state unless the operator approves another tested replacement.
