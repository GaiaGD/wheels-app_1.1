import type { Flight } from './types'

interface PickOptions { dep?: string; arr?: string; date?: string; now: Date }

const same = (a: string | null | undefined, b: string) => a?.toUpperCase() === b.toUpperCase()

export function pickFlight(flights: Flight[], { dep, arr, date, now }: PickOptions): Flight | null {
  let candidates = flights
  if (dep) candidates = candidates.filter((f) => same(f.departure.airport.iata, dep))
  if (arr) candidates = candidates.filter((f) => same(f.arrival.airport.iata, arr))
  if (date) candidates = candidates.filter((f) => f.departure.scheduledLocal?.startsWith(date))
  if (candidates.length === 0) return null

  // Distance to now in ms, or null when the flight has no usable scheduled time.
  const distance = (f: Flight): number | null => {
    const t = Date.parse(f.departure.scheduledUtc ?? '')
    return Number.isNaN(t) ? null : Math.abs(t - now.getTime())
  }
  const ranked = candidates
    .map((flight) => ({ flight, d: distance(flight) }))
    .sort((a, b) => (a.d === null ? 1 : 0) - (b.d === null ? 1 : 0) || (a.d ?? 0) - (b.d ?? 0))

  // Never guess: several candidates and not even the best has a usable time.
  if (ranked.length > 1 && ranked[0].d === null) return null
  return ranked[0].flight
}
