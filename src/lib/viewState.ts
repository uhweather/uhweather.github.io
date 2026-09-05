import { useSyncExternalStore } from 'react'
import { DEFAULT_PANEL_BANDS, SAT_BANDS, SAT_SECTORS, type SatBand, type SatSector } from './sources'

/**
 * The satellite view, shared across pages.
 *
 * The overview and the full viewer are two windows onto the same question — what
 * is the sky doing, and over what area — so choosing an area in one and finding
 * the other still on something else is just friction. A module-level store keeps
 * them in step without threading a provider through the tree, and persisting it
 * means a display that reboots comes back to the view it was set to.
 */

/** One persisted, subscribable value. */
function store<T>(key: string, fallback: T, parse: (raw: string) => T | null) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return (raw && parse(raw)) || fallback
    } catch {
      // Private mode and blocked site data both throw on access.
      return fallback
    }
  }

  let value = read()
  const listeners = new Set<() => void>()

  const set = (next: T) => {
    if (next === value) return
    value = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Persistence is a convenience; the store still works in memory.
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }

  const useValue = () =>
    useSyncExternalStore(
      subscribe,
      () => value,
      () => fallback,
    )

  return { get: () => value, set, useValue }
}

/* ------------------------------------------------------------------ sector */

/** Opens on the Northeast Pacific: it shows the systems heading for the islands,
 *  and the close view is one click away. */
const DEFAULT_SECTOR: SatSector = 'tpw'

const sectorStore = store<SatSector>('weather-glass:sector', DEFAULT_SECTOR, (raw) => {
  // Written unquoted by earlier builds; accept both.
  const v = (raw.startsWith('"') ? (JSON.parse(raw) as string) : raw) as SatSector
  return SAT_SECTORS.some((s) => s.id === v) ? v : null
})

export const setSharedSector = sectorStore.set

export function useSharedSector(): [SatSector, (s: SatSector) => void] {
  return [sectorStore.useValue(), sectorStore.set]
}

/* ------------------------------------------------------------------ panels */

/**
 * The four channels of the 2×2, chosen per panel.
 *
 * NESDIS's sector page lays every channel out at once and leaves the comparison
 * to you. The useful move on a fixed display is narrower: pick the four worth
 * watching side by side and leave them there. The set is shared between the
 * overview and the viewer's 2×2 so both show the same comparison, and persisted
 * so a display keeps it across a reboot. It starts on the legacy site's combine
 * set: the three water-vapour levels plus infrared.
 */
export const DEFAULT_PANELS = DEFAULT_PANEL_BANDS

const isBand = (v: unknown): v is SatBand => SAT_BANDS.some((b) => b.id === v)

const panelStore = store<SatBand[]>('weather-glass:panels', DEFAULT_PANELS, (raw) => {
  const v: unknown = JSON.parse(raw)
  return Array.isArray(v) && v.length === 4 && v.every(isBand) ? (v as SatBand[]) : null
})

export function useSharedPanels(): [SatBand[], (index: number, band: SatBand) => void] {
  const panels = panelStore.useValue()
  const setPanel = (index: number, band: SatBand) => {
    const next = panels.slice()
    next[index] = band
    panelStore.set(next)
  }
  return [panels, setPanel]
}

/* ------------------------------------------------------------------ layout */

/**
 * Single channel or the 2×2, persisted.
 *
 * The sector and the four channels already survive a reboot; the layout they are
 * arranged in is part of the same setting. A display that comes back from a
 * power cut on a different view from the one it was left on is a display someone
 * has to walk over to.
 */
const combineStore = store<boolean>('weather-glass:combine', false, (raw) => {
  const v: unknown = JSON.parse(raw)
  return typeof v === 'boolean' ? v : null
})

export function useSharedCombine(): [boolean, (v: boolean) => void] {
  return [combineStore.useValue(), combineStore.set]
}
