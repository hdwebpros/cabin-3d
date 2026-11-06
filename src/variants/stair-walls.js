// Version layer: floor-to-ceiling walls along the sides of the basement stair, with a mural.
// Ryan, 2026-11-05: "build walls down from the sides of the stairs ... floor to ceiling ... under-stair storage and or a hidden room.
// One of the walls can be a mural ... Northwoods with misty pines. Fog at the top. Darker pines at the bottom."
// The west side of the stair is the west foundation wall, so the walls close the east side, the south side of the upper
// run, the north side, and the east end. The stair posts (A-1) stand inside the east wall.
import * as THREE from 'three'
import { rng, boxGeo, mesh, std, IN, P } from '../geo.js'
import { H, WEST, stairPlan } from '../basement.js'

const WALL_X0 = 58.8 // east wall of the lower run starts at the stair's east edge (A-1 d2 scaled) and covers the 8x8 stair posts (x 59 to 67)
export const WALL_X1 = 66.5 // 6x6 post east faces are at x 65.75; the wall covers them
// New walls are 4": 2x4 studs (3 1/2") with 1/4" drywall each side (Ryan, 2026-11-06, stated)
export const SOUTH_Y = [225.1, 229.1] // south wall of the upper run, just south of the upper run (y 229.1)
export const NORTH_Y = [275.1, 275.6] // thin skin on the stair side of the utility room south wall (src/basement.js, y 275.6 to 279.1), 0.5" assumed
const UPPER_END = stairPlan().upper[2] // the upper run ends here (its top step)
export const END_X = [UPPER_END, UPPER_END + 4] // east end wall under the stair top
// Doorway in the east end wall, facing east (Ryan, 2026-11-06: "Facing east, size irrelevant, will eventually be a clever or hidden door").
// 30" wide and 80" high, centred in the wall (assumed)
export const DOOR = { y0: 237.1, y1: 267.1, h: 80 }

const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t))
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

// Northwoods misty pines on a canvas: rows of pine silhouettes, far rows pale and lost in fog, near rows dark, fog at the top
function paintMural(w, h) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')
  const rand = rng(20261105)
  const fog = [214, 223, 222], dark = [14, 32, 25]
  const sky = c.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, css(fog)); sky.addColorStop(1, css([170, 188, 188]))
  c.fillStyle = sky
  c.fillRect(0, 0, w, h)
  const rows = 8
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1) // 0 far, 1 near
    const col = mix(mix(fog, [60, 90, 80], 0.45), dark, t ** 1.3)
    const base = h * (0.52 + 0.55 * t)
    const n = Math.round(14 + 10 * t)
    for (let i = 0; i < n; i++) {
      const x = ((i + rand()) / n) * w * 1.1 - w * 0.05
      const ph = h * (0.2 + 0.35 * t) * (0.7 + 0.6 * rand()) // pine height
      const pw = ph * (0.28 + 0.1 * rand())
      const tiers = 6 + Math.floor(rand() * 4)
      c.fillStyle = css(mix(col, dark, rand() * 0.15 * t))
      c.fillRect(x - pw * 0.04, base - ph * 0.1, pw * 0.08, ph * 0.12) // trunk
      for (let k = 0; k < tiers; k++) { // each tier is a triangle with a ragged bottom edge
        const f = k / tiers
        const ty = base - ph * 0.08 - ph * 0.92 * f, th = (ph * 0.92) / tiers * 1.9
        const tw = pw * (1 - f) * (0.9 + 0.2 * rand())
        c.beginPath()
        c.moveTo(x, ty - th)
        c.lineTo(x + tw / 2, ty - th * 0.1); c.lineTo(x + tw * 0.2, ty - th * 0.25)
        c.lineTo(x, ty); c.lineTo(x - tw * 0.2, ty - th * 0.25)
        c.lineTo(x - tw / 2, ty - th * 0.1)
        c.fill()
      }
    }
    if (r < rows - 1) { // mist between rows: the rows behind fade
      const m = c.createLinearGradient(0, base - h * 0.45, 0, base + h * 0.12)
      m.addColorStop(0, css(fog, 0)); m.addColorStop(0.6, css(fog, 0.38 * (1 - t))); m.addColorStop(1, css(fog, 0))
      c.fillStyle = m
      c.fillRect(0, base - h * 0.45, w, h * 0.57)
    }
  }
  const top = c.createLinearGradient(0, 0, 0, h * 0.5) // fog at the top
  top.addColorStop(0, css(fog, 1)); top.addColorStop(0.55, css(fog, 0.55)); top.addColorStop(1, css(fog, 0))
  c.fillStyle = top
  c.fillRect(0, 0, w, h * 0.5)
  const bot = c.createLinearGradient(0, h * 0.7, 0, h) // darker pines at the bottom
  bot.addColorStop(0, css(dark, 0)); bot.addColorStop(1, css(dark, 0.5))
  c.fillStyle = bot
  c.fillRect(0, h * 0.7, w, h * 0.3)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function buildStairWalls(model) {
  const st = model.stairs
  const group = new THREE.Group()
  const y0 = st.bottomY - 0.75 // the east wall starts at the bottom riser, so the bottom step opens to the basement
  const y1 = SOUTH_Y[1]
  const wallMat = std(0xf1ece2, 0.9) // light warm white, assumed (no proposed wall finish to match yet)

  // Wall boxes [x0, y0, z0, x1, y1, z1]; all have the same z range except the piece over the door.
  const WALLS = [
    [WALL_X0, y0, 0, WALL_X1, y1, H], // east wall of the lower run (mural on its east face), holds the stair posts
    [WALL_X1, SOUTH_Y[0], 0, END_X[0], SOUTH_Y[1], H], // south wall of the upper run
    [WEST, NORTH_Y[0], 0, END_X[0], NORTH_Y[1], H], // north skin, from the west furring to the east end wall
    [END_X[0], SOUTH_Y[0], 0, END_X[1], DOOR.y0, H], // east end, under the stair top: south of the door
    [END_X[0], DOOR.y1, 0, END_X[1], NORTH_Y[1], H], // north of the door
    [END_X[0], DOOR.y0, DOOR.h, END_X[1], DOOR.y1, H], // over the door
  ]
  const solids = WALLS

  group.add(mesh(WALLS.map(boxGeo), wallMat,
    `Stairwell walls, floor to ceiling, closing the east side, north side and east end of the stair and the space under it (Ryan, 2026-11-05, stated idea; wall positions inferred from the stair rectangles, A-1 d2 scaled; 4" thick: 2x4 studs and 1/4" drywall each side (Ryan, 2026-11-06, stated); north wall is only a 0.5" skin because src/basement.js already builds the wall behind it). Positions: east wall x 58.8 scaled (A-1 d2 lower run); east wall to x 66.5, covering the 6x6 posts at x 63 (post x inferred); south wall y 225.1 to 229.1 (scaled edge); end wall at the top step of the 9-tread upper run, x ${END_X[0]} (Ryan's tread count, 11" treads scaled). Door in the end wall, facing east (Ryan, 2026-11-06, stated; size and position in the wall assumed). Plain light painted finish, assumed.`))

  // Mural on the east face of the lower-run wall: the face most seen from the open basement
  const mw = SOUTH_Y[0] - y0 // ends where the south wall begins
  const plane = new THREE.PlaneGeometry(mw * IN, H * IN)
  plane.rotateY(Math.PI / 2) // faces east; the picture's right side is north
  plane.translate((WALL_X1 + 0.05) * IN, (H / 2) * IN, -((y0 + SOUTH_Y[0]) / 2) * IN)
  const muralMat = new THREE.MeshStandardMaterial({ map: paintMural(1536, Math.round(1536 * H / mw)), roughness: 0.92 })
  group.add(mesh(plane, muralMat,
    'Mural idea (Ryan, 2026-11-05): Northwoods misty pines, fog at the top, darker pines at the bottom. Wall choice assumed (east wall of the lower run; Ryan said "one of the walls"). The picture is a placeholder painted by the model.', { shadow: false }))

  // Hidden door: flush with the east face of the end wall, drawn standing partly open into the room under the stair
  const ex = END_X[1]
  const leaf = boxGeo([ex - 1.75, DOOR.y0 + 0.6, 0, ex, DOOR.y1, DOOR.h - 0.5])
  const hinge = P(ex - 0.9, DOOR.y0 + 0.6, 0)
  leaf.translate(-hinge.x, 0, -hinge.z)
  leaf.rotateY((75 * Math.PI) / 180) // swings west, into the room
  leaf.translate(hinge.x, 0, hinge.z)
  group.add(mesh(leaf, wallMat,
    'Hidden door into the room under the stair, in the east end wall, facing east (Ryan, 2026-11-06, stated: "will eventually be a clever or hidden door"). Flush with the wall when shut, drawn open about 75 degrees. 30" x 80" and the swing assumed ("size irrelevant", Ryan). The leaf is not solid.'))

  return { group, solids }
}
