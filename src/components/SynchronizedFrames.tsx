import { useLayoutEffect, useRef, type HTMLAttributes } from 'react'

/** Prepared frames switch in one paint, with NOAA's short outgoing-image fade. */
export default function SynchronizedFrames({ urls, images, fadeMs = 25, ...props }: HTMLAttributes<HTMLDivElement> & {
  urls: string[] | null
  images: Map<string, HTMLImageElement>
  fadeMs?: number
}) {
  const root = useRef<HTMLDivElement>(null)
  const painted = useRef(false)
  const urlsKey = urls?.join('\n') ?? ''
  useLayoutEffect(() => {
    if (!urlsKey) return
    const ready = urlsKey.split('\n').map((url) => images.get(url))
    const canvases = root.current?.querySelectorAll<HTMLCanvasElement>('canvas:not([data-fade])')
    if (!canvases || canvases.length !== ready.length || ready.some((image) => !image)) return
    const contexts = Array.from(canvases, (canvas) => canvas.getContext('2d'))
    if (contexts.some((context) => !context)) return
    const overlays: HTMLCanvasElement[] = []
    const animations: Animation[] = []
    // No fetching or decoding here: all channels draw from retained images.
    canvases.forEach((canvas, i) => {
      if (painted.current && fadeMs > 0 && canvas.width && canvas.height) {
        const outgoing = document.createElement('canvas')
        outgoing.dataset.fade = ''
        outgoing.className = canvas.className + ' pointer-events-none'
        outgoing.width = canvas.width
        outgoing.height = canvas.height
        outgoing.setAttribute('aria-hidden', 'true')
        outgoing.getContext('2d')?.drawImage(canvas, 0, 0)
        canvas.after(outgoing)
        overlays.push(outgoing)
      }
      const image = ready[i]!
      const width = Math.max(1, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)))
      const targetWidth = Math.min(image.naturalWidth, width)
      const targetHeight = Math.max(1, Math.round(targetWidth * image.naturalHeight / image.naturalWidth))
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }
      contexts[i]!.drawImage(image, 0, 0, canvas.width, canvas.height)
    })
    // Start fades together after every new image has been drawn.
    for (const overlay of overlays) {
      if (overlay.animate) {
        const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: fadeMs, easing: 'ease-in-out', fill: 'forwards',
        })
        animation.onfinish = () => overlay.remove()
        animations.push(animation)
      } else overlay.remove()
    }
    painted.current = true
    return () => {
      animations.forEach((animation) => animation.cancel())
      overlays.forEach((overlay) => overlay.remove())
    }
  }, [urlsKey, images, fadeMs])
  return <div ref={root} {...props} />
}
