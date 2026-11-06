// Version layer: the proposed basement layout (Ryan's plan, refitted to the real basement).
// Facts use inches, x = east from the west outside face, y = north from the lake wall outside face, z = up from the slab.
// Finishes (carpet, epoxy, tongue-and-groove, drop ceiling) are NOT here; the finish layer uses ROOMS and WALLS.
// Layout notes and sizes: work/findings/proposed-layout.md
import * as THREE from 'three'
import { M, v, bx, boxGeo, cylGeo, beamGeo, mesh, std, mats } from '../geo.js'
const TG = 0.75 // finish board thickness (as basement-finish.js)
import { H, WEST, EAST, NORTH, SOUTH } from '../basement.js'

const T = v(M.rooms.basement.centerline_partition_thickness) // 4.5: new stud wall thickness (A-1 partition 4 1/2", stated)
const DOOR_H = 80 // new door height (assumed, normal 6'-8")
const LEAF = 1.75 // door leaf thickness (assumed)
const FIT = 'proposed fit by the model, not decided by Ryan'

// ---------- the layout (every number is a chosen value; see the findings file) ----------
const HALL = [172, 220] // hall: 48" clear (proposed plan note 3), east of the utility room
const UTIL_E = 169.7 // face of the existing utility east wall studs
const BATH_E = [167.5, 172] // bath east wall (the centerline partition)
const TOILET = { x1: 103.5, wall: [103.5, 108], nY: [461.8, 466.3] } // toilet room (A-1: 42" deep, zone 96" wide)
const SHOWER = [WEST, 487.25, 58.75, NORTH] // 48" x 54" stall (A-1 stub: 48" wide, drain at x 38, y 508)
const BED = { x0: HALL[1] + T, y0: 215.5 + T, y1: 395 } // bedroom inside: x 224.5 to EAST, y 220 to 395
const SAUNA = { x0: 212.75, x1: 272.75, y0: 445.25 } // inside 60" x 96"
const REC = { x0: 277.25, y0: 469.25 } // recovery inside 48" x 72"

// Wall pieces. axis 'x': wall runs east-west, s = x, d = y. axis 'y': wall runs north-south, s = y, d = x (bx in geo.js).
function wall(axis, d0, d1, s0, s1, ops = []) {
  const out = []
  let s = s0
  for (const [a, b, hh] of [...ops].sort((p, q) => p[0] - q[0])) {
    if (a > s) out.push(bx(axis, s, a, d0, d1, 0, H))
    out.push(bx(axis, a, b, d0, d1, hh ?? DOOR_H, H)) // header over the doorway; the doorway stays open
    s = b
  }
  if (s1 > s) out.push(bx(axis, s, s1, d0, d1, 0, H))
  return out
}

const DOORS = {
  bath: { ax: 'y', op: [423.6, 455.6] }, // existing opening B-bath-entry, 32" (A-1)
  toilet: { ax: 'x', op: [68.4, 100.5] }, // existing opening B-bath-inner, 32" (A-1)
  bedroom: { ax: 'y', op: [345, 375] }, // 30" (proposed plan note 2, stated; position is a model fit)
  sauna: { ax: 'y', op: [452, 482] }, // door added by the model, not drawn; 30" assumed
  recovery: { ax: 'x', op: [283, 313] }, // door added by the model, not drawn; 30" assumed
  closet: { ax: 'x', op: [229, 321] },
}

export const WALLS = [
  // flat face for the hall past the centre post (the post sticks out 2 1/4" past the utility wall studs)
  ...wall('y', UTIL_E, HALL[0], 275.6, 419.3, [[329.5, 365.5, 82]]), // 82" header, same as the existing utility doorway in basement.js
  // bath east wall, from the utility north wall to the north wall, with the bath entry door
  ...wall('y', BATH_E[0], BATH_E[1], 419.3, NORTH, [DOORS.bath.op]),
  // toilet room: north wall (with its door) and east wall
  ...wall('x', TOILET.nY[0], TOILET.nY[1], WEST, TOILET.wall[1], [DOORS.toilet.op]),
  ...wall('y', TOILET.wall[0], TOILET.wall[1], 419.3, TOILET.nY[0]),
  // bedroom: west wall (hall side, with door), south wall, north wall
  ...wall('y', HALL[1], BED.x0, 215.5, 399.5, [DOORS.bedroom.op]),
  ...wall('x', 215.5, BED.y0, BED.x0, EAST),
  ...wall('x', BED.y1, BED.y1 + T, BED.x0, EAST),
  // sauna: west wall (with door), south wall, wall shared with the recovery room
  ...wall('y', SAUNA.x0 - T, SAUNA.x0, 440.75, NORTH, [DOORS.sauna.op]),
  ...wall('x', 440.75, SAUNA.y0, SAUNA.x0 - T, REC.x0),
  ...wall('y', SAUNA.x1, REC.x0, 440.75, NORTH),
  // recovery room south wall (with door)
  ...wall('x', REC.y0 - T, REC.y0, REC.x0, EAST, [DOORS.recovery.op]),
]

// Rooms and open areas (inside faces). Several rects with one name = one L-shaped or split area.
export const ROOMS = [
  { name: 'Shower', rect: [SHOWER[0], SHOWER[1], SHOWER[2], SHOWER[3]], floor: 'epoxy' },
  { name: 'Toilet room', rect: [WEST, 419.3, TOILET.x1, TOILET.nY[0]], floor: 'epoxy' },
  { name: 'Bathroom', rect: [58.75, 466.3, BATH_E[0], NORTH], floor: 'epoxy' },
  { name: 'Bathroom', rect: [WEST, 466.3, 58.75, SHOWER[1]], floor: 'epoxy' },
  { name: 'Bathroom', rect: [TOILET.wall[1], 419.3, BATH_E[0], 466.3], floor: 'epoxy' },
  { name: 'Utility room', rect: [WEST, 279.1, 166.2, 415.8], floor: 'epoxy' },
  { name: 'Hall', rect: [HALL[0], 215.5, HALL[1], 399.5], floor: 'epoxy' },
  { name: 'Spa entry', rect: [HALL[0], 399.5, SAUNA.x0 - T, NORTH], floor: 'epoxy' },
  { name: 'Spa entry', rect: [SAUNA.x0 - T, 399.5, EAST, 440.75], floor: 'epoxy' },
  { name: 'Spa entry', rect: [REC.x0, 440.75, EAST, REC.y0 - T], floor: 'epoxy' },
  { name: 'Sauna', rect: [SAUNA.x0, SAUNA.y0, SAUNA.x1, NORTH], floor: 'epoxy' },
  { name: 'Recovery room', rect: [REC.x0, REC.y0, EAST, NORTH], floor: 'epoxy' },
  { name: 'Bedroom 1', rect: [BED.x0, BED.y0, EAST, BED.y1], floor: 'carpet' },
  { name: 'Entertainment area', rect: [WEST, SOUTH, EAST, 88], floor: 'epoxy' },
  { name: 'Entertainment area', rect: [58.75, 88, EAST, 215.5], floor: 'epoxy' },
  { name: 'Entertainment area', rect: [123, 215.5, HALL[0], 275.6], floor: 'epoxy' },
  { name: 'Stair area', rect: [WEST, 88, 58.75, 275.6], floor: 'epoxy' },
  { name: 'Stair area', rect: [58.75, 215.5, 123, 275.6], floor: 'epoxy' },
]

// Door leaf standing open 90 degrees. hinge = position along the wall of the jamb, side = +1/-1 toward the opening along the wall,
// face = d coordinate of the wall face the leaf starts at, dir = +1/-1 direction it swings, w = leaf width.
function leaf(axis, hinge, side, face, dir, w) {
  const [s0, s1] = [hinge, hinge + side * LEAF].sort((a, b) => a - b)
  const [d0, d1] = [face, face + dir * w].sort((a, b) => a - b)
  return bx(axis, s0, s1, d0, d1, 0, DOOR_H)
}

export function buildProposedBasement() {
  const group = new THREE.Group()
  const solids = []
  const add = (...m) => m.forEach((x) => group.add(x))
  const solid = (b) => solids.push(b)
  WALLS.forEach(solid)

  const paint = std(0xf0ece4, 0.9)
  const wood = std(0xb08a5c, 0.6)
  const cedar = std(0xc99a5c, 0.7)
  const white = std(0xf6f6f4, 0.3)
  const fabric = std(0xb9c2cc, 0.95)
  const linen = std(0xefeae0, 0.95)
  const marble = std(0xe3e1dc, 0.35)
  const glass = mats.glass

  add(mesh(WALLS.map(boxGeo), paint,
    `New stud walls, 4 1/2" thick, plain painted face, slab to the floor framing (thickness: A-1 partition; positions: ${FIT}; doorways with headers at ${DOOR_H}", door height assumed; the utility doorway header is 82", as the existing doorway). The bath east wall is at x ${BATH_E[0]} to ${BATH_E[1]}, about 1.8" east of the A-1 partition (x 165.7 to 170.2), so its east face lines up with the hall face at x 172. Walls: bath, toilet room, bedroom, sauna, recovery room, hall face.`))

  // Doors standing open
  const D = DOORS
  const lf = [
    leaf('y', D.bath.op[0], +1, BATH_E[0], -1, 31), // swings west into the bath
    leaf('x', D.toilet.op[1], -1, TOILET.nY[0], -1, 31), // swings south into the toilet room
    leaf('y', D.bedroom.op[0], +1, BED.x0, +1, 29), // swings east into the bedroom
    leaf('y', D.sauna.op[1], -1, SAUNA.x0, +1, 29), // swings east into the sauna
    leaf('x', D.recovery.op[1], -1, REC.y0, +1, 29), // swings north into the recovery room
  ]
  add(mesh(lf.map(boxGeo), wood,
    `Interior door leaves standing open: bath entry 32" and toilet room 32" (A-1, stated); bedroom door 30" (proposed plan note 2, stated; position and swing ${FIT}). Sauna and recovery doors: added by the model, not drawn in the proposed plan, 30" assumed; position and swing ${FIT}. Leaf widths (31" and 29", a little narrower than the openings), thickness and height assumed.`))

  // ---- Bathroom: fixtures on the existing stubs ----
  const sd = M.plumbing.shower_drain, td = M.plumbing.toilet_drawn
  const tx = v(td.x), ty = v(td.y)
  add(mesh([
    boxGeo([WEST + TG, ty - 8.5, 14, WEST + TG + 9, ty + 8.5, 31]), // tank against the west wall
    cylGeo(tx - 2, ty, 7, 0, 14), // bowl
    boxGeo([WEST + TG + 4, ty - 7.5, 14, tx + 5, ty + 7.5, 16]), // seat
  ], white,
    `Toilet on the existing toilet drain stub at x ${tx}", y ${ty}" (A-1 drawing, scaled; Ryan, 2026-11-05: use the drawn drain positions). Fixture size typical, assumed.`))
  solid([WEST, ty - 9, 0, tx + 5, ty + 9, 31])

  const [sx0, sy0, sx1, sy1] = SHOWER
  add(mesh([boxGeo([sx0, sy0, 0, sx1, sy1, 2.5])], marble,
    `Shower pan, 48" x 54" around the existing shower drain at x ${v(sd.x)}", y ${v(sd.y)}" (A-1, stated). Depth ${sy1 - sy0}" is ${FIT}. Pan thickness 2.5" assumed.`))
  add(mesh([
    cylGeo(38, sy1 - 1.5, 0.6, 40, 84), boxGeo([34, sy1 - 7, 82, 42, sy1 - 1.5, 84]),
  ], mats.metal, 'Shower valve pipe and head (typical, assumed).'))
  add(mesh([
    boxGeo([sx0, sy0 - 1.5, 0, sx1, sy0, 72]), // south glass
    boxGeo([sx1, sy0 + 24, 0, sx1 + 1.5, sy1, 72]), // east glass, 24" door gap at its south end
    boxGeo([sx1 + 1.5, sy0 + 22.25, 0, sx1 + 25.5, sy0 + 24, 72]), // glass door standing open
  ], glass, `Glass shower enclosure with a 24" door standing open (proposed plan shows a glass door; sizes ${FIT}; glass height 72" and the 24" door gap assumed).`, { shadow: false }))
  solid([sx0, sy0 - 1.5, 0, sx1, sy0, 72])
  solid([sx1, sy0 + 24, 0, sx1 + 1.5, sy1, 72])
  solid([sx1 + 1.5, sy0 + 22.25, 0, sx1 + 25.5, sy0 + 24, 72]) // open glass door

  const vx0 = 95.5, vx1 = BATH_E[0] - TG, vy0 = NORTH - TG - 22
  add(mesh([
    boxGeo([vx0, vy0, 0, vx1, (NORTH - TG), 34]),
    boxGeo([vx0 - 0.5, vy0 - 0.5, 34, vx1, (NORTH - TG), 35.5]),
  ], wood, `72" x 22" double vanity on the north wall (A-1 "22 X 72 VANITY", stated; counter height 34" and top 36" assumed); placed against the east wall of the bath (${FIT}).`))
  add(mesh([vx0 + 18, vx0 + 54].flatMap((x) => [boxGeo([x - 8, vy0 + 3, 35.5, x + 8, (NORTH - TG) - 3, 36]), boxGeo([x - 0.75, (NORTH - TG) - 6, 36, x + 0.75, (NORTH - TG) - 2, 46])]),
    marble, 'Two sinks and faucets in the vanity (proposed plan shows two sinks; sizes assumed).'))
  solid([vx0, vy0, 0, vx1, (NORTH - TG), 36])

  // ---- Sauna: benches and an electric heater ----
  const { x0: ax0, x1: ax1, y0: ay0 } = SAUNA
  add(mesh([
    boxGeo([ax1 - 20, ay0 + 0.5, 38, ax1, NORTH, 40]), boxGeo([ax1 - 20, ay0 + 0.5, 10, ax1 - 18.5, NORTH, 38]), // upper bench along the east wall
    boxGeo([ax1 - 40, 495, 16, ax1 - 20, NORTH, 18]), boxGeo([ax1 - 40, 495, 6, ax1 - 38.5, NORTH, 16]), // lower bench in front, north half
  ], cedar, `Sauna benches: upper bench 20" deep at 40", lower bench at 18" (typical, assumed). Sauna 5'-0" x 8'-0" inside; the proposed plan has 6'-0" x 8'-0": ${FIT}.`))
  solid([ax1 - 20, ay0, 0, ax1, NORTH, 40])
  solid([ax1 - 40, 495, 0, ax1 - 20, NORTH, 18])
  add(mesh([
    boxGeo([ax0 + TG, 508, 4, ax0 + TG + 9, 526, 28]), // heater body
    boxGeo([ax0 + TG + 1, 509, 28, ax0 + TG + 8, 525, 31]), // stones
    boxGeo([ax0 + TG + 11, 506, 0, ax0 + TG + 12.5, 507.5, 28]), boxGeo([ax0 + TG + 11, 526.5, 0, ax0 + TG + 12.5, 528, 28]), // rail posts
    boxGeo([ax0 + TG + 11, 506, 12, ax0 + TG + 12.5, 528, 14]), boxGeo([ax0 + TG + 11, 506, 24, ax0 + TG + 12.5, 528, 26]), // rail slats
  ], mats.black, 'Electric sauna heater with stones and wood guard rail, on the west wall (Ryan: electric heater, needs a 240 volt circuit; size typical, assumed). Position ' + FIT + '.'))
  solid([ax0 + TG, 506, 0, ax0 + TG + 12.5, 528, 31])

  // ---- Bedroom: one queen bed and a closet ----
  const BY = BED.y1 - TG // boards 3/4" on the north wall
  const bedx = 255
  add(mesh([
    boxGeo([bedx, BY - 80, 6, bedx + 60, BY - 0.5, 16]), // frame
    boxGeo([bedx, BY - 2.5, 6, bedx + 60, BY, 40]), // headboard against the north wall
  ], wood, `Queen bed, 60" x 80" (standard size, assumed), head on the north wall. The proposed plan has two queens; the bedroom is only ${EAST - BED.x0}" wide inside, so one bed: ${FIT}.`))
  add(mesh([
    boxGeo([bedx + 0.5, BY - 79.5, 16, bedx + 59.5, BY - 2.5, 26]),
  ], linen, 'Mattress and bedding (assumed).'))
  add(mesh([boxGeo([bedx + 4, BY - 16, 26, bedx + 28, BY - 4, 30]), boxGeo([bedx + 32, BY - 16, 26, bedx + 56, BY - 4, 30])], fabric, 'Pillows (assumed).'))
  solid([bedx, BY - 80, 0, bedx + 60, BY, 40])
  add(mesh([boxGeo([233, BY - 18, 0, 249, BY, 24])], wood, 'Nightstand 16" x 18" (assumed).'))
  solid([233, BY - 18, 0, 249, BY, 24])

  // Closet along the south end of the bedroom, 24" deep, front wall with bifold doors standing open
  const cy1 = BED.y0 + 24, cf = cy1 + T // closet inside y 220 to 244, front wall to 248.5
  const cl = D.closet.op
  const front = wall('x', cy1, cf, BED.x0, EAST, [cl])
  add(mesh(front.map(boxGeo), paint, `Closet front wall, 24" deep closet across the south end of Bedroom 1 (proposed plan: 2'-0" x 6'-0" on the east wall; moved and widened to ${EAST - BED.x0}" because of the narrow bedroom): ${FIT}.`))
  front.forEach(solid)
  const panel = (a, b) => beamGeo([a[0], a[1], DOOR_H / 2], [b[0], b[1], DOOR_H / 2], 1, DOOR_H)
  const fy = cf // wall face the doors fold out from
  add(mesh([
    panel([cl[0], fy], [cl[0] + 11.5, fy + 19.9]), panel([cl[0] + 11.5, fy + 19.9], [cl[0] + 23, fy]),
    panel([cl[1], fy], [cl[1] - 11.5, fy + 19.9]), panel([cl[1] - 11.5, fy + 19.9], [cl[1] - 23, fy]),
    boxGeo([BED.x0 + 1, BED.y0 + 1, 79, EAST - 1, cy1 - 0.5, 80.5]), boxGeo([BED.x0 + 1, BED.y0 + 11, 65.5, EAST - 1, BED.y0 + 12.5, 67]),
  ], wood, `Bifold closet doors standing open (proposed plan: bifold doors, zigzag symbol, stated); closet shelf and rod (assumed). ${FIT}.`))

  // Room labels on the floor are left to the finish layer.
  return { group, solids }
}
