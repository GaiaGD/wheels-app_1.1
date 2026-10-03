export type ErrorKind =
  | 'bad_input'
  | 'not_found'
  | 'rate_limited'
  | 'provider_down'
  | 'bad_data'
  | 'misconfigured'

export interface ProviderError {
  kind: ErrorKind
  provider: string
  message: string
  status?: number
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ProviderError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const fail = (
  kind: ErrorKind,
  provider: string,
  message: string,
  status?: number,
): Result<never> => ({ ok: false, error: { kind, provider, message, status } })
