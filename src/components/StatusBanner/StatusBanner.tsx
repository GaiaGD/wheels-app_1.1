import type { FlightStatus } from '@/lib/flight/status'
import styles from './StatusBanner.module.css'

const LABELS: Record<FlightStatus, string> = {
  scheduled: 'Scheduled',
  delayed: 'Delayed',
  in_air: 'In the air',
  landed: 'Landed',
  cancelled: 'Cancelled',
  diverted: 'Diverted',
}

function delayText(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes >= 5) return `${minutes} min late`
  if (minutes <= -5) return `${Math.abs(minutes)} min early`
  return 'On time'
}

export function StatusBanner({ status, delayMinutes }: { status: FlightStatus; delayMinutes: number | null }) {
  const showDelay = status !== 'cancelled' && status !== 'diverted'
  const extra = showDelay ? delayText(delayMinutes) : null
  return (
    <div role="status" className={`${styles.banner} ${styles[status]}`}>
      <strong>{LABELS[status]}</strong>
      {extra && <span> · {extra}</span>}
    </div>
  )
}
