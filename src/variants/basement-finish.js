// Version layer: the decided basement finishes on top of the proposed layout (facts/finish-decisions.md, Ryan, 2026-11-05).
// Facts use inches, x = east from the west outside face, y = north from the lake wall outside face, z = up from the slab.
// Carpet in bedrooms, epoxy on every other floor, tongue-and-groove on the walls, aluminum drop ceiling, carpet on the stairs.
import * as THREE from 'three'
import { IN, boxGeo, mesh, std, pineBoards } from '../geo.js'
import { H, WEST, EAST, NORTH, SOUTH } from '../basement.js'
import { ROOMS, WALLS } from './proposed-basement.js'
import { WALL_X1, DOOR, SOUTH_Y, NORTH_Y, END_X } from './stair-walls.js'

const TG = 0.75 // board thickness (Ryan, 2026-11-06: 3/4")
const EPOXY = 0.1, CARPET = 0.5 // overlay thickness (assumed); they sit above z 0 so they do not flicker against the slab
const CEIL = 120 // underside of the drop ceiling: proposed plan "10'-0" typical". Nothing hangs below the trusses at 144", so no lowering is needed.
const GRID = 24 // 2' x 2' panels (assumed, standard)
const near = (a, b) => Math.abs(a - b) < 0.6

export function buildBasementFinish(model) {
  const group = new THREE.Group()
  const ceiling = new THREE.Group()
  group.add(ceiling)
  const add = (...m) => m.forEach((x) => group.add(x))

  // ---------- floors ----------
  const flo = (kind) => ROOMS.filter((r) => r.floor === kind).map((r) => boxGeo([r.rect[0], r.rect[1], 0, r.rect[2], r.rect[3], kind === 'carpet' ? CARPET : EPOXY]))
  add(mesh(flo('epoxy'), std(0x8a8d90, 0.18, { metalness: 0.1 }),
    `Epoxy coating on the slab, all basement floors except the bedroom (Ryan, 2026-11-05, stated). Colour and gloss not chosen: gray assumed. Thickness ${EPOXY}" assumed. Room outlines: proposed layout (model fit).`, { shadow: false }))
  add(mesh(flo('carpet'), std(0x8b8176, 1),
    `Carpet in the bedroom (Ryan, 2026-11-05, stated). Colour not chosen: warm gray assumed. Thickness ${CARPET}" assumed (pad and pile).`, { shadow: false }))

  // ---------- stair carpet: same treads as src/basement.js, skinned ----------
  const st = model.stairs
  const sc = []
  const [lx0, , lx1] = st.lower
  for (let k = 1; k <= st.lowerTreads; k++) {
    const y1 = st.landing[1] - (k - 1) * st.tread, y0 = y1 - st.tread
    const z = st.landingZ - k * st.riser
    sc.push([lx0, y0 - 1, z, lx1, y1 - CARPET, z + CARPET], [lx0, y1 - CARPET, z, lx1, y1, z + st.riser])
  }
  sc.push([lx0, st.bottomY - 0.75 - CARPET, 0, lx1, st.bottomY - 0.75, st.riser]) // bottom riser
  const [ux0, uy0, ux1, uy1] = st.upper
  const uTread = (ux1 - st.landing[2]) / st.upperTreads
  for (let j = 1; j <= st.upperTreads; j++) {
    const x1 = ux1 - (j - 1) * uTread, x0 = x1 - uTread
    const z = model.box.FLOOR1 - j * st.riser
    sc.push([x0 - 1, uy0, z, x1 - CARPET, uy1, z + CARPET], [x1 - CARPET, uy0, z, x1, uy1, z + st.riser])
  }
  sc.push([st.landing[2] - CARPET, uy0, st.landingZ, st.landing[2], uy1, st.landingZ + st.riser])
  const [gx0, gy0, gx1, gy1] = st.landing
  sc.push([gx0, gy0, st.landingZ, gx1, gy1, st.landingZ + CARPET]) // landing
  add(mesh(sc.map(boxGeo), std(0x6f6a62, 1),
    'Carpet on the basement stair treads, risers and landing (Ryan, 2026-11-05: "probably", for traction, so not final). Colour and thickness (0.5") assumed. Same steps as the base stair (src/basement.js).', { shadow: false }))

  // ---------- tongue-and-groove walls ----------
  const bd = []
  const box = (b) => b[3] - b[0] > 0.01 && b[4] - b[1] > 0.01 && b[5] - b[2] > 0.01 && bd.push(b)
  // lake wall: boards between the window and slider openings (A-1 / Menards order; positions as in the base model)
  const lake = [...model.lakeOpenings].sort((p, q) => p.s0 - q.s0)
  const lakeBoards = (a, b) => {
    let cur = a
    for (const o of lake) {
      if (o.s1 <= a || o.s0 >= b) continue
      box([cur, SOUTH, 0, Math.max(cur, o.s0), SOUTH + TG, H])
      box([Math.max(o.s0, a), SOUTH, 0, Math.min(o.s1, b), SOUTH + TG, o.sill])
      box([Math.max(o.s0, a), SOUTH, o.head, Math.min(o.s1, b), SOUTH + TG, H])
      cur = Math.max(cur, Math.min(o.s1, b))
    }
    box([cur, SOUTH, 0, b, SOUTH + TG, H])
  }
  // Every room edge that sits on an outside wall or on a new wall gets boards on the room side.
  // The utility room is left alone: it keeps its OSB and equipment (assumed; Ryan has not decided).
  for (const { name, rect: [rx0, ry0, rx1, ry1] } of ROOMS) {
    if (name === 'Utility room') continue
    if (near(rx0, WEST)) box([WEST, ry0, 0, WEST + TG, ry1, H])
    if (near(rx1, EAST)) box([EAST - TG, ry0, 0, EAST, ry1, H])
    if (near(ry1, NORTH)) box([rx0, NORTH - TG, 0, rx1, NORTH, H])
    if (near(ry0, SOUTH)) lakeBoards(rx0, rx1)
    for (const w of WALLS) {
      const ox = [Math.max(rx0, w[0]), Math.min(rx1, w[3])], oy = [Math.max(ry0, w[1]), Math.min(ry1, w[4])]
      if (near(w[3], rx0) && oy[1] > oy[0]) box([rx0, oy[0], w[2], rx0 + TG, oy[1], w[5]])
      if (near(w[0], rx1) && oy[1] > oy[0]) box([rx1 - TG, oy[0], w[2], rx1, oy[1], w[5]])
      if (near(w[4], ry0) && ox[1] > ox[0]) box([ox[0], ry0, w[2], ox[1], ry0 + TG, w[5]])
      if (near(w[1], ry1) && ox[1] > ox[0]) box([ox[0], ry1 - TG, w[2], ox[1], ry1, w[5]])
    }
  }
  // Stair walls (stair-walls.js): boards on the two faces seen from the open basement. The mural face keeps its mural;
  // the faces inside the room under the stair stay plain (storage).
  box([WALL_X1, SOUTH_Y[0] - TG, 0, END_X[1] + TG, SOUTH_Y[0], H]) // south face of the upper-run wall
  box([END_X[1], SOUTH_Y[0], 0, END_X[1] + TG, DOOR.y0, H]) // east face of the end wall, around the hidden door
  box([END_X[1], DOOR.y1, 0, END_X[1] + TG, NORTH_Y[1], H])
  box([END_X[1], DOOR.y0, DOOR.h, END_X[1] + TG, DOOR.y1, H])
  add(mesh(bd.map(boxGeo), pineBoards(),
    `Tongue-and-groove boards (Ryan, 2026-11-05, stated) on the foam-covered concrete walls, the lake stud wall and the new walls, room side only. Boards 3/4" thick (Ryan, stated) with 5 1/2" faces, light knotty pine (size, species and stain assumed; painted by the model). Also on the two stair-wall faces seen from the open basement. Not covered: the utility room walls, the mural face, the inside of the room under the stair, the closet front wall. Window, slider and door openings stay open.`))

  // ---------- drop ceiling ----------
  // Open over the whole stair enclosure. Do not close it: the ceiling at 120" would leave under 80" of head room over the steps.
  // The upper opening starts at y 225 (not 87) because the main-floor stair opening above is there.
  // Two 5" square holes for the boiler vent pipes (src/basement.js: x 11.2+7, y 385 and 394, 3.5" across; hole size assumed).
  const vx = WEST + 0.44 + 7
  const holes = [[WEST, st.bottomY - 1, WALL_X1, NORTH_Y[1]], [WALL_X1, SOUTH_Y[0], END_X[1], NORTH_Y[1]], [vx - 2.5, 382.5, vx + 2.5, 387.5], [vx - 2.5, 391.5, vx + 2.5, 396.5]]
  let cr = [[WEST, SOUTH, EAST, NORTH]]
  for (const [hx0, hy0, hx1, hy1] of holes) {
    cr = cr.flatMap(([a, b, c, d]) => {
      if (hx1 <= a || hx0 >= c || hy1 <= b || hy0 >= d) return [[a, b, c, d]]
      return [[a, b, c, hy0], [a, hy1, c, d], [a, Math.max(b, hy0), hx0, Math.min(d, hy1)], [hx1, Math.max(b, hy0), c, Math.min(d, hy1)]]
        .filter(([p, q, r, s]) => r - p > 0.01 && s - q > 0.01)
    })
  }
  // The grid hangs at CEIL (its underside); the panels rest on the tee flanges, 1/4" higher, so the grid shows as lines
  ceiling.add(mesh(cr.map(([a, b, c, d]) => boxGeo([a, b, CEIL + 0.25, c, d, CEIL + 0.6])), std(0xe4e8eb, 0.4),
    `Drop ceiling panels, aluminum, 2' x 2' (Ryan, 2026-11-05, stated: drop ceiling, aluminum panels; 24" x 24" grid, Ryan, 2026-11-06, stated). Underside at ${CEIL}" = 10'-0" (proposed plan "10'-0" typical", stated). The floor trusses start at 144" and no pipe hangs below them (src/basement.js), so no lowering. Open over the stair; holes for the two boiler vent pipes.`, { shadow: false }))
  const tees = []
  const tee = (x0, y0, x1, y1) => tees.push([x0, y0, CEIL, x1, y1, CEIL + 1.5])
  for (const [a, b, c, d] of cr) { // grid lines every 24" from the west and south walls, clipped to each ceiling piece
    for (let x = WEST + GRID; x < c; x += GRID) if (x > a) tee(x - 0.47, b, x + 0.47, d)
    for (let y = SOUTH + GRID; y < d; y += GRID) if (y > b) tee(a, y - 0.47, c, y + 0.47)
  }
  for (const [a, b, c, d] of [[WEST, SOUTH, EAST, NORTH], ...holes]) { // wall angle around the room and around each opening
    tee(a, b, c, b + 0.94); tee(a, d - 0.94, c, d); tee(a, b, a + 0.94, d); tee(c - 0.94, b, c, d)
  }
  ceiling.add(mesh(tees.map(boxGeo), std(0xf7f7f5, 0.5),
    `Suspended ceiling grid, white tees 15/16" wide on a 24" x 24" grid (Ryan, 2026-11-06, stated), with wall angle around the walls and the openings. Grid starts at the west and south walls (assumed); hanger wires not drawn.`, { shadow: false }))

  return { group, solids: [], ceiling }
}
