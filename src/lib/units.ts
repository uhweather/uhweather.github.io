/**
 * Unit handling.
 *
 * The NWS API answers in SI (degC, km/h, Pa, m). The legacy site let readers
 * flip temperature between C/K/F and wind between mph/kt/m·s⁻¹, so we keep that
 * affordance rather than hard-coding one system.
 */
import type { QuantitativeValue } from './nws'

export type TempUnit = 'F' | 'C' | 'K'
export type SpeedUnit = 'mph' | 'kt' | 'm/s'

export const TEMP_UNITS: TempUnit[] = ['F', 'C', 'K']
export const SPEED_UNITS: SpeedUnit[] = ['mph', 'kt', 'm/s']

/** Celsius -> requested temperature unit. */
export function convertTemp(c: number, to: TempUnit): number {
  switch (to) {
    case 'C':
      return c
    case 'K':
      return c + 273.15
    case 'F':
      return (c * 9) / 5 + 32
  }
}

/** km/h -> requested speed unit. */
export function convertSpeed(kmh: number, to: SpeedUnit): number {
  switch (to) {
    case 'mph':
      return kmh * 0.621371
    case 'kt':
      return kmh * 0.539957
    case 'm/s':
      return kmh / 3.6
  }
}

/** Pascals -> millibars (hPa), the unit every Pacific forecaster actually uses. */
export const paToMb = (pa: number) => pa / 100

/** Meters -> statute miles. */
export const mToMiles = (m: number) => m / 1609.344

/** 16-point compass label from meteorological degrees (direction wind is FROM). */
const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]
export function compass(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16]
}

/**
 * Read a QuantitativeValue, converting from whatever unitCode NWS used.
 * Returns null for missing data so callers can render an explicit gap rather
 * than a misleading zero.
 */
export function readTemp(q: QuantitativeValue | undefined, to: TempUnit): number | null {
  if (!q || q.value === null) return null
  const c = q.unitCode.includes('degF') ? ((q.value - 32) * 5) / 9 : q.value
  return convertTemp(c, to)
}

export function readSpeed(q: QuantitativeValue | undefined, to: SpeedUnit): number | null {
  if (!q || q.value === null) return null
  // NWS uses km_h-1 for wind; some stations report m_s-1.
  const kmh = q.unitCode.includes('m_s-1') ? q.value * 3.6 : q.value
  return convertSpeed(kmh, to)
}

export function readPressureMb(q: QuantitativeValue | undefined): number | null {
  if (!q || q.value === null) return null
  return paToMb(q.value)
}

/** Format a number to n decimals, or an em dash when the reading is absent. */
export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

const HST = 'Pacific/Honolulu'

export function hstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: HST,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function hstDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: HST,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "12 min ago" — makes staleness obvious, which the old site never did. */
export function relativeAge(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.round(hrs / 24)} d ago`
}
