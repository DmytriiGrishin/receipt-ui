/**
 * n8n Code Node: Stats Aggregator (Category + Month + Top Items)
 *
 * Runs after the main stats query. Produces 3 additional queries for
 * byCategory, byMonth, and topItems.
 *
 * Input: { userId, payload: { from?, to? } }
 * Output: 3 items with { query, params, statsType }
 */

const items = []

const item = $input.first()
const userId = item.json.userId
const payload = item.json.payload || {}
const from = payload.from || null
const to = payload.to || null

// Query 2: By category
items.push({
  json: {
    action: 'stats',
    statsType: 'byCategory',
    query: `
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
    `,
    params: [userId, from, to]
  }
})

// Query 3: By month
items.push({
  json: {
    action: 'stats',
    statsType: 'byMonth',
    query: `
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
    `,
    params: [userId, from, to]
  }
})

// Query 4: Top items
items.push({
  json: {
    action: 'stats',
    statsType: 'topItems',
    query: `
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
    `,
    params: [userId, from, to]
  }
})

return items
