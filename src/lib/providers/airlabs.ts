import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockLiveFlights } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseAirlineCode, parseIata } from '../validate'
import type { LiveFlightSummary } from '../flight/types'

const PROVIDER = 'airlabs'

const schema = z.object({
  response: z
    .array(
      z.object({
        flight_iata: z.string().nullish(),
        airline_iata: z.string().nullish(),
        dep_iata: z.string().nullish(),
        arr_iata: z.string().nullish(),
      }),
    )
    .optional(),
  error: z.object({ message: z.string().nullish(), code: z.string().nullish() }).optional(),
})

export async function searchLiveFlights(q: {
  dep: string
  arr: string
  airline: string
}): Promise<Result<LiveFlightSummary[]>> {
  const dep = parseIata(q.dep)
  if (!dep.ok) return dep
  const arr = parseIata(q.arr)
  if (!arr.ok) return arr
  const airline = parseAirlineCode(q.airline)
  if (!airline.ok) return airline

  if (isMockMode()) return mockLiveFlights(dep.data, arr.data, airline.data)

  const key = requireKey('AIRLABS_API_KEY', PROVIDER)
  if (!key.ok) return key

  const url =
    `https://airlabs.co/api/v9/flights?api_key=${encodeURIComponent(key.data)}` +
    `&dep_iata=${dep.data}&arr_iata=${arr.data}&airline_iata=${airline.data}`

  const res = await fetchJson({ provider: PROVIDER, url, schema, revalidate: 60 })
  if (!res.ok) return res

  if (res.data.error) {
    const code = res.data.error.code ?? ''
    if (code.includes('limit')) return fail('rate_limited', PROVIDER, 'Quota exceeded')
    if (code.includes('api_key')) return fail('misconfigured', PROVIDER, 'Rejected API key')
    return fail('provider_down', PROVIDER, 'Provider reported an error')
  }

  const flights: LiveFlightSummary[] = (res.data.response ?? [])
    .filter((f): f is typeof f & { flight_iata: string } => Boolean(f.flight_iata))
    .map((f) => ({
      flightIata: f.flight_iata,
      airlineIata: f.airline_iata ?? null,
      depIata: f.dep_iata ?? null,
      arrIata: f.arr_iata ?? null,
    }))

  return flights.length > 0 ? ok(flights) : fail('not_found', PROVIDER, 'No live flights on this route')
}
