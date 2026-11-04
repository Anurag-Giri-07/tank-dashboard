const { login, getStatus } = require('./deviceClient')

const originalFetch = global.fetch

function mockResponse({ status = 200, body = {} } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  }
}

function validStatus(overrides = {}) {
  return {
    level_percent: 55,
    pump_state: 'on',
    last_seen: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
  global.fetch = originalFetch
})

test('API-01: happy path logs in and returns a valid device status', async () => {
  global.fetch
    .mockResolvedValueOnce(mockResponse({ body: { token: 'test-token' } }))
    .mockResolvedValueOnce(mockResponse({ body: validStatus() }))

  const token = await login({ username: 'student', password: 'password' })
  const status = await getStatus('tank-1', token)

  expect(token).toBe('test-token')
  expect(status).toMatchObject({ level_percent: 55, pump_state: 'on', last_seen_stale: false })
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    'http://localhost:3000/device/tank-1/status',
    expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
  )
})

test('API-02: invalid token returns an unauthorised error', async () => {
  global.fetch.mockResolvedValue(mockResponse({ status: 401 }))

  await expect(getStatus('tank-1', 'invalid-token')).rejects.toThrow(
    'Unauthorised: the token is invalid or expired.',
  )
})

test('API-03: an expired token returns the same unauthorised error', async () => {
  global.fetch.mockResolvedValue(mockResponse({ status: 401 }))

  await expect(getStatus('tank-1', 'expired-token')).rejects.toThrow(
    'Unauthorised: the token is invalid or expired.',
  )
})

test('API-04: device not found returns a clear error', async () => {
  global.fetch.mockResolvedValue(mockResponse({ status: 404 }))

  await expect(getStatus('missing-tank', 'test-token')).rejects.toThrow('Device not found: missing-tank.')
})

test('API-05: an AbortError is reported as a device timeout', async () => {
  const timeoutError = new Error('request aborted')
  timeoutError.name = 'AbortError'
  global.fetch.mockRejectedValue(timeoutError)

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'Request to /device/tank-1/status timed out. The device may be offline.',
  )
})

test('API-05b: HTTP 503 is reported as the device being offline', async () => {
  global.fetch.mockResolvedValue(mockResponse({ status: 503 }))

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'Device is offline or timed out (HTTP 503).',
  )
})

test('API-06: malformed JSON returns a clear error', async () => {
  const response = mockResponse()
  response.json.mockRejectedValue(new SyntaxError('Unexpected token'))
  global.fetch.mockResolvedValue(response)

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'Malformed JSON returned by /device/tank-1/status.',
  )
})

test('API-07: a missing field is named in the error', async () => {
  const body = validStatus()
  delete body.pump_state
  global.fetch.mockResolvedValue(mockResponse({ body }))

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'missing required field(s): pump_state',
  )
})

test('API-08: an out-of-range level is rejected', async () => {
  global.fetch.mockResolvedValue(mockResponse({ body: validStatus({ level_percent: 101 }) }))

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'Invalid status response: level_percent must be a number from 0 to 100.',
  )
})

test('API-09: an invalid pump_state is rejected', async () => {
  global.fetch.mockResolvedValue(mockResponse({ body: validStatus({ pump_state: 'broken' }) }))

  await expect(getStatus('tank-1', 'test-token')).rejects.toThrow(
    'pump_state must be "on" or "off".',
  )
})

test('API-10: stale and fresh last_seen timestamps are flagged correctly', async () => {
  const now = new Date('2026-11-03T12:00:00.000Z').getTime()
  jest.spyOn(Date, 'now').mockReturnValue(now)
  global.fetch
    .mockResolvedValueOnce(
      mockResponse({ body: validStatus({ last_seen: new Date(now - 10 * 60 * 1000 - 1).toISOString() }) }),
    )
    .mockResolvedValueOnce(mockResponse({ body: validStatus({ last_seen: new Date(now - 60_000).toISOString() }) }))

  await expect(getStatus('tank-1', 'test-token')).resolves.toMatchObject({ last_seen_stale: true })
  await expect(getStatus('tank-1', 'test-token')).resolves.toMatchObject({ last_seen_stale: false })
})
