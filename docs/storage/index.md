---
title: Storage
slug: /storage
sidebar_position: 5
---

# Storage

Orchestra provides S3-compatible object storage for managing files and documents. Combined with RAG (Retrieval-Augmented Generation) capabilities, storage enables you to build knowledge-enhanced AI agents.

## Overview

The storage system in Orchestra serves multiple purposes:

-   **File Attachments**: Upload files to include in thread conversations
-   **Document Management**: Store and organize documents for retrieval
-   **RAG Integration**: Create searchable document indexes for knowledge-enhanced responses
-   **S3 Compatibility**: Use standard S3 APIs for programmatic access (powered by MinIO)

## Storage Capabilities

### File Attachments in Threads

Upload files directly to threads for multi-modal interactions:

-   **Images**: For vision-capable models (GPT-4o, Claude models)
-   **Documents**: PDFs, text files for analysis and summarization
-   **Data Files**: CSVs, JSON for data analysis tasks

**Example:**

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/thread' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "Summarize the key points from this document",
  "model": "anthropic:claude-sonnet-4-5",
  "images": ["https://storage.mifune.dev/documents/report.pdf"]
}'
```

### Document Upload for RAG

Upload documents to create searchable knowledge bases:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/storage/upload' \
  -H 'accept: application/json' \
  -F 'file=@/path/to/document.pdf' \
  -F 'project_id=proj_abc123'
```

**Supported Formats:**

-   PDF documents
-   Text files (.txt, .md)
-   Microsoft Office (`.docx`, `.xlsx`, `.pptx`)
-   CSV and JSON data files
-   HTML web pages

### S3-Compatible API

Orchestra uses MinIO to provide S3-compatible object storage. This means you can use standard S3 tools and libraries:

**AWS CLI Example:**

```bash
# Configure AWS CLI to point to your Orchestra instance
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set default.region us-east-1

# Upload a file
aws s3 cp document.pdf s3://my-bucket/documents/ \
  --endpoint-url https://storage.chat.mifune.dev

# List files
aws s3 ls s3://my-bucket/documents/ \
  --endpoint-url https://storage.chat.mifune.dev
```

**Python SDK (boto3) Example:**

```python
import boto3

s3_client = boto3.client(
    's3',
    endpoint_url='https://storage.chat.mifune.dev',
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY'
)

# Upload file
with open('document.pdf', 'rb') as file:
    s3_client.upload_fileobj(file, 'my-bucket', 'documents/document.pdf')

# Download file
s3_client.download_file('my-bucket', 'documents/document.pdf', 'local_copy.pdf')
```

## File Management

### Uploading Files

**Via API:**

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/storage/upload' \
  -H 'accept: application/json' \
  -F 'file=@document.pdf' \
  -F 'metadata={"category":"research","tags":["ai","ml"]}'
```

**Response:**

```json
{
    "file_id": "file_xyz789",
    "filename": "document.pdf",
    "size_bytes": 1024567,
    "content_type": "application/pdf",
    "url": "https://storage.chat.mifune.dev/files/file_xyz789",
    "created_at": "2025-01-16T10:30:00Z"
}
```

### Listing Files

Get all files in your storage:

```bash
curl -X 'GET' \
  'https://chat.mifune.dev/api/storage/files?limit=50&offset=0' \
  -H 'accept: application/json'
```

### Downloading Files

Retrieve a specific file:

```bash
curl -X 'GET' \
  'https://chat.mifune.dev/api/storage/file/file_xyz789' \
  --output document.pdf
```

### Deleting Files

Remove files from storage:

```bash
curl -X 'DELETE' \
  'https://chat.mifune.dev/api/storage/file/file_xyz789'
```

## RAG & Projects

Projects are collections of documents organized for retrieval-augmented generation. They create searchable indexes that AI agents can query.

### What are Projects?

Projects (also called RAG indexes) allow you to:

-   **Organize Documents**: Group related documents together
-   **Enable Semantic Search**: Find relevant information based on meaning, not just keywords
-   **Enhance AI Responses**: Provide context from your documents to AI models
-   **Version Control**: Track changes to your knowledge base over time

### Creating a Project

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/project' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Company Knowledge Base",
  "description": "Internal documentation and policies",
  "metadata": {
    "department": "engineering",
    "version": "1.0"
  }
}'
```

**Response:**

```json
{
    "id": "proj_abc123",
    "name": "Company Knowledge Base",
    "description": "Internal documentation and policies",
    "document_count": 0,
    "created_at": "2025-01-16T10:30:00Z",
    "updated_at": "2025-01-16T10:30:00Z"
}
```

### Adding Documents to a Project

Upload documents to your project's index:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/project/proj_abc123/documents' \
  -F 'file=@employee_handbook.pdf' \
  -F 'metadata={"type":"policy","version":"2024"}'
```

Orchestra will:

1. Extract text from the document
2. Split it into chunks
3. Generate embeddings
4. Index it for semantic search

### Querying a Project

Retrieve relevant information from your project:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/project/proj_abc123/query' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "What is the vacation policy?",
  "top_k": 5
}'
```

**Response:**

```json
{
    "results": [
        {
            "text": "Employees accrue 15 days of vacation per year...",
            "score": 0.92,
            "metadata": {
                "source": "employee_handbook.pdf",
                "page": 12
            }
        },
        {
            "text": "Vacation requests must be submitted...",
            "score": 0.87,
            "metadata": {
                "source": "employee_handbook.pdf",
                "page": 13
            }
        }
    ]
}
```

### Using Projects with Assistants

Combine projects with assistants for knowledge-enhanced agents:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/assistant' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "HR Assistant",
  "instructions": "You are an HR assistant. Use the company knowledge base to answer employee questions accurately. Always cite your sources.",
  "model": "anthropic:claude-sonnet-4-5"
}'
```

When this assistant is used in a thread, it automatically queries the project to enhance its responses.

## Document Retrieval

### Retrieval API

The retrieval API provides low-level access to search your indexed documents:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/retrieve' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "machine learning best practices",
  "project_ids": ["proj_abc123", "proj_def456"],
  "top_k": 10,
  "filters": {
    "category": "technical",
    "date_after": "2024-01-01"
  }
}'
```

### Filtering Results

Apply filters to narrow down search results:

**By Metadata:**

```json
{
    "query": "pricing information",
    "filters": {
        "department": "sales",
        "document_type": "presentation",
        "tags": ["2024", "Q4"]
    }
}
```

**By Date:**

```json
{
    "query": "recent updates",
    "filters": {
        "created_after": "2024-12-01",
        "updated_before": "2025-01-01"
    }
}
```

### Hybrid Search

Combine semantic search with keyword matching:

```bash
{
  "query": "deep learning frameworks",
  "hybrid": true,
  "keyword_weight": 0.3,
  "semantic_weight": 0.7
}
```

This balances exact keyword matches (30%) with semantic understanding (70%).

## Advanced Features

### Chunking Strategies

Control how documents are split for indexing:

```bash
{
  "file": "@document.pdf",
  "chunking": {
    "strategy": "semantic",
    "chunk_size": 512,
    "overlap": 50
  }
}
```

**Available Strategies:**

-   **Fixed**: Split by character count
-   **Semantic**: Split at logical boundaries (sentences, paragraphs)
-   **Recursive**: Hierarchical splitting for long documents

### Embedding Models

Choose the embedding model for your project:

```bash
{
  "name": "Technical Docs",
  "embedding_model": "text-embedding-3-large",
  "dimension": 1536
}
```

### Re-indexing

Update the index when documents change:

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/project/proj_abc123/reindex' \
  -H 'accept: application/json'
```

## Best Practices

!!! tip "Document Organization"
Use meaningful metadata when uploading documents. This makes filtering and retrieval much more effective.

!!! tip "Chunking Size"
For technical documentation: 512-1024 tokens
For narrative content: 256-512 tokens
For structured data: Smaller chunks (128-256 tokens)

!!! info "Index Performance"
Large projects (10,000+ documents) may take time to index. Consider batching uploads during off-peak hours.

!!! warning "File Size Limits"
Individual file uploads may be limited by your instance configuration. For very large documents, split them before uploading.

!!! tip "RAG Quality"
Quality of retrieval depends on: - Document quality and formatting - Appropriate chunk sizes - Good metadata tagging - Relevant embedding model selection

## Example Use Cases

### Use Case 1: Customer Support Knowledge Base

```bash
# Create project
curl -X 'POST' 'https://chat.mifune.dev/api/project' \
  -d '{"name":"Support KB","description":"Customer support documentation"}'

# Upload FAQs and troubleshooting guides
curl -X 'POST' 'https://chat.mifune.dev/api/project/proj_123/documents' \
  -F 'file=@faq.pdf' -F 'metadata={"category":"faq"}'

# Create assistant with access
curl -X 'POST' 'https://chat.mifune.dev/api/assistant' \
  -d '{"name":"Support Agent","instructions":"You are a support agent.","model":"anthropic:claude-sonnet-4-5"}'
```

### Use Case 2: Code Documentation Search

```bash
# Upload API documentation
curl -X 'POST' 'https://chat.mifune.dev/api/project/proj_456/documents' \
  -F 'file=@api_docs.md' \
  -F 'metadata={"type":"api","version":"v2.0"}'

# Query for specific functionality
curl -X 'POST' 'https://chat.mifune.dev/api/project/proj_456/query' \
  -d '{"query":"How do I authenticate API requests?","top_k":3}'
```

### Use Case 3: Research Paper Library

```bash
# Upload research papers
for paper in *.pdf; do
  curl -X 'POST' 'https://chat.mifune.dev/api/project/proj_789/documents' \
    -F "file=@$paper" \
    -F 'metadata={"type":"research","field":"machine_learning"}'
done

# Search across all papers
curl -X 'POST' 'https://chat.mifune.dev/api/project/proj_789/query' \
  -d '{"query":"attention mechanisms in transformers","top_k":10}'
```

## API Reference

Complete storage and RAG API documentation:

-   [Storage API](https://chat.mifune.dev/api#/Storage)
-   [Project API](https://chat.mifune.dev/api#/Project)
-   [Retrieval API](https://chat.mifune.dev/api#/Retrieve)

### Key Endpoints

-   `POST /storage/upload` - Upload a file
-   `GET /storage/files` - List all files
-   `GET /storage/file/{id}` - Download a file
-   `DELETE /storage/file/{id}` - Delete a file
-   `POST /project` - Create a RAG project
-   `POST /project/{id}/documents` - Add documents to project
-   `POST /project/{id}/query` - Query a project
-   `POST /retrieve` - Low-level retrieval across projects

## Related Documentation

-   **[Assistants](../assistants/index.md)**: Attach knowledge bases to AI agents
-   **[Threads](../threads/index.md)**: Use files in conversations
-   **[Getting Started](../getting-started.md)**: Learn the basics

---

**Ready to build a knowledge-enhanced agent?** Start by [creating a project](https://chat.mifune.dev/api#/Project/Create_Project) and uploading your first documents!
