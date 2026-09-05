import { useEffect, useState } from 'react'
import { bandSpec, type SatBand, type BandSpec } from '../lib/sources'
import { useStepScroll } from '../lib/useAutoScroll'
import { useDisplayMode } from '../lib/useFullscreen'
import Rail from './Rail'

/**
 * How to read what is on screen, along the bottom.
 *
 * This started as a row of `<details>`, which was wrong twice over: opening one
 * reflowed the page, and a guide you have to ask for is a guide nobody reads. It
 * then became a column beside the figures, which put reference text next to the
 * forecast discussion and made both harder to read.
 *
 * A short strip along the bottom is the version that works: always there, never
 * moving the figures, and a fixed few lines tall so the imagery keeps the rest.
 *
 * It behaves differently depending on who is driving. On a display nobody is,
 * so it reads itself — one channel at a time, sitting still between steps, for
 * as long as that channel's own text takes to read. At a desk somebody is, and
 * text that moves under a reader who did not ask it to is an irritation: the
 * channels become a row you pick from, and the strip holds its height so
 * choosing one moves nothing.
 *
 * The colour scales are deliberately not in here. A scale belongs to the figure
 * it measures and has to stay put; this is reference material and is allowed to
 * scroll away.
 */

/** Roughly what is on screen for this channel, for pacing the dwell. */
const weight = (b: BandSpec) =>
  b.label.length +
  b.descriptor.length +
  (b.about?.length ?? 0) +
  (b.key?.length ?? 0) +
  (b.keyItems?.join('').length ?? 0) +
  (b.keyItemsAlt?.items.join('').length ?? 0)

function Entry({ band }: { band: BandSpec }) {
  return (
    <p className="text-xs leading-relaxed text-muted">
      <span className="font-medium text-ink">{band.label}</span>{' '}
      <span className="text-faint">— {band.descriptor}.</span>{' '}
      {band.key && <span>{band.key} </span>}
      {band.keyItems && (
        <span>Key: {band.keyItems.map((item, i) => `${i + 1}. ${item}`).join('; ')}. </span>
      )}
      {band.keyItemsAlt && (
        <span>
          {band.keyItemsAlt.title}:{' '}
          {band.keyItemsAlt.items.map((item, i) => `${i + 1}. ${item}`).join('; ')}.{' '}
        </span>
      )}
      {band.about}{' '}
      {band.guide && (
        <a className="text-primary hover:underline" href={band.guide} target="_blank" rel="noreferrer">
          NOAA quick guide (PDF) →
        </a>
      )}
    </p>
  )
}

export default function GuideTicker({
  bands,
  className = '',
}: {
  bands: SatBand[]
  className?: string
}) {
  const display = useDisplayMode()
  const seen = new Set<SatBand>()
  const specs = bands
    .filter((b) => !seen.has(b) && seen.add(b))
    .map(bandSpec)
    .filter((b) => b.key || b.keyItems || b.about)

  return display ? (
    <Stepping specs={specs} bands={bands} className={className} />
  ) : (
    <Picked specs={specs} bands={bands} className={className} />
  )
}

/** Unattended: it reads itself, one channel at a time. */
function Stepping({
  specs,
  bands,
  className,
}: {
  specs: BandSpec[]
  bands: SatBand[]
  className: string
}) {
  const scroll = useStepScroll(specs.length, bands.join(','), { lengths: specs.map(weight) })
  if (!specs.length) return null

  return (
    <section
      aria-label="How to read these products"
      className={`flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-4 ${className}`}
    >
      <h2 className="flex shrink-0 items-baseline gap-2 pt-0.5 text-xs font-semibold uppercase leading-tight tracking-widest text-faint sm:block sm:w-28">
        How to read these
        <span className="font-normal normal-case tracking-normal text-faint/70 sm:mt-0.5 sm:block">
          {scroll.paused ? 'held' : `${scroll.index + 1} of ${specs.length}`}
        </span>
      </h2>

      <div
        ref={scroll.ref}
        onMouseEnter={() => scroll.setPaused(true)}
        onMouseLeave={() => scroll.setPaused(false)}
        className="h-16 w-full min-w-0 overflow-y-auto [scrollbar-width:none] sm:flex-1 [&::-webkit-scrollbar]:hidden"
      >
        <div className="space-y-2 pb-8">
          {specs.map((b) => (
            <Entry key={b.id} band={b} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** At a desk: the channels are a row you pick from, and nothing moves on its own. */
function Picked({
  specs,
  bands,
  className,
}: {
  specs: BandSpec[]
  bands: SatBand[]
  className: string
}) {
  const [chosen, setChosen] = useState<SatBand | null>(null)
  const key = bands.join(',')
  // A channel that is no longer on screen should not still be the one explained.
  useEffect(() => setChosen(null), [key])

  if (!specs.length) return null
  const band = specs.find((b) => b.id === chosen) ?? specs[0]

  return (
    <section
      aria-label="How to read these products"
      className={`flex shrink-0 flex-col gap-1 ${className}`}
    >
      <div className="flex min-w-0 items-baseline gap-x-4">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-widest text-faint">
          How to read these
        </h2>
        {specs.length > 1 && (
          <Rail row="flex items-baseline gap-x-4">
            {specs.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setChosen(b.id)}
                aria-pressed={b.id === band.id}
                title={b.descriptor}
                className={`shrink-0 text-xs transition-colors ${
                  b.id === band.id ? 'font-medium text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {b.short}
              </button>
            ))}
          </Rail>
        )}
      </div>

      {/* Fixed height: choosing a channel swaps the words and moves nothing. */}
      <div className="h-16 w-full min-w-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Entry band={band} />
      </div>
    </section>
  )
}
