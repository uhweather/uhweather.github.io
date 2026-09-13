import { useEffect, useRef, type HTMLAttributes } from 'react'

/** Keep the last complete scan visible until every channel can be drawn together. */
export default function SynchronizedFrames({ urls, onBuffering, ...props }: HTMLAttributes<HTMLDivElement> & {
  urls: string[] | null
  onBuffering: (value: boolean) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!urls?.length) return
    let cancelled = false
    const images = new Set<HTMLImageElement>()
    const timers = new Set<number>()
    onBuffering(true)
    const load = (url: string, attempt = 0): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
      const image = new Image()
      images.add(image)
      let settled = false
      const finish = (ok: boolean) => {
        if (settled || cancelled) return
        settled = true
        window.clearTimeout(timer)
        timers.delete(timer)
        image.onload = image.onerror = null
        if (ok) resolve(image)
        else if (attempt < 2) {
          images.delete(image)
          image.removeAttribute('src')
          load(url, attempt + 1).then(resolve, reject)
        } else reject(new Error('Frame unavailable'))
      }
      const timer = window.setTimeout(() => finish(false), 20_000)
      timers.add(timer)
      image.onerror = () => finish(false)
      image.onload = () => {
        if (image.decode) image.decode().then(() => finish(true), () => finish(false))
        else finish(true)
      }
      image.src = url
    })
    // Only this visible scan is decoded; channels load concurrently.
    void (async () => {
      try {
        const ready = await Promise.all(urls.map((url) => load(url)))
        if (cancelled) return
        const canvases = root.current?.querySelectorAll('canvas')
        if (!canvases || canvases.length !== ready.length) return
        const contexts = Array.from(canvases, (canvas) => canvas.getContext('2d'))
        if (contexts.some((context) => !context)) return
        // All draws happen in one task, before the browser paints any panel.
        canvases.forEach((canvas, i) => {
          const image = ready[i]
          const width = Math.max(1, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)))
          canvas.width = Math.min(image.naturalWidth, width)
          canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth)
          contexts[i]!.drawImage(image, 0, 0, canvas.width, canvas.height)
        })
      } catch {
        // Keep the previous complete scan; playback will try the next scan.
      } finally {
        images.forEach((image) => { image.onload = image.onerror = null; image.removeAttribute('src') })
        if (!cancelled) onBuffering(false)
      }
    })()
    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      images.forEach((image) => { image.onload = image.onerror = null; image.removeAttribute('src') })
      onBuffering(false)
    }
  }, [urls, onBuffering])
  return <div ref={root} {...props} />
}
