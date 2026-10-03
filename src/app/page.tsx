import { SearchForm } from '@/components/SearchForm/SearchForm'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 24, padding: '32px 16px', textAlign: 'center' }}>
      <img src="/wheels-app-logo.gif" alt="" style={{ maxHeight: 150 }} />
      <img src="/wa-logotype.svg" alt="Wheels App" style={{ maxWidth: 200 }} />
      <SearchForm />
    </main>
  )
}
