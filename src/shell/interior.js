// Main floor inside, as the cabin sits today: partition walls and doors, kitchen island and counters,
// the stair to the loft, the wood stove with its pipe. Facts use inches, x = east, y = north, z = up (see geo.js).
import * as THREE from 'three'
import { M, v, FLOOR1, up, roofUnder, boxGeo, cylBetween, mesh, std, mats } from '../geo.js'

const LS = M.stairs.main_to_loft
const RISE = v(LS.total_rise) // 114 (levels 100'-0" to 109'-6", stated)
const NL = v(LS.lower_treads) // 5 steps, then the landing (Ryan, 2026-11-06)
const NU = 6 // upper treads, as drawn on A-2 (the 7th step is the loft floor)
const TREAD = v(LS.tread_depth) // 11 (A-2 scaled)
export const LOFT_Y0 = v(LS.upper_run_rect)[1] - NL * TREAD // 174: the first step; the basement stair opening in the main floor starts here (basement.js)

// Sizes no source gives (normal building values). Every label that uses one says "assumed".
const A = {
  wall: 4.5, // 2x4 stud wall with drywall both sides (the photo shows a white drywall wall under the loft stair)
  door: 80, doorT: 1.75, // doors 6'-8" high, 1 3/4" thick leaves (A-2 gives only the widths)
  counterH: 36, refH: 70, // kitchen cabinet and counter height, refrigerator height
  tread: 1.5, rail: 36, post: 3, handrail: 2.5, baluster: 1.25, spacing: 6.5, stringer: 4, // stair parts
  stove: { w: 22, d: 30, h: 30, legs: 6, pad: 3, pipeR: 4 }, // stove body, hearth pad, 8" pipe
}
const CEIL = up(v(M.levels_z.main_underside_loft_joists)) // 254: top of the walls, under the loft joists (A-6, stated: 8'-0" above the first floor)
const WH = CEIL - FLOOR1

// ---------- helpers ----------

// Walls are boxes [x0, y0, x1, y1] with openings [s0, s1] along the wall (doors 80" high, other openings too)
// Returns solid boxes: the pieces between openings, and the header over each opening
function wall([x0, y0, x1, y1], openings = []) {
  const alongX = x1 - x0 > y1 - y0
  const [a0, a1] = alongX ? [x0, x1] : [y0, y1]
  const pieces = []
  const box = (s0, s1, z0, z1) => pieces.push(alongX ? [s0, y0, z0, s1, y1, z1] : [x0, s0, z0, x1, s1, z1])
  let at = a0
  for (const [s0, s1] of [...openings].sort((p, q) => p[0] - q[0])) {
    if (s0 > at) box(at, s0, FLOOR1, CEIL)
    box(s0, s1, FLOOR1 + A.door, CEIL)
    at = s1
  }
  if (a1 > at) box(at, a1, FLOOR1, CEIL)
  return pieces
}

// A door leaf standing open 90 degrees: [x0, y0, x1, y1] flat box, 80" high
const leaf = ([x0, y0, x1, y1]) => boxGeo([x0, y0, FLOOR1, x1, y1, FLOOR1 + A.door])

export function buildMainInterior() {
  const group = new THREE.Group()
  const solids = []
  const add = (geos, mat, label) => { if (geos.length) group.add(mesh(geos, mat, label)) }

  const drywall = std(0xf0ede6, 0.95)
  const woodDoor = std(0xa97c50, 0.7)
  const cabinet = std(0xcaa57a, 0.6) // light shaker-style wood (photo PXL_20260310_232308808)
  const top = std(0x2c2c30, 0.4) // dark counter top (same photo)
  const steel = std(0xb8bbbf, 0.35, { metalness: 0.6 })
  const log = mats.log // same as the loft railing

  // ---------- 1. partition walls (A-2 drawing 1, rooms.main; walls 4 1/2" thick) ----------
  // Layout from the A-2 crops, scaled and squared up: the plan draws the bedroom doors on an angled pair of walls.
  // x 13 is the inside of the west log wall, x 323 the east one, y 539.3 the north one.
  const T = A.wall
  const walls = [
    // bath block, south wall: from the west log wall to the hall wall (stair top is open, no wall: Ryan, 2026-11-05)
    [[13, 275.5, 171.5, 275.5 + T], []],
    // wall between the west bath and the 3/4 bath, up to the bedroom 1 wall
    [[77.5, 280, 82, 392.3], []],
    // wall behind the tub, between the 3/4 bath and the bedroom 1 closet (moved with the south wall of bedroom 1, closet stays 26" deep; position inferred)
    [[82, 358.3, 167, 362.8], []],
    // bedroom 1 south wall at y 387.8 so the room is 147" deep (A-2: 12'-3", stated; room y 392.3 to 539.3): west bath door 30" (x 43 to 73) and the 48" closet opening (x 86 to 134, width scaled)
    [[13, 387.8, 171.5, 387.8 + T], [[43, 73], [86, 134]]],
    // hall west wall, bath doors and bedroom 1 wall: 3/4 bath door 30", bedroom 1 door 32"
    [[167, 275.5, 171.5, 454.3], [[291, 321], [414, 446]]],
    // hall north end
    [[167, 449.8, 220, 454.3], []],
    // hall east wall at x 215.5 so the hall is 44" wide (A-2, stated): opening to the entry (no door drawn; 48" width assumed), bedroom 2 door 32" (ends at the hall end wall)
    [[215.5, 275.5, 220, 454.3], [[331, 379], [417.8, 449.8]]],
    // bedroom partition: bedroom 2 stays 137.5" (A-2 stated 138"); bedroom 1 is 168" (A-2 stated 172"): the stated sizes add to 4" more than the 310" between the log walls, so bedroom 2 was kept (inferred)
    [[181, 454.3, 185.5, 539.3], []],
    // bedroom 2 south wall, with the 48" closet opening (x 255 to 303)
    [[220, 414, 323, 418.5], [[255, 303]]],
    // entry north wall at y 390.5: entry is 109" x 65" (A-2, stated; x 214 to 323 from the hall side, y 325.5 to 390.5; behind it the bedroom 2 closet)
    [[218.5, 390.5, 323, 395], []],
    // entry south wall = laundry north wall: 60" bifold opening (x 258 to 318)
    [[220, 321.5, 323, 325.5], [[258, 318]]],
    // laundry south wall
    [[220, 275.5, 323, 280], []],
  ]
  const wallBoxes = walls.flatMap(([b, o]) => wall(b, o))
  add(wallBoxes.map(boxGeo), drywall,
    'Interior walls on the main floor: bedroom 1, bedroom 2, west bath, 3/4 bath, hall, entry, laundry and closets. ' +
    'Positions from A-2 drawing 1 scaled and squared up (the plan draws the bedroom doors on an angled wall pair), confidence scaled / inferred. ' +
    `Walls ${A.wall}" thick and ${WH}" high up to the loft joists, 8'-0" above the floor (A-6, stated; thickness and white drywall assumed). ` +
    'Door openings: 30" (baths), 32" (bedrooms), 48" closets, 60" laundry (A-2, stated); opening height 80" assumed. The 48" opening between the hall and the entry is assumed (A-2 gives no width; no door drawn). Wall pieces beside the openings and the tub wall: position inferred from the room sizes. Bedroom 1 is 147" deep and the entry 109" x 65" (A-2, stated); the hall is 44" wide (A-2, stated).')
  solids.push(...wallBoxes)

  // Doors standing open 90 degrees against the walls they open toward (leaf only; the leaves are not solid)
  const d = A.doorT
  add([
    leaf([73 - d, 357.8, 73, 387.8]), // west bath, hinged at the east jamb, opens south into the bath
    leaf([137, 291, 167, 291 + d]), // 3/4 bath, hinged at the south jamb, opens west into the bath
    leaf([135, 414, 167, 414 + d]), // bedroom 1, hinged at the south jamb, opens west into the bedroom
    leaf([220, 418.5, 252, 418.5 + d]), // bedroom 2, hinged at the south jamb, opens east into the bedroom
  ], woodDoor,
    'Interior doors standing open 90 degrees: west bath 30", 3/4 bath 30", bedroom 1 32", bedroom 2 32" (A-2 drawing 1, stated widths). ' +
    'Which side each door hinges on and the 80" height and 1 3/4" thickness are assumed. The plan draws no doors on the closets or the laundry (bifold, not drawn).')

  // ---------- 2. kitchen: island, counters, refrigerator (A-2 drawing 1) ----------
  const [iw, id] = v(M.rooms.main.kitchen_island.size) // 102 north-south x 44 east-west (8'-6" x 3'-8", stated)
  const ISL = [211, 105.6, 211 + id, 105.6 + iw] // x 211 to 255, y 105.6 to 207.6 (A-2 d1 scaled)
  const CT = A.counterH - 1.5
  add([boxGeo([ISL[0], ISL[1], FLOOR1, ISL[2], ISL[3], FLOOR1 + CT])], cabinet,
    `Kitchen island, ${iw}" x ${id}" (8'-6" x 3'-8", A-2 drawing 1, stated), position scaled from A-2 d1: x ${ISL[0]} to ${ISL[2]}, y ${ISL[1]} to ${ISL[3]}. Cabinet sides, 36" high with the top (assumed). The plan shows a sink and dishwasher and 4 stools on the west side: not drawn.`)
  add([boxGeo([ISL[0], ISL[1], FLOOR1 + CT, ISL[2], ISL[3], FLOOR1 + A.counterH])], top, 'Kitchen island counter top, dark (photo PXL_20260310_232308808, seen); thickness 1 1/2" assumed.')
  solids.push([ISL[0], ISL[1], FLOOR1, ISL[2], ISL[3], FLOOR1 + A.counterH])

  // Counters along the east wall and north of the range: A-2 draws them (scaled); "final layout by owner", so cabinet fronts are not drawn
  const RANGE = [299, 153, 323, 182] // range, drawn on the plan (A-2 d1, scaled)
  const counters = [[299, 105.6, 323, RANGE[1]], [299, RANGE[3], 323, 275.5], [272, 255.6, 299, 275.5]]
  add(counters.map(([x0, y0, x1, y1]) => boxGeo([x0, y0, FLOOR1, x1, y1, FLOOR1 + CT])), cabinet,
    'Kitchen cabinets along the east wall and north of the range (A-2 drawing 1, scaled; the plan says "final layout by owner"). 24" deep and 36" high assumed; fronts and the sink on the east wall (photo PXL_20260523_151144457) are not drawn.')
  add(counters.map(([x0, y0, x1, y1]) => boxGeo([x0, y0, FLOOR1 + CT, x1, y1, FLOOR1 + A.counterH])), top, 'Kitchen counter tops, dark (photo PXL_20260310_232308808, seen).')
  add([boxGeo([RANGE[0], RANGE[1], FLOOR1, RANGE[2], RANGE[3], FLOOR1 + A.counterH])], steel, 'Range on the east wall (A-2 drawing 1, drawn, position scaled; type and size assumed 30" wide, 36" high).')
  const REF = [238, 246, 272, 275.5]
  add([boxGeo([REF[0], REF[1], FLOOR1, REF[2], REF[3], FLOOR1 + A.refH])], steel, `Refrigerator "REF." (A-2 drawing 1, scaled). Height ${A.refH}" assumed. A photo shows it in another spot (moved later, PXL_20260310_232308808).`)
  solids.push(...counters.map(([x0, y0, x1, y1]) => [x0, y0, FLOOR1, x1, y1, FLOOR1 + A.counterH]),
    [RANGE[0], RANGE[1], FLOOR1, RANGE[2], RANGE[3], FLOOR1 + A.counterH], [REF[0], REF[1], FLOOR1, REF[2], REF[3], FLOOR1 + A.refH])

  // ---------- 3. stair to the loft: up going north along the west wall, landing, turn right, up going east ----------
  const lo = v(M.stairs.main_to_loft.lower_run_rect) // [14, 184, 57, 229] (A-2 d1, scaled)
  const upr = v(M.stairs.main_to_loft.upper_run_rect) // [57, 229, 123, 275]
  const R = RISE / (NL + NU + 2) // 13 risers: 5 treads, landing, 6 treads, loft floor
  const LX0 = lo[0], LX1 = lo[2], UX0 = upr[0], UX1 = upr[2]
  const Y0 = LOFT_Y0, Y1 = upr[1]
  const dl = TREAD, du = (UX1 - UX0) / NU
  const landingZ = FLOOR1 + (NL + 1) * R
  const treads = [], stairSolids = []
  for (let k = 1; k <= NL; k++) {
    const y0 = Y0 + (k - 1) * dl, z = FLOOR1 + k * R
    treads.push([LX0, y0 - 1, z - A.tread, LX1, y0 + dl, z])
    stairSolids.push([LX0, y0, z - R, LX1, y0 + dl, z])
  }
  for (let j = 1; j <= NU; j++) {
    const x0 = UX0 + (j - 1) * du, z = landingZ + j * R
    treads.push([x0 - 1, upr[1], z - A.tread, x0 + du, upr[3], z])
    stairSolids.push([x0, upr[1], z - R, x0 + du, upr[3], z])
  }
  treads.push([LX0, Y1, landingZ - 9, LX1, upr[3], landingZ]) // landing
  stairSolids.push([LX0, Y1, landingZ - 9, LX1, upr[3], landingZ])
  add(treads.map(boxGeo), mats.lumber,
    `Stair main floor to loft: ${NL} steps, then the landing (Ryan, 2026-11-06, stated; photo PXL_20221020_201833908), then ${NU} steps to the loft (A-2 d1, drawn). ` +
    `${NL + NU + 2} risers of ${R.toFixed(1)}" for the ${RISE}" rise (rise stated; riser height worked out, not measured). Treads ${dl}" deep (A-2 d1 tread spacing, scaled). ` +
    `The first step is at y ${Y0}, north of the window beside the stove (inferred from the 11" treads; photo PXL_20260310_232337640 shows the steps start past the window). "Up, landing, turn right, up" (Ryan, 2026-11-05). Tread thickness 1 1/2" assumed; photos show log stringers and half-log treads.`)
  solids.push(...stairSolids)

  // Log stringers under the nosing lines, log rail on the open sides (lower run east edge, upper run south edge)
  const nl = (y) => FLOOR1 + R + ((y - Y0) * R) / dl // lower run nosing line
  const nu = (x) => landingZ + R + ((x - UX0) * R) / du // upper run nosing line
  const logs = []
  for (const x of [LX0 + 2.5, LX1 - 2.5]) logs.push(cylBetween([x, Y0, nl(Y0) - 7], [x, Y1, nl(Y1) - 7], A.stringer))
  for (const y of [upr[1] + 2.5, upr[3] - 2.5]) logs.push(cylBetween([UX0, y, nu(UX0) - 7], [UX1, y, nu(UX1) - 7], A.stringer))
  add(logs, log, 'Log stringers of the loft stair (photo PXL_20260310_232337640, seen: log stringers); diameter 8" assumed, position under the nosing line assumed.')

  const RX = LX1 - 1.5, RY = upr[1] - 2 // rail lines
  const rails = []
  const post = (x, y, z0, z1) => rails.push(cylBetween([x, y, z0], [x, y, z1], A.post))
  const run = (a, b, along) => { // sloped handrail with balusters from a to b ([x, y, nosing z] ends)
    const [a0, b0] = [a[along], b[along]]
    rails.push(cylBetween([a[0], a[1], a[2] + A.rail], [b[0], b[1], b[2] + A.rail], A.handrail / 2 + 0.5))
    rails.push(cylBetween([a[0], a[1], a[2] + 4], [b[0], b[1], b[2] + 4], 1))
    for (let s = a0 + A.spacing; s < b0 - 2; s += A.spacing) {
      const t = (s - a0) / (b0 - a0), p = a.map((q, i) => q + (b[i] - q) * t)
      rails.push(cylBetween([p[0], p[1], p[2] + 4], [p[0], p[1], p[2] + A.rail], A.baluster / 2 + 0.2, 6))
    }
    for (const e of [a, b]) post(e[0], e[1], e[2] - 6, e[2] + A.rail)
  }
  run([RX, Y0 + 2, nl(Y0 + 2)], [RX, Y1, nl(Y1)], 1)
  run([UX0, RY, nu(UX0)], [UX1, RY, nu(UX1)], 0)
  add(rails, log,
    'Log railing on the open sides of the loft stair: east edge of the lower run and south edge of the upper run (A-2 drawing 2 "LOG RAILING SYSTEM", stated; photo PXL_20260310_232337640, seen: log handrail and log balusters). ' +
    'It meets the loft railing at x 123. Rail height 36" and log sizes assumed.')
  // The lower run rail blocks from the floor up (the treads cover the basement stair under it)
  solids.push([RX - 1.5, Y0, FLOOR1, RX + 1.5, Y1, FLOOR1 + A.rail])
  for (let k = 1; k <= NL; k++) { const y0 = Y0 + (k - 1) * dl; solids.push([RX - 1.5, y0, FLOOR1 + k * R, RX + 1.5, y0 + dl, FLOOR1 + k * R + A.rail]) }
  for (let j = 1; j <= NU; j++) { const x0 = UX0 + (j - 1) * du; solids.push([x0, RY - 1.5, landingZ + j * R, x0 + du, RY + 1.5, landingZ + j * R + A.rail]) }

  // ---------- 4. wood stove on its base, pipe up to the chimney (roof.js) ----------
  const base = v(M.rooms.main.stove_base.rect) // [13, 78, 61, 126]
  const S = A.stove
  // The stove faces east, its back to the west wall, pipe out of the top at the back (Ryan, 2026-11-06). Same x, y as roof.js CHIM_X, CHIM_Y.
  const cx = base[0] + 12, cy = (base[1] + base[3]) / 2
  const sx0 = base[0] + 6, sx1 = sx0 + S.d, sy0 = cy - S.w / 2, sy1 = cy + S.w / 2 // 6" behind the stove to the wall (assumed)
  const bodyTop = FLOOR1 + S.pad + S.legs + S.h
  add([boxGeo([base[0], base[1], FLOOR1, base[2], base[3], FLOOR1 + S.pad])], mats.black,
    `Hearth pad under the wood stove, rect x ${base[0]} to ${base[2]}, y ${base[1]} to ${base[3]} (A-2 d1 "stone base", scaled). ` +
    `The photo PXL_20260310_232337640 shows a black pad (seen), so it is drawn black. Height ${S.pad}" assumed.`)
  const zc = (FLOOR1 + S.pad + S.legs)
  add([boxGeo([sx0, sy0, zc, sx1, sy1, bodyTop]),
    ...[[sx0 + 1, sy0 + 1], [sx1 - 3, sy0 + 1], [sx0 + 1, sy1 - 3], [sx1 - 3, sy1 - 3]].map(([x, y]) => boxGeo([x, y, FLOOR1 + S.pad, x + 2, y + 2, zc])),
  ], std(0x141416, 0.85),
    `Wood stove: black steel box ${S.w}" x ${S.d}" x ${S.h}" on 6" legs (A-2 d1: firebox 20" x 30", "refer to vendor specs"; photo PXL_20260310_232337640, seen: black stove). Body size assumed. ` +
    `Faces east, back to the west wall, centred between the two west windows (Ryan, 2026-11-06). Pipe out of the top at the back, at x ${cx}, y ${cy}.`)
  add([boxGeo([sx1, sy0 + 3, zc + 6, sx1 + 0.75, sy1 - 3, bodyTop - 5])], std(0x3a2416, 0.3),
    'Wood stove glass door on the east side, the side that faces the room (Ryan, 2026-11-06). Door size assumed.')
  const ceilingZ = roofUnder(cx + 5)
  add([cylBetween([cx, cy, bodyTop], [cx, cy, ceilingZ], S.pipeR, 16)], mats.black,
    `Black stove pipe, ${2 * S.pipeR}" across (assumed), straight up from the stove to the roof underside, where the chimney of roof.js starts (photo PXL_20260310_232337640, seen: black pipe straight up).`)
  solids.push([base[0], base[1], FLOOR1, base[2], base[3], FLOOR1 + S.pad], [sx0, sy0, FLOOR1, sx1, sy1, bodyTop])

  // Floor-level log railing on the south side of the basement stair opening (y 229), under the upper run, from the landing corner post to x 168
  const GX1 = 168
  rails.length = 0
  run([RX, Y1, FLOOR1], [GX1, Y1, FLOOR1], 0)
  post(RX, Y1, FLOOR1 + A.rail, nl(Y1) - 6) // the landing corner post runs from the floor up to the stair rail
  add(rails, log,
    'Log railing at floor level on the south side of the basement stair opening, under the upper run of the loft stair, from the landing corner post to x 168. It keeps people from falling down the basement stair ' +
    '(Ryan, 2026-11-06, with photo PXL_20221020_201833908, seen: log posts, top rail, log balusters; Ryan, 2026-11-05: open, no door). Line y 229 = the stair enclosure line on A-2 d1 (19\'-1" to the south foundation line, stated). Rail height 36", log sizes and spacing assumed.')
  solids.push([RX - 1.5, Y1 - 1.5, FLOOR1, GX1 + 1.5, Y1 + 1.5, FLOOR1 + A.rail])

  return { group, solids }
}
