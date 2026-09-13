---
title: API Tokens
slug: /api-tokens
sidebar_position: 10
---

# API Tokens

API tokens let you authenticate against the Orchestra API programmatically — from
scripts, CI jobs, or external integrations — without using your interactive login
session. Each token is a long-lived bearer credential scoped to your account.

## Overview

-   **Personal, account-scoped**: every token belongs to the user who created it
-   **Shown once**: the raw token is returned a single time at creation; only a short
    prefix is stored afterwards for display
-   **Named**: give each token a human-readable name so you can tell them apart
-   **Revocable**: delete a token at any time to immediately invalidate it
-   **Bearer auth**: send the token as `Authorization: Bearer <token>` on any API request

## How It Works

1. **Create a token** with a descriptive name. The API returns the raw token value
   exactly once — copy it immediately and store it somewhere safe (a secret manager).
2. **Use it** as a bearer token on API calls, e.g. against `/api/prompts/search` or any
   other authenticated endpoint.
3. **Revoke it** when it is no longer needed, or if it may have leaked.

:::warning Store the raw token immediately
The raw token is only returned in the create response. Orchestra stores a hash plus a
short prefix (e.g. `sk-abc123...`) for display — it cannot show you the full value again.
If you lose it, revoke the token and create a new one.
:::

## API Reference

All endpoints require an authenticated session (or another valid token).

### List Tokens

```bash
curl -X 'GET' \
  'https://chat.mifune.dev/api/tokens' \
  -H 'Authorization: Bearer <token>'
```

Returns an array of token metadata (id, name, prefix, timestamps) — never the raw values.

### Create a Token

```bash
curl -X 'POST' \
  'https://chat.mifune.dev/api/tokens' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{ "name": "ci-deploy-bot" }'
```

**Response (`200 OK`):**

```json
{
  "token": "sk-abc123...the-full-raw-token",
  "api_token": { "id": "…", "name": "ci-deploy-bot", "prefix": "sk-abc123..." }
}
```

The `token` field is the raw credential — shown only here. The `api_token` object is the
stored metadata you will see in subsequent list calls.

### Revoke a Token

```bash
curl -X 'DELETE' \
  'https://chat.mifune.dev/api/tokens/{token_id}' \
  -H 'Authorization: Bearer <token>'
```

Returns `{ "status": "success" }`, or `404` if the token id does not exist.

## Best Practices

:::tip One token per integration
Create a separate, clearly-named token for each script or service. When you rotate or
revoke one, the others keep working.
:::

:::tip Treat tokens like passwords
Never commit a raw token to source control. Inject it via environment variables or a
secret manager, and revoke any token that may have been exposed.
:::

## Related Documentation

-   **[Prompts](../prompts/index.md)**: a good first authenticated endpoint to try with a token
-   **[Settings](../settings/index.md)**: manage account defaults and provider keys
