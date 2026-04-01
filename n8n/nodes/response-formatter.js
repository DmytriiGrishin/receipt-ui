/**
 * n8n Code Node: Response Formatter
 *
 * Formats PostgreSQL query results into the expected API response shape.
 *
 * Input depends on action:
 * - list: { items: [...], total: ... }
 * - detail: { items: [...] } + label/date from first item
 * - create: { id: ... }
 * - update/delete: { success: true/false }
 * - stats: Merged result from main + 3 sub-queries
 *
 * Usage: Connect after PostgreSQL node(s).
 */

const items = []
const input = $input.first()
const action = input.json.action
const pgResult = input.json.pgResult || input.json

switch (action) {
  case 'list': {
    // pgResult is array of rows with total window column
    const rows = pgResult || []
    const total = rows.length > 0 ? parseInt(rows[0].total, 10) : 0
    const items_list = rows.map(r => ({
      id: parseInt(r.id, 10),
      label: r.label,
      date: r.date,
      total: parseFloat(r.total),
      itemCount: parseInt(r.itemCount, 10),
      isGroup: r.isGroup === true || r.isGroup === 't' || r.isGroup === 1
    }))

    items.push({
      json: {
        items: items_list,
        total
      }
    })
    break
  }

  case 'detail': {
    const rows = pgResult || []
    if (rows.length === 0) {
      items.push({
        json: {
          error: 'Receipt not found',
          statusCode: 404
        }
      })
      break
    }

    const first = rows[0]
    const isGroup = first.receipt !== null

    items.push({
      json: {
        id: parseInt(first.id, 10),
        label: isGroup ? first.receipt : first.item,
        date: first.receiptDate,
        items: rows.map(r => ({
          id: parseInt(r.id, 10),
          userId: r.userId,
          item: r.item,
          price: parseFloat(r.price),
          category: r.category,
          receipt: r.receipt || null,
          receiptDate: r.receiptDate
        }))
      }
    })
    break
  }

  case 'create': {
    const row = (pgResult || [])[0]
    if (!row) {
      items.push({
        json: {
          error: 'Failed to create receipt',
          statusCode: 500
        }
      })
      break
    }
    items.push({ json: { id: parseInt(row.id, 10) } })
    break
  }

  case 'update': {
    const row = (pgResult || [])[0]
    if (!row) {
      items.push({
        json: {
          error: 'Receipt not found',
          statusCode: 404
        }
      })
      break
    }
    items.push({ json: { success: true } })
    break
  }

  case 'delete': {
    // DELETE returns affected row count in n8n
    const affected = pgResult !== undefined ? (pgResult.affectedRows || pgResult.length || 0) : 0
    if (affected === 0) {
      items.push({
        json: {
          error: 'Receipt not found',
          statusCode: 404
        }
      })
      break
    }
    items.push({ json: { success: true } })
    break
  }

  case 'stats': {
    // Main stats
    const main = pgResult || []
    const mainRow = main[0] || {}

    // Sub-results come from input context (merged by previous node)
    const byCategory = input.json.byCategory || []
    const byMonth = input.json.byMonth || []
    const topItems = input.json.topItems || []

    items.push({
      json: {
        totalSpent: parseFloat(mainRow.totalSpent || 0),
        count: parseInt(mainRow.count || 0, 10),
        avgPrice: parseFloat(mainRow.avgPrice || 0),
        byCategory: byCategory.map(r => ({
          category: r.category,
          total: parseFloat(r.total),
          count: parseInt(r.count, 10)
        })),
        byMonth: byMonth.map(r => ({
          month: r.month,
          total: parseFloat(r.total),
          count: parseInt(r.count, 10)
        })),
        topItems: topItems.map(r => ({
          item: r.item,
          count: parseInt(r.count, 10),
          total: parseFloat(r.total)
        }))
      }
    })
    break
  }

  default:
    items.push({
      json: {
        error: 'Invalid action',
        statusCode: 400
      }
    })
}

return items
