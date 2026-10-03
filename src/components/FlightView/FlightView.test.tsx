import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockFlightDetails } from '@/lib/mocks'
import { FlightView } from './FlightView'

function setup() {
  const now = new Date()
  const res = mockFlightDetails('AA100', now)
  if (!res.ok) throw new Error('mock missing')
  render(
    <FlightView flight={res.data[0]} now={now} departurePhoto={null} arrivalPhoto={null} departureWeather={null} arrivalWeather={null} />,
  )
}

describe('FlightView', () => {
  it('has exactly one h1, the flight number', () => {
    setup()
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('AA100')
  })
})
