import 'server-only'
import { fail, ok, type Result } from './result'

export const isMockMode = (): boolean => process.env.USE_MOCK_DATA === 'true'

export function requireKey(name: string, provider: string): Result<string> {
  const value = process.env[name]
  if (!value) {
    console.error(`[config] missing env var ${name}`)
    return fail('misconfigured', provider, `Missing ${name}`)
  }
  return ok(value)
}
