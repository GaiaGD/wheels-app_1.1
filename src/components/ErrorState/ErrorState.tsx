import Link from 'next/link'
import { userMessage } from '@/lib/messages'
import type { ProviderError } from '@/lib/result'
import styles from './ErrorState.module.css'

export function ErrorState({ error, variant }: { error: ProviderError; variant?: 'unconfirmed' }) {
  const { title, body } =
    variant === 'unconfirmed'
      ? {
          title: 'We couldn’t confirm this flight',
          body: 'We found flights with this number, but none matching those airports or that date.',
        }
      : userMessage(error)
  return (
    <main className={styles.wrap}>
      <h1>{title}</h1>
      <p>{body}</p>
      <Link href="/" className="button">Search again</Link>
    </main>
  )
}
