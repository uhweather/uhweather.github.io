import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { nws, type Alert } from '../lib/nws'
import { hstDateTime } from '../lib/units'

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts', 'HI'],
    queryFn: () => nws.activeAlerts('HI'),
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  })
}

/** Extreme and Severe get the danger treatment; everything else is advisory. */
const isUrgent = (a: Alert) => a.severity === 'Extreme' || a.severity === 'Severe'

function AlertItem({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false)
  const urgent = isUrgent(alert)
  return (
    <li
      className={`overflow-hidden rounded-lg border ${
 urgent ? 'border-danger/40 bg-danger-soft' : 'border-line bg-surface-2'
 }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-3 text-left"
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${urgent ? 'bg-danger' : 'bg-warn'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{alert.event}</span>
          <span className="mt-0.5 block text-xs text-muted">{alert.areaDesc}</span>
          <span className="mt-1 block text-xs text-faint">
            Until {hstDateTime(alert.expires)} HST
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-3 py-3">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
            {alert.description.trim()}
          </p>
          {alert.instruction && (
            <p className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink">
              {alert.instruction.trim()}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Alerts live in a slide-over rather than a banner.
 *
 * A banner at the top of the page pushes every other element down the moment an
 * advisory is issued, so the layout jumps under the reader — and on a day with
 * several advisories the actual weather content is off-screen. The trigger in
 * the masthead keeps the alert count permanently visible without occupying any
 * layout space; the detail is one click away.
 */
export default function AlertsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading, isError } = useAlerts()
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape closes; focus moves into the panel so keyboard users are not stranded.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const urgent = data?.filter(isUrgent) ?? []
  const other = data?.filter((a) => !isUrgent(a)) ?? []

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
 open ? 'opacity-100' : 'pointer-events-none opacity-0'
 }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Active weather alerts"
        tabIndex={-1}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-float transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
 open ? 'translate-x-0' : 'translate-x-full'
 }`}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Active alerts</h2>
            <p className="text-xs text-muted">National Weather Service · State of Hawai‘i</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alerts"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && <p className="text-sm text-muted">Checking for alerts…</p>}
          {isError && (
            <p className="text-sm text-muted">
              Could not reach api.weather.gov to check for alerts.
            </p>
          )}
          {data && data.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-3xl" aria-hidden="true">🌤️</p>
              <p className="mt-2 text-sm font-medium text-ink">No active alerts</p>
              <p className="mt-1 text-xs text-muted">
                Nothing in effect for the state right now.
              </p>
            </div>
          )}
          {!!urgent.length && (
            <>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                Warnings
              </h3>
              <ul className="mb-5 space-y-2">
                {urgent.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </ul>
            </>
          )}
          {!!other.length && (
            <>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Advisories &amp; statements
              </h3>
              <ul className="space-y-2">
                {other.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="border-t border-line px-4 py-3">
          <a
            href="https://www.weather.gov/hfo/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Official warnings from NWS Honolulu ↗
          </a>
        </footer>
      </div>
    </>
  )
}
