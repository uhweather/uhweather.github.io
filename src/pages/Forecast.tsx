import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { nws } from '../lib/nws'
import { FORECAST_LOCATIONS } from '../lib/stations'
import { hstDateTime } from '../lib/units'
import { Card, ErrorState, Skeleton } from '../components/ui'

/**
 * Text products issued by NWS Honolulu.
 *
 * This mirrors the legacy site's "Menu of Text Products" dropdown, but the list
 * is the office's real catalogue rather than a hard-coded set of links that rot.
 * Codes verified against /products/locations/HFO/types.
 */
const HFO_PRODUCTS = [
  { code: 'AFD', label: 'Area Forecast Discussion', blurb: "The forecaster's own reasoning behind the forecast." },
  { code: 'SRF', label: 'Surf Zone Forecast', blurb: 'Surf heights by shore, and High Surf Advisories.' },
  { code: 'ZFP', label: 'Zone Forecast Product', blurb: 'Plain-language forecast for each land zone.' },
  { code: 'SFP', label: 'State Forecast', blurb: 'Statewide summary in narrative form.' },
  { code: 'CWF', label: 'Coastal Waters Forecast', blurb: 'Winds and seas for the nearshore marine zones.' },
  { code: 'OFF', label: 'Offshore Forecast', blurb: 'Conditions for the open ocean around the islands.' },
  { code: 'NPW', label: 'Non-Precipitation Advisories', blurb: 'Wind, heat and other non-rain hazards in effect.' },
] as const

function TextProductBrowser() {
  const [code, setCode] = useState<string>('AFD')
  const meta = HFO_PRODUCTS.find((p) => p.code === code)!

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', code, 'HFO'],
    queryFn: () => nws.latestProduct(code, 'HFO'),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  })

  return (
    <Card
      title="Text products from NWS Honolulu"
      subtitle={
        data
          ? `${meta.label} — issued ${hstDateTime(data.issuanceTime)} HST by ${data.issuingOffice}`
          : meta.blurb
      }
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink">
          Product
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full max-w-md rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {HFO_PRODUCTS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-sm text-muted">{meta.blurb}</p>
      </div>

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
          NWS Honolulu has no current {meta.label} in the archive. This product is only issued
          when conditions warrant.
        </p>
      )}
      {data?.productText && (
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink">
          {data.productText.trim()}
        </pre>
      )}
    </Card>
  )
}

export default function Forecast() {
  const [loc, setLoc] = useState(FORECAST_LOCATIONS[0])

  const point = useQuery({
    queryKey: ['point', loc.lat, loc.lon],
    queryFn: () => nws.point(loc.lat, loc.lon),
    staleTime: 24 * 60 * 60_000, // grid geometry effectively never changes
  })

  const forecast = useQuery({
    queryKey: ['forecast', point.data?.gridId, point.data?.gridX, point.data?.gridY],
    queryFn: () => nws.forecast(point.data!.gridId, point.data!.gridX, point.data!.gridY),
    enabled: !!point.data,
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
  })

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Official National Weather Service forecasts, plus the forecaster's own reasoning in the
          Area Forecast Discussion.
        </p>
      </header>

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink">
          Location
          <select
            value={loc.label}
            onChange={(e) =>
              setLoc(FORECAST_LOCATIONS.find((l) => l.label === e.target.value)!)
            }
            className="mt-1 block w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {FORECAST_LOCATIONS.map((l) => (
              <option key={l.label} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6">
        <Card
          title={`Seven-day forecast — ${loc.label}`}
          subtitle={
            forecast.data ? `Updated ${hstDateTime(forecast.data.updated)} HST` : undefined
          }
        >
          {(point.isLoading || forecast.isLoading) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          )}
          {(point.isError || forecast.isError) && (
            <ErrorState
              source="api.weather.gov"
              message={((point.error ?? forecast.error) as Error)?.message ?? 'Request failed'}
              onRetry={() => (point.isError ? point.refetch() : forecast.refetch())}
            />
          )}
          {forecast.data && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {forecast.data.periods.map((p) => (
                <li
                  key={p.number}
                  className="rounded-lg border border-line p-3"
                >
                  <div className="flex items-center gap-2">
                    <img src={p.icon} alt="" aria-hidden="true" className="h-10 w-10 rounded" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {p.temperature}°{p.temperatureUnit}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    {p.shortForecast}
                  </p>
                  <dl className="mt-2 space-y-0.5 text-xs text-muted">
                    <div className="flex justify-between gap-2">
                      <dt>Wind</dt>
                      <dd className="text-right">
                        {p.windDirection} {p.windSpeed}
                      </dd>
                    </div>
                    {p.probabilityOfPrecipitation?.value !== null && (
                      <div className="flex justify-between gap-2">
                        <dt>Precip</dt>
                        <dd>{p.probabilityOfPrecipitation.value}%</dd>
                      </div>
                    )}
                  </dl>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-primary">
                      Details
                    </summary>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {p.detailedForecast}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <TextProductBrowser />
      </div>
    </>
  )
}
