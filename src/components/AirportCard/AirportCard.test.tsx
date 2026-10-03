import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { EndpointInfo } from '@/lib/flight/types'

// Simulate a stylesheet that defines no role class: the component must not emit "undefined".
vi.mock('./AirportCard.module.css', () => ({ default: { card: 'card' } }))
import { AirportCard } from './AirportCard'

const endpoint: EndpointInfo = {
  airport: { iata: 'JFK', icao: null, name: 'JFK', city: 'New York', countryCode: 'US', lat: null, lon: null },
  scheduledUtc: '2026-10-03T10:00:00Z', scheduledLocal: '2026-10-03 10:00+00:00',
  revisedUtc: null, revisedLocal: null, actualUtc: null, actualLocal: null,
  terminal: null, gate: null, checkInDesk: null,
}

it.each(['departure', 'arrival'] as const)('does not render an "undefined" class (%s) and uses no headings', (role) => {
  const { container } = render(<AirportCard role={role} endpoint={endpoint} photo={null} weather={null} />)
  expect(container.innerHTML).not.toContain('undefined')
  expect(screen.queryAllByRole('heading')).toHaveLength(0)
  expect(screen.getByLabelText(role === 'departure' ? 'Departure' : 'Arrival')).toBeInTheDocument()
})
