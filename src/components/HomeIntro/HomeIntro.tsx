'use client'

import { useEffect, useState } from 'react'
import { SearchForm } from '../SearchForm/SearchForm'
import styles from './HomeIntro.module.css'

const INTRO_MS = 3000

/** True once the intro has started in this page session. Module state survives client-side navigation
    (e.g. back from a flight) but resets on a full page load, which is exactly "first load only". */
let introSeen = false

/** Logo + logotype on first load; after a few seconds the logotype fades out and the search form takes its place. */
export function HomeIntro() {
  const [ready, setReady] = useState(introSeen)

  useEffect(() => {
    introSeen = true
    if (ready) return
    const timer = setTimeout(() => setReady(true), INTRO_MS)
    return () => clearTimeout(timer)
  }, [ready])

  return (
    <main className={styles.page}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon */}
      <img src="/wheels-app-logo-white.gif" alt="" className={styles.logo} />
      <div className={styles.slot} data-open={!ready}>
        <div className={styles.inner}>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative/remote icon */}
          <img src="/wa-logotype-white.svg" alt="Wheels App" className={styles.logotype} />
        </div>
      </div>
      <div className={styles.slot} data-open={ready} inert={!ready}>
        <div className={styles.inner}>
          <SearchForm />
        </div>
      </div>
    </main>
  )
}
