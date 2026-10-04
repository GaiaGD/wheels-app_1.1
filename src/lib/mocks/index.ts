import { fail, ok, type Result } from '../result'
import type { AirportInfo, EndpointInfo, Flight, RouteFlight } from '../flight/types'

const airport = (iata: string, icao: string, name: string, city: string, countryCode: string, lat: number, lon: number): AirportInfo =>
  ({ iata, icao, name, city, countryCode, lat, lon })

const AIRPORTS: Record<string, AirportInfo> = {
  JFK: airport('JFK', 'KJFK', 'John F. Kennedy International', 'New York', 'US', 40.64, -73.78),
  LAX: airport('LAX', 'KLAX', 'Los Angeles International', 'Los Angeles', 'US', 33.94, -118.41),
  LHR: airport('LHR', 'EGLL', 'London Heathrow', 'London', 'GB', 51.47, -0.45),
  FRA: airport('FRA', 'EDDF', 'Frankfurt am Main', 'Frankfurt', 'DE', 50.03, 8.57),
  CDG: airport('CDG', 'LFPG', 'Paris Charles de Gaulle', 'Paris', 'FR', 49.01, 2.55),
}

interface Spec {
  number: string
  airline: [string, string]
  dep: string
  arr: string
  startMin: number
  durMin: number
  status: string
  delayMin?: number
}

const SPECS: Spec[] = [
  { number: 'AA100', airline: ['American Airlines', 'AA'], dep: 'JFK', arr: 'LAX', startMin: -120, durMin: 360, status: 'EnRoute' },
  { number: 'AA2', airline: ['American Airlines', 'AA'], dep: 'JFK', arr: 'LAX', startMin: -30, durMin: 360, status: 'EnRoute' },
  { number: 'BA117', airline: ['British Airways', 'BA'], dep: 'LHR', arr: 'JFK', startMin: 180, durMin: 480, status: 'Expected' },
  { number: 'LH400', airline: ['Lufthansa', 'LH'], dep: 'FRA', arr: 'JFK', startMin: -600, durMin: 500, status: 'Arrived', delayMin: 12 },
  { number: 'DL1', airline: ['Delta Air Lines', 'DL'], dep: 'JFK', arr: 'LAX', startMin: 60, durMin: 360, status: 'Canceled' },
  { number: 'AF11', airline: ['Air France', 'AF'], dep: 'CDG', arr: 'JFK', startMin: -200, durMin: 480, status: 'Diverted' },
  { number: 'UA900', airline: ['United Airlines', 'UA'], dep: 'LAX', arr: 'JFK', startMin: 90, durMin: 300, status: 'Delayed', delayMin: 45 },
]

const MIN = 60_000
const iso = (d: Date) => d.toISOString()
const local = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + '+00:00'

function endpoint(a: AirportInfo, scheduled: Date, shiftMin: number, actual: boolean): EndpointInfo {
  const shifted = new Date(scheduled.getTime() + shiftMin * MIN)
  return {
    airport: a,
    scheduledUtc: iso(scheduled),
    scheduledLocal: local(scheduled),
    revisedUtc: shiftMin ? iso(shifted) : null,
    revisedLocal: shiftMin ? local(shifted) : null,
    actualUtc: actual ? iso(shifted) : null,
    actualLocal: actual ? local(shifted) : null,
    terminal: '4',
    gate: null,
    checkInDesk: null,
  }
}

function build(s: Spec, now: Date): Flight {
  const dep = new Date(now.getTime() + s.startMin * MIN)
  const arr = new Date(dep.getTime() + s.durMin * MIN)
  const shift = s.delayMin ?? 0
  const departed = s.startMin < 0 && s.status !== 'Canceled'
  return {
    number: s.number,
    airlineName: s.airline[0],
    airlineIata: s.airline[1],
    aircraftModel: 'Boeing 777-300ER',
    rawStatus: s.status,
    departure: endpoint(AIRPORTS[s.dep], dep, shift, departed),
    arrival: endpoint(AIRPORTS[s.arr], arr, shift, s.status === 'Arrived'),
    position: null,
  }
}

export function mockFlightDetails(number: string, now: Date): Result<Flight[]> {
  if (number === 'ER404') return fail('provider_down', 'mock', 'Simulated outage')
  if (number === 'ER429') return fail('rate_limited', 'mock', 'Simulated rate limit')
  const spec = SPECS.find((s) => s.number === number)
  return spec ? ok([build(spec, now)]) : fail('not_found', 'mock', 'No such mock flight')
}

export function mockRouteFlights(dep: string, arr: string, airline: string): Result<RouteFlight[]> {
  if (dep === 'JFK' && arr === 'LAX' && airline === 'AA') {
    return ok([
      { flightIata: 'AA100', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX', departureLocal: '2026-10-03 08:00-04:00', status: 'EnRoute' },
      { flightIata: 'AA2', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX', departureLocal: '2026-10-03 09:30-04:00', status: 'EnRoute' },
    ])
  }
  return fail('not_found', 'mock', 'No mock flights')
}
