import { bandSpec, type SatBand } from '../lib/sources'
import { useStepScroll } from '../lib/useAutoScroll'

/**
 * How to read what is on screen, along the bottom.
 *
 * This started as a row of `<details>`, which was wrong twice over: opening one
 * reflowed the page, and a guide you have to ask for is a guide nobody reads. It
 * then became a column beside the figures, which put reference text next to the
 * forecast discussion and made both harder to read.
 *
 * A short strip along the bottom is the version that works: always there, never
 * moving the figures, and reading itself so a passer-by gets it without touching
 * anything. It is a fixed few lines tall — the imagery keeps the rest — and
 * hovering holds it still for someone who wants to finish a sentence.
 *
 * It steps one channel at a time and then sits still rather than creeping. On a
 * wide screen a definition is a couple of long lines, and text that never stops
 * moving is text nobody finishes; the dwell scales with how much there is to
 * read.
 *
 * The colour scales are deliberately not in here. A scale belongs to the figure
 * it measures and has to stay put; this is reference material and is allowed to
 * scroll away.
 */
export default function GuideTicker({
  bands,
  className = '',
}: {
  bands: SatBand[]
  className?: string
}) {
  const seen = new Set<SatBand>()
  const specs = bands
    .filter((b) => !seen.has(b) && seen.add(b))
    .map(bandSpec)
    .filter((b) => b.key || b.keyItems || b.about)

  const lengths = specs.map(
    (b) =>
      (b.about?.length ?? 0) +
      (b.key?.length ?? 0) +
      (b.keyItems?.join('').length ?? 0) +
      (b.keyItemsAlt?.items.join('').length ?? 0),
  )
  const scroll = useStepScroll(specs.length, bands.join(','), { lengths })

  if (!specs.length) return null

  return (
    <section
      aria-label="How to read these products"
      className={`flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-4 ${className}`}
    >
      {/* A narrow screen has no width to give a label column, so the heading
          takes a line of its own with the counter beside it. */}
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
        /* `flex-1` only once the section is a row: in the stacked layout it
           would read as "grow" and the strip would eat the page. */
        className="h-16 w-full min-w-0 overflow-y-auto [scrollbar-width:none] sm:flex-1 [&::-webkit-scrollbar]:hidden"
      >
        <div className="space-y-2 pb-8">
          {specs.map((b) => (
            <p key={b.id} className="text-xs leading-relaxed text-muted">
              <span className="font-medium text-ink">{b.label}</span>{' '}
              <span className="text-faint">— {b.descriptor}.</span>{' '}
              {b.key && <span>{b.key} </span>}
              {b.keyItems && (
                <span>
                  Key: {b.keyItems.map((item, i) => `${i + 1}. ${item}`).join('; ')}.{' '}
                </span>
              )}
              {b.keyItemsAlt && (
                <span>
                  {b.keyItemsAlt.title}:{' '}
                  {b.keyItemsAlt.items.map((item, i) => `${i + 1}. ${item}`).join('; ')}.{' '}
                </span>
              )}
              {b.about}{' '}
              {b.guide && (
                <a
                  className="text-primary hover:underline"
                  href={b.guide}
                  target="_blank"
                  rel="noreferrer"
                >
                  NOAA quick guide (PDF) →
                </a>
              )}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
