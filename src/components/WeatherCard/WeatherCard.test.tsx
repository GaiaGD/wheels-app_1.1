import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeatherCard } from './WeatherCard'
import { WeatherView } from './WeatherView'

describe('WeatherView', () => {
  it('shows both temperature units and the condition', () => {
    render(<WeatherView result={{ ok: true, data: { tempC: 20, tempF: 68, condition: 'Clouds', iconUrl: 'https://x.test/i.png' } }} />)
    expect(screen.getByText(/20°C/)).toBeInTheDocument()
    expect(screen.getByText(/68°F/)).toBeInTheDocument()
    expect(screen.getByText('Clouds')).toBeInTheDocument()
  })

  it('shows an unavailable note on failure', () => {
    render(<WeatherView result={{ ok: false, error: { kind: 'provider_down', provider: 'w', message: 'x' } }} />)
    expect(screen.getByText(/weather unavailable/i)).toBeInTheDocument()
  })
})

describe('WeatherCard', () => {
  it('shows the unavailable note when coordinates are missing', async () => {
    render(await WeatherCard({ lat: null, lon: null }))
    expect(screen.getByText(/weather unavailable/i)).toBeInTheDocument()
  })
})
