---
title: Projects
slug: /projects
sidebar_position: 7
---

# Projects

Projects let you organize conversations and files into focused workspaces. Use them to group related threads, attach data sources, and keep your work structured.

## Overview

-   **Workspace Organization**: Group related conversations under a single project
-   **Thread Association**: Link threads to projects so they appear together in the sidebar
-   **Data Sources**: Attach files and web content as project knowledge
-   **Scoped Conversations**: Start chats within a project context so new threads are automatically associated

![Projects listed in the sidebar](../img/projects/01-projects-sidebar.png)

## Creating a Project

### Via Web Interface

1. In the sidebar, find the **Projects** section
2. Click **Create Project**
3. Enter a **Name** (required) and optional **Description**
4. Click **Create**

The new project appears in the sidebar under Projects.

![Create Project dialog](../img/projects/02-create-project.png)

### Via API

```bash
curl -X 'POST' \
  'http://localhost:8000/api/projects' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "name": "ML Experiments",
  "description": "Machine learning research and experiments"
}'
```

**Response:**

```json
{
    "project_id": "project-uuid"
}
```

## Managing Projects

### Editing a Project

1. Click on a project in the sidebar to open it
2. Click the **settings icon** next to the project name
3. Update the name or description
4. Click **Save**

![Edit Project Settings dialog](../img/projects/04-edit-project.png)

**Via API:**

```bash
curl -X 'PUT' \
  'http://localhost:8000/api/projects/{project_id}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "name": "Updated Project Name",
  "description": "Updated description"
}'
```

### Deleting a Project

1. In the sidebar, hover over the project
2. Click the menu and select **Delete**

:::warning Cascading Delete
Deleting a project also deletes all its associated sources and documents. Threads are not deleted but will be unlinked from the project.
:::

**Via API:**

```bash
curl -X 'DELETE' \
  'http://localhost:8000/api/projects/{project_id}' \
  -H 'Authorization: Bearer <token>'
```

### Listing Projects

```bash
curl -X 'POST' \
  'http://localhost:8000/api/projects/search' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "limit": 200,
  "offset": 0
}'
```

## Associating Threads with Projects

You can link existing threads to a project, or create new threads within a project context.

### Moving an Existing Thread

1. In the sidebar, right-click on a thread
2. Select **Add to Project** or **Move to Project**
3. Choose the target project
4. To unlink, select **Remove from project**

### Starting a New Conversation in a Project

1. Click on a project in the sidebar to open it
2. Start typing in the chat input — new threads are automatically associated with the project
3. The project name appears as a badge in the chat input area

The sidebar intelligently groups threads: project-associated threads appear under their respective project, while unlinked threads appear in the general Threads section.

![Project detail view with associated threads](../img/projects/03-project-detail.png)

## Project-Scoped Conversations

When you open a project and start chatting, the conversation is automatically scoped to that project:

-   A **project badge** with the project name appears in the chat input
-   New threads inherit the project association
-   You can click the **X** on the project badge to remove the association

This scoping persists across page reloads, so you can continue working within a project context seamlessly.

## Data Sources

Projects can have attached data sources that provide additional context:

### Adding Sources

1. In the sidebar, hover over a project and click **Add Source**
2. Choose the source type (file upload, web scrape, etc.)
3. Provide the content and click **Save**

**Via API:**

```bash
curl -X 'POST' \
  'http://localhost:8000/api/projects/{project_id}/sources' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '[{
    "type": "web_scrape",
    "content": {
      "urls": ["https://example.com/docs"]
    }
  }]'
```

### Removing Sources

```bash
curl -X 'DELETE' \
  'http://localhost:8000/api/projects/{project_id}/sources/{source_id}' \
  -H 'Authorization: Bearer <token>'
```

## Related Documentation

-   **[Assistants](../assistants/index.md)**: Create agents to use within projects
-   **[Threads](../threads/index.md)**: Conversation management
-   **[Storage](../storage/index.md)**: File and knowledge base management

---

**Next Steps**: Create a project and start organizing your conversations!
