'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { parseDate, parseFlightNumber } from '@/lib/validate'
import { AutocompleteField } from '../AutocompleteField/AutocompleteField'
import styles from './SearchForm.module.css'

type Tab = 'route' | 'number'
type Errors = Partial<Record<'dep' | 'arr' | 'airline' | 'number' | 'date', string>>

export function SearchForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('route')
  const [dep, setDep] = useState<string | null>(null)
  const [arr, setArr] = useState<string | null>(null)
  const [airline, setAirline] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  function switchTab(next: Tab) {
    setTab(next)
    setErrors({})
    setDep(null)
    setArr(null)
    setAirline(null)
  }

  function submitRoute() {
    const next: Errors = {}
    if (!dep) next.dep = 'Choose a departure airport'
    if (!arr) next.arr = 'Choose an arrival airport'
    if (!airline) next.airline = 'Choose an airline'
    if (dep && arr && dep === arr) next.arr = 'Arrival must differ from departure'
    setErrors(next)
    if (Object.keys(next).length === 0) router.push(`/search?dep=${dep}&arr=${arr}&airline=${airline}`)
  }

  function submitNumber() {
    const next: Errors = {}
    const parsed = parseFlightNumber(number)
    if (!parsed.ok) next.number = 'Enter a valid flight number, like AA123'
    if (date) {
      const d = parseDate(date)
      if (!d.ok) next.date = 'Enter a valid date'
    }
    setErrors(next)
    if (Object.keys(next).length === 0 && parsed.ok) {
      router.push(`/flight/${parsed.data}${date ? `?date=${date}` : ''}`)
    }
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (tab === 'route') submitRoute()
        else submitNumber()
      }}
    >
      <div role="tablist" aria-label="Search type" className={styles.tabs}>
        <button type="button" role="tab" aria-selected={tab === 'route'} onClick={() => switchTab('route')}>By route</button>
        <button type="button" role="tab" aria-selected={tab === 'number'} onClick={() => switchTab('number')}>By flight number</button>
      </div>

      {tab === 'route' ? (
        <div role="tabpanel" className={styles.fields}>
          <AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From (city or code)" onSelect={setDep} error={errors.dep} />
          <AutocompleteField label="Arrival airport" endpoint="/api/airports" placeholder="To (city or code)" onSelect={setArr} error={errors.arr} />
          <AutocompleteField label="Airline" endpoint="/api/airlines" placeholder="Airline (name or code)" onSelect={setAirline} error={errors.airline} />
          <p className={styles.hint}>Route search shows flights that are in the air right now.</p>
        </div>
      ) : (
        <div role="tabpanel" className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="flight-number">Flight number</label>
            <input id="flight-number" value={number} placeholder="AA123" autoComplete="off" onChange={(e) => setNumber(e.target.value)} aria-invalid={errors.number ? true : undefined} aria-describedby={errors.number ? 'flight-number-error' : undefined} />
            {errors.number && <p id="flight-number-error" role="alert" className={styles.error}>{errors.number}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="flight-date">Date (optional)</label>
            <input id="flight-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={errors.date ? true : undefined} aria-describedby={errors.date ? 'flight-date-error' : undefined} />
            {errors.date && <p id="flight-date-error" role="alert" className={styles.error}>{errors.date}</p>}
          </div>
          <p className={styles.hint}>Works for past, current and upcoming flights.</p>
        </div>
      )}

      <button type="submit" className="button">Search</button>
    </form>
  )
}
