// Set DEVICE_API_BASE_URL when a real or mocked API is available.
const API_BASE_URL = process.env.DEVICE_API_BASE_URL || 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = 10_000
const STALE_AFTER_MS = 10 * 60 * 1000

function createTimeoutSignal() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  return { signal: controller.signal, timeoutId }
}

async function readJson(response, endpoint) {
  try {
    return await response.json()
  } catch {
    throw new Error(`Malformed JSON returned by ${endpoint}.`)
  }
}

async function request(endpoint, options) {
  const { signal, timeoutId } = createTimeoutSignal()

  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, { ...options, signal })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out. The device may be offline.`)
    }

    throw new Error(`Could not reach ${endpoint}. Check that the device is online.`, { cause: error })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Logs in and returns the authentication token from POST /login.
 * Credentials are optional for now because the backend will be mocked later.
 */
async function login(credentials = {}) {
  const response = await request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (response.status === 401) {
    throw new Error('Login failed: invalid credentials.')
  }

  if (!response.ok) {
    throw new Error(`Login failed: server returned HTTP ${response.status}.`)
  }

  const data = await readJson(response, '/login')
  if (!data || typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error('Invalid login response: missing auth token.')
  }

  return data.token
}

function validateStatus(data) {
  const requiredFields = ['level_percent', 'pump_state', 'last_seen']
  const missingFields = requiredFields.filter((field) => data?.[field] === undefined || data[field] === null)

  if (missingFields.length > 0) {
    throw new Error(`Invalid status response: missing required field(s): ${missingFields.join(', ')}.`)
  }

  if (
    typeof data.level_percent !== 'number' ||
    !Number.isFinite(data.level_percent) ||
    data.level_percent < 0 ||
    data.level_percent > 100
  ) {
    throw new Error('Invalid status response: level_percent must be a number from 0 to 100.')
  }

  if (data.pump_state !== 'on' && data.pump_state !== 'off') {
    throw new Error('Invalid status response: pump_state must be "on" or "off".')
  }

  const lastSeenTime = new Date(data.last_seen).getTime()
  if (Number.isNaN(lastSeenTime)) {
    throw new Error('Invalid status response: last_seen must be a valid timestamp.')
  }

  return {
    ...data,
    last_seen_stale: Date.now() - lastSeenTime > STALE_AFTER_MS,
  }
}

/**
 * Fetches and validates GET /device/{id}/status.
 * Returns the API status plus last_seen_stale, which is true after 10 minutes.
 */
async function getStatus(deviceId, token) {
  const endpoint = `/device/${encodeURIComponent(deviceId)}/status`
  const response = await request(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 401) {
    throw new Error('Unauthorised: the token is invalid or expired.')
  }

  if (response.status === 404) {
    throw new Error(`Device not found: ${deviceId}.`)
  }

  if (response.status === 408 || response.status === 503 || response.status === 504) {
    throw new Error(`Device is offline or timed out (HTTP ${response.status}).`)
  }

  if (!response.ok) {
    throw new Error(`Could not get device status: server returned HTTP ${response.status}.`)
  }

  const data = await readJson(response, endpoint)
  return validateStatus(data)
}

module.exports = { login, getStatus }
