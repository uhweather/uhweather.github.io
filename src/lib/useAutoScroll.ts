import { useEffect, useRef, useState } from 'react'

/**
 * Step through a list of blocks, holding on each long enough to read it.
 *
 * Continuous creeping suits a long passage read top to bottom. It suits a set of
 * separate definitions badly: on a wide screen each one is a couple of long
 * lines, and a scroll that never stops means every line is moving while it is
 * being read. This advances one block at a time and then sits still, which is
 * the difference between a ticker and a slideshow.
 *
 * The dwell scales with how much text the block holds, so a one-line note does
 * not sit as long as a nine-item key.
 */
export function useStepScroll(
  count: number,
  resetKey: unknown,
  { baseMs = 6000, msPerCharacter = 22, lengths = [] as number[] } = {},
) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
    const el = ref.current
    if (el) el.scrollTo({ top: 0, behavior: 'auto' })
  }, [resetKey])

  useEffect(() => {
    if (paused || count < 2) return
    const dwell = baseMs + (lengths[index] ?? 0) * msPerCharacter
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), dwell)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, count, baseMs, msPerCharacter, lengths.join(',')])

  useEffect(() => {
    const el = ref.current
    const target = el?.children[0]?.children[index] as HTMLElement | undefined
    if (!el || !target) return
    el.scrollTo({ top: target.offsetTop - el.offsetTop, behavior: 'smooth' })
  }, [index])

  return { ref, index, paused, setPaused }
}

/**
 * Text that reads itself.
 *
 * The point of a display is that nobody is driving it: a passage that needs a
 * scroll wheel is a passage nobody standing in a hallway will read past the
 * first line. This creeps down at reading pace, holds at each end, and starts
 * over. Hovering stops it, because the one time someone does reach for the mouse
 * is when they want to stay on a line.
 *
 * `resetKey` sends it back to the top when the content underneath changes — a
 * new forecast discussion, a different channel — so the reader is not dropped
 * into the middle of something they have not seen the start of.
 */
export function useAutoScroll(
  enabled: boolean,
  resetKey: unknown,
  { pixelsPerSecond = 16, holdMs = 5000 }: { pixelsPerSecond?: number; holdMs?: number } = {},
) {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = 0
  }, [resetKey])

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || paused) return

    let frame = 0
    let last = performance.now()
    let holdUntil = last + holdMs
    let offset = el.scrollTop

    const tick = (now: number) => {
      const dt = now - last
      last = now
      const limit = el.scrollHeight - el.clientHeight

      if (limit <= 0 || now < holdUntil) {
        frame = requestAnimationFrame(tick)
        return
      }

      offset += (pixelsPerSecond * dt) / 1000
      if (offset >= limit) {
        offset = 0
        el.scrollTop = 0
        holdUntil = now + holdMs
      } else {
        el.scrollTop = offset
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, paused, resetKey, pixelsPerSecond, holdMs])

  return { ref, paused, setPaused }
}
