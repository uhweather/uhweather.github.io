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
assert.equal(playback.advance(1999).index, 2)
assert.equal(playback.advance(1).index, 0)
assert.equal(playback.advance(300).index, 1)
assert.equal(playback.advance(300).index, 2)
playback.render().jump(1)
playback.render()
assert.equal(playback.advance(5000).index, 1)
playback.render(frames, 300, false)
assert.equal(playback.timers.size, 0)
playback.unmount()

const preload = harness('usePreloadedFrames')
preload.render(['a', 'b', 'c', 'd', 'e'], 'sat')
assert.equal(preload.images.length, 4)
preload.images[0].onload()
assert.equal(preload.images.length, 5)
for (const img of preload.images.slice(1)) img.onload()
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
assert.equal(preload.advance(20_000).ok.join(','), 'x', 'hung frames time out')
preload.render(['z'], 'other')
preload.unmount()
assert.equal(preload.timers.size, 0)
assert.equal(preload.images.at(-1).onload, null)
console.log('Frame loop checks passed: last-frame hold, pause, disable, bounded loading, reuse, timeout, cleanup.')
