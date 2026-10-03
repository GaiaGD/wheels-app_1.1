import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBanner } from './StatusBanner'

describe('StatusBanner', () => {
  it.each([
    ['scheduled', 'Scheduled'],
    ['in_air', 'In the air'],
    ['landed', 'Landed'],
    ['cancelled', 'Cancelled'],
    ['diverted', 'Diverted'],
    ['delayed', 'Delayed'],
  ] as const)('shows %s', (status, label) => {
    render(<StatusBanner status={status} delayMinutes={null} />)
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })

  it('shows the delay in minutes, and early arrivals', () => {
    const { rerender } = render(<StatusBanner status="delayed" delayMinutes={45} />)
    expect(screen.getByRole('status')).toHaveTextContent('45 min late')
    rerender(<StatusBanner status="landed" delayMinutes={-8} />)
    expect(screen.getByRole('status')).toHaveTextContent('8 min early')
  })
})
