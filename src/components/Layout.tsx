import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AlertsDrawer from './AlertsDrawer'
import CommandPalette from './CommandPalette'
import DisplayRail from './DisplayRail'
import { useFullscreen } from '../lib/useFullscreen'
import { pageMeta } from '../lib/pageMeta'
import { UiIcons } from './UiIcons'

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark] as const
}

export default function Layout() {
  const [dark, setDark] = useTheme()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname } = useLocation()
  const fullscreen = useFullscreen()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (
        e.key.toLowerCase() === 'f' &&
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        void fullscreen.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  // The build gives each route's HTML its own title; this keeps a client-side
  // navigation in step, so a bookmark or a tab says which page it is on.
  useEffect(() => {
    document.title = pageMeta(pathname.replace(/(.)\/$/, '$1')).title
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:flex-row lg:overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:font-medium focus:shadow-float"
      >
        Skip to content
      </a>

      {!fullscreen.active && (
      <Sidebar
        dark={dark}
        onToggleTheme={() => setDark(!dark)}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        fullscreen={fullscreen.active}
        onToggleFullscreen={() => void fullscreen.toggle()}
      />
      )}

      <AlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        {/* In display mode the imagery loses its page margins and the space they
            were taking becomes a reading column: the figures are already as big
            as the screen allows, so the padding was the only slack left. */}
        <div className="flex min-w-0 flex-1 lg:min-h-0">
          <main
            id="main"
            className={`flex w-full min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto ${
              fullscreen.active ? 'p-2' : 'px-4 py-5 sm:px-6'
            }`}
          >
            {/* `key` restarts the enter animation on each navigation. Browsers with
                the View Transitions API additionally cross-fade the document. */}
            <div key={pathname} className="page-enter flex min-h-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>

          {fullscreen.active && (
            <DisplayRail
              onExit={() => void fullscreen.toggle()}
              bare={fullscreen.bare}
              onToggleBare={() => fullscreen.setBare(!fullscreen.bare)}
            />
          )}
        </div>

        {!fullscreen.active && (
        <footer className="border-t border-line px-4 py-5 text-xs text-muted sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl">
              Data from{' '}
              <a className="text-primary hover:underline" href="https://www.weather.gov/documentation/services-web-api">
                NOAA/NWS
              </a>{' '}
              and{' '}
              <a className="text-primary hover:underline" href="https://www.star.nesdis.noaa.gov/GOES/index.php">
                NESDIS STAR
              </a>. Not for the protection of life or property —{' '}
              <a className="text-primary hover:underline" href="https://www.weather.gov/hfo/">
                consult NWS Honolulu
              </a>{' '}
              for official warnings.
            </p>
            <Link className="shrink-0 text-primary hover:underline" to="/about" viewTransition>
              About &amp; sources →
            </Link>
          </div>
        </footer>
        )}
      </div>

      {/* Below the rail's breakpoint there is no rail to carry these, so they
          float instead. Dim until hovered so they do not sit on the imagery, but
          never invisible. */}
      {fullscreen.active && (
        <button
          type="button"
          onClick={() => fullscreen.setBare(!fullscreen.bare)}
          aria-pressed={fullscreen.bare}
          aria-label={fullscreen.bare ? 'Show controls' : 'Hide controls'}
          title={fullscreen.bare ? 'Show controls' : 'Hide controls — imagery only'}
          className="fixed bottom-3 left-14 z-40 rounded border border-line bg-surface/90 px-2 py-2 text-xs leading-none text-muted opacity-60 shadow-card backdrop-blur transition-opacity hover:opacity-100 focus-visible:opacity-100 xl:hidden"
        >
          {fullscreen.bare ? 'Controls off' : 'Controls'}
        </button>
      )}

      {fullscreen.active && (
        <button
          type="button"
          onClick={() => void fullscreen.toggle()}
          aria-label="Exit display mode (F)"
          title="Exit display mode (F)"
          className="fixed bottom-3 left-3 z-40 xl:hidden rounded border border-line bg-surface/90 p-2 text-muted opacity-60 shadow-card backdrop-blur transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <UiIcons.collapse />
        </button>
      )}
    </div>
  )
}
