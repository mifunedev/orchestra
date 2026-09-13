---
title: Tools & Integrations
slug: /tools
sidebar_position: 6
---

# Tools & Integrations

Orchestra provides a rich ecosystem of tools and protocol integrations that allow you to compose powerful AI agent systems. Whether you're using built-in tools or connecting external services via MCP and A2A protocols, Orchestra makes it easy to extend your agents' capabilities.

## Overview

Orchestra's tool system is designed with composability in mind. You can:

-   **Use Built-in Tools**: Native tools like search that work out of the box
-   **Connect MCP Servers**: Integrate any Model Context Protocol-compatible tool
-   **Link A2A Agents**: Enable agent-to-agent communication for complex workflows
-   **Combine Tools**: Use multiple tools together in a single assistant or thread

All tools follow an API schema similar to the OpenAI Assistants API, making integration straightforward and familiar.

## Table of Contents

-   [Base Tools](#base-tools-platform-tools) - Customizable platform tools with encrypted secrets
-   [Search](./search.md) - Web search integration
-   [MCP](./mcp.md) - Model Context Protocol integration
-   [A2A](./a2a.md) - Agent-to-Agent communication (under development)
-   [Integrations](#integrations) - Setup references for external tools

## Base Tools (Platform Tools)

Base tools are **built-in platform tools** that you can customize with your own secrets and environment variables. They allow you to create reusable, secure tool configurations without exposing sensitive credentials.

### What are Base Tools?

Base tools provide a secure way to:

-   **Store encrypted secrets**: Environment variables are encrypted in the tool repository
-   **Create custom tool instances**: Customize platform tools with your own API keys and webhooks
-   **Share tools across assistants**: Reuse the same tool configuration in multiple agents
-   **Maintain security**: Credentials are never exposed in API responses or logs

### Tool Repository

All base tools are stored in a **user-scoped tool repository** backed by LangGraph's BaseStore. Each tool has:

-   **Unique name**: Identifier for the tool (e.g., `webhook_marketing_channel`)
-   **Base tool reference**: The underlying platform tool (e.g., `send_webhook_to_channel`)
-   **Encrypted environment variables**: Secrets stored securely
-   **Metadata and tags**: For organization and discovery

### Creating a Base Tool

Use the `/api/tools` endpoint to create customized tools:

```bash
curl -X 'POST' \
  'https://chat.ruska.ai/api/tools' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "webhook_marketing_channel",
  "base_tool": "send_webhook_to_channel",
  "description": "Send a message to the marketing team Microsoft Teams channel",
  "type": "default",
  "env": {
    "WEBHOOK_URL": "https://outlook.office.com/webhook/abc123",
    "CHANNEL_NAME": "Marketing Team"
  },
  "tags": ["marketing", "notifications"],
  "public": false
}'
```

**Request Fields:**

-   **`name`** (required): Unique identifier for your tool
-   **`base_tool`** (required): Platform tool to customize (e.g., `send_webhook_to_channel`)
-   **`description`** (optional): What this tool does
-   **`type`** (required): Tool type - use `"default"` for base tools
-   **`env`** (optional): Dictionary of environment variables (encrypted at rest)
-   **`tags`** (optional): Array of tags for organization
-   **`public`** (optional): Whether other users can see this tool (default: `false`)
-   **`disabled`** (optional): Temporarily disable the tool (default: `false`)
-   **`verbose`** (optional): Enable detailed logging (default: `false`)

**Response:**

```json
{
    "name": "webhook_marketing_channel",
    "base_tool": "send_webhook_to_channel",
    "description": "Send a message to the marketing team Microsoft Teams channel",
    "type": "default",
    "tags": ["marketing", "notifications"],
    "public": false,
    "disabled": false,
    "created_at": "2025-01-16T10:30:00Z"
}
```

!!! warning "Security Note"
Environment variables in the `env` field are **encrypted** before storage and **never returned** in API responses for security.

### Listing Your Tools

Get all tools in your repository:

```bash
curl -X 'GET' \
  'https://chat.ruska.ai/api/tools' \
  -H 'accept: application/json'
```

**Response:**

```json
{
    "tools": [
        {
            "name": "webhook_marketing_channel",
            "base_tool": "send_webhook_to_channel",
            "description": "Send a message to the marketing team Microsoft Teams channel",
            "type": "default",
            "tags": ["marketing", "notifications"],
            "public": false,
            "disabled": false
        },
        {
            "name": "webhook_engineering_alerts",
            "base_tool": "send_webhook_to_channel",
            "description": "Send alerts to engineering Slack channel",
            "type": "default",
            "tags": ["engineering", "alerts"],
            "public": false,
            "disabled": false
        }
    ]
}
```

### Deleting a Tool

Remove a tool from your repository:

```bash
curl -X 'DELETE' \
  'https://chat.ruska.ai/api/tools/webhook_marketing_channel' \
  -H 'accept: application/json'
```

!!! warning "Permanent Deletion"
Deleting a tool is permanent and cannot be undone. Assistants using this tool will no longer have access to it.

### Using Base Tools with Assistants

Reference your custom tools in assistant configurations:

```bash
curl -X 'POST' \
  'https://chat.ruska.ai/api/assistant' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Marketing Automation Bot",
  "instructions": "You help automate marketing workflows. When important events happen, notify the team via the marketing channel.",
  "model": "anthropic:claude-sonnet-4-5",
  "tools": [
    "webhook_marketing_channel",  // Your custom base tool
    "search"                        // Built-in platform tool
  ]
}'
```

### Tool Priority Order

When multiple tool types are available, Orchestra prioritizes them in this order:

1. **User-defined Base Tools** (from tool repository)
2. **MCP Tools** (from configured MCP servers)
3. **A2A Tools** (from agent-to-agent integrations)
4. **Built-in Platform Tools** (e.g., `search`)

This ensures your custom configurations take precedence over defaults.

### Example Use Cases

#### Use Case 1: Custom Notification Webhooks

```bash
# Create webhook tool for Slack
curl -X 'POST' 'https://chat.ruska.ai/api/tools' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "notify_engineering_slack",
  "base_tool": "send_webhook_to_channel",
  "description": "Send alerts to engineering Slack #alerts channel",
  "type": "default",
  "env": {
    "WEBHOOK_URL": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX"
  }
}'

# Use in assistant
curl -X 'POST' 'https://chat.ruska.ai/api/assistant' \
  -d '{
  "name": "DevOps Monitor",
  "instructions": "Monitor system health. Alert engineering when issues arise.",
  "tools": ["notify_engineering_slack"]
}'
```

#### Use Case 2: API Integration with Secrets

```bash
# Create tool with API credentials
curl -X 'POST' 'https://chat.ruska.ai/api/tools' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "send_customer_email",
  "base_tool": "send_email_via_api",
  "description": "Send emails via SendGrid API",
  "type": "default",
  "env": {
    "SENDGRID_API_KEY": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "FROM_EMAIL": "noreply@example.com",
    "FROM_NAME": "Orchestra Bot"
  }
}'
```

#### Use Case 3: Multi-Channel Notifications

```bash
# Create multiple webhook tools
curl -X 'POST' 'https://chat.ruska.ai/api/tools' \
  -d '{"name":"notify_slack","base_tool":"send_webhook","type":"default","env":{"WEBHOOK_URL":"https://hooks.slack.com/..."}}'

curl -X 'POST' 'https://chat.ruska.ai/api/tools' \
  -d '{"name":"notify_teams","base_tool":"send_webhook","type":"default","env":{"WEBHOOK_URL":"https://outlook.office.com/webhook/..."}}'

curl -X 'POST' 'https://chat.ruska.ai/api/tools' \
  -d '{"name":"notify_discord","base_tool":"send_webhook","type":"default","env":{"WEBHOOK_URL":"https://discord.com/api/webhooks/..."}}'

# Use all in one assistant
curl -X 'POST' 'https://chat.ruska.ai/api/assistant' \
  -d '{
  "name": "Broadcast Bot",
  "instructions": "Send important announcements to all team channels.",
  "tools": ["notify_slack", "notify_teams", "notify_discord"]
}'
```

### Best Practices

!!! tip "Naming Convention"
Use descriptive, unique names for your tools. Include the service and purpose (e.g., `webhook_marketing_slack`, `api_customer_sendgrid`).

!!! tip "Security First"
Never hardcode secrets in assistant instructions or thread messages. Always use base tools with encrypted env vars.

!!! tip "Tag Organization"
Use tags to organize tools by team, purpose, or service (e.g., `["marketing", "slack"]`, `["engineering", "alerts"]`).

!!! tip "Test Before Deploying"
Test your custom tools in a thread before adding them to production assistants.

!!! warning "API Key Rotation"
When rotating API keys or secrets, delete the old tool and create a new one with updated credentials.

### API Reference

For complete tool API documentation:

-   [POST /tools](https://chat.ruska.ai/api#/Tools/Create_Tool) - Create a new tool
-   [GET /tools](https://chat.ruska.ai/api#/Tools/List_Tools) - List all tools
-   [DELETE /tools/&#123;tool_name&#125;](https://chat.ruska.ai/api#/Tools/Delete_Tool) - Delete a tool

## Integrations

An external tool can need its own authentication setup before an assistant calls it. Use these references:

-   [Configuring gcalcli](https://github.com/insanum/gcalcli/blob/HEAD/docs/api-auth.md)
-   [Issues Logging into gcalcli](https://github.com/insanum/gcalcli/issues/808)

---
