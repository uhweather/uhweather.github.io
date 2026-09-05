import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { nws, type Observation } from '../lib/nws'
import { ISLANDS, STATIONS, type Station } from '../lib/stations'
import {
  compass,
  fmt,
  hstTime,
  readPressureMb,
  readSpeed,
  readTemp,
  relativeAge,
  SPEED_UNITS,
  TEMP_UNITS,
  type SpeedUnit,
  type TempUnit,
} from '../lib/units'
import { Card, SegmentedControl, Skeleton } from '../components/ui'

interface Row {
  station: Station
  obs?: Observation | null
  isLoading: boolean
  isError: boolean
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2 tabular-nums ${className}`}>{children}</td>
  )
}

export default function Observations() {
  const [tempUnit, setTempUnit] = useState<TempUnit>('F')
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('mph')

  // One query per station keeps a single flaky ASOS from blanking the table.
  const results = useQueries({
    queries: STATIONS.map((s) => ({
      queryKey: ['obs', s.id],
      queryFn: () => nws.latestUsableObservation(s.id),
      staleTime: 5 * 60_000,
      refetchInterval: 5 * 60_000,
    })),
  })

  const rows: Row[] = STATIONS.map((station, i) => ({
    station,
    obs: results[i].data,
    isLoading: results[i].isLoading,
    isError: results[i].isError,
  }))

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Surface observations</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Latest hourly reports from the automated stations across the main Hawaiian Islands.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <SegmentedControl
          label="Temperature unit"
          name="Temp"
          value={tempUnit}
          onChange={setTempUnit}
          options={TEMP_UNITS.map((u) => ({ id: u, label: `°${u}` }))}
        />
        <SegmentedControl
          label="Wind speed unit"
          name="Wind"
          value={speedUnit}
          onChange={setSpeedUnit}
          options={SPEED_UNITS.map((u) => ({ id: u, label: u }))}
        />
      </div>

      <div className="space-y-6">
        {ISLANDS.map((island) => {
          const group = rows.filter((r) => r.station.island === island)
          if (!group.length) return null
          return (
            <Card key={island} title={island}>
              <div className="-mx-4 overflow-x-auto">
                <table className="w-full min-w-[54rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="px-3 py-2 font-medium">Station</th>
                      <th scope="col" className="px-3 py-2 font-medium">Elev (ft)</th>
                      <th scope="col" className="px-3 py-2 font-medium">Observed</th>
                      <th scope="col" className="px-3 py-2 font-medium">Temp (°{tempUnit})</th>
                      <th scope="col" className="px-3 py-2 font-medium">Dew pt (°{tempUnit})</th>
                      <th scope="col" className="px-3 py-2 font-medium">RH (%)</th>
                      <th scope="col" className="px-3 py-2 font-medium">Wind ({speedUnit})</th>
                      <th scope="col" className="px-3 py-2 font-medium">Gust ({speedUnit})</th>
                      <th scope="col" className="px-3 py-2 font-medium">Pressure (mb)</th>
                      <th scope="col" className="px-3 py-2 font-medium">Conditions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {group.map(({ station, obs, isLoading, isError }) => (
                      <tr key={station.id} className="hover:bg-surface-2">
                        <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          {station.name}
                          <span className="ml-1.5 font-mono text-xs font-normal text-faint">
                            {station.id}
                          </span>
                        </th>
                        <Cell className="text-muted">{station.elevationFt}</Cell>
                        {isLoading ? (
                          <td colSpan={8} className="px-3 py-2">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ) : isError || !obs ? (
                          <td colSpan={8} className="px-3 py-2 text-faint">
                            Station not reporting
                          </td>
                        ) : (
                          <>
                            <Cell className="text-muted">
                              <span title={relativeAge(obs.timestamp)}>{hstTime(obs.timestamp)}</span>
                            </Cell>
                            <Cell>{fmt(readTemp(obs.temperature, tempUnit), 1)}</Cell>
                            <Cell>{fmt(readTemp(obs.dewpoint, tempUnit), 1)}</Cell>
                            <Cell>{fmt(obs.relativeHumidity?.value)}</Cell>
                            <Cell>
                              {obs.windDirection?.value !== null &&
                              obs.windDirection?.value !== undefined
                                ? `${compass(obs.windDirection.value)} `
                                : ''}
                              {fmt(readSpeed(obs.windSpeed, speedUnit))}
                            </Cell>
                            <Cell>{fmt(readSpeed(obs.windGust, speedUnit))}</Cell>
                            <Cell>
                              {fmt(
                                readPressureMb(obs.seaLevelPressure ?? obs.barometricPressure),
                                1,
                              )}
                            </Cell>
                            <Cell className="max-w-48 truncate whitespace-normal text-muted">
                              {obs.textDescription ?? '—'}
                            </Cell>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
