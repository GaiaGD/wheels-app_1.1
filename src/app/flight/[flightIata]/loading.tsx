export default function Loading() {
  return (
    <main
      aria-busy="true"
      style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center' }}
    >
      <p style={{ fontSize: 18, margin: 0 }}>Looking up your flight…</p>
    </main>
  )
}
