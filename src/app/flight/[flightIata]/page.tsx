import { ErrorState } from '@/components/ErrorState/ErrorState'
import { FlightView } from '@/components/FlightView/FlightView'
import { pickFlight } from '@/lib/flight/match'
import { getFlightDetails } from '@/lib/providers/aerodatabox'
import { parseDate, parseFlightNumber, parseIata } from '@/lib/validate'

interface Props {
  params: Promise<{ flightIata: string }>
  searchParams: Promise<{ date?: string; dep?: string; arr?: string }>
}

export default async function FlightPage({ params, searchParams }: Props) {
  const { flightIata } = await params
  const sp = await searchParams
  const now = new Date()

  const number = parseFlightNumber(decodeURIComponent(flightIata))
  if (!number.ok) return <ErrorState error={number.error} />

  let date: string | undefined
  if (sp.date) {
    const d = parseDate(sp.date)
    if (!d.ok) return <ErrorState error={d.error} />
    date = d.data
  }
  const dep = sp.dep ? parseIata(sp.dep) : undefined
  const arr = sp.arr ? parseIata(sp.arr) : undefined
  if (dep && !dep.ok) return <ErrorState error={dep.error} />
  if (arr && !arr.ok) return <ErrorState error={arr.error} />

  const res = await getFlightDetails(number.data, { date })
  if (!res.ok) return <ErrorState error={res.error} />

  const flight = pickFlight(res.data, { dep: dep?.ok ? dep.data : undefined, arr: arr?.ok ? arr.data : undefined, date, now })
  if (!flight) {
    return <ErrorState variant="unconfirmed" error={{ kind: 'not_found', provider: 'match', message: 'No matching entry' }} />
  }

  return (
    <FlightView
      flight={flight}
      now={now}
      departurePhoto={null}
      arrivalPhoto={null}
      departureWeather={null}
      arrivalWeather={null}
    />
  )
}
