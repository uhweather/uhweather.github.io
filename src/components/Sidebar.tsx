import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { nws } from '../lib/nws'
import { PRIMARY_STATION } from '../lib/stations'
import { compass, fmt, readSpeed, readTemp, relativeAge } from '../lib/units'
import { NAV_ITEMS } from './nav-items'
import AlertsPanel from './AlertsPanel'

function Wordmark({ compact = false }: { compact?: boolean }) {
  const logo = (
    <img
      src={`${import.meta.env.BASE_URL}logo.svg`}
      alt=""
      aria-hidden="true"
      width={compact ? 30 : 64}
      height={compact ? 30 : 64}
      className="shrink-0"
    />
  )

  if (compact) {
    return (
      <Link to="/" viewTransition className="flex min-w-0 items-center gap-2.5">
        {logo}
        <span className="min-w-0 truncate text-base font-semibold tracking-tight text-ink">
          Weather Glass
        </span>
      </Link>
    )
  }

  return (
    <Link to="/" viewTransition className="block min-w-0">
      {/* Mark and name side by side, the byline under both: the rail is narrow,
          and stacking the name against the mark keeps the type large enough to
          read at a glance without the byline squeezing it. */}
      <span className="flex items-center gap-3">
        {logo}
        <span className="text-[30px] font-semibold leading-[1.02] tracking-tight text-ink">
          Weather
          <br />
          Glass
        </span>
      </span>
      <span className="mt-2 block text-[11px] leading-snug text-muted">
        A passion project by ATMO students @ UH Mānoa
      </span>
    </Link>
  )
}

/** Current conditions, and the freshness of them. */
function Conditions() {
  const { data } = useQuery({
    queryKey: ['obs', PRIMARY_STATION],
    queryFn: () => nws.latestUsableObservation(PRIMARY_STATION),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
  if (!data) return null
  const temp = readTemp(data.temperature, 'F')
  const wind = readSpeed(data.windSpeed, 'mph')
  const dir = data.windDirection?.value
  return (
    <Link
      to="/observations"
      viewTransition
      className="block rounded border border-line px-3 py-2 transition-colors hover:border-line-strong"
    >
      <span className="block text-[10px] font-semibold uppercase tracking-widest text-faint">
        Honolulu
      </span>
      <span className="mt-0.5 flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums text-ink">{fmt(temp)}°</span>
        {wind !== null && (
          <span className="text-xs tabular-nums text-muted">
            {dir !== null && dir !== undefined ? `${compass(dir)} ` : ''}
            {fmt(wind)} mph
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[11px] text-faint">
        {relativeAge(data.timestamp)}
      </span>
    </Link>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            viewTransition
            onClick={onNavigate}
            title={item.blurb}
            className={({ isActive }) =>
              `block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                isActive
                  ? 'border-primary font-medium text-ink'
                  : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
              }`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/**
 * Navigation on the left rather than across the top.
 *
 * A horizontal bar plus its utilities costs roughly 130px of every screen — the
 * dimension imagery actually needs. Down the side it costs width, which wide
 * displays have to spare, and it leaves the full height of the window for the
 * figures.
 */
export default function Sidebar({
  dark,
  onToggleTheme,
  onOpenAlerts,
  onOpenPalette,
  fullscreen,
  onToggleFullscreen,
}: {
  dark: boolean
  onToggleTheme: () => void
  onOpenAlerts: () => void
  onOpenPalette: () => void
  fullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const [open, setOpen] = useState(false)
  const [mac, setMac] = useState(true)
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), [])

  const iconBtn =
    'rounded p-2 text-muted transition-colors hover:bg-surface-hover hover:text-ink'

  return (
    <>
      {/* Desktop rail */}
      <aside className="sidebar sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-5 border-r border-line bg-surface px-4 py-5 lg:flex">
        <Wordmark />

        <nav aria-label="Primary" className="shrink-0">
          <NavList />
        </nav>

        <div className="mt-auto flex flex-col gap-2.5">
          <Conditions />
          <AlertsPanel onOpen={onOpenAlerts} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenPalette}
              aria-label="Jump to a section"
              className={`flex items-center gap-1.5 ${iconBtn}`}
            >
              <span aria-hidden="true">⌕</span>
              <kbd className="rounded border border-line px-1 py-0.5 font-mono text-[10px] text-faint">
                {mac ? '⌘' : 'Ctrl '}K
              </kbd>
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? 'Exit display mode' : 'Enter display mode'}
              title="Fill the screen for an external display (F)"
              className={`ml-auto flex items-center gap-1.5 ${iconBtn}`}
            >
              <span aria-hidden="true">{fullscreen ? '⤡' : '⤢'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={iconBtn}
            >
              <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Wordmark compact />
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={onOpenAlerts} aria-label="Weather alerts" className={iconBtn}>
              <span aria-hidden="true">🔔</span>
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={iconBtn}
            >
              <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? 'Exit display mode' : 'Enter display mode'}
              className={iconBtn}
            >
              <span aria-hidden="true">{fullscreen ? '⤡' : '⤢'}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label="Toggle navigation"
              className={iconBtn}
            >
              <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>
        <nav
          aria-label="Primary"
          className={`overflow-hidden border-t border-line transition-[max-height,opacity] duration-300 ${
            open ? 'max-h-[32rem] opacity-100' : 'max-h-0 border-transparent opacity-0'
          }`}
        >
          <div className="px-4 py-3">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </header>
    </>
  )
}
