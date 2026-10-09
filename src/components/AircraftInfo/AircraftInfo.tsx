import type { CSSProperties } from 'react'
import { planeFraction } from '@/lib/flight/progress'
import type { FlightStatus } from '@/lib/flight/status'
import styles from './AircraftInfo.module.css'

interface Props {
  progress: number | null
  status: FlightStatus
  flightNumber: string
  airline: string | null
  aircraft: string | null
}

export function AircraftInfo({ progress, status, flightNumber, airline, aircraft }: Props) {
  const position = planeFraction(status, progress)
  return (
    <section className={styles.aircraft} aria-label="Flight information">
      <div className={styles.code}>
        <p>{aircraft ?? 'FLIGHT'}</p>
        <h1>{flightNumber}</h1>
        {airline && <p>{airline}</p>}
      </div>
      {/* <div className={styles.track}>
        <div className={styles.line} />
        {position !== null && (
          // eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon
          <img
            className={styles.plane}
            src="/plane-icon.svg"
            alt=""
            style={{ '--progress': `${Math.round(position * 100)}%` } as CSSProperties}
          />
        )}
      </div> */}
      {/* {countdown && <p className={styles.countdown}>Departs in {countdown}</p>} */}
    </section>
  )
}
