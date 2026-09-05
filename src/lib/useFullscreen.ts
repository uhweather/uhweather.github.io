import { useCallback, useEffect, useState } from 'react'

/**
 * Fullscreen for wall and external displays.
 *
 * Two things are needed and they are separate: the browser's own fullscreen, and
 * hiding the site's chrome so the imagery gets the whole panel. Leaving
 * fullscreen by any route — Escape, the window manager, another app — has to put
 * the chrome back, so the state is read from the document rather than assumed
 * from whichever button was pressed.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false)
  // On a wall display the transport is a moving distraction rather than a
  // control anybody is about to touch. Leaving display mode brings it back:
  // hidden controls on a desk would just look broken.
  const [bare, setBare] = useState(false)

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    sync()
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Published on the root so page content can stand down for the rail without
  // every page having to be handed the state.
  useEffect(() => {
    if (active) document.documentElement.dataset.display = 'on'
    else delete document.documentElement.dataset.display
  }, [active])

  useEffect(() => {
    if (active && bare) document.documentElement.dataset.bare = 'on'
    else delete document.documentElement.dataset.bare
  }, [active, bare])

  useEffect(() => {
    if (!active) setBare(false)
  }, [active])

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Denied, unsupported, or not from a user gesture: fall back to hiding
      // the chrome, which is most of the benefit on an already-maximised window.
      setActive((v) => !v)
    }
  }, [])

  return { active, toggle, bare, setBare }
}

/**
 * Whether the display is running unattended, for content that has to behave
 * differently when nobody is there to drive it.
 *
 * Read off the root attribute rather than passed down: the pages that care are
 * routed children, and threading a provider through the tree to tell them
 * something the document already says would be the long way round.
 */
export function useDisplayMode(): boolean {
  const [on, setOn] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.display === 'on',
  )
  useEffect(() => {
    const el = document.documentElement
    const read = () => setOn(el.dataset.display === 'on')
    const observer = new MutationObserver(read)
    observer.observe(el, { attributes: true, attributeFilter: ['data-display'] })
    read()
    return () => observer.disconnect()
  }, [])
  return on
}
