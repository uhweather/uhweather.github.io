import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { nws, type ForecastPeriod } from '../lib/nws'
import { FORECAST_LOCATIONS } from '../lib/stations'
import { hstDateTime, relativeAge } from '../lib/units'
import { parseAfd } from '../lib/product'
import { ErrorState, SegmentedControl, Skeleton } from '../components/ui'
import HourlyChart from '../components/HourlyChart'
import Rail from '../components/Rail'

/**
 * Text products issued by NWS Honolulu.
 *
 * This mirrors the legacy site's "Menu of Text Products" dropdown, but the list
 * is the office's real catalogue rather than a hard-coded set of links that rot.
 * Codes verified against /products/locations/HFO/types.
 */
const HFO_PRODUCTS = [
  { code: 'AFD', label: 'Discussion', blurb: "The forecaster's own reasoning behind the forecast." },
  { code: 'SRF', label: 'Surf', blurb: 'Surf heights by shore, and High Surf Advisories.' },
  { code: 'ZFP', label: 'Zones', blurb: 'Plain-language forecast for each land zone.' },
  { code: 'SFP', label: 'State', blurb: 'Statewide summary in narrative form.' },
  { code: 'CWF', label: 'Coastal waters', blurb: 'Winds and seas for the nearshore marine zones.' },
  { code: 'OFF', label: 'Offshore', blurb: 'Conditions for the open ocean around the islands.' },
  { code: 'NPW', label: 'Advisories', blurb: 'Wind, heat and other non-rain hazards in effect.' },
] as const

/**
 * The week as a table.
 *
 * NWS issues day and night as separate periods, which as fourteen tiles is a
 * field of boxes you have to read one at a time. Paired back into days, one row
 * each, the week is a column of numbers the eye can run down — which day is
 * hottest, which night is wettest — and that comparison is the whole reason to
 * look at seven days at once.
 */
interface Day {
  key: string
  label: string
  day?: ForecastPeriod
  night?: ForecastPeriod
}

function byDay(periods: ForecastPeriod[]): Day[] {
  const days = new Map<string, Day>()
  for (const p of periods) {
    // The night of a day belongs to the date it started on, not the one it ends
    // in: "Friday Night" is part of Friday's row.
    const key = p.startTime.slice(0, 10)
    const entry = days.get(key) ?? {
      key,
      label: (p.isDaytime ? p.name : p.name.replace(/\s*Night$/, '')) || p.name,
    }
    if (p.isDaytime) entry.day = p
    else entry.night = p
    if (p.isDaytime) entry.label = p.name
    days.set(key, entry)
  }
  return [...days.values()]
}

const pop = (p?: ForecastPeriod) => p?.probabilityOfPrecipitation?.value ?? null

function Week({
  periods,
  selected,
  onSelect,
}: {
  periods: ForecastPeriod[]
  selected: string
  onSelect: (key: string) => void
}) {
  const days = byDay(periods)

  return (
    <div className="min-w-0">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-widest text-faint">
            <th className="py-1.5 pr-3 font-semibold">Day</th>
            <th className="py-1.5 pr-3 text-right font-semibold">High</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Low</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Rain</th>
            <th className="hidden py-1.5 pr-3 font-semibold sm:table-cell">Wind</th>
            <th className="hidden py-1.5 font-semibold md:table-cell">Outlook</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const lead = d.day ?? d.night!
            const rain = Math.max(pop(d.day) ?? 0, pop(d.night) ?? 0)
            const active = d.key === selected
            return (
              <tr
                key={d.key}
                onClick={() => onSelect(d.key)}
                className={`cursor-pointer border-t border-line transition-colors ${
                  active ? 'bg-surface-2' : 'hover:bg-surface-hover'
                }`}
              >
                <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
                  {d.label}
                  <span className="block font-normal text-muted md:hidden">
                    {lead.shortForecast}
                  </span>
                </th>
                <td className="py-2 pr-3 text-right font-medium tabular-nums text-ink">
                  {d.day ? `${d.day.temperature}°` : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted">
                  {d.night ? `${d.night.temperature}°` : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted">{rain}%</td>
                <td className="hidden whitespace-nowrap py-2 pr-3 tabular-nums text-muted sm:table-cell">
                  {lead.windDirection} {lead.windSpeed}
                </td>
                <td className="hidden py-2 text-muted md:table-cell">{lead.shortForecast}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** The chosen day in the forecaster's own words, in a box that does not move. */
function DayDetail({ day }: { day: Day }) {
  const parts = [day.day, day.night].filter(Boolean) as ForecastPeriod[]
  return (
    <div className="min-h-[7rem] border-t border-line pt-3">
      {parts.map((p) => (
        <p key={p.number} className="mb-2 max-w-[86ch] text-sm leading-relaxed text-ink last:mb-0">
          <span className="font-medium">{p.name}.</span>{' '}
          <span className="text-muted">{p.detailedForecast}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * The office's text products, read as prose rather than teletype.
 *
 * The discussion is the reason an atmospheric sciences department has this page
 * at all — it is the forecaster explaining what the models are doing and where
 * they disagree — so it opens on it, with its sections as headings rather than
 * as a wall of monospace behind a dropdown.
 */
function Products() {
  const [code, setCode] = useState<string>('AFD')
  const meta = HFO_PRODUCTS.find((p) => p.code === code)!

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', code, 'HFO'],
    queryFn: () => nws.latestProduct(code, 'HFO'),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    refetchIntervalInBackground: true,
  })

  const sections = data?.productText ? parseAfd(data.productText) : []

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-2">
        <h2 className="text-sm font-medium text-ink">From NWS Honolulu</h2>
        {data && (
          <p className="text-xs text-faint" title={`${hstDateTime(data.issuanceTime)} HST`}>
            {meta.blurb} · issued {relativeAge(data.issuanceTime)}
          </p>
        )}
      </div>

      <Rail className="mt-2" row="flex items-center gap-x-5">
        <SegmentedControl
          label="Text product"
          value={code}
          onChange={setCode}
          options={HFO_PRODUCTS.map((p) => ({ id: p.code, label: p.label, title: p.blurb }))}
        />
      </Rail>

      <div className="mt-3">
        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && (
          <ErrorState
            source="api.weather.gov"
            message={(error as Error).message}
            onRetry={() => refetch()}
          />
        )}
        {data === null && (
          <p className="text-sm text-muted">
            No current {meta.label.toLowerCase()} product — this one is issued only when
            conditions warrant.
          </p>
        )}
        {sections.map((s) => (
          <article key={s.heading} className="mb-5 max-w-[74ch] last:mb-0">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
              {s.heading}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function Forecast() {
  const [loc, setLoc] = useState(FORECAST_LOCATIONS[0])
  const [day, setDay] = useState<string | null>(null)

  const point = useQuery({
    queryKey: ['point', loc.lat, loc.lon],
    queryFn: () => nws.point(loc.lat, loc.lon),
    staleTime: 24 * 60 * 60_000, // grid geometry effectively never changes
  })

  const grid = point.data ? ([point.data.gridId, point.data.gridX, point.data.gridY] as const) : null

  const forecast = useQuery({
    queryKey: ['forecast', ...(grid ?? [])],
    queryFn: () => nws.forecast(grid![0], grid![1], grid![2]),
    enabled: !!grid,
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchIntervalInBackground: true,
  })

  const hourly = useQuery({
    queryKey: ['hourly', ...(grid ?? [])],
    queryFn: () => nws.hourlyForecast(grid![0], grid![1], grid![2]),
    enabled: !!grid,
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
    refetchIntervalInBackground: true,
  })

  const days = forecast.data ? byDay(forecast.data.periods) : []
  const chosen = days.find((d) => d.key === day) ?? days[0]
  const failed = point.error ?? forecast.error ?? hourly.error

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
        <p className="mt-1 max-w-3xl text-muted">
          The National Weather Service forecast for the islands, hour by hour and day by day, with
          the forecaster's own discussion.
        </p>
      </header>

      <Rail row="flex items-center gap-x-5">
        <SegmentedControl
          label="Location"
          name="Place"
          value={loc.label}
          onChange={(v) => setLoc(FORECAST_LOCATIONS.find((l) => l.label === v) ?? loc)}
          options={FORECAST_LOCATIONS.map((l) => ({ id: l.label, label: l.label }))}
        />
      </Rail>

      {failed && (
        <ErrorState
          source="api.weather.gov"
          message={(failed as Error).message}
          onRetry={() => (point.isError ? point.refetch() : forecast.refetch())}
        />
      )}

      <section className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-2">
          <h2 className="text-sm font-medium text-ink">Next two days · {loc.label}</h2>
          {forecast.data && (
            <p className="text-xs text-faint">
              Issued {relativeAge(forecast.data.updateTime)} · NWS {point.data?.gridId ?? 'HFO'}
            </p>
          )}
        </div>
        <div className="mt-3">
          {hourly.data ? (
            <HourlyChart periods={hourly.data.periods} />
          ) : (
            <Skeleton className="h-56 w-full" />
          )}
        </div>
      </section>

      <section className="min-w-0">
        <h2 className="border-b border-line pb-2 text-sm font-medium text-ink">
          Seven days · {loc.label}
        </h2>
        {forecast.data ? (
          <>
            <Week
              periods={forecast.data.periods}
              selected={chosen?.key ?? ''}
              onSelect={setDay}
            />
            {chosen && <DayDetail day={chosen} />}
          </>
        ) : (
          <Skeleton className="mt-3 h-72 w-full" />
        )}
      </section>

      <Products />
    </div>
  )
}
