import { UiIcons } from './UiIcons'
import { useQuery } from '@tanstack/react-query'
import { nws } from '../lib/nws'
import { PRIMARY_STATION, STATIONS_BY_ID } from '../lib/stations'
import {
  compass,
  fmt,
  hstDateTime,
  hstTime,
  readPressureMb,
  readSpeed,
  readTemp,
  relativeAge,
} from '../lib/units'
import { useAlerts } from './AlertsDrawer'
import { useAutoScroll, useStepScroll } from '../lib/useAutoScroll'
import { parseAfd, synopsis } from '../lib/product'

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

      {/* The temperature is the headline and the rest sits beside it rather than
          under it: stacked, the readings pushed the advisories and the
          discussion down the rail while a hand's width of the panel next to a
          two-digit number stayed empty. */}
      <div className="mt-1 flex items-center gap-4">
        <span className="shrink-0 text-5xl font-semibold leading-none tabular-nums tracking-tight text-ink">
          {fmt(readTemp(data.temperature, 'F'))}°
        </span>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase leading-tight tracking-widest text-faint">
                {k}
              </dt>
              <dd className="truncate text-sm font-medium tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {data.textDescription && (
        <p className="mt-1.5 truncate text-sm text-muted">{data.textDescription}</p>
      )}
    </section>
  )
}

function Alerts({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading, isError } = useAlerts()
  const severity = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']
  const alerts = [...(data ?? [])].sort((a, b) => severity.indexOf(a.severity) - severity.indexOf(b.severity))
  const pairs = Array.from({ length: Math.ceil(alerts.length / 2) }, (_, i) => alerts.slice(i * 2, i * 2 + 2))
  const scroll = useStepScroll(pairs.length, JSON.stringify(alerts))

  return (
    <section aria-label="Active weather alerts" className="shrink-0 border-b border-line pb-2">
      <button type="button" onClick={onOpen} className="mb-1 flex w-full items-baseline justify-between text-xs text-primary hover:underline">
        <span className="font-semibold uppercase tracking-wide">
          {alerts.length ? `${alerts.length} active alerts` : isLoading ? 'Checking alerts…' : isError ? 'Alerts unavailable' : 'No active alerts'}
        </span>
        {alerts.length > 0 && <span>View all →</span>}
      </button>
      {alerts.length > 0 && (
        <div
          ref={scroll.ref}
          tabIndex={0}
          aria-label="Scrolling active alerts"
          onMouseEnter={() => scroll.setPaused(true)}
          onMouseLeave={() => scroll.setPaused(false)}
          onFocus={() => scroll.setPaused(true)}
          onBlur={() => scroll.setPaused(false)}
          className="h-[6.5rem] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div>
            {pairs.map((pair) => (
              <ul key={pair[0].id} className="grid h-[6.5rem] grid-rows-2 gap-1 pb-1">
                {pair.map((a) => (
                  <li key={a.id} className="min-h-0 min-w-0">
                    <button
                      type="button"
                      onClick={onOpen}
                      title={`${a.event} — ${a.areaDesc}`}
                      className={`flex h-full w-full min-w-0 flex-col justify-center rounded border px-2 text-left transition-colors hover:bg-surface-hover ${
                        a.severity === 'Extreme' || a.severity === 'Severe'
                          ? 'border-danger/40 bg-danger-soft' : 'border-line bg-surface'
                      }`}
                    >
                      <span className="flex w-full min-w-0 items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${a.severity === 'Extreme' || a.severity === 'Severe' ? 'text-danger' : 'text-ink'}`}>
                          {a.event}
                        </span>
                        <time
                          dateTime={a.ends || a.expires}
                          title={`${a.ends ? 'Until' : 'Expires'} ${hstDateTime(a.ends || a.expires)} HST`}
                          className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted"
                        >
                          {a.ends ? 'Until' : 'Exp.'} {hstTime(a.ends || a.expires).replace(':00', '')} HST
                        </time>
                      </span>
                      <span className="block w-full truncate text-xs text-muted">{a.areaDesc}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}
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
    <section aria-label="Honolulu forecast" className="shrink-0 border-b border-line pb-2">
      <ul className="space-y-1">
        {data.periods.slice(0, 2).map((p) => (
          <li key={p.number} className="grid grid-cols-[5.5rem_auto_minmax(0,1fr)] items-baseline gap-x-2 text-xs leading-tight"
            title={`${p.name}: ${p.temperature}°${p.temperatureUnit} · ${p.shortForecast}`}>
            <span className="truncate font-medium text-faint">
              {p.name.replace(/^This /, '')}
            </span>
            <span className="font-medium tabular-nums text-ink">
              {p.temperature}°{p.temperatureUnit}
            </span>
            <span className="truncate text-muted">{p.shortForecast}</span>
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
export default function DisplayRail({ onOpenAlerts, bare, onToggleBare, onExit }: {
  onOpenAlerts: () => void
  bare: boolean
  onToggleBare: () => void
  onExit: () => void
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
  const pinned = synopsis(sections)
  const rest = sections.filter((s) => s !== pinned)

  const scroll = useAutoScroll(rest.length > 0, data?.id ?? dataUpdatedAt)

  return (
    <aside
      aria-label="Current conditions and forecast discussion"
      className="display-reading-rail min-h-0 shrink-0 flex flex-col gap-2 border-l border-line py-2 px-3"
    >
      <div className="display-toolbar flex shrink-0 items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-faint">Display mode</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleBare}
            aria-pressed={bare} aria-label={bare ? 'Show controls' : 'Hide controls'}
            className="px-2 text-sm text-primary">
            {bare ? 'Controls off' : 'Controls'}
          </button>
          <button type="button" onClick={onExit} aria-label="Exit display mode"
            className="flex items-center justify-center px-2 text-sm text-ink">
            <UiIcons.collapse size={18} />
          </button>
        </div>
      </div>

      <Conditions />
      <Alerts onOpen={onOpenAlerts} />
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

        {/* The complete synopsis stays fixed; only the discussion below moves. */}
        {pinned && (
          <section aria-label="Forecast synopsis" className="shrink-0 border-b border-line pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
              {pinned.heading}
            </h3>
            {/* Bold, so the paragraph everything else is a gloss on is the one
                the eye lands on from across the room. */}
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-snug text-ink">
              {pinned.body}
            </p>
          </section>
        )}

        <div
          ref={scroll.ref}
          tabIndex={0}
          aria-label="Scrolling forecast discussion"
          onFocus={() => scroll.setPaused(true)}
          onBlur={() => scroll.setPaused(false)}
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
