import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
import { bandSpec, satellitePanelUrl, SAT_SECTORS, sectorSpec } from '../lib/sources'
import { useNow } from '../lib/useFrameLoop'
import { useSharedPanels, useSharedSector } from '../lib/viewState'
import { SegmentedControl } from '../components/ui'
import ColorBar from '../components/ColorBar'
import GuideTicker from '../components/GuideTicker'
import PanelChannel from '../components/PanelChannel'
import { ErrorState, Skeleton } from '../components/ui'

/**
 * Conditions as a single line rather than a bank of tiles.
 *
 * The legacy homepage gave the current observation one sentence and spent the
 * rest of the page on imagery, which was the right call — the figures are what
 * people come to read. Six large metric cards pushed every figure below the fold.
 */
function ConditionsStrip({ className = '' }: { className?: string }) {
  const station = STATIONS_BY_ID.get(PRIMARY_STATION)!
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['obs', PRIMARY_STATION],
    queryFn: () => nws.latestUsableObservation(PRIMARY_STATION),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })

  if (isLoading) return <Skeleton className={`h-12 w-full ${className}`} />
  if (isError) {
    return (
      <div className={className}>
        <ErrorState source="api.weather.gov" message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!data) return null

  const items: [string, string][] = [
    ['Temp', `${fmt(readTemp(data.temperature, 'F'))}°F`],
    ['Dew pt', `${fmt(readTemp(data.dewpoint, 'F'))}°F`],
    ['RH', `${fmt(data.relativeHumidity?.value)}%`],
    [
      'Wind',
      `${
        data.windDirection?.value !== null && data.windDirection?.value !== undefined
          ? `${compass(data.windDirection.value)} `
          : ''
      }${fmt(readSpeed(data.windSpeed, 'mph'))} mph`,
    ],
    ['Gust', `${fmt(readSpeed(data.windGust, 'mph'))} mph`],
    ['Pressure', `${fmt(readPressureMb(data.seaLevelPressure ?? data.barometricPressure), 1)} mb`],
  ]

  return (
    <div className={`flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-line pb-4 ${className}`}>
      <p className="flex items-baseline gap-2">
        <Link to="/observations" viewTransition className="text-sm font-medium text-ink hover:text-primary">
          {station.name}
        </Link>
        <span className="text-sm text-muted">{data.textDescription ?? '—'}</span>
      </p>
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-1.5">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-faint">{k}</dt>
            <dd className="text-sm font-medium tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p
        className="ml-auto text-xs text-faint"
        title={`${hstDateTime(data.timestamp)} HST`}
      >
        {relativeAge(data.timestamp)}
      </p>
    </div>
  )
}

function ForecastStrip({ className = '' }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ['forecast', 'HFO', 154, 145],
    queryFn: () => nws.forecast('HFO', 154, 145),
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchIntervalInBackground: true,
  })
  if (!data) return null
  return (
    <section className={`border-t border-line pt-4 ${className}`}>
      <h2 className="mb-2 flex items-baseline gap-3 text-sm font-medium text-ink">
        Forecast — Honolulu
        <Link to="/forecast" viewTransition className="text-xs font-normal text-primary hover:underline">
          Full forecast →
        </Link>
      </h2>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
        {data.periods.slice(0, 4).map((p) => (
          <li key={p.number} className="flex items-center gap-2.5">
            <img src={p.icon} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {p.name} · {p.temperature}°{p.temperatureUnit}
              </span>
              <span className="block truncate text-xs text-muted">{p.shortForecast}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Imagery first, as the legacy homepage had it: four channels of one area, side
 * by side, refreshing themselves.
 *
 * These are latest stills, not loops. The overview answers "what is the sky
 * doing right now" — the question of where it is going is what the satellite
 * page is for, and it has the transport controls to ask it properly. Four
 * animations here cost tens of megabytes an hour and bought a version of that
 * page with none of its controls.
 *
 * Each panel picks its own channel, and the set is shared with the viewer's 2×2,
 * so a comparison built in one place is there in the other. On a wide screen the
 * whole overview fits the window with nothing to scroll, which is what makes it
 * usable as an unattended display: the 2×2 block stays fixed and the height each
 * figure takes adapts, so a square sector and a wide one both fill the window
 * without the page growing. Below `lg` it simply scrolls, as a phone should.
 */
export default function Home() {
  const [sector, setSector] = useSharedSector()
  const [panels, setPanel] = useSharedPanels()
  const spec = sectorSpec(sector)

  // STAR overwrites the "latest" file in place, so the URL never changes and the
  // browser would happily show yesterday's frame forever. Ticking a token at the
  // imagery cadence is what makes an unattended display current — no reload, no
  // refresh button, and it keeps running in a background tab.
  const generation = useNow(spec.cadenceMinutes)

  return (
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <ConditionsStrip className="not-in-display" />

      <div className="bare-hide flex flex-wrap items-center gap-x-6 gap-y-2">
        <SegmentedControl
          label="Satellite view"
          name="View"
          value={sector}
          onChange={setSector}
          options={SAT_SECTORS.map((s) => ({ id: s.id, label: s.short, title: s.blurb }))}
        />
        <p className="text-xs text-muted">{spec.blurb}</p>
        <p className="ml-auto text-xs text-faint">
          Latest scan · updates every {spec.cadenceMinutes} min
        </p>
      </div>

      {/* The grid is pinned to the imagery's own aspect ratio and its width
          follows its height, which is what closes the gaps: four panels of one
          shape make a block of that same shape, so nothing is left over as
          letterboxing between them. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-center lg:min-h-0">
          <div
            className="grid w-full grid-cols-2 grid-rows-2 gap-1 lg:h-full lg:w-auto lg:max-w-full"
            style={{ aspectRatio: String(spec.aspect) }}
          >
            {panels.map((b, i) => (
              <div
                key={`${b}-${i}`}
                className="relative min-h-0 overflow-hidden rounded-sm border border-line bg-black"
              >
                <img
                  src={`${satellitePanelUrl(sector, b)}?_=${generation}`}
                  alt={`Latest ${bandSpec(b).label} imagery of the ${spec.label} sector`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <PanelChannel value={b} onChange={(next) => setPanel(i, next)} />
              </div>
            ))}
          </div>
        </div>

        <ColorBar bands={panels} />
      </div>

      <GuideTicker bands={panels} className="border-t border-line pt-2.5" />

      <ForecastStrip className="not-in-display" />
    </div>
  )
}
