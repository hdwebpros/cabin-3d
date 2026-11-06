// Part of the cabin above the main log walls: the loft floor, the gable ends, the main roof and the chimney.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab (see geo.js).
import * as THREE from 'three'
import { M, IN, P, v, up, RAISE, W, L, FLOOR1, PITCH, RIDGE_X, ROOF_DEPTH, roofTop, roofUnder, WALL_TOP, LOG_BASE, boxGeo, beamGeo, ni, mesh, std, mats } from '../geo.js'

// Sizes the facts do not have. Each label says when one of these is used.
const ASSUMED = {
  shingles: 1, // shingles and sheathing, the top of ROOF_DEPTH
  ceiling: 0.75, // 1x T&G ceiling (A-6 detail 4 says "1x"; 3/4" is the usual 1x thickness)
  fascia: 1.5, // fascia and rake boards
  log: 14, // ridge log, purlins, posts and loft beam diameter (A-3, A-4 and A-6 draw about 14"; no size is written)
  logEnd: 6, // ridge log and purlin ends stop this far short of the rake boards
  joistEnd: 12, // loft joist ends past the north wall (A-3 draws them sticking out, not dimensioned)
  beamEnd: 12, // loft beam end past the west wall (A-3 draws it sticking out, not dimensioned)
  winGap: 6, // south gable pentagon windows stop 6" under the roof
  purlinGap: 16, // south gable triangle windows stop 16" under the roof, so the outer purlins pass over them
  frame: 2.5, // window frame face width
  trim: 2, // gable logs stop 2" from window frames and posts
  chimney: { r: 5 }, // class A pipe 10" across
  rail: { top: 2.5, bottom: 2, baluster: 1.25, spacing: 6.5, post: 3, postGap: 72, height: 36 },
}
const A = ASSUMED

// ---------- facts ----------

const [RX0, RY0, RX1, RY1] = v(M.roof.outline_rect) // -42, -60, 378, 600 (A-3 overhangs, stated)
const [PX0, PY0, , PY1] = v(M.roof.porch_roof_rect) // the porch roof (porch part) joins at x 336 from y 0 to 428
const LOFT = up(v(M.levels_z.second_floor)) // 272: second floor 109'-6" (A-4, A-5, A-6, stated), raised
const JOIST_UNDER = up(v(M.levels_z.main_underside_loft_joists)) // 254: 8'-0" above the first floor (A-6, stated)
const JOIST_TOP = LOFT - 7.75 // built-up floor about 7 3/4" on the log joists (A-6 detail 2, scaled)
const JOIST_R = (JOIST_TOP - JOIST_UNDER) / 2 // 10 1/4" log joists (inferred from the two above)
const SPACING = v(M.structure.loft_joists.spacing) // 41 (A-3 8 x 3'-5", stated)
const CANT = v(M.structure.loft_joists.cantilever_east_half) // 58.5 (A-3, stated)
const BEAM_Y = v(M.structure.loft_beam.y) // 282 (A-3, scaled)
const POST_X = v(M.structure.loft_beam.post_x) // 168 (A-3, scaled)
const LOFT_E = v(M.rooms.upper.loft_east_half.rect) // [168, 224, 323, 539]
const LOFT_W = v(M.rooms.upper.loft_west_half.rect) // [13, 282, 168, 539]
const STAIR_X = v(M.stairs.main_to_loft.upper_run_rect)[2] // 123: the loft stair arrives here going east
const RAIL_H = v(M.rooms.upper.railing_height) // 36 (A-6, stated)
const CHIM = M.roof.chimney
const CHIM_TOP = up(v(CHIM.top_z)) // 411 (A-5 West, scaled)
const BASE = v(M.rooms.main.stove_base.rect) // [13, 78, 61, 126]: stone stove base (A-2 d1 crop, scaled)
// Straight above the stove pipe: back of the stove, centred between the west windows (Ryan, 2026-11-06). Same as interior.js.
const CHIM_X = BASE[0] + 12, CHIM_Y = (BASE[1] + BASE[3]) / 2 // 25, 102

const R = A.log / 2
const WR = 9 // wall logs 18" (title block, stated)
const WEST = -5, EAST = W + 5, SOUTH = -5, NORTH = L + 5 // outer log faces 5" outside the foundation line (A-3, scaled)
const SLOPE = Math.hypot(1, PITCH)
const RIDGE_UNDER = roofUnder(RIDGE_X) // 430
const TEX = 40 // wood texture repeat along a log, inches (same as walls.js)

// ---------- geometry helpers ----------

const vec2 = (pts) => pts.map(([x, z]) => new THREE.Vector2(x * IN, z * IN))

// Solid from a polygon [[x, z], ...] drawn on a cut across the house (looking north), from y0 to y1, with holes
function prism(pts, y0, y1, holes = []) {
  const s = new THREE.Shape(vec2(pts))
  for (const h of holes) s.holes.push(new THREE.Path(vec2(h)))
  const g = new THREE.ExtrudeGeometry(s, { depth: (y1 - y0) * IN, bevelEnabled: false })
  g.translate(0, 0, -y1 * IN)
  return g
}

// Round log from a to b ([x, y, z]); side gets grain along the log, the two end discs go in a separate list
function logWithGrain(a, b, r, seg = 16) {
  const pa = P(...a), pb = P(...b), len = pa.distanceTo(pb), dir = pb.clone().sub(pa).normalize()
  const side = new THREE.CylinderGeometry(r * IN, r * IN, len, seg, 1, true)
  const uv = side.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getY(i) * len) / (TEX * IN), (uv.getX(i) * 2 * Math.PI * r) / TEX)
  side.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
  side.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2)
  const ends = [[pa, dir.clone().negate()], [pb, dir]].map(([p, d]) =>
    new THREE.CircleGeometry(r * IN, seg).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)).translate(p.x, p.y, p.z))
  return { side, ends }
}
// The part of the top north or south wall log (centre zc) above WALL_TOP, where walls.js cuts it flat. Round side only:
// the flat cut sits on the wall log and both ends are inside the roof. Texture coordinates as walls.js, so the grain lines up.
function wallLogTop(yc, zc, x0, x1) {
  const phi = Math.acos((WALL_TOP - zc) / WR)
  const g = new THREE.CylinderGeometry(WR * IN, WR * IN, (x1 - x0) * IN, 12, 1, true, 1.5 * Math.PI - phi, 2 * phi)
  g.rotateZ(-Math.PI / 2).translate(((x0 + x1) / 2) * IN, zc * IN, -yc * IN)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / IN / TEX, (Math.atan2(-p.getZ(i) / IN - yc, p.getY(i) / IN - zc) * WR) / TEX)
  return g
}
const logs = () => ({ side: [], ends: [], add(...l) { for (const g of l) { this.side.push(g.side); this.ends.push(...g.ends) } return this } })

// Texture coordinates for the roof slopes: u along the ridge, v down the slope (true length), v = 1 at the ridge
function slopeUV(g, tile) {
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getZ(i) / IN / tile, 1 - (Math.abs(p.getX(i) / IN - RIDGE_X) * SLOPE) / tile)
  return g
}
// Texture coordinates from the floor plan (x, y), for flat boards seen from above or below
function planUV(g, tile) {
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / IN / tile, -p.getZ(i) / IN / tile)
  return g
}

// Move every edge of a convex polygon inward by d
function inset(poly, d) {
  const n = poly.length
  const ccw = poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * p[1], 0) > 0
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], k = (ccw ? d : -d) / Math.hypot(dx, dz)
    return [p[0] - dz * k, p[1] + dx * k, dx, dz]
  })
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n]
    const t = ((l[0] - m[0]) * l[3] - (l[1] - m[1]) * l[2]) / (m[2] * l[3] - m[3] * l[2])
    return [m[0] + m[2] * t, m[1] + m[3] * t]
  })
}

// ---------- the part ----------

export function buildRoof() {
  const group = new THREE.Group()
  const solids = []
  const add = (geos, mat, label) => group.add(mesh(geos.map(ni), mat, label))

  // Materials. Logs match the log walls (walls.js). The log, slope and floor meshes carry their own texture coordinates.
  const { log: logMat, logEnd: endMat, chink: chinkMat, shingle: shingleMat, trim: trimMat } = mats
  const pine = logMat.clone() // T&G pine boards (photos: pine ceiling following the roof slope)
  pine.color.set(0xfff1e0)
  const bodyMat = std(0x4a423a, 0.9)
  const floorMat = mats.planks
  const glass = mats.glass

  // ---------- main roof ----------
  // A layer d0..d1 below the shingle surface, from x0 to x1 on one side of the ridge
  const slab = (x0, x1, d0, d1) => [[x0, roofTop(x0) - d0], [x1, roofTop(x1) - d0], [x1, roofTop(x1) - d1], [x0, roofTop(x0) - d1]]
  // Plan pieces [x0, x1, y0, y1]. On the east the main roof stops at the house east line where the porch roof (porch part)
  // joins; only the corners south and north of the porch roof get the full 3'-6" eave.
  const pieces = [[RX0, RIDGE_X, RY0, RY1], [RIDGE_X, PX0, RY0, RY1], [PX0, RX1, RY0, PY0], [PX0, RX1, PY1, RY1]]
  const roofLayer = (d0, d1) => pieces.map(([x0, x1, y0, y1]) => prism(slab(x0, x1, d0, d1), y0, y1))
  const roofNote = `10/12 gable, ridge north-south at x ${RIDGE_X} (A-3, A-4, A-5, stated). Ridge top 124'-2" (stated), raised ${RAISE}". ` +
    `Overhangs 3'-6" east and west, 4'-0" north, 5'-0" south (A-3, stated). Over the porch the main roof stops at the house east line and the 3/12 porch roof takes over.`

  add(roofLayer(0, A.shingles).map((g) => slopeUV(g, 280)), shingleMat,
    `Main roof, asphalt shingles ("ASPHALT ROOFING", A-4, A-5, stated; dark gray, photos). ${roofNote}`)
  add(roofLayer(A.shingles, ROOF_DEPTH - A.ceiling), bodyMat,
    `Main roof build-up: 2x rafters, insulation, vented sheathing (A-6 detail 4, stated). Total depth ${ROOF_DEPTH}" measured plumb (geo.js, assumed; A-6 detail 4 gives 8" square to the slope).`)
  add(roofLayer(ROOF_DEPTH - A.ceiling, ROOF_DEPTH).map((g) => slopeUV(g, 42)), pine,
    `1x T&G pine ceiling on the underside of the roof, inside and under the overhangs (A-6 detail 4 and section, stated; photos). Boards run with the ridge (assumed).`)

  const F = A.fascia
  const eave = (x0, x1, y0, y1, xe) => boxGeo([x0, y0, roofUnder(xe) - F, x1, y1, roofTop(xe) + 0.25])
  const rake = [[RX0 - F, roofTop(RX0 - F) + 0.25], [RIDGE_X, roofTop(RIDGE_X) + 0.25], [RX1 + F, roofTop(RX1 + F) + 0.25],
    [RX1 + F, roofUnder(RX1 + F) - F], [RIDGE_X, RIDGE_UNDER - F], [RX0 - F, roofUnder(RX0 - F) - F]]
  add([
    eave(RX0 - F, RX0, RY0 - F, RY1 + F, RX0),
    eave(RX1, RX1 + F, RY0 - F, PY0, RX1),
    eave(RX1, RX1 + F, PY1, RY1 + F, RX1),
    prism(rake, RY0 - F, RY0),
    prism(rake, RY1, RY1 + F),
    boxGeo([PX0, PY0, roofUnder(PX0), PX0 + F, PY1, roofUnder(PX0) + 9]), // closes the cut end of the main roof under the porch roof
  ], trimMat, `Fascia at the eaves and rake boards at the gables, dark (photo PXL_20261009_180831582, seen). 1x fascia on 2x sub fascia (A-6 detail 4, stated); ${F}" thick (assumed). Also a dark board (assumed) closing the cut end of the main roof where the porch roof joins it at x ${PX0}, so the roof build-up does not show under the porch-roof overhangs.`)

  // Ridge log and log purlins: the rake from the outer log face to the ridge is split in three 6'-4" parts (A-5 South, stated)
  const purlinX = [1, 2].flatMap((k) => [WEST + ((RIDGE_X - WEST) * k) / 3, EAST - ((EAST - RIDGE_X) * k) / 3]) // 52.7, 283.3, 110.3, 225.7
  const innerPurlins = purlinX.slice(2)
  const ly0 = RY0 + A.logEnd, ly1 = RY1 - A.logEnd
  const roofLogs = logs().add(
    logWithGrain([RIDGE_X, ly0, RIDGE_UNDER - R], [RIDGE_X, ly1, RIDGE_UNDER - R], R, 20),
    ...purlinX.map((x) => logWithGrain([x, ly0, roofUnder(x) - R], [x, ly1, roofUnder(x) - R], R)))
  const roofLogLabel = `Ridge log and 2 log purlins each side (A-6 section, A-4 North notes, stated; photo PXL_20260311_135523110). ` +
    `Purlins at the 6'-4" points of the rake (A-5 South, stated; positions inferred). Log ends stick out past both gables (photos). ${A.log}" logs (assumed).`
  add(roofLogs.side, logMat, roofLogLabel)
  add(roofLogs.ends, endMat, roofLogLabel)

  // Blocking that closes the gap between the top of the east and west log walls and the sloped ceiling, finished in T&G
  const wallUV = (g) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getZ(i) / IN / 42, p.getY(i) / IN / 42); return g }
  add([
    prism([[WEST, WALL_TOP], [WEST + 2 * WR, WALL_TOP], [WEST + 2 * WR, roofUnder(WEST + 2 * WR)]], SOUTH, NORTH),
    prism([[EAST - 2 * WR, WALL_TOP], [EAST, WALL_TOP], [EAST - 2 * WR, roofUnder(EAST - 2 * WR)]], SOUTH, NORTH),
  ].map(wallUV), pine, 'Blocking between the top of the east and west log walls and the roof (A-6 detail 4: 2x10 blocking at the wall line, stated). Shape follows the roof; T&G finish inside (assumed).')

  // ---------- gable ends ----------
  // Log courses continue the north and south wall coursing (walls.js: centres LOG_BASE + 18n), clipped to the roof
  // and cut around windows and posts. Behind them a 10" chinked core with the window holes.
  const sill = LOG_BASE + Math.ceil((WALL_TOP + WR - LOG_BASE) / (2 * WR)) * 2 * WR + WR // top of the first gable course (309)
  function gable(name, yc, wins, posts, note) {
    const obstacles = [
      ...wins.map((w) => [Math.min(...w.map((p) => p[0])) - A.trim, Math.min(...w.map((p) => p[1])), Math.max(...w.map((p) => p[0])) + A.trim, Math.max(...w.map((p) => p[1]))]),
      ...posts.map(([x, z0, z1]) => [x - R - A.trim, z0, x + R + A.trim, z1]),
    ]
    const wall = logs()
    for (let zc = sill - WR; zc < RIDGE_UNDER; zc += 2 * WR) {
      const hw = (RIDGE_UNDER - (zc - WR) + 2) / PITCH // runs out to the slope at the log's lower edge, so no chinking triangle shows at the rake
      let spans = [[RIDGE_X - hw, RIDGE_X + hw]]
      for (const [x0, z0, x1, z1] of obstacles) {
        if (zc + WR > z0 + 1.5 && zc - WR < z1 - 1.5) spans = spans.flatMap(([a, b]) => [[a, Math.min(b, x0)], [Math.max(a, x1), b]])
      }
      for (const [a, b] of spans) if (b - a >= 12) wall.add(logWithGrain([a, yc, zc], [b, yc, zc], WR, 24))
    }
    wall.side.push(wallLogTop(yc, sill - 3 * WR, WEST, EAST)) // the top wall course (centre 282) above WALL_TOP
    const label = `${name} gable end: log siding (A-4 North note, stated), drawn as 18" logs (title block, stated) continuing the wall courses, in the log wall plane. Includes the top of the last wall course above ${WALL_TOP.toFixed(1)}", where the wall part cuts it. ${note}`
    add(wall.side, logMat, label)
    add(wall.ends, endMat, label)
    add([prism([[WEST, WALL_TOP], [EAST, WALL_TOP], [RIDGE_X, RIDGE_UNDER]], yc - 5, yc + 5, wins)], chinkMat, `${name} gable end: chinking and backing behind the logs (photos: chinked logs).`)
    const pl = logs().add(...posts.map(([x, z0, z1]) => logWithGrain([x, yc, z0], [x, yc, z1], R)))
    const postLabel = `${name} gable log posts up to the ${posts.length > 1 ? 'ridge log and purlins' : 'ridge log'}. ${note}`
    add(pl.side, logMat, postLabel)
    add(pl.ends, endMat, postLabel)
    add(wins.map((w) => prism(w, yc - 2, yc + 2, [inset(w, A.frame)])), mats.vinyl, `${name} gable window frames. ${note}`)
    group.add(mesh(wins.map((w) => prism(inset(w, A.frame), yc - 0.125, yc + 0.125)), glass, null))
    solids.push([WEST, yc - WR, WALL_TOP, EAST, yc + WR, RIDGE_UNDER])
  }

  // North gable: G-N1 and G-N2 each side of the ridge post
  const north = M.openings.filter((o) => v(o.level) === 'upper' && o.wall === 'north').map((o) => {
    const x0 = v(o.offset), x1 = x0 + v(o.width), z0 = LOFT + v(o.sill), z1 = z0 + v(o.height)
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
  })
  gable('North', NORTH - WR, north, [[RIDGE_X, sill, RIDGE_UNDER - 2 * R]],
    `Windows G-N1 and G-N2: 2'-6" x 4'-0", sill 3'-0" above the loft floor, each side of the ridge post (A-2 d2, A-4 North, stated; positions inferred). ` +
    `The Menards order may make them 36" wide (conflicts.md item 35). Ridge post ${A.log}" (A-4 North scaled 1'-2"). Frames white (assumed, as the other windows).`)

  // South gable: 4 windows (triangle, pentagon, pentagon, triangle), log posts between them. No sizes ("field measure").
  // Side posts stand under the inner purlins; the center post under the ridge log (photos).
  const line = (x, gap) => roofUnder(x) - gap
  const xr = innerPurlins[0] - R, xa = innerPurlins[0] + R, xb = RIDGE_X - R
  const tip = RIDGE_X - (RIDGE_UNDER - A.purlinGap - sill) / PITCH
  const top = RIDGE_UNDER - 2 * R - 6 // flat top of the pentagons, under the ridge log
  const xk = RIDGE_X - (RIDGE_UNDER - A.winGap - top) / PITCH
  const westWins = [
    [[tip, sill], [xr, sill], [xr, line(xr, A.purlinGap)]],
    [[xa, sill], [xb, sill], [xb, top], [xk, top], [xa, line(xa, A.winGap)]],
  ]
  const mirror = (w) => w.map(([x, z]) => [2 * RIDGE_X - x, z]).reverse()
  gable('South', SOUTH + WR, [...westWins, ...westWins.map(mirror)],
    [[RIDGE_X, sill, RIDGE_UNDER - 2 * R], ...innerPurlins.map((x) => [x, sill, roofUnder(x) - 2 * R])],
    `4 gable windows, triangle, pentagon, pentagon, triangle, with log posts between (A-5 South, A-2 d2, stated; photos PXL_20260311_135523110, PXL_20260703_223907684). ` +
    `No sizes on the plans ("FIELD MEASURE ALL WINDOWS IN GABLE END"): shapes fitted to the gable, sill on the first gable log at ${sill.toFixed(0)}", posts under the inner purlins (all assumed).`)

  // ---------- loft ----------
  // Floor: the two loft halves (A-2, A-3) plus a landing at the loft stair top over cantilevered joists (A-3 note, inferred)
  const floors = [[LOFT_W[0], LOFT_W[1], STAIR_X, LOFT_W[3]], [STAIR_X, LOFT_E[1], LOFT_E[2], LOFT_E[3]]]
  const loftNote = `Second floor 109'-6" (A-4, A-5, A-6, stated), raised ${RAISE}" to z ${LOFT}. East half to 27'-4" VFY from the north line (A-2 d2, stated), west half to the beam (A-3, scaled).`
  add(floors.map(([x0, y0, x1, y1]) => planUV(boxGeo([x0, y0, JOIST_TOP, x1, y1, LOFT - 0.75]), 42)), pine,
    `Loft built-up floor: T&G pine ceiling seen from below, sleepers, 2x6 joists, T&G underlayment, about 7 3/4" (A-6 detail 2, stated / scaled). ` +
    `Includes a landing at the loft stair top (x ${STAIR_X} to ${POST_X}) on cantilevered joists (A-3 note "cantilever log joists as required for stair conn.", inferred). ${loftNote}`)
  add(floors.map(([x0, y0, x1, y1]) => boxGeo([x0, y0, LOFT - 0.75, x1, y1, LOFT])), floorMat,
    `Loft finished floor, wood-look planks (assumed, same as the main level in the photos). ${loftNote}`)
  for (const [x0, y0, x1, y1] of floors) solids.push([x0, y0, JOIST_TOP, x1, y1, LOFT])

  // Log joists north-south at 3'-5" between the side wall centre lines; the east half (and the stair landing) cantilevers past the beam
  const lj = logs()
  for (let k = 1; k <= 7; k++) {
    const x = WEST + WR + k * SPACING
    const y0 = x > STAIR_X ? BEAM_Y - CANT : BEAM_Y - R
    lj.add(logWithGrain([x, y0, JOIST_UNDER + JOIST_R], [x, NORTH + A.joistEnd, JOIST_UNDER + JOIST_R], JOIST_R))
  }
  const beamZ = JOIST_TOP - R
  lj.add(logWithGrain([WEST - A.beamEnd, BEAM_Y, beamZ], [EAST - WR, BEAM_Y, beamZ], R, 20))
  const ljLabel = `Loft log joists, 7 at 3'-5" (A-3, stated), from the north wall to the log beam at y ${BEAM_Y} (A-3, scaled); east half cantilevers 4'-10 1/2" (A-3, stated). ` +
    `Joists ${(2 * JOIST_R).toFixed(1)}" (inferred: underside 8'-0" above the first floor, A-6, minus the 7 3/4" floor). Beam ${A.log}" (assumed), joists notched into it (assumed). ` +
    `Joist ends ${A.joistEnd}" past the north wall and beam end ${A.beamEnd}" past the west wall (drawn on A-3, lengths assumed; the beam's east end stops at the east wall centre line, so its end does not show in the porch).`
  add(lj.side, logMat, ljLabel)
  add(lj.ends, endMat, ljLabel)

  // Post under the beam and the ridge king post above it
  const posts = logs().add(
    logWithGrain([POST_X, BEAM_Y, FLOOR1], [POST_X, BEAM_Y, beamZ - R], R),
    logWithGrain([POST_X, BEAM_Y, LOFT], [POST_X, BEAM_Y, RIDGE_UNDER - 2 * R], R))
  const postLabel = `Round log post under the loft beam on the centre line (A-3, scaled) and the ridge king post above it at the loft edge (A-2 d2 "RIDGE KING POST W/ SETTLING DEVICE", stated; A-6 section). ${A.log}" (A-3 drawn about 14", assumed).`
  add(posts.side, logMat, postLabel)
  add(posts.ends, endMat, postLabel)
  solids.push([POST_X - R, BEAM_Y - R, FLOOR1, POST_X + R, BEAM_Y + R, beamZ - R], [POST_X - R, BEAM_Y - R, LOFT, POST_X + R, BEAM_Y + R, RIDGE_UNDER - 2 * R])

  // Log railing along the open edges (the loft stair arrives at x STAIR_X, left open)
  const rl = logs(), Q = A.rail
  for (const [x0, x1, y] of [[LOFT_W[0], STAIR_X, BEAM_Y + Q.post], [STAIR_X, LOFT_E[2], LOFT_E[1] + Q.post]]) {
    const n = Math.ceil((x1 - x0) / Q.postGap)
    const px = Array.from({ length: n + 1 }, (_, i) => x0 + Q.post + ((x1 - x0 - 2 * Q.post) * i) / n)
    rl.add(...px.map((x) => logWithGrain([x, y, LOFT], [x, y, LOFT + RAIL_H], Q.post, 10)))
    rl.add(logWithGrain([x0, y, LOFT + RAIL_H - Q.top], [x1, y, LOFT + RAIL_H - Q.top], Q.top, 10))
    rl.add(logWithGrain([x0, y, LOFT + 4], [x1, y, LOFT + 4], Q.bottom, 8))
    for (let x = x0 + Q.post + Q.spacing; x < x1 - Q.post - 2; x += Q.spacing) {
      if (px.every((p) => Math.abs(p - x) > Q.post + 2)) rl.add(logWithGrain([x, y, LOFT + 4], [x, y, LOFT + RAIL_H - Q.top], Q.baluster, 6))
    }
    solids.push([x0, y - Q.post, LOFT, x1, y + Q.post, LOFT + RAIL_H])
  }
  const rlLabel = `Loft log railing, ${RAIL_H}" high (A-6 section, stated; "LOG RAILING SYSTEM", A-2). Log sizes and baluster spacing assumed (4" gap, code).`
  add(rl.side, logMat, rlLabel)
  add(rl.ends, endMat, rlLabel)

  // The walker cannot stand up under the low roof at the loft sides (head 70" above the floor)
  const low = (RIDGE_UNDER - LOFT - 70) / PITCH
  solids.push([LOFT_W[0], LOFT_W[1], LOFT, RIDGE_X - low, LOFT_W[3], LOFT + 70], [RIDGE_X + low, LOFT_E[1], LOFT, LOFT_E[2], LOFT_E[3], LOFT + 70])

  // ---------- wood stove chimney ----------
  // Only the chimney: from the roof underside up. The stove, its base and the black pipe inside belong to the main floor.
  const C = A.chimney, cx = CHIM_X, cy = CHIM_Y
  const ceilingZ = roofUnder(cx + C.r)
  add([
    logWithGrain([cx, cy, ceilingZ], [cx, cy, CHIM_TOP - 9], C.r).side,
    new THREE.CylinderGeometry(C.r * IN, C.r * IN, 4 * IN, 16).translate(cx * IN, (CHIM_TOP - 7) * IN, -cy * IN), // spark screen band
    new THREE.CylinderGeometry(1 * IN, (C.r + 3) * IN, 5 * IN, 16).translate(cx * IN, (CHIM_TOP - 2.5) * IN, -cy * IN), // cap
    new THREE.CylinderGeometry((C.r + 2) * IN, (C.r + 2) * IN, 2 * IN, 16).translate(cx * IN, (roofTop(cx + C.r) + 3) * IN, -cy * IN), // storm collar
  ], mats.metal, `Wood stove chimney on the west slope at x ${cx}, y ${cy}, straight above the stove pipe (Ryan, 2026-11-06: stove centred between the west windows). Top ${CHIM_TOP}" (A-5 West "STOVE CHIMNEY", scaled, raised ${RAISE}"). ` +
    `Class A stainless pipe ${2 * C.r}" with a cap and storm collar (assumed; the photos do not show the outside of the chimney).`)
  add([beamGeo([cx - 12, cy, roofTop(cx - 12) + 0.3], [cx + 12, cy, roofTop(cx + 12) + 0.3], 24, 0.5)], mats.black,
    `Black roof flashing around the stove chimney, 24" square (assumed). Chimney position: above the stove pipe (Ryan, 2026-11-06).`)

  return { group, solids }
}
