// Part of the cabin above or around the basement: main-level log walls and their openings.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
import * as THREE from 'three'
import { M, IN, v, W, L, FLOOR1, LOG_BASE, WALL_TOP, PITCH, boxGeo, mesh, mats } from '../geo.js'

// Sizes from the facts
const R = v(M.walls.log_wall_thickness) / 2 // log radius: 18" average diameter (title block, stated)
const COURSE = v(M.walls.log_course_height) // 18" courses (A-4, A-5, scaled)
const CENTRE_IN = v(M.walls.log_wall_centerline_inset_from_foundation_line) // 4
const OUT = CENTRE_IN - R // outer log face: -5 = 5" outside the foundation line (inferred)
const STUB_Y = v(M.walls.log_stub_wall_line_y) // 432 (A-2, stated)

// Sizes the facts do not have. Each label says when one of these is used.
const END = 24 // log ends reach 24" past the foundation line (A-5 West "about 2 ft", scaled)
const ASSUMED = {
  doorHeight: 80, // sliding doors and the entry door (typical)
  buck: 1.5, // 2x lumber lining each opening cut in the logs
  frame: [2, 3.5], // vinyl frame face width and depth
  frameIn: 3, // frame set 3" in from the outer log face
}
const SEG = 24 // sides of each log
const TEX = 40 // wood texture repeat along the log, inches

// ---------- geometry helpers ----------

// A wall line: axis 'x' runs east-west, 'y' north-south. out = outer log face, dir = +1 when inward is +.
// d = depth in from the outer face (0 to 18), s = position along the wall.
function box(w, s0, s1, d0, d1, z0, z1) {
  const a = w.out + w.dir * d0, b = w.out + w.dir * d1
  const [p0, p1] = [Math.min(a, b), Math.max(a, b)]
  return w.axis === 'x' ? [s0, p0, z0, s1, p1, z1] : [p0, s0, z0, p1, s1, z1]
}

// Keep the part of a convex polygon [[X, Y]] above (keepAbove) or below the line Y = c
function clipY(pts, c, keepAbove) {
  const out = []
  const inside = (p) => (keepAbove ? p[1] >= c - 1e-9 : p[1] <= c + 1e-9)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (inside(a)) out.push(a)
    if (inside(a) !== inside(b)) { const t = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + t * (b[0] - a[0]), c]) }
  }
  return out
}
const CIRCLE = Array.from({ length: SEG }, (_, i) => [R * Math.cos((2 * Math.PI * i) / SEG), R * Math.sin((2 * Math.PI * i) / SEG)])

// Buffers for one mesh: positions (metres, three.js axes), normals, uvs
const buf = () => ({ p: [], n: [], uv: [] })
function toGeo(b) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
  return g
}

// One log piece along the wall from s0 to s1, centre line at `at` (fact x or y), centre height zc,
// cut flat below lo and above hi. Round sides go to `side`, the two end faces to `cap`.
// Local coordinates: X across the wall, Y up from the centre, Z along the log.
function logPiece(side, cap, axis, at, s0, s1, zc, lo, hi) {
  const poly = clipY(clipY(CIRCLE, lo - zc, true), hi - zc, false)
  if (poly.length < 3 || s1 - s0 < 0.1) return
  const len = s1 - s0
  const f = axis === 'x' ? (X, Y, Z) => [s0 + Z, at + X, zc + Y] : (X, Y, Z) => [at - X, s0 + Z, zc + Y]
  const fn = axis === 'x' ? (X, Y, Z) => [Z, X, Y] : (X, Y, Z) => [-X, Z, Y]
  const put = (b, X, Y, Z, n, u, vv) => {
    const [x, y, z] = f(X, Y, Z), [nx, ny, nz] = fn(...n)
    b.p.push(x * IN, z * IN, -y * IN) // fact -> three.js (same as P())
    b.n.push(nx, nz, -ny)
    b.uv.push(u, vv)
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const flat = Math.abs(a[1] - b[1]) < 1e-6 && (Math.abs(a[1] - (lo - zc)) < 1e-6 || Math.abs(a[1] - (hi - zc)) < 1e-6)
    let na, nb, va, vb
    if (flat) { // saw cut: flat face
      na = nb = [0, Math.sign(a[0] - b[0]), 0]
      va = a[0] / TEX; vb = b[0] / TEX
    } else { // round face: normal points out from the centre; texture wraps around (seam at the bottom, hidden)
      na = [a[0] / R, a[1] / R, 0]; nb = [b[0] / R, b[1] / R, 0]
      let ta = Math.atan2(a[0], a[1]), tb = Math.atan2(b[0], b[1])
      if (tb - ta > Math.PI) tb -= 2 * Math.PI
      if (ta - tb > Math.PI) tb += 2 * Math.PI
      va = (ta * R) / TEX; vb = (tb * R) / TEX
    }
    const u0 = s0 / TEX, u1 = s1 / TEX
    put(side, a[0], a[1], 0, na, u0, va); put(side, b[0], b[1], 0, nb, u0, vb); put(side, b[0], b[1], len, nb, u1, vb)
    put(side, a[0], a[1], 0, na, u0, va); put(side, b[0], b[1], len, nb, u1, vb); put(side, a[0], a[1], len, na, u1, va)
  }
  for (let i = 1; i < poly.length - 1; i++) { // end faces (fan; the polygon is convex)
    const [p0, p1, p2] = [poly[0], poly[i], poly[i + 1]]
    for (const [q, Z, nz] of [[[p0, p2, p1], 0, -1], [[p0, p1, p2], len, 1]])
      for (const p of q) put(cap, p[0], p[1], Z, [0, 0, nz], p[0] / TEX, p[1] / TEX)
  }
}

// Log pieces of one course between sA and sB, cut around the openings (cuts: { s0, s1, z0, z1 })
function coursePieces(sA, sB, lo, hi, cuts) {
  const out = []
  let s = sA
  for (const c of cuts.filter((c) => c.z0 < hi && c.z1 > lo).sort((a, b) => a.s0 - b.s0)) {
    out.push([s, c.s0, lo, hi])
    if (c.z0 > lo) out.push([c.s0, c.s1, lo, Math.min(hi, c.z0)]) // log left under a window
    if (c.z1 < hi) out.push([c.s0, c.s1, Math.max(lo, c.z1), hi]) // log left over the opening
    s = c.s1
  }
  out.push([s, sB, lo, hi])
  return out.filter(([a, b, l, h]) => b - a > 0.1 && h - l > 0.5)
}

// How far a log end may stick out past the outer face of the east or west wall and still stay
// under the main roof's eave (the upper corner logs are cut shorter, assumed)
const endReach = (top) => Math.min(END + OUT, Math.max(0, (WALL_TOP - 1 - top) / PITCH))

// ---------- the walls ----------

export function buildMainWalls() {
  const group = new THREE.Group()
  const solids = [], gaps = [] // gaps: door openings the walker can pass
  const B = ASSUMED.buck, [K, FD] = ASSUMED.frame, F0 = ASSUMED.frameIn

  const { log: logMat, logEnd: endMat, doorWhite: doorMat } = mats

  // Course centres. The north and south walls start with a half sill log on the subfloor (A-6 detail 5).
  // The east and west walls sit half a course higher, so the logs cross at the saddle-notch corners.
  const courses = (z) => { const c = []; for (; z - R < WALL_TOP; z += COURSE) c.push(z); return c }
  const NS = courses(LOG_BASE), EW = courses(LOG_BASE + R)
  const wallLen = (w) => (w.axis === 'x' ? W : L)
  const walls = [
    { name: 'south', axis: 'x', out: OUT, dir: 1, zs: NS },
    { name: 'north', axis: 'x', out: L - OUT, dir: -1, zs: NS },
    { name: 'west', axis: 'y', out: OUT, dir: 1, zs: EW },
    { name: 'east', axis: 'y', out: W - OUT, dir: -1, zs: EW },
  ]
  const wallBy = Object.fromEntries(walls.map((w) => [w.name, w]))

  // ---------- openings ----------
  // Frame colour and its source, per opening
  const FC = {
    MENARDS: 'Frame white inside and out (Menards order "white outside, white inside", stated)',
    S2: 'Frame white (photo PXL_20261009_180831582 "white-framed glass door", seen)',
    SEEN: 'Frame white (assumed, like the Menards units; photos show this opening but the findings do not record its frame colour)',
    NONE: 'Frame white (assumed; no photo shows this opening)',
  }
  const SPEC = {
    S1: { fc: FC.SEEN, units: 2, kind: 'sh', what: 'Lake-wall window pair, drawn as two white single-hung units like S3 (unit type assumed; S1 is not in the Menards order). Photos read the two side windows as one large and one smaller window (conflicts.md item 8)' },
    S2: { fc: FC.S2, door: 'slide', open: 'high', what: 'Two-panel sliding glass door to the deck (A-2; photo PXL_20260523_152023253, seen). Shown open: the sliding panel is pushed over the fixed west panel (which panel slides: assumed)' },
    S3: { fc: FC.MENARDS, units: 2, kind: 'sh', what: 'Two Menards single-hung windows 36" x 60", white (window order line 700-1, stated; which opening: inferred)' },
    N1: { fc: FC.MENARDS, units: 1, kind: 'sh', what: 'Bedroom 1 window: Menards single hung 24" x 48", white (order line 100-1, stated; which opening: inferred)' },
    N2: { fc: FC.MENARDS, units: 1, kind: 'sh', what: 'Bedroom 1 window: Menards single hung 24" x 48", white (order line 100-1, stated; which opening: inferred)' },
    N3: { fc: FC.MENARDS, units: 2, kind: 'sh', what: 'Bedroom 2 window pair: two Menards single hung 24" x 48", white (order line 100-1, stated; which opening: inferred). Photo PXL_20251004_135433269 reads it as one unit' },
    'W-west-1': { fc: FC.SEEN, units: 1, kind: 'sh', what: 'Great-room window, white (unit type assumed single hung; not in the Menards order)' },
    'W-west-2': { fc: FC.SEEN, units: 1, kind: 'sh', what: 'Great-room window, white (unit type assumed single hung; not in the Menards order)' },
    'W-west-bath': { fc: FC.MENARDS, units: 1, kind: 'fixed', what: 'Bath window: Menards fixed 24" x 24", tempered glass (order line 800-1, stated; which opening: inferred). A-2 draws no window symbol here (conflicts.md item 14)' },
    W1: { fc: FC.MENARDS, units: 1, kind: 'slider', what: 'Bedroom 1 window: Menards 2-panel sliding window 60" x 48", XO (order line 400-1, stated; which opening: inferred)' },
    'E-door-60': { fc: FC.SEEN, door: 'slide', open: 'high', what: 'Two-panel sliding glass door from the great room to the porch (A-2; photo PXL_20260523_151144457.MP, seen). Shown open: the sliding panel is pushed over the fixed south panel (which panel slides: assumed)' },
    E1: { fc: FC.NONE, units: 2, kind: 'sh', height: 48, sill: 36, what: 'Kitchen window pair onto the porch. Height and sill are not on the plans: drawn as two 24" x 48" single-hung units with a 36" sill like N3, so the head is at 7\'-0" like the other windows (assumed)' },
    'E-entry': { fc: FC.NONE, door: 'swing', what: '36" swing door from the entry to the porch in a 3\'-4" opening (A-2). Door style and swing not known: plain white slab, hinged on the north side, swings into the entry (assumed)' },
  }
  const fv = (e) => `${e.source}, ${e.confidence}`
  const ops = M.openings.filter((o) => v(o.level) === 'main').map((o) => {
    const sp = SPEC[o.id]
    if (!sp) throw new Error(`walls.js: no spec for opening ${o.id}`)
    const w = wallBy[o.wall]
    const s0 = v(o.offset), s1 = s0 + v(o.width)
    const sill = sp.door ? 0 : v(o.sill) ?? sp.sill
    const height = sp.door ? ASSUMED.doorHeight + (sp.door === 'swing' ? K : 0) : v(o.height) ?? sp.height
    const from = w.axis === 'x' ? 'west' : 'south'
    const hNote = sp.door ? `${height}" tall (typical door, assumed)` : v(o.height) == null ? `${height}" tall (assumed)` : `${height}" tall (${fv(o.height)})`
    const sNote = sp.door ? 'at the floor' : v(o.sill) == null ? `sill ${sill}" above the main floor (assumed)` : `sill ${sill}" above the main floor (${fv(o.sill)})`
    const label = `${o.id}: ${sp.what}. ${v(o.width)}" wide (${fv(o.width)}), ${hNote}, ${sNote}. Starts ${s0}" from the ${from} corner, along the foundation line (${fv(o.offset)}).`
    const z0 = FLOOR1 + sill, z1 = z0 + height
    return { o, sp, w, s0, s1, z0, z1, label, cut: { s0: s0 - B, s1: s1 + B, z0: sp.door ? LOG_BASE - 1 : z0 - B, z1: z1 + B } }
  })

  // ---------- logs ----------
  const ends = buf() // all cut log ends share one mesh
  const wallText = {
    south: 'South (lake) log wall',
    north: 'North (driveway) log wall',
    west: 'West log wall',
    east: 'East log wall, between the house and the porch. A-2 draws it about 13" thick; drawn 18" like the other walls (assumed; question 13)',
  }
  for (const w of walls) {
    const side = buf()
    const at = w.out + w.dir * R
    const cuts = ops.filter((p) => p.w === w).map((p) => p.cut)
    for (const zc of w.zs) {
      const lo = Math.max(zc - R, LOG_BASE), hi = Math.min(zc + R, WALL_TOP)
      if (hi - lo < 0.5) continue
      const reach = w.axis === 'x' ? endReach(hi) : END + OUT // north/south log ends must fit under the eaves
      const sA = OUT - reach, sB = wallLen(w) - OUT + reach
      for (const [a, b, l, h] of coursePieces(sA, sB, lo, hi, cuts)) logPiece(side, ends, w.axis, at, a, b, zc, l, h)
    }
    group.add(mesh(toGeo(side), logMat,
      `${wallText[w.name]}: whole round hand-crafted logs, hand scribed with no chinking (Ryan, 2026-11-06, stated), ${2 * R}" average diameter (title block, stated), ${COURSE}" courses (A-4, A-5, scaled), stained red-orange (photos PXL_20261009_180831582, PXL_20251004_135433269, seen). ` +
      `Centre line ${CENTRE_IN}" inside the foundation line, outer face ${-OUT}" outside it (A-3 joist string, inferred). ` +
      (w.axis === 'x' ? 'Bottom course is a half sill log on the subfloor (A-6 detail 5, stated). ' : 'Courses sit half a course higher than the north and south walls so the logs cross at the corners (assumed). ') +
      `Saddle-notch corners, log ends ${END}" past the foundation line (A-5 West "about 2 ft", scaled; the top corner logs are cut shorter to fit under the eaves, assumed). ` +
      `Top cut flat at ${WALL_TOP.toFixed(1)}" where the roof underside meets the outer log face (no plate height on the plans; follows the assumed roof depth).`))
  }

  // Log stub walls: the logs of a short inside log wall pass through the west and east walls and stick out
  const stub = buf()
  for (const zc of NS) {
    const lo = Math.max(zc - R, LOG_BASE), hi = Math.min(zc + R, WALL_TOP)
    if (hi - lo < 0.5) continue
    const reach = endReach(hi)
    logPiece(stub, ends, 'x', STUB_Y, OUT - reach, OUT + 2 * R, zc, lo, hi) // west: out to the inner wall face
    logPiece(stub, ends, 'x', STUB_Y, W - OUT - 2 * R, W - OUT + reach, zc, lo, hi) // east
  }
  group.add(mesh(toGeo(stub), logMat,
    `Log stub walls: logs of a short inside log wall pass through the west and east walls and stick out, 10'-0" south of the north foundation line (A-2 "LOG STUB WALL", stated; A-5 West log end at about 10.3 ft, scaled). ` +
    `Outside they reach ${END}" past the foundation line like the corners (assumed); inside they stop at the wall face (the inside wall is not part of this step).`))
  group.add(mesh(toGeo(ends), endMat,
    'Cut log ends at the saddle-notch corners and the log stub walls (A-6 detail 1; A-2; photos PXL_20261009_180831582, PXL_20251004_135433269, seen). End color assumed.'))

  // ---------- openings: bucks, frames, glass, doors ----------
  const bucks = [], glass = []
  const pane = (w, s0, s1, z0, z1, d) => glass.push(boxGeo(box(w, s0, s1, d, d + 0.25, z0, z1)))
  const frame = (fr, w, s0, s1, z0, z1, d0 = F0, d1 = F0 + FD, k = K) => fr.push(
    box(w, s0, s1, d0, d1, z0, z0 + k), box(w, s0, s1, d0, d1, z1 - k, z1),
    box(w, s0, s0 + k, d0, d1, z0, z1), box(w, s1 - k, s1, d0, d1, z0, z1))
  for (const p of ops) {
    const { w, s0, s1, z0, z1, sp, cut } = p
    const fr = []
    // Buck: 2x lumber lining the opening cut in the logs, full wall depth
    const bz0 = Math.max(cut.z0, LOG_BASE)
    bucks.push(box(w, cut.s0, s0, 0, 2 * R, bz0, cut.z1), box(w, s1, cut.s1, 0, 2 * R, bz0, cut.z1), box(w, s0, s1, 0, 2 * R, z1, cut.z1))
    if (sp.door) bucks.push(box(w, cut.s0, cut.s1, 0, 2 * R, LOG_BASE, FLOOR1 + 0.5)) // threshold
    else bucks.push(box(w, s0, s1, 0, 2 * R, cut.z0, z0))
    if (sp.door === 'slide') {
      // Frame, then a fixed outer panel and the sliding inner panel, shown slid open over the fixed one
      frame(fr, w, s0, s1, FLOOR1 + 0.5, z1)
      const pw = (s1 - s0 - 2 * K) / 2 + 1 // panels overlap 2" at the meeting stiles
      const [a, b] = sp.open === 'high' ? [s0 + K, s0 + K + pw] : [s1 - K - pw, s1 - K]
      for (const [d0, d1] of [[F0, F0 + FD / 2], [F0 + FD / 2, F0 + FD]]) {
        frame(fr, w, a, b, FLOOR1 + 0.5 + K, z1 - K, d0, d1, 2.5)
        pane(w, a + 2.5, b - 2.5, FLOOR1 + 0.5 + K + 2.5, z1 - K - 2.5, (d0 + d1) / 2)
      }
      const [g0, g1] = sp.open === 'high' ? [b, s1 - K] : [s0 + K, a] // the open half
      gaps.push({ w, s0: g0, s1: g1 })
    } else if (sp.door === 'swing') {
      // Jambs and head on the inner part of the buck; door slab open 90 degrees into the entry
      frame(fr, w, s0, s1, FLOOR1 + 0.5, z1, 2 * R - 5, 2 * R)
      const hinge = s1 - K, dh = ASSUMED.doorHeight
      p.slab = box(w, hinge - 1.75, hinge, 2 * R, 2 * R + (s1 - s0 - 2 * K), FLOOR1 + 0.5, FLOOR1 + 0.5 + dh)
      gaps.push({ w, s0: s0 + K, s1: s1 - K })
    } else {
      // Windows: one or two units side by side
      const uw = (s1 - s0) / sp.units
      for (let i = 0; i < sp.units; i++) {
        const a = s0 + i * uw, b = a + uw
        frame(fr, w, a, b, z0, z1)
        if (sp.kind === 'sh') { // single hung: upper and lower sash
          const zm = (z0 + z1) / 2
          fr.push(box(w, a + K, b - K, F0, F0 + FD, zm - 1, zm + 1))
          pane(w, a + K, b - K, z0 + K, zm - 1, F0 + 2.25)
          pane(w, a + K, b - K, zm + 1, z1 - K, F0 + 1)
        } else if (sp.kind === 'slider') { // two panels side by side
          const sm = (a + b) / 2
          fr.push(box(w, sm - 1, sm + 1, F0, F0 + FD, z0 + K, z1 - K))
          pane(w, a + K, sm - 1, z0 + K, z1 - K, F0 + 1)
          pane(w, sm + 1, b - K, z0 + K, z1 - K, F0 + 2.25)
        } else pane(w, a + K, b - K, z0 + K, z1 - K, F0 + 1.6)
      }
    }
    group.add(mesh(fr.map(boxGeo), mats.vinyl, `${p.label} ${sp.fc}.`))
    if (p.slab) group.add(mesh(boxGeo(p.slab), doorMat, p.label))
  }
  group.add(mesh(bucks.map(boxGeo), mats.lumber,
    'Window and door bucks: 2x lumber lining each opening cut in the logs (typical log-home framing, assumed). Photos show the openings unfinished inside, with foam and foil tape at the heads and no trim (photos-2.md).'))
  group.add(mesh(glass, mats.glass, null, { shadow: false }))

  // ---------- solids for the walker ----------
  for (const w of walls) {
    let s = OUT
    for (const g of gaps.filter((g) => g.w === w).sort((a, b) => a.s0 - b.s0)) {
      solids.push(box(w, s, g.s0, 0, 2 * R, FLOOR1, WALL_TOP))
      s = g.s1
    }
    solids.push(box(w, s, wallLen(w) - OUT, 0, 2 * R, FLOOR1, WALL_TOP))
  }
  for (const p of ops) if (p.slab) solids.push(p.slab) // the open entry door leaf
  for (const p of ops.filter((p) => p.sp.door)) solids.push(box(p.w, p.cut.s0, p.cut.s1, 0, 2 * R, LOG_BASE, FLOOR1 + 0.5)) // thresholds
  // log ends outside the corners and stubs
  for (const [x0, x1] of [[-END, OUT], [W - OUT, W + END]])
    for (const [y0, y1] of [[OUT, OUT + 2 * R], [L - OUT - 2 * R, L - OUT], [STUB_Y - R, STUB_Y + R]]) solids.push([x0, y0, FLOOR1, x1, y1, WALL_TOP])
  for (const [y0, y1] of [[-END, OUT], [L - OUT, L + END]])
    for (const [x0, x1] of [[OUT, OUT + 2 * R], [W - OUT - 2 * R, W - OUT]]) solids.push([x0, y0, FLOOR1, x1, y1, WALL_TOP])

  return { group, solids }
}
