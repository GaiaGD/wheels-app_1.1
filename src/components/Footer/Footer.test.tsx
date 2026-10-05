import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer', () => {
  it('credits AeroDataBox with a link, as the API terms require', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /flight data by aerodatabox/i })
    expect(link).toHaveAttribute('href', 'https://aerodatabox.com')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('credits the weather and photo providers', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /openweather/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /unsplash/i })).toBeInTheDocument()
  })
})
