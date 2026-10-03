import airports from '@/data/airports.json'
import airlines from '@/data/airlines.json'

export interface Suggestion {
  code: string
  label: string
  detail: string
}

const norm = (s: string) => s.trim().toLowerCase()

function rank(code: string, fields: string[], q: string): number {
  if (code.toLowerCase() === q) return 0
  if (code.toLowerCase().startsWith(q)) return 1
  if (fields.some((f) => f.toLowerCase().startsWith(q))) return 2
  if (fields.some((f) => f.toLowerCase().includes(q))) return 3
  return -1
}

export function searchAirports(query: string, limit = 8): Suggestion[] {
  const q = norm(query)
  if (q.length < 2) return []
  return airports
    .map((a) => ({ a, r: rank(a.iata, [a.city, a.name, a.country], q) }))
    .filter((x) => x.r >= 0)
    .sort((x, y) => x.r - y.r)
    .slice(0, limit)
    .map(({ a }) => ({
      code: a.iata,
      label: `${a.iata} · ${a.city}`,
      detail: [a.name, a.country].filter(Boolean).join(', '),
    }))
}

export function searchAirlines(query: string, limit = 8): Suggestion[] {
  const q = norm(query)
  if (q.length < 2) return []
  return airlines
    .map((a) => ({ a, r: rank(a.iata, [a.name, a.country], q) }))
    .filter((x) => x.r >= 0)
    .sort((x, y) => x.r - y.r)
    .slice(0, limit)
    .map(({ a }) => ({
      code: a.iata,
      label: a.name,
      detail: [a.iata, a.country].filter(Boolean).join(' · '),
    }))
}
