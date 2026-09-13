---
title: AGENTS.md
slug: /agents-md
sidebar_position: 4
---

# AGENTS.md

Configure AI agent behavior through a simple markdown convention — just like [Claude Code's CLAUDE.md](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [OpenAI Codex's AGENTS.md](https://openai.com/index/introducing-codex/).

## Overview

AGENTS.md is a special file that lets you define agent instructions using markdown. When you attach a file named `AGENTS.md` to an assistant or include it in a thread's files, Orchestra automatically extracts its content and injects it as the agent's instructions.

This provides a portable, version-controllable way to configure agent behavior without modifying API calls or UI settings. Teams can store `AGENTS.md` files alongside their code and have agents that automatically follow project-specific conventions.

## How It Works

Orchestra checks for an `AGENTS.md` file in two places:

### 1. Agent Mode (Assistants)

When an assistant has `AGENTS.md` in its `files` dictionary:

1. The assistant is loaded from the database
2. `AGENTS.md` content is extracted from `assistant.files`
3. The assistant's `system_prompt` is cleared (the default system prompt is used instead)
4. The assistant's `instructions` field is set to the AGENTS.md content
5. If the assistant already had an `instructions` value, it is overridden and a warning is logged

### 2. Thread Mode (Direct Chat)

When a thread request includes `AGENTS.md` in `input.files`:

1. The thread request is processed normally
2. `AGENTS.md` content is extracted from `input.files`
3. The request's `instructions` field is set to the AGENTS.md content
4. The default system prompt is applied as usual

In both modes, if no `AGENTS.md` file is found, the assistant or thread behaves exactly as it did before — no behavior changes.

## Precedence Rules

- **AGENTS.md overrides `instructions`**: If an assistant has both an `instructions` field and an `AGENTS.md` file, the AGENTS.md content wins. A warning is logged when this happens.
- **AGENTS.md clears `system_prompt`**: In agent mode, when AGENTS.md is detected the assistant's `system_prompt` is set to `None`, which causes the default system prompt to be used. This ensures AGENTS.md content goes into the `instructions` field without conflicting with `system_prompt`.
- **Only one of `system_prompt` or `instructions`**: The Assistant model enforces that only one of these fields can be set at construction time. AGENTS.md injection happens after construction, safely setting `instructions` without triggering this validation.
- **Exact filename match**: Only the key `AGENTS.md` (case-sensitive, exact match) is recognized. Files like `agents.md`, `AGENTS.MD`, or `my-agents.md` are ignored.

## Supported Formats

The `AGENTS.md` file content can be provided in several formats, accommodating different API clients and frontends:

| Format | Example | Description |
|--------|---------|-------------|
| Plain string | `"AGENTS.md": "# Instructions\nBe helpful."` | Direct string content |
| Dict with string content | `"AGENTS.md": {"content": "# Instructions\nBe helpful."}` | Object with `content` key as string |
| Dict with list content | `"AGENTS.md": {"content": ["# Instructions", "Be helpful."]}` | Object with `content` key as list of strings (joined with newlines) |
| List of strings | `"AGENTS.md": ["# Instructions", "Be helpful."]` | List of strings (joined with newlines) |

Empty strings, whitespace-only content, and `None` values are treated as if no AGENTS.md file was provided.

## API Usage

### Creating an Assistant with AGENTS.md

Attach `AGENTS.md` as a file when creating an assistant:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/assistant' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Project Agent",
  "tools": [],
  "files": {
    "AGENTS.md": "# Project Agent\n\nYou are a senior engineer working on our project.\n\n## Rules\n- Follow PEP 8 conventions\n- Always write tests for new code\n- Use type hints for all functions\n\n## Persona\nYou are concise, pragmatic, and focused on shipping quality code."
  }
}'
```

The assistant will use the AGENTS.md content as its instructions for every thread.

### Updating an Assistant's AGENTS.md

Update the file content to change behavior:

```bash
curl -X 'PATCH' \
  'http://localhost:8000/api/assistant/asst_abc123' \
  -H 'Content-Type: application/json' \
  -d '{
  "files": {
    "AGENTS.md": "# Updated Instructions\n\nNew behavior goes here."
  }
}'
```

### Thread Mode — Sending AGENTS.md with a Message

Include `AGENTS.md` in the thread input files for per-conversation instructions:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "input": {
    "messages": [{"role": "user", "content": "Review this pull request."}],
    "files": {
      "AGENTS.md": "# Code Reviewer\n\nYou review code for bugs, security issues, and style.\nBe thorough but concise."
    }
  }
}'
```

## Example AGENTS.md Content

Here is an example showing how to define an agent's persona, rules, and behavior:

```markdown
# DevOps Assistant

You are a DevOps engineer specializing in cloud infrastructure
and CI/CD pipelines.

## Persona
- Pragmatic and security-conscious
- Prefer infrastructure-as-code over manual changes
- Always explain the "why" behind recommendations

## Rules
- Never suggest disabling security features
- Always recommend least-privilege IAM policies
- Prefer managed services over self-hosted when appropriate
- Include rollback plans for infrastructure changes

## Knowledge
- AWS (primary), GCP, Azure
- Terraform, Pulumi
- GitHub Actions, GitLab CI
- Docker, Kubernetes

## Response Format
1. Summarize the current situation
2. Propose a solution with rationale
3. Provide implementation steps
4. Note any risks or trade-offs
```

## Storing AGENTS.md via Memories

Instead of attaching an `AGENTS.md` file manually to each thread, you can store it as a **[Memory](../memories/index.md)**. This makes your AGENTS.md instructions apply to **every conversation automatically**.

When stored as a memory:

1. Your AGENTS.md content is persisted in the [Memories](../memories/index.md) system
2. Orchestra's `prepare_memory_files()` retrieves it at the start of every conversation
3. The content is injected as a file into the agent's context — identical to attaching it manually
4. You can enable or disable the memory at any time without deleting it

This is the **recommended approach** for personal AGENTS.md instructions, since it removes the need to attach the file each time you start a new thread.

:::tip Get Started
For a step-by-step guide on storing AGENTS.md as a memory, see [Memory Tutorial — Step 6: Store AGENTS.md as a Memory](../memories/tutorial.md#step-6-store-agentsmd-as-a-memory).
:::

Use the file-attachment approach (described above) when you need different AGENTS.md instructions per assistant or per thread, and the memories approach when you want a single set of instructions applied everywhere.

## Connection to DeepAgents Memory

Under the hood, Orchestra uses [LangChain DeepAgents](https://docs.langchain.com/oss/python/deepagents/customization#memory) for agent orchestration. The `instructions` field maps directly to the agent's instruction context, which the DeepAgents framework uses to guide the agent's reasoning and tool usage.

When AGENTS.md content is injected as `instructions`, it becomes part of the agent's core context — influencing how it interprets user messages, selects tools, and generates responses. This is the same mechanism used when you set `instructions` directly via the API.

## Related Documentation

- **[Assistants](../assistants/index.md)**: Create and manage assistants
- **[Threads](../threads/index.md)**: Conversation management
- **[Memories](../memories/index.md)**: Store AGENTS.md as a persistent memory
- **[Memory Tutorial](../memories/tutorial.md)**: Step-by-step guide including AGENTS.md as a memory
- **[AGENTS.md Tutorial](./tutorial.md)**: Step-by-step walkthrough with screenshots
- **[Tools](../tools/tools.md)**: Available tool integrations

---

**Next Steps**: Follow the [AGENTS.md Tutorial](./tutorial.md) to create your first AGENTS.md-powered assistant, or store your AGENTS.md as a [Memory](../memories/tutorial.md#step-6-store-agentsmd-as-a-memory) to apply it everywhere automatically!
