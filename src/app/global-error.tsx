'use client'

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '20vh 16px', background: '#d9d9d9', color: '#231f20' }}>
        <h1>Something went wrong</h1>
        <p>Please reload the page.</p>
        <button
          onClick={() => retry()}
          style={{ background: '#231f20', color: '#d9d9d9', border: 0, borderRadius: 20, padding: '10px 22px', font: 'inherit', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
