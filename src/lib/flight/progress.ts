import type { FlightStatus } from './status'
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

/** Where the plane sits along the route, 0..1, or null when there is no plane to show. */
export function planeFraction(status: FlightStatus, progress: number | null): number | null {
  if (status === 'cancelled' || status === 'diverted') return null
  if (status === 'landed' || status === 'landed_late') return 1
  if (status === 'scheduled' || status === 'delayed') return 0
  return progress ?? 0.5
}
