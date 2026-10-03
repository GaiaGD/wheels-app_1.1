import { bestUtc } from './time'
import type { Flight } from './types'

/** Fraction of the flight completed, 0..1, from real timestamps. */
export function flightProgress(f: Flight, now: Date): number | null {
  const dep = Date.parse(bestUtc(f.departure) ?? '')
  const arr = Date.parse(bestUtc(f.arrival) ?? '')
  const total = arr - dep
  if (Number.isNaN(total) || total <= 0) return null
  return Math.min(1, Math.max(0, (now.getTime() - dep) / total))
}
