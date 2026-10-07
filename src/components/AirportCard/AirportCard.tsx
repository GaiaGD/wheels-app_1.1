import type { ReactNode } from 'react'
import { delayMinutes, localTime } from '@/lib/flight/time'
import type { EndpointInfo } from '@/lib/flight/types'
import { Unavailable } from '../Unavailable/Unavailable'
import styles from './AirportCard.module.css'

interface Props {
  role: 'departure' | 'arrival'
  endpoint: EndpointInfo
  photo: ReactNode
  weather: ReactNode
}

export function AirportCard({ role, endpoint, photo, weather }: Props) {
  const a = endpoint.airport
  const code = a.iata ?? a.icao ?? '—'
  const scheduled = localTime(endpoint.scheduledLocal)
  const estimated = localTime(endpoint.actualLocal ?? endpoint.revisedLocal)
  const delay = delayMinutes(endpoint)
  const showEstimate = estimated && estimated !== scheduled && delay !== null && Math.abs(delay) >= 5

  return (
    <section className={`${styles.card} ${styles[role] ?? ''}`} aria-label={role === 'departure' ? 'Departure' : 'Arrival'}>
      <div className={styles.photo}>{photo}</div>
      <div className={styles.info}>
        <div className={styles.left}>
          <p className={styles.big}>{code}</p>
          <p>{[a.city, a.countryCode].filter(Boolean).join(', ')}</p>
          {weather}
        </div>
        <div className={styles.right}>
          <p className={styles.big}>{scheduled ?? <Unavailable />}</p>
          {showEstimate && (
            <p>{endpoint.actualLocal ? 'Actual' : 'Estimated'}: {estimated}</p>
          )}
          <p>Terminal: {endpoint.terminal ?? <Unavailable />}</p>
          <p>Gate: {endpoint.gate ?? <Unavailable />}</p>
          {role === 'departure' && <p>Check-in desk: {endpoint.checkInDesk ?? <Unavailable />}</p>}
        </div>
      </div>
    </section>
  )
}
