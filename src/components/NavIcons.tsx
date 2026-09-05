/**
 * Inline stroke icons for navigation.
 *
 * Drawn here rather than pulled from an icon package: eight small glyphs do not
 * justify a dependency, and inlining keeps them theme-aware via currentColor.
 */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const Icons = {
  overview: () => (
    <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9.5 20v-5h5v5" /></svg>
  ),
  observations: () => (
    <svg {...base}><path d="M12 3v10" /><circle cx="12" cy="17" r="3.2" /><path d="M9.2 6h5.6" /><path d="M9.2 9.5h5.6" /></svg>
  ),
  forecast: () => (
    <svg {...base}><circle cx="8" cy="8.5" r="3" /><path d="M8 2.5v1.6M8 12.9v1.6M2.5 8.5h1.6M11.9 8.5h1.6M4.3 4.8l1.1 1.1M10.6 11.1l1.1 1.1M11.7 4.8l-1.1 1.1M5.4 11.1l-1.1 1.1" /><path d="M9 19.5h8.5a3 3 0 0 0 .3-6 4.4 4.4 0 0 0-8.4-1.1A3.6 3.6 0 0 0 9 19.5Z" /></svg>
  ),
  satellite: () => (
    <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" /></svg>
  ),
  radar: () => (
    <svg {...base}><circle cx="12" cy="12" r="2" /><path d="M12 12 19 5" /><path d="M12 5.5a6.5 6.5 0 1 0 6.5 6.5" /><path d="M12 2a10 10 0 1 0 10 10" /></svg>
  ),
  tropical: () => (
    <svg {...base}><circle cx="12" cy="12" r="2.2" /><path d="M12 9.8c3.5-3.6 8-3 8-3s-1.2 4.6-5.6 5.4" /><path d="M12 14.2c-3.5 3.6-8 3-8 3s1.2-4.6 5.6-5.4" /></svg>
  ),
  models: () => (
    <svg {...base}><path d="M3 17.5 9 11l4 3.6L21 6" /><path d="M21 10.5V6h-4.5" /><path d="M3 21h18" /></svg>
  ),
  about: () => (
    <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.8h.01" /></svg>
  ),
}

export type IconName = keyof typeof Icons
