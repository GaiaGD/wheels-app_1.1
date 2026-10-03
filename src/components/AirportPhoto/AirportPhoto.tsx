import { DEFAULT_AIRPORT_PHOTO, getAirportPhoto } from '@/lib/providers/photos'
import styles from './AirportPhoto.module.css'

export async function AirportPhoto({ city }: { city: string }) {
  let url = DEFAULT_AIRPORT_PHOTO
  try {
    const res = await getAirportPhoto(city)
    if (res.ok && res.data.startsWith('https://')) url = res.data
  } catch {
    // fall back to the default photo
  }
  return (
    <div
      className={styles.photo}
      style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
      role="img"
      aria-label={`Photo of ${city}`}
    />
  )
}

export function AirportPhotoSkeleton() {
  return <div className={`${styles.photo} ${styles.skeleton}`} aria-hidden="true" />
}
