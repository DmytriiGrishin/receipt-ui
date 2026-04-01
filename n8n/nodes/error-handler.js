/**
 * n8n Code Node: Error Handler
 *
 * Catches database errors and formats them into consistent API responses.
 *
 * Input: { error } from failed PostgreSQL node
 * Output: { error: "Internal server error", statusCode: 500 }
 */

const items = []

for (const item of $input.all()) {
  const error = item.json.error || item.json.message || 'Unknown error'

  // Log the actual error for debugging (visible in n8n execution)
  console.error('Database error:', error)

  items.push({
    json: {
      error: 'Internal server error',
      statusCode: 500
    }
  })
}

return items
