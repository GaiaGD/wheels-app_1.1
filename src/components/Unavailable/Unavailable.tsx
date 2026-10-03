export function Unavailable({ children }: { children?: React.ReactNode }) {
  return <span style={{ color: 'var(--muted)' }}>{children ?? '—'}</span>
}
