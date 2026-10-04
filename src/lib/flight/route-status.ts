/** Maps a raw AeroDataBox status to the label shown in route-search results. */
export function routeStatusLabel(raw: string | null): string {
  const s = (raw ?? '').toLowerCase()
  if (s.startsWith('cancel')) return 'Cancelled'
  if (s === 'diverted') return 'Diverted'
  if (s === 'arrived') return 'Landed'
  if (s === 'departed' || s === 'enroute' || s === 'approaching') return 'In the air'
  return 'Scheduled'
}
