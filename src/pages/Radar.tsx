import { useState } from 'react'
import { RADAR_SITES, radarPageUrl } from '../lib/sources'
import { useRadarLoop } from '../lib/useFrameLoop'
import { SegmentedControl } from '../components/ui'
import { UiIcons } from '../components/UiIcons'

const SPEEDS = [
  { ms: 800, label: '0.5×' },
  { ms: 400, label: '1×' },
  { ms: 200, label: '2×' },
  { ms: 100, label: '4×' },
]

/**
 * Radar with the same transport the satellite viewer has.
 *
 * The page previously embedded NOAA's pre-rendered `_loop.gif`, which plays at
 * whatever rate was baked into it and cannot be paused, stepped or scrubbed —
 * exactly the limitation the legacy site's frame player did not have. RIDGE also
 * publishes the ten frames individually, so the loop is driven here instead.
 */
export default function Radar() {
  const [site, setSite] = useState(RADAR_SITES[0].id)
  const [speed, setSpeed] = useState(400)
  const [animate, setAnimate] = useState(true)
  const meta = RADAR_SITES.find((r) => r.id === site)!

  const loop = useRadarLoop({ site, speed, enabled: animate })
  const { index, jump, playing, setPlaying, ready, loaded, total, current } = loop
  const still = `https://radar.weather.gov/ridge/standard/${site}_0.gif`

  const selectClass = 'rounded border border-line bg-surface px-2 py-1 text-sm text-ink'

  return (
    <div className="flex min-h-[520px] flex-1 flex-col gap-3">
      <h1 className="sr-only">{meta.label} radar</h1>

      <header className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SegmentedControl
          label="Radar site"
          name="Radar"
          value={site}
          onChange={setSite}
          options={RADAR_SITES.map((r) => ({ id: r.id, label: r.label, title: r.blurb }))}
        />
        <div className="ml-auto flex items-center gap-6">
          <a
            href={radarPageUrl(site)}
            target="_blank"
            rel="noreferrer"
            className="py-1 text-sm text-muted transition-colors hover:text-ink"
          >
            Interactive <UiIcons.external size={12} className="inline align-[-1px]" />
          </a>
          <SegmentedControl
            label="View mode"
            value={animate ? 'anim' : 'still'}
            onChange={(v) => setAnimate(v === 'anim')}
            options={[
              { id: 'anim', label: 'Animate' },
              { id: 'still', label: 'Latest' },
            ]}
          />
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {animate && !ready ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-56 text-center">
              <p className="text-sm text-muted">Loading {loaded} of {total} frames</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: total ? `${(loaded / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={animate ? (current ?? still) : still}
            alt={
              animate
                ? `${meta.label} radar, frame ${index + 1} of 10`
                : `Latest ${meta.label} radar image`
            }
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
      </div>

      {animate ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => jump(0)} aria-label="First frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">
              <UiIcons.first size={16} />
            </button>
            <button type="button" onClick={() => jump(index - 1)} aria-label="Previous frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">
              <UiIcons.prev size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Pause' : 'Play'}
              className="rounded px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-surface-hover"
            >
              {playing ? <UiIcons.pause size={18} /> : <UiIcons.play size={18} />}
            </button>
            <button type="button" onClick={() => jump(index + 1)} aria-label="Next frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">
              <UiIcons.next size={16} />
            </button>
            <button type="button" onClick={() => jump(9)} aria-label="Last frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">
              <UiIcons.last size={16} />
            </button>
          </div>

          <label className="flex min-w-40 flex-1 items-center gap-2">
            <span className="sr-only">Frame</span>
            <input
              type="range"
              min={0}
              max={9}
              value={Math.min(index, 9)}
              onChange={(e) => jump(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {index + 1}/10
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted">
            Speed
            <select className={selectClass} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
            </select>
          </label>

          <p className="text-xs text-muted">{meta.blurb}</p>
        </div>
      ) : (
        <div className="border-t border-line pt-3 text-xs text-muted">
          {meta.blurb} NWS RIDGE · base reflectivity · a new scan about every 6 minutes.
        </div>
      )}
    </div>
  )
}
