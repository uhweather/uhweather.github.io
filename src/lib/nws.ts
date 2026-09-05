/**
 * Client for api.weather.gov.
 *
 * Every endpoint here is public, key-free, HTTPS, and sends
 * `access-control-allow-origin: *` — which is the whole reason this site needs
 * no backend. The legacy weather.hawaii.edu CGI existed largely to fetch and
 * re-serve this same data; the browser can now do it directly.
 */

const API = 'https://api.weather.gov'

/** NWS asks for an identifying User-Agent. Browsers send their own and forbid
 *  overriding it, so we pass identification in the Accept profile instead. */
const HEADERS: HeadersInit = { Accept: 'application/geo+json' }

export class NwsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'NwsError'
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    headers: HEADERS,
  })
  if (!res.ok) {
    throw new NwsError(`${res.status} ${res.statusText} for ${path}`, res.status)
  }
  return res.json() as Promise<T>
}

/* ------------------------------------------------------------------ types */

export interface QuantitativeValue {
  value: number | null
  unitCode: string
  qualityControl?: string
}

export interface Observation {
  station: string
  timestamp: string
  textDescription: string | null
  icon: string | null
  temperature: QuantitativeValue
  dewpoint: QuantitativeValue
  windDirection: QuantitativeValue
  windSpeed: QuantitativeValue
  windGust: QuantitativeValue
  barometricPressure: QuantitativeValue
  seaLevelPressure: QuantitativeValue
  visibility: QuantitativeValue
  relativeHumidity: QuantitativeValue
  heatIndex: QuantitativeValue
}

export interface ForecastPeriod {
  number: number
  name: string
  startTime: string
  endTime: string
  isDaytime: boolean
  temperature: number
  temperatureUnit: string
  probabilityOfPrecipitation: QuantitativeValue
  windSpeed: string
  windDirection: string
  icon: string
  shortForecast: string
  detailedForecast: string
}

export interface Forecast {
  updated: string
  generatedAt: string
  periods: ForecastPeriod[]
}

export interface Alert {
  id: string
  areaDesc: string
  severity: string
  certainty: string
  urgency: string
  event: string
  headline: string | null
  description: string
  instruction: string | null
  effective: string
  expires: string
  senderName: string
}

export interface PointInfo {
  gridId: string
  gridX: number
  gridY: number
  forecast: string
  forecastHourly: string
  timeZone: string
  radarStation: string
}

export interface TextProduct {
  id: string
  wmoCollectiveId: string | null
  issuingOffice: string
  issuanceTime: string
  productCode: string
  productName: string
  productText?: string
}

/* -------------------------------------------------------------- endpoints */

export const nws = {
  point: (lat: number, lon: number) =>
    get<{ properties: PointInfo }>(
      `/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
    ).then((r) => r.properties),

  // No require_qc parameter: passing it (either value) makes this endpoint 404.
  latestObservation: (stationId: string) =>
    get<{ properties: Observation }>(
      `/stations/${stationId}/observations/latest`,
    ).then((r) => r.properties),

  recentObservations: (stationId: string, limit = 8) =>
    get<{ features: { properties: Observation }[] }>(
      `/stations/${stationId}/observations?limit=${limit}`,
    ).then((r) => r.features.map((f) => f.properties)),

  /**
   * Newest observation that actually carries readings.
   *
   * ASOS sites routinely file partial reports: PHNL regularly publishes a METAR
   * whose only populated field is a wind gust, with `qualityControl: "Z"`
   * (missing) everywhere else. Rendering that verbatim gives a panel of em
   * dashes while a complete observation from an hour earlier sits one request
   * away. We fall back to the newest complete report rather than merging fields
   * across timestamps — a blended observation would be meteorologically wrong —
   * and callers surface its time so staleness stays visible.
   */
  async latestUsableObservation(stationId: string): Promise<Observation | null> {
    const obs = await this.recentObservations(stationId, 8)
    return obs.find((o) => o.temperature?.value !== null) ?? obs[0] ?? null
  },

  forecast: (office: string, x: number, y: number) =>
    get<{ properties: Forecast }>(
      `/gridpoints/${office}/${x},${y}/forecast`,
    ).then((r) => r.properties),

  hourlyForecast: (office: string, x: number, y: number) =>
    get<{ properties: Forecast }>(
      `/gridpoints/${office}/${x},${y}/forecast/hourly`,
    ).then((r) => r.properties),

  activeAlerts: (area = 'HI') =>
    get<{ features: { properties: Alert }[] }>(
      `/alerts/active?area=${area}`,
    ).then((r) => r.features.map((f) => f.properties)),

  /** Index of a text product type (AFD, HWO, SRF…) for an office. */
  productList: (type: string, location: string) =>
    get<{ '@graph'?: TextProduct[] }>(
      `/products/types/${type}/locations/${location}`,
    ).then((r) => r['@graph'] ?? []),

  /** Full body of a single text product. */
  product: (id: string) => get<TextProduct>(`/products/${id}`),

  /**
   * Recent products of a type across every office.
   *
   * One request instead of one per storm slot: tropical advisories are issued
   * under a WMO header per system, so the newest of each header in this list is
   * the current advisory for that system.
   */
  recentProducts: (type: string, limit = 25) =>
    get<{ '@graph'?: TextProduct[] }>(`/products?type=${type}&limit=${limit}`).then(
      (r) => r['@graph'] ?? [],
    ),

  /** Convenience: newest text product of a type, body included. */
  async latestProduct(type: string, location: string) {
    const list = await this.productList(type, location)
    if (!list.length) return null
    return this.product(list[0].id)
  },
}
