/**
 * n8n Code Node: Action Router
 *
 * Routes requests based on the `action` field.
 * Each action produces a query object for the PostgreSQL node.
 * Validates all numeric inputs — rejects NaN.
 *
 * Input: { action, payload, userId }
 * Output: { query, params, action }
 */

const items = []

for (const item of $input.all()) {
  const action = item.json.action
  const payload = item.json.payload || {}
  const userId = item.json.userId

  let query = null
  let params = []

  switch (action) {
    case 'list': {
      const search = payload.search || null
      const category = payload.category || null
      const from = payload.from || null
      const to = payload.to || null
      const limit = parseInt(payload.limit || '15', 10)
      const offset = parseInt(payload.offset || '0', 10)

      if (isNaN(limit) || isNaN(offset) || limit < 1 || limit > 100 || offset < 0) {
        return [{
          json: {
            error: 'Invalid pagination parameters',
            statusCode: 400
          }
        }]
      }

      query = `
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
      `
      params = [userId, search, category, from, to, limit, offset]
      break
    }

    case 'detail': {
      const id = parseInt(payload.id, 10)
      if (isNaN(id) || id < 1) {
        return [{
          json: {
            error: 'Invalid receipt ID',
            statusCode: 400
          }
        }]
      }

      query = `
        SELECT *
        FROM receipts
        WHERE (receipt = (SELECT receipt FROM receipts WHERE id = $1)
               OR (id = $1 AND receipt IS NULL))
          AND "userId" = $2
        ORDER BY price DESC
      `
      params = [id, userId]
      break
    }

    case 'create': {
      if (!payload.item || typeof payload.item !== 'string') {
        return [{
          json: {
            error: 'Missing required field: item',
            statusCode: 400
          }
        }]
      }
      const price = parseFloat(payload.price)
      if (isNaN(price) || price < 0) {
        return [{
          json: {
            error: 'Invalid price',
            statusCode: 400
          }
        }]
      }
      if (!payload.category || typeof payload.category !== 'string') {
        return [{
          json: {
            error: 'Missing required field: category',
            statusCode: 400
          }
        }]
      }
      if (!payload.receiptDate || typeof payload.receiptDate !== 'string') {
        return [{
          json: {
            error: 'Missing required field: receiptDate',
            statusCode: 400
          }
        }]
      }

      query = `
        INSERT INTO receipts ("userId", item, price, category, receipt, "receiptDate")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `
      params = [
        userId,
        payload.item.trim(),
        price,
        payload.category,
        payload.receipt ? payload.receipt.trim() : null,
        payload.receiptDate
      ]
      break
    }

    case 'update': {
      const id = parseInt(payload.id, 10)
      if (isNaN(id) || id < 1) {
        return [{
          json: {
            error: 'Invalid receipt ID',
            statusCode: 400
          }
        }]
      }
      if (payload.price !== undefined) {
        const price = parseFloat(payload.price)
        if (isNaN(price) || price < 0) {
          return [{
            json: {
              error: 'Invalid price',
              statusCode: 400
            }
          }]
        }
      }

      query = `
        UPDATE receipts
        SET
          item = COALESCE($2, item),
          price = COALESCE($3, price),
          category = COALESCE($4, category),
          receipt = COALESCE($5, receipt),
          "receiptDate" = COALESCE($6, "receiptDate")
        WHERE id = $1 AND "userId" = $7
        RETURNING id
      `
      params = [
        id,
        payload.item ? payload.item.trim() : null,
        payload.price !== undefined ? parseFloat(payload.price) : null,
        payload.category || null,
        payload.receipt !== undefined ? (payload.receipt ? payload.receipt.trim() : null) : null,
        payload.receiptDate || null,
        userId
      ]
      break
    }

    case 'delete': {
      const id = parseInt(payload.id, 10)
      if (isNaN(id) || id < 1) {
        return [{
          json: {
            error: 'Invalid receipt ID',
            statusCode: 400
          }
        }]
      }

      query = `
        DELETE FROM receipts WHERE id = $1 AND "userId" = $2
      `
      params = [id, userId]
      break
    }

    case 'stats': {
      const from = payload.from || null
      const to = payload.to || null

      query = `
        SELECT
          COALESCE(SUM(price), 0) as "totalSpent",
          COUNT(*) as "count",
          COALESCE(AVG(price), 0) as "avgPrice"
        FROM receipts
        WHERE "userId" = $1
          AND ($2::text IS NULL OR "receiptDate" >= $2)
          AND ($3::text IS NULL OR "receiptDate" <= $3)
      `
      params = [userId, from, to]
      break
    }

    default:
      return [{
        json: {
          error: 'Invalid action',
          statusCode: 400
        }
      }]
  }

  items.push({
    json: {
      action,
      query,
      params,
      userId
    }
  })
}

return items
