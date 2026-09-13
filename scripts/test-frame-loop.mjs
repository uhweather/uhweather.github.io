import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real hooks with deterministic effects, images and timers.
const source = fs.readFileSync('src/lib/useFrameLoop.ts', 'utf8')
  .replace(/^import .* from 'react'\n/, '')
  .replace(/import \{[\s\S]*?\} from '.\/sources'\n/, '')
  .replace(/export /g, '')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
function harness(name) {
  let cursor = 0, dirty = false, args, result, clock = 0
  const slots = [], effects = [], timers = new Map(), images = []
  let id = 0
  const context = {
    Set, Math, Date,
    setInterval() { return 0 },
    clearInterval() {},
    sectorSpec() { return { cadenceMinutes: 10 } },
    frameCandidates(sector, band) { return [1, 2, 3].map((key) => `${band}-${key}`) },
    frameKey(url) { return url.split('-').at(-1) },
    parseFrameTime() { return null },
    useMemo(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) {
        slots[i] = { deps, value: fn() }
      }
      return slots[i].value
    },
    useState(initial) {
      const i = cursor++
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, (value) => {
        const next = typeof value === 'function' ? value(slots[i].value) : value
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true }
      }]
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) {
        effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
      }
    },
    window: {
      setTimeout(fn, delay) { timers.set(++id, { fn, at: clock + delay }); return id },
      clearTimeout(key) { timers.delete(key) },
    },
    Image: class {
      constructor() { images.push(this) }
      removeAttribute() { this.src = '' }
    },
  }
  vm.createContext(context)
  vm.runInContext(js + `\nglobalThis.hook = ${name}`, context)
  const render = (...nextArgs) => {
    if (nextArgs.length) args = nextArgs
    let count = 0
    do {
      assert.ok(++count < 30, 'render must settle')
      dirty = false; cursor = 0; result = context.hook(...args)
      effects.splice(0).forEach((effect) => effect())
    } while (dirty)
    return result
  }
  return {
    render, images, timers,
    advance(ms) {
      const end = clock + ms
      while (true) {
        const entry = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!entry || entry[1].at > end) break
        clock = entry[1].at; timers.delete(entry[0]); entry[1].fn(); render()
      }
      clock = end
      return result
    },
    unmount() { slots.forEach((s) => s?.cleanup?.()) },
  }
}
const playback = harness('usePlayback')
const frames = ['a', 'b', 'c']
assert.equal(playback.render(frames, 300, true).index, 2)
assert.equal(playback.advance(999).index, 2)
assert.equal(playback.advance(1).index, 0)
assert.equal(playback.advance(300).index, 1)
assert.equal(playback.advance(300).index, 2)
playback.render().jump(1)
playback.render()
assert.equal(playback.advance(5000).index, 1)
playback.render(frames, 300, false)
assert.equal(playback.timers.size, 0)
playback.unmount()

const growing = harness('usePlayback')
const initial = ['b', 'c']
growing.render(initial, 300, true)
growing.advance(1000)
assert.equal(growing.render().index, 0)
growing.render(['a', 'b', 'c'], 300, true)
assert.equal(growing.render().index, 1, 'history growth retains the displayed timestamp')
assert.equal(growing.advance(300).index, 2, 'playback continues after history grows')
growing.unmount()

const combined = harness('useCombinedLoop')
const options = { sector: 'test', bands: ['a', 'b'], enabled: true, frames: 3 }
combined.render(options)
assert.equal(combined.images[0].src, 'a-1')
assert.equal(combined.images[1].src, 'b-1', 'oldest matching channels requested first')
combined.images[0].onload()
assert.equal(combined.render().isError, false, 'partial channel load is not an error')
combined.images[1].onload()
assert.equal(combined.render().urls.join(','), 'a-1,b-1')
const stableUrls = combined.render().urls
combined.images[2].onload()
assert.equal(combined.render().urls, stableUrls)
combined.images[3].onload()
assert.equal(combined.advance(5000).urls.join(','), 'a-1,b-1', 'hold first scan while history loads')
combined.images[4].onload()
combined.images[5].onload()
combined.render().setBuffering(true)
combined.render()
assert.equal(combined.advance(1000).urls.join(','), 'a-1,b-1', 'hold while visible scan decodes')
combined.render().setBuffering(false)
combined.render()
assert.equal(combined.advance(300).urls.join(','), 'a-2,b-2', 'advance after history and decoding finish')
combined.render({ ...options, frames: 6 })
assert.equal(combined.render().index, 0, 'frame-count change resets to first frame')
const newImages = combined.images.slice(6)
newImages[0].onload()
newImages[1].onload()
assert.equal(combined.advance(5000).index, 0, 'changed frame count holds first while loading')
for (let i = 2; i < newImages.length; i++) newImages[i].onload()
// Requests are pumped as earlier requests finish.
for (let i = 6; i < combined.images.length; i++) combined.images[i].onload?.()
combined.render()
assert.equal(combined.advance(300).index, 1, 'changed sequence animates only after loading')
combined.unmount()

const progressive = harness('usePreloadedFrames')
progressive.render(['a', 'b', 'c', 'd', 'e', 'f'], 'initial')
progressive.images[0].onload()
assert.equal(progressive.render().ok.join(','), 'a', 'initial imagery appears before history finishes')
assert.equal(progressive.render().settling, true, 'remaining history continues loading')
progressive.unmount()
assert.equal(progressive.timers.size, 0, 'partial loading cancels cleanly')

const retry = harness('usePreloadedFrames')
retry.render(['missing', 'good'], 'retry')
retry.images[0].onerror()
assert.equal(retry.images.length, 3, 'failed frame is retried')
retry.images[1].onload()
assert.equal(retry.render().ok.join(','), 'good', 'first pass plays before retries finish')
retry.images[2].onerror()
assert.equal(retry.images.length, 4, 'frame gets a third attempt')
retry.images[3].onload()
assert.equal(retry.render().ok.join(','), 'missing,good', 'recovered frame keeps its place')
assert.equal(retry.timers.size, 0)
retry.unmount()

const preload = harness('usePreloadedFrames')
preload.render(['a', 'b', 'c', 'd', 'e'], 'sat')
assert.equal(preload.images.length, 4)
preload.images[0].onload()
assert.equal(preload.images.length, 5)
for (let i = 1; i < preload.images.length; i++) preload.images[i].onload()
assert.equal(preload.render().ok.join(','), 'a,b,c,d,e')
assert.equal(preload.timers.size, 0)
assert.ok(preload.images.every((img) => img.onload === null && img.src === ''))
preload.render(['b', 'c', 'd', 'e', 'f'], 'sat')
assert.equal(preload.images.length, 6, 'only the new frame is requested')
preload.images[5].onload()
assert.equal(preload.render().ok.join(','), 'b,c,d,e,f')
preload.render(['x', 'y'], 'other')
assert.equal(preload.render().ok.length, 0, 'product switch clears old frames')
preload.images[6].onload()
assert.equal(preload.advance(60_000).ok.join(','), 'x', 'hung frames time out')
preload.render(['z'], 'other')
preload.unmount()
assert.equal(preload.timers.size, 0)
assert.equal(preload.images.at(-1).onload, null)
console.log('Frame loop checks passed: last-frame hold, pause, disable, bounded loading, reuse, timeout, cleanup.')
