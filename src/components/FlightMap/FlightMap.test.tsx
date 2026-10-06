/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for maplibre-gl */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { greatCircleLine } from '@/lib/flight/geo'

const mocks = vi.hoisted(() => {
  const state = { maps: [] as any[], markers: [] as any[] }
  class FakeMap {
    options: any
    handlers: Record<string, Array<() => void>> = {}
    sources: Record<string, any> = {}
    layers: any[] = []
    fitBoundsCalls: any[] = []
    projection: any = null
    removed = 0
    constructor(options: any) {
      this.options = options
      state.maps.push(this)
    }
    on(type: string, cb: () => void) {
      ;(this.handlers[type] ||= []).push(cb)
      return this
    }
    fire(type: string) {
      for (const cb of this.handlers[type] ?? []) cb()
    }
    addSource(id: string, spec: any) {
      this.sources[id] = spec
    }
    addLayer(layer: any) {
      this.layers.push(layer)
    }
    fitBounds(bounds: any, options: any) {
      this.fitBoundsCalls.push({ bounds, options })
    }
    setProjection(p: any) {
      this.projection = p
    }
    remove() {
      this.removed++
    }
  }
  class FakeMarker {
    options: any
    lngLat: [number, number] | null = null
    map: any = null
    constructor(options: any) {
      this.options = options
      state.markers.push(this)
    }
    setLngLat(ll: [number, number]) {
      this.lngLat = ll
      return this
    }
    addTo(map: any) {
      this.map = map
      return this
    }
    remove() {
      this.map = null
      return this
    }
  }
  class FakeBounds {
    pts: [number, number][] = []
    extend(p: [number, number]) {
      this.pts.push(p)
      return this
    }
  }
  return { state, FakeMap, FakeMarker, FakeBounds }
})

vi.mock('maplibre-gl', () => ({
  Map: mocks.FakeMap,
  Marker: mocks.FakeMarker,
  LngLatBounds: mocks.FakeBounds,
  setWorkerUrl: vi.fn(),
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

import { FlightMap } from './FlightMap'

const from = { code: 'FCO', lat: 41.8, lon: 12.25 }
const to = { code: 'JFK', lat: 40.64, lon: -73.78 }
const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const mq = { wide: false, added: 0, removed: 0, listeners: [] as Array<() => void> }
const ro = { instances: [] as Array<{ cb: () => void; disconnected: boolean }> }
class FakeResizeObserver {
  cb: () => void
  disconnected = false
  constructor(cb: () => void) {
    this.cb = cb
    ro.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
}
function setSize(w: number, h: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => w })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => h })
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('prefers-reduced-motion') ? reduce : q.includes('min-width') ? mq.wide : false,
    media: q,
    addEventListener(_t: string, cb: () => void) {
      mq.added++
      mq.listeners.push(cb)
    },
    removeEventListener(_t: string, cb: () => void) {
      mq.removed++
      mq.listeners = mq.listeners.filter((l) => l !== cb)
    },
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  mocks.state.maps.length = 0
  mocks.state.markers.length = 0
  mq.wide = false
  mq.added = 0
  mq.removed = 0
  mq.listeners = []
  ro.instances.length = 0
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  setSize(390, 844)
  setReducedMotion(false)
})

describe('FlightMap', () => {
  it('has an accessible region and creates the map once with the Dark Matter style', () => {
    const { rerender } = render(<FlightMap from={from} to={to} plane={null} />)
    expect(screen.getByRole('region', { name: 'Flight route map' })).toBeTruthy()
    expect(mocks.state.maps).toHaveLength(1)
    const opts = mocks.state.maps[0].options
    expect(opts.style).toBe(STYLE)
    expect(opts.container).toBeInstanceOf(HTMLElement)
    rerender(<FlightMap from={from} to={to} plane={null} />)
    expect(mocks.state.maps).toHaveLength(1)
  })

  it('adds the great-circle line and fits both airports with padding after load', () => {
    render(<FlightMap from={from} to={to} plane={null} />)
    const map = mocks.state.maps[0]
    expect(Object.keys(map.sources)).toHaveLength(0)
    map.fire('load')
    const expected = greatCircleLine(from, to)
    const source = Object.values(map.sources)[0] as any
    expect(source.type).toBe('geojson')
    const coords = source.data.geometry.coordinates
    expect(source.data.geometry.type).toBe('LineString')
    expect(coords).toHaveLength(expected.length)
    expect(coords[0]).toEqual(expected[0])
    expect(coords[coords.length - 1]).toEqual(expected[expected.length - 1])
    expect(map.layers).toHaveLength(1)
    expect(map.layers[0].type).toBe('line')
    expect(map.layers[0].source).toBe(Object.keys(map.sources)[0])
    expect(map.fitBoundsCalls).toHaveLength(1)
    const { bounds, options } = map.fitBoundsCalls[0]
    expect(bounds.pts).toEqual(expect.arrayContaining(coords))
    expect(bounds.pts).toContainEqual([from.lon, from.lat])
    // the line's last point is the destination, with its longitude unwrapped along the route
    expect(coords[coords.length - 1][1]).toBeCloseTo(to.lat, 6)
    expect(coords[coords.length - 1][0] % 360).toBeCloseTo(to.lon, 6)
    expect(Object.values(options.padding as Record<string, number>).every((v) => v > 0)).toBe(true)
    expect(options.animate).toBe(true)
  })

  it('does not animate the camera under prefers-reduced-motion', () => {
    setReducedMotion(true)
    render(<FlightMap from={from} to={to} plane={null} />)
    const map = mocks.state.maps[0]
    map.fire('load')
    expect(map.fitBoundsCalls[0].options.animate).toBe(false)
  })

  it('shows airport code pills and no plane or estimate when plane is null', () => {
    render(<FlightMap from={from} to={to} plane={null} />)
    const texts = mocks.state.markers.map((m) => m.options.element.textContent)
    expect(texts).toEqual(['FCO', 'JFK'])
    expect(screen.queryByText('Estimated position')).toBeNull()
  })

  it('adds a rotated plane marker with a name, and labels an estimate', () => {
    render(<FlightMap from={from} to={to} plane={{ lat: 50, lon: -30, bearing: 270, estimated: true }} />)
    expect(mocks.state.markers).toHaveLength(3)
    const el = mocks.state.markers[2].options.element as HTMLElement
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toBeTruthy()
    expect(mocks.state.markers[2].lngLat).toEqual([-30, 50])
    // the icon points east, so a 270 degree bearing needs a 180 degree rotation
    const img = el.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/plane-icon.svg')
    expect(img.style.transform).toContain('rotate(180deg)')
    expect(screen.getByText('Estimated position')).toBeTruthy()
  })

  it('does not label a real position as an estimate', () => {
    render(<FlightMap from={from} to={to} plane={{ lat: 50, lon: -30, bearing: 90, estimated: false }} />)
    expect(screen.queryByText('Estimated position')).toBeNull()
  })

  it('handles map errors quietly and removes the map on unmount', () => {
    const { unmount } = render(<FlightMap from={from} to={to} plane={null} />)
    const map = mocks.state.maps[0]
    expect(() => map.fire('error')).not.toThrow()
    unmount()
    expect(map.removed).toBe(1)
  })

  describe('responsive fit padding', () => {
    const pad = (i = 0) => mocks.state.maps[0].fitBoundsCalls[i].options.padding as Record<string, number>

    it('uses top/bottom padding on phones and side padding on desktop, from the container size', () => {
      setSize(390, 844)
      const phone = render(<FlightMap from={from} to={to} plane={null} />)
      mocks.state.maps[0].fire('load')
      const p = pad()
      expect(p.top).toBeGreaterThan(p.left)
      phone.unmount()
      mocks.state.maps.length = 0
      mq.wide = true
      setSize(1280, 800)
      render(<FlightMap from={from} to={to} plane={null} />)
      mocks.state.maps[0].fire('load')
      const d = pad()
      expect(d.left).toBeGreaterThan(d.top)
      expect(d.left).toBeGreaterThan(300)
    })

    it('gives different padding for different container sizes', () => {
      mq.wide = true
      setSize(1100, 800)
      const a = render(<FlightMap from={from} to={to} plane={null} />)
      mocks.state.maps[0].fire('load')
      const narrow = pad()
      a.unmount()
      mocks.state.maps.length = 0
      setSize(1600, 800)
      render(<FlightMap from={from} to={to} plane={null} />)
      mocks.state.maps[0].fire('load')
      expect(pad().left).toBeGreaterThan(narrow.left)
    })

    it('clamps padding on a short landscape phone so the area is not degenerate', () => {
      setSize(740, 360)
      render(<FlightMap from={from} to={to} plane={null} />)
      mocks.state.maps[0].fire('load')
      const p = pad()
      expect(p.top + p.bottom).toBeLessThanOrEqual(360 * 0.7 + 0.001)
      expect(p.left + p.right).toBeLessThanOrEqual(740 * 0.7 + 0.001)
      expect(p.top).toBeGreaterThan(0)
    })

    it('re-fits when the container resizes, without animation under reduced motion', () => {
      setReducedMotion(true)
      render(<FlightMap from={from} to={to} plane={null} />)
      const map = mocks.state.maps[0]
      map.fire('load')
      expect(map.fitBoundsCalls).toHaveLength(1)
      setSize(390, 500)
      ro.instances[0].cb()
      expect(map.fitBoundsCalls).toHaveLength(2)
      expect(map.fitBoundsCalls[1].options.animate).toBe(false)
      expect(pad(1).top + pad(1).bottom).toBeLessThanOrEqual(500 * 0.7 + 0.001)
    })

    it('does not fit before the map has loaded', () => {
      render(<FlightMap from={from} to={to} plane={null} />)
      ro.instances[0].cb()
      expect(mocks.state.maps[0].fitBoundsCalls).toHaveLength(0)
    })

    it('re-fits when the desktop breakpoint changes', () => {
      render(<FlightMap from={from} to={to} plane={null} />)
      const map = mocks.state.maps[0]
      map.fire('load')
      mq.wide = true
      for (const l of mq.listeners) l()
      expect(map.fitBoundsCalls).toHaveLength(2)
    })

    it('cleans up the observer and the media listener on unmount', () => {
      const { unmount } = render(<FlightMap from={from} to={to} plane={null} />)
      expect(ro.instances).toHaveLength(1)
      expect(mq.added).toBeGreaterThan(0)
      unmount()
      expect(ro.instances[0].disconnected).toBe(true)
      expect(mq.removed).toBe(mq.added)
    })
  })
})
