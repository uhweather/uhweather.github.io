import { bandSpec, type SatBand } from '../lib/sources'

/**
 * The scale for what is on screen, sitting under it.
 *
 * Always present, and separate from the prose that explains how to read it: the
 * scale is part of the figure — an image of a temperature field without its
 * scale is not a measurement — while the prose is reference material and belongs
 * somewhere it can be ignored.
 *
 * NESDIS's own strips are used rather than gradients drawn here. A colour scale
 * is a quantitative claim, and one redrawn from guesswork would put wrong numbers
 * on a temperature field. Several channels share a strip, so each bar is
 * captioned with the channels it applies to — with four panels on screen an
 * unlabelled gradient is worse than none, and the water-vapour bar and the
 * infrared bar look alike enough that guessing wrong is easy.
 */
export default function ColorBar({
  bands,
  className = '',
}: {
  bands: SatBand[]
  className?: string
}) {
  const groups: { colorbar: string; scale?: string; labels: string[] }[] = []
  for (const b of bands.map(bandSpec)) {
    if (!b.colorbar) continue
    const existing = groups.find((g) => g.colorbar === b.colorbar)
    if (existing) {
      if (!existing.labels.includes(b.short)) existing.labels.push(b.short)
    } else {
      groups.push({ colorbar: b.colorbar, scale: b.scale, labels: [b.short] })
    }
  }

  // Channels with nothing to label — true colour, plain reflectance — say so,
  // rather than leaving a gap the reader has to interpret.
  const unscaled = bands
    .map(bandSpec)
    .filter((b) => !b.colorbar)
    .map((b) => b.short)
    .filter((v, i, a) => a.indexOf(v) === i)

  if (!groups.length && !unscaled.length) return null

  return (
    <div
      /* `shrink-0` holds the strip's height where this sits in a column; the
         width caps are what keep two scales from running off a phone screen
         instead of wrapping onto their own lines. */
      className={`flex max-w-full shrink-0 flex-wrap items-start justify-center gap-x-8 gap-y-2 ${className}`}
    >
      {groups.map((g) => (
        <figure key={g.colorbar} className="flex min-w-0 max-w-full flex-col items-center gap-1">
          <img
            src={g.colorbar}
            alt={`Colour scale for ${g.labels.join(', ')}: ${g.scale ?? 'see NESDIS'}`}
            className="h-7 w-auto max-w-full object-contain"
          />
          <figcaption className="text-center text-xs leading-tight text-faint">
            <span className="font-medium text-muted">{g.labels.join(' · ')}</span>
            {g.scale && <span> — {g.scale}</span>}
          </figcaption>
        </figure>
      ))}

      {unscaled.length > 0 && (
        <p className="self-center text-xs leading-tight text-faint">
          <span className="font-medium text-muted">{unscaled.join(' · ')}</span> — no scale; colour
          is the scene itself
        </p>
      )}
    </div>
  )
}
