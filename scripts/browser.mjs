// Starts the app on a free port and opens it in headless system Chromium.
// Collects console errors, page errors and failed requests in `errors`.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

export async function openApp() {
  const server = await createServer({ server: { port: 5199, strictPort: false, hmr: false }, logLevel: 'error' }) // no reloads mid-test when files change
  await server.listen()
  // System Chromium (no Playwright download needed), through a wrapper that keeps it on 2 cores at low priority
  const executablePath = existsSync('/usr/bin/chromium') ? new URL('./chromium-low.sh', import.meta.url).pathname : undefined
  const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const page = await browser.newPage({ viewport: { width: 1400, height: 880 } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`))
  await page.goto(server.resolvedUrls.local[0])
  await page.waitForFunction(() => window.__cabin, null, { timeout: 60000 })
  await page.waitForTimeout(4000) // textures and sky image
  const close = async () => { await browser.close(); await server.close() }
  return { page, errors, close }
}
