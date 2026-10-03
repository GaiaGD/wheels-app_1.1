import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('shows a friendly message and a way back, without internal details', () => {
    render(<ErrorState error={{ kind: 'provider_down', provider: 'x', message: 'secret internals' }} />)
    expect(screen.getByRole('heading')).toHaveTextContent('Flight data is unavailable')
    expect(screen.getByRole('link', { name: /search again/i })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument()
  })

  it('shows the unconfirmed variant', () => {
    render(<ErrorState variant="unconfirmed" error={{ kind: 'not_found', provider: 'x', message: '' }} />)
    expect(screen.getByRole('heading')).toHaveTextContent(/couldn.t confirm this flight/i)
  })
})
