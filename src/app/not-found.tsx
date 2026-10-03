import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
      <h1 style={{ fontSize: 28 }}>Page not found</h1>
      <p style={{ fontSize: 15, margin: 0 }}>That page doesn’t exist.</p>
      <Link href="/" className="button">Back to search</Link>
    </main>
  )
}
