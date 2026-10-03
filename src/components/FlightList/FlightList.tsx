import Link from 'next/link'
import type { LiveFlightSummary } from '@/lib/flight/types'
import styles from './FlightList.module.css'

export function FlightList({ flights }: { flights: LiveFlightSummary[] }) {
  return (
    <ul className={styles.list}>
      {flights.map((f) => {
        const params = new URLSearchParams()
        if (f.depIata) params.set('dep', f.depIata)
        if (f.arrIata) params.set('arr', f.arrIata)
        return (
          <li key={f.flightIata}>
            <Link href={`/flight/${f.flightIata}?${params.toString()}`}>
              <strong>{f.flightIata}</strong>
              <span>{f.depIata ?? '—'} → {f.arrIata ?? '—'}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
