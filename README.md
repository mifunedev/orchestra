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

<!-- <img src="https://github.com/ryaneggz/static/blob/main/enso/landing-page-light.gif?raw=true"> -->

</div>

**Open-source AI agent orchestration platform** built on LangGraph and powered by the [MCP](https://github.com/modelcontextprotocol) & [A2A](https://github.com/google/A2A) protocols.

Self-host for free or let us deploy it for you. Your agents, your data, your infrastructure.

The stack is a Python FastAPI backend that runs under uvicorn, LangGraph agents, and Alembic
migrations over PostgreSQL with the pgvector extension. A React and Vite client serves the
browser. TaskIQ workers with Redis run distributed execution. MinIO or S3 stores files.

## 🚀 Deployment Options

| Option | Best For | Get Started |
|--------|----------|-------------|
| **Community (Free)** | Developers, self-hosting | `docker pull ghcr.io/mifunedev/orchestra:latest` |
| **Managed Cloud** | Teams wanting convenience | [Contact Us](https://mifune.dev) |
| **Enterprise** | Organizations needing SSO, compliance, SLA | [Contact Us](https://mifune.dev/enterprise) |

## 🚀 Quickstart

Prerequisites: Docker, Python 3.12 or newer, Node.js, and [uv](https://github.com/astral-sh/uv).

### 1. Clone and install

```bash
git clone https://github.com/mifunedev/orchestra.git
cd orchestra
cd backend && uv sync            # install the Python dependencies
cd ../frontend && npm install    # install the Node.js dependencies
```

### 2. Start PostgreSQL

Orchestra uses a shared local PostgreSQL container. The container is generic. Any project on the
host can use it. Orchestra owns only the `orchestra_dev` and `orchestra_test` databases inside it.

```bash
docker run -d \
  --name pgvector \
  --restart unless-stopped \
  -p 5432:5432 \
  -v pgvector_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=test1234 \
  -e POSTGRES_DB=postgres \
  --memory 1g --cpus 1 \
  pgvector/pgvector:pg17
```

The flag `-v pgvector_data:/var/lib/postgresql/data` mounts a named volume. Docker stores the
data outside the repository.

Create the two databases and the vector extension:

```bash
docker exec pgvector psql -U admin -d postgres -c "CREATE DATABASE orchestra_dev OWNER admin;"
docker exec pgvector psql -U admin -d postgres -c "CREATE DATABASE orchestra_test OWNER admin;"
docker exec pgvector psql -U admin -d orchestra_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

The values `admin` and `test1234` serve local development only. Never reuse them in production.

### 3. Choose the connection host

If the application runs on the host, use `localhost`:

```
postgresql://admin:test1234@localhost:5432/orchestra_dev?sslmode=disable
```

If the application runs inside another container, use the container name `pgvector`:

```
postgresql://admin:test1234@pgvector:5432/orchestra_dev?sslmode=disable
```

A container reaches the database by container name only after the container joins the same
Docker network. Run `docker network connect <network> pgvector` to join it.

### 4. Configure the environment

```bash
cp .example.env .env
```

Set `POSTGRES_CONNECTION_STRING` in that file to the connection string from step 3. The backend
`make` targets read the `ENV_FILE` variable, which points at the root `.env` by default. The
frontend `npm run dev` script reads the same root `.env`. Read
[Environment variables](docs/environment-variables.md) for every key.

### 5. Migrate, seed, and run

```bash
cd backend
make migrate.up    # apply every pending Alembic migration
make seeds.user    # create the default users
make dev           # start the API on port 8000

cd ../frontend
npm run dev        # start the Vite dev server
```

Open `http://localhost:8000/api` for the API documentation.

### 6. Command reference

| Command           | Description                      |
|-------------------|----------------------------------|
| `make dev`        | Start backend server (port 8000) |
| `make dev.worker` | Start TaskIQ worker              |
| `make test`       | Run all backend tests            |
| `make format`     | Format code with Ruff            |
| `make seeds.user` | Seed default users               |
| `make migrate.up` | Apply all pending migrations     |

For all commands, see `backend/Makefile`.

## 📚 Documentation

- [Documentation index](docs/README.md) — full user docs, also published at [https://github.com/mifunedev/orchestra/tree/development/docs](https://github.com/mifunedev/orchestra/tree/development/docs)
- [Orchestra Docs](docs/index.md) — the published documentation home page
- [Getting Started](docs/getting-started.md) — account, assistant, and first thread
- [Self-Hosting Guide](docs/self-hosting/index.md) — Docker deployment and AI provider setup
- [Environment variables](docs/environment-variables.md) — every key, default, and provider value
- [Assistants](docs/assistants/index.md) — configure an agent, its model, and its tools
- [AGENTS.md](docs/agents-md/index.md) — steer an agent with a repository instruction file
- [Skills](docs/skills/index.md) — package a reusable agent procedure
- [Tools & Integrations](docs/tools/tools.md) — the built-in tool catalog
- [MCP](docs/tools/mcp.md) — connect Model Context Protocol servers
- [A2A](docs/tools/a2a.md) — connect Agent-to-Agent endpoints
- [Storage](docs/storage/index.md) — MinIO and S3 file storage
- [API Tokens](docs/api-tokens/index.md) — authenticate against the REST API

Stay up to date on [Discord](https://discord.com/invite/QRfjg4YNzU). Full release history in [Changelog.md](./Changelog.md).

## 📄 License

Apache 2.0. Read [LICENSE](LICENSE). Sign every commit under the [DCO](DCO) with `git commit -s`.
