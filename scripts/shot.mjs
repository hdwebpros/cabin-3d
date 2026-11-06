// Screenshots from any camera position, for checking one part of the model.
// Run: npm run shot -- <out-prefix> '<json list of shots>'   (the lock lets only one screenshot run at a time, to save memory)
// Each shot: { "name": "se", "cam": [x, y, z], "target": [x, y, z], "shell": true } in fact inches
// (x east, y north, z up from the basement slab). Or { "name": "lake", "view": "overview" } for a view in src/main.js.
// Add "version": 1 to a shot to show that version first (0 = as it sits; list in VERSIONS in src/main.js).
// Writes <out-prefix>-<name>.png and prints any console errors.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { openApp } from './browser.mjs'

const [prefix, json] = process.argv.slice(2)
if (!prefix || !json) throw new Error('usage: node scripts/shot.mjs <out-prefix> \'[{"name":"se","cam":[x,y,z],"target":[x,y,z]}]\'')
mkdirSync(dirname(prefix), { recursive: true })
const { page, errors, close } = await openApp()
try {
  for (const s of JSON.parse(json)) {
    await page.evaluate((s) => window.__cabin.setVersion(s.version ?? 0), s)
    await page.evaluate((s) => (s.view ? window.__cabin.setView(s.view) : window.__cabin.look(s.cam, s.target, s.shell ?? true)), s)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${prefix}-${s.name}.png` })
    console.log(`saved ${prefix}-${s.name}.png`)
  }
} finally {
  console.log(errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors')
  await close()
}
