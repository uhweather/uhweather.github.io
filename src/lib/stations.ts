/**
 * Hawai‘i surface observation network.
 *
 * These are the ASOS/AWOS sites the legacy Weather Server tabulated, filtered
 * to those api.weather.gov actually serves today. Grouped by island so the
 * observations table reads geographically instead of alphabetically.
 */

export interface Station {
  id: string
  /** Short display name — the airport codes mean nothing to most readers. */
  name: string
  island: Island
  /** Field elevation in feet, matching the legacy table's ELV column. */
  elevationFt: number
  lat: number
  lon: number
}

export type Island = 'Kaua‘i' | 'O‘ahu' | 'Maui County' | 'Hawai‘i Island'

export const ISLANDS: Island[] = ['Kaua‘i', 'O‘ahu', 'Maui County', 'Hawai‘i Island']

export const STATIONS: Station[] = [
  { id: 'PHLI', name: 'Līhu‘e', island: 'Kaua‘i', elevationFt: 148, lat: 21.9839, lon: -159.3389 },
  { id: 'PHBK', name: 'Barking Sands', island: 'Kaua‘i', elevationFt: 13, lat: 22.0228, lon: -159.7856 },

  { id: 'PHNL', name: 'Honolulu (HNL)', island: 'O‘ahu', elevationFt: 10, lat: 21.3242, lon: -157.9294 },
  { id: 'PHJR', name: 'Kalaeloa', island: 'O‘ahu', elevationFt: 33, lat: 21.3075, lon: -158.0703 },
  { id: 'PHNG', name: 'Kāne‘ohe Bay MCAS', island: 'O‘ahu', elevationFt: 16, lat: 21.4508, lon: -157.7681 },
  { id: 'PHHI', name: 'Wheeler AAF', island: 'O‘ahu', elevationFt: 837, lat: 21.4836, lon: -158.0397 },

  { id: 'PHOG', name: 'Kahului', island: 'Maui County', elevationFt: 52, lat: 20.8986, lon: -156.4306 },
  { id: 'PHMK', name: 'Moloka‘i', island: 'Maui County', elevationFt: 453, lat: 21.1528, lon: -157.0964 },
  { id: 'PHNY', name: 'Lāna‘i City', island: 'Maui County', elevationFt: 1309, lat: 20.7856, lon: -156.9514 },

  { id: 'PHTO', name: 'Hilo', island: 'Hawai‘i Island', elevationFt: 36, lat: 19.7192, lon: -155.0533 },
  { id: 'PHKO', name: 'Kona (Keāhole)', island: 'Hawai‘i Island', elevationFt: 43, lat: 19.7385, lon: -156.0456 },
  { id: 'PHMU', name: 'Waimea–Kohala', island: 'Hawai‘i Island', elevationFt: 2671, lat: 20.0014, lon: -155.6680 },
  { id: 'PHSF', name: 'Bradshaw AAF', island: 'Hawai‘i Island', elevationFt: 6138, lat: 19.7601, lon: -155.5544 },
]

export const STATIONS_BY_ID = new Map(STATIONS.map((s) => [s.id, s]))

/** The site's default "current conditions" station, as on the legacy homepage. */
export const PRIMARY_STATION = 'PHNL'

export interface ForecastLocation {
  label: string
  lat: number
  lon: number
}

/** Points used for the forecast picker — one per major population centre. */
export const FORECAST_LOCATIONS: ForecastLocation[] = [
  { label: 'Honolulu', lat: 21.3099, lon: -157.8581 },
  { label: 'Kāne‘ohe', lat: 21.4022, lon: -157.7394 },
  { label: 'Kapolei', lat: 21.3356, lon: -158.0578 },
  { label: 'Līhu‘e', lat: 21.9811, lon: -159.3711 },
  { label: 'Kahului', lat: 20.8893, lon: -156.4729 },
  { label: 'Lahaina', lat: 20.8783, lon: -156.6825 },
  { label: 'Hilo', lat: 19.7297, lon: -155.09 },
  { label: 'Kailua-Kona', lat: 19.6400, lon: -155.9969 },
  { label: 'Waimea', lat: 20.0233, lon: -155.6659 },
]
