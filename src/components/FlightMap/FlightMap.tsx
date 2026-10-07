'use client'

import { useEffect, useRef } from 'react'
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { greatCircleLine, type LatLon, type PlanePosition } from '@/lib/flight/geo'
import styles from './FlightMap.module.css'

export interface MapAirport extends LatLon {
  code: string
}

export interface FlightMapProps {
  from: MapAirport
  to: MapAirport
  plane: PlanePosition | null
}

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SOURCE_ID = 'route'
// The bundler moves maplibre-gl into a chunk, so its default worker URL (a sibling file of the
// module) 404s. These two files are copies of node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs
// and maplibre-gl-shared.mjs: refresh them when upgrading maplibre-gl.
const WORKER_URL = '/maplibre/maplibre-gl-worker.mjs'
// public/plane-icon.svg points east (right), so a bearing of 90 needs no rotation.
const ICON_POINTS_BEARING = 90

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

// Same breakpoint as FlightView.module.css: card panel on the left from here up, at the bottom below.
const DESKTOP_QUERY = '(min-width: 1100px)'
const MAX_PAD_SHARE = 0.7
const PANEL_HEIGHT_SHARE = 0.3 // phones: the card panel is at most this share of the height (see .panel in FlightView.module.css)
const EXTRA_PAD = 100 // desktop only: breathing room on every side, zooms the initial fit out a little

interface Padding {
  top: number
  bottom: number
  left: number
  right: number
}

function clampPair(a: number, b: number, size: number): [number, number] {
  const max = size * MAX_PAD_SHARE
  const sum = a + b
  if (size <= 0 || sum <= max) return [a, b]
  const k = max / sum
  return [a * k, b * k]
}

// Keeps the route clear of the card panel: a left column on desktop, the bottom of the screen on phones.
// Never takes more than 70% of the container in either direction.
export function fitPadding(width: number, height: number, wide: boolean): Padding {
  let p: Padding
  if (wide) {
    // The panel is a left column (max 550px), so the route gets the space to its right.
    p = { top: 80 + EXTRA_PAD, bottom: 110 + EXTRA_PAD, left: 550 + 24 + 16 + EXTRA_PAD, right: 40 + EXTRA_PAD }
  } else {
    // The panel covers the bottom of the screen, so the route gets the part above it.
    p = { top: 70, bottom: height * PANEL_HEIGHT_SHARE + 20, left: 40, right: 40 }
  }
  const [top, bottom] = clampPair(p.top, p.bottom, height)
  const [left, right] = clampPair(p.left, p.right, width)
  return { top, bottom, left, right }
}

function airportElement(code: string): HTMLElement {
  const el = document.createElement('div')
  el.className = styles.pin
  const dot = document.createElement('span')
  dot.className = styles.dot
  const label = document.createElement('span')
  label.className = styles.code
  label.textContent = code
  el.append(dot, label)
  return el
}

function planeElement(bearing: number): HTMLElement {
  const el = document.createElement('div')
  el.className = styles.plane
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', 'Plane position')
  const img = document.createElement('img')
  img.src = '/plane-icon.svg'
  img.alt = ''
  img.draggable = false
  img.style.transform = `rotate(${bearing - ICON_POINTS_BEARING}deg)`
  el.append(img)
  return el
}

export function FlightMap({ from, to, plane }: FlightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const planeLat = plane?.lat
  const planeLon = plane?.lon
  const planeBearing = plane?.bearing

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const reduced = prefersReducedMotion()

    let map: MapLibreMap
    try {
      setWorkerUrl(WORKER_URL)
      map = new MapLibreMap({ container, style: STYLE_URL, attributionControl: { compact: true } })
    } catch {
      // No WebGL: keep the plain background.
      return
    }
    // A failed style or tile request must not break the page; the background stays.
    map.on('error', () => {})

    const line = greatCircleLine(from, to)
    const bounds = new LngLatBounds()
    for (const point of line) bounds.extend(point)
    const wide = window.matchMedia(DESKTOP_QUERY)
    let loaded = false
    const fit = (animate: boolean) => {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      map.fitBounds(bounds, { padding: fitPadding(width, height, wide.matches), maxZoom: 6, animate })
    }
    const refit = () => {
      if (loaded) fit(false)
    }
    wide.addEventListener('change', refit)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refit)
    observer?.observe(container)
    map.on('load', () => {
      try {
        map.setProjection({ type: 'globe' })
      } catch {
        // stay on the flat map
      }
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#231f20', 'line-width': 2.5, 'line-dasharray': [2, 2] },
      })
      const bounds = new LngLatBounds()
      for (const point of line) bounds.extend(point)
      loaded = true
      fit(!reduced)
      // On small screens start with the attribution folded to its (i) button so it never covers the
      // "Check another flight" button; it still opens on tap.
      if (!wide.matches) container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    })

    const markers = [from, to].map((a) =>
      new Marker({ element: airportElement(a.code), anchor: 'center' }).setLngLat([a.lon, a.lat]).addTo(map),
    )
    if (planeLat !== undefined && planeLon !== undefined && planeBearing !== undefined) {
      markers.push(
        new Marker({ element: planeElement(planeBearing), anchor: 'center' })
          .setLngLat([planeLon, planeLat])
          .addTo(map),
      )
    }

    return () => {
      observer?.disconnect()
      wide.removeEventListener('change', refit)
      for (const m of markers) m.remove()
      map.remove()
    }
  }, [from.code, from.lat, from.lon, to.code, to.lat, to.lon, planeLat, planeLon, planeBearing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.root} role="region" aria-label="Flight route map">
      <div ref={containerRef} className={styles.map} />
      {plane?.estimated && <span className={styles.estimate}>Estimated position</span>}
    </div>
  )
}

export default FlightMap
