import type { CSSProperties } from 'react'
import type { FlightStatus } from '@/lib/flight/status'
import styles from './FlightPath.module.css'

interface Props {
  progress: number | null
  status: FlightStatus
  countdown: string | null
  flightNumber: string
  airline: string | null
  aircraft: string | null
}

export function FlightPath({ progress, status, countdown, flightNumber, airline, aircraft }: Props) {
  const position = status === 'landed' ? 1 : status === 'scheduled' || status === 'delayed' ? 0 : (progress ?? 0.5)
  const showPlane = status !== 'cancelled' && status !== 'diverted'
  return (
    <section className={styles.path} aria-label="Flight path">
      <div className={styles.code}>
        <p>{aircraft ?? 'FLIGHT'}</p>
        <h1>{flightNumber}</h1>
        {airline && <p>{airline}</p>}
      </div>
      <div className={styles.track}>
        <div className={styles.line} />
        {showPlane && (
          // eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon
          <img
            className={styles.plane}
            src="/plane-icon.svg"
            alt=""
            style={{ '--progress': `${Math.round(position * 100)}%` } as CSSProperties}
          />
        )}
      </div>
      {countdown && <p className={styles.countdown}>Departs in {countdown}</p>}
    </section>
  )
}
