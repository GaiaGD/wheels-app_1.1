import Link from 'next/link'
import type { ReactNode } from 'react'
import { planePosition } from '@/lib/flight/geo'
import { deriveStatus } from '@/lib/flight/status'
import { flightProgress, planeFraction } from '@/lib/flight/progress'
import { bestUtc, delayMinutes, formatDuration } from '@/lib/flight/time'
import type { AirportInfo, Flight } from '@/lib/flight/types'
import { AirportCard } from '../AirportCard/AirportCard'
import { FlightMapLoader } from '../FlightMap/FlightMapLoader'
import { FlightPath } from '../FlightPath/FlightPath'
import { haloButtonClass } from '../HaloButton/HaloButton'
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

function mapAirport(a: AirportInfo) {
  if (typeof a.lat !== 'number' || typeof a.lon !== 'number') return null
  return { code: a.iata ?? a.icao ?? '', lat: a.lat, lon: a.lon }
}

export function FlightView({ flight, now, departurePhoto, arrivalPhoto, departureWeather, arrivalWeather }: Props) {
  const status = deriveStatus(flight, now)
  const depTime = Date.parse(bestUtc(flight.departure) ?? '')
  const countdown =
    (status === 'scheduled' || status === 'delayed') && !Number.isNaN(depTime) && depTime > now.getTime()
      ? formatDuration(depTime - now.getTime())
      : null
  const bannerDelay = status === 'landed' ? delayMinutes(flight.arrival) : delayMinutes(flight.departure)
  const progress = flightProgress(flight, now)

  const from = mapAirport(flight.departure.airport)
  const to = mapAirport(flight.arrival.airport)
  const plane = from && to ? planePosition(from, to, planeFraction(status, progress), flight.position) : null

  return (
    <main className={styles.page}>
      {from && to && (
        <div className={styles.map}>
          <FlightMapLoader from={from} to={to} plane={plane} />
        </div>
      )}
      <div className={styles.overlay}>
        <div className={styles.top}>
          <div className={styles.pill}>
            <StatusBanner status={status} delayMinutes={bannerDelay} />
          </div>
          <div className={styles.departure}>
            <AirportCard role="departure" endpoint={flight.departure} photo={departurePhoto} weather={departureWeather} />
          </div>
          <div className={styles.path}>
            <FlightPath
              progress={progress}
              status={status}
              countdown={countdown}
              flightNumber={flight.number}
              airline={flight.airlineName}
              aircraft={flight.aircraftModel}
            />
          </div>
        </div>
        <div className={styles.bottom}>
          <div className={styles.arrival}>
            <AirportCard role="arrival" endpoint={flight.arrival} photo={arrivalPhoto} weather={arrivalWeather} />
          </div>
          <Link href="/" className={`${haloButtonClass} ${styles.back}`}>Check another flight</Link>
        </div>
      </div>
    </main>
  )
}
