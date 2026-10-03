'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '20vh 16px', background: '#d9d9d9', color: '#231f20' }}>
        <h1>Something went wrong</h1>
        <p>Please reload the page.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
