import { fail, ok, type Result } from './result'

const bad = (message: string) => fail('bad_input', 'input', message)

export function parseFlightNumber(input: string): Result<string> {
  const v = input.replace(/\s+/g, '').toUpperCase()
  return /^(?:[A-Z][A-Z0-9]|[0-9][A-Z])\d{1,4}[A-Z]?$/.test(v) ? ok(v) : bad('Invalid flight number')
}

export function parseIata(input: string): Result<string> {
  const v = input.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(v) ? ok(v) : bad('Invalid airport code')
}

export function parseAirlineCode(input: string): Result<string> {
  const v = input.trim().toUpperCase()
  return /^(?:[A-Z][A-Z0-9]|[0-9][A-Z])$/.test(v) ? ok(v) : bad('Invalid airline code')
}

export function parseDate(input: string): Result<string> {
  const v = input.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return bad('Invalid date')
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) ? ok(v) : bad('Invalid date')
}
