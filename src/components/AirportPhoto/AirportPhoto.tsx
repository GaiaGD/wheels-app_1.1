import { DEFAULT_AIRPORT_PHOTO, getAirportPhoto } from '@/lib/providers/photos'
import styles from './AirportPhoto.module.css'

export async function AirportPhoto({ city }: { city: string }) {
  const res = await getAirportPhoto(city)
  const url = res.ok ? res.data : DEFAULT_AIRPORT_PHOTO
  return <div className={styles.photo} style={{ backgroundImage: `url(${url})` }} role="img" aria-label={`${city}`} />
}

export function AirportPhotoSkeleton() {
  return <div className={`${styles.photo} ${styles.skeleton}`} aria-hidden="true" />
}
