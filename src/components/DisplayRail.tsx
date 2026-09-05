import { useQuery } from '@tanstack/react-query'
import { nws } from '../lib/nws'
import { PRIMARY_STATION, STATIONS_BY_ID } from '../lib/stations'
import {
  compass,
  fmt,
  hstDateTime,
  readPressureMb,
  readSpeed,
  readTemp,
  relativeAge,
} from '../lib/units'
import { useAlerts } from './AlertsDrawer'
import { useAutoScroll } from '../lib/useAutoScroll'

/**
 * Undo the teletype wrap.
 *
 * NWS products are hard-wrapped at about 69 columns for a printer. In a reading
 * column half that width every one of those lines wraps again, so a paragraph
 * comes out double-spaced and ragged — "…Saturday and Sunday as a low" / "pressure
 * trough moving into…" — and a synopsis that is five sentences long fills the
 * panel. Joining the wrapped lines back into paragraphs halves the height and
 * reads as prose. Blank lines still separate paragraphs, and indented or bulleted
 * lines are left alone: those breaks are the forecaster's, not the printer's.
 */
function reflow(text: string): string {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const prev = out[out.length - 1]
    const wrapped =
      prev !== undefined &&
      prev.length > 45 && // the previous line ran to the wrap column
      line.trim().length > 0 &&
      !/^\s/.test(raw) && // indentation means a list or a table
      !/^[-*•\d]/.test(line.trim()) // bullets and numbered items stand alone
    if (wrapped) out[out.length - 1] = `${prev} ${line.trim()}`
    else out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The forecast discussion, split into its named sections.
 *
 * NWS text products arrive with a WMO routing header, a station block and then
 * `.SYNOPSIS...`-style section markers separated by `&&`. Rendered raw it is a
 * wall of teletype; the headings are what make it skimmable from across a room,
 * and they are already in the text — they just have to be recognised.
 */
function parseAfd(text: string): { heading: string; body: string }[] {
  // Drop everything up to the issuance line: routing codes and the office
  // banner are addressed to a teleprinter, not a reader.
  const start = text.search(/^\.[A-Z][A-Z /-]*\.\.\./m)
  const body = start >= 0 ? text.slice(start) : text

  const sections: { heading: string; body: string }[] = []
  const re = /^\.([A-Z][A-Z0-9 /&'-]*?)\.\.\.\s*/gm
  let match = re.exec(body)
  while (match) {
    const next = re.exec(body)
    const chunk = body.slice(match.index + match[0].length, next ? next.index : undefined)
    sections.push({
      heading: match[1].trim(),
      // `&&` is a section terminator, and `$$` ends the product.
      body: reflow(chunk.replace(/^\s*&&\s*$/gm, '').replace(/\$\$[\s\S]*$/, '')),
    })
    match = next
  }

  return sections.length ? sections : [{ heading: 'Discussion', body: body.trim() }]
}

function Conditions() {
  const station = STATIONS_BY_ID.get(PRIMARY_STATION)!
  const { data } = useQuery({
    queryKey: ['obs', PRIMARY_STATION],
    queryFn: () => nws.latestUsableObservation(PRIMARY_STATION),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })

  if (!data) return null

  const rows: [string, string][] = [
    ['Dew pt', `${fmt(readTemp(data.dewpoint, 'F'))}°`],
    ['RH', `${fmt(data.relativeHumidity?.value)}%`],
    [
      'Wind',
      `${
        data.windDirection?.value !== null && data.windDirection?.value !== undefined
          ? `${compass(data.windDirection.value)} `
          : ''
      }${fmt(readSpeed(data.windSpeed, 'mph'))} mph`,
    ],
    ['Pressure', `${fmt(readPressureMb(data.seaLevelPressure ?? data.barometricPressure), 1)} mb`],
  ]

  return (
    <section className="border-b border-line pb-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-medium text-ink">{station.name}</h2>
        <span className="text-sm text-faint" title={`${hstDateTime(data.timestamp)} HST`}>
          {relativeAge(data.timestamp)}
        </span>
      </div>

      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums tracking-tight text-ink">
          {fmt(readTemp(data.temperature, 'F'))}°
        </span>
        <span className="min-w-0 truncate text-base text-muted">{data.textDescription ?? '—'}</span>
      </p>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="text-xs font-semibold uppercase tracking-widest text-faint">{k}</dt>
            <dd className="text-base font-medium tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Alerts() {
  const { data } = useAlerts()
  const alerts = data ?? []
  if (!alerts.length) return null

  return (
    <section className="border-b border-line pb-3">
      <ul className="space-y-1">
        {alerts.slice(0, 3).map((a) => (
          <li key={a.id} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                a.severity === 'Extreme' || a.severity === 'Severe' ? 'bg-danger' : 'bg-warn'
              }`}
            />
            <span className="min-w-0">
              <span className="block text-base font-medium text-ink">{a.event}</span>
              <span className="block truncate text-sm text-muted">{a.areaDesc}</span>
            </span>
          </li>
        ))}
        {alerts.length > 3 && (
          <li className="text-sm text-faint">+{alerts.length - 3} more in effect</li>
        )}
      </ul>
    </section>
  )
}

function NextPeriods() {
  const { data } = useQuery({
    queryKey: ['forecast', 'HFO', 154, 145],
    queryFn: () => nws.forecast('HFO', 154, 145),
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchIntervalInBackground: true,
  })
  if (!data) return null

  return (
    <section className="border-b border-line pb-3">
      <ul className="space-y-1.5">
        {data.periods.slice(0, 2).map((p) => (
          <li key={p.number} className="flex items-baseline gap-2">
            <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-faint">
              {p.name}
            </span>
            <span className="min-w-0 text-sm text-muted">
              <span className="font-medium text-ink">
                {p.temperature}°{p.temperatureUnit}
              </span>{' '}
              {p.shortForecast}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The rail beside the imagery in display mode.
 *
 * In fullscreen the navigation is gone and the figures have the room they need,
 * which leaves a column spare on a wide screen. This fills it with the reading
 * that goes with the pictures: what it is doing now, what is in effect, and the
 * forecaster's own reasoning — so someone stopping in the hallway can look at
 * the sky and then read what it means, without touching anything.
 */
export default function DisplayRail({
  onExit,
  bare = false,
  onToggleBare,
}: {
  onExit?: () => void
  /** Controls hidden, imagery only. */
  bare?: boolean
  onToggleBare?: () => void
}) {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['product', 'AFD', 'HFO'],
    queryFn: () => nws.latestProduct('AFD', 'HFO'),
    staleTime: 20 * 60_000,
    refetchInterval: 20 * 60_000,
    refetchIntervalInBackground: true,
  })

  const sections = data?.productText ? parseAfd(data.productText) : []

  // The synopsis is the paragraph the rest of the discussion is a gloss on: what
  // the pattern is doing over the next few days. Someone who glances at the
  // screen for five seconds should get that one, so it is pinned and the rest
  // moves past it. Falls back to the first section on the rare product that has
  // no synopsis heading.
  const pinned =
    sections.find((s) => s.heading.includes('SYNOPSIS')) ?? sections[0] ?? null
  const rest = sections.filter((s) => s !== pinned)

  const scroll = useAutoScroll(rest.length > 0, data?.id ?? dataUpdatedAt)

  return (
    <aside
      aria-label="Current conditions and forecast discussion"
      className="hidden w-80 shrink-0 flex-col gap-3 border-l border-line py-2 pl-4 pr-2 xl:flex xl:w-96"
    >
      {/* The way out lives here rather than floating over the imagery, where it
          landed on the transport controls. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-faint">
          Display mode
        </span>
        <span className="flex items-center gap-1">
          {onToggleBare && (
            <button
              type="button"
              onClick={onToggleBare}
              aria-pressed={bare}
              aria-label={bare ? 'Show controls' : 'Hide controls'}
              title={bare ? 'Show controls' : 'Hide controls — imagery only'}
              className={`rounded border px-2 py-1 text-xs leading-none transition-colors hover:bg-surface-hover hover:text-ink ${
                bare ? 'border-primary/50 text-primary' : 'border-line text-muted'
              }`}
            >
              {bare ? 'Controls off' : 'Controls'}
            </button>
          )}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit display mode (F)"
              title="Exit display mode (F)"
              className="rounded border border-line px-2 py-1 text-sm leading-none text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">⤡</span>
            </button>
          )}
        </span>
      </div>

      <Conditions />
      <Alerts />
      <NextPeriods />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2 pb-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
            Forecast discussion
          </h2>
          {data?.issuanceTime && (
            <span className="text-xs text-faint">{hstDateTime(data.issuanceTime)} HST</span>
          )}
        </div>

        {/* Pinned, and sized to its own content: "always visible" means the whole
            paragraph, not the top of it. The scrolling half takes what is left.
            The cap is a backstop against a freak product eating the rail, set
            well above any real synopsis rather than at a height that trims one. */}
        {pinned && (
          <section className="max-h-[65%] shrink-0 overflow-y-auto border-b border-line pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
              {pinned.heading}
            </h3>
            {/* Bold, so the paragraph everything else is a gloss on is the one
                the eye lands on from across the room. */}
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-ink">
              {pinned.body}
            </p>
          </section>
        )}

        <div
          ref={scroll.ref}
          onMouseEnter={() => scroll.setPaused(true)}
          onMouseLeave={() => scroll.setPaused(false)}
          className="min-h-0 flex-1 overflow-y-auto pr-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {rest.length ? (
            <div className="space-y-3 pb-16">
              {rest.map((s, i) => (
                <section key={`${s.heading}-${i}`}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {s.heading}
                  </h3>
                  {/* Preserve the product's own line breaks: forecasters use
                      them, and reflowing turns lists into paragraphs. */}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-faint">
              {sections.length ? 'No further sections in this product.' : 'Loading the forecast discussion…'}
            </p>
          )}
        </div>

        <p className="pt-1.5 text-xs text-faint">
          NWS Honolulu · {scroll.paused ? 'paused' : 'scrolling'}
        </p>
      </div>
    </aside>
  )
}
