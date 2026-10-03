import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockFlightDetails } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseDate, parseFlightNumber } from '../validate'
import type { AirportInfo, EndpointInfo, Flight } from '../flight/types'

const PROVIDER = 'aerodatabox'

const time = z.object({ utc: z.string().nullish(), local: z.string().nullish() }).nullish()
const apiAirport = z
  .object({
    name: z.string().nullish(),
    iata: z.string().nullish(),
    icao: z.string().nullish(),
    municipalityName: z.string().nullish(),
    countryCode: z.string().nullish(),
    location: z.object({ lat: z.number(), lon: z.number() }).nullish(),
  })
  .nullish()
const apiEndpoint = z.object({
  airport: apiAirport,
  scheduledTime: time,
  revisedTime: time,
  runwayTime: time,
  terminal: z.string().nullish(),
  gate: z.string().nullish(),
  checkInDesk: z.string().nullish(),
})
const apiFlight = z.object({
  number: z.string(),
  status: z.string().nullish(),
  airline: z.object({ name: z.string().nullish(), iata: z.string().nullish() }).nullish(),
  aircraft: z.object({ model: z.string().nullish() }).nullish(),
  departure: apiEndpoint,
  arrival: apiEndpoint,
  location: z.object({ lat: z.number(), lon: z.number() }).nullish(),
})
const responseSchema = z.array(apiFlight)

type ApiAirport = z.infer<typeof apiAirport>
type ApiEndpoint = z.infer<typeof apiEndpoint>

function toAirport(a: ApiAirport): AirportInfo {
  return {
    iata: a?.iata ?? null,
    icao: a?.icao ?? null,
    name: a?.name ?? 'Unknown airport',
    city: a?.municipalityName ?? a?.name ?? 'Unknown',
    countryCode: a?.countryCode ?? null,
    lat: a?.location?.lat ?? null,
    lon: a?.location?.lon ?? null,
  }
}

function toEndpoint(e: ApiEndpoint): EndpointInfo {
  return {
    airport: toAirport(e.airport),
    scheduledUtc: e.scheduledTime?.utc ?? null,
    scheduledLocal: e.scheduledTime?.local ?? null,
    revisedUtc: e.revisedTime?.utc ?? null,
    revisedLocal: e.revisedTime?.local ?? null,
    actualUtc: e.runwayTime?.utc ?? null,
    actualLocal: e.runwayTime?.local ?? null,
    terminal: e.terminal ?? null,
    gate: e.gate ?? null,
    checkInDesk: e.checkInDesk ?? null,
  }
}

export async function getFlightDetails(
  number: string,
  opts: { date?: string } = {},
): Promise<Result<Flight[]>> {
  const parsedNumber = parseFlightNumber(number)
  if (!parsedNumber.ok) return parsedNumber
  if (opts.date !== undefined) {
    const parsedDate = parseDate(opts.date)
    if (!parsedDate.ok) return parsedDate
  }

  if (isMockMode()) return mockFlightDetails(parsedNumber.data, new Date())

  const key = requireKey('RAPIDAPI_KEY', PROVIDER)
  if (!key.ok) return key

  const datePart = opts.date ? `/${opts.date}` : ''
  const url =
    `https://aerodatabox.p.rapidapi.com/flights/number/${parsedNumber.data}${datePart}` +
    `?withAircraftImage=false&withLocation=true`

  const res = await fetchJson({
    provider: PROVIDER,
    url,
    init: { headers: { 'X-RapidAPI-Key': key.data, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } },
    schema: responseSchema,
    revalidate: 60,
  })
  if (!res.ok) return res
  if (res.data.length === 0) return fail('not_found', PROVIDER, 'No flights returned')

  return ok(
    res.data.map((f) => ({
      number: f.number,
      airlineName: f.airline?.name ?? null,
      airlineIata: f.airline?.iata ?? null,
      aircraftModel: f.aircraft?.model ?? null,
      rawStatus: f.status ?? null,
      departure: toEndpoint(f.departure),
      arrival: toEndpoint(f.arrival),
      position: f.location ?? null,
    })),
  )
}
