import Link from 'next/link'
import type { ReactNode } from 'react'
import { deriveStatus } from '@/lib/flight/status'
import { flightProgress } from '@/lib/flight/progress'
import { bestUtc, delayMinutes, formatDuration } from '@/lib/flight/time'
import type { Flight } from '@/lib/flight/types'
import { AirportCard } from '../AirportCard/AirportCard'
import { FlightPath } from '../FlightPath/FlightPath'
import { StatusBanner } from '../StatusBanner/StatusBanner'
import styles from './FlightView.module.css'

interface Props {
  flight: Flight
  now: Date
  departurePhoto: ReactNode
  arrivalPhoto: ReactNode
  departureWeather: ReactNode
  arrivalWeather: ReactNode
}

export function FlightView({ flight, now, departurePhoto, arrivalPhoto, departureWeather, arrivalWeather }: Props) {
  const status = deriveStatus(flight, now)
  const depTime = Date.parse(bestUtc(flight.departure) ?? '')
  const countdown =
    (status === 'scheduled' || status === 'delayed') && !Number.isNaN(depTime) && depTime > now.getTime()
      ? formatDuration(depTime - now.getTime())
      : null
  const bannerDelay = status === 'landed' ? delayMinutes(flight.arrival) : delayMinutes(flight.departure)

  return (
    <main className={styles.page}>
      <div className={styles.banner}>
        <StatusBanner status={status} delayMinutes={bannerDelay} />
      </div>
      <div className={styles.grid}>
        <AirportCard role="departure" endpoint={flight.departure} photo={departurePhoto} weather={departureWeather} />
        <FlightPath
          progress={flightProgress(flight, now)}
          status={status}
          countdown={countdown}
          flightNumber={flight.number}
          airline={flight.airlineName}
          aircraft={flight.aircraftModel}
        />
        <AirportCard role="arrival" endpoint={flight.arrival} photo={arrivalPhoto} weather={arrivalWeather} />
      </div>
      <Link href="/" className={`button ${styles.back}`}>Check another flight</Link>
    </main>
  )
}
