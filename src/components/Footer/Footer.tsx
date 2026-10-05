import styles from './Footer.module.css'

const CREDITS = [
  { label: 'Flight data by AeroDataBox', href: 'https://aerodatabox.com' },
  { label: 'Weather by OpenWeather', href: 'https://openweathermap.org' },
  { label: 'Photos from Unsplash', href: 'https://unsplash.com' },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      {CREDITS.map((c) => (
        <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer">
          {c.label}
        </a>
      ))}
    </footer>
  )
}
