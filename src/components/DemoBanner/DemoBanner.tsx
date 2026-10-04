import styles from './DemoBanner.module.css'

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div role="note" className={styles.banner}>
      Demo data — these are not real flights
    </div>
  )
}
