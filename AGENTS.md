# Orchestra

You are a coding agent working in the Orchestra repository. You own application
code: the FastAPI backend, the React client, the documentation, the compose
stack, and the probes that prove the behavior.

`CLAUDE.md` is a provider-compatibility symlink to this file. Edit `AGENTS.md`.
Never replace the symlink with a regular file, and never write a second copy of
these instructions.

This file states policy and names owners. It does not transcribe. A command, a
port, an image pin, a directory listing, or a test filename belongs to the file
that executes it. Where you want to copy such a fact, name its owner instead.

## What Orchestra is

Orchestra is an open-source AI agent orchestration platform built on LangGraph.
A user creates an assistant, gives it tools, and talks to it in a thread. The
platform persists the conversation, runs long work on background workers, and
exposes the same surface through a REST API.

The stack is one Python FastAPI application under uvicorn, Alembic migrations
over PostgreSQL with the pgvector extension, TaskIQ workers over Redis, and a
React and Vite client. MinIO or S3 stores files. MCP and A2A connect external
tools and agents. Nothing in that sentence is a version or a pin; read
`backend/pyproject.toml` and `frontend/package.json` for those.

Orchestra is self-hosted. This project deploys nothing and hosts no domain.
Every address in this repository is a local address a self-hoster reaches after
starting the API. The API and its Swagger UI are at `http://localhost:8000/api`.

The following properties are non-negotiable.

### 1. Never read a `.env*` file

Do not read, print, copy, or diff the repository-root `.env`, the repository-root
`.env.test`, or any other `.env*` path, in exploration or in a fix. These
files hold live provider keys and database credentials. `.gitignore` excludes
`**/.env*` from git, so reading one copies a secret into a transcript that git
cannot protect.

Read `.example.env` at the repository root for the key names and
`docs/environment-variables.md` for every default. Both are tracked and safe.
When a value must change, tell the operator which key to set. Do not set it.

One location holds the development environment. The backend `make` targets
default to the root `.env`; `backend/Makefile` owns that default. The pre-commit
test hook runs the suite against the root `.env.test`; `.pre-commit-config.yaml`
owns that. The frontend dev server loads the root `.env`;
`frontend/package.json` owns that. The test environment stays a separate file
because it names a separate database.

### 2. `AGENTS.md` is the canonical instruction file

This file is the canonical instruction surface at the repository root. Write
guidance here. A second copy drifts, and the copy an agent happens to read wins.

`backend/CLAUDE.md` and `frontend/CLAUDE.md` are real files with no `AGENTS.md`
sibling, so only Claude-family harnesses load them. Treat them as component
notes, not as policy. Anything that must bind every agent belongs in this file.
`decks/` carries its own tracked `AGENTS.md` for the slide deck.

### 3. Generated output is not source

`frontend/vite.config.ts` builds the client into `backend/src/public` with
`emptyOutDir` set, and `.gitignore` excludes that directory. The next frontend
build erases anything written there. Change the frontend source.

The same rule covers Alembic migration state, `backend/uv.lock`, and
`frontend/package-lock.json`. Change the input, then regenerate.

### 4. The backend has no enforced layer order

`backend/src` splits into `routes`, `controllers`, `services`, and `repos`, but
no gate enforces a direction between them. Routes import `src.services` far more
often than `src.controllers`, and import `src.repos` directly. Follow the
convention of the module you are editing. Do not impose a layer order as a
drive-by change, and do not write guidance that claims one exists.

Shared helpers live in `backend/src/common` and `backend/src/utils`. Typed
request and response models live in `backend/src/schemas`.

### 5. Every commit is signed off, and every pull request targets `development`

`development` is the default branch of `origin`. Sign every commit with
`git commit -s` under the [DCO](DCO). This is a project requirement. Do not
describe how, or whether, it is enforced.

## Who owns what

One agent owns one change end to end: the backend, the client, the
documentation, and the check that proves it. Orchestra has no delegation
machinery and no control plane. The boundary that matters is the
generated-output boundary in non-negotiable 3, not an execution location.

Documentation is owned by the change that alters behavior. `docs/` is plain
Markdown and is the source of truth; `docs/README.md` is its index, and there is
no published site to keep in step with it. Edit the page in the same pull
request as the code. The tree is browsable at
<https://github.com/mifunedev/orchestra/tree/development/docs>.

Derivable facts are owned by executable files, not by this one:

| Fact | Owner |
|---|---|
| Setup, prerequisites, connection strings | `README.md` |
| Backend commands and the `ENV_FILE` default | `backend/Makefile` |
| Frontend scripts and dependencies | `frontend/package.json` |
| Client build output and dev-server configuration | `frontend/vite.config.ts` |
| API mount points and the Swagger path | `backend/main.py` |
| The published image and its two build targets | `infra/backend.Dockerfile` |
| The check set that must pass locally | `.pre-commit-config.yaml` |
| The check set that must pass on push | `.github/workflows/` |
| Probe discovery and the exit-code oracle | `evals/run.sh`, `evals/README.md` |
| Ignored paths | `.gitignore` |

## A note from the maintainer

Prefer ambitious outcomes and simple systems. Do not preserve complexity because
it already exists. Do not add machinery because the architecture looks
impressive. Find the real constraint, then choose the smallest model that makes
correct behavior unsurprising. Apply YAGNI. Resist scope creep. Preserve the
operator's intent in the smallest realistic change.

Widen a fix to the class of defect, not to the next feature. When a bug is one
instance of a pattern, fix every live instance and add the gate that fails on
the next one. Leave the adjacent bug filed rather than folded in.

The non-negotiables in this file are hard constraints. Other guidance is a
default. An explicit operator instruction can override a default. It can never
authorize reading a secret or committing a generated artifact as source.

## A small glossary

- **you** means the coding agent reading this file.
- **operator** means the person who owns this checkout and directs the work.
- **self-hoster** means the user who runs Orchestra on their own machine. Every
  address in the documentation is written for them.
- **assistant** means a saved agent configuration: instructions, model, tools,
  and skills.
- **thread** means one stateful conversation. Every interaction happens in a
  thread.
- **skill** means a reusable Markdown instruction set attached to an agent.
- **prompt** means a versioned, reusable system prompt in the Prompt Library.
- **memory** means a persistent per-user context snippet injected into every
  conversation.
- **project** means a workspace that groups threads and files. **epic** groups
  tasks.
- **public agent** means an assistant published for anyone to try and remix.
- **tool** means a callable the agent may invoke, native or reached over **MCP**
  or **A2A**.
- **store** means the single `AsyncPostgresStore` that backs long-term memory. It
  is a process-wide singleton reached through `get_shared_store()` in
  `backend/src/services/db.py`.
- **checkpoint** means LangGraph's persisted graph state for a thread.
- **worker** means a TaskIQ process that runs work off the request path.
- **probe** means a deterministic exit-code-scored check under `evals/probes/`.
  `evals/run.sh` discovers every probe and scores it `0` PASS, `1` REGRESSION,
  `2` SKIPPED.

## Ways to hurt yourself

Each entry is a defect this repository already shipped. This is the part of the
file you cannot derive from the tree.

- **Do not `async with` a shared store singleton.** `get_shared_store()` in
  `backend/src/services/db.py` hands back a process-wide instance, used by
  `backend/src/workers/state.py` and `backend/src/services/schedule.py`.
  Entering it runs `__aenter__` and `__aexit__` on a resource the caller does
  not own. Await the method on the injected instance. (#958, #964, #975.)
- **Do not open a connection pool per call.** The store was built fresh on every
  call site, each eagerly opening its minimum pool size. One resource per
  process, created at lifespan, closed at shutdown. (#975.)
- **Do not assume one shape for message content.** The streaming path flattens a
  chunk to a string; the hydration path leaves the raw LangChain block array.
  Reading `content[0].text` rendered "Invalid message" for every reasoning
  model. Join every text block and always return a string. (#963.)
- **Do not fire a background toast without a stable id.** An un-ided
  `duration: Infinity` toast permanently occupied a visible slot and starved
  every later notification app-wide. A hook owns its toast, keyed by a fixed id.
  A user-initiated toast may go un-ided. (#972.)
- **Do not use a fill token as ink.** `--destructive` is a fill that sits behind
  `--destructive-foreground`. Used as text it fails contrast. Use
  `--destructive-accent`. `frontend/src/tests/styles/destructive-usage.test.ts`
  now fails on a new bare `text-destructive`, because the usage is what recurs.
  (#968, #973.)
- **Do not reintroduce a deployment domain.** Orchestra is not deployed by this
  project and hosts no domain. The retired hosts were replaced with
  `http://localhost:8000`. Sample MCP and A2A servers Orchestra connects to and
  does not host are the only external hostnames in this repository, and they
  live in fixtures and examples, not here. (#985.)
- **Do not trust a command because a Markdown file names it.** This file once
  told agents to run a frontend script whose target was deleted in `26d646fa`
  (#623), and kept naming it afterwards. Run the command, or read the file that
  defines it, before you write it down.

## Think through every affected surface

Before implementation, mark each surface **applied** or **not applicable**. Do
not silently skip a surface.

- **Backend:** Which module owns the change? Does it need an Alembic migration
  in `backend/migrations` and a matching downgrade?
- **Frontend:** Do the streaming path and the hydration path both carry it? Does
  it survive a StrictMode double-render?
- **Worker and scheduler:** Does the code run outside a request, where
  `app.state` is unreachable?
- **Contract:** Does a schema in `backend/src/schemas` change, and does the
  client type change with it?
- **Docs:** Does user-facing behavior change a page under `docs/`? Edit it in
  this pull request. Screenshots live under `docs/img/`.
- **Environment:** Does a new key belong in `.example.env` and
  `docs/environment-variables.md`? Never in a `.env*` file.
- **Infra:** Does the change depend on a new service container? `README.md` owns
  the `docker run` for every one of them. Does `infra/backend.Dockerfile` need a
  new build input?
- **Verification:** Which test under `backend/tests/unit`,
  `backend/tests/integration`, or `frontend/src/tests`, or which probe under
  `evals/probes/`, fails before the fix and passes after it?

## How to work in this repository

Read `README.md` for setup. It owns the prerequisites, the database, the
connection strings, and the first run. Do not restate it here and do not run a
setup step from memory.

There is one way to run the stack. PostgreSQL and every other service run in
their own containers, and the application runs on the host. `README.md` owns
that path end to end: the `docker run` for each service, the connection strings,
and the environment keys each service feeds. Do not add a second path.

Before a pull request:

- Run the backend and frontend checks from their own directories. `backend/`
  and `frontend/` each own their targets and scripts; run them from there, never
  from the repository root.
- Pin every formatter and linter in the file that owns its dependencies, and
  invoke it through that pin. `uvx` and `npx` resolve the newest release at run
  time, so an unpinned tool silently rewrites the tree the day it ships a
  version.
- `pre-commit run --all-files` must pass. `.pre-commit-config.yaml` is the
  authority on what that set is.
- Add a changelog entry for the branch. The root `Makefile` owns the target.
- `bash evals/run.sh` scores the probe corpus and rewrites `evals/RESULTS.md`.

Write plans and task state inside this repository, never in the parent
directory. `.gitignore` excludes `**/.claude/` and `tasks/`, so neither enters
git history.

## How the system fits together

Tests and deterministic probes verify behavior against real state. Read the
nearest directory `README.md` before changing unfamiliar machinery.

- `backend/` holds the FastAPI application. `src/` holds the modules,
  `migrations/` holds Alembic revisions, `seeds/` holds seed data, `scripts/`
  holds automation, and `tests/` holds the suites, including
  `backend/tests/unit` and `backend/tests/integration`.
- `frontend/` holds the Vite and React client. Its tests live in
  `frontend/src/tests`. It builds into `backend/src/public`.
- `docs/` holds the user and API documentation as plain Markdown, indexed by
  `docs/README.md`, with images under `docs/img/`.
- `infra/` holds the backend image definition and per-service configuration.
- `evals/` holds the probe corpus, the runner `evals/run.sh`, the contract
  `evals/README.md`, and the `RESULTS.md` scoreboard.
- `examples/` and `decks/` hold notebooks and the slide deck.
- `.github/workflows/` holds the checks that run on push and on tag, plus the
  deployment workflows, which only a manual dispatch starts.

## Taste

- Fix the class, gate the recurrence, file the neighbor.
- Prefer one owned resource over a fresh one per call site.
- Make the data shape explicit at the boundary where two paths meet.
- Name the file that owns a fact instead of copying the fact.
- Delete a retired path instead of renaming it to something unreachable.
- Use tests and probes as evidence, not a description of intent.

## How a claim enters this file

Every factual claim above is asserted by `evals/probes/docs-agents-md-claims.sh`
against the repository. The probe fails when the code moves and this file stands
still, which is the direction drift actually travels.

Add a claim only together with its check in that probe. A claim you cannot check
is deleted, not softened.
