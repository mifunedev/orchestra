---
title: Self-Hosting Guide
sidebar_position: 3
---

# Self-Hosting Orchestra

This guide covers environment configuration for self-hosting Orchestra with various AI providers.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database
- (Optional) S3-compatible storage (MinIO)

## Environment Configuration

Orchestra uses environment variables to configure AI providers. Copy the example environment file and configure your providers:

```bash
cp .example.env .env
```

### AI Provider Configuration

Orchestra supports multiple AI providers. Enable providers by setting their respective environment variables.

#### OpenAI

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

#### Anthropic (Claude)

```bash
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

#### Google (Gemini)

```bash
GOOGLE_API_KEY=your-google-api-key
```

#### xAI (Grok)

```bash
XAI_API_KEY=your-xai-api-key
```

#### Groq

```bash
GROQ_API_KEY=your-groq-api-key
```

#### AWS Bedrock

AWS Bedrock requires AWS credentials. Bedrock models are enabled when `AWS_BEARER_TOKEN_BEDROCK` is set to any value.

```bash
# Enable Bedrock (set to any value to enable)
AWS_BEARER_TOKEN_BEDROCK=enabled

# AWS credentials (choose one method)
# Method 1: Environment variables
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_DEFAULT_REGION=us-east-1

# Method 2: AWS credentials file (~/.aws/credentials)
# Method 3: IAM roles (for EC2/ECS/Lambda deployments)
```

**Important: Inference Profiles**

Claude 4.5 and newer models require [inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html) instead of direct model IDs. The model IDs include a regional prefix:

- `us.` - US regions (us-east-1, us-west-2, etc.)
- `eu.` - EU regions (eu-west-1, eu-central-1, etc.)
- `apac.` - Asia Pacific regions

Orchestra defaults to US inference profiles. For other regions, you may need to customize the model IDs.

**Available Bedrock Models:**

| Model | ID (US Region) |
|-------|-----|
| Claude 4.5 Sonnet | `bedrock_converse:us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude 4.5 Haiku | `bedrock_converse:us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Claude 4.5 Opus | `bedrock_converse:us.anthropic.claude-opus-4-5-20251101-v1:0` |
| Kimi K2 Thinking | `bedrock_converse:us.moonshot.kimi-k2-thinking` |
| Claude 3.5 Sonnet | `bedrock_converse:us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Claude 3.5 Haiku | `bedrock_converse:us.anthropic.claude-3-5-haiku-20241022-v1:0` |
| Titan Text Premier | `bedrock_converse:amazon.titan-text-premier-v1:0` |
| Llama 3.2 90B | `bedrock_converse:us.meta.llama3-2-90b-instruct-v1:0` |
| Mistral Large | `bedrock_converse:us.mistral.mistral-large-2407-v1:0` |

**IAM Policy Requirements:**

Your AWS credentials need permissions for Bedrock model invocation:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:*:inference-profile/*"
      ]
    }
  ]
}
```

#### Ollama (Local Models)

For local model inference using Ollama:

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

### Database Configuration

```bash
POSTGRES_CONNECTION_STRING=postgresql://admin:password@localhost:5432/orchestra
```

### Storage Configuration (Optional)

For file uploads and RAG capabilities:

```bash
MINIO_HOST=localhost:9000
S3_REGION=us-east-2
ACCESS_KEY_ID=minio-access-key
ACCESS_SECRET_KEY=minio-secret-key
BUCKET=orchestra
```

## Sandbox (Optional)

Orchestra supports an optional sandbox environment for secure shell command execution via the `exec_server` MCP service.

The sandbox is a separate service that this repository does not ship. Run it on port `3005`,
then set `SHELL_EXEC_SERVER_URL` to its `/exec` endpoint to provide the `exec_command` tool to
your agents.

For full configuration details, see the [Sandbox documentation](../tools/sandbox.md).

## Database Migrations

Orchestra uses Alembic for database migrations. Run the migrations before you start Orchestra.

### Initial Setup

1. Create the database (if not exists):

    ```bash
    cd backend
    alembic upgrade head
    ```

    ```bash
    python -m seeds.user_seeder
    ```

2. Create new

    ```bash
    alembic revision -m "description_of_changes"
    ```

    ```bash
    # Apply next
    alembic upgrade +1

    # Specific revision
    alembic upgrade <revis_id>

    # Apply down
    alembic downgrade -1

    # Apply down
    alembic downgrade <revis_id>

    # History
    alembic history
    ```

## Running Orchestra

### Development Mode

```bash
cd backend
make dev
```

### Production with the published image

Run the API image from GitHub Container Registry against the services you started above:

```bash
docker run -d \
  --name orchestra \
  -p 8000:8000 \
  --env-file .env \
  ghcr.io/mifunedev/orchestra-api:latest
```

Run the worker image the same way when `DISTRIBUTED_WORKERS=true`:

```bash
docker run -d \
  --name orchestra-worker \
  --env-file .env \
  ghcr.io/mifunedev/orchestra-worker:latest
```

Both containers reach PostgreSQL, Redis and MinIO by container name once they join the same
Docker network. The repository `README.md` owns the `docker run` for each of those services.

## Verifying Configuration

After starting Orchestra, verify your configured providers appear in the model selector:

1. Navigate to your Orchestra instance
2. Click the model dropdown at the top of the chat interface
3. Verify models from your configured providers appear in the list

For AWS Bedrock specifically, you should see models prefixed with `bedrock_converse:` in the dropdown.

## Troubleshooting

### AWS Bedrock Models Not Appearing

1. Verify `AWS_BEARER_TOKEN_BEDROCK` is set
2. Check AWS credentials are configured (env vars, credentials file, or IAM role)
3. Ensure your AWS account has Bedrock model access enabled in the AWS Console
4. Verify the IAM policy includes `bedrock:InvokeModel` permissions

### Model Invocation Errors

- **ValidationException: "Invocation with on-demand throughput isn't supported"**: Claude 4.5 models require inference profiles. Ensure model IDs have the regional prefix (e.g., `us.anthropic.claude-sonnet-4-5-...`)
- **AccessDeniedException**: Check IAM permissions include both `foundation-model/*` and `inference-profile/*` resources
- **ResourceNotFoundException**: The model may not be available in your region
- **ThrottlingException**: You've hit API rate limits; implement backoff or request limit increase

## Next Steps

- [Configure Tools & Integrations](../tools/tools.md)
- [Set up MCP Servers](../tools/mcp.md)
- [Enable A2A Protocol](../tools/a2a.md)
