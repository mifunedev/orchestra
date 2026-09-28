# Aegra v1 migration browser review

## US-002: pre-creation engine selection

- Date: 2026-09-28. Branch: `feat/1021-aegra-v1-migration` at `f53fc2a46d70e9f7e7c59cafcf43a4f4b5e6cbcf`.
- The isolated frontend served port `5174`. Its temporary Vite config sent `/api/v1` to the task Aegra service on `2027` and `/api` to the existing legacy backend on `8000`.
- The task Aegra service used only database `aegra_v1_review_5160189ff5fc8c8e3c678b35499fdc97` in the existing `postgres` container. Its receipt is `/tmp/orchestra-aegra-v1-review.json`. The reviewer kept the service and database until the US-003 reload review finished.
- Preflight: `agent-browser 0.8.5` opened `about:blank` and returned a snapshot. The browser opened `http://127.0.0.1:5174/chat` in isolated session `v1-review`. The reviewer transferred an existing local account login between isolated browser origins without printing its token.
- Proxy checks: `POST http://127.0.0.1:5174/api/v1/threads` without a token returned `401`. `GET http://127.0.0.1:5174/api/auth/user` without a token returned `401`. The operator app on `5173`, legacy backend on `8000`, and prior Aegra service on `2026` stayed online.
- Supported journey: A new text chat requested `math_calculator` for `9 * 9`. Aegra created thread `060a0794-9b06-4f61-803a-d3bab4a67528`. The browser showed the tool call and result `9 * 9 = 81`, plus a streamed reply. The second turn recalled the same result. The Aegra service logged a `200` stream on the same thread. See [v1 tool and second turn](us002-v1-tool.png).
- Unsupported journey: A new chat attached a valid 32×32 red PNG through the UI upload control. The browser loaded its preview and displayed `image_1 0.10kB`. Legacy v0 created thread `9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa` and answered `Red.` The text-only second turn stayed at `/thread/9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa` and answered `Red`. See [v0 image and reply](us002-v0-image.png).
- Ownership probe: The authorized account received `200` for v1 state at `/api/v1/threads/060a0794-9b06-4f61-803a-d3bab4a67528/state` and `404` for that identifier on the legacy `/api/threads` route. The same account received `200` for `/api/threads/9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa` and `404` for that identifier at the v1 state route.
- One invalid 1×1 PNG caused a legacy model error before the valid-image run. The reviewer removed only its task-created legacy thread `84641b57-0b14-4cbd-b137-a4147d70ce92` through the authenticated `/api/threads/{id}` delete route; the route returned `204`.
- At the US-002 checkpoint, the v1 thread did not appear in the sidebar and its URL remained `/chat`. US-003 adds durable discovery. The first legacy review thread contains duplicate first-turn messages after a browser command timed out. A controlled single-click review later created exactly one human and one assistant record. Treat the earlier duplication as test-interaction ambiguity, not a verified product defect. The reviewer kept both successful review threads until the final review was complete.

## US-003: server-owned recovery after reload

- Branch: `feat/1021-aegra-v1-migration` at `6fb1645f`. Independent integrated frontend verification: 60 test files passed, 591 tests passed, 3 skipped; the build exited 0.
- A fresh `agent-browser` session at `http://127.0.0.1:5174/chat` held only the authorized browser login. It had no `aegra-thread:*` local ownership flags. Both task-created threads appeared in the sidebar from their respective servers.
- The browser opened native thread `060a0794-9b06-4f61-803a-d3bab4a67528` at `/thread/{id}`. It restored the `math_calculator` call, result `9 * 9 = 81`, and the second turn. The browser found no legacy checkpoint error. See [v1 recovered history](us003-v1-reloaded.png).
- The browser opened legacy thread `9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa` at `/thread/{id}` and restored its image-color exchange. See [v0 recovered history](us003-v0-reloaded.png).
- After switching from v0 to v1 in the same browser page, an XMLHttpRequest trace recorded zero legacy `/api/threads/search` requests for the v1 thread identifier. Native search and state provided v1 ownership.
- A direct authorized legacy `GET /api/threads/9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa` returned `200` with a matching `thread.id`. A `POST /api/threads/search` with `filter.thread_id` returns `checkpoints`, not `threads`; US-003 uses the direct GET for legacy ownership instead.
- A controlled new legacy image chat returned `Blue` from one submit click. Authorized `GET /api/threads/52c371b1-f262-4768-a4ce-64b37321953d` returned two records: one human and one assistant. The reviewer removed only this task-created diagnostic thread through the authorized delete route; it returned `204`.
- The independent integrated `bash backend/scripts/test-aegra-chat-stream.sh` runner passed all 3 tests, including owner-only native search. It reported `TEST_EXIT 0` and `RUN_EXIT 0`. The runner dropped `us001_aegra_fd0d8848708142988e2cc8697fe10f93` and verified its absence. An independent `pg_database` query confirmed the test database was absent and the task review database remained. The reviewer kept the review services and database through US-004.

## US-004: final evidence and cleanup

The operator approved task-owned disposable databases in the existing `postgres` container. The review used no existing database for Aegra storage. The legacy browser journey created only its own chat threads through the public API.

Redacted verification commands:

```sh
agent-browser --session v1-final open http://127.0.0.1:5174/thread/<task-v1-thread>
agent-browser --session v1-final open http://127.0.0.1:5174/thread/<task-v0-thread>
AGENT_BROWSER_SESSION=v1-final bash .agro/skills/agent-browser/scripts/annotate-screenshot.sh <absolute-evidence-path> '<selector>=<label>'
curl -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:5174/api/v1/threads
docker exec postgres psql -XAt -U "$POSTGRES_USER" -d postgres -c 'SELECT datname FROM pg_database WHERE datname = <task-owned-name>'
```

- The unauthenticated v1 create returned `401`. Authorized native search returned `200` and found exactly one task-created v1 thread before cleanup. The native stream returned `200` for the calculator run. The authorized legacy read returned `200` for the task-created v0 thread before cleanup.
- [Annotated v1 browser review](us004-v1-annotated.png): Callouts: 1 is server-owned v1 thread. 2 is authorized Orchestra tool. 3 is persisted tool result. The screenshot also shows the second turn and streamed answer.
- [Annotated v0 browser review](us004-v0-annotated.png): Callouts: 1 is server-owned v0 thread. 2 is answer to attached image. The initial upload preview and valid 32×32 red PNG were observed before the v0 run.
- A fresh browser origin held the authorization token but no `aegra-thread:*` keys. Both sidebar entries and direct `/thread/{id}` loads restored server-owned state. The v1 route made zero legacy checkpoint-search calls in a browser XHR trace.
- The reviewer deleted only task-created legacy threads `84641b57-0b14-4cbd-b137-a4147d70ce92`, `52c371b1-f262-4768-a4ce-64b37321953d`, and `9b729cd8-8fe0-4259-b8c7-cb116cc0c6fa`. Each delete returned `204`. Follow-up authorized GET requests returned `404` for all three. No pre-existing legacy thread was deleted.
- The reviewer closed the `v1-final` browser session and stopped only tmux sessions `orchestra-aegra-v1-frontend` and `orchestra-aegra-v1-review`. Review ports `5174` and `2027` stopped accepting connections (`000`). The existing app (`5173`: `200`), backend (`8000`: `200`), and operator Aegra (`2026`: unauthenticated `401`) stayed online.
- The reviewer dropped only `aegra_v1_review_5160189ff5fc8c8e3c678b35499fdc97` after stopping its service. An independent `pg_database` query returned `0` matches. Receipt `/tmp/orchestra-aegra-v1-review.json` records `closed` and `database_absent_verified` as true.
