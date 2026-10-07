'use client'

// Based on React Bits "Dot Field" (reactbits.dev/backgrounds/dot-field), trimmed to a hover effect for small elements.
// Drop it inside any `position: relative` element (clip it with overflow: hidden if it has rounded corners). It listens
// to pointer events on that parent; dots near the pointer bulge away from it. The animation loop only runs while the
// pointer is over the parent or the dots are still settling.
import { useEffect, useRef } from 'react'

interface Dot { ax: number; ay: number; sx: number; sy: number }

export interface DotFieldProps {
  dotRadius?: number
  dotSpacing?: number
  cursorRadius?: number
  bulgeStrength?: number
  /** Opacity of the dots; their colour is the CSS `color` of the canvas (inherited from the parent). */
  opacity?: number
  /** Use this to layer the canvas, e.g. a negative z-index to sit behind other pseudo-elements. */
  className?: string
}

export function DotField({ dotRadius = 1.5, dotSpacing = 6, cursorRadius = 60, bulgeStrength = 10, opacity = 0.4, className }: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !parent || !ctx) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const mouse = { x: -9999, y: -9999 }
    let dots: Dot[] = []
    let w = 0
    let h = 0
    let hovered = false
    let engagement = 0
    let raf = 0

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = parent!.clientWidth // the padding box, which is what the absolutely positioned canvas fills
      h = parent!.clientHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const step = dotRadius + dotSpacing
      const cols = Math.floor(w / step)
      const rows = Math.floor(h / step)
      const padX = (w % step) / 2
      const padY = (h % step) / 2
      dots = []
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2
          const ay = padY + row * step + step / 2
          dots.push({ ax, ay, sx: ax, sy: ay })
        }
      }
      draw()
    }

    /** Moves every dot one step and paints it. Returns true once nothing is moving any more. */
    function draw() {
      engagement += ((hovered ? 1 : 0) - engagement) * 0.1
      if (engagement < 0.001) engagement = 0

      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = getComputedStyle(canvas!).color
      ctx!.globalAlpha = opacity
      ctx!.beginPath()
      let moving = 0
      for (const d of dots) {
        const dx = mouse.x - d.ax
        const dy = mouse.y - d.ay
        const dist = Math.hypot(dx, dy)
        let tx = d.ax
        let ty = d.ay
        if (engagement > 0 && dist < cursorRadius) {
          const t = 1 - dist / cursorRadius
          const push = t * t * bulgeStrength * engagement
          const angle = Math.atan2(dy, dx)
          tx -= Math.cos(angle) * push
          ty -= Math.sin(angle) * push
        }
        d.sx += (tx - d.sx) * 0.15
        d.sy += (ty - d.sy) * 0.15
        moving += Math.abs(tx - d.sx) + Math.abs(ty - d.sy)
        ctx!.moveTo(d.sx + dotRadius / 2, d.sy)
        ctx!.arc(d.sx, d.sy, dotRadius / 2, 0, Math.PI * 2)
      }
      ctx!.fill()
      return !hovered && engagement === 0 && moving < 0.01
    }

    function tick() {
      raf = draw() ? 0 : requestAnimationFrame(tick)
    }
    function wake() {
      if (!raf && !reduceMotion) raf = requestAnimationFrame(tick)
    }
    function track(e: PointerEvent) {
      const rect = parent!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left - parent!.clientLeft
      mouse.y = e.clientY - rect.top - parent!.clientTop
      hovered = true
      wake()
    }
    function leave() {
      hovered = false
      wake()
    }

    build()
    parent.addEventListener('pointerenter', track)
    parent.addEventListener('pointermove', track)
    parent.addEventListener('pointerleave', leave)
    parent.addEventListener('pointercancel', leave)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(build)
    observer?.observe(parent)

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      parent.removeEventListener('pointerenter', track)
      parent.removeEventListener('pointermove', track)
      parent.removeEventListener('pointerleave', leave)
      parent.removeEventListener('pointercancel', leave)
    }
  }, [dotRadius, dotSpacing, cursorRadius, bulgeStrength, opacity])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'inherit' }} />
}
