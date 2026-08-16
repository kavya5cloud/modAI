import { useEffect, useRef } from 'react'

/**
 * Pointer-reactive liquid field behind the hero.
 *
 * Soft radial blobs drift on their own sine paths and are pulled toward the
 * cursor with per-blob easing, so the field flows rather than snapping. The
 * canvas is blurred in CSS (far cheaper than a canvas filter) which melts the
 * blobs into each other and gives the metaball look.
 *
 * Cheap by construction: capped DPR, rAF paused when off-screen or when the
 * tab is hidden, and a static paint under prefers-reduced-motion.
 */

type Blob = {
  /** home position in 0..1 space */
  hx: number
  hy: number
  /** current drawn position, in 0..1 space */
  x: number
  y: number
  r: number
  color: [number, number, number]
  /** how strongly this blob chases the pointer */
  pull: number
  /** drift parameters */
  ax: number
  ay: number
  sx: number
  sy: number
  phase: number
}

const BLOBS: Blob[] = [
  { hx: 0.82, hy: 0.78, x: 0.82, y: 0.78, r: 0.46, color: [86, 124, 235], pull: 0.10, ax: 0.035, ay: 0.028, sx: 0.00021, sy: 0.00017, phase: 0 },
  { hx: 0.34, hy: 0.94, x: 0.34, y: 0.94, r: 0.42, color: [72, 108, 210], pull: 0.07, ax: 0.045, ay: 0.022, sx: 0.00016, sy: 0.00024, phase: 1.7 },
  { hx: 1.02, hy: 0.34, x: 1.02, y: 0.34, r: 0.34, color: [110, 150, 250], pull: 0.13, ax: 0.03, ay: 0.038, sx: 0.00025, sy: 0.00019, phase: 3.1 },
  { hx: 0.08, hy: 0.62, x: 0.08, y: 0.62, r: 0.3, color: [140, 175, 255], pull: 0.09, ax: 0.04, ay: 0.03, sx: 0.00018, sy: 0.00022, phase: 4.6 },
]

const ALPHA = 0.3

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const blobs = BLOBS.map((b) => ({ ...b }))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Pointer target in 0..1 space; starts centred so there is no jump on first move.
    let px = 0.5
    let py = 0.5
    let w = 0
    let h = 0
    let raf = 0
    let visible = true

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = rect.width
      h = rect.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const paint = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      // Longest edge keeps blobs round regardless of aspect ratio.
      const unit = Math.max(w, h)

      for (const b of blobs) {
        // Drift on its own slow sine path…
        const dx = Math.sin(t * b.sx + b.phase) * b.ax
        const dy = Math.cos(t * b.sy + b.phase * 1.3) * b.ay
        // …then lean toward the pointer.
        const tx = b.hx + dx + (px - 0.5) * b.pull * 2
        const ty = b.hy + dy + (py - 0.5) * b.pull * 2
        // Ease so the field flows instead of tracking rigidly.
        b.x += (tx - b.x) * 0.045
        b.y += (ty - b.y) * 0.045

        const cx = b.x * w
        const cy = b.y * h
        const r = b.r * unit
        const [cr, cg, cb] = b.color
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${ALPHA})`)
        g.addColorStop(0.55, `rgba(${cr}, ${cg}, ${cb}, ${ALPHA * 0.4})`)
        g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = (t: number) => {
      paint(t)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (raf || reduce.matches || !visible || document.hidden) return
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
    }

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      px = (event.clientX - rect.left) / Math.max(1, rect.width)
      py = (event.clientY - rect.top) / Math.max(1, rect.height)
    }

    const onResize = () => {
      resize()
      if (reduce.matches) paint(0)
    }

    const onVisibility = () => (document.hidden ? stop() : start())

    const onMotionChange = () => {
      stop()
      if (reduce.matches) {
        // Settle every blob on its home position and paint once.
        for (const b of blobs) {
          b.x = b.hx
          b.y = b.hy
        }
        paint(0)
      } else {
        start()
      }
    }

    resize()
    paint(0)

    // The hero is the only place this lives, so watching it is enough.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting)
        if (visible) start()
        else stop()
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    reduce.addEventListener('change', onMotionChange)

    start()

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      reduce.removeEventListener('change', onMotionChange)
    }
  }, [])

  return <canvas ref={canvasRef} className="home-liquid" aria-hidden="true" />
}
