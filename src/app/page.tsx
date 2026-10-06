import { SearchForm } from '@/components/SearchForm/SearchForm'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 24, padding: '32px 16px', textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon */}
      <img src="/wheels-app-logo-white.gif" alt="" style={{ maxHeight: 150 }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon */}
      <img src="/wa-logotype-white.svg" alt="Wheels App" style={{ maxWidth: 200 }} />
      <SearchForm />
    </main>
  )
}
