import Link from 'next/link'
import type { LiveFlightSummary } from '@/lib/flight/types'
import styles from './FlightList.module.css'

export function FlightList({ flights }: { flights: LiveFlightSummary[] }) {
  return (
    <ul className={styles.list}>
      {flights.map((f, index) => {
        const params = new URLSearchParams()
        if (f.depIata) params.set('dep', f.depIata)
        if (f.arrIata) params.set('arr', f.arrIata)
        const query = params.toString()
        return (
          <li key={`${f.flightIata}-${index}`}>
            <Link href={`/flight/${encodeURIComponent(f.flightIata)}${query ? `?${query}` : ''}`}>
              <strong>{f.flightIata}</strong>
              <span>{f.depIata ?? '—'} → {f.arrIata ?? '—'}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
