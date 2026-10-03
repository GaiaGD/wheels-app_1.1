// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { fetchJson } from './http'

const schema = z.object({ a: z.number() })
const base = { provider: 'test', url: 'https://example.test/x?api_key=SECRET', schema }
const reply = (body: string | null, status = 200) => () =>
  Promise.resolve(new Response(body, { status }))

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchJson', () => {
  it('returns parsed data on success', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('{"a":1}')))
    expect(await fetchJson(base)).toEqual({ ok: true, data: { a: 1 } })
  })

  it.each([
    [404, 'not_found'],
    [204, 'not_found'],
    [429, 'rate_limited'],
    [401, 'misconfigured'],
    [403, 'misconfigured'],
    [400, 'bad_input'],
  ])('maps status %i to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn(reply(status === 204 ? null : '{}', status)))
    const res = await fetchJson(base)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe(kind)
  })

  it('returns bad_data for an empty 200 body (the old "Unexpected end of JSON" crash)', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('')))
    const res = await fetchJson(base)
    expect(res.ok === false && res.error.kind).toBe('bad_data')
  })

  it('returns bad_data for invalid JSON and for schema mismatches', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('not json')))
    expect(await fetchJson(base)).toMatchObject({ ok: false, error: { kind: 'bad_data' } })
    vi.stubGlobal('fetch', vi.fn(reply('{"a":"x"}')))
    expect(await fetchJson(base)).toMatchObject({ ok: false, error: { kind: 'bad_data' } })
  })

  it('retries once on 5xx, then reports provider_down', async () => {
    const fetchMock = vi.fn(reply('{}', 503))
    vi.stubGlobal('fetch', fetchMock)
    const res = await fetchJson(base)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.ok === false && res.error.kind).toBe('provider_down')
  })

  it('succeeds when the retry succeeds', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(reply('{}', 500)).mockImplementationOnce(reply('{"a":2}'))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchJson(base)).toEqual({ ok: true, data: { a: 2 } })
  })

  it('maps network failures to provider_down', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))))
    const res = await fetchJson(base)
    expect(res.ok === false && res.error.kind).toBe('provider_down')
  })

  it('does not retry a rate limit', async () => {
    const fetchMock = vi.fn(reply('{}', 429))
    vi.stubGlobal('fetch', fetchMock)
    await fetchJson(base)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never logs the URL or API key', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('{}', 500)))
    await fetchJson(base)
    const logged = JSON.stringify(errorSpy.mock.calls)
    expect(logged).not.toContain('SECRET')
    expect(logged).not.toContain('example.test')
    expect(logged).toContain('provider_down')
  })
})
