import { describe, expect, it } from 'vitest'
import type { ErrorKind } from './result'
import { userMessage } from './messages'

const kinds: ErrorKind[] = ['bad_input', 'not_found', 'rate_limited', 'provider_down', 'bad_data', 'misconfigured']

describe('userMessage', () => {
  it.each(kinds)('has a title and body for %s', (kind) => {
    const m = userMessage({ kind, provider: 'p', message: 'internal detail' })
    expect(m.title.length).toBeGreaterThan(0)
    expect(m.body.length).toBeGreaterThan(0)
    expect(m.body).not.toContain('internal detail')
  })

  it('does not reveal configuration problems', () => {
    const m = userMessage({ kind: 'misconfigured', provider: 'p', message: 'Missing RAPIDAPI_KEY' })
    expect(m.body).not.toMatch(/key|env/i)
  })
})
