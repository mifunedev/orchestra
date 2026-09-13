# AGENTS.md

This file provides guidance to AI agents when working with the codebase.

## Project Overview

The root project folder contains the following application:

```yml
backend:
    stack: python, uv, fastapi, langchain, read pyproject.toml for more information.
    description: This is the REST API for the ./frontend and ./cli clients.
    deployment: http://localhost:8000/api
    commands:
        - `make test` Run ALL test cases (uses ENV_FILE=./.env).
        - `make test ENV_FILE=./.env.test` Run tests with test env.
        - `make format` Format project files with ruff. Use after making changes.
        - `make lint` Lint check with ruff (no auto-fix).
        - `make dev` Run dev server.
        - `make seeds.user` Seed default users.
frontend:
    stack: typescript, vite, react, shadcn, tailwind, read package.json for more details.
    description: This is built during CI and bundled into the backend during `.github/build.yml`
    deployment: http://localhost:8000
    commands: See package.json
website:
    stack: typescript, nextjs, shadcn
    description: Our main landing page
    url: https://mifune.dev
    commands: See package.json
docs:
    stack: markdown
    description: User and API documentation for the frontend interface and backend API. Plain markdown in this repo — edit it in the same PR as the change it documents.
    url: https://github.com/mifunedev/orchestra/tree/development/docs
    note: The published site is retired. The Docusaurus app in the separate `mifunedev/wiki` repo keeps its own copy of this markdown. Until that repo is retired, docs changes that must reach the wiki have to be applied there too.
cli:
    stack: typescript, react-ink
    description: New server-side client we are working on for perform actions against the API
    commands: See package.json
```

The main way external AI Agents find out information about Mifune will be from the `./website/public/llm.txt` that should ALWAYS reflect the current public documentation for LLM search engines. If something in the application is out of sync with this file we should make sure to update the file the `llm.txt` so that it reflects the most accurate picture of the application and how users can get the MOST out of it.

## Code Style

- Use Python 3.12+ features
- Follow PEP 8 conventions
- Type hints required for all functions
- Use Pydantic for data validation

---

# Repository Guidelines for Orchestra

## Project Structure & Module Organization
- `backend/src` contains the FastAPI stack, with domain logic split into `controllers`, `routes`, `services`, and `repos`, plus shared helpers in `common` and `utils`.
- Database assets live in `backend/migrations` and `backend/seeds`; reusable automation sits under `backend/scripts`.
- `frontend/src` hosts the Vite/React client (`components`, `pages`, `routes`, `tests`), while `decks/`, `deployment/`, and `infra/` hold reference material and ops tooling.
- `docs/` holds the user and API documentation as plain Markdown, with screenshots under `docs/img/`. See `docs/README.md` for the index. The documentation is published at https://github.com/mifunedev/orchestra/tree/development/docs.

## Build, Test, and Development Commands
- **Setup**: Run `make setup` from the repo root to install pre-commit hooks.
- Backend: `cd backend && uv venv && source .venv/bin/activate && uv sync` installs dependencies, `make dev` runs the API with reload, and `make test` executes the suite. Use `ENV_FILE=./.env.test` for the test environment.
- Frontend: `cd frontend && npm install`, `npm run dev` for local dev, `npm run build` for production bundles, and `npm run docs` regenerates MkDocs API docs.
- Infrastructure: the full stack lives in `infra/docker-compose.yml`; `make dev.docker.up` builds and starts it, `make dev.docker.down` stops it.

## Docker Development Environment
- **When to use**: Backend development requiring all services (app, worker, postgres, redis, search_engine, minio, ollama) running together. The entire stack is one file: `infra/docker-compose.yml`.
- **Start the stack**: `make dev.docker.up` — builds and starts all services in detached mode (`docker compose -f infra/docker-compose.yml up --build -d`).
- **Services and ports**:
  - `app` — :8000 (FastAPI with hot-reload)
  - `worker` — TaskIQ worker (auto-reloads on code changes)
  - `postgres` — :5432 (pgvector/pg16)
  - `redis` — :6379
  - `minio` — :9000/:9001 (S3-compatible storage)
  - `ollama` — :11434 (local LLM inference; requires GPU)
  - `search_engine` — :8080 (SearXNG)
- **Frontend**: Run from the host (`cd frontend && npm run dev`) and connect to the backend API on :8000. Use the `agent-browser` skill for browser-based testing.
- **Management commands**:
  - `make dev.docker.logs` — tail app + worker logs (override with `DOCKER_DEV_LOG_SERVICES="app worker"`)
  - `make dev.docker.ps` — show running containers
  - `make dev.docker.down` — stop and clean up
  - `make dev.docker.migrate` — run Alembic migrations inside the app container
  - `make dev.docker.test.up` — run the stack against the test database (adds `infra/docker-compose.test.yml`)
- **Key details**: Source directories are volume-mounted for hot-reload. The app runs `uv sync` and `alembic upgrade head` on startup automatically. Backend env is loaded from `backend/.env` via the compose `env_file`.

## Coding Style & Naming Conventions
- Run `pre-commit run --all-files`; hooks run backend format/lint/test and frontend prettier/lint/test.
- Python: ruff configured in `backend/pyproject.toml` with `line-length = 120`, select `["E", "F"]`. Per-file E402 ignores for files with `load_dotenv()` before imports. Use 4-space indents, `snake_case` files, typed Pydantic models in `backend/src/schemas`.
- React: Prettier 2-space indent; components in `PascalCase`, hooks in `camelCase`.

## Testing Guidelines
- Place backend unit specs in `backend/tests/unit` and integration cases in `backend/tests/integration`; seed demo data with `python -m seeds.user_seeder` when needed.
- Frontend tests rely on Vitest and Testing Library (`npm run test`, `npm run test:watch`, `npm run test:coverage` for reports).
- Use descriptive filenames (`tests/routes/test_agents.py`, `src/tests/AgentFlow.test.tsx`) and assert observable behavior.

## Commit & Pull Request Guidelines
- Sign every commit with `git commit -s ...`; keep subject lines imperative and reference issues or tickets when helpful.
- Before opening a PR, ensure `uv run pytest`, `npm run test`, and any affected docs or `.env` samples reflect your changes; squash WIP noise locally.
- PRs target `development`, link tracking issues, provide concise change notes, and include screenshots or API traces for UI-facing work.
- Foramt outputs from plan mode in `.claude/plans/[short-plan-desc].md`

## Security & Configuration Tips
- EXTREMELY IMPORTANT: NEVER read a .env* file in your exploration.
