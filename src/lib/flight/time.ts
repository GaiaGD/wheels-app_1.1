import type { EndpointInfo } from './types'

export function bestUtc(e: EndpointInfo): string | null {
  return e.actualUtc ?? e.revisedUtc ?? e.scheduledUtc
}

export function delayMinutes(e: EndpointInfo): number | null {
  const best = bestUtc(e)
  if (!best || !e.scheduledUtc) return null
  const diff = Date.parse(best) - Date.parse(e.scheduledUtc)
  return Number.isNaN(diff) ? null : Math.round(diff / 60_000)
}

/** "2025-02-01 14:30+01:00" -> "14:30" */
export function localTime(local: string | null): string | null {
  return local && local.length >= 16 ? local.slice(11, 16) : null
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
