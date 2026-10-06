import { describe, expect, it } from 'vitest'
import { bearing, distanceKm, greatCircleLine, interpolate, planePosition } from './geo'
import { planeFraction } from './progress'
import type { FlightStatus } from './status'

const JFK = { lat: 40.64, lon: -73.78 }
const LAX = { lat: 33.94, lon: -118.41 }
const NRT = { lat: 35.77, lon: 140.39 }

describe('distanceKm', () => {
  it('JFK to LAX is about 3950 km', () => {
    const d = distanceKm(JFK, LAX)
    expect(d).toBeGreaterThan(3900)
    expect(d).toBeLessThan(4000)
  })
  it('is 0 for identical points', () => {
    expect(distanceKm(JFK, JFK)).toBe(0)
  })
})

describe('interpolate', () => {
  it('returns the endpoints at 0 and 1', () => {
    const s = interpolate(JFK, LAX, 0)
    const e = interpolate(JFK, LAX, 1)
    expect(s.lat).toBeCloseTo(JFK.lat, 6)
    expect(s.lon).toBeCloseTo(JFK.lon, 6)
    expect(e.lat).toBeCloseTo(LAX.lat, 6)
    expect(e.lon).toBeCloseTo(LAX.lon, 6)
  })
  it('midpoint is equidistant and about half the total', () => {
    const m = interpolate(JFK, LAX, 0.5)
    const total = distanceKm(JFK, LAX)
    expect(Math.abs(distanceKm(JFK, m) - distanceKm(m, LAX))).toBeLessThan(1)
    expect(Math.abs(distanceKm(JFK, m) - total / 2)).toBeLessThan(1)
  })
  it('clamps fractions outside 0..1', () => {
    expect(interpolate(JFK, LAX, -1)).toEqual(interpolate(JFK, LAX, 0))
    expect(interpolate(JFK, LAX, 2)).toEqual(interpolate(JFK, LAX, 1))
  })
  it('returns the point for identical inputs without NaN', () => {
    expect(interpolate(JFK, JFK, 0.5)).toEqual(JFK)
  })
})

describe('bearing', () => {
  it('JFK to LAX heads west-ish', () => {
    const b = bearing(JFK, LAX)
    expect(b).toBeGreaterThan(265)
    expect(b).toBeLessThan(281)
  })
  it('LAX to NRT heads north-west-ish', () => {
    const b = bearing(LAX, NRT)
    expect(b).toBeGreaterThan(295)
    expect(b).toBeLessThan(315)
  })
  it('is always within 0..360', () => {
    for (const [a, b] of [[JFK, LAX], [LAX, NRT], [NRT, JFK], [LAX, JFK]] as const) {
      const r = bearing(a, b)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(360)
    }
  })
})

describe('greatCircleLine', () => {
  it('has steps + 1 points from a to b', () => {
    const line = greatCircleLine(JFK, LAX)
    expect(line).toHaveLength(65)
    expect(line[0]).toEqual([JFK.lon, JFK.lat])
    expect(line[64][0]).toBeCloseTo(LAX.lon, 6)
    expect(line[64][1]).toBeCloseTo(LAX.lat, 6)
  })
  it.each([
    ['LAX to NRT', LAX, NRT],
    ['NRT to LAX', NRT, LAX],
  ])('does not jump across the date line (%s)', (_n, a, b) => {
    const line = greatCircleLine(a, b)
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(30)
    }
    const diff = (line[line.length - 1][0] - b.lon) % 360
    expect(Math.abs(diff)).toBeCloseTo(0, 6)
  })
})

describe('planePosition', () => {
  it('is null with no fraction and no real position', () => {
    expect(planePosition(JFK, LAX, null, null)).toBeNull()
  })
  it('prefers the real position', () => {
    const p = planePosition(JFK, LAX, 0.5, { lat: 39, lon: -90 })
    expect(p).not.toBeNull()
    expect(p!.estimated).toBe(false)
    expect(p!.lat).toBe(39)
    expect(p!.lon).toBe(-90)
    expect(p!.bearing).toBeGreaterThanOrEqual(0)
    expect(p!.bearing).toBeLessThan(360)
  })
  it('estimates from the fraction otherwise', () => {
    const p = planePosition(JFK, LAX, 0.5, null)
    expect(p!.estimated).toBe(true)
    expect(typeof p!.bearing).toBe('number')
    expect(p!.bearing).toBeGreaterThanOrEqual(0)
    expect(p!.bearing).toBeLessThan(360)
  })
})

describe('planeFraction', () => {
  it.each<[FlightStatus, number | null, number | null]>([
    ['cancelled', 0.4, null],
    ['diverted', 0.4, null],
    ['landed', null, 1],
    ['scheduled', 0.4, 0],
    ['delayed', 0.4, 0],
    ['in_air', 0.4, 0.4],
    ['in_air', null, 0.5],
  ])('%s with %s gives %s', (status, progress, expected) => {
    expect(planeFraction(status, progress)).toBe(expected)
  })
})
