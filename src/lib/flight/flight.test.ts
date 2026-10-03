// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { EndpointInfo, Flight } from './types'
import { delayMinutes, formatDuration, localTime } from './time'
import { deriveStatus } from './status'
import { flightProgress } from './progress'
import { pickFlight } from './match'

const airport = (iata: string) => ({ iata, icao: null, name: iata, city: iata, countryCode: null, lat: null, lon: null })
const ep = (iata: string, scheduledUtc: string, extra: Partial<EndpointInfo> = {}): EndpointInfo => ({
  airport: airport(iata), scheduledUtc, scheduledLocal: scheduledUtc.slice(0, 16).replace('T', ' ') + '+00:00',
  revisedUtc: null, revisedLocal: null, actualUtc: null, actualLocal: null,
  terminal: null, gate: null, checkInDesk: null, ...extra,
})
const flight = (over: Partial<Flight> & { dep?: EndpointInfo; arr?: EndpointInfo } = {}): Flight => ({
  number: 'AA100', airlineName: 'American', airlineIata: 'AA', aircraftModel: null, rawStatus: null, position: null,
  departure: over.dep ?? ep('JFK', '2026-10-03T10:00:00Z'),
  arrival: over.arr ?? ep('LAX', '2026-10-03T11:30:00Z'),
  ...over,
})
const at = (iso: string) => new Date(iso)

describe('time helpers', () => {
  it('computes delay from revised or actual vs scheduled', () => {
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:45:00Z' }))).toBe(45)
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z', { actualUtc: '2026-10-03T09:55:00Z' }))).toBe(-5)
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z'))).toBe(0)
  })
  it('extracts HH:MM from a local timestamp', () => {
    expect(localTime('2025-02-01 14:30+01:00')).toBe('14:30')
    expect(localTime(null)).toBeNull()
  })
  it('formats durations', () => {
    expect(formatDuration(135 * 60_000)).toBe('2h 15m')
    expect(formatDuration(40 * 60_000)).toBe('40m')
    expect(formatDuration(-5)).toBe('0m')
  })
})

describe('deriveStatus', () => {
  const f = (rawStatus: string | null, extra: Partial<Flight> = {}) => flight({ rawStatus, ...extra })
  const noon = at('2026-10-03T10:30:00Z')
  it.each([
    ['Canceled', 'cancelled'],
    ['CanceledUncertain', 'cancelled'],
    ['Diverted', 'diverted'],
    ['Arrived', 'landed'],
    ['Departed', 'in_air'],
    ['EnRoute', 'in_air'],
    ['Approaching', 'in_air'],
    ['Boarding', 'scheduled'],
    ['Expected', 'scheduled'],
    ['Delayed', 'delayed'],
  ])('maps %s to %s', (raw, expected) => expect(deriveStatus(f(raw), noon)).toBe(expected))

  it('falls back to timestamps for unknown status', () => {
    expect(deriveStatus(f('Unknown'), at('2026-10-03T09:00:00Z'))).toBe('scheduled')
    expect(deriveStatus(f(null), at('2026-10-03T10:30:00Z'))).toBe('in_air')
    expect(deriveStatus(f(null), at('2026-10-03T12:00:00Z'))).toBe('landed')
  })
  it('flags delays of 15+ minutes before departure, not smaller ones', () => {
    const late = flight({ rawStatus: 'Expected', dep: ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:20:00Z' }) })
    const slight = flight({ rawStatus: 'Expected', dep: ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:10:00Z' }) })
    expect(deriveStatus(late, at('2026-10-03T08:00:00Z'))).toBe('delayed')
    expect(deriveStatus(slight, at('2026-10-03T08:00:00Z'))).toBe('scheduled')
  })
})

describe('flightProgress', () => {
  it('uses real timestamps (a 90-minute flight is halfway at 45 minutes)', () => {
    expect(flightProgress(flight(), at('2026-10-03T10:45:00Z'))).toBeCloseTo(0.5)
  })
  it('clamps to 0..1', () => {
    expect(flightProgress(flight(), at('2026-10-03T08:00:00Z'))).toBe(0)
    expect(flightProgress(flight(), at('2026-10-03T20:00:00Z'))).toBe(1)
  })
  it('returns null without usable times', () => {
    const f = flight({ dep: { ...ep('JFK', '2026-10-03T10:00:00Z'), scheduledUtc: null } })
    expect(flightProgress(f, at('2026-10-03T10:45:00Z'))).toBeNull()
  })
})

describe('pickFlight', () => {
  const today = flight({ number: 'AA100' })
  const tomorrow = flight({ dep: ep('JFK', '2026-10-04T10:00:00Z'), arr: ep('LAX', '2026-10-04T11:30:00Z') })
  const otherLeg = flight({ dep: ep('LAX', '2026-10-03T14:00:00Z'), arr: ep('SFO', '2026-10-03T15:00:00Z') })
  const now = at('2026-10-03T09:00:00Z')

  it('picks the entry closest to now', () => {
    expect(pickFlight([tomorrow, today], { now })).toBe(today)
  })
  it('filters by departure and arrival airports', () => {
    expect(pickFlight([otherLeg, today], { dep: 'JFK', arr: 'LAX', now })).toBe(today)
    expect(pickFlight([otherLeg], { dep: 'JFK', now })).toBeNull()
  })
  it('filters by local date when given', () => {
    expect(pickFlight([today, tomorrow], { date: '2026-10-04', now })).toBe(tomorrow)
    expect(pickFlight([today], { date: '2026-10-05', now })).toBeNull()
  })
  it('returns null for an empty list', () => expect(pickFlight([], { now })).toBeNull())
})
