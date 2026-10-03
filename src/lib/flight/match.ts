import type { Flight } from './types'

interface PickOptions { dep?: string; arr?: string; date?: string; now: Date }

export function pickFlight(flights: Flight[], { dep, arr, date, now }: PickOptions): Flight | null {
  let candidates = flights
  if (dep) candidates = candidates.filter((f) => f.departure.airport.iata === dep)
  if (arr) candidates = candidates.filter((f) => f.arrival.airport.iata === arr)
  if (date) candidates = candidates.filter((f) => f.departure.scheduledLocal?.startsWith(date))
  if (candidates.length === 0) return null

  const distance = (f: Flight) => {
    const t = Date.parse(f.departure.scheduledUtc ?? '')
    return Number.isNaN(t) ? Infinity : Math.abs(t - now.getTime())
  }
  return [...candidates].sort((a, b) => distance(a) - distance(b))[0]
}
