'use client'

import dynamic from 'next/dynamic'
import styles from './FlightMap.module.css'

export const FlightMapLoader = dynamic(() => import('./FlightMap'), {
  ssr: false,
  loading: () => <div className={styles.placeholder} aria-hidden="true" />,
})

export default FlightMapLoader
