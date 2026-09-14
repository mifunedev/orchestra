# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: `YYYY.M.D` (date-based, e.g. `2026.2.22`). Multiple releases per day use `-N` suffix (e.g. `2026.2.22-2`).

## Planned

### Added
  - Human-In-The-Loop — agent control.

## 2026.9.14

### Changed
  - task/precommit-determinism — make `pre-commit run --all-files` honest and idempotent. On clean `development` the full run left 15 tracked files modified (493 insertions, 513 deletions) because two formatting hooks rewrote the tree, which is why every contract this session ended in a formatter-drift stash. Both hooks were running unpinned tools. `.pre-commit-config.yaml` ran `npx prettier --write` with no `cd frontend`, and pre-commit runs from the repository root where no `node_modules` exists, so npx fetched **prettier 3.9.6** from the registry instead of the **3.6.2** that `frontend/package.json` pins — the set of files 3.9.6 flags is byte-identical to the set the hook rewrote. `backend/Makefile` ran `uvx ruff format`, and ruff was not a dependency anywhere, so uvx fetched 0.16.7; ruff gained Markdown formatting after 0.15, which is why `backend/tests/README.md` started being rewritten on an untouched checkout (0.14 and 0.15 scan 256 files, 0.16.7 scans 264). The frontend also had no resolvable prettier config: two orphan files, `" .prettierrc.json"` whose name begins with a space and `prettier.json`, neither a name prettier looks for, so every run fell through to built-in defaults plus `.editorconfig`'s `indent_style = tab`. Neither orphan was authoritative — measured over the hook's 369 files they would rewrite 355 and 343 respectively, changing quote style and semicolons, against 13 for the formatting the tree actually has — so both are deleted and replaced by a real `frontend/.prettierrc.json` encoding the committed style, with a `.prettierignore` so the hook cannot sweep build output. ruff is pinned in `backend/pyproject.toml` and `backend/uv.lock` and invoked through `uv run`; prettier is invoked through `npm run format`, which resolves the local binary and fails loudly rather than silently downloading. The tree is reformatted once under both pinned tools so committed state and formatter agree. The `backend-test` hook, which needs both an env file no agent may create and a live test database, moves to `stages: [manual]`: it cannot pass on a developer machine, and a hook that cannot pass must not gate a commit, while the real gate is `.github/workflows/test.yml`. It never exits 0 on a missing file — `backend/scripts/precommit-test-preflight.sh` prints the reason and the remedy and exits 1 — and the remedy points at a new tracked `.example.env.test` naming `orchestra_test`, because copying the development template would aim `make test` at `orchestra_dev` and truncate it. `AGENTS.md` gains the pinning rule, and two new checks in `evals/probes/docs-agents-md-claims.sh` gate both recurrences; each was broken on purpose and fails naming its own claim. Not addressed: no CI job runs either formatter, so nothing outside the local hook enforces formatting.
  - task/root-env-consolidation — collapse the development-path environment onto the repository root. Four consumers read three different paths: `backend/Makefile` defaulted `ENV_FILE` to `./.env`, `infra/docker-compose.yml` loaded `../backend/.env` in both services, `frontend/package.json` loaded `dotenv -e .env`, and the pre-commit test hook ran against `./.env.test`. All four now resolve to the root. Two files survive and stay separate: the development environment and the test environment, which is **not** merged into it because it names a separate database and merging would make `make test` truncate development data. The starting list of consumers was incomplete; the sweep added six more that would have broken silently — `backend/.vscode/launch.json` (six `envFile` entries), the four `evals/probes/resiliency-*.sh` defaults, and the three `examples/agents/*.ipynb` notebooks, which load the env directly through `load_dotenv(Path("../../backend/.env"))` and are executable rather than documentation. `backend/.example.env` moves to the root with `git mv`, so history follows the file, and gains the five client keys the frontend actually reads — `VITE_API_URL`, `VITE_PROXY_TARGET`, `VITE_APP_ENV`, `VITE_APP_VERSION`, `VITE_ORCHESTRA_LOGO_URL` — each set to the default its own reader already applies rather than to an invented value. A shared root file does not leak backend secrets into the client bundle: Vite inlines only `import.meta.env.VITE_*`, and `dotenv -e` populates the Vite *process* environment, which never reaches the browser. `AGENTS.md` non-negotiable 1 named all three old paths, so the claims and the guard that asserts them move in this same commit: six checks in `evals/probes/docs-agents-md-claims.sh` are repointed and none is weakened — each was individually broken and confirmed to fail naming its own claim. The `.gitignore` rule `**/.env*` already covers both survivors, so no ignore entry changes. Existing checkouts need the operator to move their own two env files to the root; no agent reads or moves a file holding live provider keys. Deliberately left: `.github/workflows/build.yml` and `deploy-docker.yml` still pass `--env-file ./backend/.env`, which names a path in a checkout on a deployment host rather than in this tree, and the standalone `.env.docker` recipe in `backend/README.md` and `infra/README.md` describes a third file no executable in this repository reads.

## 2026.9.13

### Changed
  - task/orchestra-pgvector-readme — rewrite `README.md` as a 171-line quickstart that documents a generic pgvector container, and rename the development databases to `orchestra_dev` and `orchestra_test`.

## 2026.8.7

### Fixed
  - fix/957-store-lifecycle — hoist the LangGraph store to a per-process singleton, and remove the `async with <singleton-store>` re-entry that hoisting would otherwise multiply. `get_store_db()` returned an async context manager that built a **fresh** `AsyncPostgresStore` on every call, each with its own psycopg pool of `DB_POOL_MIN_SIZE` (5, max 20) connections that psycopg opens eagerly. Six non-test sites called it: the FastAPI lifespan, `WorkerState`, both APScheduler jobs, and two paths in `workers/tasks.py`. `services/db.py` now owns one store per OS process behind `get_shared_store()`/`close_shared_store()` — an `async def` returning the store rather than a context manager, precisely so no call site can be written as `async with` again — with double-checked locking, no caching of a failed construction, and an explicit close wired into the lifespan and `WorkerState`. **Per-process, not per-app**: correcting the issue's suggested `app.state` sharing, `app.state` is unreachable from the taskiq worker processes and from the module-level pickled scheduler job functions, which have no `Request` in scope. Also correcting the issue's stated acceptance check — measured against the pre-fix code, the connection count does **not** step up across sequential task runs, because each `async with get_store_db()` closes its pool on exit. The real cost is two-shaped: five connections established and torn down on the critical path of *every* task and job, and `5 x C` simultaneous backends at concurrency `C`. `tests/integration/test_store_pool.py` measures the second directly against a live Postgres — three concurrent callers hold 15 backends on the old pattern and 5 on the new one. Folded in, and the reason this is one PR rather than two: `services/assistant.py:227`, `services/assistant.py:294` and `services/prompt/__init__.py:168` already did `async with self.store` on the app-wide singleton handed out by `get_store` — the same defect PR #964 fixed in the health probe, and the three sites that entry explicitly deferred. Hoisting the four factory sites without this cleanup would have converted them into re-entry too, taking 3 latent sites to 7 and spreading them across the worker and scheduler paths. All three now await `asearch` on the injected store directly; `search_public`'s `isinstance(..., InMemoryStore)` guard collapses because both arms became identical, while the two guards whose arms genuinely differ — the 3-attempt `"connection"`/`"closed"` retry, and the public-namespace derivation in `PromptService` — are kept verbatim, along with both sort keys. Still **latent, not an active outage**, on the lock-pinned `langgraph-checkpoint-postgres` 3.1.0: `AsyncPostgresStore.__aenter__` is a bare `return self` and `__aexit__` only stops a TTL sweeper that is never started, because `ttl=` is never configured. One langgraph bump or one `ttl=` makes all of it live at once, which is why `get_store_db`'s docstring now says not to add one. Two pool-kwargs additions come along: TCP keepalives copied from `get_checkpoint_connection_kwargs` (a pool that lived for one call did not need them; a process-lifetime pool behind a pooler does, or hoisting the lifetime just trades a connection leak for a half-open-connection staleness bug), and an `application_name` of `orchestra-store-<pid>` so the `pg_stat_activity` count is attributable per process — consumed by the new tests rather than merely offered. `_RunScopedStore` moves from `workers/tasks.py` to `services/db.py` as `RunScopedStore` and now wraps the shared store at all four migrated sites: six sites assign `store.fields`, and although nothing reads that attribute today (it is not a LangGraph API), sharing one store object across concurrent runs is what would make it matter. Its `fields` are now seeded explicitly instead of from the shared object, which would have let one run inherit another's value. The lifespan additionally shuts the scheduler down **before** closing the store — its jobs consume the same singleton and the distillation job carries `misfire_grace_time=3600`, so one can fire during teardown — and builds the store before `scheduler.start()`, so a restored misfiring job cannot be the first caller. 33 tests across four new files: singleton identity by construction *count* rather than object identity, failed-construction recovery, close/rebuild/idempotence/mock-tolerance, `RunScopedStore` isolation, the lifespan wiring (which nothing previously executed, since `ASGITransport` emits no lifespan events), the live-Postgres pool counts, and the re-entry pins. The re-entry doubles deliberately do **not** subclass `InMemoryStore` — copying `test_health_store.py`'s `RecordingStore` would route into the in-memory arm, never reach the `async with`, and pass against the pre-fix code — and the route test installs its `get_store` override on **both** `app` and `api_app`, because `main.py` splices `*api_app.routes` by reference so an override on `app` alone is inert. All four re-entry tests fail against the pre-fix code on the entry counter itself. An autouse fixture in `tests/conftest.py` resets the singleton around every test; it is synchronous because pytest does not apply async autouse fixtures to the `unittest.IsolatedAsyncioTestCase` classes in `test_distill.py`, which build a fresh event loop per method — without it the first test to construct the store pins its double for the whole session and silently voids four existing `patch("src.services.db.get_store_db", ...)` sites. Left for a follow-up: `ScheduleService.__init__` defaults to `get_store_in_memory()`, so the module-level `schedule_service` holds an `InMemoryStore` — but `self.store` is never read anywhere in the class, so it is a dead field rather than a wrong-backend data path; and `routes/v0/schedule.py` mutates `schedule_service.user_id` per request on that same module-level instance.
  - fix/968-banner-contrast — make destructive colour readable at the palette level. `components/lists/ChatMessages.tsx:293` rendered the run-error banner as `border-destructive/40 bg-destructive/10 text-destructive`, measuring **3.30 / 1.93 / 1.08** (light/dark/gray) against WCAG 1.4.3's 4.5:1 — at `text-sm`, so not large-text exempt, and effectively invisible in `gray`. Two findings widened the issue as filed. First, the tint is barely a factor: `text-destructive` measures **3.76 / 1.99 / 1.05** on plain `--background` too, so there was no "compliant on opaque surfaces" bucket — `--destructive` is a *fill* token, designed to sit behind `--destructive-foreground` on a button, and is not legible as ink anywhere. Second, the border failed as well: `border-destructive/40` measures **1.72 / 1.19 / 1.08** against WCAG 1.4.11's 3:1, so in dark and gray the banner had no perceptible red at all. Rather than redefine `--destructive` (which would move every `variant="destructive"` button and badge), this adds a second token `--destructive-accent` — light `0 74% 42%`, dark `0 91% 71%`, gray `0 100% 92%` — contracted as ink *on* a surface: **6.41 / 7.24 / 5.68** on the background and **5.63 / 7.04 / 5.86** on the `bg-destructive/10` tint, with `border-destructive-accent/70` at **3.82 / 3.98 / 3.69** (`/70` is the first opacity clearing 3:1 against both the page and the tint in all three themes). Inside tinted error containers the container carries the signal, so prose moves to `text-foreground` (**17.47 / 18.53 / 6.14**) and the accent goes on the icon and border, matching the chip shipped in #965; standalone inline field errors, where the red *is* the message, take `text-destructive-accent`. Every opacity modifier was stripped from destructive text — alpha composites toward the surface and always lowers the ratio (`text-destructive/70` measured 2.39 / 1.50 / 1.01). Applied across all 39 non-`-foreground` call sites, led by the two shared primitives `ui/alert.tsx` and `ui/form.tsx`, which fix every `<Alert variant="destructive">` and `<FormMessage/>` consumer at once; `ui/alert.tsx`'s `dark:border-destructive` had to be deleted rather than swapped, since Tailwind emits it at specificity (0,2,0) and it would have silently kept the 1.99:1 border in dark. The replay button keeps `bg-destructive`/`text-destructive-foreground` — the one legitimate fill use in the banner — and gains only the focus ring it never had (**5.29 / 6.77 / 4.39** against its own fill). Two checked-in vitest gates replace the eyeballing that let this survive a year: `destructive-contrast.test.ts` parses the real token values out of `globals.css` and asserts every threshold per theme, and `destructive-usage.test.ts` fails CI on any new `text-`/`border-destructive` that is not `-foreground` or `-accent` — the arithmetic test pins the palette, but #968 was a *usage* bug, so the usage gate is the one that prevents the recurrence. Deliberately left, now tracked with measured numbers: destructive **fills** are untouched, so `--destructive-foreground` on `--destructive` still measures 3.60:1 in light (#969), and gray's `--muted`/`--secondary`/`--accent` (`220 15% 45%`) cannot host any label at 4.5:1 — its own `--accent-foreground` reaches only 4.12 — which is also why gray's accent is a pale pink rather than a red (#970).
  - fix/966-toast-audit — audit the ~101 toast call sites that #965 made live in one change, and stop the four that storm. Highest severity was `hooks/useChat.ts`: `toast.error("MCP sandbox unreachable", { duration: Infinity })` fired per SSE payload with no id and no guard, so three of them permanently occupied every slot under `visibleToasts={3}` and starved the notification surface app-wide — a real outage could silence the very surface you need during the debugging session. It is no longer a toast at all. An unreachable sandbox is a terminal failure of a run the transcript is visibly waiting on, which is exactly what the existing `RunErrorBanner` was built for (the `streamMode === "error"` branch 15 lines above already routes there), and a `setRunError` state write is idempotent by construction — N events collapse to one banner with no id bookkeeping to get wrong later. **Found while implementing it:** the branch was near-unreachable in the first place. The backend emits `mcp_sandbox_unreachable` (`agents/__init__.py:353`) but `convertEventToLegacy` had no case for it and both `parseEvent` switches in `lib/utils/fetchStreamReader.ts` fell through to `default: return null`, so on the unified stream path the event was silently dropped and the run just stopped with no explanation — a worse bug than the one reported. The event is now typed in `lib/entities/stream.ts`, wired through both readers and the legacy converter, and added to both terminal-event sets (`streamSource.ts`'s `hasTerminalEvent` and `clearDistributedRecovery`) — it had been surviving only because the distributed emitter happens to append a trailing `done` that the sync emitter does not, and without that accident the reader would have retried five times and then fallen into the non-recovery `onError` branch, firing a blocking `alert()` and wiping the user's message behind the new banner. `ChatMessages` now imports `RunError` instead of redeclaring its own copy, and the DLQ Replay button — which rendered unconditionally while `recoverable` was declared and never read — is now gated on `recoverable !== false && runId`, because replaying a run that never reached the DLQ dead-ends. Related: `metadata` is captured by closure at `startManagedStream` render time while `run_id` arrives in a later event, so both error branches now read a `metadataRef` and the banner's correlation id is actually populated.
  - fix/966-toast-audit — stop the remaining three storms. `hooks/useChat.ts:319`: a recoveryMode `error` event toasted per event and returned without closing the source; it now aborts the controller, closes the stream, and notifies once per stream behind a closure latch and a stable id — per-stream rather than global, so a genuinely new stream still gets its own notification. The `stream.onError` sibling shares that latch and id; the 404/409 informational toast deliberately does not, since sonner merges by id and would have overwritten the error text with a reassurance. `hooks/useMessageQueue.ts`: the drop-after-max-retries toast reschedules itself every 100ms, so one outage emitted ~30 toasts; drops inside a 5s window now accumulate into one toast under a fixed id ("3 messages dropped after max retries"), and the per-retry warning keeps its copy under a second, deliberately distinct id — "still trying" and "gave up" are different states and must not clobber each other. The per-message query preview is dropped from the plural case, where it can only describe one of N. `pages/memories/edit.tsx` — not in the issue, same class, cheap — was a mount effect that toasted *and* navigated with no id and no guard, giving two of each under `<StrictMode>`; it now has both a ref guard and a stable id.
  - fix/966-toast-audit — fix the retry loop underneath the `context/ChatContext.tsx` save toast. `lastSavedPersistentSignatureRef` was only advanced inside the `try`, so after a failed PATCH the signature stayed dirty and every subsequent keystroke re-fired a failing request and an identical toast, roughly one per 500ms idle window with the backend down. Advancing the ref in the `catch` is the tempting one-liner and is a data-loss bug — that ref is also the dirty indicator and the autosave-skip guard, so advancing it marks unsaved text as saved. Instead, autosave failures now back off exponentially (2s doubling to a 30s cap) and re-arm a real retry at the deadline, because the only other autosave trigger is a signature change: a user who types, sees the failure, and stops typing would otherwise be stranded with unsaved content and no pending timer, and `hasUnsavedPersistentChanges` has no UI consumer to tell them. Manual saves bypass the backoff entirely, so the Save button is always a live escape hatch, and their toast carries no dedupe id — deduping a click response would violate the surrounding policy. The issue's alternative (follow `useScheduleExecutions.ts:40` and decline to toast at all) was rejected: unsaved user text is at stake, so this earns exactly one toast.
  - fix/966-toast-audit — apply one policy, "the hook owns the toast", across the schedules stack, replacing eight double-toast pairs where the hook toasted and rethrew and the component caught and toasted again ("Schedule created successfully" and "Schedule created successfully!" both fired). `pages/schedules/index.tsx`'s delete handler was already correct and is the pattern the other twelve call sites now match. The `try/catch` blocks and their `console.error` stay — `deleteSchedule` rethrows, so removing them would trade a duplicate toast for an unhandled rejection — and the page's bare `await deleteSchedule(...)` gains the catch it was missing. Two related defects surfaced while applying it. `useAgentSchedules.createSchedule`/`updateSchedule` early-returned on a falsy `agentId` before any toast and before any API call, so the panel was reporting success for a write that never happened; they now report the error and throw, which also keeps the dialog open. And a create whose refresh failed emitted 2 success + 1 error simultaneously, leaving the user staring at "created successfully" beside "failed to load" and a list without their new schedule — the rational read is that it failed, and the retry creates a duplicate; post-write refreshes are now silent, so the write reports its own outcome once. Load-failure toasts get stable ids (they fire from mount effects, and there are two live `useSchedules` consumers — the page and the sidebar panel — so an outage stacked one toast each, doubled again under StrictMode); create/update/delete deliberately get none, since they answer a click and must fire every time.
  - fix/958-store-health-reentry — stop `GET /api/info/health/store` from entering the application-wide store as an async context manager. `get_store` returns `req.app.state.store`, the single `AsyncPostgresStore` created once in the lifespan, so the handler's `async with store as s:` ran `__aenter__`/`__aexit__` on a singleton whose lifecycle it does not own — a diagnostic endpoint manipulating the resource it measures. The handler now awaits `store.asearch(...)` on the injected instance directly, inside the same 5s `asyncio.timeout`; the response body, the timeout→503 branch, and the `"connection"`/`"closed"`→503 mapping are all unchanged. Correcting the issue as filed: this was **latent, not an active outage**. On the pinned `langgraph-checkpoint-postgres` 3.1.0, `AsyncPostgresStore.__aenter__` is a bare `return self` and `__aexit__` only stops a TTL sweeper task that is never started (the store-level `ttl=` is never configured, so `_ttl_sweeper_task` is always `None`); the pool is closed solely by `from_conn_string`'s own `async with`, which unwinds at lifespan exit. The reported pool exhaustion therefore does not reproduce today — but a future `ttl=` config, or a langgraph version whose `__aexit__` releases resources, would have degraded the process-wide store silently. The endpoint had **zero tests**, which is how the pattern survived; `backend/tests/integration/test_health_store.py` adds five, covering the happy path, both 503 branches, the 500 fallback, and — the one that pins the fix — a store double that is a perfectly valid context manager and simply *counts* entries, so the pre-fix handler fails on `aenter_calls == 1` rather than on an incidental error. All five fail against the pre-fix handler. Scoped deliberately to the health probe: `services/assistant.py:227,294` and `services/prompt/__init__.py:168` re-enter the same singleton and are left for a follow-up.
  - fix/960-toast-and-model-picker — stop a backend outage from rendering as a silently vanishing model picker. Two independent defects combined to produce it. First, the app could not display an error at all: `sonner` was a dependency and `components/ui/sonner.tsx` exported a `Toaster`, but that component was imported nowhere, so all 101 non-test `toast.*` calls across 25 files were no-ops (the issue says 66; the real count is 101). `<Toaster />` is now mounted once in `main.tsx` under `ThemeProvider`, at `top-center` — every bottom position collides with the bottom-anchored composer, the split-view panel, `AgentMenu`'s mobile sheet, or the query devtools, and below ~600px sonner goes full-width and blankets the composer entirely. Second, `useModel` destructured only `data` and defaulted it to an empty payload, so `ChatInput`'s `{displayModel && ...}` gate collapsed error, empty, and still-loading into one output: nothing. The picker is extracted into `components/inputs/ModelPicker.tsx` and now renders five distinct states — nothing when unauthenticated, a skeleton while loading, an **enabled** retry chip on error (a disabled control would say "not for you" rather than "not right now"), a static `No models available` chip on a zero-model success, and the normal picker otherwise — all at a uniform 24px height so the action row does not reflow. The composer stays fully usable during an outage: `displayModel` is display-only and the server resolves the default, so the textarea and submit button are never disabled.
  - fix/960-toast-and-model-picker — make `ui/sonner.tsx` read the app's own theme. It imported `useTheme` from `next-themes`, but no `NextThemesProvider` is mounted anywhere, so `theme` was always `undefined` and fell back to `"system"` — a user on the default dark UI with a light OS got white toasts. It now reads `ThemeProviderContext` via `@/hooks/useTheme` and maps the app's four-value `Theme` union onto sonner's three, with `"gray"` mapped to `"dark"` (verified against `.gray`'s `--background: 220 15% 35%`, not inferred from the name). Measured in-browser: the toast background now matches the app background exactly in light, gray, and dark. `next-themes` is left in `package.json` for a follow-up.
  - fix/960-toast-and-model-picker — guarantee one toast per outage instead of a stack. New `lib/utils/connectionToast.ts` exposes `notifyConnectionLost`/`notifyConnectionRestored` behind a single fixed sonner id, so N concurrent failures replace in place rather than stacking, and recovery replaces the error rather than sitting contradictorily beside it. It fires from one effect in `useModel`, ref-guarded on the `false → true` transition of `isError` so `<StrictMode>`'s double-invoked effects stay idempotent, and never when unauthenticated. The six mount-time and edit-load failure paths in `useSchedules`, `useAgentSchedules`, `MemorySettings`, `memories/edit`, `schedules/index`, and `AgentSchedulesPanel` route through the same helper *only* when the error carries no HTTP response; anything the server actually answered keeps its specific message, and every user-initiated toast is untouched. Verified in-browser: `/schedules` and `/memories` each show exactly one toast with both their own endpoint and `/llm/models` failing.
  - fix/960-toast-and-model-picker — set `retry: 0` on the models query. `apiClient` already retries once and the global `queryClient` retried again on top, compounding to roughly 40s before `isError` ever flipped — far past the point a user has given up. The global default is unchanged; `retry` resolves per *query* rather than per observer in TanStack Query v5, so `useModelsList`, which shares the `["models"]` key, carries the same override or it would restore `retry: 1` whenever it initiated the fetch. `refetchOnWindowFocus` and `refetchOnReconnect` are enabled on this query so recovery is hands-free.
  - fix/960-toast-and-model-picker — fix two adjacent states that also rendered as nothing. Hiding every model in Settings now still renders the normal picker (user-caused and user-fixable, so it must not look like an outage) with `CommandEmpty` reading `All models are hidden. Turn some on in Settings → Model Visibility.`; a successful load with no default renders the picker labelled `Select model` rather than disappearing. Accessibility: the error chip carries a `WifiOff` icon and distinct text so it never relies on color alone, the picker trigger gains an `aria-label` carrying the current model (its only accessible name was `title="Change default model"`), and a polite live region announces the outage while rendering empty — rather than unmounting — when healthy. The chip's label uses `text-foreground` rather than the run-error `text-destructive`: measured on the composer, the inherited triple scores 1.93:1 (dark), 3.30:1 (light) and 1.08:1 (gray) at 12px, all failing WCAG 4.5:1, while `text-foreground` measures 18.5 / 17.5 / 6.1.
  - fix/960-toast-and-model-picker — add the missing coverage. `ChatInput.tsx` had no tests at all (`ChatComposer.test.tsx` stubbed it out entirely); it now has 13 covering every picker state, keyboard reachability of the retry control, and submission during an outage. `useModel.test.ts` gains its first failure cases, pinning that the toast fires exactly once across re-renders and not at all when unauthenticated, and `ui/sonner.tsx` gains a suite asserting the theme mapping for all four values.

## 2026.8.6

### Changed
  - task/948-consolidate-docs — retire the `wiki` git submodule and consolidate documentation into a plain `docs/` folder. The submodule was never initialized by CI, so every clone left an empty `wiki/` directory that tooling flagged as missing. Vendors the documentation markdown (27 pages) and the 49 screenshots it references into `docs/`, rewriting root-absolute `/img/...` links to page-relative paths so they render on GitHub. Drops the `docs/` entry from `.gitignore` (added by `de842557` in March, when `docs/` was a stale duplicate of `decks/`) so the path can serve as the documentation home. Updates the dangling `README.md` link, the `AGENTS.md` component list, and both issue templates, and adds `docs/**` to `test.yml`'s `paths-ignore` so documentation edits no longer trigger the backend and frontend suites, plus a `workflow_dispatch` trigger so the suite can be re-run manually. Also gates `test-e2e` behind that manual trigger (`if: github.event_name == 'workflow_dispatch'`): at ~8m50s it was the workflow's entire critical path against ~2m for `test-backend` and `test-frontend` combined, while already carrying `continue-on-error: true` — so it cost wall-clock on every push without gating anything. Run it from the Actions tab when a change warrants full-stack coverage. The Docusaurus app stays in `mifunedev/wiki`, so the docs.ruska.ai deploy is unchanged.
  - task/950-config-env-path — move the environment file location from `~/.env/orchestra/` to `~/.config/orchestra/`. The primary backend env is now `~/.config/orchestra/.env` (was `.env.backend`); the test and frontend envs move to the same directory but keep distinct names (`.env.test`, `.env.frontend`) so `make test` and the pre-commit hook keep running against the test database rather than the development one. Updates `backend/Makefile`, `frontend/package.json`, `infra/docker-compose.yml`, `.pre-commit-config.yaml`, `backend/.vscode/launch.json`, the four `evals/probes/resiliency-*.sh`, the example notebooks, and the agent docs. Existing checkouts need `mkdir -p ~/.config/orchestra` and to move their env files across.

### Fixed
  - task/955-db-pool-exhaustion — stop the SQLAlchemy connection pool from exhausting and returning 500 for every authenticated request. `verify_credentials` and the two `get_optional_user*` wrappers took the session as a FastAPI dependency, and dependency teardown runs *after* the path operation function returns — so one pooled connection stayed checked out for the whole request, which for `/llm/invoke` is an entire agent turn and for the SSE path the whole stream. Auth now opens its own short-lived session around the user lookup only. The engine was also created with no pool arguments at all, silently running on SQLAlchemy's defaults (size 5, overflow 10, timeout 30s); it is now configured explicitly via `DB_SQLA_POOL_SIZE`/`DB_SQLA_POOL_MAX_OVERFLOW`/`DB_SQLA_POOL_TIMEOUT`/`DB_SQLA_POOL_RECYCLE` with `pool_pre_ping`. `pool_timeout` drops to 5s deliberately: queueing silently for 30s is what turned one burst into a cascade of 500s. Symptom was an empty model picker — `GET /llm/models` 500s for a signed-in user while the same endpoint returns 200 unauthenticated, because the anonymous path never touches the pool.
  - task/953-consolidate-api-deps — fold the optional `api` extra into the backend's default dependencies so a plain `uv sync` produces a runnable API. `fastapi`, `uvicorn`, `slowapi`, `fastapi-cache2`, `fastmcp`, and `python-multipart` move from `[project.optional-dependencies]` into `[project] dependencies`, and `--extra api` is dropped from all six call sites that passed it (`test.yml` x2, `build.yml`, `backend.Dockerfile`, and both `docker-compose.yml` services). This repairs `.github/actions/backend-install.yml` and `.github/workflows/deploy-vm.yml`, which ran `uv sync --frozen --no-cache --no-dev` without the extra and so started `python main.py` against an install with no web framework in it. No documentation changed — plain `uv sync` is what `README.md`, `AGENTS.md`, `backend/README.md`, and `backend/CLAUDE.md` already documented. Trade-off: `infra/backend.Dockerfile`'s `worker-builder` stage deliberately installed without the extra and ran fine that way, so the worker image grows by the 35 packages the extra pulls in (+28 MB, 771 MB → 799 MB measured `--no-dev`).

  - task/961-reasoning-effort — stop OpenAI reasoning models 500ing on every chat. `openai:gpt-5.6-luna`, the default model, returned `400 Function tools with reasoning_effort are not supported for gpt-5.6-luna in /v1/chat/completions` for every request: `init_graph` passed no reasoning configuration, so `ChatOpenAI` used Chat Completions, and every Orchestra agent binds function tools (deepagents ships todo/filesystem tools). OpenAI reasoning models now route through the Responses API, the only transport that accepts function tools alongside reasoning — forcing `reasoning_effort="none"` instead would have kept the old transport by disabling reasoning on the very models chosen for it. Applied in `init_graph`, so every construction path (sync invoke, SSE stream, distributed worker, scheduled runs) is covered. Non-reasoning models, Anthropic, Gemini, and Bedrock are untouched; `ChatBedrockConverse` sets `extra="forbid"`, so it is excluded by construction.

### Added
  - task/955-db-pool-exhaustion — `GET /api/info/health/db` reports SQLAlchemy pool size, checked-in/checked-out counts, overflow, and configured limits. Pure introspection of the pool object, so it still answers while the pool is exhausted.
  - task/961-reasoning-effort — first-class reasoning-effort support. `POST /llm/invoke` and `POST /llm/stream` accept `reasoning_effort`; `PATCH /settings/default` accepts it as a saved default (request value wins); `GET /llm/models` gains a `reasoning` map of the effort values each model accepts plus `default_reasoning_effort`. Accepted values are read from the models.dev catalogue that already backs the model list rather than hard-coded, because they differ per model (`o3` stops at `high`, `gpt-5.6-luna` reaches `xhigh`/`max`, `gpt-5.2-chat-latest` takes only `medium`). An unsupported effort named explicitly in a request is a `422`; a *saved* default a later model does not accept is dropped rather than rejected, so switching models never breaks existing chats. Efforts are sent only to providers whose LangChain class accepts one (OpenAI, xAI, Groq) — Anthropic and Gemini expose thinking *budgets* instead and are tracked separately. The chat input gains an effort picker beside the model badge, rendered only for models that publish effort values.

## 2026.6.15

### Changed
  - feat/mermaid-zoom-support — add zoom in/out/reset controls to rendered Mermaid diagrams in markdown and Mermaid file previews.

## 2026.6.14

### Fixed
  - fix/940-mermaid-navigation — preserve Mermaid diagram source before rendering so slide diagrams stay visible after navigating between nested slides.
  - task/938-mifune-slide-brand — align the GitHub Pages slide deck and one-page handout with Mifune branding, green-only accents, mifune.dev links, and support@mifune.dev contact details.
  - task/936-pages-workflow-source — deprecate the legacy GitHub Pages branch source in favor of the `slides.yml` GitHub Actions deployment and correct stale deck deployment documentation.

## 2026.6.13

### Changed
  - feat/infra-consolidation — consolidate all Docker/build artifacts into a single `infra/` directory (one `docker-compose.yml` + thin `docker-compose.test.yml`); move `backend/Dockerfile` to `infra/backend.Dockerfile`; drop the dev/storage/services/debug overlays and the `dozzle` service; update Makefile, CI (`build.yml`/`test.yml`), and docs.

### Fixed
  - fix/thread-delete-silent-failure — thread deletion no longer silently fails while returning `204`. `ServiceContext.delete_thread` now deletes the thread record first (the operation the thread list reads from) and treats checkpoint cleanup as best-effort, instead of deleting checkpoints first, aborting the whole delete on any checkpoint failure, and swallowing the exception (`return e`) so the route reported success regardless. Genuine failures now propagate (404/500) instead of a false `204`. Also implements `adelete_thread` on `ResilientAsyncPostgresSaver`, which previously inherited `BaseCheckpointSaver`'s `NotImplementedError` and made every thread delete fail when `CHECKPOINT_USE_RESILIENT=true`.
  - fix/onboarding-tour-persist-on-close — persist onboarding completion when the welcome tour is dismissed via the X button or overlay click (`ACTIONS.CLOSE`), so it no longer re-fires on every login. Previously only Skip/Done persisted; closing hid the tour for the session but left `onboarding_completed` unset.
  - fix/walkthrough-visibility-zindex — make the onboarding walkthrough's highlighted element clearly visible (darker overlay dim + a vivid spotlight ring) in both light and dark themes, and stop the Help/walkthrough button from overlaying the Files drawer by only elevating it above the tour overlay while the tour is running.

## 2026.3.6-2

### Changed
  - feat/840-disable-mcp-server-toggle

### Fixed
  - fix/855-files-map-not-persisted-across-threads (2026-03-11)

## 2026.3.4-2

### Changed
  - feat/838-backend-benchmarks

## 2026.2.23-5

### Changed
  - feat/830-model-visibility-backend
  - feat/821-docs-screenshots

## 2026.2.23-4

### Changed
  - bug/823-schedule-calendar-mobile-overflow

## 2026.2.23-3

### Changed
  - feat/826-dedup-ci-jobs

## 2026.2.23-2

### Changed
  - feat/826-dedup-ci-jobs (2026-02-23)
  - feat-822

## 2026.2.22

### Changed
  - feat/820-exec-server-template-edit-mcp
  - Adopt YYYY.MM.DD-RR versioning scheme

## 0.1.0-rc20

### Changed
  - feat/803-persist-assistant-subagent-selection (2026-02-20)
  - feat/807-docs-update-memories-onboarding-mcp (2026-02-20)
  - feat/787-migrate-memories-seeder (2026-02-18)
  - feat/801-search-threads-tool (2026-02-18)
  - feat/736-rlm-skill (2026-02-05)
  - feat/722-frontend-schedule-refactor (2026-02-01)
  - feat/724-add-watcher-to-worker-reload (2026-02-01)
  - feat/715-ubuntu-execution-env (2026-01-31)
  - feat/442-able-to-edit-memorys (2026-01-31)
  - feat/555-add-compacting-middleware (2026-01-31)
  - feat/665-allow-user-configure-default-account-settings (2026-01-30)
  - feat/707-ticket-md-ralph-loop (2026-01-30)
  - feat/694-show-subagent-tool-calls (2026-01-24)
  - feat/504-frontend-queue (2026-01-20)
  - feat/680-update-readme-out-of-sync (2026-01-16)
  - feat/664-edit-project-information-settings (2026-01-16)
  - feat/675-cleanup-presidio-service (2026-01-16)
  - feat/673-web-scrape-dump-tool-results (2026-01-15)
  - feat/663-auth-user-share-private-thread-link-anon (2026-01-14)
  - feat/666-suport-aws-models (2026-01-14)
  - feat/658-site-title-status (2026-01-13)
  - feat/656-distro-workers-taskiq (2026-01-11)
  - feat/634-web-search-tavily-fallback (2026-01-13)
  - feat/654-inference-dication (2026-01-10)
  - feat/637-user-can-persist-files-to-agent (2026-01-10)

## v0.0.2-rc141

### Changed
  - feat/650-file-treeview-sidebar (2026-01-10)
  - feat/633-public-agents-display (2026-01-08)
  - feat/471-public-agents (2026-01-08)
  - FEAT: Render the todos state from useThread in Session
  - FEAT: Not Required to pass assistant to ruska chat
  - FEAT: CLI Should have Command for getting current version info and heath info
  - FEAT: Truncate Tool Calls. Allow extension (cli) #54

### Fixed
  - bug/612-web-scrape-cannot-fetch-plain-text-pages (2026-01-31)
  - bug/705-fallback-searxng-from-exa (2026-01-29)
  - bug/662-fix-db-timeout (2026-01-19)
  - bug/677-nonetype-items-attributeerror (2026-01-16)

# v0.0.2-rc138

### Changed
  - feat/560-ctrl-click-thread-sidebar (2025-12-30)
  - feat/514-add-context-to-input (2025-12-30)

## v0.0.2-rc135

### Changed
  - feat/622-docs-to-netlify (2025-12-28)

### Fixed

## v0.0.2-rc134

### Changed

### Fixed
  - bug/619-fix-editor-mode-home-pag (2025-12-27)

## v0.0.2-rc133

### Changed
  - Made updates to synchronize the external branding

## v0.0.2-rc132

### Changed
  - feat/614-native-mcp-support-fast-mcp (2025-12-25)

## v0.0.2-rc131

### Changed
  - feat/602-can-add-files (2025-12-22)

## v0.0.2-rc130

### Changed
  - feat/602-can-add-files (2025-12-22)
  - feat/595-tokens-and-secrets (2025-12-21)
  - feat/596-deselect-tools (2025-12-21)
  - feat/589-correlation-matraix (2025-12-20)
  - feat/588-home-page-facelift (2025-12-20)

### Fixed
  - bug/592-chart-render-issue (2025-12-21)

## v0.0.2-rc129

### Changed
  - feat/595-tokens-and-secrets (2025-12-21)
  - feat/596-deselect-tools (2025-12-21)
  - feat/589-correlation-matraix (2025-12-20)
  - feat/588-home-page-facelift (2025-12-20)

## v0.0.2-rc125

### Changed
  - feat/585-user-defaults (2025-12-17)
  - feat/578-api-token-support (2025-12-14)

### Fixed
  - bug/541-gemini-stream-stop-fix (2025-12-19)
  - bug/575-api-docs-not-showing-in-docker (2025-12-14)

## v0.0.2-rc120

### Changed
- feat/572-obfuscate-build-image (2025-12-13)

### Fixed

## v0.0.2-rc118

### Changed

### Fixed
  - bug/570-undefined-agent (2025-12-13)

## v0.0.2-rc117

### Changed
  - feat/446-configure-schedule-via-assistant-id (2025-12-10)
  - feat/513-create-thread-api (2025-12-10)

### Fixed

## v0.0.2-rc116

### Changed
  - feat/513-create-thread-api (2025-12-10)
  - feat/566-langchain-sandbox-dx (2025-12-09)

### Fixed
  - bug/419-schedule-modal (2025-10-12)

## v0.0.2-rc115

### Changed
  - feat/564-create-tool-as-tool (2025-12-09)

### Fixed

## v0.0.2-rc114

### Fixed
  - bug/562-select-model-glitchy (2025-12-08)

## v0.0.2-rc113

### Changed
  - feat/558-dedicated-tools-pages (2025-12-07)

### Fixed

## v0.0.2-rc107

### Changed
  - feat/553-select-models-modal (2025-12-06)
  - feat/550-create-tools-ui (2025-12-06)
  - feat/479-api-as-a-tool (2025-12-05)
  - feat/547-more-stock-tools (2025-12-04)

### Fixed

## v0.0.2-rc104

### Fixed
  - bug/538-fetch-threads-directly (2025-12-02)
  - bug/536-error-search-threads-files (2025-12-01)
  - bug/518-on-new-token-is-broken (2025-11-29)
  - bug/516-fix-google-stop-reason-stream (2025-11-21)
  - bug/505-claude-stream-response (2025-11-19)
  - bug/456-select-tools (2025-11-02)
  - bug/444-anon-achat (2025-10-23)
  - bug/423-fix-checkpointer-conn-closed (2025-10-10)
  - bug/406-day-mode-theme-fix (2025-10-05)
  - bug/400-make-login-suck-less (2025-10-01)
  - bug/379-fail-to-edit-mcp-settings (2025-10-01)
  - bug/389-cannot-unselect-from-mobile-agentmenu (2025-09-30)
  - bug/392-new-chat-buttons-no-auth (2025-09-30)
  - bug/370-anthropic-streaming (2025-09-16)

### Changed
  - feat/545-agent-threads-to-sidebar (2025-12-03)
  - feat/543-relocate-agent-pages (2025-12-03)
  - feat/525-pass-instructions (2025-12-03)
  - feat/530-semantic-search-over-threads (2025-11-30)
  - feat/534-mermaid-diagram (2025-11-30)
  - feat/528-pagination-for-threads (2025-11-30)
  - feat/519-react-window (2025-11-23)
  - feat/507-add-projects-ui (2025-11-20)
  - feat/503-add-bettter-tool-ui (2025-11-20)
  - feat/494-can-render-html-files (2025-11-20)
  - feat/509-search-model (2025-11-20)
  - feat/498-data-model-for-prorject-sources (2025-11-14)
  - feat/501-update-stale-docs-with-placeholder (2025-11-16)
  - feat/420-project-endpoints (2025-10-28)
  - feat/464-update-input-support-multiple-keys (2025-11-11)
  - feat/490-can-read-deepagents-agent-files (2025-11-10)
  - feat/485-user-env (2025-11-08)
  - feat/482-teams-webhook (2025-11-05)
  - feat/476-html-chart-construct-tool (2025-11-02)
  - feat/468-support-ms-presidio-analyzer (2025-11-02)
  - feat/465-update-sidebar (2025-10-31)
  - feat/457-checkpoint-stream (2025-10-26)
  - feat/448-tokens-per-sec (2025-10-24)
  - feat/442-edit-memories (2025-10-22)
  - feat/431-assistant-id-optimize (2025-10-15)
  - feat/429-prompt-endpoints (2025-10-12)
  - feat/425-editor-for-system-message (2025-10-10)
  - feat/415-schedules-page (2025-10-08)
  - feat/411-tools-api (2025-10-05)
  - feat/408-edit-existing-schedules (2025-10-05)
  - feat/216-shot-at-scheduled-tasks (2025-10-02)
  - feat/382-move-threadid-gen-to-backend (2025-10-01)
  - feat/380-subagent-configure (2025-09-29)
  - feat/387-ip-rate-limit (2025-09-28)
  - feat/381-delete-agent (2025-09-28)
  - feat/375-interface-for-agent-config (2025-09-24)
  - feat/375-readd-mcp-a2a (2025-09-20)
  - feat/372-query-params (2025-09-19)
  - feat/361-separate-user-threads (2025-09-16)
  - feat/367-checkpointing (2025-09-15)
  - feat/359-pre-commit-hooks (2025-09-07)
  - feat/357-graph-selection (2025-09-02)

## v0.0.1

### Fixed
  - bug/314-async-session-no-attr (2025-05-17)
  - bug/311-multiserver-mcp-client-context (2025-05-17)
  - bug/307-db-call-cause-cpu-leak (2025-05-16)
  - bug/294-mem-lead-from-mcp (2025-05-13)
  - bug/280-session-tool-card-decouple (2025-05-04)
  - bug/276-resolve-json-parsing-on-tools-message (2025-05-01)
  - bug/254-subsequent-messages-work (2025-04-21)
  - bug/227-streaming-output-for-anthropic-fix (2025-04-02)
  - bug/215-async-db-timeout (2025-03-25)
  - bug/204-async-db-timeout (2025-03-20)
  - bugfix/168-remove-system-message-metadata-redundancy (2025-03-04)
  - bugfix/106-resolve-break-on-mobile (2025-02-25)
  - bugfix/111-resolves-break-on-mobile (2025-02-25)
  - bugfix/137-migrations-auto-up (2025-02-07)
  - bugfix/131-action-log-overflow (2025-02-04)
  - bugfix/128-fix-remote-container-exec (2025-02-03)
  - bugfix/109-open-sidebar-mobile (2025-01-17)
  - bugfix/105-fix-chat-selection (2025-01-12)
  - bugfix/104-model-select-stopped-working (2025-01-12)
  - bugfix/85-static-users-failing-to-parse-json-env (2025-01-10)
  - bugfix/72-default-vite-api-url (2024-12-25)
  - bugfix/68-close-stream-client-properly (2024-12-24)
  - bugfix/65-can-refresh-from-sub-route (2024-12-22)
  - bugfix/28-cannot-auth-tools-list (2024-11-30)

### Changed 
  - feat/332-add-memories (2025-06-15)
  - feat/290-api-as-a-tool-v2 (2025-06-08)
  - feat/327-agent-select-from-chatinput (2025-06-06)
  - feat/322-add-react-voice-viz (2025-05-29)
  - feat/321-knowledge-source-page (2025-05-25)
  - feat/319-integrate-langconnect (2025-05-24)
  - feat/316-select-arcade-tools-from-ui (2025-05-20)
  - feat/303-audio-recorder-on-chat-page (2025-05-14)
  - feat/308-arcade-dev-tools (2025-05-14)
  - feat/295-speech-to-text (2025-05-12)
  - feat/296-update-available-models (2025-05-11)
  - feat/288-add-contact-create-to-oauth (2025-05-05)
  - feat/287-limit-input-buttons (2025-05-04)
  - feat/281-public-server-display-on-landing (2025-05-03)
  - feat/270-create-server-from-dash (2025-04-26)
  - feat/268-react-flow-test-run (2025-04-26)
  - feat/264-auth-user-home-page (2025-04-26)
  - feat/265-mcp-server-docs-page (2025-04-25)
  - feat/247-public-ensos-shareable (2025-04-25)
  - feat/258-user-can-create-server-config (2025-04-22)
  - feat/256-servers-table (2025-04-21)
  - feat/250-update-docs (2025-04-20)
  - feat/248-update-readme-dev-steps (2025-04-19)
  - feat/245-add-a2a-logic (2025-04-14)
  - feat/241-better-ui-for-tool-select (2025-04-13)
  - feat/238-public-use-page (2025-04-11)
  - feat/231-collect-register-event-to-slack (2025-04-04)
  - feat/225-simplify-chat-state-to-reducer (2025-03-31)
  - feat/219-persist-mcp-to-settings (2025-03-27)
  - feat/213-updates-to-create-agent-page (2025-03-23)
  - feat/210-create-agent-page (2025-03-21)
  - feat/171-able-to-update-system-message (2025-03-20)
  - feat/182-mcp-tool-adapter (2025-03-13)
  - feat/196-add-init-chat-model (2025-03-15)
  - feat/189-fix-settings-db-table (2025-03-14)
  - feat/173-test-a-tool-call (2025-03-04)
  - feat/165-oauth-init (2025-03-01)
  - feat/153-clear-chat-inputs (2025-02-27)
  - feature/61-make-pwa (2025-02-25)
  - feature/151-add-settings-table (2025-02-23)
  - feature/148-add-storage-endpoints (2025-02-18)
  - feature/145-update-settings-to-remote-dropdown (2025-02-17)
  - feature/76-user-can-configure-their-own-keys (2025-02-13)
  - feature/132-autosize-textarea (2025-02-11)
  - feature/139-individual-user-accounts (2025-02-09)
  - feature/135-google-llm-provider (2025-02-07)
  - feature/130-edit-system-message (2025-02-04)
  - feature/125-add-03-mini (2025-02-02)
  - feature/120-popout-drawer-action-log (2025-01-29)
  - feature/114-add-chat-ollama (2025-01-22)
  - feature/115-remove-shell-local-from-demo (2025-01-21)
  - feature/112-can-select-tools-from-app (2025-01-20)
  - feature/102-frontend-build-cd (2025-01-11)
  - feature/99-fix-vite-api-url-append (2025-01-05)
  - feature/93-open-drawer-on-mobile (2024-12-30)
  - feature/95-fix-docker-build (2025-01-01)
  - feature/86-model-select-in-react-app (2024-12-28)
  - feature/83-add-endpoint-to-display-models (2024-12-27)
  - feature/52-ability-to-switch-llms (2024-12-27)
  - feature/70-basic-auth-json-defined-users (2024-12-26)
  - feature/70-add-shad-cn (2024-12-25)
  - feature/62-clean-up-message-formatting (2024-12-21)
  - feature/50-add-mkdocs-site (2024-12-09)
  - feature/48-sql-agent (2024-12-07)
  - feature/46-create-docs-from-data-sources (2024-12-07)
  - feature/44-indexing-vectors (2024-12-06)
  - feature/23-multimodal-query (2024-12-05)
  - feature/35-switch-pip-for-uv (2024-12-01)
  - feature/33-deploy-app-using-terraform (2024-12-01)
  - feature/30-tf-do-deployment (2024-11-30)
  - feature/25-add-basic-auth (2024-11-29)
  - feature/19-deploy-to-dev (2024-11-28)
  - feature/17-ci-push-to-registry (2024-11-28)
  - development
