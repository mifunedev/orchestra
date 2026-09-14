<div align="center">

<table align="center">
  <tr>
    <td style="padding: 0; vertical-align: middle;">
      <img
        src="https://avatars.githubusercontent.com/u/139279732?s=200&v=4"
        width="60"
        height="60"
        style="border-radius: 50%; display: block;"
        alt="Mifune Logo"
      />
    </td>
    <td style="padding: 0 0 0 2px; vertical-align: middle;">
      <span style="font-weight: 600; font-style: italic; font-size: 2.4rem; line-height: 1;">
        RCHESTRA
      </span>
    </td>
  </tr>
</table>


Steerable Harnesses for [DeepAgents](https://docs.langchain.com/oss/python/deepagents/overview)

<a href="https://discord.com/invite/QRfjg4YNzU"><img src="https://img.shields.io/badge/Join-Discord-purple"></a>
<a href="https://github.com/mifunedev/orchestra/tree/development/docs"><img src="https://img.shields.io/badge/View-API Docs-blue"></a>
<a href="https://mifune.dev/socials"><img src="https://img.shields.io/badge/Follow-Social-black"></a>
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![DCO](https://img.shields.io/badge/DCO-1.1-yellow)](DCO)

<img src="https://github.com/ryaneggz/static/blob/main/enso/landing-page-light.gif?raw=true">

</div>

**Open-source AI agent orchestration platform** built on LangGraph and powered by the [MCP](https://github.com/modelcontextprotocol) & [A2A](https://github.com/google/A2A) protocols.

Self-host for free or let us deploy it for you. Your agents, your data, your infrastructure.

---

## 🚀 Deployment Options

| Option | Best For | Get Started |
|--------|----------|-------------|
| **Community (Free)** | Developers, self-hosting | `docker pull ghcr.io/mifunedev/orchestra:latest` |
| **Managed Cloud** | Teams wanting convenience | [Contact Us](https://mifune.dev) |
| **Enterprise** | Organizations needing SSO, compliance, SLA | [Contact Us](https://mifune.dev/enterprise) |

---

## 📖 Table of Contents

This project includes tools for running shell commands and Docker container operations. For detailed information, please refer to the following documentation:

-   [Tools Documentation](./docs/tools/tools.md)
-   [Docker Deployment (GHCR)](#-docker-deployment-ghcr)

## 🐳 Docker Deployment (GHCR)

We publish the backend image to GitHub Container Registry (GHCR). For the full deployment guide (env setup, services, migrations, troubleshooting), jump to [Docker Deployment details](#-docker-deployment-ghcr).

```bash
docker pull ghcr.io/mifunedev/orchestra:latest
```

## 📋 Prerequisites

-   [Docker](https://docs.docker.com/engine/install/ubuntu/) Installed
-   Python 3.11 or higher
-   Access to OpenAI API (for GPT-4o model) or Anthropic API (for Claude 3.5 Sonnet)

## 🛠️ Development

1. **Environment Variables:**

    See the [canonical environment-variable guide](../docs/environment-variables.md) for required values, optional defaults, and provider setup.

    Create a `.env` file at the repository root and add your API key(s):

    ```bash
    cd <project-root>
    cp .example.env .env
    ```

    Ensure that your `.env` file is not tracked by git by checking the `.gitignore`:

2. **Start Docker Services**

    The project root `README.md` owns the `docker run` that starts the Postgres
    container.

3. **Setup Server Environment**

    Assumes you're using [astral uv](https://github.com/astral-sh/uv?tab=readme-ov-file#installation). See `./backend/scripts` directory for other dev utilities.

    ```bash
    # Change directory
    cd <project-root>/backend

    # Generate virtualenv
    uv venv

    # Activate
    source .venv/bin/activate

    # Install
    uv sync

    # Run
    bash scripts/dev.sh # Select "no" when prompted.
    ```

4. **Setup Client Environment**

    ```bash
    # Change Directory
    cd <project-root>/frontend

    # Install
    npm install

    # Run
    npm run dev
    ```

## Database Migrations

This project uses Alembic for database migrations. Here's how to work with migrations:

### Initial Setup

1. Create the database (if not exists):

    ```bash
    cd backend
    alembic upgrade head
    ```

    ```bash
    python -m seeds.user_seeder
    ```

2. Create new

    ```bash
    alembic revision -m "description_of_changes"
    ```

    ```bash
    ### Appliy Next
    alembic upgrade +1

    ### Speicif revision
    alembic upgrade <revis_id>

    ### Appliy Down
    alembic downgrade -1

    ### Appliy Down
    alembic downgrade <revis_id>

    ### History
    alembic history
    ```

### Run Playwright MCP Locally

1. Start Ngrok on port 8931

    ```bash
    ngrok http 8931
    ```

2. Run MCP server

    ```bash
    npx @playwright/mcp@latest \
    --port 8931 \
    --executable-path $HOME/.cache/ms-playwright/chromium-<version>/chrome-linux/chrome \
    --vision
    ```

## 🤝 Integrations

-   [Configuring gcalcli](https://github.com/insanum/gcalcli/blob/HEAD/docs/api-auth.md)
-   [Issues Logging into gcalcli](https://github.com/insanum/gcalcli/issues/808)

## 🗺️ Roadmap

-   [ ] [Human-In-The-Loop](https://langchain-ai.github.io/langgraph/how-tos/create-react-agent-hitl/#usage)

---

## 🏢 Enterprise

For organizations needing managed deployment, compliance, or dedicated support:

| Feature | Description |
|---------|-------------|
| **SSO/SAML** | Integrate with your identity provider |
| **Audit Logging** | Comprehensive logs for compliance |
| **Air-Gapped Deployment** | Run in isolated environments |
| **Priority Support** | SLA-backed response times |
| **Custom Integrations** | Connect to your internal tools |

We partner with you to deploy Orchestra inside your infrastructure. [Contact us](https://mifune.dev/enterprise) to discuss your requirements.

---

## 🐳 Docker Deployment (GHCR / Docker Compose)

This section covers deploying the Orchestra backend using Docker. For local development, see the sections above.

### 📋 Prerequisites

-   [Docker](https://docs.docker.com/engine/install/) installed
-   [Docker Compose](https://docs.docker.com/compose/install/) installed
-   Access to AI provider API keys (OpenAI, Anthropic, etc.)

### 🚀 Quick Start

#### Using Pre-built Image

Pull the latest image from GitHub Container Registry:

```bash
docker pull ghcr.io/mifunedev/orchestra:latest
```

#### 1. Environment Setup

See the [canonical environment-variable guide](../docs/environment-variables.md) before creating the deployment file.

Create a `.env.docker` file in the `backend/` directory:

```bash
cd backend
cp ../.example.env .env.docker
```

Update the following values for Docker networking:

```bash
# Database - use container name instead of localhost
POSTGRES_CONNECTION_STRING="postgresql://postgres:postgres@postgres:5432/orchestra_dev?sslmode=disable"

# Tools - use container names for internal services
SEARX_SEARCH_HOST_URL="http://search_engine:8080"
```

#### 2. Start Services

Start PostgreSQL and any other service you need with the `docker run` blocks in the project
root `README.md`, then start the API against them:

```bash
docker run -d \
  --name orchestra \
  -p 8000:8000 \
  --env-file backend/.env.docker \
  ghcr.io/mifunedev/orchestra-api:latest
```

#### 3. Verify Deployment

The API will be available at `http://localhost:8000`

-   API Docs: `http://localhost:8000/api`
-   Health Check: `http://localhost:8000/health`

### 🧩 Docker Compose Services

| Service         | Port      | Description                        |
| --------------- | --------- | ---------------------------------- |
| `orchestra`     | 8000      | Backend API                        |
| `postgres`      | 5432      | PostgreSQL with pgvector           |
| `minio`         | 9000/9001 | S3-compatible file storage         |
| `search_engine` | 8080      | SearXNG search engine              |
| `ollama`        | 11434     | Local LLM inference (requires GPU) |

### 🧱 Docker Compose Example

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

### 🏗️ Build Commands

#### Build with Script (Recommended)

The build script copies the Docker deployment README into the image and handles tagging:

```bash
# From project root
bash backend/scripts/build.sh

# Or with custom tag
bash backend/scripts/build.sh v1.0.0
```

#### Manual Build

```bash
# Copy README first, then build (Dockerfile lives in infra/)
cp infra/README.md backend/README.md
docker build -t orchestra:local -f infra/backend.Dockerfile backend
```

### ⚙️ Environment Variables

See the [canonical environment-variable guide](../docs/environment-variables.md). The table below is retained as a quick reference.

#### Application Config

| Variable         | Description                          | Default       |
| ---------------- | ------------------------------------ | ------------- |
| `APP_ENV`        | Environment (development/production) | `development` |
| `APP_LOG_LEVEL`  | Logging level                        | `DEBUG`       |
| `APP_SECRET_KEY` | Application secret key               | -             |
| `JWT_SECRET_KEY` | JWT signing key                      | -             |
| `USER_AGENT`     | User agent string for requests       | `orchestra-dev`   |
| `TEST_USER_ID`   | Test user UUID                       | -             |

#### Context Compaction

The middleware automatically summarizes older messages when context exceeds the token threshold, preserving system prompts and recent messages.

| Variable                     | Description                                          | Default   |
| ---------------------------- | ---------------------------------------------------- | --------- |
| `COMPACTION_TOKEN_THRESHOLD` | Token count threshold to trigger message compaction  | `170000`  |
| `COMPACTION_RECENT_MESSAGES` | Number of recent messages to preserve during summary | `6`       |

#### Database

| Variable                     | Description                  | Default |
| ---------------------------- | ---------------------------- | ------- |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection string | -       |

#### AI Providers (at least one required)

| Variable            | Description       | Default |
| ------------------- | ----------------- | ------- |
| `OPENAI_API_KEY`    | OpenAI API key    | -       |
| `GROQ_API_KEY`      | Groq API key      | -       |
| `ANTHROPIC_API_KEY` | Anthropic API key | -       |
| `XAI_API_KEY`       | xAI API key       | -       |
| `OLLAMA_BASE_URL`   | Ollama server URL | -       |

#### Tool Config

| Variable                | Description              | Default                      |
| ----------------------- | ------------------------ | ---------------------------- |
| `SEARX_SEARCH_HOST_URL` | SearXNG search endpoint  | `http://localhost:8080`      |
| `TAVILY_API_KEY`        | Tavily search API key    | -                            |

#### Services (Alpha)

| Variable                  | Description                 | Default |
| ------------------------- | --------------------------- | ------- |
| `PRESIDIO_ANALYZE_HOST`   | Presidio analyze endpoint   | -       |
| `PRESIDIO_ANONYMIZE_HOST` | Presidio anonymize endpoint | -       |
| `PRESIDIO_API_KEY`        | Presidio API key            | -       |

#### Storage

| Variable            | Description       | Default    |
| ------------------- | ----------------- | ---------- |
| `MINIO_HOST`        | MinIO/S3 host URL | -          |
| `S3_REGION`         | S3 region         | -          |
| `ACCESS_KEY_ID`     | S3 access key     | -          |
| `ACCESS_SECRET_KEY` | S3 secret key     | -          |
| `BUCKET`            | S3 bucket name    | `orchestra_dev` |

### 🗄️ Database Migrations

Run migrations inside the container:

```bash
docker exec orchestra alembic upgrade head
```

### 🚢 Production Considerations

#### Security

-   Generate strong values for `APP_SECRET_KEY` and `JWT_SECRET_KEY`
-   Use SSL/TLS termination (nginx, traefik, etc.)
-   Restrict database access to internal networks
-   Never expose `.env` files

#### Performance

-   Configure appropriate resource limits with `--memory` and `--cpus`
-   Use a reverse proxy for load balancing
-   Enable PostgreSQL connection pooling for high traffic

#### Dockerfile Features

The Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs dependencies, compiles Python to bytecode (`.pyc`)
2. **Runtime Stage**: Ships only compiled bytecode for smaller image size

> **Note**: Migration files (`.py`) are preserved since Alembic requires source files.

### 🧰 Troubleshooting

#### Container won't start

```bash
# Check logs
docker logs orchestra

# Verify environment file exists
ls -la backend/.env.docker
```

#### Database connection failed

```bash
# Ensure postgres is running
docker ps --filter name=postgres

# Check postgres logs
docker logs postgres
```

#### Port already in use

```bash
# Check what's using the port
lsof -i :8000

# Or publish the API on a different host port
docker run -d --name orchestra -p 8001:8000 ghcr.io/mifunedev/orchestra-api:latest
```
