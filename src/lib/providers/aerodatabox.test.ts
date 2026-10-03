// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlightDetails } from './aerodatabox'

const sample = [{
  number: 'AA 100',
  status: 'EnRoute',
  airline: { name: 'American Airlines', iata: 'AA' },
  aircraft: { model: 'Boeing 777' },
  departure: {
    airport: { name: 'John F Kennedy Intl', iata: 'JFK', icao: 'KJFK', municipalityName: 'New York', countryCode: 'US', location: { lat: 40.6, lon: -73.7 } },
    scheduledTime: { utc: '2026-10-03 10:00Z', local: '2026-10-03 06:00-04:00' },
    revisedTime: { utc: '2026-10-03 10:20Z', local: '2026-10-03 06:20-04:00' },
    terminal: '8', gate: null,
  },
  arrival: {
    airport: { name: 'Los Angeles Intl', iata: 'LAX', municipalityName: 'Los Angeles', countryCode: 'US' },
    scheduledTime: { utc: '2026-10-03 16:00Z', local: '2026-10-03 09:00-07:00' },
  },
  location: { lat: 39.1, lon: -95.2 },
}]

beforeEach(() => {
  vi.stubEnv('RAPIDAPI_KEY', 'test-key')
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

describe('getFlightDetails', () => {
  it('maps the API response to Flight objects', async () => {
    stubFetch(sample)
    const res = await getFlightDetails('aa 100')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const f = res.data[0]
    expect(f.number).toBe('AA 100')
    expect(f.airlineName).toBe('American Airlines')
    expect(f.rawStatus).toBe('EnRoute')
    expect(f.departure.airport).toMatchObject({ iata: 'JFK', city: 'New York', lat: 40.6 })
    expect(f.departure.scheduledLocal).toBe('2026-10-03 06:00-04:00')
    expect(f.departure.revisedUtc).toBe('2026-10-03 10:20Z')
    expect(f.departure.terminal).toBe('8')
    expect(f.arrival.airport.lat).toBeNull()
    expect(f.position).toEqual({ lat: 39.1, lon: -95.2 })
  })

  it('sends the key in headers, not in the URL, and includes the date when given', async () => {
    stubFetch(sample)
    await getFlightDetails('AA100', { date: '2026-10-03' })
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toContain('/flights/number/AA100/2026-10-03')
    expect(url).not.toContain('test-key')
    expect(init.headers['X-RapidAPI-Key']).toBe('test-key')
  })

  it('rejects invalid input before calling the API', async () => {
    stubFetch(sample)
    const res = await getFlightDetails('nope')
    expect(res.ok === false && res.error.kind).toBe('bad_input')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an invalid date', async () => {
    const res = await getFlightDetails('AA100', { date: '2026-99-99' })
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })

  it('returns not_found for an empty array', async () => {
    stubFetch([])
    const res = await getFlightDetails('AA100')
    expect(res.ok === false && res.error.kind).toBe('not_found')
  })

  it('returns misconfigured when the key is missing', async () => {
    vi.stubEnv('RAPIDAPI_KEY', '')
    const res = await getFlightDetails('AA100')
    expect(res.ok === false && res.error.kind).toBe('misconfigured')
  })

  it('uses fixtures in mock mode without calling fetch', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'true')
    vi.stubGlobal('fetch', vi.fn())
    const res = await getFlightDetails('AA100')
    expect(res.ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})
