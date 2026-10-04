// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeather } from './weather'
import { getAirportPhoto } from './photos'

beforeEach(() => {
  vi.stubEnv('OPENWEATHER_API_KEY', 'w-key')
  vi.stubEnv('UNSPLASH_ACCESS_KEY', 'u-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))

describe('getWeather', () => {
  it('returns Celsius and Fahrenheit and an https icon URL', async () => {
    stubFetch({ main: { temp: 20 }, weather: [{ main: 'Clouds', icon: '04d' }] })
    const res = await getWeather(40.6, -73.7)
    expect(res).toEqual({
      ok: true,
      data: { tempC: 20, tempF: 68, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png' },
    })
  })
  it('URL-encodes the API key', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'a&b=c d')
    stubFetch({ main: { temp: 20 }, weather: [{ main: 'Clouds', icon: '04d' }] })
    await getWeather(40.6, -73.7)
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url).toContain('appid=a%26b%3Dc%20d')
  })
  it('returns bad_data when the weather array is empty', async () => {
    stubFetch({ main: { temp: 20 }, weather: [] })
    const res = await getWeather(1, 2)
    expect(res.ok === false && res.error.kind).toBe('bad_data')
  })
  it('rejects non-finite coordinates and a missing key', async () => {
    const bad = await getWeather(Number.NaN, 2)
    expect(bad.ok === false && bad.error.kind).toBe('bad_input')
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    const missing = await getWeather(1, 2)
    expect(missing.ok === false && missing.error.kind).toBe('misconfigured')
  })
})

describe('getAirportPhoto', () => {
  it('returns the first result and sends the key in a header', async () => {
    stubFetch({ results: [{ urls: { regular: 'https://img.test/a.jpg' } }] })
    const res = await getAirportPhoto('New York')
    expect(res).toEqual({ ok: true, data: 'https://img.test/a.jpg' })
    const [input, init] = vi.mocked(fetch).mock.calls[0]
    const url = String(input)
    const headers = init?.headers as Record<string, string>
    expect(url).toContain('query=New%20York')
    expect(url).not.toContain('u-key')
    expect(headers.Authorization).toBe('Client-ID u-key')
  })
  it('returns not_found when there are no results', async () => {
    stubFetch({ results: [] })
    const res = await getAirportPhoto('Nowhere')
    expect(res.ok === false && res.error.kind).toBe('not_found')
  })
  it('returns bad_input for an empty city', async () => {
    const res = await getAirportPhoto('  ')
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })
})

describe('mock mode', () => {
  it('returns fixed data without fetching', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'true')
    vi.stubGlobal('fetch', vi.fn())
    expect((await getWeather(1, 2)).ok).toBe(true)
    expect((await getAirportPhoto('Paris')).ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})
