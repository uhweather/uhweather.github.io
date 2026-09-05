import { copyFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages serves 404.html for any path it has no file for. Shipping a copy
 * of the app shell there makes client-side routes like /radar work on a direct
 * hit or refresh, without needing a server rewrite rule.
 *
 * .nojekyll stops Pages running the output through Jekyll.
 */
function githubPagesSpaFallback(): Plugin {
  return {
    name: 'gh-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const out = resolve(dirname(fileURLToPath(import.meta.url)), 'dist')
      copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
      writeFileSync(resolve(out, '.nojekyll'), '')
    },
  }
}

// BASE_PATH lets one build target either a user/org Pages site ("/") or a
// project Pages site ("/weather-server/"). The deploy workflow sets it.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), githubPagesSpaFallback()],
  build: { outDir: 'dist', sourcemap: false },
})
