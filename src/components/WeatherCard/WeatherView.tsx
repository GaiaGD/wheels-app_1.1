import type { Weather } from '@/lib/flight/types'
import type { Result } from '@/lib/result'
import { Unavailable } from '../Unavailable/Unavailable'
import styles from './WeatherCard.module.css'

export function WeatherView({ result }: { result: Result<Weather> }) {
  if (!result.ok) {
    return <p className={styles.weather}><Unavailable>Weather unavailable</Unavailable></p>
  }
  const w = result.data
  return (
    <p className={styles.weather}>
      <span>{w.tempC}°C / {w.tempF}°F</span>
      <img src={w.iconUrl} alt="" width={18} height={18} />
      <span>{w.condition}</span>
    </p>
  )
}
