import { DEFAULT_PANELS, DEFAULT_SECTOR } from './viewState'
import {
  FRAME_COUNTS,
  SAT_BANDS,
  SAT_SECTORS,
  STEPS,
  type SatBand,
  type SatQuality,
  type SatSector,
} from './sources'

/**
 * The satellite view as something you can put in a message.
 *
 * A comparison built here — this sector, these four channels, this loop length —
 * is a piece of work, and until now it lived only in one browser's local
 * storage. Writing it into the query string makes it a link: a forecaster can
 * send "look at this", a class can be pointed at one configuration, and a
 * display can be pinned to a view by its URL rather than by whoever last touched
 * the keyboard.
 *
 * Only what differs from the defaults is written, so the common case stays a
 * bare `/satellite` and a shared link says exactly what was changed about it.
 */
export interface SatelliteView {
  sector: SatSector
  combine: boolean
  band: SatBand
  panels: SatBand[]
  frames: number
  step: number
  speed: number
  quality: SatQuality
  animate: boolean
}

/** What the page opens on with nothing in the query string. */
export const DEFAULT_VIEW: SatelliteView = {
  sector: DEFAULT_SECTOR,
  combine: false,
  band: 'GEOCOLOR',
  panels: DEFAULT_PANELS,
  frames: 36,
  step: 1,
  speed: 150,
  quality: 'small',
  animate: true,
}

const isSector = (v: string): v is SatSector => SAT_SECTORS.some((s) => s.id === v)
const isBand = (v: string): v is SatBand => SAT_BANDS.some((b) => b.id === v)

/** Anything unrecognised falls back rather than throwing: a link can be old,
 *  truncated by a chat client, or typed by hand. */
export function readView(params: URLSearchParams, base: SatelliteView): SatelliteView {
  const sector = params.get('view')
  const band = params.get('band')
  const panels = params.get('panels')?.split(',').filter(isBand)
  const frames = Number(params.get('frames'))
  const step = Number(params.get('step'))
  const speed = Number(params.get('speed'))
  const quality = params.get('size')
  const layout = params.get('layout')
  const mode = params.get('mode')

  return {
    sector: sector && isSector(sector) ? sector : base.sector,
    combine: layout === 'grid' ? true : layout === 'one' ? false : base.combine,
    band: band && isBand(band) ? band : base.band,
    panels: panels?.length === 4 ? panels : base.panels,
    frames: (FRAME_COUNTS as readonly number[]).includes(frames) ? frames : base.frames,
    step: (STEPS as readonly number[]).includes(step) ? step : base.step,
    speed: speed >= 40 && speed <= 2000 ? speed : base.speed,
    quality: quality === 'large' || quality === 'small' ? quality : base.quality,
    animate: mode === 'still' ? false : mode === 'anim' ? true : base.animate,
  }
}

export function writeView(view: SatelliteView, defaults: SatelliteView): URLSearchParams {
  const params = new URLSearchParams()
  const put = (key: string, value: string, fallback: string) => {
    if (value !== fallback) params.set(key, value)
  }

  put('view', view.sector, defaults.sector)
  put('layout', view.combine ? 'grid' : 'one', defaults.combine ? 'grid' : 'one')
  // Only the half of the layout that is on screen: a link to a 2×2 carrying a
  // single-view channel is noise, and the reverse is worse.
  if (view.combine) put('panels', view.panels.join(','), defaults.panels.join(','))
  else put('band', view.band, defaults.band)
  put('mode', view.animate ? 'anim' : 'still', defaults.animate ? 'anim' : 'still')
  if (view.animate || view.combine) {
    put('frames', String(view.frames), String(defaults.frames))
    put('step', String(view.step), String(defaults.step))
    put('speed', String(view.speed), String(defaults.speed))
    put('size', view.quality, defaults.quality)
  }
  return params
}
