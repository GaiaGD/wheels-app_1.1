import type { ReactNode } from 'react'
import styles from './ErrorState.module.css'

/** Shared presentational layout for error / not-found / unavailable pages. */
export function ErrorPanel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <main className={styles.wrap}>
      <h1>{title}</h1>
      <p>{body}</p>
      {children}
    </main>
  )
}
