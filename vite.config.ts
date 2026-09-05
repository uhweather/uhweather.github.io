import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { PAGES, type PageMeta } from './src/lib/pageMeta'

const here = dirname(fileURLToPath(import.meta.url))

/** Where the build will be served from, absolute — link cards need real URLs. */
function siteRoot(): string {
  const origin = (process.env.SITE_URL ?? 'https://uhweather.github.io').replace(/\/+$/, '')
  const base = process.env.BASE_PATH ?? '/'
  return origin + (base.endsWith('/') ? base : `${base}/`)
}

const escape = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Swaps one meta tag's content, matched on its name or property. */
function meta(html: string, key: string, value: string): string {
  const attr = key.startsWith('og:') ? 'property' : 'name'
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  return html.replace(re, `$1${escape(value)}$2`)
}

/** public/og/<slug>.jpg, made by scripts/make-cards.mjs. */
const cardSlug = (path: string) => (path === '/' ? 'home' : path.slice(1).replaceAll('/', '-'))

function forPage(shell: string, page: PageMeta, root: string): string {
  const url = page.path === '/' ? root : `${root}${page.path.slice(1)}/`
  const card = `${root}og/${cardSlug(page.path)}.jpg`
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`)
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escape(url)}$2`)
  for (const [key, value] of [
    ['description', page.description],
    ['og:title', page.title],
    ['og:description', page.description],
    ['og:url', url],
    ['og:image', card],
    // Describes the picture, not the page — og:title already names the page.
    ['og:image:alt', 'Weather Glass over a GOES-West Sandwich composite of the Northeast Pacific'],
    ['twitter:title', page.title],
    ['twitter:description', page.description],
    ['twitter:image', card],
  ] as [string, string][]) {
    html = meta(html, key, value)
  }
  return html
}

/**
 * A real HTML file per route, each carrying its own link card.
 *
 * GitHub Pages serves 404.html for a path it has no file for, which is what
 * made client-side routes work on a direct hit — but it means every route
 * unfurls as the same page in a chat window, and any crawler that does not run
 * JavaScript sees one description for eight pages. Writing the shell out per
 * route with that route's metadata fixes both, and the 404 fallback stays for
 * paths that are genuinely not pages.
 *
 * .nojekyll stops Pages running the output through Jekyll.
 */
function pageShells(): Plugin {
  return {
    name: 'page-shells',
    apply: 'build',
    closeBundle() {
      const out = resolve(here, 'dist')
      const root = siteRoot()
      const shell = readFileSync(resolve(out, 'index.html'), 'utf8').replaceAll('__SITE__', root)

      for (const page of PAGES) {
        const dir = page.path === '/' ? out : resolve(out, page.path.slice(1))
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), forPage(shell, page, root))
      }

      // An unknown path is not one of the pages, so it keeps the site-level card.
      copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
      writeFileSync(resolve(out, '.nojekyll'), '')
    },
  }
}

// BASE_PATH lets one build target either a user/org Pages site ("/") or a
// project Pages site ("/weather-server/"). The deploy workflow sets it.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), pageShells()],
  build: { outDir: 'dist', sourcemap: false },
})
