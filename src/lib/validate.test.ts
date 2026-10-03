import { describe, expect, it } from 'vitest'
import { parseAirlineCode, parseDate, parseFlightNumber, parseIata } from './validate'

describe('parseFlightNumber', () => {
  it('normalizes valid numbers', () => {
    expect(parseFlightNumber(' aa 123 ')).toEqual({ ok: true, data: 'AA123' })
    expect(parseFlightNumber('U21234')).toEqual({ ok: true, data: 'U21234' })
    expect(parseFlightNumber('BA7B')).toEqual({ ok: true, data: 'BA7B' })
  })
  it.each(['', 'A', '123', 'AA', 'AA12345', 'AA-12', '!!123'])('rejects %j', (input) => {
    const res = parseFlightNumber(input)
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })
})

describe('parseIata', () => {
  it('accepts 3 letters', () => expect(parseIata('jfk')).toEqual({ ok: true, data: 'JFK' }))
  it.each(['', 'JF', 'JFKK', 'J1K'])('rejects %j', (input) =>
    expect(parseIata(input).ok).toBe(false))
})

describe('parseAirlineCode', () => {
  it('accepts 2 chars', () => expect(parseAirlineCode('aa')).toEqual({ ok: true, data: 'AA' }))
  it.each(['', 'A', 'AAA', '!!'])('rejects %j', (input) =>
    expect(parseAirlineCode(input).ok).toBe(false))
})

describe('parseDate', () => {
  it('accepts real dates', () => expect(parseDate('2026-02-28')).toEqual({ ok: true, data: '2026-02-28' }))
  it.each(['', '2026-13-01', '2026-02-30', '02-28-2026', 'tomorrow'])('rejects %j', (input) =>
    expect(parseDate(input).ok).toBe(false))
})
