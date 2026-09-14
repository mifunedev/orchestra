---
title: "Connect Ubuntu Sandbox MCP to Assistant"
slug: /tools/sandbox-tutorial
sidebar_position: 5
---

# Connect Ubuntu Sandbox MCP to Assistant

[![Join Discord](https://img.shields.io/badge/Join-Discord-purple)](https://discord.com/invite/QRfjg4YNzU)
[![View API Docs](https://img.shields.io/badge/View-API%20Docs-blue)](https://github.com/mifunedev/orchestra/tree/development/docs)
[![Follow Social](https://img.shields.io/badge/Follow-Social-black)](https://mifune.dev/socials)

This tutorial walks you through connecting the [Ubuntu Sandbox](/tools/sandbox) to Orchestra using MCP (Model Context Protocol). By the end, your assistant will be able to execute shell commands, read/write files, and more inside an isolated Docker container.

## Prerequisites

Before starting, make sure you have:

- A running Ubuntu Sandbox container — see the [Sandbox documentation](/tools/sandbox) for Docker setup instructions
- An Orchestra account at [localhost:8000](http://localhost:8000)

## Step 1: Verify the Sandbox Is Running

Confirm your sandbox container is healthy by checking the `/health` endpoint:

```bash
curl http://localhost:3005/health
# {"status":"ok","sessions":0,"sandbox_id":"..."}
```

You should see `"status":"ok"` in the response. If the health check fails, refer to the [Troubleshooting section](/tools/sandbox#troubleshooting) in the Sandbox docs.

![Sandbox Health Check](https://github.com/ryaneggz/static/blob/main/enso/sandbox-tutorial-health.png?raw=true)

## Option A: Default Sandbox (All Conversations)

This is the recommended approach — it enables the MCP sandbox for every new conversation without any per-assistant configuration.

### Step 2A: Open Settings

Click the **gear icon** in the bottom-left of the sidebar to open the **Settings** page.

### Step 3A: Configure Default Sandbox

1. Under **Default Sandbox**, select **MCP Sandbox** from the dropdown.
2. Enter the **Server URL** (e.g., `http://host.docker.internal:3005`).
3. Optionally enter an **API Key** if your sandbox has `API_KEY` set.
4. Click **Save**.

A **Connected** or **Unreachable** status indicator will appear next to the URL field, confirming whether the sandbox is reachable.

### Step 4A: Test with a Prompt

Open any conversation and send a test message:

> Run `uname -a` to check the OS

The assistant will invoke sandbox tools and return the output from the container. All new conversations now automatically use the MCP sandbox.

---

## Option B: Per-Assistant Configuration

Use this approach if you want the sandbox on specific assistants only, rather than as a global default.

### Step 2B: Open MCP Configuration

1. Navigate to your assistant's page and click the **Config** tab.
2. Click **Edit**, then click **Manage Tools**.
3. In the Tool Selection modal, click the **MCP Servers** tab.

This panel shows your configured MCP servers and lets you add new ones.

![MCP Servers Tab](https://github.com/ryaneggz/static/blob/main/enso/sandbox-tutorial-mcp-tab.png?raw=true)

### Step 3B: Add the Sandbox MCP Server

Click **Add Server** and fill in the form (you can use any server name):

| Field | Value |
| ----- | ----- |
| **Server Name** | `ubuntu-sandbox` |
| **Transport** | `Streamable HTTP` |
| **URL** | `http://localhost:3005/mcp` |

:::tip When to use which URL
- Use `http://exec_server:3005/mcp` when both Orchestra and the sandbox are running in Docker containers on the same network.
- Use `http://localhost:3005/mcp` when the sandbox is running on your host machine and Orchestra is accessing it directly.
- Use `http://<SANDBOX_IP>:3005/mcp` when the sandbox runs on another machine reachable over the network.
:::

If your sandbox has `API_KEY` set, add the key in the **Header Key** / **Header Value** fields:

| Field | Value |
| ----- | ----- |
| **Header Key** | `x-api-key` |
| **Header Value** | `your_api_key` |

Click **Add Server** to save the configuration.

![MCP Config Form](https://github.com/ryaneggz/static/blob/main/enso/sandbox-tutorial-config.png?raw=true)

#### Example configurations

| Scenario | Server Name | URL | Header Key | Header Value |
| --- | --- | --- | --- | --- |
| Docker Compose (alias) | `ubuntu-sandbox` | `http://exec_server:3005/mcp` |  |  |
| Localhost | `local-sandbox` | `http://localhost:3005/mcp` |  |  |
| Remote IP (no auth) | `remote-sandbox` | `http://203.0.113.10:3005/mcp` |  |  |
| Remote DNS (TLS) | `sandbox-prod` | `https://sandbox.example.com/mcp` |  |  |
| Remote IP (API key) | `prod-sandbox` | `http://203.0.113.10:3005/mcp` | `x-api-key` | `your_api_key` |

### Step 4B: Fetch and Select Tools

After saving, Orchestra fetches the available tools from your sandbox. You should see all sandbox tools listed (e.g., `exec_command`, `execute`, `read`, `write`, `edit`, `grep`, `glob`, `ls`, `upload_file`, `download_file`).

Select the tools you want to enable for your assistant.

![Tools Loaded](https://github.com/ryaneggz/static/blob/main/enso/sandbox-tutorial-tools.png?raw=true)

### Step 5B: Test with a Prompt

Close the configuration panel and send a test message to your assistant:

> Run `uname -a` to check the OS

The assistant will invoke the `exec_command` tool and return the output from the sandbox container.

![Execution Result](https://github.com/ryaneggz/static/blob/main/enso/sandbox-tutorial-result.png?raw=true)

## Troubleshooting

If you run into issues, check the following:

| Issue | Solution |
| ----- | -------- |
| Sandbox not reachable | Verify the container is running with `docker ps` and the health endpoint responds |
| Wrong URL | Use `exec_server:3005` for Docker network, `localhost:3005` for host access |
| Authentication errors | Ensure `x-api-key` header matches the `API_KEY` environment variable |
| Tool not appearing | Re-save the MCP configuration and refresh the page |

For more details, see the [Sandbox reference documentation](/tools/sandbox) and [MCP documentation](/tools/mcp).
