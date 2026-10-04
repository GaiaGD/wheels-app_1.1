import Link from 'next/link'
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
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>No flights found</h1>
        <p style={{ fontSize: 15, margin: 0 }}>
          We couldn&apos;t find a flight on this route that departed in the last 24 hours. For an upcoming flight, search by flight number.
        </p>
        <Link href="/" className="button">Search again</Link>
      </main>
    )
  }
  if (!res.ok) return <ErrorState error={res.error} />

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 28 }}>{res.data.length} flight{res.data.length === 1 ? '' : 's'} found</h1>
      <p style={{ fontSize: 15, margin: 0 }}>Flights that departed in the last 24 hours</p>
      <FlightList flights={res.data} />
      <Link href="/" className="button" style={{ justifySelf: 'center' }}>Search again</Link>
    </main>
  )
}
