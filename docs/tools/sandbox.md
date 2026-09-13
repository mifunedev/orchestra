---
title: Sandbox
slug: /tools/sandbox
---

# Ubuntu Sandbox (exec-server MCP)

[![Join Discord](https://img.shields.io/badge/Join-Discord-purple)](https://discord.com/invite/QRfjg4YNzU)
[![View API Docs](https://img.shields.io/badge/View-API%20Docs-blue)](https://chat.ruska.ai/api)
[![Follow Social](https://img.shields.io/badge/Follow-Social-black)](https://ruska.ai/socials)

The ubuntu sandbox is a standalone MCP server that runs inside an isolated Docker container and exposes tools over the [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) transport at `/mcp`. It supports optional API key authentication, session state via `mcp-session-id`, and a `/health` endpoint for monitoring.

- Source code: [ruska-ai/sandboxes](https://github.com/ruska-ai/sandboxes)
- Container images: [ghcr.io/ruska-ai/sandbox](https://github.com/ruska-ai/sandboxes/pkgs/container/sandbox)

## Tools

The server exposes 10 tools for file management, code editing, and shell execution:

| Tool | Description |
| ---- | ----------- |
| `execute` | Execute a shell command and return stdout/stderr |
| `exec_command` | Alias for `execute` (backward compatibility) |
| `read` | Read file with line numbers (offset/limit pagination) |
| `write` | Write content to a file (creates parent dirs) |
| `edit` | Find-and-replace string in a file (supports `replace_all`) |
| `grep` | Search for a fixed-string pattern in files |
| `glob` | Find files by name glob pattern |
| `ls` | List directory contents |
| `upload_file` | Upload a base64-encoded file |
| `download_file` | Download a file as base64 |

### `exec_command` / `execute`

Execute a shell command inside the container and return stdout/stderr.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `cmd`     | string | Yes      | The shell command to execute   |

Commands run as an unprivileged `executor` user in `/home/executor` with a 120-second timeout and 10 MB output buffer. The container image (Debian Bookworm) ships with the following pre-installed:

- `curl` — HTTP client
- `jq` — JSON processor
- `node` (v22) — JavaScript runtime
- `gh` — GitHub CLI
- `agent-browser` — Browser automation with Playwright/Chromium

**Response format:**

```text
stdout:
<command stdout>
stderr:
<command stderr>
exit_code: <code>
```

<details>
<summary>Other tool parameter schemas</summary>

#### `read`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `file_path` | string | Yes | Absolute path to the file |
| `offset` | number | No | Line number to start reading from |
| `limit` | number | No | Maximum number of lines to read |

#### `write`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `file_path` | string | Yes | Absolute path to the file (parent dirs created automatically) |
| `content` | string | Yes | Content to write |

#### `edit`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `file_path` | string | Yes | Absolute path to the file |
| `old_string` | string | Yes | Text to find |
| `new_string` | string | Yes | Replacement text |
| `replace_all` | boolean | No | Replace all occurrences (default: false) |

#### `grep`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `pattern` | string | Yes | Fixed-string pattern to search for |
| `path` | string | No | Directory or file to search in (default: working directory) |
| `include` | string | No | Glob pattern to filter files (e.g. `*.py`) |

#### `glob`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `pattern` | string | Yes | Glob pattern (e.g. `**/*.ts`) |
| `path` | string | No | Base directory (default: working directory) |

#### `ls`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `path` | string | No | Directory to list (default: working directory) |

#### `upload_file`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `file_path` | string | Yes | Destination path inside the container |
| `content` | string | Yes | Base64-encoded file content |

#### `download_file`

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `file_path` | string | Yes | Path to the file to download |

Returns the file content as a base64-encoded string.

</details>

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- Clone the sandboxes repo:

```bash
git clone https://github.com/ruska-ai/sandboxes.git
cd sandboxes
```

## Quick Start

### From source

```bash
cd ubuntu
docker build -t exec-server .
docker run -p 3005:3005 exec-server
```

### From GHCR

```bash
docker run -p 3005:3005 -e API_KEY=my-secret ghcr.io/ruska-ai/sandbox:ubuntu-latest
```

Verify the server is running:

```bash
curl http://localhost:3005/health
# {"status":"ok","sessions":0,"sandbox_id":"..."}
```

## Environment Variables

| Variable  | Required | Description                                                    |
| --------- | -------- | -------------------------------------------------------------- |
| `API_KEY` | No       | If set, all `/mcp` requests must include `x-api-key` header   |
| `PORT`    | No       | Server port (default: `3005`)                                  |

Example:

```bash
docker run -p 3005:3005 -e API_KEY=my-secret ghcr.io/ruska-ai/sandbox:ubuntu-latest
```

## Testing with MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) lets you interactively test the server before connecting it to an assistant.

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:

1. Set **Transport Type** to `Streamable HTTP`
2. Set **URL** to `http://localhost:3005/mcp`
3. If `API_KEY` is set, add a header: `x-api-key: <your key>`
4. Click **Connect**
5. Navigate to the **Tools** tab — you should see all 10 tools (e.g., `exec_command`, `execute`, `read`, `write`, `edit`, etc.)
6. Click `exec_command`, enter `{"cmd": "echo hello world"}`, and click **Run** to verify output

### Manual curl test

```bash
# 1. Initialize a session
curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0.0" }
    },
    "id": 1
  }'

# Note the mcp-session-id response header for subsequent requests

# 2. Call exec_command
curl -s -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "exec_command",
      "arguments": { "cmd": "echo hello world" }
    },
    "id": 2
  }'
```

## Connect to Orchestra

Add the sandbox as an MCP server in the Orchestra UI or API. See the [MCP docs](/tools/mcp) for general MCP configuration instructions.

### Default Sandbox (Recommended)

The simplest way to enable the MCP sandbox for all conversations:

1. Go to **Settings** in the Orchestra UI.
2. Under **Default Sandbox**, select **MCP Sandbox**.
3. Enter the **Server URL** (e.g., `http://host.docker.internal:3005`).
4. Optionally enter an **API Key** if your sandbox has `API_KEY` set.
5. Click **Save**.

A **Connected** or **Unreachable** status indicator will appear confirming whether the sandbox is reachable. Once connected, all new conversations will automatically use the MCP sandbox for code execution.

### Per-Assistant MCP Config

For users who want the sandbox on specific assistants only, add it as an MCP server in the assistant configuration. See the [Sandbox Tutorial](/tools/sandbox-tutorial) for a step-by-step walkthrough.

### Connection Details

| Field     | Value                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------- |
| URL       | `http://exec_server:3005/mcp` (same docker network) or `http://localhost:3005/mcp` (host)     |
| URL       | `http://host.docker.internal:3005/mcp` (backend in Docker, exec_server on host or separate compose stack) |
| Transport | `streamable_http`                                                                              |
| Headers   | `{"x-api-key": "<API_KEY>"}` if auth is enabled, otherwise `{}`                               |

### JSON Configuration

Use the following in the MCP configuration JSON editor:

```json
{
    "mcp": {
        "exec_server": {
            "transport": "streamable_http",
            "url": "http://exec_server:3005/mcp",
            "headers": {
                "x-api-key": "your_api_key"
            }
        }
    }
}
```

If `API_KEY` is not set on the server, omit the `headers` field or pass an empty object.

### API Example

```bash
curl -X 'POST' \
  'https://chat.ruska.ai/api/llm/thread' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Run uname -a",
  "model": "anthropic:claude-sonnet-4-5",
  "mcp": {
    "exec_server": {
      "transport": "streamable_http",
      "url": "http://exec_server:3005/mcp",
      "headers": {}
    }
  },
  "tools": ["exec_command"]
}'
```

## Usage

Once connected, all sandbox tools are available to your assistant. Example prompts:

- "Run `uname -a` to check the OS" — uses `execute` / `exec_command`
- "Read the contents of /home/executor/README.md" — uses `read`
- "Create a file called hello.py with a hello world script" — uses `write`
- "Find all .json files in the home directory" — uses `glob`
- "Search for TODO comments in the project" — uses `grep`
- "Install python3 and run a hello world script" — uses `exec_command`
- "Clone a repo with `gh` and list its contents" — uses `exec_command` + `ls`

The assistant will select the appropriate sandbox tool based on the task.

## Run Playwright MCP Locally

The sandbox image ships `agent-browser` for browser automation. To expose a Playwright MCP server from your own machine instead, run the following steps.

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

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Container not running | Run `docker run -p 3005:3005 ghcr.io/ruska-ai/sandbox:ubuntu-latest` and check `docker logs` |
| Health check fails | Ensure port `3005` is not in use and the container is running with `docker ps` |
| Authentication error (401) | Verify the `x-api-key` header matches the `API_KEY` env var on the container |
| Tool not appearing in Orchestra | Confirm the MCP config is saved and the URL is reachable from the Orchestra backend |
| MCP tools silently not loading | Check backend/worker logs for `Error fetching MCP tools`. MCP errors are caught silently — the agent proceeds without MCP tools and no error is shown in the UI |
| Docker Compose cross-stack URL | Use `http://host.docker.internal:3005/mcp` when exec_server runs in a separate compose stack from the backend |
| Agent says tool is unavailable despite config | The agent may be reading stale workspace memory files. Start a fresh thread or clear the agent's `/memory/` files |
| Command timeout | Commands have a 120-second limit; break long-running tasks into smaller steps |
| Permission denied | Commands run as unprivileged `executor` user; use `sudo` if available or rebuild the image |
