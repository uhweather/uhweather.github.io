import { useEffect, useRef, useState, type ReactNode } from 'react'
import { UiIcons } from './UiIcons'

/**
 * A row of controls that scrolls sideways when it runs longer than the screen.
 *
 * The scrolling itself is CSS (`.rail`); what this adds is the part a reader
 * needs — an edge that says there is more. A row that simply ends at the screen
 * edge looks like a row that ended, so options past the fold are options nobody
 * knows about. The fade and chevron appear only on the side that actually has
 * something beyond it, and go once you reach it.
 */
export default function Rail({
  children,
  className = '',
  row = '',
}: {
  children: ReactNode
  /** Classes for the rail's own box in its parent's layout. */
  className?: string
  /** Classes for the scrolling line inside it. */
  row?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const max = el.scrollWidth - el.clientWidth
      setEdge({ start: el.scrollLeft > 2, end: max > 2 && el.scrollLeft < max - 2 })
    }
    read()
    el.addEventListener('scroll', read, { passive: true })
    // The row's own width changes with the viewport, and its contents change
    // when a channel list appears or goes; both decide whether there is an edge.
    const ro = new ResizeObserver(read)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', read)
      ro.disconnect()
    }
  }, [children])

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div ref={ref} className={`rail ${row}`}>
        {children}
      </div>
      <Edge side="start" show={edge.start} />
      <Edge side="end" show={edge.end} />
    </div>
  )
}

function Edge({ side, show }: { side: 'start' | 'end'; show: boolean }) {
  const end = side === 'end'
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 flex w-9 items-center from-bg to-transparent text-base leading-none text-faint transition-opacity duration-200 lg:hidden ${
        end ? 'right-0 justify-end bg-gradient-to-l' : 'left-0 justify-start bg-gradient-to-r'
      } ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      {end ? <UiIcons.chevronRight size={16} /> : <UiIcons.chevronLeft size={16} />}
    </span>
  )
}
