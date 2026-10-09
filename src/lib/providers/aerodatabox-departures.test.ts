// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchRouteFlights } from './aerodatabox-departures'

const item = (number: string, arr: string, airline: string, utc: string, local = '2026-10-03 16:20-07:00', status = 'Departed') => ({
  number,
  status,
  airline: { name: 'X', iata: airline },
  departure: { scheduledTime: { utc, local } },
  arrival: { airport: { iata: arr, name: 'Y' }, scheduledTime: { utc: '2026-10-04 10:00Z', local: '2026-10-04 19:00+09:00' } },
  extra: 'stripped',
})

const timeBody = { time: { utc: '2026-10-04 03:47Z', local: '2026-10-03 20:47-07:00' }, timeZoneId: 'America/Los_Angeles' }
const q = { dep: 'LAX', arr: 'NRT', airline: 'NH' }

let calls: { url: string; init?: RequestInit }[]
function stub(opts: { w1?: unknown; w2?: unknown; w1Status?: number; w2Status?: number; timeStatus?: number } = {}) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const json = (b: unknown, s = 200) => Promise.resolve(new Response(JSON.stringify(b), { status: s }))
      if (url.includes('/time/local')) return json(timeBody, opts.timeStatus ?? 200)
      if (url.includes('2026-10-02T20:49')) return json({ departures: opts.w1 ?? [] }, opts.w1Status ?? 200)
      return json({ departures: opts.w2 ?? [] }, opts.w2Status ?? 200)
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-04T03:47:00Z'))
  vi.stubEnv('RAPIDAPI_KEY', 'secret-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('searchRouteFlights', () => {
  it('requests two local-time windows of at most 11h59m, derived from the cached offset', async () => {
    stub()
    await searchRouteFlights(q)
    const boards = calls.filter((c) => c.url.includes('/flights/airports/iata/LAX/'))
    expect(boards).toHaveLength(2)
    const urls = boards.map((c) => c.url)
    expect(urls.some((u) => u.includes('/2026-10-02T20:49/2026-10-03T08:48?'))).toBe(true)
    expect(urls.some((u) => u.includes('/2026-10-03T08:48/2026-10-03T20:47?'))).toBe(true)
    for (const u of urls) expect(u).toContain('direction=Departure')
    expect(calls.filter((c) => c.url.includes('/airports/iata/LAX/time/local'))).toHaveLength(1)
  })

  it('filters by arrival and airline, dedupes, and sorts newest departure first', async () => {
    stub({
      w1: [item('NH 8407', 'NRT', 'NH', '2026-10-03 01:00Z'), item('JL 62', 'NRT', 'JL', '2026-10-03 02:00Z'), item('NH 5', 'HND', 'NH', '2026-10-03 03:00Z')],
      w2: [item('NH 8407', 'NRT', 'NH', '2026-10-03 01:00Z'), item('nh 5', 'nrt', 'nh', '2026-10-03 09:00Z', '2026-10-03 02:00-07:00', 'Scheduled'), item('NH 5', 'NRT', 'NH', '2026-10-03 05:00Z')],
    })
    const res = await searchRouteFlights(q)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.map((f) => f.flightIata)).toEqual(['NH5', 'NH5', 'NH8407'])
    expect(res.data[0]).toEqual({ flightIata: 'NH5', airlineIata: 'nh', depIata: 'LAX', arrIata: 'NRT', departureLocal: '2026-10-03 02:00-07:00', status: 'Scheduled' })
    expect(res.data[2].departureLocal).toBe('2026-10-03 16:20-07:00')
  })

  it('reports a departed flight as arrived once its arrival time has passed', async () => {
    const withArrival = (number: string, arrival: object) => ({ ...item(number, 'NRT', 'NH', '2026-10-03 01:00Z'), arrival: { airport: { iata: 'NRT' }, ...arrival } })
    stub({
      w1: [
        withArrival('NH 1', { scheduledTime: { utc: '2026-10-03 12:00Z' } }),
        withArrival('NH 2', { scheduledTime: { utc: '2026-10-04 10:00Z' }, runwayTime: { utc: '2026-10-03 11:00Z' } }),
        withArrival('NH 3', { scheduledTime: { utc: '2026-10-03 12:00Z' }, revisedTime: { utc: '2026-10-04 06:00Z' } }),
      ],
    })
    const res = await searchRouteFlights(q)
    expect(res.ok && Object.fromEntries(res.data.map((f) => [f.flightIata, f.status]))).toEqual({ NH1: 'Arrived', NH2: 'Arrived', NH3: 'Departed' })
  })

  it('returns not_found when nothing matches', async () => {
    stub({ w1: [item('JL 62', 'NRT', 'JL', '2026-10-03 02:00Z')] })
    const res = await searchRouteFlights(q)
    expect(res.ok === false && res.error.kind).toBe('not_found')
  })

  it('returns bad_input before any network call', async () => {
    stub()
    const res = await searchRouteFlights({ dep: 'XX', arr: 'NRT', airline: 'NH' })
    expect(res.ok === false && res.error.kind).toBe('bad_input')
    expect(calls).toHaveLength(0)
  })

  it('is misconfigured without a key', async () => {
    vi.stubEnv('RAPIDAPI_KEY', '')
    stub()
    const res = await searchRouteFlights(q)
    expect(res.ok === false && res.error.kind).toBe('misconfigured')
    expect(calls).toHaveLength(0)
  })

  it('uses fixtures in mock mode', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'true')
    stub()
    const res = await searchRouteFlights({ dep: 'JFK', arr: 'LAX', airline: 'AA' })
    expect(res.ok && res.data.map((f) => f.flightIata)).toEqual(['AA100', 'AA2'])
    expect(calls).toHaveLength(0)
  })

  it.each([
    ['first window', { w1Status: 429 }, 'rate_limited'],
    ['second window', { w2Status: 403 }, 'misconfigured'],
    ['time lookup', { timeStatus: 429 }, 'rate_limited'],
  ])('propagates an error from the %s', async (_n, opts, kind) => {
    stub({ w1: [item('NH 1', 'NRT', 'NH', '2026-10-03 01:00Z')], w2: [item('NH 2', 'NRT', 'NH', '2026-10-03 02:00Z')], ...opts })
    const res = await searchRouteFlights(q)
    expect(res.ok === false && res.error.kind).toBe(kind)
  })

  it('keeps the key in headers only', async () => {
    stub({ w1: [item('NH 1', 'NRT', 'NH', '2026-10-03 01:00Z')] })
    await searchRouteFlights(q)
    for (const c of calls) {
      expect(c.url).not.toContain('secret-key')
      expect((c.init?.headers as Record<string, string>)['X-RapidAPI-Key']).toBe('secret-key')
    }
  })
})
