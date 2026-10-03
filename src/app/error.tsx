'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
      <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
      <p style={{ fontSize: 15, margin: 0 }}>An unexpected error happened. You can try again.</p>
      <button className="button" onClick={reset}>Try again</button>
    </main>
  )
}
