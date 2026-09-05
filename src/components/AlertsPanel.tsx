import { useAlerts } from './AlertsDrawer'
import type { Alert } from '../lib/nws'
import { hstDateTime } from '../lib/units'

const isUrgent = (a: Alert) => a.severity === 'Extreme' || a.severity === 'Severe'

/** How many fit in the rail before the rest are summarised. */
const SHOWN = 4

/**
 * Active advisories, listed in the rail.
 *
 * This replaced a one-line strip that cycled through alerts: with a column to
 * work in there is room to show them all at once, and a reader should not have
 * to wait for the rotation to come round to the one that matters to them. The
 * list is capped rather than made scrollable — a scroll container inside the
 * sidebar would be a second scrollbar for a handful of lines.
 */
export default function AlertsPanel({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading } = useAlerts()
  const alerts = data ?? []
  const urgent = alerts.filter(isUrgent)
  const rest = alerts.filter((a) => !isUrgent(a))
  // Warnings first: they are the ones that change what someone does today.
  const ordered = [...urgent, ...rest]
  const shown = ordered.slice(0, SHOWN)
  const extra = ordered.length - shown.length

  if (isLoading) return null

  return (
    <section aria-label="Weather alerts summary" className="rounded border border-line">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 border-b border-line px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            alerts.length === 0 ? 'bg-line-strong' : urgent.length ? 'bg-danger' : 'bg-warn'
          }`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-faint">
          {alerts.length === 0
            ? 'No active alerts'
            : `${alerts.length} active alert${alerts.length === 1 ? '' : 's'}`}
        </span>
      </button>

      {alerts.length > 0 && (
        <ul className="divide-y divide-line">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={onOpen}
                title={`${a.event} — until ${hstDateTime(a.expires)} HST`}
                className="w-full px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span
                  className={`block truncate text-xs font-medium ${
                    isUrgent(a) ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {a.event}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">{a.areaDesc}</span>
              </button>
            </li>
          ))}
          {extra > 0 && (
            <li>
              <button
                type="button"
                onClick={onOpen}
                className="w-full px-2.5 py-1.5 text-left text-[11px] text-primary transition-colors hover:bg-surface-hover"
              >
                +{extra} more →
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
