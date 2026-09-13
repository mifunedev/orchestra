---
title: "AGENTS.md: File-Based Instructions"
slug: /assistants/agents-md
sidebar_position: 2
---

# AGENTS.md: File-Based Instructions

AGENTS.md is a file-based approach to configuring assistant instructions. Instead of typing instructions into form fields, you create an `AGENTS.md` file in the assistant's file panel. This mirrors the pattern used by tools like Claude Code's `CLAUDE.md`, giving you version-controllable, composable agent configuration.

## How It Works

When an assistant processes a request, Orchestra checks for an `AGENTS.md` file in two places:

1. **Agent mode**: If the assistant has an `AGENTS.md` file in its attached files, that file's content becomes the assistant's instructions.
2. **Thread mode**: If there's no assistant selected but the thread's files contain `AGENTS.md`, its content is injected as instructions for that conversation.

When `AGENTS.md` is detected, it takes priority over any legacy `instructions` or `system_prompt` fields. The default system prompt (with metadata like timezone and language) is still appended automatically.

## Creating AGENTS.md via the Web Interface

### For a New Assistant

1. Navigate to **Assistants** in the sidebar and click **Create New Assistant**
2. Fill in the assistant **Name** and select a **Model**
3. Switch to the **Editor** view using the toggle in the file panel
4. Click **Create File** and name it `AGENTS.md`
5. Write your instructions in Markdown format
6. Click **Save** to create the assistant

:::tip Step-by-Step Guide
For a detailed walkthrough with screenshots, see the [AGENTS.md Workflow Guide](../tutorials/agents-md-workflow.md).
:::

### For an Existing Assistant

1. Open the assistant for editing
2. Switch to the **Editor** view in the file panel
3. Create or edit the `AGENTS.md` file
4. Click **Save** to apply changes

## Migrating from Legacy Instructions

If you have an existing assistant that uses the legacy `instructions` or `system_prompt` fields, the edit form displays a migration card with your current instructions content.

To migrate:

1. Open the assistant for editing
2. You'll see an amber **Legacy Instructions** card showing your current instructions
3. Click **Migrate to AGENTS.md** — this creates an `AGENTS.md` file with your existing instructions content
4. Review and edit the newly created file if needed
5. Click **Save**

After migration, the `AGENTS.md` file takes priority. Your assistant will continue to work exactly as before.

:::info Backwards Compatibility
Existing assistants with legacy `instructions` or `system_prompt` fields continue to work unchanged. Migration is optional — AGENTS.md only takes effect when the file is present.
:::

## AGENTS.md in Agent Mode vs Thread Mode

### Agent Mode (With an Assistant)

When you select an assistant for a conversation, Orchestra checks the assistant's attached files for `AGENTS.md`:

- If found, the file content replaces the assistant's `instructions` field
- The `system_prompt` is reset so the default system prompt applies
- All other assistant configuration (model, tools, metadata) remains unchanged

### Thread Mode (No Assistant)

When chatting without a selected assistant, you can still use AGENTS.md by adding it to the thread's files:

- Upload or create `AGENTS.md` in the thread file panel
- Its content is injected as instructions for that thread
- Supports three content formats: plain string, dictionary with `content` key, or list (joined with newlines)
- Empty content is ignored

## Writing Effective AGENTS.md

Structure your `AGENTS.md` like any good Markdown document:

```markdown
# Sales Assistant

You are a professional sales assistant for Acme Corp.

## Role
- Answer product questions accurately
- Guide customers toward the right solution
- Always be helpful, never pushy

## Product Knowledge
- Widget Pro: $99/mo, best for small teams
- Widget Enterprise: $299/mo, best for organizations
- All plans include 24/7 support

## Rules
- Never discuss competitor products negatively
- Always offer to connect with a human agent for complex issues
- Use the customer's name when available
```

:::tip Composability
Because AGENTS.md is a file, you can maintain it in version control, generate it from templates, or share it across teams. This makes agent configuration reproducible and auditable.
:::

## API Usage

### Creating an Assistant with AGENTS.md

Pass the `AGENTS.md` content in the `files` dictionary when creating an assistant:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/assistant' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Sales Assistant",
  "model": "anthropic:claude-sonnet-4-5",
  "tools": ["search"],
  "files": {
    "AGENTS.md": "# Sales Assistant\n\nYou are a professional sales assistant...\n\n## Rules\n- Always be helpful\n- Never discuss competitors negatively"
  }
}'
```

The `instructions` field is no longer required — `AGENTS.md` in `files` takes its place.

### Thread-Level AGENTS.md via API

You can also inject AGENTS.md at the thread level for conversations without a dedicated assistant:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Help me draft a proposal",
  "files": {
    "AGENTS.md": "You are a proposal writing assistant. Use formal business language and structure proposals with Executive Summary, Scope, Timeline, and Pricing sections."
  },
  "metadata": {
    "current_utc": "2025-01-16T14:30:00Z",
    "timezone": "America/New_York",
    "language": "en-US"
  }
}'
```

### Updating an Assistant's AGENTS.md

```bash
curl -X 'PATCH' \
  'https://chat.mifune.dev/api/assistant/asst_abc123' \
  -H 'Content-Type: application/json' \
  -d '{
  "files": {
    "AGENTS.md": "# Updated Instructions\n\nNew instructions content here..."
  }
}'
```

## Priority and Precedence

When processing a request, Orchestra resolves instructions in this order:

1. **AGENTS.md in assistant files** (highest priority in agent mode)
2. **AGENTS.md in thread files** (highest priority in thread mode)
3. **Legacy `instructions` field** (used when no AGENTS.md is present)
4. **Default system prompt** (always appended with metadata)

## Best Practices

:::tip Use Markdown Structure
Organize your AGENTS.md with headings, lists, and sections. Clear structure helps the AI model follow your instructions more reliably.
:::

:::tip Version Control
Store your AGENTS.md files in Git alongside your project code. This gives you a history of instruction changes and enables team review of agent configurations.
:::

:::tip Keep It Focused
Write instructions that are specific to the assistant's purpose. Avoid overly broad instructions — targeted guidance produces better results.
:::

:::warning File Name Must Be Exact
The file must be named exactly `AGENTS.md` (case-sensitive). Files like `agents.md`, `AGENTS.txt`, or `Agents.md` will not be detected.
:::

## Related Documentation

- **[Assistants](./index.md)**: Full assistant configuration guide
- **[Threads](../threads/index.md)**: Conversation management
- **[Tools](../tools/tools.md)**: Available tool integrations
