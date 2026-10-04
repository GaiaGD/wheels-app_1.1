import { describe, expect, it } from 'vitest'
import { deriveStatus } from '@/lib/flight/status'
import { mockFlightDetails, mockRouteFlights } from './index'

const now = new Date('2026-10-03T12:00:00Z')

describe('mockFlightDetails', () => {
  it.each([
    ['AA100', 'in_air'],
    ['AA2', 'in_air'],
    ['BA117', 'scheduled'],
    ['LH400', 'landed'],
    ['DL1', 'cancelled'],
    ['AF11', 'diverted'],
    ['UA900', 'delayed'],
  ])('%s is %s', (number, status) => {
    const res = mockFlightDetails(number, now)
    expect(res.ok).toBe(true)
    if (res.ok) expect(deriveStatus(res.data[0], now)).toBe(status)
  })

  it('simulates provider errors and unknown flights', () => {
    const kind = (n: string) => { const r = mockFlightDetails(n, now); return r.ok ? 'ok' : r.error.kind }
    expect(kind('ER404')).toBe('provider_down')
    expect(kind('ER429')).toBe('rate_limited')
    expect(kind('ZZ999')).toBe('not_found')
  })
})

describe('mockRouteFlights', () => {
  it('returns two flights for JFK-LAX-AA and not_found otherwise', () => {
    const hit = mockRouteFlights('JFK', 'LAX', 'AA')
    expect(hit.ok && hit.data.map((f) => f.flightIata)).toEqual(['AA100', 'AA2'])
    expect(hit.ok && hit.data[0]).toMatchObject({ departureLocal: '2026-10-03 08:00-04:00', status: 'EnRoute' })
    const miss = mockRouteFlights('JFK', 'LAX', 'BA')
    expect(miss.ok === false && miss.error.kind).toBe('not_found')
  })
})
