/**
 * n8n Code Node: Auth Validation
 *
 * Validates Telegram initData HMAC (primary auth only).
 * Extracts userId from initData for downstream use.
 *
 * Input: Webhook request body with { action, payload, auth: { initData } }
 * Output: Passes through with userId added to item.json
 */

const crypto = require('crypto')

const items = []

// 1. Fail hard if env vars are not set
const botToken = $env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  return [{
    json: {
      error: 'Server configuration error',
      statusCode: 500
    }
  }]
}

for (const item of $input.all()) {
  const body = item.json.body || item.json
  const auth = body.auth || {}

  // 2. Validate Telegram initData HMAC
  const initData = auth.initData || ''
  if (!initData) {
    return [{
      json: {
        error: 'Invalid authentication',
        statusCode: 401
      }
    }]
  }

  // Parse initData into key-value pairs
  // Replace + with %2B to prevent URLSearchParams from decoding + as space
  const initDataFixed = initData.replace(/\+/g, '%2B')
  const params = new URLSearchParams(initDataFixed)
  const hash = params.get('hash')
  if (!hash) {
    return [{
      json: {
        error: 'Invalid authentication',
        statusCode: 401
      }
    }]
  }

  // Check expiration
  const authDate = parseInt(params.get('auth_date') || '0', 10)
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 3600) {
    return [{
      json: {
        error: 'Authentication expired',
        statusCode: 401
      }
    }]
  }

  // Remove hash and sort
  params.delete('hash')
  const sortedKeys = Array.from(params.keys()).sort()
  const dataCheckString = sortedKeys
    .map(key => `${key}=${params.get(key)}`)
    .join('\n')

  // Compute HMAC
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (computedHash !== hash) {
    return [{
      json: {
        error: 'Invalid authentication',
        statusCode: 401
      }
    }]
  }

  // 3. Extract userId
  const userJson = params.get('user')
  let userId = null
  if (userJson) {
    try {
      const user = JSON.parse(decodeURIComponent(userJson))
      userId = user.id?.toString() || null
    } catch (e) {
      return [{
        json: {
          error: 'Invalid user data',
          statusCode: 401
        }
      }]
    }
  }

  if (!userId) {
    return [{
      json: {
        error: 'Access denied',
        statusCode: 403
      }
    }]
  }

  // Pass through with userId and parsed body
  items.push({
    json: {
      ...body,
      userId,
      action: body.action,
      payload: body.payload || {}
    }
  })
}

return items
