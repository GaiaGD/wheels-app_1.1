import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { fail, ok, type Result } from '../result'

const PROVIDER = 'unsplash'

export const DEFAULT_AIRPORT_PHOTO =
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1000&q=80'

const schema = z.object({
  results: z.array(z.object({ urls: z.object({ regular: z.string() }) })),
})

export async function getAirportPhoto(city: string): Promise<Result<string>> {
  const query = city.trim()
  if (!query) return fail('bad_input', PROVIDER, 'Empty city')
  // if (isMockMode() && process.env.USE_REAL_PHOTOS !== 'true') return ok(DEFAULT_AIRPORT_PHOTO)

  const key = requireKey('UNSPLASH_ACCESS_KEY', PROVIDER)
  if (!key.ok) return key

  const res = await fetchJson({
    provider: PROVIDER,
    url: `https://api.unsplash.com/search/photos?page=1&per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
    init: { headers: { Authorization: `Client-ID ${key.data}` } },
    schema,
    revalidate: 86_400,
  })
  if (!res.ok) return res
  const first = res.data.results[0]
  return first ? ok(first.urls.regular) : fail('not_found', PROVIDER, 'No photo found')
}
