// Browser check: starts the app, loads it in headless Chromium, fails on console errors,
// checks the stair numbers and the walking rules, and saves a screenshot of each view to work/shots/.
// Run: npm run check
import { mkdirSync } from 'node:fs'
import { openApp } from './browser.mjs'

const { page, errors, close } = await openApp()

const check = (ok, msg) => {
  console.log(ok ? 'ok  ' : 'FAIL', msg)
  if (!ok) process.exitCode = 1
}

try {
  const st = await page.evaluate(() => window.__cabin.model.stairs)
  check(st.risers === 21, `basement stair has 21 steps for a 158" rise (got ${st.risers})`)
  check(Math.abs(st.bottomY - 88.1) < 0.01, `bottom step is at y 88.1 (got ${st.bottomY})`)

  const w = await page.evaluate(() => {
    const w = window.__cabin.walker
    return {
      slab: w.ground(250, 300, 0),
      firstStep: w.ground(40, 95, 0),
      landing: w.ground(35, 255, 100),
      westWall: w.blocked(5, 300, 0),
      stairSide: w.blocked(40, 120, 0),
      underUpperRun: w.blocked(90, 250, 0),
      utilityDoor: w.blocked(168, 347, 0),
      utilityWall: w.blocked(168, 300, 0),
    }
  })
  check(w.slab === 0, 'walker stands on the slab in the open area')
  check(Math.abs(w.firstStep - 7.524) < 0.01, `walker steps onto the first step (z ${w.firstStep})`)
  check(Math.abs(w.landing - st.landingZ) < 0.01, `walker stands on the landing (z ${w.landing})`)
  check(w.westWall && w.stairSide && w.utilityWall, 'walls and the side of the stair block walking')
  check(!w.underUpperRun && !w.utilityDoor, 'walker can pass under the upper stair run and through the utility doorway')

  const sh = await page.evaluate(() => {
    const { world, ground, parts, THREE } = window.__cabin
    const count = (g) => { let n = 0; g.traverse((o) => o.isMesh && n++); return n }
    const unlabeled = []
    world.traverse((o) => o.isMesh && !o.userData.label && !o.material.transparent && unlabeled.push(o.parent?.type))
    // Straight down from inside the basement: the first thing hit must be the slab, not the outside ground
    const ray = new THREE.Raycaster(new THREE.Vector3(250 * 0.0254, 100 * 0.0254, -300 * 0.0254), new THREE.Vector3(0, -1, 0))
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true }
    const hit = ray.intersectObject(world, true).find((h) => shown(h.object))
    return { meshes: [ground, ...parts].map((p) => count(p.group)), unlabeled: unlabeled.length, below: hit?.object.userData.label?.slice(0, 40) }
  })
  check(sh.meshes.every((n) => n > 0), `each cabin part draws something (meshes: ground, walls, roof, porch, main-floor inside = ${sh.meshes.join(', ')})`)
  check(sh.unlabeled === 0, `every solid part has a label (${sh.unlabeled} without)`)
  const vs = await page.evaluate(() => {
    const { VERSIONS, setVersion } = window.__cabin
    const names = VERSIONS.map((v, i) => (setVersion(i), v.name))
    setVersion(0)
    return names
  })
  check(vs.length >= 2, `every version switches on (${vs.join(', ')})`)
  check(sh.below?.startsWith('Basement slab'), `no outside ground inside the basement (straight down hits: ${sh.below})`)

  mkdirSync('work/shots', { recursive: true })
  const views = await page.evaluate(() => Object.keys(window.__cabin.VIEWS))
  for (const name of views) {
    await page.evaluate((n) => window.__cabin.setView(n), name)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `work/shots/${name}.png` })
  }
  const tris = await page.evaluate(() => window.__cabin.renderer.info.render.triangles)
  check(tris > 10000, `scene draws (${tris} triangles in the last view)`)
  await page.evaluate(() => window.__cabin.setView('overview'))
  await page.waitForTimeout(300)
  const all = await page.evaluate(() => window.__cabin.renderer.info.render.triangles)
  check(all < 1500000, `whole cabin is light enough to turn smoothly (${all} triangles in the overview)`)
} catch (e) {
  check(false, String(e))
} finally {
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await close()
}
