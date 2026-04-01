# n8n Backend Implementation

## Workflow Structure

```
[Webhook Trigger (POST)]
        │
        ▼
[1. Auth Validate] ──fail──► [Respond to Webhook: 401]
        │ pass
        ▼
[2. Action Router]
        │
    ┌───┴───┬────────┬────────┬────────┬────────┐
    ▼       ▼        ▼        ▼        ▼        ▼
 [list] [detail]  [create]  [update] [delete] [stats]
    │       │        │        │        │        │
    ▼       ▼        ▼        ▼        ▼        ▼
 [PostgreSQL]      [PostgreSQL] [PostgreSQL] [PostgreSQL]
    │       │        │        │        │        │
    │       │        │        │        │        ├──► [Stats Queries]
    │       │        │        │        │        │       │
    │       │        │        │        │        │    [PostgreSQL x3]
    │       │        │        │        │        │       │
    │       │        │        │        │        └───────┘
    │       │        │        │        │                │
    ▼       ▼        ▼        ▼        ▼                ▼
 [Response Formatter] ◄────────────────────────────────┘
        │
        ▼
 [Respond to Webhook: JSON]
```

## File Descriptions

| File | Purpose |
|------|---------|
| `nodes/auth-validate.js` | Validates shared secret + Telegram HMAC, extracts userId |
| `nodes/action-router.js` | Routes by action, produces SQL query + params for each action |
| `nodes/stats-queries.js` | Generates 3 additional queries for stats (category, month, top) |
| `nodes/response-formatter.js` | Formats PostgreSQL results into API response shape |
| `nodes/error-handler.js` | Catches DB errors, returns consistent error response |

## Setup in n8n

### 1. Webhook Node
- Method: POST
- Response Mode: Last Node
- Authentication: None (handled by code node)

### 2. Code Node: Auth Validate
- Paste `nodes/auth-validate.js`
- Set environment variables:
  - `WEBHOOK_SECRET` — shared secret token
  - `TELEGRAM_BOT_TOKEN` — bot token from BotFather

### 3. Code Node: Action Router
- Paste `nodes/action-router.js`
- Connect from Auth Validate

### 4. Switch Node
- Route by `action` field from router output
- 6 branches: `list`, `detail`, `create`, `update`, `delete`, `stats`

### 5. PostgreSQL Nodes (one per action)
- Use parameterized query: `{{ $json.query }}`
- Params: `{{ $json.params }}`
- For stats: main query + 3 sub-queries from `stats-queries.js`

### 6. Code Node: Response Formatter
- Paste `nodes/response-formatter.js`
- Connect all PostgreSQL results here
- Input should include `pgResult` field with query results

### 7. Respond to Webhook Node
- Respond With: JSON
- Response Body: `{{ $json }}`
- Status Code: `{{ $json.statusCode || 200 }}`

## Error Handling

- Each action branch should have an Error Trigger connected to `error-handler.js`
- In n8n: Set node "On Error" to "Continue" and check for errors in response formatter
- Alternatively, use n8n's built-in error workflow

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather (for HMAC validation) |
| `WEBHOOK_SECRET` | Shared secret matching frontend `VITE_WEBHOOK_SECRET` |
