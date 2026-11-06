// Shared building code for every part of the model.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
// three.js uses metres and y = up, so north is -z on screen. P() and boxGeo() do the conversion.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import M from '../facts/measurements.json'

export { M }
export const IN = 0.0254
export const P = (x, y, z) => new THREE.Vector3(x * IN, z * IN, -y * IN)
// Fact entries look like { value, source, confidence }; v() returns the value
export const v = (o) => (o && typeof o === 'object' && !Array.isArray(o) && 'value' in o ? o.value : o)

// Heights above the basement. The plan heights (first floor 120", eave 219", ridge 410" ...) assume
// 8'-6" basement walls. Ryan's walls are 12 ft, so the first floor is about 158". Every plan height
// from the first floor up, and the plan grade, is raised by the same amount (38", assumed: it rests
// on the truss depth, which nobody has measured). The walkout at the lake wall stays at the slab (z 0).
export const RAISE = v(M.levels_z.ryan_basement_offset) // 38
export const up = (planZ) => planZ + RAISE
export const FLOOR1 = v(M.levels_z.first_floor_ryan_check) // 158 = up(120)

export const W = v(M.footprint.width_x) // 336, east-west, outside of the foundation
export const L = v(M.footprint.length_y) // 552, north-south

// ---------- where the parts meet (every part uses these, so the parts fit together) ----------

// Log walls start on top of the floor trusses and subfloor edge (A-6 detail 5: half sill log on the subfloor)
export const LOG_BASE = v(M.levels_z.basement_underside_of_floor_system) + v(M.structure.floor_trusses.depth_ryan) // 156
// Main roof: gable, ridge north-south at x 168, 10/12 (A-3, A-4, A-5, stated). roofTop(x) is the top of the
// shingles; ridge top 124'-2" on the plans (stated), raised. ROOF_DEPTH is the vertical thickness of the roof
// (rafters, T&G ceiling, insulation, vented sheathing, shingles; A-6 lists the layers but not their sizes): assumed.
// With it the eave underside at the 3'-6" overhang comes out at 255", near the plan's 108'-3" raised (257", scaled).
export const PITCH = v(M.roof.pitch_main)
export const RIDGE_X = v(M.roof.ridge_x)
export const ROOF_DEPTH = 18
export const roofTop = (x) => up(v(M.levels_z.ridge_top)) - Math.abs(x - RIDGE_X) * PITCH
export const roofUnder = (x) => roofTop(x) - ROOF_DEPTH
// Top of all four log walls: where the roof underside meets the outer face of the east and west logs (x -5).
// Above this on the north and south ends are the gable ends (roof part).
export const WALL_TOP = roofUnder(-5) // about 286

// Ground height outside the house (assumed shape). There are no retaining walls anywhere on the property (Ryan, 2026-11-05).
// - natural hillside: level with the plan's north grade raised, up(96) = 134 (2 ft below the first floor, A-4, A-5, A-6),
//   from 24'-8" south of the north wall northward (A-4 East, A-5 West, scaled); south of that it falls in a straight
//   line to the lake shore 123'-6" south of the house (permits p09, p11), 16'-3" below the north grade
//   (permit p17: about 100.75 at the house, 84.5 at the shore; local datum)
// - walkout: in front of the lake wall (x 0 to 336) the ground is a level pad at slab height for 22 ft: the 12 ft deck
//   above plus 10 ft past it (Ryan, 2026-11-05, stated). Mulch under the deck, grass past it (Ryan). Then it falls to the shore
// - earth banks, no walls: from the walkout ground and the lake-wall corners the ground rises at a steady slope until it
//   meets the hillside. The slope is set so that along the side walls the bank reaches the north grade 24'-8" from the
//   north corner, where A-4 East and A-5 West draw the grade start to fall (about 1 in 2, assumed)
export const GRADE = { north: up(v(M.levels_z.grade_north)), walkoutEndY: v(M.grade_z.walkout_pad).y[0], shoreY: -v(M.site.house_to_lake_ft) * 12, flatFromY: v(M.grade_z.west_wall_flat_to_y) }
GRADE.lake = GRADE.north - (100.75 - 84.5) * 12 // about -61: lake surface and shore
GRADE.bank = GRADE.north / GRADE.flatFromY // rise per inch of the banks
const lerp = (pts, t) => { // straight lines between [t, value] points (sorted by t), level beyond the ends
  if (t <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, a] = pts[i - 1], [t1, b] = pts[i]; return a + ((b - a) * (t - t0)) / (t1 - t0) }
  return pts[pts.length - 1][1]
}
const hillside = (y) => lerp([[GRADE.shoreY, GRADE.lake], [GRADE.flatFromY, GRADE.north]], y)
const walkout = (y) => lerp([[GRADE.shoreY, GRADE.lake], [GRADE.walkoutEndY, 0], [0, 0]], y)
export function gradeAt(x, y) {
  const cy = Math.min(y, 0) // nearest point of the strip in front of the lake wall (x 0..336, y <= 0)
  const d = Math.hypot(x < 0 ? -x : x > W ? x - W : 0, y - cy)
  return Math.min(hillside(y), walkout(cy) + GRADE.bank * d)
}

// Small seeded random (mulberry32): the same numbers on every load, so trees and painted textures do not change
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A box on a wall line: axis 'x' runs east-west (s = x, d = y), axis 'y' north-south (s = y, d = x). Returns [x0, y0, z0, x1, y1, z1]
export const bx = (axis, s0, s1, d0, d1, z0, z1) => (axis === 'x' ? [s0, d0, z0, s1, d1, z1] : [d0, s0, z0, d1, s1, z1])
// Indexed geometry -> plain triangles, so geometries from different builders can be merged
export const ni = (g) => (g.index ? g.toNonIndexed() : g)

// [x0, y0, z0, x1, y1, z1] in fact inches -> box geometry in world space
export function boxGeo([x0, y0, z0, x1, y1, z1]) {
  const g = new THREE.BoxGeometry((x1 - x0) * IN, (z1 - z0) * IN, (y1 - y0) * IN)
  g.translate(((x0 + x1) / 2) * IN, ((z0 + z1) / 2) * IN, (-(y0 + y1) / 2) * IN)
  return g
}

// Upright cylinder centred on (x, y), from z0 to z1
export function cylGeo(x, y, r, z0, z1, seg = 24) {
  const g = new THREE.CylinderGeometry(r * IN, r * IN, (z1 - z0) * IN, seg)
  g.translate(x * IN, ((z0 + z1) / 2) * IN, -y * IN)
  return g
}

// Round log or pipe from a to b ([x, y, z]), capped ends, seg sides
export function cylBetween(a, b, r, seg = 10) {
  const pa = P(...a), pb = P(...b)
  const g = new THREE.CylinderGeometry(r * IN, r * IN, pa.distanceTo(pb), seg)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize()))
  return g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2)
}

// A board from point a to point b ([x, y, z] inches), with cross-section w (sideways) by h (up)
export function beamGeo(a, b, w, h) {
  const A3 = P(...a), B3 = P(...b)
  const len = A3.distanceTo(B3)
  const g = new THREE.BoxGeometry(len, h * IN, w * IN)
  // Length along the line, h stays as close to upright as it can, w sideways
  const x = B3.clone().sub(A3).normalize()
  const z = new THREE.Vector3().crossVectors(x, new THREE.Vector3(0, 1, 0)).normalize()
  const y = new THREE.Vector3().crossVectors(z, x)
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z))
  g.translate((A3.x + B3.x) / 2, (A3.y + B3.y) / 2, (A3.z + B3.z) / 2)
  return g
}

// Flat horizontal sheet at height z: outline and holes are [x, y] point lists. Faces up.
export function sheetGeo(outline, holes, z) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x * IN, y * IN)))
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x * IN, y * IN))))
  const g = new THREE.ShapeGeometry(shape)
  g.rotateX(-Math.PI / 2)
  g.translate(0, z * IN, 0)
  return g
}

// Texture coordinates from world position (box projection), so textures keep their real size on every part
export function worldUV(g, tile) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i))
    const [a, b] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)]
    uv.setXY(i, a / tile, b / tile)
  }
}

// One mesh from one or more geometries. label = the text shown when Ryan points at it (what it is + source).
// Geometries passed to one call must all have the same attributes (all indexed or all not).
export function mesh(geos, mat, label, { shadow = true } = {}) {
  const g = Array.isArray(geos) ? mergeGeometries(geos) : geos
  if (mat.userData.tile) worldUV(g, mat.userData.tile)
  const m = new THREE.Mesh(g, mat)
  m.userData.label = label
  m.castShadow = shadow
  m.receiveShadow = true
  return m
}

// ---------- materials ----------

const tl = new THREE.TextureLoader()
const images = new Map()
// Poly Haven texture set in public/textures/<name>_Diffuse.jpg, _nor_gl.jpg, _arm.jpg; tile = texture width in metres
export function pbr(name, tile, extra = {}) {
  const t = (k) => { // each image file loads once, however many materials use it
    const key = `${name}_${k}`
    if (!images.has(key)) {
      const x = tl.load(`/textures/${key}.jpg`)
      x.wrapS = x.wrapT = THREE.RepeatWrapping
      x.anisotropy = 8
      images.set(key, x)
    }
    return images.get(key)
  }
  const map = t('Diffuse')
  map.colorSpace = THREE.SRGBColorSpace
  const arm = t('arm')
  const m = new THREE.MeshStandardMaterial({ map, normalMap: t('nor_gl'), roughnessMap: arm, aoMap: arm, ...extra })
  m.userData.tile = tile
  return m
}
export const std = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })

// Materials more than one part uses
const noTile = (m) => { delete m.userData.tile; return m } // the mesh has its own texture coordinates (grain along the log, rows along the eave)
export const mats = {
  // Red-orange stained pine logs (photos). Walls, roof, porch and interior all use this one; copy it with .clone() to change it.
  log: noTile(pbr('coated_pine', 1, { color: 0xffdcc4, roughnessMap: null, roughness: 0.75 })),
  logEnd: std(0xb9794a, 0.8), // log end grain
  // Dark gray asphalt shingles (photos). Closest Poly Haven set is slate; its roughness map is left off so the roof stays matte
  shingle: noTile(pbr('roof_slates_03', 1, { color: 0x6e6e72, roughnessMap: null, roughness: 0.9 })),
  trim: std(0x34302c, 0.7), // dark fascia and rake boards (photo PXL_20261009_180831582)
  doorWhite: std(0xf1efe9, 0.5),
  lumber: pbr('plywood', 0.5, { color: 0xffe9c4 }),
  planks: pbr('wood_planks', 1.2), // wood-look plank flooring (photos, main level)
  vinyl: std(0xf4f4f1, 0.4),
  glass: new THREE.MeshStandardMaterial({ color: 0xa9c4d2, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false }),
  metal: std(0xa9adb1, 0.35, { metalness: 0.6 }),
  black: std(0x1d1d20, 0.45),
}

const BOARD = 5.5 // face width of 1x6 tongue-and-groove (assumed, the usual size)
// Light knotty-pine tongue-and-groove, painted on a canvas: 4 horizontal boards per tile with a dark groove at each joint
export function pineBoards() {
  const n = 512, c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d'), r = rng(7), bh = n / 4
  for (let b = 0; b < 4; b++) {
    const y0 = b * bh, tone = 135 + r() * 25
    g.fillStyle = `rgb(${tone + 40},${tone + 8},${tone - 50})` // warm honey pine
    g.fillRect(0, y0, n, bh)
    for (let i = 0; i < 40; i++) { // grain: long faint streaks along the board
      g.strokeStyle = `rgba(120,70,20,${0.05 + r() * 0.1})`
      g.lineWidth = 1 + r() * 2
      const y = y0 + 4 + r() * (bh - 8)
      g.beginPath(); g.moveTo(0, y)
      g.bezierCurveTo(n / 3, y + (r() - 0.5) * 10, (2 * n) / 3, y + (r() - 0.5) * 10, n, y)
      g.stroke()
    }
    if (r() < 0.7) { // a knot
      g.fillStyle = 'rgba(110,60,20,0.55)'
      g.beginPath(); g.ellipse(r() * n, y0 + bh / 2, 6 + r() * 6, 4 + r() * 3, 0, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = 'rgba(70,40,15,0.8)' // groove at the joint
    g.fillRect(0, y0, n, 3)
  }
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.anisotropy = 8
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.75 })
  m.userData.tile = 4 * BOARD * IN // the tile is 4 boards tall (and as wide)
  return m
}
