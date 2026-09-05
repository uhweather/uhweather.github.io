import { nws, type TextProduct } from './nws'

/**
 * Central and Eastern Pacific tropical products.
 *
 * An earlier note in this project said the NWS API carries no Central Pacific
 * tropical products. That was wrong, and it came from guessing product codes
 * (`TWOCP`, `TCDCP`) rather than reading the catalogue: the codes are `TCP`,
 * `TCD` and `TWO`, and the basin is a *location* — `CP` for the outlook, `CP4`
 * or `EP1` for an individual system. All of it is live, and CORS-open, which
 * means the advisories themselves can be shown here rather than linked to.
 *
 * Offices: PHFO is the Central Pacific Hurricane Center, KNHC the National
 * Hurricane Center. PGUM is Guam — the western Pacific, a different ocean from
 * the point of view of anyone reading this.
 */
const PACIFIC_OFFICES = ['PHFO', 'KNHC']

/** How recent an advisory must be for its system to count as active. */
const ACTIVE_WITHIN_HOURS = 12

export interface StormSummary {
  /** WMO header — one per system, which is what groups the advisories. */
  header: string
  productId: string
  issuedAt: string
  office: string
  /** "Hurricane Lowell", "Tropical Storm Iona". */
  name: string | null
  /** Advisory number as printed, including intermediate letters. */
  advisory: string | null
  /** ATCF identifier, e.g. EP122026 — the key to the satellite floater. */
  atcf: string | null
  /** The ...ALL CAPS... headline lines, as one sentence. */
  headline: string | null
  position: string | null
  movement: string | null
  winds: string | null
  pressure: string | null
  /** "615 MI...990 KM SSW OF LIHUE HAWAII" lines. */
  distances: string[]
  watches: string | null
  text: string
}

/**
 * Teletype units into something readable.
 *
 * Advisories are written in caps for a printer: `160 MPH...260 KM/H`,
 * `922 MB...27.23 INCHES`, `W OR 275 DEGREES AT 7 MPH`. The numbers are relayed
 * exactly as issued — only the shouting and the `...` separator are undone.
 */
const UNITS: [RegExp, string][] = [
  [/\bMPH\b/g, 'mph'],
  [/\bKM\/H\b/g, 'km/h'],
  [/\bKT\b/g, 'kt'],
  [/\bMB\b/g, 'mb'],
  [/\bINCHES\b/g, 'in'],
  [/\bMI\b/g, 'mi'],
  [/\bKM\b/g, 'km'],
]

export function tidy(value: string): string {
  let out = value.replace(/\.\.\./g, ' · ')
  for (const [re, to] of UNITS) out = out.replace(re, to)
  out = out.replace(/(\d+)\s+DEGREES/g, '$1°')
  out = out.replace(/\bOR\b/g, 'or').replace(/\bAT\b/g, 'at')
  // Place names should read as names rather than as a shout.
  out = out.replace(/\bOF\s+(.+)$/i, (_, place: string) =>
    `of ${place.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())}`,
  )
  return out
}

/** "13.3N 161.4W" -> "13.3°N 161.4°W". */
export const tidyPosition = (value: string) =>
  value.replace(/(\d+(?:\.\d+)?)\s*([NSEW])/g, '$1°$2')

/** Pull one `KEY...value` line out of the advisory's summary block. */
const field = (text: string, key: string) =>
  text.match(new RegExp(`^${key}\\.\\.\\.(.+)$`, 'mi'))?.[1].trim() ?? null

export function parseAdvisory(product: TextProduct): StormSummary {
  const text = product.productText ?? ''

  const name =
    text.match(
      /^\s*((?:Potential Tropical Cyclone|Post-Tropical Cyclone|Remnants of|Tropical Depression|Tropical Storm|Hurricane|Major Hurricane)[^\n]*?)\s+(?:Special\s+)?(?:Intermediate\s+)?Advisory/im,
    )?.[1] ?? null

  const advisory = text.match(/Advisory Number\s+(\S+)/i)?.[1] ?? null
  const atcf = text.match(/\b((?:AL|EP|CP)\d{6})\b/)?.[1] ?? null

  // The headline is one or more ...SHOUTED... lines; join them into a sentence.
  const headline =
    text
      .match(/^\.\.\.[\s\S]*?\.\.\.$/gm)
      ?.map((l) => l.replace(/^\.\.\.|\.\.\.$/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' · ') || null

  const distances = [...text.matchAll(/^ABOUT\s+(.+)$/gim)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim(),
  )

  const watches =
    text
      .match(/WATCHES AND WARNINGS\s*-+\s*([\s\S]*?)\n\s*\n/i)?.[1]
      ?.replace(/\s+/g, ' ')
      .trim() ?? null

  return {
    header: product.wmoCollectiveId ?? product.id,
    productId: product.id,
    issuedAt: product.issuanceTime,
    office: product.issuingOffice,
    name,
    advisory,
    atcf,
    headline,
    position: field(text, 'LOCATION'),
    movement: field(text, 'PRESENT MOVEMENT'),
    winds: field(text, 'MAXIMUM SUSTAINED WINDS'),
    pressure: field(text, 'MINIMUM CENTRAL PRESSURE'),
    distances,
    watches,
    text,
  }
}

/**
 * Systems with an advisory in the last twelve hours.
 *
 * Grouped by WMO header and reduced to the newest of each: an advisory series
 * runs every six hours with intermediate updates between, so the newest under a
 * header is the current state of that system.
 */
export async function activeStorms(): Promise<StormSummary[]> {
  const recent = await nws.recentProducts('TCP', 40)
  const cutoff = Date.now() - ACTIVE_WITHIN_HOURS * 3600_000

  const newest = new Map<string, TextProduct>()
  for (const p of recent) {
    if (!PACIFIC_OFFICES.includes(p.issuingOffice)) continue
    if (new Date(p.issuanceTime).getTime() < cutoff) continue
    const key = p.wmoCollectiveId ?? p.id
    const held = newest.get(key)
    if (!held || new Date(p.issuanceTime) > new Date(held.issuanceTime)) newest.set(key, p)
  }

  const full = await Promise.all([...newest.values()].map((p) => nws.product(p.id)))
  return full
    .map(parseAdvisory)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
}
