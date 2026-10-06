import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFlightDetails } from '@/lib/mocks'
import type { Flight } from '@/lib/flight/types'

const mapProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }))
vi.mock('../FlightMap/FlightMapLoader', () => {
  const FlightMapLoader = (props: Record<string, unknown>) => {
    mapProps.last = props
    return <div data-testid="flight-map" />
  }
  return { FlightMapLoader, default: FlightMapLoader }
})
import { FlightView } from './FlightView'

function flightFor(number: string, now: Date): Flight {
  const res = mockFlightDetails(number, now)
  if (!res.ok) throw new Error('mock missing')
  return res.data[0]
}

function setup(flight: Flight, now: Date) {
  return render(
    <FlightView flight={flight} now={now} departurePhoto={null} arrivalPhoto={null} departureWeather={null} arrivalWeather={null} />,
  )
}

describe('FlightView', () => {
  beforeEach(() => {
    mapProps.last = null
  })

  it('has exactly one h1, the flight number', () => {
    const now = new Date()
    setup(flightFor('AA100', now), now)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('AA100')
  })

  it('passes airports and an estimated plane to the map', () => {
    const now = new Date()
    const flight = flightFor('AA100', now)
    setup(flight, now)
    expect(screen.getByTestId('flight-map')).toBeInTheDocument()
    const { from, to, plane } = mapProps.last as {
      from: { code: string; lat: number; lon: number }
      to: { code: string; lat: number; lon: number }
      plane: { estimated: boolean } | null
    }
    expect(from).toEqual({ code: 'JFK', lat: flight.departure.airport.lat, lon: flight.departure.airport.lon })
    expect(to).toEqual({ code: 'LAX', lat: flight.arrival.airport.lat, lon: flight.arrival.airport.lon })
    expect(plane?.estimated).toBe(true)
  })

  it('passes no plane when the flight is cancelled', () => {
    const now = new Date()
    setup(flightFor('DL1', now), now)
    expect(screen.getByTestId('flight-map')).toBeInTheDocument()
    expect((mapProps.last as { plane: unknown }).plane).toBeNull()
  })

  it('skips the map but still renders the cards when an airport has no coordinates', () => {
    const now = new Date()
    const flight = flightFor('AA100', now)
    flight.arrival = { ...flight.arrival, airport: { ...flight.arrival.airport, lat: null, lon: null } }
    setup(flight, now)
    expect(screen.queryByTestId('flight-map')).toBeNull()
    expect(screen.getByLabelText('Departure')).toBeInTheDocument()
    expect(screen.getByLabelText('Arrival')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
