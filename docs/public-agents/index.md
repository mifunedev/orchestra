---
title: Public Agents
slug: /public-agents
sidebar_position: 11
---

# Public Agents

Public Agents are assistants that have been published for anyone to discover, try, and
copy. Browse the community gallery, chat with a public agent without signing in, and
**remix** (fork) any agent into your own workspace to customize it.

## Overview

-   **Publish to share**: mark one of your assistants public to list it in the gallery
-   **Try before you fork**: open a public agent and chat with it in a read-only preview —
    no account required
-   **Remix (fork)**: copy a public agent into your account as a brand-new assistant you
    fully own and can edit
-   **Discoverable**: the gallery can be sorted by popularity (`fork_count`), recency
    (`published_at`), or last update
-   **Embeddable**: public agents can be embedded in external sites via an embed endpoint

## How It Works

1. **Publish** — from one of your assistants, toggle it public. It becomes visible in the
   public gallery and reachable by its public URL.
2. **Browse / preview** — anyone can list public agents and open one to chat in a
   read-only preview (`GET /api/assistants/public` and `…/public/{id}`).
3. **Remix** — click **Remix** to fork the agent. If you are not signed in you'll be sent
   to log in first (`/login?remix=<agentId>`); after forking you land on your new copy at
   `/assistant/{new_id}`.

## API Reference

The browse and preview endpoints are public (no auth); forking requires authentication.

### List Public Agents

```bash
curl 'https://chat.mifune.dev/api/assistants/public?sort_by=fork_count&limit=20'
```

`sort_by` accepts `fork_count`, `published_at`, or `updated_at`.

### Get a Public Agent

```bash
curl 'https://chat.mifune.dev/api/assistants/public/{assistant_id}'
```

Returns the public assistant configuration (name, description, model, tools) for preview.

### Fork (Remix) a Public Agent

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/assistants/public/{assistant_id}/fork' \
  -H 'Authorization: Bearer <token>'
```

**Response:** `{ "assistant_id": "<your-new-assistant-id>" }` — a private copy in your
workspace that you can edit freely. The original's `fork_count` increments.

## UI Guide

-   **Gallery** — browse published agents and sort by popularity or recency.
-   **Public agent page** — opens a read-only chat preview with a **Remix** action.
-   **After remixing** — you are redirected to your new assistant, where you can change its
    instructions, tools, and model.

## Best Practices

:::tip Review before you publish
A published agent's configuration (instructions, attached tools) is visible to everyone.
Don't publish agents that embed secrets or private context.
:::

## Related Documentation

-   **[Assistants](../assistants/index.md)**: create and configure the assistants you publish
-   **[Prompts](../prompts/index.md)**: share reusable prompts alongside public agents
