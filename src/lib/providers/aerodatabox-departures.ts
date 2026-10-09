import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockRouteFlights } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseAirlineCode, parseIata } from '../validate'
import type { RouteFlight } from '../flight/types'

const PROVIDER = 'aerodatabox'

// Each board call costs 2 API units on the free plan, so lists are cached for 10 minutes.
// The flight page itself still refreshes every minute.
const BOARD_REVALIDATE_SECONDS = 600
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
        arrival: z
          .object({
            airport: z.object({ iata: z.string().nullish() }).nullish(),
            scheduledTime: timeSchema,
            revisedTime: timeSchema,
            runwayTime: timeSchema,
          })
          .nullish(),
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

/** "2026-10-08 20:05Z" -> epoch ms (NaN if missing). */
function utcMs(t: { utc?: string | null } | null | undefined): number {
  return t?.utc ? Date.parse(t.utc.replace(' ', 'T')) : NaN
}

/** The board keeps saying "Departed" long after touchdown, so treat a departed flight as arrived
    once it has a runway arrival time or its best arrival estimate is in the past. */
function effectiveStatus(
  status: string | null | undefined,
  arrival: { scheduledTime?: { utc?: string | null } | null; revisedTime?: { utc?: string | null } | null; runwayTime?: { utc?: string | null } | null } | null | undefined,
  now: number,
): string | null {
  const s = (status ?? '').toLowerCase()
  if (s !== 'departed' && s !== 'enroute' && s !== 'approaching') return status ?? null
  const landed = utcMs(arrival?.runwayTime) <= now
  const estimate = utcMs(arrival?.revisedTime ?? arrival?.scheduledTime)
  return landed || estimate <= now ? 'Arrived' : (status ?? null)
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
      revalidate: BOARD_REVALIDATE_SECONDS,
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[route-match]', JSON.stringify({ number, status: d.status, depUtc: utc, arr: d.arrival, duplicate: seen.has(id) }))
    }
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
        status: effectiveStatus(d.status, d.arrival, now),
      },
    })
  }
  rows.sort((a, b) => b.utc.localeCompare(a.utc))

  return rows.length > 0
    ? ok(rows.map((r) => r.flight))
    : fail('not_found', PROVIDER, 'No flights on this route in the last 24 hours')
}
