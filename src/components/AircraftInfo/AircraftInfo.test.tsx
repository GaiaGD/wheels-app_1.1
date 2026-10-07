import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AircraftInfo } from './AircraftInfo'

const base = { progress: 0.4, countdown: null, flightNumber: 'AA100', airline: 'American', aircraft: 'B77W' }
const plane = (container: HTMLElement) => container.querySelector('img[src="/plane-icon.svg"]')

describe('AircraftInfo plane', () => {
  it('shows the plane when in the air', () => {
    const { container } = render(<AircraftInfo {...base} status="in_air" />)
    expect(plane(container)).not.toBeNull()
  })
  it.each(['cancelled', 'diverted'] as const)('hides the plane (no fake progress) when %s', (status) => {
    const { container } = render(<AircraftInfo {...base} status={status} />)
    expect(plane(container)).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
