# Receipt Tracker — n8n Backend Implementation Guide

## Overview

The frontend sends all requests to a **single n8n webhook URL** with an `action` field that determines the operation. The frontend uses `VITE_WEBHOOK_URL` (set at build time) and includes authentication in every request.

---

## Request Format

Every request is a **POST** to the same webhook URL:

```json
{
  "action": "list" | "create" | "update" | "delete" | "stats" | "detail",
  "payload": { ... },
  "auth": {
    "initData": "<Telegram WebApp initData string>",
    "token": "<shared secret from VITE_WEBHOOK_SECRET>"
  }
}
```

---

## Security Validation (MUST run on every request)

### Step 1: Validate shared secret
- Check that `auth.token` matches your expected secret value
- Store the secret in n8n credentials (not hardcoded)
- Reject with `401` if mismatch

### Step 2: Validate Telegram initData
The `initData` is a query-string-like format from Telegram:
```
user=%7B%22id%22%3A123%2C%22first_name%22%3A%22John%22%7D&query_id=...&auth_date=...&hash=...
```

**Validation algorithm:**
1. Extract the `hash` parameter from initData
2. Remove `hash=` from the initData string
3. Sort remaining key-value pairs alphabetically by key
4. Join with `\n`
5. Create HMAC-SHA256 using your **bot token** as the key
6. Compare the result with the extracted `hash`
7. Reject with `401` if they don't match

**Check expiration:**
- Parse `auth_date` (Unix timestamp)
- Reject if `current_time - auth_date > 3600` (1 hour)

### Step 3: Extract and enforce userId
- Parse `user` JSON from initData
- Extract `user.id` — this is the authenticated user's Telegram ID
- For `list`, `stats`: if `payload.userId` is provided, verify it matches `user.id` (or ignore and use `user.id`)
- For `create`: use `user.id` as `userId`, ignore payload's userId
- For `update`/`delete`: verify the receipt belongs to `user.id`

### Step 4: Response format
- Success: Return JSON body with the expected structure
- Error: Return `{ "error": "message" }` with appropriate HTTP status

---

## Actions

### 1. `list` — Fetch grouped receipt entries

**Payload:**
```json
{
  "search": "coffee",
  "category": "Groceries",
  "from": "2026-01-01",
  "to": "2026-03-31",
  "limit": 15,
  "offset": 0
}
```

All fields are optional. If omitted, no filter is applied.

**SQL (parameterized):**
```sql
WITH filtered AS (
  SELECT *
  FROM receipts
  WHERE "userId" = $1
    AND ($2::text IS NULL OR item ILIKE '%' || $2 || '%' OR category ILIKE '%' || $2 || '%' OR receipt ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR category = $3)
    AND ($4::text IS NULL OR "receiptDate" >= $4)
    AND ($5::text IS NULL OR "receiptDate" <= $5)
),
grouped AS (
  SELECT
    MIN(id) as id,
    receipt as group_key,
    CASE WHEN receipt IS NULL THEN MIN(item) ELSE receipt END as label,
    MAX("receiptDate") as date,
    ROUND(SUM(price)::numeric, 2) as total,
    COUNT(*) as "itemCount",
    (receipt IS NOT NULL) as "isGroup"
  FROM filtered
  GROUP BY receipt, CASE WHEN receipt IS NULL THEN id END
)
SELECT COUNT(*) OVER() as total, id, label, date, total, "itemCount", "isGroup"
FROM grouped
ORDER BY date DESC
LIMIT $6 OFFSET $7
```

**Parameters:** `[userId, search, category, from, to, limit, offset]`

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "label": "Receipt #0001",
      "date": "2026-03-15",
      "total": 12.50,
      "itemCount": 3,
      "isGroup": true
    },
    {
      "id": 5,
      "label": "Coffee",
      "date": "2026-03-14",
      "total": 4.50,
      "itemCount": 1,
      "isGroup": false
    }
  ],
  "total": 42
}
```

**Notes:**
- Groups are formed by the `receipt` column. Items sharing the same `receipt` value form one group.
- Items with `receipt = NULL` are standalone entries (each is its own group).
- Pagination applies to **groups**, not individual rows — this prevents split groups across pages.
- `id` is the minimum ID within the group (used to fetch details).

---

### 1.5. `detail` — Fetch items within a receipt group

**Payload:**
```json
{ "id": 1 }
```

The `id` is the group ID returned from `list`.

**SQL (parameterized):**
```sql
SELECT *
FROM receipts
WHERE (receipt = (SELECT receipt FROM receipts WHERE id = $1)
       OR (id = $1 AND receipt IS NULL))
  AND "userId" = $2
ORDER BY price DESC
```

**Parameters:** `[id, userId_from_initData]`

**Response:**
```json
{
  "id": 1,
  "label": "Receipt #0001",
  "date": "2026-03-15",
  "items": [
    {
      "id": 1,
      "userId": "123456789",
      "item": "Coffee",
      "price": 4.50,
      "category": "Groceries",
      "receipt": "Receipt #0001",
      "receiptDate": "2026-03-15"
    },
    {
      "id": 2,
      "userId": "123456789",
      "item": "Milk",
      "price": 3.00,
      "category": "Groceries",
      "receipt": "Receipt #0001",
      "receiptDate": "2026-03-15"
    }
  ]
}
```

**Notes:**
- For grouped receipts: returns all items sharing the same `receipt` reference.
- For standalone items: returns just that single receipt.
- Items are sorted by price descending.

---

### 2. `create` — Add a receipt

**Payload:**
```json
{
  "item": "Coffee",
  "price": 4.50,
  "category": "Groceries",
  "receipt": "Receipt #0001",
  "receiptDate": "2026-03-15"
}
```

**Note:** `userId` comes from initData, NOT from payload.

**SQL:**
```sql
INSERT INTO receipts ("userId", item, price, category, receipt, "receiptDate")
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
```

**Parameters:** `[userId_from_initData, item, price, category, receipt_or_null, receiptDate]`

**Response:**
```json
{ "id": 81 }
```

---

### 3. `update` — Modify a receipt

**Payload:**
```json
{
  "id": 1,
  "item": "Premium Coffee",
  "price": 5.00,
  "category": "Dining",
  "receipt": "Receipt #0001-updated",
  "receiptDate": "2026-03-16"
}
```

Only include fields that need updating. `id` is required.

**SQL:**
```sql
UPDATE receipts
SET
  item = COALESCE($2, item),
  price = COALESCE($3, price),
  category = COALESCE($4, category),
  receipt = COALESCE($5, receipt),
  "receiptDate" = COALESCE($6, "receiptDate")
WHERE id = $1 AND "userId" = $7
RETURNING id
```

**Parameters:** `[id, item_or_null, price_or_null, category_or_null, receipt_or_null, receiptDate_or_null, userId_from_initData]`

**Response:**
```json
{ "success": true }
```

If no rows affected (wrong id or userId), return `{ "error": "Receipt not found" }` with status 404.

---

### 4. `delete` — Remove a receipt

**Payload:**
```json
{ "id": 1 }
```

**SQL:**
```sql
DELETE FROM receipts WHERE id = $1 AND "userId" = $2
```

**Parameters:** `[id, userId_from_initData]`

**Response:**
```json
{ "success": true }
```

If no rows affected, return `{ "error": "Receipt not found" }` with status 404.

---

### 5. `stats` — Get aggregated statistics

**Payload:**
```json
{
  "from": "2026-01-01",
  "to": "2026-03-31"
}
```

All fields optional. Date filters apply to all sub-queries.

**SQL queries (run all 5):**

```sql
-- 1. Total and count
SELECT
  COALESCE(SUM(price), 0) as "totalSpent",
  COUNT(*) as "count",
  COALESCE(AVG(price), 0) as "avgPrice"
FROM receipts
WHERE "userId" = $1
  AND ($2::text IS NULL OR "receiptDate" >= $2)
  AND ($3::text IS NULL OR "receiptDate" <= $3)
```

```sql
-- 2. By category
SELECT
  category,
  ROUND(SUM(price)::numeric, 2) as total,
  COUNT(*) as count
FROM receipts
WHERE "userId" = $1
  AND ($2::text IS NULL OR "receiptDate" >= $2)
  AND ($3::text IS NULL OR "receiptDate" <= $3)
GROUP BY category
ORDER BY total DESC
```

```sql
-- 3. By month
SELECT
  TO_CHAR("receiptDate", 'YYYY-MM') as month,
  ROUND(SUM(price)::numeric, 2) as total,
  COUNT(*) as count
FROM receipts
WHERE "userId" = $1
  AND ($2::text IS NULL OR "receiptDate" >= $2)
  AND ($3::text IS NULL OR "receiptDate" <= $3)
GROUP BY TO_CHAR("receiptDate", 'YYYY-MM')
ORDER BY month ASC
```

```sql
-- 4. Top items
SELECT
  item,
  COUNT(*) as count,
  ROUND(SUM(price)::numeric, 2) as total
FROM receipts
WHERE "userId" = $1
  AND ($2::text IS NULL OR "receiptDate" >= $2)
  AND ($3::text IS NULL OR "receiptDate" <= $3)
GROUP BY item
ORDER BY total DESC
LIMIT 10
```

**Response:**
```json
{
  "totalSpent": 1234.56,
  "count": 42,
  "avgPrice": 29.39,
  "byCategory": [
    { "category": "Groceries", "total": 500.00, "count": 20 },
    { "category": "Transport", "total": 300.00, "count": 10 }
  ],
  "byMonth": [
    { "month": "2026-01", "total": 400.00, "count": 15 },
    { "month": "2026-02", "total": 834.56, "count": 27 }
  ],
  "topItems": [
    { "item": "Coffee", "count": 12, "total": 60.00 },
    { "item": "Gas", "count": 4, "total": 200.00 }
  ]
}
```

---

## n8n Workflow Structure

```
[Webhook Trigger (POST)]
        │
        ▼
[1. Validate shared secret] ──fail──► [Respond with 401]
        │ pass
        ▼
[2. Validate initData HMAC] ──fail──► [Respond with 401]
        │ pass
        ▼
[3. Extract userId from initData]
        │
        ▼
[4. Switch on action field]
        │
    ┌────┴────┬────────┬────────┬────────┬────────┐
    ▼         ▼        ▼        ▼        ▼        ▼
 [list]   [create]  [update]  [delete] [stats]  [detail]
    │         │        │        │        │        │
    ▼         ▼        ▼        ▼        ▼        ▼
 [PostgreSQL] [PostgreSQL] [PostgreSQL] [PostgreSQL] [PostgreSQL x4] [PostgreSQL]
    │         │        │        │        │        │
    ▼         ▼        ▼        ▼        ▼        ▼
 [Respond with JSON]
```

### n8n Nodes Needed:
1. **Webhook** — POST method, respond with JSON
2. **Code/Function** — Validate shared secret + initData HMAC
3. **Switch/If** — Route by `action` field
4. **PostgreSQL** — Parameterized queries for each action
5. **Respond to Webhook** — Return JSON response

### Credentials to set up in n8n:
- **PostgreSQL connection** — host, port, database, user, password
- **Bot Token** — for initData validation (store as n8n credential)
- **Webhook Secret** — the shared secret (store as n8n credential)

---

## Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing/invalid action | `{ "error": "Invalid action" }` |
| 400 | Missing required fields | `{ "error": "Missing required field: X" }` |
| 401 | Invalid shared secret | `{ "error": "Unauthorized" }` |
| 401 | Invalid initData HMAC | `{ "error": "Invalid authentication" }` |
| 401 | Expired initData | `{ "error": "Authentication expired" }` |
| 403 | userId mismatch | `{ "error": "Access denied" }` |
| 404 | Receipt not found | `{ "error": "Receipt not found" }` |
| 500 | Database error | `{ "error": "Internal server error" }` |

---

## Environment Variables (for n8n)

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather (for initData validation) |
| `WEBHOOK_SECRET` | Shared secret matching `VITE_WEBHOOK_SECRET` |

---

## Deployment Checklist

- [ ] Create n8n workflow with webhook trigger
- [ ] Add shared secret credential
- [ ] Add Telegram bot token credential
- [ ] Configure PostgreSQL connection
- [ ] Implement HMAC validation for initData
- [ ] Implement all 6 action handlers with parameterized queries (list, detail, create, update, delete, stats)
- [ ] Test with mock initData (use Telegram WebApp test mode)
- [ ] Set `VITE_WEBHOOK_URL` in GitHub repo secrets
- [ ] Set `VITE_WEBHOOK_SECRET` in GitHub repo secrets
- [ ] Deploy frontend via GitHub Actions
- [ ] Set Mini App URL in BotFather
- [ ] Test full flow in Telegram
