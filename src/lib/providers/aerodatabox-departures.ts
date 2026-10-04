import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockRouteFlights } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseAirlineCode, parseIata } from '../validate'
import type { RouteFlight } from '../flight/types'

const PROVIDER = 'aerodatabox'
const HOST = 'aerodatabox.p.rapidapi.com'
const MIN = 60_000
/** Each board window must stay under the API's 12 h limit. */
const WINDOW_MIN = 11 * 60 + 59

const timeSchema = z.object({ utc: z.string().nullish(), local: z.string().nullish() }).nullish()
const timeResponse = z.object({ time: z.object({ utc: z.string().nullish(), local: z.string().nullish() }) })
const boardResponse = z.object({
  departures: z
    .array(
      z.object({
        number: z.string().nullish(),
        status: z.string().nullish(),
        airline: z.object({ iata: z.string().nullish() }).nullish(),
        departure: z.object({ scheduledTime: timeSchema }).nullish(),
        arrival: z.object({ airport: z.object({ iata: z.string().nullish() }).nullish() }).nullish(),
      }),
    )
    .nullish(),
})

/** Offset in minutes parsed from a local time string such as "2026-10-03 20:47-07:00". */
function offsetMinutes(local: string | null | undefined): number | null {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(local ?? '')
  if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
  return local?.endsWith('Z') ? 0 : null
}

/** "YYYY-MM-DDTHH:mm" for a UTC instant shifted by the airport's offset. */
function formatLocal(utcMs: number, offsetMin: number): string {
  return new Date(utcMs + offsetMin * MIN).toISOString().slice(0, 16)
}

export async function searchRouteFlights(q: {
  dep: string
  arr: string
  airline: string
}): Promise<Result<RouteFlight[]>> {
  const dep = parseIata(q.dep)
  if (!dep.ok) return dep
  const arr = parseIata(q.arr)
  if (!arr.ok) return arr
  const airline = parseAirlineCode(q.airline)
  if (!airline.ok) return airline

  if (isMockMode()) return mockRouteFlights(dep.data, arr.data, airline.data)

  const key = requireKey('RAPIDAPI_KEY', PROVIDER)
  if (!key.ok) return key

  const init = { headers: { 'X-RapidAPI-Key': key.data, 'X-RapidAPI-Host': HOST } }
  const base = `https://${HOST}`

  // Only the offset is taken from the (cached) response, so the cache stays valid for an hour.
  const tz = await fetchJson({
    provider: PROVIDER,
    url: `${base}/airports/iata/${dep.data}/time/local`,
    init,
    schema: timeResponse,
    revalidate: 3600,
  })
  if (!tz.ok) return tz
  const offset = offsetMinutes(tz.data.time.local)
  if (offset === null) return fail('bad_data', PROVIDER, 'Unreadable airport time')

  const now = Date.now()
  const board = (fromMinAgo: number, toMinAgo: number) =>
    fetchJson({
      provider: PROVIDER,
      url:
        `${base}/flights/airports/iata/${dep.data}/` +
        `${formatLocal(now - fromMinAgo * MIN, offset)}/${formatLocal(now - toMinAgo * MIN, offset)}` +
        `?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`,
      init,
      schema: boardResponse,
      revalidate: 60,
    })
  const [older, newer] = await Promise.all([board(2 * WINDOW_MIN, WINDOW_MIN), board(WINDOW_MIN, 0)])
  if (!older.ok) return older
  if (!newer.ok) return newer

  const seen = new Set<string>()
  const rows: { utc: string; flight: RouteFlight }[] = []
  for (const d of [...(older.data.departures ?? []), ...(newer.data.departures ?? [])]) {
    const number = d.number?.replace(/\s+/g, '').toUpperCase()
    if (!number) continue
    if (d.arrival?.airport?.iata?.toUpperCase() !== arr.data) continue
    if (d.airline?.iata?.toUpperCase() !== airline.data) continue
    const utc = d.departure?.scheduledTime?.utc ?? ''
    const id = `${number}|${utc}`
    if (seen.has(id)) continue
    seen.add(id)
    rows.push({
      utc,
      flight: {
        flightIata: number,
        airlineIata: d.airline?.iata ?? null,
        depIata: dep.data,
        arrIata: arr.data,
        departureLocal: d.departure?.scheduledTime?.local ?? null,
        status: d.status ?? null,
      },
    })
  }
  rows.sort((a, b) => b.utc.localeCompare(a.utc))

  return rows.length > 0
    ? ok(rows.map((r) => r.flight))
    : fail('not_found', PROVIDER, 'No flights on this route in the last 24 hours')
}
