import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/providers/photos', () => ({
  DEFAULT_AIRPORT_PHOTO: 'https://default.test/d.jpg',
  getAirportPhoto: vi.fn(),
}))
import { getAirportPhoto } from '@/lib/providers/photos'
import { AirportPhoto } from './AirportPhoto'

const mocked = vi.mocked(getAirportPhoto)
async function renderPhoto(city = 'Paris') {
  render(await AirportPhoto({ city }))
  return screen.getByRole('img')
}

beforeEach(() => {
  cleanup()
  mocked.mockReset()
})

describe('AirportPhoto', () => {
  it('uses the provider photo, quoted, with a descriptive label', async () => {
    mocked.mockResolvedValue({ ok: true, data: 'https://img.test/a.jpg' })
    const el = await renderPhoto()
    expect(el).toHaveAttribute('aria-label', 'Photo of Paris')
    expect(el.getAttribute('style')).toContain('url("https://img.test/a.jpg")')
  })
  it('falls back to the default photo on a provider error', async () => {
    mocked.mockResolvedValue({ ok: false, error: { kind: 'not_found', provider: 'unsplash', message: 'x' } })
    expect((await renderPhoto()).getAttribute('style')).toContain('https://default.test/d.jpg')
  })
  it('falls back to the default photo when the provider throws', async () => {
    mocked.mockRejectedValue(new Error('boom'))
    expect((await renderPhoto()).getAttribute('style')).toContain('https://default.test/d.jpg')
  })
  it('rejects non-https URLs', async () => {
    mocked.mockResolvedValue({ ok: true, data: 'javascript:alert(1)' })
    expect((await renderPhoto()).getAttribute('style')).toContain('https://default.test/d.jpg')
    cleanup()
    mocked.mockResolvedValue({ ok: true, data: 'http://img.test/a.jpg' })
    expect((await renderPhoto()).getAttribute('style')).not.toContain('http://img.test')
  })
})
