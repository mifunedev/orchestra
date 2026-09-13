---
title: Settings & Authentication
slug: /settings
sidebar_position: 12
---

# Settings & Authentication

Settings control your account-wide defaults and the provider API keys Orchestra uses on
your behalf. This page also covers how you sign in, including OAuth with GitHub, Google,
and Azure.

## Overview

-   **Defaults**: pick the model, reasoning effort, sandbox, tools, MCP servers, A2A
    agents, sub-agents, model visibility, timezone, and MCP sandbox URL applied to new
    conversations
-   **Provider keys**: store your own API keys (OpenAI, Anthropic, Groq, xAI, …) so
    requests use your quota; keys are write-only — only their presence/status is returned
-   **OAuth sign-in**: authenticate with GitHub, Google, or Azure in addition to
    email/password
-   **Onboarding state**: a flag tracks whether you've completed first-run onboarding

## Defaults

Your defaults are returned by `GET /api/settings` and updated with a partial PATCH —
send only the fields you want to change.

```bash
# Read current settings + provider-key statuses
curl -X 'GET' 'https://chat.mifune.dev/api/settings' \
  -H 'Authorization: Bearer <token>'

# Update one or more defaults (partial)
curl -X 'PATCH' 'https://chat.mifune.dev/api/settings/default' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{ "model": "claude-opus-4-8", "timezone": "America/Denver" }'
```

Configurable defaults include `model`, `reasoning_effort`, `sandbox`, `tools`, `mcp`,
`a2a`, `subagents`, `model_visibility`, `files`, `timezone`, `mcp_sandbox_url`, and
`onboarding_completed`.

### Reasoning effort

Reasoning models let you trade latency and cost against how much the model thinks before
answering. The accepted values are **model-specific**, so read them from the `reasoning`
map on `GET /api/llm/models` rather than assuming a fixed list:

```bash
curl -X 'GET' 'https://chat.mifune.dev/api/llm/models' \
  -H 'Authorization: Bearer <token>'
```

```json
{
  "default": "openai:gpt-5.6-luna",
  "default_reasoning_effort": null,
  "reasoning": {
    "openai:gpt-5.6-luna": ["none", "low", "medium", "high", "xhigh", "max"],
    "openai:o3": ["low", "medium", "high"]
  }
}
```

A model absent from `reasoning` does not take an effort. Set a default that applies to
every new conversation:

```bash
curl -X 'PATCH' 'https://chat.mifune.dev/api/settings/default' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{ "reasoning_effort": "high" }'
```

Or override it for a single call — `POST /api/llm/invoke` and `POST /api/llm/stream`
both accept `reasoning_effort`, which takes precedence over the saved default. An effort
the named model does not support is rejected with `422`. A *saved* default that a later
model does not support is dropped rather than rejected, so switching models never breaks
your chats. In the chat input, the effort picker appears beside the model badge only for
models that accept one.

## Provider Keys

Bring your own keys so model calls bill to your provider accounts. Keys are never read
back — `GET /api/settings` returns only a per-provider **status** (set / not set).

```bash
# Add or replace a provider key
curl -X 'PUT' 'https://chat.mifune.dev/api/settings/provider-keys' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{ "provider": "openai", "api_key": "sk-…" }'

# Remove a provider key
curl -X 'DELETE' 'https://chat.mifune.dev/api/settings/provider-keys/openai' \
  -H 'Authorization: Bearer <token>'
```

There is also `GET /api/settings/mcp-sandbox-health`, which proxies a health check to
your configured MCP sandbox URL (the browser can't reach it directly).

## Authentication & OAuth

Orchestra supports email/password login plus OAuth with three providers: **GitHub**,
**Google**, and **Azure**.

-   **Start OAuth**: `GET /api/auth/{provider}` redirects you to the provider
    (`provider` ∈ `github` · `google` · `azure`).
-   **Callback**: `GET /api/auth/{provider}/callback` completes sign-in and issues your
    session token.
-   **Current user**: `GET /api/auth/user` returns the authenticated account.

After signing in, generate an [API token](../api-tokens/index.md) for programmatic access
rather than reusing your session credential.

## Best Practices

:::tip Set sensible defaults once
Configure your default model and tools in Settings so every new thread starts the way you
want — no per-conversation setup.
:::

:::tip Prefer your own provider keys
Adding provider keys keeps model usage on your own accounts and quotas, and lets you use
providers the server doesn't supply by default.
:::

## Related Documentation

-   **[API Tokens](../api-tokens/index.md)**: programmatic credentials for the API
-   **[Self-Hosting](../self-hosting/index.md)**: server-level environment configuration
