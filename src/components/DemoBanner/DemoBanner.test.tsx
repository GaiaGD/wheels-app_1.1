import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoBanner } from './DemoBanner'

describe('DemoBanner', () => {
  it('renders the demo note when show is true', () => {
    render(<DemoBanner show />)
    expect(screen.getByRole('note')).toHaveTextContent('Demo data — these are not real flights')
  })
  it('renders nothing when show is false', () => {
    const { container } = render(<DemoBanner show={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
