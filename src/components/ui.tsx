import type { ReactNode } from 'react'

/** Panel — the basic content container used across every page. */
export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-card ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/**
 * Option row — replaces the legacy site's pipe-separated link lists.
 *
 * Set as words with a rule under the current one, matching the navigation. A
 * pill or chip wraps every option in a box the eye has to pass through to reach
 * the word, and a screen with several of these becomes a field of boxes; the
 * words are what is being chosen.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  name,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; title?: string }[]
  label: string
  /** Optional caption shown before the options. */
  name?: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}
    >
      {name && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-faint">
          {name}
        </span>
      )}
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            title={o.title}
            className={`relative shrink-0 py-1 text-sm transition-colors ${
              active ? 'font-medium text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full transition-opacity ${
                active ? 'bg-primary opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

/** Skeleton block shown while a query is in flight. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden="true" />
  )
}

/**
 * Error state. Names the upstream so a reader can tell "NOAA is down" from
 * "this site is broken" — a distinction the legacy server never drew.
 */
export function ErrorState({
  message,
  source,
  onRetry,
}: {
  message: string
  source?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm"
    >
      <p className="font-medium text-ink">
        {source ? `Could not reach ${source}` : 'Data unavailable'}
      </p>
      <p className="mt-1 text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-warn/40 px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/** Small caption used under imagery to credit and timestamp the source. */
export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted border-line',
    green: 'bg-primary-soft text-primary border-primary/30',
    amber: 'bg-warn-soft text-warn border-warn/30',
    red: 'bg-danger-soft text-danger border-danger/30',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
