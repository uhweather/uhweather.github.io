/**
 * Inline stroke icons for the interface chrome.
 *
 * These were Unicode glyphs — 🔔, ☾, ▶, ⤢ — which the system font substitutes
 * for whatever it has: a colour emoji bell in one browser, a hollow outline in
 * another, and nothing at all where the glyph is missing. An icon that changes
 * shape and picks up its own palette breaks a theme that is otherwise drawn in
 * two colours. Drawn here they inherit `currentColor` and look the same
 * everywhere.
 *
 * Same geometry as the navigation set in NavIcons: a 24 box, 1.75 stroke,
 * round joins. Transport controls are filled instead — a play triangle in
 * outline reads as an unfinished shape.
 */
const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

const solid = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  stroke: 'none',
  'aria-hidden': true,
  focusable: false,
}

type Props = { size?: number; className?: string }
const box = ({ size = 18, className = '' }: Props) => ({ width: size, height: size, className })

export const UiIcons = {
  bell: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5" />
      <path d="M13.8 20.5a2 2 0 0 1-3.6 0" />
    </svg>
  ),
  sun: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  ),
  moon: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.8 6.8 0 0 0 10 10Z" />
    </svg>
  ),
  menu: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  ),
  close: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  search: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m20 20-4.4-4.4" />
    </svg>
  ),
  /** Fill the screen. */
  expand: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M14.5 3.5H20.5V9.5M9.5 20.5H3.5V14.5M20.5 3.5 14 10M3.5 20.5 10 14" />
    </svg>
  ),
  /** Give it back. */
  collapse: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M20.5 9.5h-6v-6M3.5 14.5h6v6M14.5 9.5 21 3M9.5 14.5 3 21" />
    </svg>
  ),
  grid: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  ),
  share: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M4.5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5" />
      <path d="M12 15V3.5M8.2 7.3 12 3.5l3.8 3.8" />
    </svg>
  ),
  plus: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  ),
  minus: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M5.5 12h13" />
    </svg>
  ),
  chevronDown: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />
    </svg>
  ),
  chevronLeft: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  ),
  chevronRight: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  ),
  external: (p: Props = {}) => (
    <svg {...stroke} {...box(p)}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </svg>
  ),

  /* ------------------------------------------------------------ transport */

  first: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M6 5.5h2.2v13H6zM19 5.9v12.2L9.6 12z" />
    </svg>
  ),
  prev: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M16.5 5.9v12.2L7 12z" />
    </svg>
  ),
  play: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M7.5 5.4 18.5 12 7.5 18.6z" />
    </svg>
  ),
  pause: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M7 5.5h3.3v13H7zM13.7 5.5H17v13h-3.3z" />
    </svg>
  ),
  next: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M7.5 5.9v12.2L17 12z" />
    </svg>
  ),
  last: (p: Props = {}) => (
    <svg {...solid} {...box(p)}>
      <path d="M18 5.5h-2.2v13H18zM5 5.9v12.2L14.4 12z" />
    </svg>
  ),

  /* --------------------------------------------------- empty-state marks */

  /** Clear sky — nothing in effect. */
  clear: (p: Props = {}) => (
    <svg {...stroke} {...box(p)} strokeWidth={1.4}>
      <circle cx="9" cy="8.5" r="3.4" />
      <path d="M9 2.4v1.6M9 13v1.6M2.9 8.5h1.6M13.5 8.5h1.6M4.7 4.2l1.1 1.1M12.2 11.7l1.1 1.1M13.3 4.2l-1.1 1.1M5.8 11.7l-1.1 1.1" />
      <path d="M10 20.5h7.8a3.2 3.2 0 0 0 .3-6.4 4.7 4.7 0 0 0-9-1.2A3.9 3.9 0 0 0 10 20.5Z" />
    </svg>
  ),
  /** A swell, for the page that is not there. */
  wave: (p: Props = {}) => (
    <svg {...stroke} {...box(p)} strokeWidth={1.4}>
      <path d="M2 15.5c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
      <path d="M2 20c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
      <path d="M6.5 10.5c0-4 3-7 7-7 3.3 0 5.4 2 6 4.4" />
    </svg>
  ),
}

export type UiIconName = keyof typeof UiIcons
