import { useEffect, useRef, useState } from 'react'
import type { ForecastPeriod } from '../lib/nws'

const H = 230
const PAD = { top: 18, right: 34, bottom: 26, left: 36 }
const PLOT_H = H - PAD.top - PAD.bottom

/**
 * The chart is drawn at the size it is shown at, not scaled into place.
 *
 * A fixed viewBox stretched to fit takes the labels with it: on a phone a
 * 960-wide chart in a 358-wide column renders 13px type at five. Measuring the
 * column and drawing to it keeps every number the size it was asked to be.
 */
function useWidth(): [React.RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

const HOUR = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  timeZone: 'Pacific/Honolulu',
})
const DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'Pacific/Honolulu',
})

/** Round the temperature axis out to whole degrees with a little air. */
function bounds(values: number[]): [number, number] {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max(2, (hi - lo) * 0.15)
  return [Math.floor(lo - pad), Math.ceil(hi + pad)]
}

/**
 * The next two days, hour by hour.
 *
 * The seven-day forecast answers "what is Thursday like"; it cannot answer "will
 * it be raining when I walk home", which is the question a day-to-day reader
 * actually has. NWS publishes 156 hourly periods per gridpoint and the old page
 * used none of them — it spent its whole height on fourteen tiles saying
 * "Isolated Rain Showers".
 *
 * Temperature as a line, chance of rain as the area under it, drawn against the
 * same hours: the shape of the day is one glance rather than fourteen readings
 * held in your head.
 */
export default function HourlyChart({
  periods,
  hours = 48,
}: {
  periods: ForecastPeriod[]
  hours?: number
}) {
  const [at, setAt] = useState<number | null>(null)
  const [box, W] = useWidth()

  const slice = periods.slice(0, hours)
  const plotW = Math.max(1, W - PAD.left - PAD.right)
  // Hooks first, then bail: a single hour is not a chart.
  const ready = slice.length >= 2 && W > 0

  const temps = slice.map((p) => p.temperature)
  const [lo, hi] = bounds(temps.length ? temps : [0, 1])

  const x = (i: number) => PAD.left + (i / (slice.length - 1)) * plotW
  const y = (t: number) => PAD.top + (1 - (t - lo) / (hi - lo)) * PLOT_H
  const yPop = (v: number) => PAD.top + PLOT_H - (v / 100) * PLOT_H * 0.55

  const line = temps.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(' ')

  const pops = slice.map((p) => p.probabilityOfPrecipitation?.value ?? 0)
  const area =
    `M${x(0).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} ` +
    pops.map((v, i) => `L${x(i).toFixed(1)},${yPop(v).toFixed(1)}`).join(' ') +
    ` L${x(slice.length - 1).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} Z`

  // Midnight is where one day becomes the next; the label sits after the rule.
  const dayBreaks = slice
    .map((p, i) => ({ i, date: new Date(p.startTime) }))
    .filter(({ date }, n) => n > 0 && date.getHours() === 0)

  const shown = Math.min(at ?? 0, Math.max(0, slice.length - 1))
  const current = slice[shown]
  // Every sixth hour is readable on a desk and a crush on a phone.
  const tick = W < 560 ? 12 : 6

  const track = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - PAD.left) / plotW) * (slice.length - 1))
    setAt(Math.min(slice.length - 1, Math.max(0, i)))
  }

  return (
    <figure ref={box as React.RefObject<HTMLElement>} className="min-w-0">
      {ready && (
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={`Hourly temperature and chance of rain for the next ${hours} hours`}
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setAt(null)}
      >
        {/* Temperature gridlines, at the ends and the middle. */}
        {[lo, Math.round((lo + hi) / 2), hi].map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PAD.left - 7} y={y(t) + 4} textAnchor="end" fontSize={13} fill="var(--faint)">
              {t}°
            </text>
          </g>
        ))}

        {dayBreaks.map(({ i, date }) => (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={PAD.top - 6}
              y2={PAD.top + PLOT_H}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            <text x={x(i) + 6} y={PAD.top - 6} fontSize={13} fill="var(--muted)">
              {DAY.format(date)}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--primary)" opacity={0.16} />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Where the reader is pointing, or the current hour when they are not. */}
        <line
          x1={x(shown)}
          x2={x(shown)}
          y1={PAD.top - 6}
          y2={PAD.top + PLOT_H}
          stroke="var(--ink)"
          strokeWidth={1}
          opacity={0.35}
        />
        <circle cx={x(shown)} cy={y(current.temperature)} r={4.5} fill="var(--accent)" />

        {/* Hour ticks, sparse enough to read. */}
        {slice.map((p, i) =>
          i % tick === 0 ? (
            <text
              key={p.startTime}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={13}
              fill="var(--faint)"
            >
              {HOUR.format(new Date(p.startTime))}
            </text>
          ) : null,
        )}

        <text x={W - PAD.right + 6} y={PAD.top + PLOT_H} fontSize={13} fill="var(--faint)">
          0%
        </text>
        <text x={W - PAD.right + 6} y={yPop(100) + 4} fontSize={13} fill="var(--faint)">
          100%
        </text>
      </svg>
      )}

      {current && (
      <figcaption className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span className="font-medium tabular-nums text-ink">
          {HOUR.format(new Date(current.startTime))} {DAY.format(new Date(current.startTime))}
        </span>
        <span className="tabular-nums text-ink">
          {current.temperature}°{current.temperatureUnit}
        </span>
        <span className="tabular-nums text-muted">
          {current.probabilityOfPrecipitation?.value ?? 0}% rain
        </span>
        <span className="tabular-nums text-muted">
          {current.windDirection} {current.windSpeed}
        </span>
        <span className="min-w-0 truncate text-muted">{current.shortForecast}</span>
      </figcaption>
      )}
    </figure>
  )
}
