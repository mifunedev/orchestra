---
title: A2A
slug: /tools/a2a
---

# Agent-to-Agent [(A2A)](https://github.com/mifunedev/a2a-langgraph)

[![Join Slack](https://img.shields.io/badge/Join-Slack-4A154B?logo=slack&logoColor=white)](https://join.slack.com/t/ruska-ai/shared_invite/zt-3l2lnevo6-hOe5ZeoAz~xj7CFAJk2bzg)
[![View API Docs](https://img.shields.io/badge/View-API%20Docs-blue)](https://chat.mifune.dev/api)
[![Follow Social](https://img.shields.io/badge/Follow-Social-black)](https://mifune.dev/socials)

:::warning Under Development
The A2A (Agent-to-Agent) protocol integration is currently under active development. Features and APIs may change. This documentation is provided for reference and early adopters. Check back soon for updates!
:::

[A2A](https://github.com/google/A2A?tab=readme-ov-file#conceptual-overview) is an protocol enabling communication and interoperability between opaque agentic applications.

![Landing Page](https://github.com/ryaneggz/static/blob/main/enso/a2a-enable.gif?raw=true)

## Introduction

Mifune A2A support is based on the [LangGraph Currency Agent w/ A2A Protocol](https://github.com/google/A2A/tree/main/samples/python/agents/langgraph#langgraph-currency-agent-with-a2a-protocol) code sample. A sample A2A server can be found at [Mifune - A2A Server](https://github.com/mifunedev/a2a-langgraph).

## Quick Start

1. Open the Tool Selector modal then click the icon that displays the **Add A2A Configuration** panel.

    ![Configure A2A](https://github.com/ryaneggz/static/blob/main/enso/open-a2a.png?raw=true)

2. Edit the default A2A Configuration displayed in the JSON Editor. When finished press the **Save Configuration** at the bottom of the panel.

    This will store the configuration in your `localStorage` with the key `a2a-config`.

    ![Edit Configuration](https://github.com/ryaneggz/static/blob/main/enso/a2a-editor.png?raw=true)

3. After **Save Configuration** you should see the A2A server tool information fetched from the defined MCP servers.

    ![A2A Info](https://github.com/ryaneggz/static/blob/main/enso/a2a-info.png?raw=true)

4. Now that the configuration is saved, close the panel, edit the input, and click submit. You will see tool executions appear in the Thread following the **UserMessage** and before the **AIMessage**. Click on the **ToolMessage** to view its execution details.

    > _What is the exchange rate between USD and GBP?_

    ![A2A Tool Execution](https://github.com/ryaneggz/static/blob/main/enso/a2a-tool.png?raw=true)

## Example [API Usage](https://chat.mifune.dev/api#/Thread/Create_New_Thread_api_threads_post):

#### Fetch A2A Server Information

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/tools/a2a/info' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "a2a": {
    "orchestra_a2a": {
      "agent_card_path": "/.well-known/agent.json",
      "base_url": "https://a2a.mifune.dev"
    }
  }
}'
```

#### Request: `Create New Thread`

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "a2a": {
    "currency_agent": {
      "agent_card_path": "/.well-known/agent.json",
      "base_url": "https://a2a.mifune.dev"
    }
  },
  "images": [],
  "model": "openai-gpt-4o-mini",
  "query": "Current USD to CAD rate?",
  "system": "You are a helpful assistant.",
  "tools": []
}' | jq
```

### Response JSON: `Create New Thread`

```json
{
    "thread_id": "09cf5ec9-c44b-432f-904c-d41a7eb8a817",
    "answer": {
        "content": "The exchange rate between USD and CAD is 1.3885. This means that 1 USD is equivalent to 1.3885 CAD."
        //... Response Metadata
    }
}
```
