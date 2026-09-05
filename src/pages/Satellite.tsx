import { useEffect, useState, type CSSProperties } from 'react'
import {
  animSizeFor,
  bandSpec,
  FRAME_COUNTS,
  fullSizeFor,
  GOES_WEST,
  humanBytes,
  loopBytes,
  FEATURED_BANDS,
  SAT_SECTORS,
  satelliteFullUrl,
  satelliteUrl,
  sectorSpec,
  STEPS,
  type SatBand,
  type SatQuality,
  type SatSector,
} from '../lib/sources'
import { useCombinedLoop, useFrameLoop } from '../lib/useFrameLoop'
import { useSharedCombine, useSharedPanels, useSharedSector } from '../lib/viewState'
import { ErrorState, SegmentedControl } from '../components/ui'
import SatelliteMatrix from '../components/SatelliteMatrix'
import ColorBar from '../components/ColorBar'
import GuideTicker from '../components/GuideTicker'
import PanelChannel from '../components/PanelChannel'
import FigureViewer from '../components/FigureViewer'
import Rail from '../components/Rail'
import { hstDateTime } from '../lib/units'

const SPEEDS = [
  { ms: 600, label: '0.5×' },
  { ms: 300, label: '1×' },
  { ms: 150, label: '2×' },
  { ms: 80, label: '4×' },
]

/** Minutes as the span a loop covers: "90 min", "6 h", "1 d 12 h". */
function span(minutes: number): string {
  if (minutes < 120) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} d ${hours % 24} h`.replace(' 0 h', '')
}

export default function Satellite() {
  // Shared with the overview, so a view chosen in either place holds.
  const [sector, setSector] = useSharedSector()
  const [panels, setPanel] = useSharedPanels()
  const [band, setBand] = useState<SatBand>('GEOCOLOR')
  // Frames, not hours: every frame is a consecutive scan, so a longer loop is a
  // longer loop rather than a coarser one. 36 of a 10-minute sector is 6 hours.
  const [frames, setFrames] = useState(36)
  const [step, setStep] = useState(1)
  const [speed, setSpeed] = useState(150)
  const [quality, setQuality] = useState<SatQuality>('small')
  // Animation is the default view: a still frame tells you the sky's state, a
  // loop tells you where it is going, which is the reason to open this page.
  const [animate, setAnimate] = useState(true)
  const [browsing, setBrowsing] = useState(false)
  // 2x2 of four channels, driven by one transport. Persisted with the sector and
  // the panel channels: they are one setting, and a display should come back to it.
  const [combine, setCombine] = useSharedCombine()
  // Which figure is open full screen, and the rectangle it grew out of. `null`
  // for the panel means the single view.
  const [focus, setFocus] = useState<{ panel: number | null; origin: DOMRect } | null>(null)

  const enlarge = (panel: number | null) => (e: React.MouseEvent<HTMLElement>) =>
    setFocus({ panel, origin: e.currentTarget.getBoundingClientRect() })

  const spec = sectorSpec(sector)
  const meta = bandSpec(band)
  const shown: SatBand[] = combine ? panels : [band]

  // Browsing pauses the preloader: otherwise the loop's frames and the matrix's
  // 21 thumbnails compete for the same connections and the tiles the reader is
  // looking at load last.
  const loop = useFrameLoop({
    sector,
    band,
    frames,
    step,
    speed,
    quality,
    enabled: animate && !browsing && !combine,
  })

  // Four channels share one clock, so every panel shows the same moment.
  const grid = useCombinedLoop({
    sector,
    bands: panels,
    frames,
    step,
    speed,
    quality,
    enabled: combine && !browsing,
  })

  const active = combine ? grid : loop
  const frameCount = combine ? grid.sets.length : loop.frames.length

  // What the current settings ask of the network, before they ask it. A 240
  // frame loop of the full disk at large size is 400 MB; that is a legitimate
  // thing to want and an unpleasant thing to discover afterwards.
  const weight = loopBytes(sector, quality, frames, shown.length)
  // Frames are consecutive scans, so the spacing is the sector's cadence times
  // the skip — no need to measure it off the frames that happened to load.
  const frameGap = step * spec.cadenceMinutes
  const coverage = span(frames * frameGap)

  const { jump, setPlaying, playing, index } = active

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing) }
      else if (e.key === 'ArrowLeft') jump(index - 1)
      else if (e.key === 'ArrowRight') jump(index + 1)
      else if (e.key === 'Home') jump(0)
      else if (e.key === 'End') jump(frameCount - 1)
      // Digits pick a channel and `v` cycles the view, so switching products
      // costs one keystroke rather than a trip through two dropdowns.
      else if (/^[1-8]$/.test(e.key)) {
        const b = FEATURED_BANDS[Number(e.key) - 1]
        if (b) setBand(b.id)
      } else if (e.key.toLowerCase() === 'v') {
        const i = SAT_SECTORS.findIndex((s) => s.id === sector)
        setSector(SAT_SECTORS[(i + 1) % SAT_SECTORS.length].id)
      } else if (e.key.toLowerCase() === 'b') setBrowsing((v) => !v)
      else if (e.key.toLowerCase() === 'a') setAnimate((v) => !v)
      else if (e.key.toLowerCase() === 'c') setCombine(!combine)
      else if (e.key === 'Escape') setBrowsing(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, jump, frameCount, sector, playing, setPlaying, combine, setCombine])

  const stillUrl = satelliteUrl(sector, band)
  const selectClass = 'rounded border border-line bg-surface px-2 py-1 text-sm text-ink'

  return (
    /* Fills whatever height the layout has left, so the imagery is the page
       rather than a tile inside it. */
    <div
      className="flex flex-1 flex-col gap-3 lg:min-h-[520px]"
      style={{ '--sat-aspect': String(spec.aspect) } as CSSProperties}
    >
      <h1 className="sr-only">
        {spec.label} — {combine ? 'four channels' : meta.label} satellite imagery
      </h1>

      {/* One row, one click per change, everything visible at once. The legacy
          site's index was a channel × view matrix you could read at a glance;
          two dropdowns replaced that with a scan and twice the clicks. */}
      <header className="bare-hide flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-2">
        <Rail>
          <SegmentedControl
            label="View"
            name="View"
            value={sector}
            onChange={(v) => setSector(v as SatSector)}
            options={SAT_SECTORS.map((s) => ({ id: s.id, label: s.short, title: s.blurb }))}
          />
        </Rail>
        {!combine && (
          <Rail>
            <SegmentedControl
              label="Channel"
              name="Channel"
              value={band}
              onChange={(v) => setBand(v as SatBand)}
              options={FEATURED_BANDS.map((b, i) => ({
                id: b.id,
                label: b.short,
                title: `${b.descriptor} (${i + 1})`,
              }))}
            />
          </Rail>
        )}
        {!combine && !FEATURED_BANDS.some((b) => b.id === band) && (
          <span className="text-sm font-medium text-ink" title={meta.descriptor}>
            {meta.short}
          </span>
        )}
        <Rail className="lg:ml-auto" row="flex items-center gap-5 lg:gap-6">
          <button
            type="button"
            onClick={() => setBrowsing(true)}
            title="Browse every channel and view (B)"
            className="flex items-center gap-1.5 py-1 text-sm text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">⊞</span> Browse all
          </button>
          <SegmentedControl
            label="Layout"
            value={combine ? 'grid' : 'one'}
            onChange={(v) => setCombine(v === 'grid')}
            options={[
              { id: 'one', label: 'Single', title: 'One channel, full size (C)' },
              { id: 'grid', label: '2×2', title: 'Four channels of this view on one clock (C)' },
            ]}
          />
          <SegmentedControl
            label="View mode"
            value={animate ? 'anim' : 'still'}
            onChange={(v) => setAnimate(v === 'anim')}
            options={[
              { id: 'anim', label: 'Animate' },
              { id: 'still', label: 'Latest' },
            ]}
          />
        </Rail>
      </header>

      <SatelliteMatrix
        open={browsing}
        sector={sector}
        band={band}
        onPick={(s, b) => {
          setSector(s)
          setBand(b)
          setBrowsing(false)
        }}
        onClose={() => setBrowsing(false)}
      />

      {/* The image is constrained against this box. Its height comes from the
          figure's own ratio on a phone and from `flex-1` once the page fills the
          window; `overflow-hidden` is load-bearing either way, since without it
          a wide sector spills out and covers the controls. */}
      <div className="sat-stage relative w-full overflow-hidden lg:min-h-0 lg:flex-1">
        {active.isError ? (
          <div className="absolute inset-0 grid place-items-center">
            <ErrorState
              source="NESDIS STAR"
              message={(active.error as Error)?.message ?? 'Request failed'}
              onRetry={() => active.refetch()}
            />
          </div>
        ) : (animate || combine) && !active.ready ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-64 text-center">
              <p className="text-sm text-muted">
                {active.isLoading
                  ? 'Finding frames…'
                  : `Loading ${active.loaded} of ${active.total} frames`}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: active.total ? `${(active.loaded / active.total) * 100}%` : '0%' }}
                />
              </div>
              <p className="mt-2 text-xs text-faint">
                {humanBytes(weight)} · {coverage} of imagery
              </p>
            </div>
          </div>
        ) : combine ? (
          /* Two columns of two panels, each the imagery's own shape, makes the
             block as a whole that same shape — so pinning the grid to that ratio
             and letting its width follow its height spends the panel on picture
             instead of on black bars either side. */
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="grid h-full max-w-full grid-cols-2 grid-rows-2 gap-1.5"
              style={{ aspectRatio: String(spec.aspect) }}
            >
            {panels.map((b, i) => (
              <div
                key={`${b}-${i}`}
                className="relative min-h-0 overflow-hidden rounded border border-line bg-black"
              >
                <img
                  src={grid.urls?.[i] ?? ''}
                  alt={`${bandSpec(b).label} over ${spec.label}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={enlarge(i)}
                  aria-label={`Enlarge ${bandSpec(b).label}`}
                  className="absolute inset-0 z-[1] cursor-zoom-in"
                />
                <PanelChannel value={b} onChange={(next) => setPanel(i, next)} />
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative max-h-full w-full overflow-hidden"
              style={{ aspectRatio: String(spec.aspect) }}
            >
              <img
                src={animate ? (loop.current ?? stillUrl) : stillUrl}
                alt={
                  animate
                    ? `${meta.label} imagery of the ${spec.label} sector, frame ${index + 1} of ${frameCount}`
                    : `Latest ${meta.label} imagery of the ${spec.label} sector`
                }
                className="absolute inset-0 h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={enlarge(null)}
                aria-label={`Enlarge ${meta.label}`}
                className="absolute inset-0 cursor-zoom-in"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loop timing and colour scales share one row: the timing sat on a line
          of its own and the imagery paid for it in height. */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {(animate || combine) && (
          <div className="shrink-0 leading-tight">
            <p className="text-base font-medium tabular-nums text-ink">{coverage} loop</p>
            <p className="text-xs tabular-nums text-muted">
              {frameGap} min steps · {frameCount ? index + 1 : 0} of {frameCount}
            </p>
            {active.stamp && (
              <p className="text-xs font-medium tabular-nums text-ink">
                {hstDateTime(active.stamp.toISOString())} HST
              </p>
            )}
          </div>
        )}

        <ColorBar bands={shown} />
      </div>

      {/* Transport. The legacy jsImagePlayer had first/back/stop/play/forward/
          last and a frame box; this keeps that model and adds a scrubber. */}
      {animate || combine ? (
        <div className="bare-hide flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => jump(0)} aria-label="First frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">⏮</button>
            <button type="button" onClick={() => jump(index - 1)} aria-label="Previous frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">◀</button>
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Pause' : 'Play'}
              className="rounded px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-surface-hover"
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button type="button" onClick={() => jump(index + 1)} aria-label="Next frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">▶</button>
            <button type="button" onClick={() => jump(frameCount - 1)} aria-label="Last frame"
              className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ink">⏭</button>
          </div>

          <label className="flex min-w-40 flex-1 items-center gap-2">
            <span className="sr-only">Frame</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, frameCount - 1)}
              value={Math.min(index, Math.max(0, frameCount - 1))}
              onChange={(e) => jump(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {frameCount ? index + 1 : 0}/{frameCount}
            </span>
          </label>

          {/* `lg:contents` dissolves this wrapper where the row has the width for
              everything on one line, leaving the desktop layout untouched. */}
          <div className="rail flex items-center gap-x-4 lg:contents">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Frames
              <select className={selectClass} value={frames} onChange={(e) => setFrames(Number(e.target.value))}>
                {FRAME_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Skip
              <select className={selectClass} value={step} onChange={(e) => setStep(Number(e.target.value))}>
                {STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Speed
              <select className={selectClass} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
              </select>
            </label>
            <label
              className="flex items-center gap-1.5 text-xs text-muted"
              title={`Frame resolution: ${animSizeFor(sector, quality)}`}
            >
              Size
              <select
                className={selectClass}
                value={quality}
                onChange={(e) => setQuality(e.target.value as SatQuality)}
              >
                <option value="small">Small</option>
                <option value="large">Large</option>
              </select>
            </label>

            <span className="text-xs text-faint" title="What this loop downloads">
              {humanBytes(weight)}
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t border-line pt-3 text-xs text-muted">
          {meta.descriptor}. New frames roughly every {spec.cadenceMinutes} minutes, picked up
          automatically.{' '}
          <a className="text-primary hover:underline" href={satelliteFullUrl(sector, band)} target="_blank" rel="noreferrer">
            Open full resolution ({fullSizeFor(sector, band)})
          </a>{' '}
          · {GOES_WEST.replace('GOES', 'GOES-')} via NOAA NESDIS STAR. Keys: 1–8 channel, V view, C
          combine, B browse, A animate, space play/pause, ← → step frames.
        </div>
      )}

      <GuideTicker bands={shown} className="border-t border-line pt-2.5" />

      {focus && (
        <FigureViewer
          src={
            focus.panel === null
              ? (animate ? (loop.current ?? stillUrl) : stillUrl)
              : (grid.urls?.[focus.panel] ?? '')
          }
          alt={`${bandSpec(focus.panel === null ? band : panels[focus.panel]).label} over ${spec.label}`}
          caption={`${bandSpec(focus.panel === null ? band : panels[focus.panel]).label} · ${spec.label}${
            active.stamp ? ` · ${hstDateTime(active.stamp.toISOString())} HST` : ''
          }`}
          origin={focus.origin}
          onClose={() => setFocus(null)}
        />
      )}
    </div>
  )
}
