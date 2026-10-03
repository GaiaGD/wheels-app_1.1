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
  const showPlane = status !== 'cancelled'
  return (
    <section className={styles.path} aria-label="Flight path">
      <div className={styles.code}>
        <p>{aircraft ?? 'FLIGHT'}</p>
        <h2>{flightNumber}</h2>
        {airline && <h3>{airline}</h3>}
      </div>
      <div className={styles.track}>
        <div className={styles.line} />
        {showPlane && (
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
