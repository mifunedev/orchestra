---
title: Threads
slug: /threads
sidebar_position: 4
---

# Threads

Threads are stateful conversations that maintain message history and context. Every interaction in Orchestra happens within a thread, whether you're chatting directly or using an assistant.

## Overview

Threads represent the conversation layer of Orchestra. They:

-   **Maintain Context**: Keep track of all messages, both from users and AI
-   **Store Tool Executions**: Record when and how tools were used
-   **Support File Attachments**: Allow documents and images to be part of the conversation
-   **Enable Model Switching**: Change AI models mid-conversation
-   **Persist History**: Save conversations for future reference

## Key Concepts

### What is a Thread?

A thread is a conversation session between a user and an AI model (or assistant). Think of it like a chat window - each thread is independent and maintains its own history.

**Thread Components:**

-   **Messages**: User messages and AI responses
-   **Tool Calls**: Logs of tool executions (search queries, MCP calls, etc.)
-   **Metadata**: Custom data attached to the thread (user ID, tags, etc.)
-   **Files**: Uploaded documents or images referenced in the conversation
-   **Configuration**: Model selection, system prompts, tool access

### Thread Lifecycle

```
┌─────────────┐
│   Created   │ ← New thread starts
└──────┬──────┘
       ↓
┌─────────────┐
│   Active    │ ← Messages being exchanged
└──────┬──────┘
       ↓
┌─────────────┐
│  Archived   │ ← Thread completed (optional)
└──────┬──────┘
       ↓
┌─────────────┐
│   Deleted   │ ← Permanently removed
└─────────────┘
```

1. **Creation**: Thread is created when you send the first message or explicitly via API
2. **Active Use**: Messages are sent and received, tools are executed
3. **Archive** (optional): Thread is marked as completed but kept for reference
4. **Deletion**: Thread and all its messages are permanently removed

### Threads vs Assistants

| Aspect            | Threads                     | Assistants                     |
| ----------------- | --------------------------- | ------------------------------ |
| **Purpose**       | Conversation container      | Reusable AI configuration      |
| **Lifespan**      | Single conversation         | Persistent across many threads |
| **Configuration** | Can change mid-conversation | Fixed configuration            |
| **Scope**         | Specific interaction        | General purpose                |

## Creating Threads

### Via Web Interface

The web interface automatically creates threads for you:

1. **Direct Chat**: Type a message in the main chat - a new thread starts automatically
2. **From Assistant**: Click an assistant in the sidebar - a new thread starts with that assistant's configuration
3. **New Thread Button**: Click the "New Thread" button to explicitly start fresh

### Via API

Create a thread programmatically:

#### Simple Thread

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Explain quantum computing in simple terms",
  "model": "anthropic:claude-sonnet-4-5",
  "system": "You are a helpful science educator."
}'
```

#### Thread with Assistant

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "assistant_id": "asst_abc123",
  "query": "What are the best practices for Python error handling?"
}'
```

#### Thread with Tools

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "What is the current price of Bitcoin?",
  "model": "openai:gpt-4o",
  "tools": ["search"],
  "metadata": {
    "current_utc": "2025-01-16T15:30:00Z",
    "timezone": "America/Denver",
    "language": "en-US"
  }
}'
```

**Response:**

```json
{
  "thread_id": "thread_xyz789",
  "answer": {
    "content": "According to current market data...",
    "role": "assistant",
    "tool_calls": [
      {
        "id": "call_1",
        "type": "function",
        "function": {
          "name": "search_engine",
          "arguments": "{\"query\":\"Bitcoin price USD\"}"
        }
      }
    ]
  },
  "messages": [
    {
      "role": "user",
      "content": "What is the current price of Bitcoin?"
    },
    {
      "role": "assistant",
      "content": "According to current market data...",
      "tool_calls": [...]
    }
  ],
  "created_at": "2025-01-16T10:30:00Z"
}
```

## Managing Threads

### Viewing Thread History

**Via Web Interface:**

-   The sidebar shows all your threads
-   Click any thread to load its full conversation history
-   Threads display:
    -   Preview of the first message
    -   Timestamp (e.g., "2 hours ago")
    -   Number of file attachments
    -   Model used

**Via API:**

Get a specific thread:

```bash
curl -X 'GET' \
  'http://localhost:8000/api/thread/thread_xyz789' \
  -H 'accept: application/json'
```

List all your threads:

```bash
curl -X 'GET' \
  'http://localhost:8000/api/threads?limit=20&offset=0' \
  -H 'accept: application/json'
```

### Adding Messages to a Thread

Continue an existing conversation:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread/thread_xyz789/message' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Can you elaborate on that last point?"
}'
```

The AI will respond with full context from the previous messages in the thread.

### Deleting Threads

**Via Web Interface:**

-   Hover over a thread in the sidebar
-   Click the trash icon
-   Confirm deletion

**Via API:**

```bash
curl -X 'DELETE' \
  'http://localhost:8000/api/thread/thread_xyz789'
```

!!! warning "Permanent Deletion"
Deleting a thread removes all messages, tool execution logs, and associated data permanently. This cannot be undone.

## Thread Features

### Message Persistence

All messages in a thread are automatically saved:

-   User messages
-   AI responses
-   Tool execution results
-   System messages

This allows you to:

-   Review conversation history
-   Resume conversations later
-   Audit tool usage
-   Analyze patterns

### File Attachments

Threads support file uploads for multi-modal interactions:

**Supported File Types:**

-   **Images**: PNG, JPG, WEBP (for vision-capable models)
-   **Documents**: PDF, TXT, MD, CSV (for RAG and analysis)
-   **Audio**: WAV, MP3 (for transcription)

**Attaching Files via API:**

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Analyze this image and describe what you see",
  "model": "openai:gpt-4o",
  "images": [
    "https://example.com/image.jpg"
  ]
}'
```

### Tool Execution History

When tools are used in a thread, Orchestra logs:

-   Which tool was called
-   What arguments were passed
-   The tool's response
-   Any errors encountered

This visibility helps with:

-   **Debugging**: Understand why a tool call failed
-   **Auditing**: Track what external systems were accessed
-   **Cost Management**: See how many API calls were made

**Example Tool Call Log:**

```json
{
    "tool_call": {
        "id": "call_abc123",
        "type": "function",
        "function": {
            "name": "search_engine",
            "arguments": {
                "query": "latest AI news",
                "num_results": 5
            }
        }
    },
    "tool_response": {
        "results": [
            {
                "title": "New AI Model Released",
                "url": "https://example.com/news",
                "snippet": "..."
            }
        ]
    },
    "duration_ms": 1250
}
```

### Model Switching

Change models mid-conversation to optimize for different tasks:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread/thread_xyz789/message' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Now summarize our conversation so far",
  "model": "anthropic:claude-haiku-4-5"
}'
```

**Use Cases:**

-   Start with Sonnet for complex reasoning, switch to Haiku for summary
-   Use GPT-4o for image analysis, then switch to Claude for text generation
-   Experiment with different models to compare responses

## Advanced Features

### Thread Metadata

Thread metadata provides context to the AI model through system prompts. The following fields are supported:

```bash
{
  "query": "Help me debug this code",
  "metadata": {
    "current_utc": "2025-01-16T18:45:00Z",
    "timezone": "Europe/London",
    "language": "en-GB"
  }
}
```

**Supported metadata fields:**

-   **`current_utc`**: Current timestamp (ISO 8601) - provides temporal context for time-aware responses
-   **`timezone`**: User's timezone (e.g., "America/Denver", "Asia/Tokyo") - helps with scheduling and time references
-   **`language`**: User's language (e.g., "en-US", "ja-JP") - guides response language and localization

These values are automatically appended to the system prompt, giving the AI model contextual awareness.

### Streaming Responses

For real-time interaction, use streaming to receive responses as they're generated:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/thread/stream' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Write a long essay about AI safety",
  "model": "anthropic:claude-sonnet-4-5"
}' \
  --no-buffer
```

The response streams back token by token, providing a more interactive experience.

### Multi-Modal Threads

Combine text, images, and audio in a single thread:

```bash
{
  "query": "Transcribe this audio and analyze the image",
  "model": "openai:gpt-4o",
  "images": ["https://example.com/chart.png"],
  "audio": ["https://example.com/recording.mp3"]
}
```

## Best Practices

!!! tip "Thread Naming"
While threads auto-generate previews, use meaningful first messages. Instead of "Hello", try "Help me design a database schema for a blog platform."

!!! tip "Context Management"
Long threads can slow down responses and increase costs. For unrelated topics, start a new thread rather than continuing the same conversation.

!!! info "Tool Selection"
Only include tools you need for the specific thread. Tools are evaluated on every message, so unnecessary tools add latency.

!!! tip "Model Selection Strategy" - **Exploration**: Start with a capable model (Sonnet, GPT-4o) - **Iteration**: Switch to faster models (Haiku) once you know what you want - **Production**: Use the most cost-effective model that meets quality requirements

!!! warning "File Size Limits"
Large file uploads may have size restrictions. Check your instance's limits or consider using [Storage](../storage/index.md) for large document collections.

## API Reference

For complete thread API documentation:

-   [Thread API Reference](http://localhost:8000/api#/Thread)
-   [Create Thread](http://localhost:8000/api#/Thread/Create_New_Thread)
-   [Get Thread](http://localhost:8000/api#/Thread/Get_Thread)
-   [List Threads](http://localhost:8000/api#/Thread/List_Threads)
-   [Add Message](http://localhost:8000/api#/Thread/Add_Message_to_Thread)
-   [Delete Thread](http://localhost:8000/api#/Thread/Delete_Thread)

## Related Documentation

-   **[Assistants](../assistants/index.md)**: Pre-configure threads with specific behaviors
-   **[Storage](../storage/index.md)**: Manage files and documents
-   **[Tools](../tools/tools.md)**: Extend thread capabilities with integrations
-   **[Getting Started](../getting-started.md)**: Learn the basics of using threads

---

**Ready to start?** Head to the [Getting Started Guide](../getting-started.md) to create your first thread!
