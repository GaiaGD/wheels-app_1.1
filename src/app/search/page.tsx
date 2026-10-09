import { DottedLink } from '@/components/DottedButton/DottedButton'
import { ErrorState } from '@/components/ErrorState/ErrorState'
import { FlightList } from '@/components/FlightList/FlightList'
import { searchRouteFlights } from '@/lib/providers/aerodatabox-departures'

interface Props {
  searchParams: Promise<{ dep?: string; arr?: string; airline?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const res = await searchRouteFlights({ dep: sp.dep ?? '', arr: sp.arr ?? '', airline: sp.airline ?? '' })

  if (!res.ok && res.error.kind === 'not_found') {
    return (
      <main className="searchResults">
        <h1 style={{ fontSize: 28 }}>No flights found</h1>
        <p style={{ fontSize: 15, margin: 0 }}>
          We couldn&apos;t find a flight on this route that departed in the last 24 hours. For an upcoming flight, search by flight number.
        </p>
        <DottedLink href="/">Search again</DottedLink>
      </main>
    )
  }
  if (!res.ok) return <ErrorState error={res.error} />

  return (
    <main className="searchResults">
      <p style={{ fontSize: 14, margin: 0 }}>Flights that departed in the last 24 hours</p>
      <FlightList flights={res.data} />
      <DottedLink className="button" href="/" arrow="left">
        Search again
      </DottedLink>
    </main>
  )
}
