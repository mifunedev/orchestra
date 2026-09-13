---
title: Prompts
slug: /prompts
sidebar_position: 9
---

# Prompts

The Prompt Library is a personal and shared repository of reusable system prompts. Create prompts once, version them over time, and attach them to assistants or threads without rewriting the same instructions repeatedly.

## Overview

-   **Versioned by default**: Every save creates a new revision; older versions are preserved and retrievable
-   **Public or private**: Mark a prompt public to share it with the community, or keep it private to your account
-   **Raw text access**: Each prompt has a public raw-text endpoint (`GET /api/prompts/{id}/raw`) for programmatic use
-   **Search & filter**: Browse by name, content, or visibility (All / My Prompts / Public)
-   **Full CRUD API**: Create, revise, search, toggle visibility, and delete revisions via REST

## How It Works

1. **Create a prompt** — Supply a name and markdown/text content. A UUID is assigned and the first revision (`v1`) is stored.
2. **Revise** — `POST /api/prompts/{id}/v` saves new content as the next revision while keeping all prior revisions intact.
3. **Retrieve a specific version** — Search with `filter: { id, v }` to pin to an exact revision.
4. **Toggle public** — `PUT /api/prompts/{id}/public` toggles the prompt between private and public. Public prompts appear in the community listing and are accessible via the raw endpoint without authentication.

## Prompt Data Model

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Unique prompt identifier |
| `name` | string | Human-readable prompt name |
| `content` | string | The prompt body (markdown supported) |
| `public` | boolean | Whether the prompt is publicly visible |
| `v` | integer | Revision number (auto-incremented) |

## API Reference

All endpoints require a Bearer token in the `Authorization` header unless noted.

### Create a Prompt

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/prompts' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Concise Summariser",
  "content": "Summarise the user'\''s input in three bullet points. Be concise and factual."
}'
```

**Response (`200 OK`):**

```json
{ "prompt_id": "a1b2c3d4-..." }
```

### Search / List Prompts

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/prompts/search' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{ "query": "", "limit": 10, "offset": 0, "filter": {} }'
```

Pass `"filter": { "id": "<prompt_id>" }` to fetch a single prompt, or add `"v": <n>` to pin a specific revision.

### Create a Revision

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/prompts/{prompt_id}/v' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Concise Summariser",
  "content": "Summarise in three bullet points. Use plain language."
}'
```

**Response:**

```json
{ "prompt_id": "a1b2c3d4-...", "v": 2 }
```

### List Revisions

```bash
curl -X 'GET' \
  'https://chat.mifune.dev/api/prompts/{prompt_id}/v' \
  -H 'Authorization: Bearer <token>'
```

### Delete a Revision

```bash
curl -X 'DELETE' \
  'https://chat.mifune.dev/api/prompts/{prompt_id}/v/{v}' \
  -H 'Authorization: Bearer <token>'
```

Returns `204 No Content`.

### Toggle Public Visibility

```bash
curl -X 'PUT' \
  'https://chat.mifune.dev/api/prompts/{prompt_id}/public' \
  -H 'Authorization: Bearer <token>'
```

**Response:**

```json
{ "prompt_id": "a1b2c3d4-...", "public": true }
```

### View Raw Prompt (No Auth)

```bash
curl 'https://chat.mifune.dev/api/prompts/{prompt_id}/raw'
```

Returns the latest public revision as `text/plain`. Returns `404` if the prompt is not public.

## UI Guide

Navigate to `/prompts` from the sidebar to access the Prompt Library.

### Prompts List (`/prompts`)

-   **All Prompts** — shows every prompt visible to you (private + public)
-   **My Prompts** — filters to your private prompts
-   **Public** — shows prompts marked public
-   Search by name or content using the top search bar
-   Click a prompt card to open the editor

### Create Prompt (`/prompts/create`)

-   Enter a name (2+ characters) and content (10+ characters)
-   Write or paste prompt content directly, or load from a URL
-   Toggle the **Public** switch to share with others
-   A fullscreen Monaco editor is available for longer prompts

### Edit Prompt (`/prompts/{id}/edit`)

-   Same form as create, pre-filled with existing content
-   Saving creates a new revision — previous versions remain accessible via the API

## Best Practices

:::tip Keep Prompts Focused
Write one prompt per distinct role or task. Short, specific prompts are easier to revise and combine.
:::

:::tip Use Versioning Intentionally
Add a revision only when the behaviour changes meaningfully. Use descriptive names so collaborators understand the purpose at a glance.
:::

:::tip Share Thoughtfully
Mark a prompt public only when it has no domain-specific secrets or confidential context. Public prompts are readable by anyone via the raw endpoint without authentication.
:::

## Related Documentation

-   **[Assistants](../assistants/index.md)**: Attach prompts to reusable assistant configurations
-   **[Skills](../skills/index.md)**: Complement prompts with persistent skill instructions
-   **[Memories](../memories/index.md)**: Layer memory context on top of prompts

---

**Next Steps**: Create your first prompt at `/prompts/create`, then reference it when configuring an [Assistant](../assistants/index.md).
