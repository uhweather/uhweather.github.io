/**
 * What each page is, for the tab and for anything that unfurls a link.
 *
 * A crawler does not run JavaScript, so a single-page app pasted into a chat
 * shows whatever its one HTML file says — every route the same. The build reads
 * this list and writes a real HTML file per route with its own title,
 * description and card, which is also what a direct hit on /satellite loads.
 */
export interface PageMeta {
  path: string
  /** Shown in the tab and as the link's headline. */
  title: string
  description: string
}

export const SITE_NAME = 'Weather Glass'

export const PAGES: PageMeta[] = [
  {
    path: '/',
    title: 'Weather Glass — UH Mānoa',
    description:
      'Live Hawai‘i conditions, GOES-West imagery, forecasts and tropical systems. A passion project by ATMO students @ UH Mānoa.',
  },
  {
    path: '/observations',
    title: 'Observations — Weather Glass',
    description:
      'Surface reports from stations across the Hawaiian Islands — temperature, wind, humidity and pressure, as they land.',
  },
  {
    path: '/forecast',
    title: 'Forecast — Weather Glass',
    description:
      'The seven-day forecast for Hawai‘i, hour by hour, with the discussion, surf and marine text from NWS Honolulu.',
  },
  {
    path: '/satellite',
    title: 'Satellite — Weather Glass',
    description:
      'GOES-West imagery of Hawai‘i and the Pacific: 22 channels, animated loops, and a four-channel comparison on one clock.',
  },
  {
    path: '/radar',
    title: 'Radar — Weather Glass',
    description: 'NEXRAD reflectivity from the four radars covering the Hawaiian Islands.',
  },
  {
    path: '/tropical',
    title: 'Tropical — Weather Glass',
    description:
      'Active systems in the Central and Eastern Pacific, with the advisories as issued by the CPHC and the NHC.',
  },
  {
    path: '/analysis',
    title: 'Pacific analysis — Weather Glass',
    description:
      'Hand-analysed surface, upper-air and wave charts for the Pacific from NOAA’s Ocean Prediction Center.',
  },
  {
    path: '/about',
    title: 'About — Weather Glass',
    description: 'What this site is, where every figure comes from, and the disclaimer.',
  },
]

export const pageMeta = (pathname: string): PageMeta =>
  PAGES.find((p) => p.path === pathname) ?? PAGES[0]
