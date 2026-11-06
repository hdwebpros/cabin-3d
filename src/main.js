import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildBasement, makeWalker } from './basement.js'
import { buildGround, heightAt } from './shell/ground.js'
import { buildMainWalls } from './shell/walls.js'
import { buildRoof } from './shell/roof.js'
import { buildPorchDeck } from './shell/porch.js'
import { buildMainInterior } from './shell/interior.js'
import { buildProposedBasement } from './variants/proposed-basement.js'
import { buildBasementFinish } from './variants/basement-finish.js'
import { buildStairWalls } from './variants/stair-walls.js'
import { buildLandscape } from './shell/landscape.js'
import { P, IN, FLOOR1, GRADE } from './geo.js'

const EYE = 65 // eye height in inches

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.prepend(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xbfd3e6)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.35
new HDRLoader().load('/hdri/sky_1k.hdr', (t) => {
  t.mapping = THREE.EquirectangularReflectionMapping
  scene.background = t
  changed()
})

const model = buildBasement()
const { W, L, H } = model.box
// The ground is always shown. The shell (everything above the basement) can be hidden to look into the basement.
const ground = buildGround()
const landscape = buildLandscape() // trees and plants; always shown, like the ground
const parts = [buildMainWalls(), buildRoof(), buildPorchDeck(), buildMainInterior()]
const shell = new THREE.Group()
for (const p of parts) shell.add(p.group)
const world = new THREE.Group()
world.add(model.group, ground.group, landscape.group, shell)
scene.add(world)

// Versions of the cabin. "As it sits" is the base: everything above. Each other version turns on layers on top of it.
// A layer builds { group, solids, ceiling?: a group inside its group that shows and hides with the basement ceiling }.
// All layers are built at the start so switching is instant.
const LAYERS = { proposed: buildProposedBasement(), stairWalls: buildStairWalls(model), finish: buildBasementFinish(model) }
const VERSIONS = [
  { name: 'As it sits', layers: [] },
  { name: 'Proposed basement', layers: ['proposed', 'stairWalls'] },
  { name: 'Proposed basement, finished', layers: ['proposed', 'stairWalls', 'finish'] },
]
for (const l of Object.values(LAYERS)) world.add(l.group)
const baseSolids = [model.solids, ground.solids, landscape.solids, ...parts.map((p) => p.solids)].flat()
const walkSolids = [...baseSolids] // the walker reads this list; setVersion refills it
let version = 0

// Lights
scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x6b5a48, 0.5))
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2) // the lake is south, so the sun comes in through the walkout
sun.position.copy(P(W / 2 + 500, -1400, 1300))
sun.target.position.copy(P(W / 2, L / 2, 0))
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 })
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.02
scene.add(sun, sun.target)
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 3 })
for (const [x, y] of [[250, 140], [250, 410], [90, 350], [110, 120]]) {
  const light = new THREE.PointLight(0xffe6c4, 30, 700 * IN, 2) // for viewing (photos show one bulb and string lights); reach limited to the basement, these lights cast no shadows
  light.position.copy(P(x, y, H - 6))
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.5 * IN), bulbMat)
  bulb.position.copy(light.position)
  bulb.userData.label = 'Light bulb, placed so the model is easy to see. The photos show one bare bulb and string lights.'
  model.ceiling.add(light, bulb)
}

// Cameras and controls
// Draw only when the picture changes (camera moves, a view, version or checkbox changes, a texture arrives),
// so the computer is quiet while nobody touches the model.
let redraw = 3 // frames still to draw
const changed = () => { redraw = 3 }
THREE.DefaultLoadingManager.onProgress = changed

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 1000)
const orbit = new OrbitControls(camera, renderer.domElement)
orbit.enableDamping = true
orbit.addEventListener('change', changed)
const look = new PointerLockControls(camera, document.body)
look.addEventListener('change', changed)
// Outside the foundation the walker stands on the drawn ground (or the lake surface, so it cannot sink into the water)
const outside = (x, y) => x < 0 || x > W || y < 0 || y > L
const walker = makeWalker(walkSolids, { floor: (x, y) => (outside(x, y) ? Math.max(heightAt(x, y), GRADE.lake) : 0) })
const me = { x: 40, y: 60, z: 0 }

// cam and target are [x, y, z] in fact inches. shell: show the cabin above the basement (true) or not (false).
const VIEWS = {
  overview: { mode: 'overview', shell: true, cam: [W + 520, -1000, 430], target: [W / 2, 220, 140] }, // from the lake side
  driveway: { mode: 'overview', shell: true, cam: [W + 500, L + 900, 500], target: [W / 2, L / 2, 200] },
  basement: { mode: 'overview', shell: false, cam: [W + 170, -230, 560], target: [W / 2, L / 2 - 20, 0] },
  top: { mode: 'overview', shell: false, cam: [W / 2, L / 2, 760], target: [W / 2, L / 2 + 1, 0] },
  'walk-start': { mode: 'walk', at: [40, 60], lookAt: [W / 2, L * 0.75, 40] },
  'walk-lake': { mode: 'walk', at: [240, 380], lookAt: [W / 2, 0, 50] },
  'walk-stairs': { mode: 'walk', at: [W * 0.62, 110], lookAt: [36, 200, 70] },
  'walk-utility': { mode: 'walk', at: [W * 0.62, 350], lookAt: [20, 360, 45] },
  'walk-in-utility': { mode: 'walk', at: [150, 345], lookAt: [10, 380, 55] },
  'walk-bath': { mode: 'walk', at: [W * 0.6, 500], lookAt: [30, 470, 10] },
  'walk-main': { mode: 'walk', at: [150, 110], z: FLOOR1, lookAt: [60, 330, FLOOR1 + 50] }, // main floor, great room
}

const $ = (id) => document.getElementById(id)
const help = {
  overview: 'Drag to turn. Right-drag to slide. Scroll to zoom. Point at a part to see what it is and where its size came from. Press V for the next version.',
  walk: 'Walk with W A S D. Look around: drag with the mouse, or click once and move the mouse (Esc gives the mouse back). Arrow keys: left and right turn, up and down walk. Hold Shift to walk faster. Press V for the next version.',
}
let mode = 'overview'
let pickDue = false

function setMode(m) {
  mode = m
  orbit.enabled = m === 'overview'
  if (m === 'overview') look.unlock()
  $('btn-overview').classList.toggle('on', m === 'overview')
  $('crosshair').style.display = m === 'walk' ? 'block' : 'none'
  $('help').textContent = help[m]
  shell.visible = m === 'walk' || $('chk-shell').checked
  model.ceiling.visible = shell.visible || $('chk-ceiling').checked // the cabin sits on the floor trusses
  $('chk-shell').disabled = m === 'walk'
  $('chk-ceiling').disabled = shell.visible
  for (const l of Object.values(LAYERS)) if (l.ceiling) l.ceiling.visible = model.ceiling.visible
  changed()
}

function setVersion(i) {
  version = (i + VERSIONS.length) % VERSIONS.length
  const on = VERSIONS[version].layers
  for (const [k, l] of Object.entries(LAYERS)) l.group.visible = on.includes(k)
  walkSolids.length = 0
  walkSolids.push(...baseSolids, ...on.flatMap((k) => LAYERS[k].solids))
  document.querySelectorAll('#versions button').forEach((b, j) => b.classList.toggle('on', j === version))
  pickDue = true
  changed()
}

function setView(name) {
  const view = VIEWS[name]
  if (view.shell !== undefined) $('chk-shell').checked = view.shell
  setMode(view.mode)
  $('btn-walk').classList.toggle('on', view.mode === 'walk' && !view.z)
  $('btn-walk-main').classList.toggle('on', view.mode === 'walk' && !!view.z)
  if (view.mode === 'overview') {
    camera.position.copy(P(...view.cam))
    orbit.target.copy(P(...view.target))
    orbit.update()
  } else {
    ;[me.x, me.y] = view.at
    me.z = walker.ground(me.x, me.y, view.z ?? 0)
    camera.position.copy(P(me.x, me.y, me.z + EYE))
    camera.lookAt(P(...view.lookAt))
  }
  pickDue = true
}

$('btn-overview').onclick = () => setView('overview')
$('btn-walk').onclick = () => setView('walk-start')
$('btn-walk-main').onclick = () => setView('walk-main')
VERSIONS.forEach((ver, i) => {
  const b = document.createElement('button')
  b.textContent = ver.name
  b.onclick = () => setVersion(i)
  $('versions').append(b)
})
$('chk-ceiling').onchange = $('chk-shell').onchange = () => setMode(mode)
// Looking around in walk mode, like a game: drag with the mouse, or click once to steer with the mouse
// without holding a button (Esc gives the mouse back). Left and right arrow keys turn.
const eul = new THREE.Euler(0, 0, 0, 'YXZ')
function turn(dx, dy) {
  eul.setFromQuaternion(camera.quaternion)
  eul.y -= dx
  eul.x = Math.max(-1.5, Math.min(1.5, eul.x - dy))
  camera.quaternion.setFromEuler(eul)
  changed()
}
let drag = null
renderer.domElement.addEventListener('pointerdown', () => { if (mode === 'walk' && !look.isLocked) drag = { moved: 0 } })
addEventListener('pointermove', (e) => {
  if (!drag || !e.buttons) return
  drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY)
  turn(e.movementX * 0.005, e.movementY * 0.005)
})
addEventListener('pointerup', () => { if (drag && drag.moved < 5) look.lock(); drag = null })

const keys = new Set()
addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'KeyV' && !e.repeat) setVersion(version + 1) // V: next version
})
addEventListener('keyup', (e) => keys.delete(e.code))
addEventListener('blur', () => keys.clear())
const held = (...codes) => codes.some((c) => keys.has(c))

const fwd = new THREE.Vector3()
function walk(dt) {
  const f = held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown')
  const r = held('KeyD') - held('KeyA')
  const t = held('ArrowRight') - held('ArrowLeft')
  if (t) turn(t * 1.8 * dt, 0) // radians per second
  if (f || r) {
    camera.getWorldDirection(fwd)
    const fx = fwd.x, fy = -fwd.z, len = Math.hypot(fx, fy) || 1 // facing direction on the floor plan
    const dist = (held('ShiftLeft', 'ShiftRight') ? 110 : 50) * dt // inches per second
    let dx = (fx * f + fy * r) / len, dy = (fy * f - fx * r) / len
    const n = Math.hypot(dx, dy)
    dx = (dx / n) * dist
    dy = (dy / n) * dist
    if (!walker.blocked(me.x + dx, me.y, me.z)) me.x += dx
    if (!walker.blocked(me.x, me.y + dy, me.z)) me.y += dy
  }
  const g = walker.ground(me.x, me.y, me.z)
  if (f || r || Math.abs(g - me.z) > 0.01) changed()
  me.z += (g - me.z) * Math.min(1, dt * 14)
  camera.position.copy(P(me.x, me.y, me.z + EYE))
}

// Point at a part to see its label
const ray = new THREE.Raycaster()
const mouse = new THREE.Vector2(9, 9)
const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true }
let lastLabel = null
function pick() {
  camera.updateMatrixWorld() // setView may have moved the camera since the last frame
  ray.setFromCamera(mode === 'walk' ? new THREE.Vector2(0, 0) : mouse, camera)
  const hit = ray.intersectObject(world, true).find((h) => h.object.userData.label && shown(h.object))
  const label = hit ? hit.object.userData.label : null
  if (label !== lastLabel) {
    lastLabel = label
    $('info').textContent = label || ''
    $('info').style.display = label ? 'block' : 'none'
  }
}
renderer.domElement.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  pickDue = true
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  changed()
})

const clock = new THREE.Clock()
let frame = 0
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1)
  if (mode === 'walk') walk(dt)
  else orbit.update()
  if (pickDue || (mode === 'walk' && frame % 15 === 0)) { pick(); pickDue = false }
  frame++
  if (redraw > 0) { redraw--; renderer.render(scene, camera) }
})

setVersion(0)
setView('overview')

// For the browser check (scripts/check.mjs) and screenshots (scripts/shot.mjs)
window.__cabin = {
  camDir: (v) => camera.getWorldDirection(v), me,
  setView, setVersion, VERSIONS, LAYERS, model, renderer, walker, VIEWS, world, ground, landscape, parts, THREE,
  look(cam, target, showShell = true) {
    VIEWS._look = { mode: 'overview', shell: showShell, cam, target }
    setView('_look')
    delete VIEWS._look
  },
}
