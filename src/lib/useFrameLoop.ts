import { useEffect, useMemo, useRef, useState } from 'react'

const EMPTY_FRAMES: string[] = []
const LAST_FRAME_HOLD_MS = 1000
import {
  frameCandidates,
  frameKey,
  parseFrameTime,
  sectorSpec,
  type SatBand,
  type SatQuality,
  type SatSector,
} from './sources'

/**
 * Preload frames, reporting which ones actually exist.
 *
 * Frame names are derived from the clock, so a name may point at a scan that was
 * never published. Requests get three attempts before a failed scan is left
 * out, and playback runs on what remains. Preloading warms the browser cache;
 * the browser owns decoded-image eviction when memory is tight.
 *
 * The loop is replaced in one go, when the whole new set is in. The refresh
 * clock hands over a fresh list of names every cadence, and swapping frame by
 * frame meant an unattended display dropped back to "Loading 3 of 36" and
 * stopped playing every ten minutes — the one thing a display nobody is watching
 * must not do. `series` says when the change is a different product rather than
 * the same one moved on: on a new product the old frames are dropped
 * immediately, because showing infrared while the reader waits for the visible
 * channel they asked for is worse than a blank.
 */
function usePreloadedFrames(urls: string[], series: string) {
  const [progress, setProgress] = useState({ loaded: 0, total: urls.length })
  const [ok, setOk] = useState<string[]>([])
  const shown = useRef(series)
  const available = useRef(new Set<string>())

  useEffect(() => {
    if (shown.current !== series) {
      shown.current = series
      setOk([])
      available.current.clear()
    }

    if (!urls.length) {
      available.current.clear()
      setOk([])
      setProgress({ loaded: 0, total: 0 })
      return
    }

    let cancelled = false
    let next = 0
    const attempts = new Map<string, number>()
    const checked = new Set(urls.filter((u) => available.current.has(u)))
    let publishedFirstPass = false
    const good = new Set(urls.filter((u) => available.current.has(u)))
    const pending = urls.filter((u) => !good.has(u))
    let done = good.size
    const active = new Set<() => void>()
    const report = () => {
      setProgress({ loaded: done, total: urls.length })
      if (done === urls.length || (!publishedFirstPass && checked.size === urls.length)) {
        publishedFirstPass = true
        // Publish the first pass without waiting for retries; replace it once
        // recovery finishes. Keep the previous generation during refresh.
        available.current = good
        setOk(urls.filter((u) => good.has(u)))
      }
    }
    report()

    // Limit simultaneous requests and release image handlers as each settles.
    // Immutable satellite URLs already loaded need no new preload on refresh.
    const pump = () => {
      while (!cancelled && active.size < 4 && next < pending.length) {
        const u = pending[next++]
        attempts.set(u, (attempts.get(u) ?? 0) + 1)
        const img = new Image()
        let settled = false
        const release = () => {
          window.clearTimeout(timeout)
          img.onload = null
          img.onerror = null
          img.removeAttribute('src')
          active.delete(release)
        }
        const tick = (exists: boolean) => {
          if (cancelled || settled) return
          settled = true
          release()
          checked.add(u)
          if (!exists && attempts.get(u)! < 3) {
            pending.push(u)
            report()
            pump()
            return
          }
          done += 1
          if (exists) good.add(u)
          report()
          pump()
        }
        // A hung request must not prevent all other frames from becoming ready.
        const timeout = window.setTimeout(() => tick(false), 20_000)
        active.add(release)
        img.onload = () => tick(true)
        img.onerror = () => tick(false)
        img.src = u
      }
    }
    pump()

    return () => {
      cancelled = true
      active.forEach((release) => release())
    }
  }, [urls, series])

  return {
    ok,
    loaded: progress.loaded,
    total: progress.total,
    ready: ok.length > 0,
    settling: progress.total > 0 && progress.loaded < progress.total,
  }
}

/**
 * A ticking clock at the imagery cadence.
 *
 * Auto-refresh is not a mode here, it is the only mode. Frame names are derived
 * from the current time, so recomputing them on this interval is what makes a
 * loop pick up new scans — and the interval keeps running in a background tab,
 * which is the whole point of a display nobody is watching. NESDIS makes this a
 * checkbox that reloads the page; nothing here needs reloading, so there is
 * nothing to switch on.
 */
export function useNow(cadenceMinutes: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), cadenceMinutes * 60_000)
    return () => clearInterval(id)
  }, [cadenceMinutes])
  return now
}

/** Playback over a list of frames. */
function usePlayback(frames: string[], speed: number, enabled: boolean) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (frames.length) setIndex(frames.length - 1)
  }, [frames])

  useEffect(() => {
    if (!playing || !enabled || frames.length < 2) return
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % frames.length),
      index >= frames.length - 1 ? Math.max(speed, LAST_FRAME_HOLD_MS) : speed,
    )
    return () => window.clearTimeout(timer)
  }, [index, playing, speed, enabled, frames])

  const jump = (to: number) => {
    setPlaying(false)
    setIndex(Math.max(0, Math.min(frames.length - 1, to)))
  }

  return { index, playing, setPlaying, jump }
}

/** A single-channel animation that keeps itself current. */
export function useFrameLoop({
  sector,
  band,
  frames: frameCount = 24,
  step = 1,
  speed = 300,
  quality = 'small',
  enabled = true,
}: {
  sector: SatSector
  band: SatBand
  /** Number of consecutive scans in the loop. */
  frames?: number
  step?: number
  speed?: number
  quality?: SatQuality
  enabled?: boolean
}) {
  const now = useNow(sectorSpec(sector).cadenceMinutes)
  const candidates = useMemo(
    () =>
      enabled
        ? frameCandidates(sector, band, { frames: frameCount, step, quality, now })
        : [],
    [sector, band, frameCount, step, quality, enabled, now],
  )
  const { loaded, ready, ok, total, settling } = usePreloadedFrames(
    candidates,
    `${sector}/${band}/${quality}/${frameCount}/${step}`,
  )
  const { index, playing, setPlaying, jump } = usePlayback(ok, speed, enabled)

  const current = ok.length ? ok[Math.min(index, ok.length - 1)] : null
  const empty = !ready && !settling && total > 0
  return {
    frames: ok,
    index,
    playing,
    setPlaying,
    jump,
    current,
    stamp: current ? parseFrameTime(current) : null,
    ready,
    loaded,
    total,
    isLoading: !ready && settling,
    isError: empty,
    error: empty ? new Error('No frames published for this product yet.') : null,
    refetch: () => {},
  }
}

/**
 * Four channels of one sector, playing as a single loop.
 *
 * The panels must be on the same moment for a comparison between levels to mean
 * anything, so the channels' frames are intersected by timestamp rather than
 * played independently — a scan missing from one channel drops out of the loop
 * instead of putting the panels out of step.
 */
export function useCombinedLoop({
  sector,
  bands,
  frames: frameCount = 24,
  step = 1,
  speed = 300,
  quality = 'small',
  enabled = true,
}: {
  sector: SatSector
  bands: SatBand[]
  frames?: number
  step?: number
  speed?: number
  quality?: SatQuality
  enabled?: boolean
}) {
  const now = useNow(sectorSpec(sector).cadenceMinutes)
  const bandsKey = bands.join(',')

  const candidates = useMemo(
    () =>
      enabled
        ? bands.flatMap((b) =>
            frameCandidates(sector, b, { frames: frameCount, step, quality, now }),
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sector, bandsKey, frameCount, step, quality, enabled, now],
  )

  const { loaded, ready, ok, total, settling } = usePreloadedFrames(
    candidates,
    `${sector}/${bandsKey}/${quality}/${frameCount}/${step}`,
  )

  const sets = useMemo(() => {
    if (!ok.length) return []
    const good = new Set(ok)
    const perBand = bands.map((b) =>
      new Map(
        frameCandidates(sector, b, { frames: frameCount, step, quality, now })
          .filter((u) => good.has(u))
          .map((u) => [frameKey(u), u] as const),
      ),
    )
    const keys = [...perBand[0].keys()].filter((k) => perBand.every((m) => m.has(k))).sort()
    return keys.map((k) => ({ key: k, urls: perBand.map((m) => m.get(k)!) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, sector, bandsKey, frameCount, step, quality, now])

  const keys = useMemo(() => sets.map((s) => s.key), [sets])
  const [buffering, setBuffering] = useState(false)
  const { index, playing, setPlaying, jump } = usePlayback(keys, speed, enabled && !buffering)

  const currentSet = sets.length ? sets[Math.min(index, sets.length - 1)] : null
  const empty = ready && sets.length === 0
  return {
    sets,
    index,
    jump,
    playing,
    setPlaying,
    urls: currentSet?.urls ?? null,
    setBuffering,
    stamp: currentSet ? parseFrameTime(`${currentSet.key}_`) : null,
    ready: sets.length > 0,
    loaded,
    total,
    isLoading: sets.length === 0 && settling,
    isError: empty,
    error: empty ? new Error('No frames published for these channels yet.') : null,
    refetch: () => {},
  }
}

/**
 * Radar playback from the RIDGE frame series.
 *
 * RIDGE publishes ten discrete frames per site or region — `_0` is the newest,
 * `_9` the oldest. Reading them directly is what makes real transport controls
 * possible: the pre-rendered `_loop.gif` plays at a fixed rate and cannot be
 * paused, stepped or scrubbed. The names are reused as new scans arrive, so a
 * token that changes on an interval is needed to pick up new data without
 * defeating the cache during a playback cycle.
 */
export function useRadarLoop({
  site,
  speed = 400,
  refreshMinutes = 6,
  enabled = true,
}: {
  site: string
  speed?: number
  refreshMinutes?: number
  enabled?: boolean
}) {
  const generation = useNow(refreshMinutes)
  const urls = useMemo(
    () =>
      Array.from(
        { length: 10 },
        (_, i) =>
          `https://radar.weather.gov/ridge/standard/${site}_${9 - i}.gif?_=${generation}`,
      ),
    [site, generation],
  )
  const { loaded, ready, ok, total } = usePreloadedFrames(enabled ? urls : EMPTY_FRAMES, site)
  const { index, playing, setPlaying, jump } = usePlayback(ok, speed, enabled)
  return {
    frames: ok,
    index,
    playing,
    setPlaying,
    jump,
    current: ok.length ? ok[Math.min(index, ok.length - 1)] : null,
    ready,
    loaded,
    total,
  }
}
