import { describe, expect, it } from 'vitest'
import { safeDecode, parseAirlineCode, parseDate, parseFlightNumber, parseIata } from './validate'

describe('parseFlightNumber', () => {
  it('normalizes valid numbers', () => {
    expect(parseFlightNumber(' aa 123 ')).toEqual({ ok: true, data: 'AA123' })
    expect(parseFlightNumber('U21234')).toEqual({ ok: true, data: 'U21234' })
    expect(parseFlightNumber('BA7B')).toEqual({ ok: true, data: 'BA7B' })
    expect(parseFlightNumber('6E123')).toEqual({ ok: true, data: '6E123' })
    expect(parseFlightNumber('9w1')).toEqual({ ok: true, data: '9W1' })
    expect(parseFlightNumber('3K1234')).toEqual({ ok: true, data: '3K1234' })
  })
  it.each(['', 'A', '123', 'AA', 'AA12345', 'AA-12', '!!123', '12345', '1234', '11', '00123'])('rejects %j', (input) => {
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
  it('accepts 2 chars', () => {
    expect(parseAirlineCode('aa')).toEqual({ ok: true, data: 'AA' })
    expect(parseAirlineCode('6e')).toEqual({ ok: true, data: '6E' })
    expect(parseAirlineCode('9w')).toEqual({ ok: true, data: '9W' })
  })
  it.each(['', 'A', 'AAA', '!!', '12', '00'])('rejects %j', (input) =>
    expect(parseAirlineCode(input).ok).toBe(false))
})

describe('parseDate', () => {
  it('accepts real dates', () => expect(parseDate('2026-02-28')).toEqual({ ok: true, data: '2026-02-28' }))
  it.each(['', '2026-13-01', '2026-02-30', '02-28-2026', 'tomorrow'])('rejects %j', (input) =>
    expect(parseDate(input).ok).toBe(false))
})

describe('safeDecode', () => {
  it('decodes valid sequences', () => {
    expect(safeDecode('AA%20100')).toBe('AA 100')
  })
  it('returns null on malformed percent sequences', () => {
    expect(safeDecode('%E0%A4%A')).toBeNull()
  })
})
