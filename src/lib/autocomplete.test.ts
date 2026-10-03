import { describe, expect, it } from 'vitest'
import { searchAirlines, searchAirports } from './autocomplete'

describe('searchAirports', () => {
  it('finds an airport by exact code and ranks it first', () => {
    const r = searchAirports('jfk')
    expect(r[0].code).toBe('JFK')
    expect(r[0].label).toMatch(/^JFK · /)
  })
  it('finds by city, case-insensitively', () => {
    expect(searchAirports('new york').some((s) => s.code === 'JFK')).toBe(true)
  })
  it('respects the limit and returns [] for short or blank queries', () => {
    expect(searchAirports('a', 8)).toEqual([])
    expect(searchAirports('   ')).toEqual([])
    expect(searchAirports('lon', 3).length).toBeLessThanOrEqual(3)
  })
  it('does not break on regex characters', () => {
    expect(() => searchAirports('(((')).not.toThrow()
  })
})

describe('searchAirlines', () => {
  it('finds an airline by code and by name', () => {
    expect(searchAirlines('AA')[0].code).toBe('AA')
    expect(searchAirlines('lufthansa').some((s) => s.code === 'LH')).toBe(true)
  })
})
