import { Fragment, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  SAT_BANDS,
  SAT_SECTORS,
  satelliteThumbUrl,
  type SatBand,
  type SatSector,
} from '../lib/sources'

/**
 * Channel × view matrix of live thumbnails, as an overlay panel.
 *
 * This is what the legacy satellite index did better than a pair of dropdowns:
 * every combination visible at once, each one click away, with current imagery
 * previewed so you can see which channel is worth opening.
 *
 * Rendered through a portal to <body>. The routed page sits inside an element
 * carrying the page-enter animation, and an animated transform establishes a
 * stacking context — so a z-50 overlay nested in it still paints beneath the
 * z-30 masthead. Escaping to the body puts it back in the root context.
 *
 * Exactly one thing scrolls. The backdrop is fixed and does not scroll, the page
 * behind is locked while the panel is open, and the grid is the single scroll
 * container — the earlier version nested a scrolling panel inside the scrolling
 * page, which left two scrollbars and no way to tell which one the wheel moved.
 */
export default function SatelliteMatrix({
  open,
  sector,
  band,
  onPick,
  onClose,
}: {
  open: boolean
  sector: SatSector
  band: SatBand
  onPick: (sector: SatSector, band: SatBand) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Lock the page so the wheel can only reach the grid.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Browse satellite imagery"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-float"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Browse imagery</h2>
            <p className="text-xs text-muted">
              Every channel and view, live. Click any panel to open it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </header>

        {/* The one scroll container. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div
            className="grid items-start gap-x-4 gap-y-5"
            style={{ gridTemplateColumns: `8rem repeat(${SAT_SECTORS.length}, minmax(0, 1fr))` }}
          >
            <div aria-hidden="true" />
            {SAT_SECTORS.map((s) => (
              <p
                key={s.id}
                className="sticky top-0 z-10 bg-surface pb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-faint"
              >
                {s.short}
              </p>
            ))}

            {/* Twenty-two rows want a landmark: the composites are finished
                products, the bands below them are the raw channels. */}
            {SAT_BANDS.map((b, i) => (
              <Fragment key={b.id}>
                {(i === 0 || b.group !== SAT_BANDS[i - 1].group) && (
                  <p
                    style={{ gridColumn: `1 / span ${SAT_SECTORS.length + 1}` }}
                    className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-widest text-faint"
                  >
                    {b.group === 'composite' ? 'Composites' : 'ABI bands'}
                  </p>
                )}
                <Row band={b} sector={sector} activeBand={band} onPick={onPick} />
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({
  band,
  sector,
  activeBand,
  onPick,
}: {
  band: (typeof SAT_BANDS)[number]
  sector: SatSector
  activeBand: SatBand
  onPick: (s: SatSector, b: SatBand) => void
}) {
  return (
    <>
      <div className="flex flex-col justify-center pr-1">
        <p className="text-sm font-medium leading-tight text-ink">{band.short}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">{band.blurb}</p>
      </div>
      {SAT_SECTORS.map((s) => {
        const active = s.id === sector && band.id === activeBand
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id, band.id)}
            aria-current={active}
            title={`${band.label} — ${s.label}`}
            className={`overflow-hidden rounded border transition-all ${
              active
                ? 'border-primary ring-2 ring-primary'
                : 'border-line hover:border-primary'
            }`}
          >
            <div
              className="relative w-full overflow-hidden bg-black"
              style={{ aspectRatio: String(s.aspect) }}
            >
              <img
                src={satelliteThumbUrl(s.id, band.id)}
                alt={`${band.label} thumbnail, ${s.label}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </button>
        )
      })}
    </>
  )
}
