// Part of the cabin above or around the basement: ground, grade, lake, gravel driveway.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
import * as THREE from 'three'
import { M, v, W, L, IN, RAISE, GRADE, gradeAt, P, mesh, pbr, std, sheetGeo } from '../geo.js'

// Sizes the facts do not have. "assumed" = typical value, nobody has measured it.
const NEAR = 480 // within 40 ft of the house the ground is exactly gradeAt (geo.js)
const FAR = 16000 // terrain edge north of the shore, about 1300 ft from the house (assumed)
const FAR_X = 40000 // terrain edge east and west: 1000 m, the camera range (assumed)
// The lake. No fact gives its size (permits and facts checked: only the near shore, 123'-6" south of the house). Photos
// PXL_20260906_133531021 and PXL_20251004_135433269 show a wooded far shore on open water, so it is a real lake (seen);
// far shore half a mile south (assumed), the water reaches about 3000 ft east and west of the house (assumed).
export const LAKE_LEN = 31680
export const LAKE_HALF_W = 36000
const LAKE_SIDE_FROM = 4000 // the east and west shores start this far south of the near shore, so the near shore stays straight
const LAKE_HILLS = 2400 // low wooded hills behind the far and side shores (assumed)
export const ROAD_Y = GRADE.shoreY + 370.72 * 12 // about 2967: east lot line 370.72 ft from the lake (permit p09, stated), lot lines taken as running north (assumed)
const ROAD_RISE = 16 * 12 // road about 16 ft above the house grade: county GIS p21 about 1420 at the road vs about 1404 at the house (inferred)
const ROAD_W = 240 // Teal Point Ln width 20 ft (assumed)
export const DRIVE_W = 120 // driveway 10 ft (permit p09, stated)
const LAKE_SLOPE = 0.1 // lake bed fall per inch past the shore (assumed)
const LAKE_DEPTH = 144 // lake bed levels out 12 ft below the water (assumed)
const HILLS = 900, HILLS_FROM = 4500 // distant hills (75 ft) north of the lake, so the terrain edge reads as a skyline (assumed)
const LIFT = 0.75 // driveway and road gravel sit this far above the lawn so they do not flicker

// Rectangles [x0, y0, x1, y1] for the ground cover
const MULCH = v(M.deck.south_rect) // [0, -144, 440, 0]: under the south deck (A-2 d1 36'-8" x 12'-0", stated; mulch: Ryan, 2026-11-05)
const UNDER_PORCH = [W, 0, v(M.porch.rect)[2], L] // under the porch and east deck, out to the driveway (porch A-1/A-2 10'-10", stated; gravel: photos)
const GRAVEL_FILL = [UNDER_PORCH[2], L, 520, 612] // closes the grass strip between the under-porch gravel and the curving driveway (visual fill, assumed)

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const fromHouse = (x, y) => Math.hypot(x < 0 ? -x : x > W ? x - W : 0, y < 0 ? -y : y > L ? y - L : 0)
const inRect = ([x0, y0, x1, y1], x, y) => x > x0 && x < x1 && y > y0 && y < y1

// Ground height: gradeAt within 40 ft of the house. Farther out the walkout banks get gentler (gradeAt's 1 in 2 banks would
// cut a straight ditch all the way to the lake), the ground rises to the road, drops under the lake and climbs to distant hills.
// 1 at the lake shore, less than 1 in the water: a rounded rectangle around the lake centre, east and west of the house
const lakeEdge = (x, y) => (((x - W / 2) / LAKE_HALF_W) ** 4 + (Math.max(0, GRADE.shoreY - y) / LAKE_LEN) ** 4) ** 0.25

export function heightAt(x, y) {
  const r = fromHouse(x, y)
  let z = gradeAt(x, y)
  if (r > NEAR) { // same formula as gradeAt, with the bank slope easing to 15% of it by 100 ft out (assumed)
    const cy = Math.min(y, 0), d = Math.hypot(x < 0 ? -x : x > W ? x - W : 0, y - cy)
    // only in front of the house (y < 0), so no low trough forms beside it
    const bank = GRADE.bank * (1 - 0.85 * smooth((r - NEAR) / 720) * smooth(-y / 480))
    z = Math.min(gradeAt(1e7, y), gradeAt(W / 2, cy) + bank * d) // hillside(y), walkout(cy) from gradeAt
  }
  z += ROAD_RISE * smooth((y - L - NEAR) / (ROAD_Y - L - NEAR))
  if (y >= GRADE.shoreY) return z + HILLS * smooth((r - HILLS_FROM) / (FAR - HILLS_FROM)) * smooth((y - GRADE.shoreY) / 6000)
  // lake: bed falls from the shore, then rises to the far and side shores and the low hills behind them
  z -= Math.min(LAKE_DEPTH, (GRADE.shoreY - y) * LAKE_SLOPE)
  const s = lakeEdge(x, y), f = smooth((GRADE.shoreY - y) / LAKE_SIDE_FROM)
  return z + f * ((LAKE_DEPTH + 40) * smooth((s - 0.9) / 0.1) + LAKE_HILLS * smooth((s - 1) / 0.3))
}

// Grid lines on one axis: 12" cells within 8 ft of the house, 24" to 40 ft, then each cell 20% bigger (up to 100 ft).
// a..b is the house on this axis; breaks are lines that must be in the grid (house walls, deck and porch edges, shore).
function axis(lo, hi, a, b, breaks) {
  const step = (c) => {
    const d = c < a ? a - c : c > b ? c - b : 0
    return d < 96 ? 12 : Math.min(1200, 24 + 0.2 * Math.max(0, d - NEAR))
  }
  const out = [lo]
  let c = lo
  for (const br of [...breaks, a, b, hi].filter((t) => t > lo && t <= hi).sort((p, q) => p - q)) {
    while (br - c > 1.5 * step(c)) out.push((c += step(c)))
    if (br > c) out.push((c = br))
  }
  return out
}

export const DRIVE_PTS = [[-36, 612], [400, 612], [600, 660], [720, 800], [770, 1050], [780, 1500], [780, ROAD_Y + ROAD_W / 2]]

export function buildGround() {
  const group = new THREE.Group()
  const xs = axis(-FAR_X, W + FAR_X, 0, W, [MULCH[2], UNDER_PORCH[2], GRAVEL_FILL[2]])
  const ys = axis(GRADE.shoreY - LAKE_LEN - 4000, L + FAR, 0, L, [MULCH[1], GRAVEL_FILL[3], GRADE.walkoutEndY, GRADE.flatFromY, GRADE.shoreY])
  const Z = xs.map((x) => ys.map((y) => heightAt(x, y)))

  // Height of the terrain mesh itself (same triangles), so the gravel strips follow it exactly
  const find = (a, t) => { let i = 0, j = a.length - 1; while (j - i > 1) { const m = (i + j) >> 1; a[m] <= t ? (i = m) : (j = m) } return i }
  const surface = (x, y) => {
    const i = find(xs, x), j = find(ys, y)
    const u = (x - xs[i]) / (xs[i + 1] - xs[i]), w = (y - ys[j]) / (ys[j + 1] - ys[j])
    const [z00, z10, z11, z01] = [Z[i][j], Z[i + 1][j], Z[i + 1][j + 1], Z[i][j + 1]]
    return u >= w ? z00 + u * (z10 - z00) + w * (z11 - z10) : z00 + w * (z01 - z00) + u * (z11 - z01)
  }

  // Terrain cells split by ground cover. The house footprint is left open (the basement sits there).
  const cover = (x, y) => (inRect([0, 0, W, L], x, y) ? -1 : inRect(MULCH, x, y) ? 1 : (inRect(UNDER_PORCH, x, y) || inRect(GRAVEL_FILL, x, y)) ? 2 : 0)
  const parts = [0, 1, 2].map(() => ({ pos: [], nor: [], idx: [], map: new Map() }))
  const vert = (p, i, j) => {
    const k = i * ys.length + j
    if (!p.map.has(k)) {
      const x = xs[i], y = ys[j], e = 6
      const hx = (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e), hy = (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e)
      const n = new THREE.Vector3(-hx, 1, hy).normalize() // fact normal (-hx, -hy, 1) in three.js axes
      p.map.set(k, p.pos.length / 3)
      p.pos.push(...P(x, y, Z[i][j]).toArray())
      p.nor.push(n.x, n.y, n.z)
    }
    return p.map.get(k)
  }
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const c = cover((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)
      if (c < 0) continue
      const p = parts[c]
      const a = vert(p, i, j), b = vert(p, i + 1, j), d = vert(p, i + 1, j + 1), e = vert(p, i, j + 1)
      p.idx.push(a, b, d, a, d, e)
    }
  }
  const geo = ({ pos, nor, idx }) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2))
    g.setIndex(idx)
    return g
  }

  // Gravel strip along a centre line ([x, y] points), draped on the terrain
  const ribbon = (pts, width, across = 4) => {
    const pos = [], idx = []
    pts.forEach(([x, y], k) => {
      const [xa, ya] = pts[Math.max(0, k - 1)], [xb, yb] = pts[Math.min(pts.length - 1, k + 1)]
      const len = Math.hypot(xb - xa, yb - ya), nx = -(yb - ya) / len, ny = (xb - xa) / len
      for (let s = 0; s <= across; s++) {
        const o = (s / across - 0.5) * width, px = x + nx * o, py = y + ny * o
        pos.push(...P(px, py, surface(px, py) + LIFT).toArray())
      }
      if (k) for (let s = 0; s < across; s++) { const a = (k - 1) * (across + 1) + s, b = a + across + 1; idx.push(a, b, b + 1, a, b + 1, a + 1) }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  // Driveway route: along the north wall, then curving north-east up to the road (permit p09 says so; exact line assumed)
  const route = new THREE.CatmullRomCurve3(DRIVE_PTS
    .map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal')
  const drive = route.getSpacedPoints(Math.ceil(route.getLength() / 24)).map((p) => [p.x, p.y])
  const road = []
  for (let x = -FAR_X; x <= W + FAR_X; x += 48) road.push([x, ROAD_Y + ROAD_W / 2])

  // Lawn colour varies a little from place to place so the texture does not show as a repeating grid
  const lawn = geo(parts[0]), lp = lawn.attributes.position, col = []
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i) / IN, y = -lp.getZ(i) / IN
    const n = 0.5 * Math.sin(x / 170 + 1.3 * Math.sin(y / 230)) + 0.35 * Math.sin(y / 110 - 0.7 * Math.sin(x / 140)) + 0.25 * Math.sin((x + y) / 63)
    col.push(1 + 0.12 * n, 1 + 0.08 * n, 1 + 0.04 * n)
  }
  lawn.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const grass = pbr('leafy_grass', 4, { color: 0xa4d684, vertexColors: true, roughnessMap: null, roughness: 0.95 })
  const mulch = pbr('wood_chip_path', 2)
  const gravel = pbr('gravel_floor_02', 2, { color: 0xaaa59c, roughnessMap: null, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  const water = std(0x3a5666, 0.12)
  const shape = 'Shape: src/geo.js gradeAt (assumed): level with the north grade 2 ft below the first floor (A-4, A-5, A-6, stated; raised ' + RAISE + '" for the 12 ft walls), earth banks beside the walkout (no retaining walls: Ryan, 2026-11-05, stated), then a straight fall to the lake shore 123\'-6" south of the house (permits p09, p11, stated), 16\'-3" below the north grade (permit p17, inferred).'
  group.add(
    mesh(lawn, grass,
      `Lawn (Ryan, 2026-11-05, stated; photos PXL_20260703_223907684, PXL_20260906_133531021, seen). ${shape} More than 40 ft out: rises about 16 ft toward the road (county GIS p21, inferred) and to distant hills (assumed). Lot lines 67'-6" west and 56'-0" east of the house (permits p09, p11, stated).`),
    mesh(geo(parts[1]), mulch,
      'Mulch under the south deck (Ryan, 2026-11-05, stated). Deck area 36\'-8" x 12\'-0" (A-2, stated). The walkout pad is level with the basement slab for 22 ft out from the lake wall, 10 ft past the deck (Ryan, 2026-11-05, stated); east of the house the earth bank rises under the deck (gradeAt, assumed).'),
    mesh(geo(parts[2]), gravel,
      'Gravel under the porch and east deck, out to the driveway (photos PXL_20261009_181108106, PXL_20251004_135433269, seen). Edges: porch outline 10\'-10" out from the east wall (A-1, A-2, stated) and the north wall line (assumed).  A small fill patch to the north-east joins it to the driveway (assumed).'),
    mesh(ribbon(drive, DRIVE_W), gravel,
      'Gravel driveway, 10 ft wide, along the north side of the house and curving to the north-east up to the road (permit p09, stated). Exact route assumed. Gravel right against the road gable (photo PXL_20261101_163043044, seen).'),
    mesh(ribbon(road, ROAD_W), gravel,
      'Teal Point Ln (road along the north edge of the lot; name from permit p09, stated). About 201 ft north of the house: east lot line 370.72 ft (p09) minus 123\'-6" to the lake minus the 46 ft house, lot lines taken as running north (assumed). Gravel, 20 ft wide (assumed).'),
    mesh(sheetGeo([[-FAR_X, GRADE.shoreY - LAKE_LEN - 4000], [W + FAR_X, GRADE.shoreY - LAKE_LEN - 4000], [W + FAR_X, GRADE.shoreY + 600], [-FAR_X, GRADE.shoreY + 600]], [], GRADE.lake), water,
      'Teal Lake. Water level = the lake edge, 16\'-3" below the north grade (permit p17: 100.75 at the house, 84.5 at the shore, inferred). Shore 123\'-6" south of the house (permits p09, p11, stated). Size of the lake: no fact gives it, so it is a lake about half a mile across to the far shore (assumed; the photos PXL_20260906_133531021 and PXL_20251004_135433269 show a wooded far shore on open water, seen), with wooded low hills behind it and shores far east and west of the view (assumed). Lake bed and depth: assumed.',
      { shadow: false }),
  )
  return { group, solids: [] }
}
