import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from './nav-items'
import { Icons } from './NavIcons'
import { UiIcons } from './UiIcons'

/**
 * Quick jump, opened with ⌘K / Ctrl-K.
 *
 * With eight sections plus per-section options, keyboard navigation is faster
 * than reaching for the nav — and it gives the descriptions somewhere to live
 * without cluttering the bar itself.
 */
export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV_ITEMS
    return NAV_ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.blurb.toLowerCase().includes(q) ||
        i.keywords.some((k) => k.includes(q)),
    )
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // Autofocus has to wait for the panel to actually be in the layout.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a section"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-float"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <UiIcons.search size={17} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && results[active]) {
                go(results[active].to)
              }
            }}
            placeholder="Jump to radar, surf forecast, water vapour…"
            className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
            esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No matching section.</li>
          )}
          {results.map((item, i) => {
            const Icon = Icons[item.icon]
            return (
              <li key={item.to}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.to)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === active ? 'bg-primary-soft' : 'hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-primary"><Icon /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    <span className="block truncate text-xs text-muted">{item.blurb}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
