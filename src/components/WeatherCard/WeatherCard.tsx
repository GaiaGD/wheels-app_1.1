import { getWeather } from '@/lib/providers/weather'
import { fail } from '@/lib/result'
import { WeatherView } from './WeatherView'

export async function WeatherCard({ lat, lon }: { lat: number | null; lon: number | null }) {
  const result =
    lat === null || lon === null ? fail('not_found', 'weather', 'No coordinates') : await getWeather(lat, lon)
  return <WeatherView result={result} />
}
