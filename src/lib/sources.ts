/**
 * Imagery catalog.
 *
 * Every URL here is HTTPS. That is not a style preference: GitHub Pages serves
 * over HTTPS, and browsers hard-block mixed content, so the legacy site's
 * http-only image endpoints could not be reused even if we wanted to. Each entry
 * points at the authoritative NOAA source the legacy server was itself mirroring.
 *
 * `<img>` loads are not subject to CORS, so these need no proxy — only HTTPS.
 */

export interface ImageSource {
  id: string
  label: string
  /** Longer explanation — the legacy site assumed you already knew the jargon. */
  blurb: string
  url: string
  /** Cache-bust interval hint in minutes; imagery cadence varies by product. */
  refreshMinutes: number
  credit: string
  creditUrl: string
}

const STAR = 'https://cdn.star.nesdis.noaa.gov'

/* ------------------------------------------------------- satellite imagery */

export type SatSector = 'hi' | 'tpw' | 'FD'
export type SatBand =
  | 'GEOCOLOR'
  | 'Sandwich'
  | 'AirMass'
  | 'DayNightCloudMicroCombo'
  | 'Dust'
  | 'FireTemperature'
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08'
  | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16'

interface SectorSpec {
  id: SatSector
  label: string
  /** Compact label for the one-click pill row. */
  short: string
  blurb: string
  /** Path segment under ABI/ — full disk is not under SECTOR/. */
  path: string
  /** Size token for the still view. */
  displaySize: string
  /** Size token used for animation frames. NESDIS offers the same two choices
   *  behind its Small/Large control; these are those sizes. */
  animSize: string
  animSizeLarge: string
  /** Measured bytes of a typical frame at each animation size, so the viewer
   *  can say what a loop will cost before it pulls it. */
  frameBytes: { small: number; large: number }
  /** Smallest published size, for the browse-all thumbnail matrix. */
  thumbSize: string
  /** Largest size published for every band in this sector. */
  fullSize: string
  /** Bands that publish something larger still. */
  fullSizeOverrides?: Partial<Record<SatBand, string>>
  /** Token used in per-frame filenames (case differs from the path). */
  frameToken: string
  /** Minutes between frames, for turning a duration into a frame count. */
  cadenceMinutes: number
  /** Native aspect ratio, so the viewer can reserve the right box. */
  aspect: number
}

/** Animation resolution, matching NESDIS's own Small/Large control. */
export type SatQuality = 'small' | 'large'

/** GOES-18 is the operational GOES-West satellite covering Hawai‘i.
 *  The legacy site still labelled its imagery "GOES-17", retired in 2023. */
export const GOES_WEST = 'GOES18'

/**
 * Sector names follow the legacy Weather Server's vocabulary so long-time
 * readers recognise them.
 *
 * `tpw` is the Hawai‘i-to-mainland view the legacy site called Northeast
 * Pacific: the islands sit left of centre with Baja and the West Coast on the
 * right. NESDIS's `np` sector, despite being named North Pacific, is centred on
 * the Gulf of Alaska and contains no part of Hawai‘i, so it is not offered here.
 */
export const SAT_SECTORS: SectorSpec[] = [
  {
    id: 'hi',
    label: 'Hawai‘i wide view',
    short: 'Hawai‘i',
    blurb: 'The islands and the surrounding ocean.',
    path: 'SECTOR/hi',
    displaySize: '1200x1200',
    animSize: '600x600',
    animSizeLarge: '1200x1200',
    frameBytes: { small: 90_000, large: 280_000 },
    thumbSize: '300x300',
    fullSize: '2400x2400',
    frameToken: 'hi',
    cadenceMinutes: 10,
    aspect: 1,
  },
  {
    id: 'tpw',
    label: 'Northeast Pacific',
    short: 'NE Pacific',
    blurb: 'The islands, the subtropical ridge and the West Coast.',
    path: 'SECTOR/tpw',
    displaySize: '1800x1080',
    animSize: '900x540',
    animSizeLarge: '1800x1080',
    frameBytes: { small: 340_000, large: 1_050_000 },
    thumbSize: '450x270',
    fullSize: '7200x4320',
    frameToken: 'tpw',
    cadenceMinutes: 10,
    aspect: 1800 / 1080,
  },
  {
    id: 'FD',
    label: 'Pacific Ocean (full disk)',
    short: 'Full Disk',
    blurb: 'Everything GOES-West can see, pole to pole.',
    path: 'FD',
    displaySize: '1808x1808',
    animSize: '678x678',
    animSizeLarge: '1808x1808',
    frameBytes: { small: 330_000, large: 1_700_000 },
    thumbSize: '339x339',
    fullSize: '5424x5424',
    fullSizeOverrides: { GEOCOLOR: '10848x10848' },
    frameToken: 'FD',
    cadenceMinutes: 10,
    aspect: 1,
  },
]

/**
 * NESDIS publishes the scale for each enhancement as a separate strip, grouped
 * by band. The three water-vapour channels share one, the infrared window
 * channels share another. GeoColor and the visible band have none — one is true
 * colour and the other is plain reflectance, so there is no quantity to label.
 *
 * A strip on its own is only half the story. Where NESDIS also publishes prose
 * explaining how to read the colours — the water-vapour reading guide, the
 * numbered Air Mass key — it is carried here as `key`/`keyItems` and shown with
 * the bar, because that is the part that turns a gradient into a measurement.
 * The descriptions are NESDIS's own wording, lightly trimmed; `guide` points at
 * the quick-reference PDF for each product.
 */
const COLORBAR = 'https://www.star.nesdis.noaa.gov/GOES/images/colorbars'
const DOCS = 'https://www.star.nesdis.noaa.gov/GOES/documents'

/** Shared by bands 8, 9 and 10 — the same enhancement at three levels. */
const WV_KEY =
  'Red through yellow is dry air; yellow through white and into blue is moist air; colder than white, including green, is cloud.'

export interface BandSpec {
  id: SatBand
  label: string
  short: string
  /** NESDIS's own one-line descriptor: wavelength and role. */
  descriptor: string
  /** Plain-language note shown under the imagery. */
  blurb: string
  /** What the product is for, in more detail — NESDIS's wording, trimmed. */
  about?: string
  colorbar?: string
  /** What the scale measures, for the image's alt text. */
  scale?: string
  /** How to read the colours — the text that complements the scale. */
  key?: string
  /** Numbered key, as published for the RGB composites. */
  keyItems?: string[]
  /** A second numbered key, where the product switches behaviour at night. */
  keyItemsAlt?: { title: string; items: string[] }
  /** NESDIS quick guide (PDF). */
  guide?: string
  /** Composites first, then the ABI bands in order. */
  group: 'composite' | 'band'
  /** Shown in the one-click channel row; the rest live in the dropdowns. */
  featured?: boolean
}

const WV_ABOUT =
  'The ABI splits what was a single GOES-13 water-vapour channel into upper (8), middle (9) and lower (10) troposphere, so a level can be looked at on its own.'

export const SAT_BANDS: BandSpec[] = [
  {
    id: 'GEOCOLOR',
    label: 'GeoColor',
    short: 'GeoColor',
    descriptor: 'True colour by day, multispectral IR at night',
    blurb: 'True colour by day, IR with city lights at night.',
    about:
      'Daytime imagery looks approximately as it would to the human eye from space. At night blue shows liquid-water cloud such as fog and stratus, grey to white shows higher ice cloud, and the city lights come from a fixed VIIRS Day/Night Band compilation — they are not a live depiction. Developed at CIRA and STAR/RAMMB; credit CIRA/NOAA.',
    guide: `${DOCS}/QuickGuide_CIRA_Geocolor_20171019.pdf`,
    group: 'composite',
    featured: true,
  },
  {
    id: 'Sandwich',
    label: 'Sandwich RGB',
    short: 'Sandwich',
    descriptor: 'Visible band 3 texture under IR band 13 colour',
    blurb: 'Visible cloud texture with infrared temperature colour laid over it.',
    about:
      'Combines the high spatial detail of visible band 3 with the temperature information of IR band 13, which makes the cloud-top features of mature convective storms — the ones related to severity — readable in one image.',
    colorbar: `${COLORBAR}/ColorBar450_Sandwich_horz.png`,
    scale: 'cloud-top temperature in °C',
    guide: `${DOCS}/SandwichProduct.pdf`,
    group: 'composite',
    featured: true,
  },
  {
    id: 'AirMass',
    label: 'Air Mass RGB',
    short: 'Air Mass',
    descriptor: 'RGB built from IR and water-vapour bands',
    blurb: 'Separates tropical, polar and stratospheric air masses.',
    about:
      'Diagnoses the environment around synoptic systems by enhancing the temperature and moisture character of air masses. Cyclogenesis can be inferred from warm, dry, ozone-rich descending stratospheric air associated with jet streams and potential-vorticity anomalies, which also makes it a check on PV anomalies in model data. It separates polar from tropical air, especially along upper-level frontal boundaries.',
    colorbar: `${COLORBAR}/ColorBar450AirMass_horz.png`,
    scale: 'air-mass RGB composite',
    keyItems: [
      'Jet stream, potential vorticity, deformation zones, dry upper level (dark red / orange)',
      'Cold air mass (dark blue / purple)',
      'Warm air mass (green)',
      'Warm air mass, less moisture (olive / dark orange)',
      'High thick cloud (white)',
      'Mid-level cloud (tan / salmon)',
      'Low-level cloud (green, dark blue)',
      'Limb effects (purple / blue)',
    ],
    guide: `${DOCS}/QuickGuide_GOESR_AirMassRGB_final.pdf`,
    group: 'composite',
    featured: true,
  },
  {
    id: 'DayNightCloudMicroCombo',
    label: 'Day/Night Cloud Micro Combo',
    short: 'Cloud phase',
    descriptor: 'Cloud-top phase by day, fog and low cloud at night',
    blurb: 'Cloud phase in daylight; separates fog from low cloud after dark.',
    about:
      'One product carrying two RGBs. By day, Day Cloud Phase Distinction reads the phase of cooling cloud tops — convective initiation, storm growth and decay — and picks out snow on the ground. By night, Nighttime Microphysics separates fog from low stratus, the distinction aviation forecasting turns on and the one plain infrared cannot make.',
    colorbar: `${COLORBAR}/ColorBar450DNCMCombo_horz.png`,
    scale: 'day and night cloud RGB',
    keyItems: [
      'Low-level cloud with water droplets (cyan, lavender)',
      'Glaciating cloud (green)',
      'Snow (shades of green)',
      'Thick high-level cloud with ice particles (yellow)',
      'Thin mid-level cloud with water droplets (magenta)',
      'Thin high-level cloud with ice particles (red-orange)',
      'Land surface (shades of blue)',
      'Water surface (black)',
    ],
    keyItemsAlt: {
      title: 'Night microphysics',
      items: [
        'Fog (dull aqua to grey)',
        'Very low, warm cloud (aqua)',
        'Low, cool cloud (bright green)',
        'Mid water cloud (light green)',
        'Mid, thick water/ice cloud (tan)',
        'High, thin ice cloud (dark blue)',
        'High, very thin ice cloud (purple)',
        'High, thick cloud (dark red)',
        'High, thin cloud (near black)',
        'High, thick, very cold cloud (red/yellow, noisy)',
      ],
    },
    guide: `${DOCS}/ABIQuickGuide_DayNightCloudMicroCombo.pdf`,
    group: 'composite',
    featured: true,
  },
  {
    id: 'Dust',
    label: 'Dust RGB',
    short: 'Dust',
    descriptor: 'RGB for identifying tropospheric dust',
    blurb: 'Separates airborne dust from cloud, day and night.',
    about:
      'Dust is hard to see in visible and infrared imagery because it is optically thin and can look like cirrus. Band differencing against the IR thermal channel contrasts it against cloud, and because the differencing is infrared, dust storms are visible at night as well as by day.',
    colorbar: `${COLORBAR}/ColorBar450Dust_horz.png`,
    scale: 'dust RGB composite',
    keyItems: [
      'Dust plume by day (bright magenta, pink) — at night dust below 3 km turns purple',
      'Low water cloud (light purple)',
      'Desert surface by day (light blue)',
      'Mid, thick cloud (tan shades)',
      'Mid, thin cloud (green)',
      'Cold, thick cloud (red)',
      'High, thin ice cloud (black)',
      'Very thin cloud over a warm surface (blue)',
    ],
    guide: `${DOCS}/QuickGuide_Dust_RGB.pdf`,
    group: 'composite',
  },
  {
    id: 'FireTemperature',
    label: 'Fire Temperature RGB',
    short: 'Fire',
    descriptor: 'RGB highlighting fires by intensity',
    blurb: 'Finds active fires and separates hot ones from cooler ones.',
    about:
      'Identifies where the most intense fires are burning and distinguishes them from cooler ones. It exploits the fact that towards shorter wavelengths from 3.9 µm, background solar radiation and surface reflectance rise — so a fire must be more intense before the 2.2 and 1.6 µm bands see it at all.',
    colorbar: `${COLORBAR}/ColorBar450FireTemp.png`,
    scale: 'fire temperature RGB',
    keyItems: [
      'Warm fire',
      'Very warm fire',
      'Hot fire',
      'Very hot fire',
      'Burn scars',
      'Clear sky: land',
      'Clear sky: water, snow or night',
      'Water cloud',
      'Ice cloud',
    ],
    guide: `${DOCS}/QuickGuide_Fire_Temperature_RGB.pdf`,
    group: 'composite',
  },

  /* --------------------------------------------------------- ABI bands 1-16 */

  {
    id: '01', label: 'Band 1 — Blue', short: 'Blue', group: 'band',
    descriptor: '0.47 µm — blue, visible — 1 km',
    blurb: 'Picks out smoke and dust. Daytime only.',
    about: 'The blue visible band, particularly useful for detecting atmospheric aerosols such as smoke and dust. Being a visible channel it is black at night.',
    guide: `${DOCS}/ABIQuickGuide_Band01.pdf`,
  },
  {
    id: '02', label: 'Band 2 — Red (visible)', short: 'Visible', group: 'band', featured: true,
    descriptor: '0.64 µm — red, visible — 0.5 km, the sharpest ABI band',
    blurb: 'Highest-resolution daytime detail. Dark at night.',
    about: 'The primary visible band, used to follow the evolution of cloud through daylight hours. Corresponds approximately to the old GOES-13 visible channel. Black at night.',
    guide: `${DOCS}/ABIQuickGuide_Band02.pdf`,
  },
  {
    id: '03', label: 'Band 3 — Veggie', short: 'Veggie', group: 'band',
    descriptor: '0.86 µm — near IR — 1 km',
    blurb: 'Daytime cloud, fog and aerosol; vegetation index.',
    about: 'A near-infrared reflective band. With the red band it is used for daytime cloud, fog and aerosol detection and for computing a normalised difference vegetation index — hence "veggie". Black at night.',
    guide: `${DOCS}/ABIQuickGuide_Band03.pdf`,
  },
  {
    id: '04', label: 'Band 4 — Cirrus', short: 'Cirrus', group: 'band',
    descriptor: '1.37 µm — near IR — 2 km',
    blurb: 'Very thin cirrus, in daylight.',
    about: 'Centred in a strong water-vapour absorption region, so it does not routinely see the lower troposphere and has excellent daytime sensitivity to high, very thin cirrus. Black at night.',
    guide: `${DOCS}/ABIQuickGuide_Band04.pdf`,
  },
  {
    id: '05', label: 'Band 5 — Snow/Ice', short: 'Snow/Ice', group: 'band',
    descriptor: '1.6 µm — near IR — 1 km',
    blurb: 'Separates ice cloud from water cloud in daylight.',
    about: 'By day, ice cloud and snow appear relatively dark against relatively bright liquid-water cloud such as fog and stratus. It also detects very hot fires, day or night.',
    guide: `${DOCS}/ABIQuickGuide_Band05.pdf`,
  },
  {
    id: '06', label: 'Band 6 — Cloud Particle Size', short: 'Particle', group: 'band',
    descriptor: '2.2 µm — near IR — 2 km',
    blurb: 'Cloud particle size — an index of cloud development.',
    about: 'With other bands, enables cloud particle size estimation; growing particles indicate a developing cloud. Also used for aerosol particle size, cloud screening, hot-spot detection and snow detection.',
    guide: `${DOCS}/ABIQuickGuide_Band06.pdf`,
  },
  {
    id: '07', label: 'Band 7 — Shortwave Window', short: 'SW window', group: 'band',
    descriptor: '3.9 µm — shortwave IR window — 2 km',
    blurb: 'Fire detection, and liquid versus ice cloud.',
    about: 'Used for fire detection, cloud particle size retrieval, and telling liquid-water cloud from ice cloud. Fire hot spots appear as small dark grey to black pixels. Corresponds approximately to the old GOES-13 infrared channel.',
    colorbar: `${COLORBAR}/ColorBar450Band7_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band07.pdf`,
  },
  {
    id: '08', label: 'Band 8 — Water Vapour, Upper', short: 'WV upper', group: 'band', featured: true,
    descriptor: '6.2 µm — upper-level water vapour — 2 km',
    blurb: 'Upper-level flow, jet streaks and troughs.',
    about: `Used for upper-tropospheric water-vapour tracking, jet-stream identification, hurricane track and mid-latitude storm forecasting, severe weather analysis and turbulence detection. ${WV_ABOUT}`,
    colorbar: `${COLORBAR}/ColorBar450Bands8-10_horz.png`,
    scale: 'brightness temperature in °C',
    key: WV_KEY,
    guide: `${DOCS}/ABIQuickGuide_Band08.pdf`,
  },
  {
    id: '09', label: 'Band 9 — Water Vapour, Mid', short: 'WV mid', group: 'band', featured: true,
    descriptor: '6.9 µm — mid-level water vapour — 2 km',
    blurb: 'Mid-level moisture and dry-air intrusions.',
    about: `Tracks middle-tropospheric winds, identifies jet streams, and supports hurricane track, storm motion and turbulence analysis. Surface features are usually not visible: water vapour absorbs the 6.9 µm energy, so brightness temperatures read cold. ${WV_ABOUT}`,
    colorbar: `${COLORBAR}/ColorBar450Bands8-10_horz.png`,
    scale: 'brightness temperature in °C',
    key: WV_KEY,
    guide: `${DOCS}/ABIQuickGuide_Band09.pdf`,
  },
  {
    id: '10', label: 'Band 10 — Water Vapour, Lower', short: 'WV lower', group: 'band',
    descriptor: '7.3 µm — lower-level water vapour — 2 km',
    blurb: 'Low-level moisture, closest to the trade inversion.',
    about: `Detects water vapour in the middle to lower troposphere as well as high cloud — lower in the atmosphere than the legacy GOES-13/15 water-vapour channel could reach. ${WV_ABOUT}`,
    colorbar: `${COLORBAR}/ColorBar450Bands8-10_horz.png`,
    scale: 'brightness temperature in °C',
    key: WV_KEY,
    guide: `${DOCS}/ABIQuickGuide_Band10.pdf`,
  },
  {
    id: '11', label: 'Band 11 — Cloud-Top Phase', short: 'Cloud top', group: 'band',
    descriptor: '8.4 µm — IR — 2 km',
    blurb: 'Cloud phase and type, with the 11.2 and 12.3 µm bands.',
    about: 'Similar to the traditional longwave window band, but at 8.4 µm it helps determine the microphysical properties of cloud; combined with bands 14 and 15 it yields cloud phase and type products.',
    colorbar: `${COLORBAR}/ColorBar450Bands11-15_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band11.pdf`,
  },
  {
    id: '12', label: 'Band 12 — Ozone', short: 'Ozone', group: 'band',
    descriptor: '9.6 µm — IR — 2 km',
    blurb: 'Dynamics near the tropopause, day and night.',
    about: 'Carries information about atmospheric dynamics near the tropopause at high spatial and temporal resolution. In cloud-free scenes it reads cooler than the IR window bands because of ozone absorption.',
    colorbar: `${COLORBAR}/ColorBar450Bands11-15_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band12.pdf`,
  },
  {
    id: '13', label: 'Band 13 — Clean IR Window', short: 'IR', group: 'band', featured: true,
    descriptor: '10.3 µm — "clean" longwave IR window — 2 km',
    blurb: 'Cloud-top temperature — colder tops mean deeper convection.',
    about: 'An infrared window band, meaning it is not strongly affected by atmospheric water vapour. Useful for detecting cloud at any hour and particularly for retrieving cloud-top height. Corresponds approximately to the old GOES-13 IR cloud channel.',
    colorbar: `${COLORBAR}/ColorBar450Bands11-15_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band13.pdf`,
  },
  {
    id: '14', label: 'Band 14 — Longwave Window', short: 'LW window', group: 'band',
    descriptor: '11.2 µm — IR longwave window — 2 km',
    blurb: 'The traditional infrared window.',
    about: 'The traditional longwave infrared window band, used to diagnose discrete cloud and organised features for general forecasting, analysis and broadcast.',
    colorbar: `${COLORBAR}/ColorBar450Bands11-15_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band14.pdf`,
  },
  {
    id: '15', label: 'Band 15 — Dirty Longwave Window', short: 'Dirty LW', group: 'band',
    descriptor: '12.3 µm — "dirty" longwave IR window — 2 km',
    blurb: 'Split-window partner for moisture, ash and dust.',
    about: 'Usually read as a split-window difference against a cleaner window channel, which improves estimates of low-level moisture, volcanic ash, airborne dust and sand, and sea-surface temperature.',
    colorbar: `${COLORBAR}/ColorBar450Bands11-15_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band15.pdf`,
  },
  {
    id: '16', label: 'Band 16 — CO₂ Longwave', short: 'CO₂', group: 'band',
    descriptor: '13.3 µm — CO₂ longwave IR — 2 km',
    blurb: 'Mean tropospheric temperature and tropopause height.',
    about: 'Used for mean tropospheric air temperature estimation, tropopause delineation, and quantitative cloud products — cloud opacity, cloud-top height assignment for drift-motion vectors. Corresponds approximately to the old GOES-13 longwave IR channel.',
    colorbar: `${COLORBAR}/ColorBar450Band16_horz.png`,
    scale: 'brightness temperature in °C',
    guide: `${DOCS}/ABIQuickGuide_Band16.pdf`,
  },
]

/** The one-click channel row; everything else is in the dropdowns and Browse all. */
export const FEATURED_BANDS = SAT_BANDS.filter((b) => b.featured)

/**
 * The 2×2's starting set, read top-left to bottom-right: mid-level water vapour
 * and the shortwave window above, visible and clean infrared below.
 *
 * Four questions rather than one asked four ways. The legacy site's combine view
 * stacked three water-vapour levels beside infrared, which is a fine way to read
 * moisture structure and a poor default — three of the four panels answer the
 * same question. Every panel is selectable from here, that set included.
 */
export const DEFAULT_PANEL_BANDS: SatBand[] = ['09', '07', '02', '13']

/**
 * Loop lengths, as a count of frames rather than a span of hours.
 *
 * This is how NESDIS's own animator is parameterised (its `length` parameter),
 * and the reason matters: asking for "48 hours" and capping the result at some
 * frame budget silently thins the loop, which is what made long animations
 * stutter. Asking for a number of frames means every frame in the loop is a
 * consecutive scan, so the motion is as smooth as the satellite's own cadence.
 * The span follows from the count: 36 frames of a 10-minute sector is 6 hours.
 */
export const FRAME_COUNTS = [12, 24, 36, 48, 60, 72, 96, 120, 180, 240] as const

/** Frame skip, as the legacy `incr` parameter — trades smoothness for reach. */
export const STEPS = [1, 2, 3, 6] as const

export const sectorSpec = (id: SatSector) =>
  SAT_SECTORS.find((s) => s.id === id) ?? SAT_SECTORS[0]

export const bandSpec = (id: SatBand) =>
  SAT_BANDS.find((b) => b.id === id) ?? SAT_BANDS[0]

const satDir = (sector: SatSector, band: SatBand) =>
  `${STAR}/${GOES_WEST}/ABI/${sectorSpec(sector).path}/${band}`

/** Newest frame at display size. */
export const satelliteUrl = (sector: SatSector, band: SatBand) =>
  `${satDir(sector, band)}/${sectorSpec(sector).displaySize}.jpg`

/**
 * Newest frame at animation size — the right weight for one panel of a grid.
 *
 * The display-size still is a megabyte for the wide sector; four of those on the
 * overview, re-fetched every ten minutes, is 24 MB an hour to fill quarter-panels
 * that cannot show the detail. This is the same picture at the size it will
 * actually be drawn.
 */
export const satellitePanelUrl = (
  sector: SatSector,
  band: SatBand,
  quality: SatQuality = 'small',
) => `${satDir(sector, band)}/${animSizeFor(sector, quality)}.jpg`

/** Small preview used by the channel/view matrix. */
export const satelliteThumbUrl = (sector: SatSector, band: SatBand) =>
  `${satDir(sector, band)}/${sectorSpec(sector).thumbSize}.jpg`

/** Largest size actually published for this sector/band pair. */
export function fullSizeFor(sector: SatSector, band: SatBand): string {
  const spec = sectorSpec(sector)
  return spec.fullSizeOverrides?.[band] ?? spec.fullSize
}

/** Newest frame at the largest published resolution. */
export const satelliteFullUrl = (sector: SatSector, band: SatBand) =>
  `${satDir(sector, band)}/${fullSizeFor(sector, band)}.jpg`

/** Hard ceiling on frames per loop — the top of the offered range. */
export const MAX_FRAMES = 240

/** The 11-digit stamp that identifies a frame, used to align channels. */
export const frameKey = (url: string) => url.match(/(\d{11})_/)?.[1] ?? ''

/** Date -> the stamp STAR names frames with: year, day-of-year, HHMM UTC. */
function toFrameKey(d: Date): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  const doy = Math.floor((d.getTime() - start) / 86_400_000) + 1
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getUTCFullYear()}${p(doy, 3)}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
}

/** Size token for animation frames at the chosen quality. */
export const animSizeFor = (sector: SatSector, quality: SatQuality) =>
  quality === 'large' ? sectorSpec(sector).animSizeLarge : sectorSpec(sector).animSize

/** Roughly what a loop will download, so the control can say so up front. */
export const loopBytes = (
  sector: SatSector,
  quality: SatQuality,
  frames: number,
  channels = 1,
) => sectorSpec(sector).frameBytes[quality] * frames * channels

/** Bytes as a short human string: "34 MB". */
export function humanBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} MB`
  return `${Math.round(n / 1000)} kB`
}

/**
 * The frame URLs a loop should try, newest last.
 *
 * Computed from the clock rather than read from the server. STAR does publish an
 * Apache index for each band, and this used to fetch it — but that index lists
 * every timestamp at every size and runs to about 1.5 MB, which was roughly 90%
 * of the site's entire bandwidth: four channels re-listed every five minutes to
 * keep a dozen filenames. Frames land on a fixed cadence with predictable names,
 * so the names can be derived for nothing.
 *
 * The cost is that a frame which was never published still gets requested. That
 * is handled where the frames are loaded: an image that fails to load is dropped
 * from the loop, so gaps thin the animation instead of breaking it. The original
 * server probed for frames the same way.
 */
export function frameCandidates(
  sector: SatSector,
  band: SatBand,
  { frames = 24, step = 1, quality = 'small', now = Date.now() }: {
    /** How many scans to request — the loop's length, not its span. */
    frames?: number
    step?: number
    quality?: SatQuality
    now?: number
  } = {},
): string[] {
  const spec = sectorSpec(sector)
  const dir = satDir(sector, band)
  const cadence = spec.cadenceMinutes
  const size = animSizeFor(sector, quality)
  const count = Math.min(Math.max(1, Math.round(frames)), MAX_FRAMES)
  const stride = Math.max(1, Math.round(step))

  // Newest cadence boundary at or before now. Processing lags publication by a
  // few minutes, so the most recent slot or two are often not up yet; those
  // simply fail to load and drop out.
  const latest = new Date(Math.floor(now / (cadence * 60_000)) * cadence * 60_000)

  const urls: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(latest.getTime() - i * stride * cadence * 60_000)
    urls.push(`${dir}/${toFrameKey(t)}_${GOES_WEST}-ABI-${spec.frameToken}-${band}-${size}.jpg`)
  }
  return urls
}

/** "20262470540" -> Date. STAR stamps frames year + day-of-year + HHMM UTC. */
export function parseFrameTime(url: string): Date | null {
  const m = url.match(/(\d{4})(\d{3})(\d{2})(\d{2})_/)
  if (!m) return null
  const [, year, doy, hh, mm] = m
  const d = new Date(Date.UTC(Number(year), 0, 1, Number(hh), Number(mm)))
  d.setUTCDate(Number(doy))
  return d
}

/* ----------------------------------------------------------------- radar */

export interface RadarSite {
  id: string
  label: string
  island: string
  blurb: string
}

export const RADAR_SITES: RadarSite[] = [
  { id: 'HAWAII', label: 'Statewide composite', island: 'All islands', blurb: 'Every radar combined — Kaua‘i to Hawai‘i Island in one view.' },
  { id: 'PHKI', label: 'Kaua‘i (South Kaua‘i)', island: 'Kaua‘i', blurb: 'Covers Kaua‘i, Ni‘ihau and the approach from the northwest.' },
  { id: 'PHMO', label: 'Moloka‘i', island: 'Moloka‘i', blurb: 'Central radar — best single view of O‘ahu and Maui County.' },
  { id: 'PHKM', label: 'Kohala (Kamuela)', island: 'Hawai‘i Island', blurb: 'North and west Hawai‘i Island.' },
  { id: 'PHWA', label: 'South Shore (Hawai‘i Island)', island: 'Hawai‘i Island', blurb: 'Ka‘ū, Puna and the southern approaches.' },
]

/** The statewide composite is a region, not a station, on radar.weather.gov. */
export const radarPageUrl = (site: string) =>
  site === 'HAWAII'
    ? 'https://radar.weather.gov/region/hawaii/standard'
    : `https://radar.weather.gov/station/${site.toLowerCase()}/standard`

export const radarLoop = (site: string) =>
  `https://radar.weather.gov/ridge/standard/${site}_loop.gif`

export const radarStill = (site: string) =>
  `https://radar.weather.gov/ridge/standard/${site}_0.gif`

/* ------------------------------------------------------ surface analysis */

export interface AnalysisChart {
  id: string
  label: string
  blurb: string
  url: string
  /** Hours ahead; 0 is the analysis itself. */
  hour: number
}

export interface AnalysisGroup {
  id: string
  title: string
  blurb: string
  charts: AnalysisChart[]
}

const OPC = 'https://ocean.weather.gov/shtml'

/**
 * Ocean Prediction Center charts for the Pacific.
 *
 * These are the hand-analysed surface charts — fronts, isobars, centres drawn by
 * a forecaster — which is a different thing from a model field and the reason
 * they are worth relaying. The legacy site rendered its own model GIFs on a
 * departmental box; these are the operational products, from the centre that
 * issues them.
 */
export const ANALYSIS_GROUPS: AnalysisGroup[] = [
  {
    id: 'surface',
    title: 'Surface',
    blurb: 'Fronts, isobars and pressure centres — analysed, then forecast.',
    charts: [
      { id: 'sfc-00', hour: 0, label: 'Analysis', blurb: 'Current surface analysis for the Pacific.', url: `${OPC}/P_full_00hrsfc.gif` },
      { id: 'sfc-24', hour: 24, label: '24 h', blurb: 'Surface forecast, one day out.', url: `${OPC}/P_24hrsfc.gif` },
      { id: 'sfc-48', hour: 48, label: '48 h', blurb: 'Surface forecast, two days out.', url: `${OPC}/P_48hrsfc.gif` },
      { id: 'sfc-72', hour: 72, label: '72 h', blurb: 'Surface forecast, three days out.', url: `${OPC}/P_72hrsfc.gif` },
      { id: 'sfc-96', hour: 96, label: '96 h', blurb: 'Surface forecast, four days out.', url: `${OPC}/P_96hrsfc.gif` },
    ],
  },
  {
    id: 'upper',
    title: '500 mb',
    blurb: 'The steering flow: troughs, ridges and where systems are going.',
    charts: [
      { id: 'ua-24', hour: 24, label: '24 h', blurb: '500 mb heights and vorticity, one day out.', url: `${OPC}/P_24hr500.gif` },
      { id: 'ua-48', hour: 48, label: '48 h', blurb: '500 mb heights and vorticity, two days out.', url: `${OPC}/P_48hr500.gif` },
      { id: 'ua-72', hour: 72, label: '72 h', blurb: '500 mb heights and vorticity, three days out.', url: `${OPC}/P_72hr500.gif` },
      { id: 'ua-96', hour: 96, label: '96 h', blurb: '500 mb heights and vorticity, four days out.', url: `${OPC}/P_96hr500.gif` },
    ],
  },
  {
    id: 'wave',
    title: 'Wind & wave',
    blurb: 'Significant wave height and surface wind — what the swell is doing.',
    charts: [
      { id: 'ww-00', hour: 0, label: 'Analysis', blurb: 'Wind and wave analysis for the Pacific.', url: `${OPC}/P_00hrww.gif` },
      { id: 'ww-24', hour: 24, label: '24 h', blurb: 'Wind and wave forecast, one day out.', url: `${OPC}/P_24hrww.gif` },
      { id: 'ww-48', hour: 48, label: '48 h', blurb: 'Wind and wave forecast, two days out.', url: `${OPC}/P_48hrww.gif` },
      { id: 'ww-72', hour: 72, label: '72 h', blurb: 'Wind and wave forecast, three days out.', url: `${OPC}/P_72hrww.gif` },
    ],
  },
  {
    id: 'period',
    title: 'Wave period',
    blurb: 'Peak period and direction — long-period swell is the surf signal.',
    charts: [
      { id: 'wp-24', hour: 24, label: '24 h', blurb: 'Peak wave period and direction, one day out.', url: `${OPC}/P_024hrwper_color.gif` },
      { id: 'wp-48', hour: 48, label: '48 h', blurb: 'Peak wave period and direction, two days out.', url: `${OPC}/P_048hrwper_color.gif` },
      { id: 'wp-72', hour: 72, label: '72 h', blurb: 'Peak wave period and direction, three days out.', url: `${OPC}/P_072hrwper_color.gif` },
      { id: 'wp-96', hour: 96, label: '96 h', blurb: 'Peak wave period and direction, four days out.', url: `${OPC}/P_096hrwper_color.gif` },
    ],
  },
]

/* ----------------------------------------------------------- tropical */

const XGTWO = 'https://www.nhc.noaa.gov/xgtwo'

export const TROPICAL = {
  outlooks: [
    { id: 'cpac-2', basin: 'Central Pacific', range: '2-day', url: `${XGTWO}/two_cpac_2d0.png` },
    { id: 'cpac-7', basin: 'Central Pacific', range: '7-day', url: `${XGTWO}/two_cpac_7d0.png` },
    { id: 'epac-2', basin: 'Eastern Pacific', range: '2-day', url: `${XGTWO}/two_pac_2d0.png` },
    { id: 'epac-7', basin: 'Eastern Pacific', range: '7-day', url: `${XGTWO}/two_pac_7d0.png` },
  ],
  cphcSite: 'https://www.nhc.noaa.gov/?cpac',
  nhcSite: 'https://www.nhc.noaa.gov/',
}

/**
 * Storm-centred GOES imagery.
 *
 * NESDIS puts up a "floater" sector that tracks each named system, keyed by its
 * ATCF identifier — which the public advisory prints in its header, so no
 * directory has to be listed to find it. A storm without one simply fails to
 * load and the card shows no picture.
 */
export const floaterUrl = (atcf: string, size = '1000x1000') =>
  `https://cdn.star.nesdis.noaa.gov/FLOATER/data/${atcf}/GEOCOLOR/${size}.jpg`

/* -------------------------------------------------------- external links */

export interface LinkGroup {
  title: string
  links: { label: string; url: string; blurb: string }[]
}

export const LINK_GROUPS: LinkGroup[] = [
  {
    title: 'Forecast offices',
    links: [
      { label: 'NWS Honolulu', url: 'https://www.weather.gov/hfo/', blurb: 'Official forecasts, warnings and discussions for the state.' },
      { label: 'Central Pacific Hurricane Center', url: 'https://www.nhc.noaa.gov/?cpac', blurb: 'Tropical cyclone advisories between 140°W and the dateline.' },
      { label: 'Ocean Prediction Center', url: 'https://ocean.weather.gov/Pac_tab.php', blurb: 'High-seas forecasts and Pacific surface analyses.' },
      { label: 'Weather Prediction Center', url: 'https://www.wpc.ncep.noaa.gov/', blurb: 'National-scale QPF and surface analysis.' },
    ],
  },
  {
    title: 'Hawai‘i specialty products',
    links: [
      { label: 'Mauna Kea Weather Center', url: 'http://mkwc.ifa.hawaii.edu', blurb: 'Summit forecasts and observing conditions for Maunakea.' },
      { label: 'Hawai‘i Climate Data Portal', url: 'https://www.hawaii.edu/climate-data-portal/', blurb: 'Long-term station climatology and rainfall atlases.' },
      { label: 'Pacific Tsunami Warning Center', url: 'https://www.tsunami.gov/', blurb: 'Tsunami messages for the Pacific basin.' },
    ],
  },
  {
    title: 'Data & imagery',
    links: [
      { label: 'NOAA STAR GOES Imagery', url: 'https://www.star.nesdis.noaa.gov/GOES/index.php', blurb: 'Source of the satellite imagery on this site.' },
      { label: 'NWS Radar', url: 'https://radar.weather.gov/', blurb: 'Interactive national and regional radar.' },
      { label: 'api.weather.gov', url: 'https://www.weather.gov/documentation/services-web-api', blurb: 'The public API this entire site is built on.' },
      { label: 'Ocean Prediction Center — Pacific', url: 'https://ocean.weather.gov/Pac_tab.php', blurb: 'Source of the surface and wave charts on this site.' },
    ],
  },
  {
    title: 'University of Hawai‘i',
    links: [
      { label: 'Department of Atmospheric Sciences', url: 'https://www.soest.hawaii.edu/MET/', blurb: 'Faculty, research and graduate programmes.' },
      { label: 'SOEST', url: 'https://www.soest.hawaii.edu/', blurb: 'School of Ocean and Earth Science and Technology.' },
      { label: 'University of Hawai‘i at Mānoa', url: 'https://manoa.hawaii.edu/', blurb: 'Main campus.' },
    ],
  },
]
