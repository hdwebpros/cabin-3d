// Version layer: the decided basement finishes on top of the proposed layout (facts/finish-decisions.md, Ryan, 2026-11-05).
// Facts use inches, x = east from the west outside face, y = north from the lake wall outside face, z = up from the slab.
// Carpet in bedrooms, epoxy on every other floor, tongue-and-groove on the walls, aluminum drop ceiling, carpet on the stairs.
import * as THREE from 'three'
import { IN, rng, boxGeo, mesh, std } from '../geo.js'
import { H, WEST, EAST, NORTH, SOUTH } from '../basement.js'
import { ROOMS, WALLS } from './proposed-basement.js'
import { WALL_X1, DOOR, SOUTH_Y, NORTH_Y, END_X } from './stair-walls.js'

const TG = 0.75 // board thickness (assumed, 3/4" is the usual T&G size)
const EPOXY = 0.1, CARPET = 0.5 // overlay thickness (assumed); they sit above z 0 so they do not flicker against the slab
const CEIL = 120 // underside of the drop ceiling: proposed plan "10'-0" typical". Nothing hangs below the trusses at 144", so no lowering is needed.
const GRID = 24 // 2' x 2' panels (assumed, standard)
const near = (a, b) => Math.abs(a - b) < 0.6
const BOARD = 5.5 // face width of 1x6 tongue-and-groove (assumed, the usual size)

// Light knotty-pine tongue-and-groove, painted on a canvas: 4 horizontal boards per tile with a dark groove at each joint
function pineBoards() {
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
  box([WALL_X1, SOUTH_Y[0] - TG, 0, DOOR.x0, SOUTH_Y[0], H])
  box([DOOR.x1, SOUTH_Y[0] - TG, 0, END_X[1] + TG, SOUTH_Y[0], H])
  box([DOOR.x0, SOUTH_Y[0] - TG, DOOR.h, DOOR.x1, SOUTH_Y[0], H])
  box([END_X[1], SOUTH_Y[0], 0, END_X[1] + TG, NORTH_Y[1], H])
  add(mesh(bd.map(boxGeo), pineBoards(),
    `Tongue-and-groove boards (Ryan, 2026-11-05, stated) on the foam-covered concrete walls, the lake stud wall and the new walls, room side only. Boards 3/4" thick with 5 1/2" faces, light knotty pine (size, species and stain assumed; painted by the model). Also on the two stair-wall faces seen from the open basement. Not covered: the utility room walls, the mural face, the inside of the room under the stair, the closet front wall. Window, slider and door openings stay open.`))

  // ---------- drop ceiling ----------
  // Open over the whole stair enclosure. Do not close it: the ceiling at 120" would leave under 80" of head room over the steps.
  // The upper opening starts at y 225 (not 87) because the main-floor stair opening above is there.
  // Two 5" square holes for the boiler vent pipes (src/basement.js: x 11.2+7, y 385 and 394, 3.5" across; hole size assumed).
  const vx = WEST + 0.44 + 7
  const holes = [[WEST, st.bottomY - 1, 67.5, 275.6], [67.5, 225.1, 126.8, 275.6], [vx - 2.5, 382.5, vx + 2.5, 387.5], [vx - 2.5, 391.5, vx + 2.5, 396.5]]
  let cr = [[WEST, SOUTH, EAST, NORTH]]
  for (const [hx0, hy0, hx1, hy1] of holes) {
    cr = cr.flatMap(([a, b, c, d]) => {
      if (hx1 <= a || hx0 >= c || hy1 <= b || hy0 >= d) return [[a, b, c, d]]
      return [[a, b, c, hy0], [a, hy1, c, d], [a, Math.max(b, hy0), hx0, Math.min(d, hy1)], [hx1, Math.max(b, hy0), c, Math.min(d, hy1)]]
        .filter(([p, q, r, s]) => r - p > 0.01 && s - q > 0.01)
    })
  }
  ceiling.add(mesh(cr.map(([a, b, c, d]) => boxGeo([a, b, CEIL - 0.5, c, d, CEIL - 0.1])), std(0xe4e7ea, 0.4, { metalness: 0.3 }),
    `Drop ceiling panels, aluminum, 2' x 2' (Ryan, 2026-11-05, stated: drop ceiling, aluminum panels). Underside at ${CEIL}" = 10'-0" (proposed plan "10'-0" typical", stated). The floor trusses start at 144" and no pipe hangs below them (src/basement.js), so no lowering. Open over the stair; round holes for the two boiler vent pipes.`, { shadow: false }))
  const tees = []
  for (const [a, b, c, d] of cr) {
    for (let x = WEST + GRID; x < c; x += GRID) if (x > a) tees.push([x - 0.5, b, CEIL - 0.4, x + 0.5, d, CEIL])
    for (let y = SOUTH + GRID; y < d; y += GRID) if (y > b) tees.push([a, y - 0.5, CEIL - 0.4, c, y + 0.5, CEIL])
    tees.push([a, b, CEIL - 0.4, c, b + 1, CEIL], [a, d - 1, CEIL - 0.4, c, d, CEIL])
  }
  ceiling.add(mesh(tees.map(boxGeo), std(0xf4f4f2, 0.5),
    `Suspended ceiling grid, white tees 1" wide on a 24" grid (assumed: standard). Grid starts at the west and south walls; hanger wires not drawn.`, { shadow: false }))

  return { group, solids: [], ceiling }
}
