import { Suspense } from 'react'
import { AirportPhoto, AirportPhotoSkeleton } from '@/components/AirportPhoto/AirportPhoto'
import { WeatherCard } from '@/components/WeatherCard/WeatherCard'
import { ErrorState } from '@/components/ErrorState/ErrorState'
import { FlightView } from '@/components/FlightView/FlightView'
import { pickFlight } from '@/lib/flight/match'
import { getFlightDetails } from '@/lib/providers/aerodatabox'
import { parseDate, parseFlightNumber, parseIata, safeDecode } from '@/lib/validate'

interface Props {
  params: Promise<{ flightIata: string }>
  searchParams: Promise<{ date?: string; dep?: string; arr?: string }>
}

export default async function FlightPage({ params, searchParams }: Props) {
  const { flightIata } = await params
  const sp = await searchParams
  const now = new Date()

  const decoded = safeDecode(flightIata)
  const number = decoded === null ? parseFlightNumber('') : parseFlightNumber(decoded)
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

  const { departure, arrival } = flight
  return (
    <FlightView
      flight={flight}
      now={now}
      departurePhoto={
        <Suspense fallback={<AirportPhotoSkeleton />}>
          <AirportPhoto city={departure.airport.city} />
        </Suspense>
      }
      arrivalPhoto={
        <Suspense fallback={<AirportPhotoSkeleton />}>
          <AirportPhoto city={arrival.airport.city} />
        </Suspense>
      }
      departureWeather={
        <Suspense fallback={<p>Loading weather…</p>}>
          <WeatherCard lat={departure.airport.lat} lon={departure.airport.lon} />
        </Suspense>
      }
      arrivalWeather={
        <Suspense fallback={<p>Loading weather…</p>}>
          <WeatherCard lat={arrival.airport.lat} lon={arrival.airport.lon} />
        </Suspense>
      }
    />
  )
}
