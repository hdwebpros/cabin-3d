// Builds the basement as it is now from facts/measurements.json.
// Facts use inches, x = east, y = north, z = up from the top of the basement slab.
// three.js uses metres and y = up, so north is -z on screen. P() and boxGeo() do the conversion.
import * as THREE from 'three'
import { M, v, FLOOR1, boxGeo, cylGeo, beamGeo, sheetGeo, mesh, pbr, std, mats } from './geo.js'
import { LOFT_Y0 } from './shell/interior.js'

// Sizes the facts do not have (nobody has measured them). They only change how the model looks.
// Replace them when Ryan measures. Each label in the model says when a size is one of these.
const ASSUMED = {
  foam: 2, // pink foam board thickness
  furring: [0.75, 3.5], // furring strip depth and width (1x4)
  furringSpacing: 24,
  southStud: 5.5, // lake wall studs: 2x6, because R19 batts are made for 2x6 walls
  studSpacing: 16,
  trussSpacing: 24,
  doorHead: 82, // utility doorway height
  maxRiser: 7.75, // code maximum step height; used to work out how many steps a 12 ft basement needs
  post: 8, // posts are drawn 8x8 on A-1, size "as required"
}

const W = v(M.footprint.width_x) // 336
const L = v(M.footprint.length_y) // 552
const T = v(M.walls.foundation_thickness) // 8
export const H = v(M.levels_z.basement_underside_of_floor_system) // 144 (12 ft walls, Ryan)
const TRUSS = v(M.structure.floor_trusses.depth_ryan) // 12
const SLAB = v(M.walls.slab_thickness)
const A = ASSUMED
// Finished faces of the basement: the version layers (src/variants) import these, so they follow the foam and furring sizes
export const WEST = T + A.foam + A.furring[0] // finished face of the west furring
export const EAST = W - WEST
export const NORTH = L - WEST
export const SOUTH = A.southStud

// A wall line: axis 'x' runs east-west at y = at; axis 'y' runs north-south at x = at.
// dir (+1 or -1) is the direction of the wall depth. s is the position along the wall.
function wallBox(w, s0, s1, d0, d1, z0, z1) {
  const a = w.at + w.dir * d0, b = w.at + w.dir * d1
  const [p0, p1] = [Math.min(a, b), Math.max(a, b)]
  return w.axis === 'x' ? [s0, p0, z0, s1, p1, z1] : [p0, s0, z0, p1, s1, z1]
}

// Wood stud wall with plates, and framed openings [{ s0, s1, sill, head }] (sill 0 = doorway)
function studWall(w, s0, s1, depth, openings = [], spacing = A.studSpacing) {
  const b = []
  const stud = (s, z0, z1) => z1 > z0 && b.push(wallBox(w, s, s + 1.5, 0, depth, z0, z1))
  let s = s0
  for (const o of openings.filter((o) => o.sill === 0).sort((p, q) => p.s0 - q.s0)) {
    if (o.s0 - 1.5 > s) b.push(wallBox(w, s, o.s0 - 1.5, 0, depth, 0, 1.5))
    s = o.s1 + 1.5
  }
  if (s < s1) b.push(wallBox(w, s, s1, 0, depth, 0, 1.5)) // bottom plate (cut at doorways)
  b.push(wallBox(w, s0, s1, 0, depth, H - 3, H)) // double top plate
  for (let x = s0; x <= s1 - 1.5; x += spacing) {
    const o = openings.find((o) => x + 1.5 > o.s0 - 3 && x < o.s1 + 3)
    if (!o) stud(x, 1.5, H - 3)
    else if (x >= o.s0 && x + 1.5 <= o.s1) {
      stud(x, o.head + 9.25, H - 3) // cripple above the header
      if (o.sill > 0) stud(x, 1.5, o.sill - 1.5) // cripple below the sill
    }
  }
  stud(s1 - 1.5, 1.5, H - 3)
  for (const o of openings) {
    stud(o.s0 - 3, 1.5, H - 3) // king studs
    stud(o.s1 + 1.5, 1.5, H - 3)
    stud(o.s0 - 1.5, 1.5, o.head) // jack studs
    stud(o.s1, 1.5, o.head)
    b.push(wallBox(w, o.s0 - 1.5, o.s1 + 1.5, 0, depth, o.head, Math.min(o.head + 9.25, H - 3))) // header
    if (o.sill > 0) b.push(wallBox(w, o.s0, o.s1, 0, depth, o.sill - 1.5, o.sill)) // rough sill
  }
  return b
}

// ---------- stairs (pure numbers, checked by scripts/check.mjs) ----------

// The plans draw 15 risers for a 120" rise. With 12 ft walls the rise is larger, so the stair
// needs more steps. The upper run (main floor down to the landing) keeps its drawn 6 treads;
// the extra steps go on the lower run, so its bottom step moves south toward the lake.
export function stairPlan(rise = FLOOR1) {
  const s = M.stairs.basement
  const landing = v(s.landing_rect), upper = v(s.upper_run_rect), lower = v(s.lower_run_rect)
  const risers = Math.ceil(rise / A.maxRiser)
  const riser = rise / risers
  const upperTreads = 6 // A-1 d2 run B, 6 drawn treads
  const lowerTreads = risers - (upperTreads + 1) - 1
  const tread = v(s.tread_depth)
  const landingZ = rise - (upperTreads + 1) * riser
  const bottomY = landing[1] - lowerTreads * tread
  return { rise, risers, riser, tread, upperTreads, lowerTreads, landingZ, bottomY, landing, upper, lower }
}

// ---------- materials ----------

function materials() {
  return {
    ...mats,
    slab: pbr('concrete_floor_02', 2),
    concrete: std(0x9c9a95, 0.95),
    osb: pbr('plywood', 0.35, { color: 0xc99d5e }),
    foam: std(0xf2a3b6, 0.9),
    kraft: std(0x9c6f3c, 0.95),
    batts: std(0xe6cf86, 1, { side: THREE.DoubleSide }),
    pvc: std(0xf2f2ee, 0.4),
    tankGray: std(0x8c9297, 0.5),
    appliance: std(0xf0f0ee, 0.35),
    pexRed: std(0xb8322a, 0.5),
    siding: std(0x3c3e41, 0.8),
  }
}

// ---------- the basement ----------

export function buildBasement() {
  const m = materials()
  const group = new THREE.Group()
  const ceiling = new THREE.Group() // floor trusses and the floor above; hidden in the overview
  group.add(ceiling)
  const solids = [] // boxes the walker cannot pass through or can stand on
  const add = (parent, ...meshes) => meshes.forEach((x) => parent.add(x))

  // Slab and foundation walls
  add(group, mesh(boxGeo([0, 0, -SLAB, W, L, 0]), m.slab,
    'Basement slab: bare concrete, 6" thick (A-6, stated). In-floor heat tubes are in it (photos). Finish later: epoxy (Ryan).'))
  const fw = [[0, 0, 0, T, L, H], [W - T, 0, 0, W, L, H], [T, L - T, 0, W - T, L, H]]
  add(group, mesh(fw.map(boxGeo), m.concrete,
    'Foundation wall: 8" poured concrete (A-1 note, stated). 12 ft tall (Ryan, stated).'))
  solids.push([0, 0, 0, WEST, L, H], [EAST, 0, 0, W, L, H], [0, NORTH, 0, W, L, H], [0, 0, 0, W, SOUTH, H])

  // Pink foam and wood furring on the north, east and west concrete walls (Ryan; photos)
  const F = A.foam, [fd, fwid] = A.furring
  add(group, mesh([
    boxGeo([T, SOUTH, 0, T + F, L - T, H]),
    boxGeo([W - T - F, SOUTH, 0, W - T, L - T, H]),
    boxGeo([T + F, L - T - F, 0, W - T - F, L - T, H]),
  ], m.foam, `Pink Owens Corning Foamular 250 foam board on the concrete (photos; Ryan, stated). Thickness unknown, drawn ${F}".`))
  const furWalls = [
    { w: { axis: 'y', at: T + F, dir: 1 }, s0: SOUTH, s1: L - T - F },
    { w: { axis: 'y', at: W - T - F, dir: -1 }, s0: SOUTH, s1: L - T - F },
    { w: { axis: 'x', at: L - T - F, dir: -1 }, s0: T + F, s1: W - T - F },
  ]
  const fur = []
  for (const { w, s0, s1 } of furWalls) {
    for (let s = s0; s <= s1 - fwid; s += A.furringSpacing) fur.push(wallBox(w, s, s + fwid, 0, fd, 0, H))
    for (const z of [0, 48, 96, H - fwid]) fur.push(wallBox(w, s0, s1, 0, fd, z, z + fwid))
  }
  add(group, mesh(fur.map(boxGeo), m.lumber,
    `Wood furring over the foam (photos show it on the east and west walls; on the north wall it is inferred). Size and spacing unknown, drawn as 1x4 at ${A.furringSpacing}" apart.`))

  // Lake (south) wall: wood studs with R19 kraft-faced batts and three openings
  const south = M.openings.filter((o) => v(o.level) === 'basement' && o.wall === 'south')
  const sw = { axis: 'x', at: 0, dir: 1 }
  const swOpen = south.map((o) => ({ s0: v(o.offset), s1: v(o.offset) + v(o.width), sill: v(o.sill), head: v(o.sill) + v(o.height), o }))
  add(group, mesh(studWall(sw, T, W - T, SOUTH, swOpen).map(boxGeo), m.lumber,
    'Lake (south) wall: wood stud wall with R19 batts, not concrete (Ryan; photo PXL_20250905_215819202). Drawn as 2x6 at 16" (stud size unknown).'))
  const batts = [] // kraft face between the framing: full-height strips between openings, short ones above and below
  let bs = T
  for (const o of [...swOpen].sort((p, q) => p.s0 - q.s0)) {
    batts.push([bs, 1.5, o.s0 - 1.5, H - 3])
    batts.push([o.s0 - 1.5, Math.min(o.head + 9.25, H - 3), o.s1 + 1.5, H - 3])
    if (o.sill > 0) batts.push([o.s0 - 1.5, 1.5, o.s1 + 1.5, o.sill - 1.5])
    bs = o.s1 + 1.5
  }
  batts.push([bs, 1.5, W - T, H - 3])
  add(group, mesh(batts.map(([x0, z0, x1, z1]) => boxGeo([x0, SOUTH - 0.7, z0, x1, SOUTH - 0.6, z1])), m.kraft,
    'R19 kraft-faced fiberglass batts in the lake wall (photo PXL_20250905_215819202, "R19" printed).'))
  for (const o of swOpen) {
    const fr = [], fy0 = 0.5, fy1 = 3.75, k = 2 // vinyl frame: 2" wide, 3 1/4" deep
    fr.push([o.s0, fy0, o.sill, o.s1, fy1, o.sill + k], [o.s0, fy0, o.head - k, o.s1, fy1, o.head])
    fr.push([o.s0, fy0, o.sill, o.s0 + k, fy1, o.head], [o.s1 - k, fy0, o.sill, o.s1, fy1, o.head])
    const mid = (o.s0 + o.s1) / 2
    fr.push([mid - 1, fy0, o.sill, mid + 1, fy1, o.head]) // two panels side by side
    const isDoor = o.sill === 0
    const what = isDoor
      ? `${o.o.id}: patio slider to the lake walkout, ${v(o.o.width)}" wide x ${v(o.o.height)}" tall (A-1, A-5). Not in the Menards order, so the plan size is used.`
      : `${o.o.id}: Menards 2-panel sliding window, ${v(o.o.width)}" x ${v(o.o.height)}", sill ${v(o.o.sill)}" (size: window order, stated; sill: A-5, ${o.o.id === 'W-L2' ? 'stated' : 'inferred from W-L2'}). Position along the wall is assumed (centered on the plan opening).`
    add(group, mesh(fr.map(boxGeo), m.vinyl, what))
    add(group, mesh([
      boxGeo([o.s0 + k, 2, o.sill + k, mid - 1, 2.25, o.head - k]),
      boxGeo([mid + 1, 2, o.sill + k, o.s1 - k, 2.25, o.head - k]),
    ], m.glass, null, { shadow: false }))
  }

  // Outside of the lake wall: dark gray vertical board-and-batten over sheathing, from the slab up to the logs
  const sid = [], top = FLOOR1 - 1
  let sx = 0
  for (const o of [...swOpen].sort((p, q) => p.s0 - q.s0)) {
    sid.push([sx, 0, o.s0, top], [o.s0, o.head, o.s1, top])
    if (o.sill > 0) sid.push([o.s0, 0, o.s1, o.sill])
    sx = o.s1
  }
  sid.push([sx, 0, W, top])
  const siding = sid.map(([x0, z0, x1, z1]) => [x0, -1.25, z0, x1, 0, z1])
  for (let x = 6; x < W; x += 12) for (const [x0, z0, x1, z1] of sid) if (x >= x0 && x + 2.5 <= x1) siding.push([x, -2, z0, x + 2.5, -1.25, z1])
  add(group, mesh(siding.map(boxGeo), m.siding,
    'Lake wall outside: dark gray vertical board-and-batten siding (photos PXL_20260703_223907684, PXL_20261009_180831582, seen). Sheathing, board and batten sizes assumed.'))

  // Utility room: stud walls on the west wall, door in the middle of its east wall (Ryan)
  const ur = v(M.rooms.basement.utility_room.rect) // [8, 279.6, 165.7, 415.3]
  const pt = v(M.rooms.basement.centerline_partition_thickness) // 4.5
  const uS = { axis: 'x', at: ur[1] - pt + 0.5, dir: 1 } // studs y 275.6 to 279.1
  const uN = { axis: 'x', at: ur[3] + 0.5, dir: 1 } // studs y 415.8 to 419.3
  const uE = { axis: 'y', at: ur[2] + 0.5, dir: 1 } // studs x 166.2 to 169.7
  const ud = M.openings.find((o) => o.id === 'B-utility')
  const door = { s0: v(ud.offset), s1: v(ud.offset) + v(ud.width), sill: 0, head: A.doorHead }
  const uEnd = uE.at + 3.5
  add(group, mesh([
    ...studWall(uS, WEST, uEnd, 3.5),
    ...studWall(uN, WEST, uEnd, 3.5),
    ...studWall(uE, uS.at + 3.5, uN.at, 3.5, [door]),
  ].map(boxGeo), m.lumber,
  `Utility room walls: 2x4 studs (A-1 partition 4 1/2"). Room 157.7" (scaled; A-1's 13'-6 1/2" includes the partition) x 135.5" (A-1, stated) inside. Doorway ${v(ud.width)}" in the middle of the east wall (Ryan, stated); height assumed ${A.doorHead}".`))
  add(group, mesh([
    boxGeo([WEST, uS.at + 3.5, 0, uEnd - 3.5, uS.at + 3.94, 48]), // south wall, lower part, utility side
    boxGeo([WEST, uN.at - 0.44, 0, uEnd - 3.5, uN.at, H]), // north wall, full height, utility side
    boxGeo([WEST, ur[1], 0, WEST + 0.44, ur[3], 48]), // west wall, lower part over the furring
  ], m.osb, 'OSB sheathing in the utility room (photos PXL_20221016_151511095 and the 2025 video). Heights approximate.'))
  solids.push(
    [WEST, uS.at, 0, uEnd, uS.at + 4, H], [WEST, uN.at - 0.5, 0, uEnd, uN.at + 3.5, H],
    [uE.at, uS.at, 0, uEnd, door.s0, H], [uE.at, door.s1, 0, uEnd, uN.at + 3.5, H], [uE.at, door.s0, door.head, uEnd, door.s1, H],
  )

  // Utility room equipment. Positions are approximate (from photos and the 2025 video, looking west);
  // sizes are typical product sizes, not measured.
  const wx = WEST + 0.44 // face of the OSB on the west wall
  const approx = 'Position approximate (photos); size is a typical product size.'
  add(group,
    mesh(cylGeo(wx + 7, 310, 6.5, 0, 62), m.black, `Whole-house water filter (the big black tank, Ryan; there is no water softener). ${approx}`),
    mesh(cylGeo(wx + 12, 352, 11, 0, 60), m.tankGray, `Well pressure tank (photos). ${approx}`),
    mesh([boxGeo([wx, 381, 52, wx + 13.4, 398.3, 79.4]), boxGeo([wx, 384, 0, wx + 12, 396, 20])], m.appliance,
      `Navien combi boiler: heat for the in-floor tubes and instant hot water (Ryan; photos). Wall-hung on the west wall near the north corner. ${approx}`),
    mesh([cylGeo(wx + 7, 385, 1.75, 79.4, H), cylGeo(wx + 7, 394, 1.75, 79.4, H)], m.pvc, 'Boiler vent pipes, white PVC, up into the floor trusses (photos).'),
    mesh([cylGeo(wx + 3, 403, 2, 0, H), cylGeo(wx + 3, 403, 2.4, 30, 33)], m.pvc,
      `Large PVC pipe with a cleanout cap, down the wall beside the boiler to the floor: likely a drain or vent stack. It stays (photos-basement.md). ${approx}`),
    mesh([boxGeo([38, uN.at - 3, 52, 64, uN.at - 0.44, 62]), boxGeo([38, uN.at - 3, 14, 60, uN.at - 0.44, 24])], m.metal,
      'In-floor heat manifolds on the north wall: the upper one feeds the main floor, the lower one feeds about 7 loops in this slab (photos). Position approximate.'),
    mesh([boxGeo([40, uN.at - 2, 62, 62, uN.at - 0.44, H]), boxGeo([40, uN.at - 2, 0, 58, uN.at - 0.44, 14])], m.pexRed,
      'Red PEX heat tubes (photos).'),
    mesh(boxGeo([uE.at - 34, uN.at - 4.44, 48, uE.at - 19.75, uN.at - 0.44, 78]), m.metal,
      `Electrical panel. Position not sure: the photos put it "near the door", but they were read when the door was thought to be at the north end of this wall. ${approx}`),
    mesh(boxGeo([uE.at - 24, door.s0 - 27, 0, uE.at - 1, door.s0 - 3, 34]), m.appliance, `Laundry tub beside the door (2025 video). ${approx}`),
  )
  const fdr = M.plumbing.floor_drain
  add(group, mesh(cylGeo(v(fdr.x), v(fdr.y), 3, 0, 0.25), m.metal, 'Floor drain: 4\'-0" from the west outside face, 16\'-0" from the north outside face (A-1, stated).'))

  // Bathroom stub-in: only drains and water lines today (Ryan). Drain positions from the drawings; no source gives the water line positions, so they are not drawn.
  const sd = M.plumbing.shower_drain, td = M.plumbing.toilet_drawn
  const vanity = v(M.rooms.basement.bath_stub_in.vanity) // [22, 72]
  const vx1 = ur[2], vx0 = vx1 - vanity[1] // vanity against the north wall at the east end of the bath (A-1 layout, assumed)
  add(group,
    mesh([cylGeo(v(sd.x), v(sd.y), 1.25, 0, 1.5)], m.pvc, 'Shower drain stub-in: 2\'-6" from the west wall, 3\'-0" from the north wall (A-1, stated). The bath has drains and water lines only (Ryan); the water lines are not drawn because no source gives their positions.'),
    mesh([cylGeo(v(td.x), v(td.y), 3.5, 0, 0.6), cylGeo(v(td.x), v(td.y), 2, 0, 2)], m.pvc, 'Toilet drain stub-in, at the drawn toilet position (A-1, scaled).'),
    mesh([vx0 + vanity[1] / 4, vx0 + (3 * vanity[1]) / 4].map((x) => cylGeo(x, NORTH - 4, 1, 0, 18)), m.pvc,
      'Vanity drain stub-ins for the 22" x 72" double vanity on the north wall (A-1). Exact positions not drawn; assumed.'),
  )

  // Posts and the beam at the stair (A-1). Sizes "as required"; drawn 8x8.
  const posts = M.structure.basement_posts
  const ph = A.post / 2
  const beam = M.structure.basement_beams[0]
  const bx = beam.from[0]
  const postTop = (p) => (v(p.x) === bx ? H - 11.25 : H) // the two stair posts stop under the beam
  add(group, mesh(posts.map((p) => boxGeo([v(p.x) - ph, v(p.y) - ph, 0, v(p.x) + ph, v(p.y) + ph, postTop(p)])), m.lumber,
    'Posts (A-1): center post 14\'-0" from the west wall and 22\'-6" south of the north wall (stated); two stair posts (y stated, x inferred). They carry the floor above and cannot move. Size "as required", drawn 8x8.'))
  for (const p of posts) solids.push([v(p.x) - ph, v(p.y) - ph, 0, v(p.x) + ph, v(p.y) + ph, H])
  add(group, mesh(boxGeo([bx - 1.75, beam.to[1] - ph, H - 11.25, bx + 1.75, beam.from[1] + ph, H]), m.lumber,
    'Floor truss support beam at the stair, 5\'-7" span between the stair posts (A-1, stated). Size not given; drawn 3 1/2" x 11 1/4".'))

  // Stairs
  const st = stairPlan()
  const sb = []
  const [lx0, , lx1] = st.lower
  for (let k = 1; k <= st.lowerTreads; k++) {
    const y1 = st.landing[1] - (k - 1) * st.tread, y0 = y1 - st.tread
    const z = st.landingZ - k * st.riser
    sb.push([lx0, y0 - 1, z - 1.5, lx1, y1, z]) // tread with 1" nosing
    sb.push([lx0, y1, z, lx1, y1 + 0.75, z + st.riser]) // riser board
    solids.push([lx0, y0, z - 1.5, lx1, y1, z])
  }
  sb.push([lx0, st.bottomY - 0.75, 0, lx1, st.bottomY, st.riser]) // bottom riser
  const [ux0, uy0, ux1, uy1] = st.upper
  const uTread = (ux1 - st.landing[2]) / st.upperTreads
  for (let j = 1; j <= st.upperTreads; j++) {
    const x1 = ux1 - (j - 1) * uTread, x0 = x1 - uTread
    const z = FLOOR1 - j * st.riser
    sb.push([x0 - 1, uy0, z - 1.5, x1, uy1, z])
    sb.push([x1, uy0, z, x1 + 0.75, uy1, z + st.riser])
    solids.push([x0, uy0, z - 1.5, x1, uy1, z])
  }
  sb.push([st.landing[2], uy0, st.landingZ, st.landing[2] + 0.75, uy1, st.landingZ + st.riser])
  const [gx0, gy0, gx1, gy1] = st.landing
  sb.push([gx0, gy0, st.landingZ - 9, gx1, gy1, st.landingZ]) // landing platform
  solids.push([gx0, gy0, st.landingZ - 9, gx1, gy1, st.landingZ])
  // Stringers: boards 14" below the line through the tread nosings, so they sit under the treads
  const stringer = []
  const nl = (y) => st.riser + ((y - st.bottomY) * st.riser) / st.tread // lower run nosing line
  const nu = (x) => FLOOR1 - st.upperTreads * st.riser + ((x - st.landing[2]) * st.riser) / uTread // upper run
  const ys = st.bottomY + ((19 - st.riser) * st.tread) / st.riser // where the stringer's lower edge meets the slab
  for (const x of [lx0 + 0.75, lx1 - 0.75])
    stringer.push(beamGeo([x, ys, nl(ys) - 14], [x, st.landing[1] + 2, nl(st.landing[1] + 2) - 14], 1.5, 9.25))
  for (const y of [uy0 + 0.75, uy1 - 0.75])
    stringer.push(beamGeo([st.landing[2] - 2, y, nu(st.landing[2] - 2) - 14], [ux1 + 2, y, nu(ux1 + 2) - 14], 1.5, 9.25))
  const stairLabel = `Basement stair: down from the main floor going west, landing, turn left, down going south (A-1; Ryan). 3'-10" wide (A-1, stated). ` +
    `${st.risers} steps of ${st.riser.toFixed(2)}" for a ${st.rise}" rise: worked out for 12 ft walls, so the bottom step is ${Math.round(v(M.stairs.basement.bottom_step_y) - st.bottomY)}" closer to the lake than drawn. Real step count not measured. Construction under the stair not known.`
  add(group, mesh([...sb.map(boxGeo), ...stringer], m.lumber, stairLabel))

  // Ceiling: open-web floor trusses running east-west, batts above them, and the floor above (photos)
  const OX = v(M.walls.log_wall_inner_face_inset) // 13: inside face of the west log wall (walls.js: centre 4" in, log radius 9"); the opening stops there
  // Stair opening in the main floor: it starts at the first step of the loft stair, which stands over the basement stair (floor in front of it: photos)
  const HY = LOFT_Y0
  const opening = [[OX, HY], [bx - 1.75, HY], [bx - 1.75, uy0], [ux1, uy0], [ux1, uy1], [OX, uy1]]
  const holeRects = [[OX, HY, bx - 1.75, uy1], [bx - 1.75, uy0, ux1, uy1]]
  const tr = []
  const chord = 1.5, tw = 3.5, zb = H, zt = H + TRUSS
  for (let y = T + 12; y < L - T - 2; y += A.trussSpacing) {
    let segs = [[3, W - 3]] // trusses bear on the walls, inside the rim
    for (const [hx0, hy0, hx1, hy1] of holeRects) {
      if (y + tw / 2 <= hy0 || y - tw / 2 >= hy1) continue
      segs = segs.flatMap(([a, b]) => [[a, Math.min(b, hx0)], [Math.max(a, hx1), b]]).filter(([a, b]) => b - a > 6)
    }
    for (const [a, b] of segs) {
      tr.push([a, y - tw / 2, zb, b, y + tw / 2, zb + chord], [a, y - tw / 2, zt - chord, b, y + tw / 2, zt])
      tr.push([a, y - tw / 2, zb, a + 3.5, y + tw / 2, zt], [b - 3.5, y - tw / 2, zb, b, y + tw / 2, zt]) // end posts
      const panels = Math.max(1, Math.round((b - a - 7) / 24))
      const pw = (b - a - 7) / panels
      for (let i = 0; i < panels; i++) {
        const x0 = a + 3.5 + i * pw, xm = x0 + pw / 2, x1 = x0 + pw
        tr.push(['w', [x0, y, zb + chord], [xm, y, zt - chord]], ['w', [xm, y, zt - chord], [x1, y, zb + chord]])
      }
    }
  }
  const trussGeos = tr.map((b) => (b[0] === 'w' ? beamGeo(b[1], b[2], tw, 1.5) : boxGeo(b)))
  const headers = [[T, HY - 1.5, H, bx - 1.75, HY, zt], [ux1, uy0 - 4, H, ux1 + 1.5, uy1 + 4, zt]]
  add(ceiling, mesh([...trussGeos, ...headers.map(boxGeo)], m.lumber,
    `Open-web wood floor trusses running east-west (photos; A-1). Depth ${TRUSS}" (Ryan, about 1 ft, not measured). Spacing assumed ${A.trussSpacing}". Bottom at 12 ft (Ryan). Framing at the stair opening assumed.`))
  add(ceiling, mesh([[0, 0, H, 3, L, zt], [W - 3, 0, H, W, L, zt], [3, L - 3, H, W - 3, L, zt], [3, 0, H, W - 3, 3, zt]].map(boxGeo), m.lumber,
    'Double LVL rim joist around the floor trusses, at the outside face of the walls (A-6 detail 5, stated; drawn 3" thick, assumed). A-6 also shows a treated sill plate; not drawn.'))
  const outline = [[0, 0], [W, 0], [W, L], [0, L]]
  add(ceiling, mesh(sheetGeo(outline, [opening], zt - 6), m.batts,
    'Unfaced fiberglass batts between the floor trusses (photos).'))
  add(ceiling, mesh(sheetGeo(outline, [opening], FLOOR1), m.planks,
    `Main floor, wood-look planks (photos, seen), about ${FLOOR1}" above the slab (12 ft wall + about 1 ft truss + subfloor; assumed). Plans say 120".`))
  solids.push([0, 0, H, W, HY, FLOOR1], [0, uy1, H, W, L, FLOOR1], [bx - 1.75, HY, H, W, uy0, FLOOR1], [ux1, uy0, H, W, uy1, FLOOR1])

  return {
    group, ceiling, solids, stairs: st, lakeOpenings: swOpen, // lake wall openings { s0, s1, sill, head }; the finish layer boards around them
    box: { W, L, H, WEST, EAST, NORTH, SOUTH, FLOOR1 },
  }
}

// Walking: stand on the highest surface within one step, and stop at anything at body height.
// floor(x, y): the height to stand on where no solid is (the slab inside, the yard outside)
export function makeWalker(solids, { floor = () => 0, radius = 6, step = 9, head = 70 } = {}) {
  const near = (x, y, s) => x > s[0] - radius && x < s[3] + radius && y > s[1] - radius && y < s[4] + radius
  const ground = (x, y, z) => solids.reduce((g, s) => (near(x, y, s) && s[5] <= z + step && s[5] > g ? s[5] : g), floor(x, y))
  const blocked = (x, y, z) => floor(x, y) > z + step || solids.some((s) => near(x, y, s) && s[2] < z + head && s[5] > z + step)
  return { ground, blocked }
}
