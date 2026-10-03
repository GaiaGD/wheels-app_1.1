import 'server-only'
import type { ZodType } from 'zod'
import { fail, ok, type Result } from './result'

export interface FetchJsonOptions<T> {
  provider: string
  url: string
  init?: RequestInit
  schema: ZodType<T>
  timeoutMs?: number
  retries?: number
  revalidate?: number
}

async function attempt<T>(o: FetchJsonOptions<T>): Promise<Result<T>> {
  const { provider, url, init, schema, timeoutMs = 8000, revalidate } = o
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    } as RequestInit)
    const status = response.status
    if (status === 204 || status === 404) return fail('not_found', provider, 'Not found', status)
    if (status === 429) return fail('rate_limited', provider, 'Rate limited', status)
    if (status === 401 || status === 403) return fail('misconfigured', provider, 'Rejected credentials', status)
    if (status >= 500) return fail('provider_down', provider, 'Provider error', status)
    if (status >= 400) return fail('bad_input', provider, 'Request rejected', status)

    const text = await response.text()
    if (!text) return fail('bad_data', provider, 'Empty response', status)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return fail('bad_data', provider, 'Invalid JSON', status)
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) return fail('bad_data', provider, 'Unexpected response shape', status)
    return ok(parsed.data)
  } catch {
    return fail('provider_down', provider, 'Network error or timeout')
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJson<T>(opts: FetchJsonOptions<T>): Promise<Result<T>> {
  const retries = opts.retries ?? 1
  let result = await attempt(opts)
  for (let i = 0; i < retries && !result.ok && result.error.kind === 'provider_down'; i++) {
    result = await attempt(opts)
  }
  if (!result.ok) {
    const { kind, provider, status } = result.error
    console.error('[provider-error]', JSON.stringify({ provider, kind, status }))
  }
  return result
}
