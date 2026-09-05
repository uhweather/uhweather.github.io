import { useEffect, useState } from 'react'
import { Skeleton } from './ui'

/**
 * An imagery tile that refreshes itself.
 *
 * The legacy site used `<META HTTP-EQUIV=Refresh CONTENT=300>` to reload the
 * whole page — losing scroll position and any control the reader had set. Here
 * only the image re-requests, on a cadence matched to the product.
 */
export default function RemoteImage({
  src,
  alt,
  refreshMinutes = 10,
  className = '',
  aspect = 'aspect-square',
  fit = 'cover',
}: {
  src: string
  alt: string
  refreshMinutes?: number
  className?: string
  aspect?: string
  fit?: 'cover' | 'contain'
}) {
  const [bust, setBust] = useState(() => Date.now())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // Reset when the caller switches product.
  useEffect(() => {
    setStatus('loading')
    setBust(Date.now())
  }, [src])

  useEffect(() => {
    if (refreshMinutes <= 0) return
    const id = setInterval(() => setBust(Date.now()), refreshMinutes * 60_000)
    return () => clearInterval(id)
  }, [refreshMinutes])

  const url = `${src}${src.includes('?') ? '&' : '?'}_=${bust}`

  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface-2 ${aspect} ${className}`}>
      {status === 'loading' && <Skeleton className="absolute inset-0 rounded-lg" />}
      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
          <span>
            Imagery unavailable from NOAA right now.
            <br />
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => {
                setStatus('loading')
                setBust(Date.now())
              }}
            >
              Retry
            </button>
          </span>
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${
 status === 'ready' ? 'opacity-100' : 'opacity-0'
 }`}
        />
      )}
    </div>
  )
}
