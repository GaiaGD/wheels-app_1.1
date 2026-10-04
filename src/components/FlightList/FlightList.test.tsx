import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlightList } from './FlightList'

describe('FlightList', () => {
  it('links to the flight page with route query', () => {
    render(<FlightList flights={[{ flightIata: 'AA100', depIata: 'JFK', arrIata: 'LAX' } as never]} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/flight/AA100?dep=JFK&arr=LAX')
  })
  it('URL-encodes the flight code in the path', () => {
    render(<FlightList flights={[{ flightIata: 'A/B?1#', depIata: null, arrIata: null } as never]} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/flight/A%2FB%3F1%23')
  })
})
