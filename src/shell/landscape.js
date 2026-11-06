// Yard and landscaping around the cabin: trees, shrubs, rocks, shore, dock. Always shown, like the ground.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
// Every tree stands on heightAt (ground.js), which is gradeAt (geo.js) within 40 ft of the house.
// Where things stand comes from the outside photos (positions approximate, "seen"); tree sizes are assumed.
// Notes per photo: work/findings/landscape.md. Same result on every load: all randomness comes from rng().
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { W, L, IN, GRADE, P, rng, boxGeo, cylGeo, beamGeo, mesh, std } from '../geo.js'
import { heightAt, DRIVE_PTS, ROAD_Y, DRIVE_W, LAKE_LEN, LAKE_HALF_W } from './ground.js'

const PHOTOS = 'PXL_20261009_180831582, PXL_20260906_133531021, PXL_20251004_135433269, PXL_20261017_194345052'
const PATH_X = W / 2 // the mown path from the walkout down to the dock (photos PXL_20260906_133531021, PXL_20261017_194345052: seen; its x is assumed)
const YARD = [-130, -330, 560, 760] // kept clear: house, deck, porch, level walkout pad, driveway along the north wall (x0, y0, x1, y1)
const SOLID_BOX = [-900, -800, 1300, 1500] // trunks inside this box stop the walker
const SHORE_Y = GRADE.shoreY

const between = (rnd, a, b) => a + (b - a) * rnd()
const rectDist = ([x0, y0, x1, y1], x, y) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1))
const route = new THREE.CatmullRomCurve3(DRIVE_PTS.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getSpacedPoints(160)
const driveDist = (x, y) => (x < -400 || x > 1200 || y < 300 ? Infinity : Math.min(...route.map((p) => Math.hypot(p.x - x, p.y - y))))

// Sight corridors: no trunk or crown between a view camera and its target. Camera and target x, y are copied from VIEWS in src/main.js
// (overview: cam [W+520, -1000], target [W/2, 220]; driveway: cam [W+500, L+900], target [W/2, L/2]). Keep them in step by hand.
const SIGHT = [[W + 520, -1000, W / 2, 220], [W + 500, L + 900, W / 2, L / 2]]
const SIGHT_HALF = 210 // 35 ft wide at the target, widening by 0.2 in per inch towards the camera (assumed)
function inSight(x, y, cr) {
  return SIGHT.some(([cx, cy, tx, ty]) => {
    const dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy)
    const t = Math.min(Math.max(((x - cx) * dx + (y - cy) * dy) / len, -300), len + 200) // a little past both ends
    const along = Math.min(Math.max(t, 0), len)
    const d = Math.hypot(cx + (dx / len) * along - x, cy + (dy / len) * along - y)
    return d < SIGHT_HALF + 0.2 * (len - along) + cr
  })
}

// Is the spot free for something with a crown of radius cr? Off the house, deck, porch, pad, driveway, road, path, water and the sight corridors.
function free(x, y, cr = 0, sight = true) {
  if (sight && inSight(x, y, cr)) return false
  if (rectDist(YARD, x, y) < cr * 0.55) return false
  if (driveDist(x, y) < DRIVE_W / 2 + 50 + cr * 0.4) return false
  if (y > ROAD_Y - 120 - cr * 0.3 && y < ROAD_Y + 360 + cr * 0.3) return false
  if (Math.abs(x - PATH_X) < 130 + cr * 0.3 && y < 0 && y > SHORE_Y - 200) return false
  return heightAt(x, y) > GRADE.lake + 25
}

// One candidate per grid cell, at a jittered spot: even spacing without a spacing test. keep(x, y, roll) says yes or no.
function scatter(rnd, [x0, x1, y0, y1], cell, keep) {
  const out = []
  for (let x = x0; x < x1; x += cell) {
    for (let y = y0; y < y1; y += cell) {
      const px = x + rnd() * cell, py = y + rnd() * cell
      if (keep(px, py, rnd())) out.push([px, py])
    }
  }
  return out
}

// ---------- tree kinds (all sizes assumed: tall slender north-woods trees; kinds and mix seen in the photos) ----------
// h = height, cr = crown radius, tr = trunk radius (all inches); lo = where the crown starts, as a part of h; trunk = trunk height as a part of h.
// Photo PXL_20261009_180831582: trunks bare up to 25-40 ft, narrow crowns in several clumps; spruce are dark cones down to the ground.
const KINDS = {
  pine: { h: [650, 950], cr: [75, 105], tr: [8, 12], lo: 0.6, trunk: 0.92, bark: 0x5a4a40 }, // white / red pine, right side of the photo
  spruce: { h: [380, 650], cr: [55, 85], tr: [4, 7], lo: 0.04, trunk: 0.5, bark: 0x453a32 }, // spruce / balsam, left of the cabin
  birch: { h: [520, 780], cr: [45, 70], tr: [3.5, 5.5], lo: 0.5, trunk: 0.93, bark: 0xffffff }, // paper birch: white trunk, marks in the vertex colours
  maple: { h: [480, 720], cr: [80, 115], tr: [6, 10], lo: 0.5, trunk: 0.9, bark: 0x655a50 }, // maple / aspen in fall colour
}
const NEAR_MIX = [['spruce', 0.25], ['maple', 0.5], ['birch', 0.78], ['pine', 1]]
const FAR_MIX = [['spruce', 0.3], ['pine', 0.55], ['maple', 0.8], ['birch', 1]]
const pick = (mix, r) => mix.find(([, p]) => r < p)[0]

const FALL = [0xc98a1c, 0xd2691e, 0xb5651d, 0xd9a52e].map((c) => new THREE.Color(c)) // fall leaves in the October photos (seen)
const LEAF_GREEN = [0x4a6a2a, 0x3e5e26, 0x5a7430].map((c) => new THREE.Color(c))
const EVERGREEN = [0x1f3a24, 0x264530, 0x2e4a2a, 0x233f2c].map((c) => new THREE.Color(c))
const VARIANTS = 3
const oneOf = (rnd, list) => list[Math.floor(rnd() * list.length)]
function newTree(rnd, kind, x, y) {
  const k = KINDS[kind], h = between(rnd, ...k.h)
  const deciduous = kind === 'maple' || kind === 'birch'
  const crown = deciduous
    ? oneOf(rnd, rnd() < 0.7 ? FALL : LEAF_GREEN).clone()
    : oneOf(rnd, EVERGREEN).clone()
  crown.offsetHSL(between(rnd, -0.015, 0.015), 0, between(rnd, -0.03, 0.03))
  return {
    kind, x, y, z: heightAt(x, y), h, cr: between(rnd, ...k.cr) * (0.85 + 0.15 * h / k.h[1]), tr: between(rnd, ...k.tr), th: h * k.trunk, rot: rnd() * 6.28,
    variant: Math.floor(rnd() * VARIANTS), crownColor: crown,
    barkColor: new THREE.Color(k.bark).offsetHSL(0, 0, between(rnd, -0.04, 0.04)),
  }
}

// ---------- shapes ----------
// A smooth blob: icosphere with shared vertices, radius jittered, smooth normals, a darker underside. Shaded by vertex colours (multiplied by the tree colour).
function blob(rnd, detail, [cx, cy, cz], [sx, sy, sz], tone = 1) {
  let g = new THREE.IcosahedronGeometry(1, detail)
  g.deleteAttribute('uv'); g.deleteAttribute('normal')
  g = mergeVertices(g)
  const p = g.attributes.position, col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const j = 1 + (rnd() - 0.5) * 0.3
    const x = p.getX(i) * j, y = p.getY(i) * j, z = p.getZ(i) * j
    p.setXYZ(i, x * sx + cx, y * sy + cy, z * sz + cz)
    const b = tone * (0.68 + 0.32 * (y + 1) / 2 + (rnd() - 0.5) * 0.12)
    col.set([b, b, b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}
// Deciduous: 4-6 clumps high on the trunk, spread irregularly. Pine: layered flat clumps. Spruce: a ragged dark cone to the ground.
// Heights are parts of the tree height; widths are parts of the crown radius; asp = crown radius / height, so clumps stay round after the instance scale.
// lod 0 = near trees, 1 = farther woods (fewer clumps and facets), 2 = distant woods (a clump or two, a few facets)
function crownGeo(kind, seed, lod) {
  const rnd = rng(seed), k = KINDS[kind], detail = lod ? 0 : 1
  const parts = []
  if (kind === 'spruce') {
    const pts = [], tiers = [6, 3, 1][lod]
    for (let i = 0; i < tiers; i++) {
      const yb = k.lo + (0.96 - k.lo) * (i / tiers) * 0.95, R = 1 - (i / tiers) * 0.8, step = (0.96 - k.lo) / tiers
      pts.push(new THREE.Vector2(R, yb), new THREE.Vector2(R * 0.5, yb + step * 1.05))
    }
    pts.push(new THREE.Vector2(0.01, 1))
    pts.unshift(new THREE.Vector2(0.01, k.lo))
    let g = new THREE.LatheGeometry(pts, [12, 6, 4][lod])
    g.deleteAttribute('uv'); g.deleteAttribute('normal')
    g = mergeVertices(g)
    const p = g.attributes.position, col = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const j = 1 + (rnd() - 0.5) * 0.3, y = p.getY(i)
      p.setXYZ(i, p.getX(i) * j, y + (rnd() - 0.5) * 0.02, p.getZ(i) * j)
      const b = 0.6 + 0.45 * y + (rnd() - 0.5) * 0.12
      col.set([b, b, b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }
  const asp = (k.cr[0] + k.cr[1]) / (k.h[0] + k.h[1])
  const clump = (ang, rad, y, r, flat) => parts.push(blob(rnd, detail, [Math.cos(ang) * rad, y, Math.sin(ang) * rad], [r, r * asp * flat, r], 0.85 + rnd() * 0.3))
  if (kind === 'pine') {
    const n = [5, 3, 2][lod], a0 = rnd() * 6
    for (let i = 0; i < n; i++) clump(a0 + i * 2.4 + rnd(), (i < n - 1 ? 0.15 + rnd() * 0.35 : 0) , k.lo + (0.98 - k.lo) * (i / (n - 1)), (0.85 - 0.5 * i / n) * (0.8 + rnd() * 0.4), 0.55)
  } else {
    const n = [4, 1, 0][lod] + Math.floor(rnd() * (lod === 2 ? 2 : 3)), a0 = rnd() * 6
    for (let i = 0; i < n; i++) clump(a0 + i * 2.4 + rnd() * 0.8, 0.2 + rnd() * 0.5, k.lo + (0.93 - k.lo) * (0.25 + 0.75 * rnd()), (kind === 'maple' ? 0.5 : 0.45) + rnd() * 0.2, 0.9)
    clump(0, 0.1, 0.96, 0.4, 0.9)
  }
  return mergeGeometries(parts)
}
const crownSet = (lod) => Object.fromEntries(Object.keys(KINDS).map((kind, ki) => [kind, Array.from({ length: VARIANTS }, (_, v) => crownGeo(kind, 100 + ki * 10 + v, lod))]))
const CROWN = [0, 1, 2].map(crownSet)

// Trunk: slight taper, white with dark marks for birch (vertex colours), plain for others
function trunk(seg, rows, birch, open = false) { // open: no end discs (the far trunks' ends are under the ground and under the crown)
  const g = new THREE.CylinderGeometry(0.45, 1, 1, seg, rows, open)
  g.translate(0, 0.5, 0)
  const rnd = rng(31), p = g.attributes.position, col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const b = birch && rnd() < 0.22 ? 0.2 + rnd() * 0.25 : 1
    col.set([b, b, b], i * 3)
  }
  return g.setAttribute('color', new THREE.BufferAttribute(col, 3))
}
const TRUNK = { plain: trunk(6, 1, false), birch: trunk(6, 14, true), far: trunk(3, 1, false, true), farBirch: trunk(3, 2, true, true) }
const leaf = std(0xffffff, 0.9, { vertexColors: true })
const bark = std(0xffffff, 0.95, { vertexColors: true })

// Trunks (one mesh for birch, one for the rest) and one crown mesh per kind and shape variant, as instances
function forest(trees, shadow, text, lod = 0) { // lod: see crownGeo
  const group = new THREE.Group(), d = new THREE.Object3D()
  const make = (geo, mat, list, label, place, colorOf) => {
    if (!list.length) return
    const im = new THREE.InstancedMesh(geo, mat, list.length)
    list.forEach((t, i) => {
      place(t)
      d.rotation.y = t.rot
      d.updateMatrix()
      im.setMatrixAt(i, d.matrix)
      im.setColorAt(i, colorOf(t))
    })
    im.castShadow = shadow
    im.receiveShadow = true
    im.userData.label = label
    group.add(im)
  }
  const at = (t) => d.position.copy(P(t.x, t.y, t.z - 8))
  for (const birch of [false, true]) {
    make(TRUNK[(lod ? ['far', 'farBirch'] : ['plain', 'birch'])[+birch]], bark, trees.filter((t) => (t.kind === 'birch') === birch),
      `${birch ? 'Birch' : 'Other'} trunks, ${text} Sizes assumed (trunks 3 to 12 in radius, bare 25 to 40 ft up).`,
      (t) => { at(t); d.scale.set(t.tr * IN, t.th * IN, t.tr * IN) }, (t) => t.barkColor)
  }
  for (const kind of Object.keys(KINDS)) {
    for (let v = 0; v < VARIANTS; v++) {
      make(CROWN[lod][kind][v], leaf, trees.filter((t) => t.kind === kind && t.variant === v),
        `${kind} crowns (several clumps high on the trunk), ${text} Heights ${KINDS[kind].h.join(' to ')} in (assumed).`,
        (t) => { at(t); d.scale.set(t.cr * IN, t.h * IN, t.cr * IN) }, (t) => t.crownColor)
    }
  }
  return group
}

// Small things as one instanced mesh each: shrubs, shore grass, rocks. sink = part of the size that goes under the ground.
function scatterMesh(geo, mat, items, label, shadow = false, sink = 0.15) {
  const im = new THREE.InstancedMesh(geo, mat, items.length), d = new THREE.Object3D()
  items.forEach(([x, y, size, squash, color, rot], i) => {
    d.position.copy(P(x, y, heightAt(x, y) - size * sink))
    d.rotation.y = rot
    d.scale.set(size * IN, size * squash * IN, size * IN)
    d.updateMatrix()
    im.setMatrixAt(i, d.matrix)
    im.setColorAt(i, color)
  })
  im.castShadow = shadow
  im.receiveShadow = true
  im.userData.label = label
  return im
}
// A tuft of thin curved blades, height 1, spread radius 1. Darker at the root. Normals point up so the tuft shades softly.
function tuftGeo() {
  const rnd = rng(555), pos = [], col = [], nor = []
  for (let b = 0; b < 12; b++) {
    const a = rnd() * 6.28, r = rnd() * 0.45, bx = Math.cos(a) * r, bz = Math.sin(a) * r
    const la = a + (rnd() - 0.5), lean = 0.3 + rnd() * 0.8, h = 0.6 + rnd() * 0.4, w = 0.1
    const px = -Math.sin(la), pz = Math.cos(la)
    // one straight segment, 2 triangles a blade (a bent blade with a middle ring cost twice as much)
    const tip = (t) => ({ t, c: [bx + Math.cos(la) * lean * t * t, h * t, bz + Math.sin(la) * lean * t * t], w: w * (1 - 0.85 * t) })
    const A = tip(0), B = tip(1)
    const v = (q, side) => [q.c[0] + px * q.w * side, q.c[1], q.c[2] + pz * q.w * side]
    for (const [q, side] of [[A, -1], [A, 1], [B, -1], [A, 1], [B, 1], [B, -1]]) {
      pos.push(...v(q, side)); nor.push(0, 1, 0)
      const c = 0.55 + 0.45 * q.t; col.push(c, c, c)
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)).setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
}
// A smooth rounded lump (rock or shrub), radius jittered
function lumpOf(rnd, detail, jitter) {
  let g = new THREE.IcosahedronGeometry(1, detail)
  g.deleteAttribute('uv'); g.deleteAttribute('normal')
  g = mergeVertices(g)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const j = 1 + (rnd() - 0.5) * jitter; p.setXYZ(i, p.getX(i) * j, p.getY(i) * j, p.getZ(i) * j) }
  g.computeVertexNormals()
  return g
}

export function buildLandscape() {
  const group = new THREE.Group(), solids = []

  // ---------- trees near the house: the lot and its surroundings (lot lines 67'-6" west and 56'-0" east, permits p09, p11) ----------
  const rnd = rng(20261105)
  const near = []
  // Places the photos show a specific tree (approximate; they skip the keep-clear test on purpose, but not the sight corridors)
  const landmarks = [
    ['spruce', 20, -345], // spruce in front of the west half of the lake gable, PXL_20261009_180831582
    ['birch', -190, -300], // tall birch left of the cabin (same photo)
    ['birch', -230, -120],
    ['spruce', -180, -30],
    ['pine', 1050, -650], // big pine at the right edge (same photo)
    ['birch', 430, -760], ['birch', 490, -840], ['birch', 540, -800], // group of white birches right of the path
    ['maple', 330, -600], // maple with the pontoon-view branches over the path edge, PXL_20260906_133531021
  ]
  for (const [kind, x, y] of landmarks) { const t = newTree(rnd, kind, x, y); if (!inSight(x, y, t.cr)) near.push(t) }
  // The rest: dense mixed woods all round, thinner on the lawn slope and near the house
  scatter(rnd, [-1500, 1900, SHORE_Y, 3300], 105, (x, y, roll) => {
    const nearYard = rectDist(YARD, x, y) < 450 || (y < 0 && Math.abs(x - PATH_X) < 450)
    const p = x < -810 || x > 1008 || y > 1500 ? 0.85 : y < -330 ? 0.2 : nearYard ? 0.3 : 0.55 // open lawn slope in front of the lake wall (PXL_20261009_180831582)
    return roll < p
  }).forEach(([x, y]) => {
    const t = newTree(rnd, pick(NEAR_MIX, rnd()), x, y)
    if (free(x, y, t.cr) && !near.some((o) => Math.hypot(o.x - x, o.y - y) < 60)) near.push(t)
  })
  group.add(forest(near, true, `around the house. Kinds and mix: ${PHOTOS} (seen); each position approximate, from those photos (seen); sizes assumed.`))
  for (const t of near) {
    if (t.x < SOLID_BOX[0] || t.x > SOLID_BOX[2] || t.y < SOLID_BOX[1] || t.y > SOLID_BOX[3]) continue
    const r = Math.max(4, t.tr)
    solids.push([t.x - r, t.y - r, t.z - 4, t.x + r, t.y + r, t.z + t.th])
  }

  // ---------- farther woods: round the lot, behind the shore, and on the far shore (simple, no shadows) ----------
  const far = []
  const rf = rng(777)
  const nearBox = [-1500, 1900, SHORE_Y, 3300]
  const inNear = (x, y) => x >= nearBox[0] && x < nearBox[1] && y >= nearBox[2] && y < nearBox[3]
  const add = (box, cell, p) => scatter(rf, box, cell, (x, y, roll) => roll < p && !inNear(x, y)).forEach(([x, y]) => {
    const t = newTree(rf, pick(FAR_MIX, rf()), x, y)
    if (free(x, y, t.cr)) far.push(t)
  })
  add([-6000, 6000, SHORE_Y, 9000], 170, 0.7) // woods round the lot
  add([-16000, 16000, 9000, 16000], 450, 0.8) // wooded hills north of the road
  add([-40000, 40000, SHORE_Y, SHORE_Y + 1600], 260, 0.75) // trees behind the near shore, east and west of the lot
  const farY = SHORE_Y - LAKE_LEN
  add([-LAKE_HALF_W - 3000, LAKE_HALF_W + 3000, farY - 3500, farY + 900], 300, 0.8) // far shore and the low hills behind it
  add([-LAKE_HALF_W - 3000, -LAKE_HALF_W + 2500, SHORE_Y - LAKE_LEN, SHORE_Y - 4000], 300, 0.8) // west shore
  add([LAKE_HALF_W - 2500, LAKE_HALF_W + 3000, SHORE_Y - LAKE_LEN, SHORE_Y - 4000], 300, 0.8) // east shore
  // Past 3500" from the house the trees are small on screen, so they get simpler crowns (lod 2)
  const farText = 'woods farther out, round the lot, behind the shore and on the far shore of the lake: seen in PXL_20260906_133531021 (wooded far shore) and PXL_20261009_180831582 (woods behind the cabin); where and how many is assumed.'
  const farDist = (t) => Math.hypot(t.x - W / 2, t.y - L / 2)
  group.add(forest(far.filter((t) => farDist(t) < 3500), false, farText, 1), forest(far.filter((t) => farDist(t) >= 3500), false, farText, 2))

  // ---------- shrubs, shore grass, rocks, logs ----------
  const rs = rng(4242)
  const green = () => new THREE.Color().setHSL(between(rs, 0.25, 0.33), between(rs, 0.35, 0.5), between(rs, 0.1, 0.17), THREE.SRGBColorSpace)
  const rust = () => new THREE.Color().setHSL(between(rs, 0.05, 0.09), between(rs, 0.4, 0.5), between(rs, 0.2, 0.28), THREE.SRGBColorSpace) // dead ferns, PXL_20261009_180831582
  const shrubs = scatter(rs, [-1000, 1400, SHORE_Y + 150, 1600], 130, (x, y, roll) => roll < 0.55 && free(x, y, 30, false))
    .map(([x, y]) => [x, y, between(rs, 14, 32), between(rs, 0.55, 0.8), rs() < 0.3 ? rust() : green(), rs() * 6])
  group.add(scatterMesh(lumpOf(rng(9), 1, 0.4), std(0xffffff, 1), shrubs,
    `Shrubs, ferns and young spruce on the forest floor (PXL_20261009_180831582, PXL_20260906_133531021, seen). Positions approximate (seen), sizes 2 to 5 ft wide (assumed).`))

  // Dry tall grass: dense low tufts along the water and up the slope, straw to dull green (PXL_20261009_180831582, PXL_20260906_133531021, seen)
  const straw = () => new THREE.Color().setHSL(between(rs, 0.09, 0.13), between(rs, 0.3, 0.5), between(rs, 0.3, 0.44), THREE.SRGBColorSpace)
  const dullGreen = () => new THREE.Color().setHSL(between(rs, 0.17, 0.24), between(rs, 0.2, 0.35), between(rs, 0.2, 0.3), THREE.SRGBColorSpace)
  const tufts = []
  while (tufts.length < 2600) {
    const x = between(rs, -600, 1000), shore = rs() < 0.4
    const y = shore ? SHORE_Y + between(rs, 20, 220) : between(rs, SHORE_Y + 200, YARD[1] - 15)
    if (Math.abs(x - PATH_X) < (shore ? 40 : 55) || heightAt(x, y) < GRADE.lake - 2 || y < SHORE_Y + 15) continue
    const s = between(rs, 8, 15) * (shore ? 1.2 : 0.9)
    tufts.push([x, y, s, between(rs, 1.3, 2.0), rs() < 0.8 ? straw() : dullGreen(), rs() * 6])
  }
  group.add(scatterMesh(tuftGeo(), std(0xffffff, 1, { side: THREE.DoubleSide, vertexColors: true }), tufts,
    'Dry grass tufts on the slope and along the water (PXL_20261009_180831582, PXL_20260906_133531021, seen). Positions approximate (seen), height 15 to 45 in (assumed).', false, 0))

  const granite = [0x7d7b76, 0x8a8782, 0x9a958c, 0x858179].map((c) => new THREE.Color(c))
  const rocks = Array.from({ length: 360 }, () => {
    const x = between(rs, -600, 1100), y = SHORE_Y + between(rs, -40, 70), s = rs() < 0.04 ? between(rs, 16, 28) : between(rs, 4, 12)
    return [x, y, s, between(rs, 0.5, 0.75), oneOf(rs, granite).clone().offsetHSL(0, 0, between(rs, -0.1, -0.02)), rs() * 6]
  }).filter(([x, y, s]) => s < 14 || Math.abs(x - PATH_X) > 40 || y < SHORE_Y - 264) // big rocks off the dock footprint
  group.add(scatterMesh(lumpOf(rng(5), 1, 0.35), std(0xffffff, 0.95), rocks,
    'Granite rocks and cobbles along the water line, partly sunk in the ground (stony beach at the bottom of PXL_20261009_180831582, seen). Positions approximate (seen), sizes 8 to 56 in (assumed).', true, 0.35))

  // Stump and logs lying by the path (PXL_20261009_180831582: a lichen-covered stump and a dead log at the right, birch logs at the left; all seen, positions approximate, sizes assumed)
  const z = (x, y) => heightAt(x, y)
  const logAt = (x0, y0, x1, y1, w) => beamGeo([x0, y0, z(x0, y0) + w / 2], [x1, y1, z(x1, y1) + w / 2], w, w)
  group.add(
    mesh([cylGeo(360, SHORE_Y + 330, 9, z(360, SHORE_Y + 330) - 4, z(360, SHORE_Y + 330) + 14, 8)], std(0x8a8a78, 1), 'Stump near the path (PXL_20261009_180831582, seen; position approximate, size assumed).'),
    mesh([logAt(480, SHORE_Y + 300, 590, SHORE_Y + 350, 12), logAt(520, SHORE_Y + 310, 600, SHORE_Y + 380, 9)], std(0x6a5a4a, 1), 'Dead log lying right of the path (PXL_20261009_180831582, seen; position approximate, size assumed).'),
    mesh([logAt(40, SHORE_Y + 380, 120, SHORE_Y + 350, 9), logAt(50, SHORE_Y + 395, 130, SHORE_Y + 370, 9)], std(0xe2dfd6, 0.9), 'Birch logs on the ground left of the path (PXL_20261009_180831582, seen; position approximate, size assumed).'),
  )

  // Mown path from the walkout down to the dock: a strip 4 ft wide lying 1.5 in above the ground
  const pathY = []
  for (let y = SHORE_Y + 30; y < YARD[1]; y += 40) pathY.push(y)
  pathY.push(YARD[1])
  const pos = [], idx = []
  pathY.forEach((y, i) => { for (const x of [PATH_X - 24, PATH_X + 24]) pos.push(...P(x, y, heightAt(x, y) + 1.5).toArray()); if (i) { const a = 2 * i; idx.push(a - 2, a, a - 1, a - 1, a, a + 1) } })
  const pathGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setIndex(idx)
  pathGeo.computeVertexNormals()
  group.add(mesh(pathGeo, std(0x7a6244, 1, { side: THREE.DoubleSide }), 'Mown dirt path from the walkout to the dock (PXL_20260906_133531021, PXL_20261017_194345052, seen; its x and 4 ft width assumed).'))

  // ---------- dock and pontoon boat at the end of the path (photos PXL_20261009_180831582, PXL_20260906_133531021, PXL_20261017_194345052, PXL_20260523_151758429: seen; the dock is removed in late autumn) ----------
  const lake = GRADE.lake, dx0 = PATH_X - 24, dx1 = PATH_X + 24, dy1 = SHORE_Y + 36, dy0 = SHORE_Y - 264
  const deckTop = lake + 16
  const posts = []
  for (const y of [dy1 - 20, dy0 + 140, dy0 + 20]) for (const x of [dx0 - 3, dx1 + 3]) posts.push(cylGeo(x, y, 2, lake - 60, deckTop))
  group.add(
    mesh([boxGeo([dx0, dy0, lake + 12, dx1, dy1, deckTop])], std(0xb9ab92, 0.55, { metalness: 0.35 }),
      'Aluminium dock, 4 ft wide, about 25 ft long, diamond-pattern deck (PXL_20261009_180831582, PXL_20261017_194345052, seen). Its position at the end of the path and its size are assumed.'),
    mesh(posts, std(0x8a8d90, 0.4, { metalness: 0.6 }), 'Dock legs (seen in PXL_20260906_133531021; count and size assumed).'),
  )
  // Shore step so the walker (9 in per step) can get onto the dock: ground is about lake+2, deck lake+16 (steps 6 in, then 8 in)
  group.add(mesh([boxGeo([dx0, dy1, lake - 10, dx1, dy1 + 30, lake + 8])], std(0x8a7a64, 0.9),
    'Shore step of stones and planks at the land end of the dock (no photo shows it; position and size assumed).'))
  solids.push([dx0, dy1, lake - 10, dx1, dy1 + 30, lake + 8], [dx0, dy0, lake + 4, dx1, dy1, deckTop]) // the walker can walk up the step and out on the dock
  const bx0 = dx1 + 6, bx1 = bx0 + 96, bcx = (bx0 + bx1) / 2, by1 = SHORE_Y - 80, by0 = by1 - 240
  const tube = (x) => { const g = new THREE.CylinderGeometry(11 * IN, 11 * IN, (by1 - by0) * IN, 10); g.rotateX(Math.PI / 2); g.translate(x * IN, (lake + 4) * IN, -((by0 + by1) / 2) * IN); return g }
  const tubes = [tube(bcx - 32), tube(bcx + 32)]
  const canopy = [boxGeo([bx0 + 4, by0 + 40, lake + 90, bx1 - 4, by1 - 40, lake + 93])]
  for (const x of [bx0 + 6, bx1 - 6]) for (const y of [by0 + 44, by1 - 44]) canopy.push(boxGeo([x - 1, y - 1, lake + 17, x + 1, y + 1, lake + 90]))
  group.add(
    mesh(tubes.concat([boxGeo([bx0, by0 + 10, lake + 12, bx1, by1 - 10, lake + 16])]), std(0xd9d2c0, 0.6), 'Pontoon boat tied beside the dock: two tubes and a deck (PXL_20260906_133531021, seen). About 20 ft by 8 ft (assumed).'),
    mesh(canopy, std(0xe8e8e4, 0.5), 'Pontoon boat canopy (PXL_20260906_133531021, seen; size assumed).'),
  )

  return { group, solids }
}
