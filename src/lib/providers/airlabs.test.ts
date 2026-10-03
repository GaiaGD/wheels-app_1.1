// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchLiveFlights } from './airlabs'

beforeEach(() => {
  vi.stubEnv('AIRLABS_API_KEY', 'test-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))
const q = { dep: 'jfk', arr: 'lax', airline: 'aa' }
const kind = (r: Awaited<ReturnType<typeof searchLiveFlights>>) => (r.ok ? 'ok' : r.error.kind)

describe('searchLiveFlights', () => {
  it('maps live flights and skips entries without a flight code', async () => {
    stubFetch({ response: [
      { flight_iata: 'AA100', airline_iata: 'AA', dep_iata: 'JFK', arr_iata: 'LAX' },
      { flight_iata: null, airline_iata: 'AA', dep_iata: 'JFK', arr_iata: 'LAX' },
    ] })
    const res = await searchLiveFlights(q)
    expect(res).toEqual({ ok: true, data: [{ flightIata: 'AA100', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX' }] })
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('dep_iata=JFK')
  })

  it('URL-encodes the API key', async () => {
    vi.stubEnv('AIRLABS_API_KEY', 'a&b=c d')
    stubFetch({ response: [{ flight_iata: 'AA100' }] })
    await searchLiveFlights(q)
    const url = String(vi.mocked(fetch).mock.calls[0][0])
    expect(url).toContain('api_key=a%26b%3Dc%20d&')
  })

  it('returns not_found when no flights are airborne', async () => {
    stubFetch({ response: [] })
    expect(kind(await searchLiveFlights(q))).toBe('not_found')
  })

  it('maps in-body API errors', async () => {
    stubFetch({ error: { message: 'Unknown api_key', code: 'unknown_api_key' } })
    expect(kind(await searchLiveFlights(q))).toBe('misconfigured')
    stubFetch({ error: { message: 'limit', code: 'minute_limit_exceeded' } })
    expect(kind(await searchLiveFlights(q))).toBe('rate_limited')
    stubFetch({ error: { message: 'other', code: 'something' } })
    expect(kind(await searchLiveFlights(q))).toBe('provider_down')
  })

  it('validates input before calling the API', async () => {
    stubFetch({ response: [] })
    expect(kind(await searchLiveFlights({ dep: 'J', arr: 'LAX', airline: 'AA' }))).toBe('bad_input')
    expect(kind(await searchLiveFlights({ dep: 'JFK', arr: 'LAX', airline: '' }))).toBe('bad_input')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns misconfigured without a key and uses fixtures in mock mode', async () => {
    vi.stubEnv('AIRLABS_API_KEY', '')
    expect(kind(await searchLiveFlights(q))).toBe('misconfigured')
    vi.stubEnv('USE_MOCK_DATA', 'true')
    expect(kind(await searchLiveFlights(q))).toBe('ok')
  })
})
