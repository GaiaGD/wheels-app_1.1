export interface LatLon {
  lat: number
  lon: number
}

export interface PlanePosition {
  lat: number
  lon: number
  bearing: number
  estimated: boolean
}

const EARTH_RADIUS_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Great-circle distance in km (haversine). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Point along the great circle from a to b. fraction 0 = a, 1 = b (clamped). */
export function interpolate(a: LatLon, b: LatLon, fraction: number): LatLon {
  const f = Math.min(1, Math.max(0, fraction))
  const delta = distanceKm(a, b) / EARTH_RADIUS_KM
  // Identical or antipodal points have no unique great circle.
  if (delta < 1e-12 || Math.abs(Math.PI - delta) < 1e-9) return { lat: a.lat, lon: a.lon }
  const lat1 = rad(a.lat)
  const lon1 = rad(a.lon)
  const lat2 = rad(b.lat)
  const lon2 = rad(b.lon)
  const sinD = Math.sin(delta)
  const k1 = Math.sin((1 - f) * delta) / sinD
  const k2 = Math.sin(f * delta) / sinD
  const x = k1 * Math.cos(lat1) * Math.cos(lon1) + k2 * Math.cos(lat2) * Math.cos(lon2)
  const y = k1 * Math.cos(lat1) * Math.sin(lon1) + k2 * Math.cos(lat2) * Math.sin(lon2)
  const z = k1 * Math.sin(lat1) + k2 * Math.sin(lat2)
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) }
}

/** Initial bearing from a towards b in degrees, 0..360, 0 = north. */
export function bearing(a: LatLon, b: LatLon): number {
  const lat1 = rad(a.lat)
  const lat2 = rad(b.lat)
  const dLon = rad(b.lon - a.lon)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const result = (deg(Math.atan2(y, x)) + 360) % 360
  return result >= 360 ? 0 : result
}

/** [lon, lat] points along the great circle, longitudes unwrapped so they never jump across the date line. */
export function greatCircleLine(a: LatLon, b: LatLon, steps = 64): [number, number][] {
  const points: [number, number][] = [[a.lon, a.lat]]
  for (let i = 1; i <= steps; i++) {
    const p = interpolate(a, b, i / steps)
    let lon = p.lon
    const prev = points[i - 1][0]
    while (lon - prev > 180) lon -= 360
    while (lon - prev < -180) lon += 360
    points.push([lon, p.lat])
  }
  return points
}

/** Plane position: a real fix wins; otherwise an estimate along the route. Null when neither exists. */
export function planePosition(
  from: LatLon,
  to: LatLon,
  fraction: number | null,
  real: LatLon | null,
): PlanePosition | null {
  if (real) return { lat: real.lat, lon: real.lon, bearing: bearing(real, to), estimated: false }
  if (fraction === null) return null
  const p = interpolate(from, to, fraction)
  return { lat: p.lat, lon: p.lon, bearing: bearing(p, to), estimated: true }
}
