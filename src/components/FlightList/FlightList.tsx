import Link from 'next/link'
import type { RouteFlight } from '@/lib/flight/types'
import { routeStatusLabel } from '@/lib/flight/route-status'
import { localTime } from '@/lib/flight/time'
import styles from './FlightList.module.css'

export function FlightList({ flights }: { flights: RouteFlight[] }) {
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
              <strong className={styles.flightIata}>{f.flightIata}</strong>
              <span className={styles.route}>{f.depIata} → {f.arrIata}</span>
              <span className={styles.time}>{localTime(f.departureLocal) ?? '—'} · {routeStatusLabel(f.status)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
