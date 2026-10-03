import { bestUtc, delayMinutes } from './time'
import type { Flight } from './types'

export type FlightStatus = 'scheduled' | 'delayed' | 'in_air' | 'landed' | 'cancelled' | 'diverted'

export const DELAY_THRESHOLD_MIN = 15
const PRE_DEPARTURE = ['expected', 'checkin', 'boarding', 'gateclosed', 'delayed']
const AIRBORNE = ['departed', 'enroute', 'approaching']

function preDeparture(f: Flight, raw: string): FlightStatus {
  const d = delayMinutes(f.departure)
  return raw === 'delayed' || (d !== null && d >= DELAY_THRESHOLD_MIN) ? 'delayed' : 'scheduled'
}

function fromTimes(f: Flight, now: Date): FlightStatus {
  const dep = Date.parse(bestUtc(f.departure) ?? '')
  const arr = Date.parse(bestUtc(f.arrival) ?? '')
  if (Number.isNaN(dep) || Number.isNaN(arr)) return 'scheduled'
  if (now.getTime() < dep) return preDeparture(f, '')
  return now.getTime() < arr ? 'in_air' : 'landed'
}

export function deriveStatus(f: Flight, now: Date): FlightStatus {
  const raw = (f.rawStatus ?? '').toLowerCase()
  if (raw.startsWith('cancel')) return 'cancelled'
  if (raw === 'diverted') return 'diverted'
  if (raw === 'arrived') return 'landed'
  if (AIRBORNE.includes(raw)) return 'in_air'
  if (PRE_DEPARTURE.includes(raw)) return preDeparture(f, raw)
  return fromTimes(f, now)
}
