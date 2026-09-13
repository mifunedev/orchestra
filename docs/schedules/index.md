---
title: Schedules
slug: /schedules
sidebar_position: 6
---

# Schedules

Schedules let you run assistants on a recurring basis using cron expressions. Use them to automate tasks like daily report generation, periodic data analysis, monitoring, and content workflows.

## Overview

-   **Cron-Based Timing**: Define when tasks run using standard 5-field cron expressions
-   **Agent Integration**: Each schedule runs a specific assistant with its configured model, tools, and instructions
-   **Multiple Views**: View schedules as a calendar, table, or card grid
-   **Execution History**: Track past runs with status, timing, and error details
-   **Custom or Inherited Config**: Override an assistant's model and tools per-schedule, or inherit its defaults

![Schedules calendar view with status cards and month navigation](../img/schedules/01-schedules-list.png)

## Creating a Schedule

### Via Web Interface

1. Navigate to **Schedules** from the sidebar
2. Click **Create Schedule** and select the assistant to run

![Select an agent dialog showing available assistants for scheduling](../img/schedules/02-create-schedule-select-agent.png)

3. Fill in the three-step form:

![Schedule creation form with Details, When, and What steps](../img/schedules/03-create-schedule-form.png)

**Step 1 — Schedule Details:**
- **Name** (required): A descriptive title for the schedule
- **Description** (optional): Notes about what this schedule does
- **Enabled**: Toggle the schedule on or off

**Step 2 — When to Run:**
- Choose a **preset** (e.g., "Every hour", "Daily at 9 AM", "Weekly Monday 9 AM") or build a **custom** cron expression
- The cron builder shows a human-readable preview and the next scheduled runs
- Minimum interval is **1 hour**

**Step 3 — What to Execute:**
- **Message** (required): The task prompt sent to the assistant (e.g., "Check weather in Dallas and summarize")
- **Configuration mode**:
    - **Inherit from Agent**: Use the assistant's current model, system prompt, and tools
    - **Custom Configuration**: Override with different model, prompt, or tools for this schedule

4. Click **Save** to create the schedule

:::tip Inherit vs Custom
Use **Inherit from Agent** when you want the schedule to automatically pick up any changes to the assistant's configuration. Use **Custom** when the scheduled task needs different settings than the assistant's defaults.
:::

### Via API

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/schedules' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "title": "Daily Weather Check",
  "trigger": {
    "type": "cron",
    "expression": "0 9 * * *"
  },
  "task": {
    "input": {
      "messages": [
        {
          "role": "user",
          "content": "Check the weather in Dallas and give me a summary"
        }
      ]
    },
    "model": "anthropic:claude-sonnet-4-5",
    "tools": ["web_search"],
    "metadata": {
      "agent_id": "your-agent-id",
      "assistant_id": "your-agent-id",
      "enabled": true
    }
  }
}'
```

**Response (201 Created):**

```json
{
    "job": {
        "id": "schedule-uuid",
        "next_run_time": "2026-02-21T09:00:00Z"
    }
}
```

## Editing a Schedule

### Via Web Interface

1. On the Schedules page, find the schedule you want to edit
2. Click the **menu icon** on the schedule card and select **Edit**
3. Update any fields in the three-step form
4. Click **Save**

### Via API

```bash
curl -X 'PUT' \
  'https://chat.mifune.dev/api/schedules/{job_id}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "title": "Updated Weather Check",
  "trigger": {
    "type": "cron",
    "expression": "0 */6 * * *"
  }
}'
```

## Deleting a Schedule

### Via Web Interface

1. Click the **menu icon** on the schedule card and select **Delete**
2. Confirm deletion in the dialog

### Via API

```bash
curl -X 'DELETE' \
  'https://chat.mifune.dev/api/schedules/{job_id}' \
  -H 'Authorization: Bearer <token>'
```

**Response:** `204 No Content`

## Listing Schedules

### Via API

```bash
curl -X 'GET' \
  'https://chat.mifune.dev/api/schedules' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <token>'
```

**Response:**

```json
{
    "schedules": [
        {
            "id": "schedule-uuid",
            "title": "Daily Weather Check",
            "trigger": {
                "type": "cron",
                "expression": "0 9 * * *"
            },
            "task": { },
            "next_run_time": "2026-02-21T09:00:00Z"
        }
    ]
}
```

## Viewing Execution History

The Schedules page offers three view modes for tracking schedule status and execution history:

-   **Calendar View**: Shows scheduled runs and past executions as calendar events, with color-coded status indicators
-   **Table View**: Lists schedules with columns for name, status, agent, last run, and next run. Toggle between past and future runs
-   **Card View**: Displays schedule cards with status badges, next run time, task summary, model, and agent information

![Table view with Past/Future toggle and filter controls](../img/schedules/04-schedules-table.png)

Each execution record includes:
- **Status**: `scheduled`, `running`, `success`, or `failure`
- **Scheduled time**: When the run was supposed to execute
- **Started/Completed times**: Actual execution timestamps
- **Error message**: Details if the run failed
- **Thread ID**: Link to the conversation thread created by the execution

Status cards at the top of the page show counts for **Total**, **Active** (running in the next 24 hours), **Upcoming** (beyond 24 hours), and **Overdue** schedules.

## Cron Expression Format

Schedules use the standard 5-field cron format:

```
minute  hour  day_of_month  month  day_of_week
```

| Field | Values | Special Characters |
| --- | --- | --- |
| Minute | 0-59 | `*`, `*/N` |
| Hour | 0-23 | `*`, `*/N` |
| Day of Month | 1-31 | `*` |
| Month | 1-12 | `*` |
| Day of Week | 0-6 (Sun-Sat) | `*` |

**Common examples:**

| Expression | Description |
| --- | --- |
| `0 9 * * *` | Daily at 9:00 AM |
| `0 */2 * * *` | Every 2 hours |
| `0 */6 * * *` | Every 6 hours |
| `0 18 * * 1` | Every Monday at 6:00 PM |
| `0 9 1 * *` | First of every month at 9:00 AM |
| `30 8 * * 1-5` | Weekdays at 8:30 AM |

:::warning Minimum Interval
Schedules must run at least **once per hour**. The minute field cannot be `*` or `*/1`, and the hour field cannot be `*` alone. This prevents excessive execution and ensures reasonable resource usage.
:::

## Agent-Scoped Schedules

You can also manage schedules from an assistant's detail page. The agent-specific schedules panel shows only schedules linked to that assistant, with the same create, edit, and delete capabilities.

This is useful when you want to see all automated tasks for a specific agent in one place.

## Related Documentation

-   **[Assistants](../assistants/index.md)**: Create the agents that schedules execute
-   **[Threads](../threads/index.md)**: Each schedule execution creates a conversation thread
-   **[Tools](../tools/tools.md)**: Configure tools available to scheduled runs

---

**Next Steps**: Create an assistant and set up your first schedule to automate recurring tasks!
