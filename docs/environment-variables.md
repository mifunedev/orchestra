# Environment variables

This is the canonical environment-variable reference for Orchestra. The
tracked template is `.example.env` at the repository root and follows one order:

1. values required by the current API/worker stack are active at the top;
2. code-default tuning, alternate integrations, and test-only values are
   commented in the bottom `OPTIONAL` section.

Copy the template to the project environment file:

```bash
cp .example.env .env
```

For tests, copy it to `.env.test` at the repository root and use
`ENV_FILE=../.env.test make -C backend test`. When the application runs in a container
alongside the services, replace each `localhost` host with the service's container name.

## Required configuration

### Application and database

| Variable | Configuration |
|---|---|
| `APP_ENV` | Current environment name; use `development` locally and `production` in a deployed service. |
| `APP_SECRET_KEY` | Fernet key for encrypted user/provider settings. Generate a URL-safe 32-byte key with `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`. |
| `JWT_SECRET_KEY` | Long random signing key for API tokens. Generate with `openssl rand -hex 32`. |
| `POSTGRES_CONNECTION_STRING` | Required Postgres URL. Local Compose uses `postgresql://admin:test1234@postgres:5432/lg_template_dev`; host-run development can use the `localhost` URL in the template. |

Never use the insecure code fallback for either application secret in a
shared or deployed environment.

### Agent execution

At least one model provider must be configured for agent execution. The
current template keeps the two primary providers active so the requirement is
visible; fill one or both:

| Variable | Configuration |
|---|---|
| `OPENAI_API_KEY` | API key from <https://platform.openai.com/api-keys>. |
| `ANTHROPIC_API_KEY` | API key from <https://console.anthropic.com/settings/keys>. |

### Current tool and service dependencies

| Variable | Configuration |
|---|---|
| `SHELL_EXEC_SERVER_URL` | Shell-execution service origin, normally `http://localhost:3005/exec` for the current local stack. |
| `SEARX_SEARCH_HOST_URL` | SearXNG origin, normally `http://localhost:8080` locally and `http://search_engine:8080` in Compose. |
| `MINIO_HOST` | MinIO endpoint when using the current local storage service; leave blank only when using an HTTPS S3 endpoint. |
| `S3_REGION` | Region used by the storage client. |
| `ACCESS_KEY_ID` | S3/MinIO access key. |
| `ACCESS_SECRET_KEY` | S3/MinIO secret key. |
| `BUCKET` | Current object-storage bucket name. Create it before using upload routes. |
| `REDIS_URL` | Redis URL used by cache, abort, and TaskIQ paths. |
| `DISTRIBUTED_WORKERS` | Current worker-mode flag. Keep it explicit; Compose sets it to `true` for the app/worker pair. |

`README.md` step 4 owns the `docker run` for MinIO and every other service, and names the
credentials and hostnames each one expects. Do not commit real credentials.

### Client

The dev server and the client bundle read these. Vite exposes a variable to the
bundle only when its name starts with `VITE_`, so the backend keys in the same
file never reach the browser.

| Variable | Configuration |
|---|---|
| `VITE_API_URL` | API base the client calls. Keep `/api` for local development; the dev server proxies that prefix to `VITE_PROXY_TARGET`. |
| `VITE_PROXY_TARGET` | Origin the dev-server proxy forwards `/api` to, normally `http://localhost:8000`. Read through `process.env` in `frontend/vite.config.ts`, so only the dotenv-wrapped `npm run dev` scripts see it. |
| `VITE_APP_ENV` | Current environment name reported by the client. |
| `VITE_APP_VERSION` | Version string the client displays. |
| `VITE_ORCHESTRA_LOGO_URL` | Logo the client renders. Override it to brand a self-hosted instance. |

## Optional configuration

These values have safe code defaults or enable an alternate integration. Keep
them commented unless the deployment has an explicit reason to override the
default.

### Defaulted runtime and database tuning

```dotenv
# APP_LOG_LEVEL=INFO
# USER_AGENT=orchestra-dev
# COMPACTION_TOKEN_THRESHOLD=170000
# COMPACTION_RECENT_MESSAGES=6
# POSTGRES_CONNECTION_STRING_SESSION=
# DB_POOL_MIN_SIZE=5
# DB_POOL_MAX_SIZE=20
# DB_POOL_MAX_IDLE_TIME=300
# DB_POOL_MAX_LIFETIME=3600
# DB_SQLA_POOL_SIZE=10
# DB_SQLA_POOL_MAX_OVERFLOW=10
# DB_SQLA_POOL_TIMEOUT=5
# DB_SQLA_POOL_RECYCLE=1800
# DB_KEEPALIVE_IDLE=60
# DB_KEEPALIVE_INTERVAL=15
# DB_KEEPALIVE_COUNT=4
# CHECKPOINT_MAX_RETRIES=3
# CHECKPOINT_RETRY_DELAY=1.0
# CHECKPOINT_MAX_DELAY=30.0
# CHECKPOINT_JITTER=0.1
# CHECKPOINT_HEALTH_CHECK_INTERVAL=30
# CHECKPOINT_USE_RESILIENT=false
# CHECKPOINT_ENABLE_FALLBACK=false
```

### Optional providers and integrations

```dotenv
# GROQ_API_KEY=
# XAI_API_KEY=
# GEMINI_API_KEY=
# GOOGLE_API_KEY=
# OLLAMA_BASE_URL=
# AWS_BEARER_TOKEN_BEDROCK=
# AWS_BEDROCK_REGION=us-east-1
# TAVILY_API_KEY=
# EXA_API_KEY=
# ARCADE_API_KEY=
# LANGCONNECT_SERVER_URL=
# DAYTONA_API_KEY=
# MCP_SANDBOX_API_KEY=
# PRESIDIO_ANALYZE_HOST=http://localhost:5002
# PRESIDIO_ANONYMIZE_HOST=http://localhost:5001
# PRESIDIO_API_KEY=
# AIRTABLE_API_KEY=
# AIRTABLE_BASE_ID=app6sU4AprV9uZze6
# AIRTABLE_TABLE_ID=Contacts
# MICROSOFT_TEAMS_WEBHOOK_URL=
# TEST_USER_ID=00000000-0000-0000-0000-000000000000
```

Search works with the current SearXNG service; add Tavily or Exa only when
needed. Airtable and Teams are best-effort integrations. Storage credentials
are active because the current API exposes storage routes; use the optional
provider values only when switching the backing service.

## Secret handling

Keep real values in the untracked project environment files or the deployment
secret store. Never commit `.env` files, provider keys, database passwords,
MinIO credentials, or application signing keys.
