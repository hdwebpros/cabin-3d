// Part of the cabin above or around the basement: east porch, south deck, north landing, the outside stair.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
import * as THREE from 'three'
import { M, v, IN, W, FLOOR1, WALL_TOP, up, roofTop, gradeAt, bx, ni, boxGeo, cylGeo, cylBetween, beamGeo, mesh, pbr, std, mats, worldUV, pineBoards } from '../geo.js'

// The house log walls (walls part)
const LOG_FACE = 5 // outer face 5" outside the foundation line
const LOG_END = 24 // log ends stick out 24" past the foundation line at the corners (A-5 West, scaled)

// Sizes no source gives (typical sizes). Every label that uses one says "assumed".
const A = {
  board: 5.5, boardT: 1.5, gap: 0.25, // 2x6 deck boards
  joist: 9.25, joistT: 1.5, spacing: 16, // 2x10 joists at 16"
  beam: 9.25, beamW: 5.5, // beams under the joists
  post: 5.5, // 6x6 deck posts
  brace: 3.5, braceLeg: 24, // 4x4 knee braces
  rail: 36, balusters: 4.5, railPost: 72, railIn: 1.75, // railing height, baluster spacing, max post spacing, post set-in
  maxRiser: 7.75, tread: 11, // stairs: code riser at most 7 3/4", tread 11"
  core: 4.5, siding: 1, // porch wall: 2x4 framing with inside boards; cedar lap siding
  beamLog: 14, // porch log beams, drawn the same size as the posts
  roof: 10, // vertical thickness of the porch roof (rafters, sheathing, shingles)
  sliderH: 80, doorH: 84, // porch doors (door height: A-4 North scaled about 7'-0")
}

const PR = v(M.porch.rect) // [336, 24, 466, 404]
const PX = v(M.porch.post_line_x) // 456
const PY = v(M.porch.post_y) // [34, 124, 214, 304, 394]
const LAND = v(M.porch.north_landing_rect) // [336, 404, 466, 458]
const DS = v(M.deck.south_rect) // [0, -144, 440, 0]
const E = v(M.deck.east_strip_rect)[2] // 440: east edge of the south deck
const BY = v(M.deck.footing_line_y) // -132
const SPAN = v(M.deck.footing_spacing_x) // 104
const X0 = 12 // first deck post 1'-0" east of the west foundation line (A-1, scaled)
const XE = X0 + 4 * SPAN // 428: last deck post, also the x of the post at y -50 (A-1, scaled 35'-8")
const RR = v(M.roof.porch_roof_rect) // [336, 0, 490, 428]
const PP = v(M.roof.pitch_porch) // 0.25
const CEIL = up(v(M.levels_z.porch_ceiling)) // 262
const BEAM_TOP = FLOOR1 + v(M.porch.wall_height) // 258: top of the porch log beams
const FACE = W + LOG_FACE // 341: outer face of the house east log wall
const SN = PY[0], NN = PY[PY.length - 1] // porch south and north wall lines (on the end posts)
const R = 7 // porch log posts about 14" (A-3, A-6, scaled)
const LOGZ = BEAM_TOP - A.beamLog / 2
const JT = FLOOR1 - A.boardT, JB = JT - A.joist, BB = JB - A.beam // joist top, joist bottom, beam bottom
const zTop = (x) => roofTop(RR[0]) - (x - RR[0]) * PP // porch roof top: meets the main roof at x 336, falls 3" per foot
const zUnder = (x) => zTop(x) - A.roof
const DOOR = [W + 48, W + 84] // porch north door, 4'-0" to 7'-0" east of the house (A-4 North, scaled)
const SLIDER = [W + 64.8 - 36, W + 64.8 + 36] // porch south slider, centred on A-5's 2.1 to 8.7 ft (scaled), 72" (A-2)
const STEPS = [FACE, FACE + 48] // driveway stair 4'-0" wide (assumed), right against the house east log wall (photos PXL_20251004_135433269, PXL_20261101_163043044, seen)

const rect = (s0, z0, s1, z1) => [[s0, z0], [s1, z0], [s1, z1], [s0, z1]]

// Flat vertical panel. outline and holes are [s, z] point lists, s = position along the wall.
// axis 'x': the wall runs east-west and d0..d1 is y; axis 'y': it runs north-south and d0..d1 is x.
function panel(axis, d0, d1, outline, holes = []) {
  const vec = (pts) => pts.map(([s, z]) => new THREE.Vector2(s, z))
  const shape = new THREE.Shape(vec(outline))
  for (const h of holes) shape.holes.push(new THREE.Path(vec(h)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: d1 - d0, bevelEnabled: false })
  const m = new THREE.Matrix4()
  if (axis === 'y') m.set(0, 0, IN, d0 * IN, 0, IN, 0, 0, -IN, 0, 0, 0, 0, 0, 0, 1)
  else m.set(IN, 0, 0, 0, 0, IN, 0, 0, 0, 0, IN, -d1 * IN, 0, 0, 0, 1)
  return g.applyMatrix4(m)
}

// Wall outline from s0 to s1, z0 to z1, with door notches [a, b, head] cut up from the bottom
function outline(s0, s1, z0, z1, doors = []) {
  const pts = [[s0, z0]]
  for (const [a, b, h] of doors) pts.push([a, z0], [a, h], [b, h], [b, z0])
  return [...pts, [s1, z0], [s1, z1], [s0, z1]]
}

// Twisted square metal baluster, 1/2" bar, standing on z = 0; one full twist in the middle
const BAL_H = A.rail - 5 - 5.25
function baluster() {
  const h = BAL_H * IN, g = new THREE.BoxGeometry(0.5 * IN, h, 0.5 * IN, 1, 12, 1)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h + 0.5, a = 2 * Math.PI * Math.min(1, Math.max(0, (t - 0.25) / 0.5))
    const x = p.getX(i), z = p.getZ(i)
    p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), t * h, x * Math.sin(a) + z * Math.cos(a))
  }
  g.computeVertexNormals()
  return g
}

export function buildPorchDeck() {
  const group = new THREE.Group()
  const solids = []
  const add = (...ms) => ms.forEach((x) => group.add(x))
  const m = {
    deck: pbr('coated_pine', 1.2, { color: 0x7d6656 }),
    stain: std(0x3b2d24, 0.8),
    log: mats.log, // same as the house logs (walls part)
    siding: pbr('wood_planks', 1.22, { color: 0x4b5055 }),
    pine: pineBoards(), // T&G inside the porch (Ryan, 2026-11-06), same boards as the basement finish
    shingle: mats.shingle, // same as the main roof (roof part); shingle rows run along the eave: own texture coordinates below
    fascia: mats.trim, // as the main roof trim (roof part)
    door: mats.doorWhite,
  }
  m.deck.userData.tile = 0 // deck boards get their own texture direction, along each board
  m.siding.map = null // dark gray stain: keep only the board shapes (normal map) of the plank texture

  // Deck boards with the wood grain along the board
  const board = (b, alongY, out) => {
    const g = boxGeo(b)
    worldUV(g, 1.2)
    if (alongY) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)) }
    out.push(g)
  }

  // ---------- railings ----------
  const railWood = [], railMetal = [], bal = baluster()
  // a, b = [x, y, z] of the walking surface under the railing ends (z may differ: stair railings)
  function railing(a, b) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len < 1) return
    const at = (t, dz) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + dz]
    const np = Math.ceil(len / A.railPost)
    for (let i = 0; i <= np; i++) { const [x, y, z] = at(i / np, 0); railWood.push(boxGeo([x - 1.75, y - 1.75, z, x + 1.75, y + 1.75, z + A.rail])) }
    railWood.push(beamGeo(at(0, A.rail - 0.75), at(1, A.rail - 0.75), 5.5, 1.5)) // flat cap
    railWood.push(beamGeo(at(0, A.rail - 3.25), at(1, A.rail - 3.25), 1.5, 3.5)) // top rail
    railWood.push(beamGeo(at(0, 4.5), at(1, 4.5), 3.5, 1.5)) // bottom rail
    const nb = Math.round(len / A.balusters)
    for (let i = 1; i < nb; i++) { const [x, y, z] = at(i / nb, 5.25); railMetal.push(bal.clone().translate(x * IN, z * IN, -y * IN)) }
    solids.push([Math.min(a[0], b[0]) - 2, Math.min(a[1], b[1]) - 2, Math.min(a[2], b[2]), Math.max(a[0], b[0]) + 2, Math.max(a[1], b[1]) + 2, Math.max(a[2], b[2]) + A.rail])
  }

  // ---------- stairs ----------
  // Down from a deck edge at s0 (dir +1 or -1 along the axis) to the ground, between w0 and w1.
  // n risers (the last one lands on gradeAt); without n, enough that none is over 7 3/4".
  function stair(axis, s0, dir, w0, w1, n = 0) {
    const mid = (w0 + w1) / 2, T = A.tread
    const at = (s, w, z) => (axis === 'x' ? [s, w, z] : [w, s, z])
    const ground = (n) => gradeAt(...at(s0 + dir * (n - 1) * T, mid, 0).slice(0, 2))
    if (!n) for (n = 2; (FLOOR1 - ground(n)) / n > A.maxRiser; ) n++
    const r = (FLOOR1 - ground(n)) / n
    const treads = [], wood = []
    for (let k = 1; k < n; k++) {
      const a = s0 + dir * (k - 1) * T, b = s0 + dir * k * T, z = FLOOR1 - k * r
      const t = bx(axis, Math.min(a, b), Math.max(a, b), w0, w1, z - A.boardT, z)
      board(t, axis === 'x', treads)
      solids.push(t)
    }
    const end = s0 + dir * (n - 1) * T
    for (const w of [w0 + 0.75, mid, w1 - 0.75]) wood.push(beamGeo(at(s0, w, FLOOR1 - r - 4), at(end, w, FLOOR1 - n * r - 4), 1.5, 11.25))
    const top = s0 - dir * A.railIn // stair railings start at the deck railing corner posts
    for (const w of [w0 + A.railIn, w1 - A.railIn]) railing(at(top, w, FLOOR1 - r), at(end, w, FLOOR1 - n * r))
    return { n, r, treads, wood }
  }

  // ---------- floors: deck boards on 2x10 joists and beams ----------
  const boards = [], frame = []
  const step = A.board + A.gap
  for (let y = DS[1]; y < -LOG_FACE; y += step) board([DS[0], y, JT, FACE, Math.min(y + A.board, -LOG_FACE), FLOOR1], false, boards) // south deck
  for (let x = FACE; x < E; x += step) board([x, DS[1], JT, Math.min(x + A.board, E), PR[1], FLOOR1], true, boards) // its east part
  for (let x = W; x < PR[2]; x += step) board([x, PR[1], JT, Math.min(x + A.board, PR[2]), LAND[3], FLOOR1], true, boards) // porch and landing
  solids.push([DS[0], DS[1], JB, FACE, -LOG_FACE, FLOOR1], [FACE, DS[1], JB, E, PR[1], FLOOR1], [FACE, PR[1], JB, PR[2], LAND[3], FLOOR1])

  const J = A.joistT, S = A.spacing
  for (let x = DS[0]; x <= W; x += S) frame.push([x, DS[1], JB, x + J, -3.5, JT]) // south deck joists, north-south
  frame.push([DS[0], -3.5, JB, FACE, -2, JT], [DS[0], DS[1], JB, FACE, DS[1] + J, JT], [FACE - 3, DS[1], JB, FACE, -2, JT]) // ledger, rim, double joist
  for (let y = DS[1]; y < PR[1] - J - 2; y += S) frame.push([y >= 0 ? W + J : FACE, y, JB, E, y + J, JT]) // east part joists, east-west
  frame.push([E - J, DS[1], JB, E, PR[1], JT])
  for (let y = PR[1]; y < LAND[3] - J - 2; y += S) frame.push([W + J, y, JB, PR[2], y + J, JT]) // porch joists, east-west
  frame.push([W + J, LAND[3] - J, JB, PR[2], LAND[3], JT], [PR[2] - J, PR[1], JB, PR[2], LAND[3], JT], [W, 0, JB, W + J, LAND[3], JT])
  const beams = [
    { axis: 'x', at: BY, from: DS[0], to: E }, // south deck: on the post line 11'-0" out (A-1)
    { axis: 'y', at: XE, from: BY, to: -50 + A.post / 2 }, // east part of the south deck, post to post (A-1 posts at x 35'-8")
    { axis: 'y', at: PX, from: PR[1], to: LAND[3] }, // porch: on the log post line (A-1, A-3)
  ]
  const bw = A.beamW / 2
  for (const b of beams) frame.push(bx(b.axis, b.from, b.to, b.at - bw, b.at + bw, BB, JB))

  // Posts down to the ground, knee braces where the post is tall enough
  const posts = [
    ...[0, 1, 2, 3, 4].map((i) => ({ x: X0 + i * SPAN, y: BY, on: i === 4 ? [beams[0], beams[1]] : [beams[0]] })),
    { x: XE, y: -50, on: [beams[1]] }, // A-1: 4'-2" south of the lake wall (chain, stated), x scaled
    ...[...PY, 448].map((y) => ({ x: PX, y, on: [beams[2]] })), // 448: A-1 dashed footing under the landing
  ]
  const postG = [], braceG = [], h = A.post / 2
  for (const p of posts) {
    const g = gradeAt(p.x, p.y)
    postG.push(boxGeo([p.x - h, p.y - h, g - 6, p.x + h, p.y + h, BB]))
    solids.push([p.x - h, p.y - h, g, p.x + h, p.y + h, BB])
    if (BB - g < A.braceLeg + 12) continue
    for (const b of p.on) for (const d of [-1, 1]) {
      const s = (b.axis === 'x' ? p.x : p.y) + d * A.braceLeg
      if (s >= b.from && s <= b.to) braceG.push(beamGeo([p.x, p.y, BB - A.braceLeg], b.axis === 'x' ? [s, p.y, BB] : [p.x, s, BB], A.brace, A.brace))
    }
  }

  add(
    mesh(boards, m.deck, `Deck boards: south deck 36'-8" x 12'-0" plus the strip east of the porch (A-2, stated), porch floor 10'-10" x 31'-8" (A-1, A-2, stated) and north landing 10'-10" x 4'-6" (A-2, stated), all at the main floor, ${FLOOR1}" above the slab (A-4, A-5; raised for the 12 ft basement). Dark stain (photos PXL_20261101_163027116, seen). 2x6 boards (assumed). South deck boards run east-west over north-south joists (assumed; A-2 hatches them north-south). The finish of the porch floor inside is not known; drawn as deck boards (assumed).`),
    mesh(frame.map(boxGeo), m.stain, `Deck and porch framing, dark stain (photos, seen). Porch floor about 1'-0" deep (A-6, scaled): 2x10 joists at 16" (assumed). Beams on the deck post line 11'-0" south of the lake wall (A-1, stated), on the porch post line 10'-0" east of the house (A-1, stated) and on the posts at x 35'-8" (A-1, scaled). Beam size not given, drawn 5 1/2" x 9 1/4" (assumed).`),
    mesh(postG, m.stain, `Deck posts: dark-stained square timber posts on the ground (photos PXL_20261101_163027116, PXL_20251004_135433269, seen), drawn 6x6 (assumed). South deck: 5 posts 8'-8" apart, 11'-0" south of the lake wall (A-1, stated; first post 1'-0" from the west wall, scaled), one more 4'-2" south of the lake wall at x 35'-8" (A-1). Porch: under each log post, 10'-0" east of the house (A-1, stated; y inferred from the A-1 chain), and one under the landing (assumed: conflicts.md item 29, A-1 drawing 2 shows no clear footing there). Footings 16" Sonotube, 48" deep (A-1, stated; not drawn). A-6 draws stone-wrapped pedestals at the porch posts; the photos show timber posts with knee braces.`),
  )
  if (braceG.length) add(mesh(braceG, m.stain, 'Knee braces (Y shape) from the deck posts up to the beams (photos PXL_20261009_180831582, PXL_20261101_163027116, seen). 4x4 with 24" legs (assumed). Left out where the post is too short.'))

  // ---------- porch walls: framing with inside boards, dark gray cedar lap siding ----------
  const C = A.core / 2, SD = A.siding
  const LOW = LOGZ - A.beamLog / 2 + 2 // lower walls run 2" up into the log beams
  const HIGH = BEAM_TOP - 2 // boards above the beams start 2" down inside them
  const bays = PY.slice(0, 3).map((y, i) => (y + PY[i + 1]) / 2) // the three south bays have windows (photo); the north bay is siding only
  const WIN = 60, SILL = FLOOR1 + 24 // A-4 East 5'-0" x 5'-0", 2'-0" sill (stated)
  const walls = [
    { axis: 'y', line: PX, out: 1, s0: SN - C - SD, s1: NN + C + SD, top: () => zUnder(PX + C + SD), holes: bays.map((y) => rect(y - WIN / 2, SILL, y + WIN / 2, SILL + WIN)), doors: [] },
    { axis: 'x', line: SN, out: -1, s0: W, s1: PX + C + SD, top: zUnder, holes: [], doors: [[SLIDER[0], SLIDER[1], FLOOR1 + A.sliderH]] },
    { axis: 'x', line: NN, out: 1, s0: W, s1: PX + C + SD, top: zUnder, holes: [], doors: [[DOOR[0] - 1.5, DOOR[1] + 1.5, FLOOR1 + A.doorH + 1.5]] },
  ]
  const core = [], sid = []
  for (const w of walls) {
    const upper = [[w.s0, HIGH], [w.s1, HIGH], [w.s1, w.top(w.s1)], [w.s0, w.top(w.s0)]] // boards above the log beam, up to the roof
    const lower = outline(w.s0, w.s1, FLOOR1, LOW, w.doors)
    const sd = w.out > 0 ? [w.line + C, w.line + C + SD] : [w.line - C - SD, w.line - C]
    core.push(panel(w.axis, w.line - C, w.line + C, lower, w.holes), panel(w.axis, w.line - C, w.line + C, upper))
    sid.push(panel(w.axis, ...sd, lower, w.holes), panel(w.axis, ...sd, upper))
  }
  // Walker: walls up to the ceiling, with the open half of the slider and the north doorway left open
  const smid = (SLIDER[0] + SLIDER[1]) / 2
  solids.push(
    bx('y', SN - C - SD, NN + C + SD, PX - C, PX + C + SD, FLOOR1, CEIL),
    bx('x', W, SLIDER[0], SN - C - SD, SN + C, FLOOR1, CEIL), bx('x', smid, PX + C, SN - C - SD, SN + C, FLOOR1, CEIL),
    bx('x', W, DOOR[0], NN - C, NN + C + SD, FLOOR1, CEIL), bx('x', DOOR[1], PX + C, NN - C, NN + C + SD, FLOOR1, CEIL),
  )
  add(
    mesh(core, m.pine, 'Porch walls: framed walls on the porch floor between the log posts (A-4; photos). The log beams on top are 8\'-4" above the floor (A-4 North, stated; A-4 East says 8\'-3", conflicts.md item 9). 2x4 framing. Inside: tongue-and-groove pine (Ryan, 2026-11-06; the 2024 video PXL_20240211_164017035 shows bare OSB), also on the triangles above the end log beams, up to the sloped ceiling.'),
    mesh(sid, m.siding, 'Porch siding: horizontal cedar boards (A-4 North note "cedar siding", stated) with dark gray stain (photos PXL_20261101_163027116, PXL_20251004_135433269, seen). Board size assumed.'),
  )

  // Windows: white vinyl two-panel sliders; frame 2" wide, 3 1/4" deep (assumed)
  const vinylWin = [], vinylSlider = [], glass = []
  const unit = (out, axis, line, s0, s1, z0, z1, mids, glassFrom = s0 + 2) => {
    const f = (a, b, c, d) => out.push(bx(axis, a, b, line - 1.6, line + 1.6, c, d))
    f(s0, s1, z0, z0 + 2); f(s0, s1, z1 - 2, z1); f(s0, s0 + 2, z0, z1); f(s1 - 2, s1, z0, z1)
    for (const s of mids) f(s - 1, s + 1, z0, z1)
    glass.push(bx(axis, glassFrom, s1 - 2, line - 0.15, line + 0.15, z0 + 2, z1 - 2))
  }
  for (const y of bays) unit(vinylWin, 'y', PX, y - WIN / 2, y + WIN / 2, SILL, SILL + WIN, [y])
  unit(vinylSlider, 'x', SN, SLIDER[0], SLIDER[1], FLOOR1, FLOOR1 + A.sliderH, [smid], smid) // west half open
  glass.push(bx('x', smid, SLIDER[1] - 2, SN + 0.6, SN + 0.9, FLOOR1 + 2, FLOOR1 + A.sliderH - 2)) // sliding panel, pushed behind the fixed one

  // North door: white frame and a white door with a half-round window, drawn open into the porch
  const doorFrame = [
    bx('x', DOOR[0] - 1.5, DOOR[0], NN - C, NN + C, FLOOR1, FLOOR1 + A.doorH + 1.5),
    bx('x', DOOR[1], DOOR[1] + 1.5, NN - C, NN + C, FLOOR1, FLOOR1 + A.doorH + 1.5),
    bx('x', DOOR[0] - 1.5, DOOR[1] + 1.5, NN - C, NN + C, FLOOR1 + A.doorH, FLOOR1 + A.doorH + 1.5),
  ]
  const dw = DOOR[1] - DOOR[0], ds1 = NN - C, ds0 = ds1 - dw, dTop = FLOOR1 + A.doorH - 0.5
  const fan = Array.from({ length: 13 }, (_, i) => [(ds0 + ds1) / 2 + 10 * Math.cos((i / 12) * Math.PI), dTop - 14 + 10 * Math.sin((i / 12) * Math.PI)])
  const doorSlab = panel('y', DOOR[0], DOOR[0] + 1.75, rect(ds0, FLOOR1 + 0.5, ds1, dTop), [fan])
  glass.push(panel('y', DOOR[0] + 0.8, DOOR[0] + 0.95, fan))
  solids.push([DOOR[0], ds0, FLOOR1, DOOR[0] + 1.75, ds1, dTop])

  add(
    mesh(vinylWin.map(boxGeo), mats.vinyl, 'Porch windows: 3 white two-panel sliding windows, one in each of the three south bays of the east wall (photo PXL_20261101_163027116, seen; the north bay has siding only). 5\'-0" x 5\'-0", sill 2\'-0" (A-4 East, stated). A-4 East draws 4 windows and A-2 8 panels (conflicts.md item 15). Not in the Menards order.'),
    mesh(vinylSlider.map(boxGeo), mats.vinyl, `Porch south door to the deck: 72" sliding glass door (A-2, stated), about 2'-1" to 8'-8" east of the house foundation line (A-5 South, scaled). Height ${A.sliderH}" (assumed). Shown half open.`),
    mesh([...doorFrame.map(boxGeo), doorSlab].map(ni), m.door, 'Porch entry door: 36" white swing door with a half-round window (A-2 36", stated; photos PXL_20261101_163027116 and PXL_20251004_135433269, seen), in the porch north wall onto the north landing (A-2, A-4 North), 4\'-0" to 7\'-0" east of the house foundation line and about 7\'-0" tall (A-4 North, scaled). Swing direction assumed; shown open.'),
    mesh(glass.map((b) => ni(Array.isArray(b) ? boxGeo(b) : b)), mats.glass, null, { shadow: false }),
  )

  // ---------- log posts and log beams ----------
  const logs = [], bands = []
  for (const y of PY) { logs.push(cylGeo(PX, y, R, FLOOR1, LOGZ)); bands.push(cylGeo(PX, y, R + 0.3, FLOOR1, FLOOR1 + 6)) }
  logs.push(cylBetween([PX, SN - 24, LOGZ], [PX, NN + 24, LOGZ], A.beamLog / 2, 20))
  for (const y of [SN, NN]) logs.push(cylBetween([W, y, LOGZ], [PX + R, y, LOGZ], A.beamLog / 2, 20))
  add(
    mesh(logs, m.log, `Porch log posts and log beams: 5 whole round log posts with red-orange stain (photos, seen) standing on the porch floor, 10'-0" east of the house foundation, 7'-6" apart (A-1, A-2, stated), about 14" thick (A-3, A-6, scaled). Log beams along the outer wall and over both end walls (A-3, drawn); the outer beam sticks out past the lake corner (photo PXL_20261101_163027116). Beam top 8'-4" above the floor (A-4 North, stated); beam size assumed ${A.beamLog}".`),
    mesh(bands, mats.black, 'Dark band at the foot of each porch log post (photo PXL_20261101_163027116, seen; what it is is not known). Height assumed 6".'),
  )

  // ---------- porch roof and ceiling ----------
  const ct = Math.cos(Math.atan(PP)) // vertical thickness to thickness across the slope
  const ym = (RR[1] + RR[3]) / 2
  const slab = (d0, d1) => beamGeo([RR[0], ym, zTop(RR[0]) - (d0 + d1) / 2], [RR[2], ym, zTop(RR[2]) - (d0 + d1) / 2], RR[3] - RR[1], (d1 - d0) * ct)
  const shingles = slab(0, 0.75), suv = shingles.attributes.uv, sp = shingles.attributes.position
  for (let i = 0; i < sp.count; i++) suv.setXY(i, -sp.getZ(i) / IN / 280, 1 - ((sp.getX(i) / IN - RR[0]) / ct) / 280) // u along the eave, v down the slope
  add(
    mesh(shingles, m.shingle, `Porch roof: shed roof, 3/12 (A-3, A-4, A-5, stated), asphalt shingles like the main roof (A-4 note). 12'-10" out from the house foundation line, from the house south line to 2'-0" past the porch north end (A-3, stated and inferred). The top meets the main roof at the house east line at ${zTop(RR[0]).toFixed(0)}" (A-4 scales about 112'-6" = 308" raised); low edge ${zTop(RR[2]).toFixed(0)}" (A-4 and A-6 scale about 109'-6" = 272" raised).`),
    mesh(slab(0.75, A.roof), m.fascia, `Porch roof framing, dark fascia and soffit (photos, seen). Roof ${A.roof}" thick (assumed: A-6 lists rafters, sheathing and shingles, no sizes).`),
  )
  // Ceiling follows the roof slope, from just above the outer log beam up to the house wall (video PXL_20240211_164017035, seen).
  // A-6 draws it flat at 8'-8"; the video wins (conflicts.md item 39). The end-wall boards above the beams (walls above) now show inside.
  const cy0 = SN + C, cy1 = NN - C, cym = (cy0 + cy1) / 2, cx0 = FACE - 3.5, cx1 = PX - C, ceilT = 0.75
  const ceil = beamGeo([cx0, cym, zUnder(cx0) - ceilT / 2], [cx1, cym, zUnder(cx1) - ceilT / 2], cy1 - cy0, ceilT * ct)
  add(
    mesh(ceil, mats.trim, `Porch ceiling: dark ribbed panels on the underside of the 3/12 porch roof (video PXL_20240211_164017035, seen; A-6 says T&G, flat at 8'-8"). About ${(zUnder(cx1) - FLOOR1).toFixed(0)}" above the floor at the outer wall and ${(zUnder(cx0) - FLOOR1).toFixed(0)}" at the house wall (follows the roof, inferred; the video matches within a few inches).`),
    mesh(boxGeo([cx0, cy0, WALL_TOP - 2, cx0 + 0.75, cy1, zUnder(cx0)]), m.pine, `Porch side of the house east wall, above the top log: board strip from the log top (${WALL_TOP.toFixed(0)}") up to the porch ceiling (video PXL_20240211_164017035: bare OSB in 2024; T&G like the porch walls, Ryan 2026-11-06).`),
  )

  // ---------- stairs and railings ----------
  const ri = A.railIn, z = FLOOR1
  // The plans' deck stair at the east end of the south deck was not built (Ryan, 2026-11-05). This is the only outside stair.
  const ns = stair('y', LAND[3], 1, ...STEPS, 5)
  add(
    mesh(ns.treads, m.deck, `Stair from the driveway up to the north landing. Ryan: built later, not on the plans; photos PXL_20251004_135433269 and PXL_20261101_163043044 show it going north down from the landing right beside the house east log wall, its west railing along the logs (position seen). A-2 draws the landing steps 3'-6" east of the house; the photos show the built stair against the logs. 4'-0" wide, as the A-2 landing steps (assumed for the built stair). 5 steps (Ryan, 2026-11-05, stated). Step height not measured: drawn ${ns.r.toFixed(1)}" so the 5 steps reach the model ground, which is assumed; ${A.tread}" treads (assumed).`),
    mesh(ns.wood, m.stain, 'Driveway stair stringers, 2x12 (assumed).'),
  )
  railing([DS[0] + ri, -LOG_END - 2, z], [DS[0] + ri, DS[1] + ri, z]) // west end of the south deck, stops short of the house log ends
  railing([DS[0] + ri, DS[1] + ri, z], [E - ri, DS[1] + ri, z]) // south edge
  railing([E - ri, DS[1] + ri, z], [E - ri, PR[1] + ri, z]) // east edge (no deck stair: Ryan)
  railing([E - ri, PR[1] + ri, z], [PR[2] - ri, PR[1] + ri, z]) // short piece to the porch corner
  railing([PR[2] - ri, NN, z], [PR[2] - ri, LAND[3] - ri, z]) // landing, east edge from the corner log post
  railing([PR[2] - ri, LAND[3] - ri, z], [STEPS[1] - ri, LAND[3] - ri, z]) // landing, north edge from the corner to the stair top (no railing between the stair and the logs: photos)
  add(
    mesh(railWood, m.stain, 'Deck railing: dark-stained wood posts and rails (photos PXL_20261009_180831582, PXL_20261101_163027116, seen), 36" tall (assumed). A-2 and A-5 call for a log railing; the photos show this railing instead.'),
    mesh(railMetal, mats.black, 'Twisted black metal balusters in the deck railing (photos PXL_20261009_180831582, PXL_20261101_163027116, seen). About 4 1/2" apart (assumed).'),
  )

  return { group, solids }
}
