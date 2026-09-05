/**
 * Renders the link cards — the picture a chat client shows when someone pastes
 * a page of this site.
 *
 * Run by hand, not in CI: `node scripts/make-cards.mjs`, with Chrome listening
 * on a debugging port (see PORT below). CI has neither the browser nor the same
 * fonts, and a card that renders in a fallback face on a Linux runner is worse
 * than one that is a few weeks stale. Re-run it whenever the sky on the card
 * should be a newer sky.
 *
 * The background is the real Northeast Pacific — the Sandwich composite, which
 * carries both the cloud texture of the visible band and the enhancement colour
 * of the infrared, so it reads as weather rather than as a stock gradient. The
 * text over it is only the site's identity and the page's name: the sentence
 * describing the page is the og:description, and saying it twice in one card is
 * what made the old one read as a duplicate of itself.
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAGES, SITE_NAME } from '../src/lib/pageMeta.ts'

const PORT = 9333
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/og')
const BACKDROP =
  'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/SECTOR/tpw/Sandwich/1800x1080.jpg'

const slug = (path) => (path === '/' ? 'home' : path.slice(1).replaceAll('/', '-'))
/** "Satellite — Weather Glass" is the tab's job; the card wants "Satellite". */
const headline = (title) => {
  const name = title.split(' — ')[0].trim()
  return name === SITE_NAME || title.startsWith(SITE_NAME) ? null : name
}

const card = (page, backdrop, logo) => `<!doctype html><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box }
  html, body { width: 1200px; height: 630px; overflow: hidden }
  body { position: relative; font-family: -apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased }

  /* The frame is 1800x1080 and the card is wider than that; laying it in at
     full width and lifting it crops the top, the bottom, and with them NOAA's
     caption strip. */
  .sky { position: absolute; inset: 0; overflow: hidden; background: #01120d }
  .sky img { position: absolute; top: -60px; left: 0; width: 1200px; display: block }

  /* Dark on the left where the words are, clear on the right where the storms
     are, so the imagery is still the picture. */
  .scrim { position: absolute; inset: 0; background:
      linear-gradient(101deg, rgba(1,22,16,.95) 0%, rgba(1,22,16,.92) 34%, rgba(1,22,16,.62) 58%, rgba(1,22,16,.18) 82%, rgba(1,22,16,.06) 100%),
      linear-gradient(0deg, rgba(1,22,16,.55) 0%, rgba(1,22,16,0) 42%) }

  .plate { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 66px 72px }
  .mark { display: flex; align-items: center; gap: 30px }
  .mark img { width: 150px; height: 150px; display: block }
  .name { font-size: 82px; font-weight: 600; letter-spacing: -.028em; line-height: .98; color: #fff }
  .page { margin-top: 34px; font-size: 46px; font-weight: 500; letter-spacing: -.015em; color: #7fe8d4 }
  .foot { display: flex; align-items: baseline; gap: 14px; font-size: 24px; color: rgba(236,253,245,.68) }
  .foot b { font-weight: 600; color: rgba(255,255,255,.92) }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #2dd4bf; display: inline-block }
</style>
<div class="sky"><img src="${backdrop}" alt=""></div>
<div class="scrim"></div>
<div class="plate">
  <div>
    <div class="mark"><img src="${logo}" alt=""><div class="name">Weather<br>Glass</div></div>
    ${headline(page.title) ? `<div class="page">${headline(page.title)}</div>` : ''}
  </div>
  <div class="foot"><span class="dot"></span> <b>A passion project by ATMO students</b> @ UH Mānoa</div>
</div>`

/* ------------------------------------------------------------------ chrome */

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const target = list.find((t) => t.type === 'page')
if (!target) throw new Error(`No Chrome page on port ${PORT}`)

let id = 0
const ws = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
await new Promise((r) => (ws.onopen = r))
ws.onmessage = (m) => {
  const x = JSON.parse(m.data)
  if (x.id && pending.has(x.id)) pending.get(x.id)(x), pending.delete(x.id)
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)))
    ws.send(JSON.stringify({ id: i, method, params }))
  })

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1200,
  height: 630,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }],
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Both assets go in as data URIs: the page is loaded from a temp file:// URL,
// and a file:// document may not fetch its siblings.
const sky = Buffer.from(await (await fetch(BACKDROP)).arrayBuffer()).toString('base64')
const backdrop = `data:image/jpeg;base64,${sky}`
const logo = `data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/logo.svg')).toString('base64')}`

mkdirSync(out, { recursive: true })
const temp = resolve(out, '.card.html')

for (const page of PAGES) {
  writeFileSync(temp, card(page, backdrop, logo))
  await send('Page.navigate', { url: `file://${temp}` })
  await wait(1400)
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 })
  const file = resolve(out, `${slug(page.path)}.jpg`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.log(`${slug(page.path).padEnd(14)} ${(Buffer.from(data, 'base64').length / 1024) | 0} kB`)
}

writeFileSync(temp, '')
ws.close()
process.exit(0)
