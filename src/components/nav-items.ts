import type { IconName } from './NavIcons'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  blurb: string
  /** Extra search terms for the command palette. */
  keywords: string[]
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: 'overview', end: true,
    blurb: 'Current conditions, imagery and the next few days at a glance.',
    keywords: ['home', 'dashboard', 'now'] },
  { to: '/observations', label: 'Observations', icon: 'observations',
    blurb: 'Live surface reports from stations across every island.',
    keywords: ['temperature', 'wind', 'humidity', 'stations', 'asos', 'metar'] },
  { to: '/forecast', label: 'Forecast', icon: 'forecast',
    blurb: 'Seven-day outlook, discussion, surf and marine text products.',
    keywords: ['afd', 'surf', 'zone', 'marine', 'discussion', 'outlook'] },
  { to: '/satellite', label: 'Satellite', icon: 'satellite',
    blurb: 'GOES-West imagery with animation, by sector and channel.',
    keywords: ['goes', 'infrared', 'water vapour', 'geocolor', 'visible', 'loop'] },
  { to: '/radar', label: 'Radar', icon: 'radar',
    blurb: 'NEXRAD reflectivity from the four radars covering the state.',
    keywords: ['nexrad', 'reflectivity', 'rain', 'phmo', 'phki'] },
  { to: '/tropical', label: 'Tropical', icon: 'tropical',
    blurb: 'Central Pacific cyclone outlooks and related alerts.',
    keywords: ['hurricane', 'cyclone', 'cphc', 'storm', 'nhc'] },
  { to: '/analysis', label: 'Analysis', icon: 'models',
    blurb: 'Hand-analysed Pacific surface, upper-air and wave charts.',
    keywords: ['surface', 'fronts', 'isobars', 'opc', '500 mb', 'waves', 'swell', 'chart'] },
  { to: '/about', label: 'About', icon: 'about',
    blurb: 'How this site works, its sources, and the disclaimer.',
    keywords: ['sources', 'disclaimer', 'links', 'credits'] },
]
