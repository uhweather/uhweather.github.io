import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const IN_MS = 300
const OUT_MS = 200
const MAX_SCALE = 8

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Zoom {
  scale: number
  x: number
  y: number
}

const NONE: Zoom = { scale: 1, x: 0, y: 0 }

/**
 * One figure, filling the screen, with the imagery under your fingers.
 *
 * A satellite panel on a phone is a couple of hundred pixels of a scene that was
 * sampled at kilometre resolution, and the whole point of the products is detail
 * — a convective tower, the eye of a system, the edge of a dry slot. Tapping one
 * opens it here at the size the screen can give it, and pinch, wheel and drag do
 * the rest.
 *
 * It grows out of the panel that was tapped rather than appearing over it: the
 * opening move maps the panel's rectangle onto where the figure lands, so the
 * eye keeps hold of which of the four it is looking at.
 *
 * `src` stays live while this is open, so a loop that was running goes on
 * running at full size instead of freezing on the frame that happened to be up.
 *
 * It renders into the body. The routed page carries a transform animation, and
 * an element with one is a containing block for `position: fixed` descendants —
 * so rendered in place this would be pinned to the page's box rather than the
 * window, and open at the size of the thing it was meant to escape.
 */
export default function FigureViewer({
  src,
  alt,
  caption,
  origin,
  onClose,
}: {
  src: string
  alt: string
  caption?: string
  /** Where the figure was on the page, for the opening and closing move. */
  origin: DOMRect | null
  onClose: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const [zoom, setZoom] = useState<Zoom>(NONE)
  // A button or keyboard step can ease; a pinch or a drag has to track the finger.
  const [eased, setEased] = useState(false)

  /** The box the image is actually painted in — `object-contain` letterboxes. */
  const painted = useCallback(() => {
    const box = frame.current?.getBoundingClientRect()
    if (!box) return null
    const img = image.current
    const aspect =
      img?.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : box.width / box.height
    const width = Math.min(box.width, box.height * aspect)
    return { box, width, height: width / aspect }
  }, [])

  /** Maps the figure's resting place onto the rectangle it came from. */
  const fromOrigin = useCallback(() => {
    const p = painted()
    if (!p || !origin || !origin.width) return null
    return {
      scale: origin.width / p.width,
      dx: origin.left + origin.width / 2 - (p.box.left + p.box.width / 2),
      dy: origin.top + origin.height / 2 - (p.box.top + p.box.height / 2),
    }
  }, [origin, painted])

  useLayoutEffect(() => {
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: IN_MS,
      easing: EASE,
    })
    if (still()) return
    const m = fromOrigin()
    if (!m) return
    frame.current?.animate(
      [
        { transform: `translate(${m.dx}px, ${m.dy}px) scale(${m.scale})`, opacity: 0.5 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: IN_MS, easing: EASE },
    )
    // Once, on the way in: the figure has arrived and stays put.
  }, [])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: OUT_MS,
      easing: EASE,
      fill: 'forwards',
    })
    const m = still() ? null : fromOrigin()
    if (!m || !frame.current) {
      onClose()
      return
    }
    const run = frame.current.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${m.dx}px, ${m.dy}px) scale(${m.scale})`, opacity: 0.4 },
      ],
      { duration: OUT_MS, easing: EASE, fill: 'forwards' },
    )
    run.onfinish = () => onClose()
  }, [fromOrigin, onClose])

  /** No panning past the edge of the picture. */
  const bound = useCallback(
    (z: Zoom): Zoom => {
      const p = painted()
      if (!p) return z
      const slackX = Math.max(0, (p.width * z.scale - p.box.width) / 2)
      const slackY = Math.max(0, (p.height * z.scale - p.box.height) / 2)
      return { scale: z.scale, x: clamp(z.x, -slackX, slackX), y: clamp(z.y, -slackY, slackY) }
    },
    [painted],
  )

  /** Keeps the point under the pointer where it was as the scale changes. */
  const zoomAbout = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      setZoom((z) => {
        const box = frame.current?.getBoundingClientRect()
        if (!box) return z
        const scale = clamp(z.scale * factor, 1, MAX_SCALE)
        const k = scale / z.scale
        const cx = clientX - (box.left + box.width / 2)
        const cy = clientY - (box.top + box.height / 2)
        return bound({ scale, x: cx - k * (cx - z.x), y: cy - k * (cy - z.y) })
      })
    },
    [bound],
  )

  // Wheel has to be a native listener: React's is passive, and a page that
  // scrolls behind the zoom is worse than no zoom.
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setEased(false)
      zoomAbout(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0025))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAbout])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (!'+=-0'.includes(e.key)) return
      setEased(true)
      if (e.key === '+' || e.key === '=') zoomAbout(innerWidth / 2, innerHeight / 2, 1.4)
      else if (e.key === '-') zoomAbout(innerWidth / 2, innerHeight / 2, 1 / 1.4)
      else setZoom(NONE)
    }
    window.addEventListener('keydown', onKey, true)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
    }
  }, [close, zoomAbout])

  // Drag to pan, two fingers to pinch. Pointer events cover mouse, pen and
  // touch with one path, so there is no separate touch branch to keep in step.
  const points = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ distance: number; zoom: Zoom } | null>(null)

  const spread = () => {
    const [a, b] = [...points.current.values()]
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setEased(false)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (points.current.size === 2) gesture.current = { distance: spread().distance, zoom }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const was = points.current.get(e.pointerId)
    if (!was) return
    points.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (points.current.size >= 2 && gesture.current) {
      const now = spread()
      const factor = now.distance / gesture.current.distance
      gesture.current = { distance: now.distance, zoom }
      zoomAbout(now.x, now.y, factor)
      return
    }
    if (zoom.scale <= 1) return
    setZoom((z) => bound({ ...z, x: z.x + (e.clientX - was.x), y: z.y + (e.clientY - was.y) }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    points.current.delete(e.pointerId)
    if (points.current.size < 2) gesture.current = null
  }

  const toggle = (e: React.MouseEvent) => {
    setEased(true)
    if (zoom.scale > 1) setZoom(NONE)
    else zoomAbout(e.clientX, e.clientY, 2.5)
  }

  const zoomed = zoom.scale > 1
  const button =
    'rounded border border-white/25 bg-black/50 px-2.5 py-1.5 text-sm leading-none text-white backdrop-blur transition-colors hover:bg-black/75'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50">
      <div ref={backdrop} onClick={close} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-2 p-3 sm:p-5">
        <div
          ref={frame}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={toggle}
          className={`pointer-events-auto relative min-h-0 flex-1 touch-none overflow-hidden ${
            zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          }`}
        >
          <img
            ref={image}
            src={src}
            alt={alt}
            draggable={false}
            style={{
              transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
              transition: eased ? 'transform 160ms ease-out' : undefined,
            }}
            className="absolute inset-0 h-full w-full select-none object-contain will-change-transform"
          />
        </div>

        {caption && (
          <p className="pointer-events-none shrink-0 text-center text-xs text-white/70">{caption}</p>
        )}
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-1.5 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={() => {
            setEased(true)
            zoomAbout(innerWidth / 2, innerHeight / 2, 1 / 1.5)
          }}
          aria-label="Zoom out"
          className={button}
        >
          −
        </button>
        <span className="w-12 text-center text-xs tabular-nums text-white/70">
          {Math.round(zoom.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            setEased(true)
            zoomAbout(innerWidth / 2, innerHeight / 2, 1.5)
          }}
          aria-label="Zoom in"
          className={button}
        >
          +
        </button>
        <button type="button" onClick={close} aria-label="Close" className={`ml-1.5 ${button}`}>
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}
