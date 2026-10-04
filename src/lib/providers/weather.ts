import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { fail, ok, type Result } from '../result'
import type { Weather } from '../flight/types'

const PROVIDER = 'openweathermap'

const schema = z.object({
  main: z.object({ temp: z.number() }),
  weather: z.array(z.object({ main: z.string(), icon: z.string() })),
})

export async function getWeather(lat: number, lon: number): Promise<Result<Weather>> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fail('bad_input', PROVIDER, 'Bad coordinates')
  if (isMockMode()) {
    return ok({ tempC: 18, tempF: 64, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png' })
  }
  const key = requireKey('OPENWEATHER_API_KEY', PROVIDER)
  if (!key.ok) return key

  const res = await fetchJson({
    provider: PROVIDER,
    url: `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(key.data)}`,
    schema,
    revalidate: 600,
  })
  if (!res.ok) return res
  const first = res.data.weather[0]
  if (!first) return fail('bad_data', PROVIDER, 'No weather entry')

  const tempC = Math.round(res.data.main.temp)
  return ok({
    tempC,
    tempF: Math.round((res.data.main.temp * 9) / 5 + 32),
    condition: first.main,
    iconUrl: `https://openweathermap.org/img/wn/${first.icon}@2x.png`,
  })
}
