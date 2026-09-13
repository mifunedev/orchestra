<div align="center">

# Mifune - Orchestra 🪶

Docker deployment guide for the Orchestra backend.

<a href="https://discord.com/invite/QRfjg4YNzU"><img src="https://img.shields.io/badge/Join-Discord-purple"></a>
<a href="https://github.com/mifunedev/orchestra/tree/development/docs"><img src="https://img.shields.io/badge/View-API Docs-blue"></a>
<a href="https://mifune.dev/socials"><img src="https://img.shields.io/badge/Follow-Social-black"></a>
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../LICENSE)
[![DCO](https://img.shields.io/badge/DCO-1.1-yellow)](../DCO)

<img src="https://github.com/ryaneggz/static/blob/main/enso/landing-page-light.gif?raw=true">

</div>

This guide covers deploying the Orchestra backend using Docker. For local development, see the project root docs in `../README.md`.

## Dockerized Development

The entire stack lives in a single compose file, `infra/docker-compose.yml`. For
hot-reload local development, bring it up from the project root:

```bash
cd ..
make dev.docker.up        # docker compose -f infra/docker-compose.yml up --build -d
```

This starts (all from the one file):

-   `app` — FastAPI backend with reload on `http://localhost:8000`
-   `worker` — TaskIQ worker (auto-reloads on code changes)
-   `postgres` (pgvector) :5432, `redis` :6379
-   `minio` :9000/:9001, `ollama` :11434, `search_engine` (SearXNG) :8080

Useful commands:

```bash
make dev.docker.logs       # tail app + worker (override DOCKER_DEV_LOG_SERVICES)
make dev.docker.ps
make dev.docker.down
make dev.docker.test.up    # default + infra/docker-compose.test.yml (test database)
```

## 📖 Table of Contents

-   [📋 Prerequisites](#-prerequisites)
-   [🚀 Quick Start](#-quick-start)
-   [🧩 Docker Compose Services](#-docker-compose-services)
-   [🧱 Docker Compose Example](#-docker-compose-example)
-   [🏗️ Build Commands](#-build-commands)
-   [⚙️ Environment Variables](#-environment-variables)
-   [🗄️ Database Migrations](#-database-migrations)
-   [🚢 Production Considerations](#-production-considerations)
-   [🧰 Troubleshooting](#-troubleshooting)

## 📋 Prerequisites

-   [Docker](https://docs.docker.com/engine/install/) installed
-   [Docker Compose](https://docs.docker.com/compose/install/) installed
-   Access to AI provider API keys (OpenAI, Anthropic, etc.)

## 🚀 Quick Start

### Using Pre-built Image

Pull the latest image from GitHub Container Registry:

```bash
docker pull ghcr.io/mifunedev/orchestra:latest
```

### 1. Environment Setup

See the [canonical environment-variable guide](../docs/environment-variables.md) before creating the deployment file.

Create a `.env.docker` file in the `backend/` directory:

```bash
cd backend
cp .example.env .env.docker
```

Update the following values for Docker networking:

```bash
# Database - use container name instead of localhost
POSTGRES_CONNECTION_STRING="postgresql://admin:test1234@postgres:5432/orchestra?sslmode=disable"

# Tools - use container names for internal services
SEARX_SEARCH_HOST_URL="http://search_engine:8080"
```

### 2. Start Services

From the project root directory:

```bash
# Start database and backend
docker compose up postgres orchestra

# Or start all services
docker compose up
```

### 3. Verify Deployment

The API will be available at `http://localhost:8000`

-   API Docs: `http://localhost:8000/api`
-   Health Check: `http://localhost:8000/health`

## 🧩 Docker Compose Services

| Service         | Port      | Description                        |
| --------------- | --------- | ---------------------------------- |
| `orchestra`     | 8000      | Backend API                        |
| `postgres`      | 5432      | PostgreSQL with pgvector           |
| `minio`         | 9000/9001 | S3-compatible file storage         |
| `search_engine` | 8080      | SearXNG search engine              |
| `ollama`        | 11434     | Local LLM inference (requires GPU) |
| `redis`         | 6379      | Redis message broker (for workers) |
| `worker`        | -         | TaskIQ worker (no exposed port)    |

## 🧱 Docker Compose Example

```yaml
services:
    # PGVector
    postgres:
        image: pgvector/pgvector:pg16
        container_name: postgres
        environment:
            POSTGRES_USER: admin
            POSTGRES_PASSWORD: test1234
            POSTGRES_DB: postgres
        ports:
            - "5432:5432"

    # Server (use pre-built image or build locally)
    orchestra:
        image: ghcr.io/mifunedev/orchestra:latest
        container_name: orchestra
        env_file: .env.docker
        ports:
            - "8000:8000"
        depends_on:
            - postgres
```

## 🏗️ Build Commands

### Build with Script (Recommended)

The build script copies this README into the image and handles tagging:

```bash
# From project root
bash backend/scripts/build.sh

# Or with custom tag
bash backend/scripts/build.sh v1.0.0
```

### Build with Docker Compose

```bash
docker compose build orchestra
```

### Manual Build

```bash
# Copy README first, then build (Dockerfile lives in infra/)
cp infra/README.md backend/README.md
docker build -t orchestra:local -f infra/backend.Dockerfile backend
```

## ⚙️ Environment Variables

See the [canonical environment-variable guide](../docs/environment-variables.md). The table below is retained as a quick reference.

### Application Config

| Variable         | Description                          | Default       |
| ---------------- | ------------------------------------ | ------------- |
| `APP_ENV`        | Environment (development/production) | `development` |
| `APP_LOG_LEVEL`  | Logging level                        | `DEBUG`       |
| `APP_SECRET_KEY` | Application secret key               | -             |
| `JWT_SECRET_KEY` | JWT signing key                      | -             |
| `USER_AGENT`     | User agent string for requests       | `orchestra-dev`    |
| `TEST_USER_ID`   | Test user UUID                       | -             |

### Database

| Variable                     | Description                  | Default |
| ---------------------------- | ---------------------------- | ------- |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection string | -       |

### AI Providers (at least one required)

| Variable            | Description       | Default |
| ------------------- | ----------------- | ------- |
| `OPENAI_API_KEY`    | OpenAI API key    | -       |
| `GROQ_API_KEY`      | Groq API key      | -       |
| `ANTHROPIC_API_KEY` | Anthropic API key | -       |
| `XAI_API_KEY`       | xAI API key       | -       |
| `OLLAMA_BASE_URL`   | Ollama server URL | -       |

### Tool Config

| Variable                | Description              | Default                      |
| ----------------------- | ------------------------ | ---------------------------- |
| `SEARX_SEARCH_HOST_URL` | SearXNG search endpoint  | `http://localhost:8080`      |
| `TAVILY_API_KEY`        | Tavily search API key    | -                            |

### Distributed Workers (Optional)

| Variable              | Description                    | Default |
| --------------------- | ------------------------------ | ------- |
| `REDIS_URL`           | Redis connection for task queue | -       |
| `DISTRIBUTED_WORKERS` | Enable distributed worker mode | `false` |

> **Note**: When enabled, run the worker process separately: `make dev.worker`

### Storage

| Variable            | Description       | Default    |
| ------------------- | ----------------- | ---------- |
| `MINIO_HOST`        | MinIO/S3 host URL | -          |
| `S3_REGION`         | S3 region         | -          |
| `ACCESS_KEY_ID`     | S3 access key     | -          |
| `ACCESS_SECRET_KEY` | S3 secret key     | -          |
| `BUCKET`            | S3 bucket name    | `orchestra_dev` |

## 🗄️ Database Migrations

Run migrations inside the container:

```bash
# Using docker compose exec
docker compose exec orchestra alembic upgrade head

# Or run migrations before starting
docker compose run --rm orchestra alembic upgrade head
```

## 🚢 Production Considerations

### Security

-   Generate strong values for `APP_SECRET_KEY` and `JWT_SECRET_KEY`
-   Use SSL/TLS termination (nginx, traefik, etc.)
-   Restrict database access to internal networks
-   Never expose `.env` files

### Performance

-   Configure appropriate resource limits in `docker-compose.yml`
-   Use a reverse proxy for load balancing
-   Enable PostgreSQL connection pooling for high traffic

### Dockerfile Features

The Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs dependencies, compiles Python to bytecode (`.pyc`)
2. **Runtime Stage**: Ships only compiled bytecode for smaller image size

> **Note**: Migration files (`.py`) are preserved since Alembic requires source files.

## 🧰 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs orchestra

# Verify environment file exists
ls -la backend/.env.docker
```

### Database connection failed

```bash
# Ensure postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres
```

### Port already in use

```bash
# Check what's using the port
lsof -i :8000

# Or change the port mapping in docker-compose.yml
ports:
  - "8001:8000"  # Map to different host port
```
