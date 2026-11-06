// Main floor inside, as the cabin sits today: partition walls and doors, kitchen island and counters,
// the stair to the loft, the wood stove with its pipe. Facts use inches, x = east, y = north, z = up (see geo.js).
import * as THREE from 'three'
import { M, v, IN, FLOOR1, up, roofUnder, RIDGE_X, boxGeo, cylBetween, cylGeo, mesh, std, mats } from '../geo.js'

const LS = M.stairs.main_to_loft
const RISE = v(LS.total_rise) // 114 (levels 100'-0" to 109'-6", stated)
const NL = 4 // lower treads, then the landing (Ryan, 2026-11-06, stated; replaces the 5 in facts and the 4 on A-2)
const NU = 10 // upper treads, then the loft floor (Ryan, 2026-11-06, stated; A-2 draws only 6)
const WIN = M.openings.find((o) => o.id === 'W-west-2') // the window just north of the stove
const WIN_N = v(WIN.offset) + v(WIN.width) // 168: its north edge; the first tread starts here (Ryan, 2026-11-06, stated)
export const LOFT_Y0 = WIN_N // the first step; the basement stair opening in the main floor starts here (basement.js)
const TREAD_U = 10 // upper tread depth, log stair (assumed: the plans give 11" at 6 treads; 10 keeps the run off the post at x 168)
export const STAIR_X = v(LS.upper_run_rect)[0] + NU * TREAD_U // 157: the upper run ends here, where the loft floor starts (roof.js)

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
  const steel = std(0x9a9fa4, 0.3, { metalness: 0.8 }) // brushed stainless
  const log = mats.log // same as the loft railing

  // ---------- 1. partition walls (A-2 drawing 1, rooms.main; walls 4 1/2" thick) ----------
  // Layout from the A-2 crops, scaled and squared up: the plan draws the bedroom doors on an angled pair of walls.
  // x 13 is the inside of the west log wall, x 323 the east one, y 539.3 the north one.
  const T = A.wall
  const walls = [
    // bath block, south wall: from the west log wall to the hall wall (stair top is open, no wall: Ryan, 2026-11-05)
    [[13, 275.5, 171.5, 275.5 + T], []],
    // wall between the west bath and the 3/4 bath, up to the bedroom 1 wall
    [[77.5, 280, 82, 405], []],
    // wall behind the tub, between the 3/4 bath and the bedroom 1 closet (guest bath 94.5" deep, A-2 7'-10 1/2", stated; closet 26" deep, A-2 2'-2", stated)
    [[82, 374.5, 167, 379], []],
    // bedroom 1 south wall: room face at y 405. A-2's 12'-3" (stated) starts at the north foundation line (red dashed line, tick checked on the sheet), so 552 - 147 = 405; the chain 12'-3" + 2'-2" + 7'-10 1/2" is continuous: west bath door 30" (x 43 to 73) and the 48" closet opening (x 86 to 134, width scaled)
    [[13, 400.5, 171.5, 400.5 + T], [[43, 73], [86, 134]]],
    // hall west wall, bath doors and bedroom 1 wall: 3/4 bath door 30", bedroom 1 door 32"
    [[167, 275.5, 171.5, 454.3], [[299, 329], [414, 446]]],
    // hall north end
    [[167, 449.8, 220, 454.3], []],
    // hall east wall at x 215.5 so the hall is 44" wide (A-2, stated): the entry is open to the hall over its full 65" (A-2 draws no wall; photo PXL_20230205_212415772),
    // the hall linen closet door (about 20" on A-2, scaled; 17" here to fit the 19" closet), bedroom 2 door 32" (ends at the hall end wall)
    [[215.5, 275.5, 220, 454.3], [[325.5, 390.5], [396, 413], [417.8, 449.8]]],
    // bedroom partition x 182 to 186.5: the master (bedroom 1, west) is 169" (A-2 says 172") and the guest room (bedroom 2) 136.5" (A-2 says 138"). The plan sizes plus the 4 1/2" wall are 4 1/2" more than the 310" between the log walls; the master loses 3" and the guest 1.5" (Ryan, 2026-11-06, stated)
    [[182, 454.3, 186.5, 539.3], []],
    // bedroom 2 south wall, with the 48" closet opening (x 255 to 303)
    [[220, 414, 323, 418.5], [[255, 303]]],
    // entry north wall at y 390.5: entry is 109" x 65" (A-2, stated; x 214 to 323 from the hall side, y 325.5 to 390.5; behind it the bedroom 2 closet)
    [[218.5, 390.5, 323, 395], []],
    // hall linen closet (A-2 "LINENS", door from the hall): wall between it and the bedroom 2 closet; closet 29" wide (A-2, scaled)
    [[249, 395, 253.5, 414], []],
    // entry south wall = front of the two laundry bays, each open to the entry (photo PXL_20230205_212421589.MP): sink bay x 220 to 255, washer/dryer bay x 259.5 to 323
    [[220, 321.5, 323, 325.5], [[221, 254], [262, 320]]],
    // wall between the sink bay and the washer/dryer bay (A-2 and the photo). A-2 gives 3'-3 1/2" + 5'-5" plus the wall = 109", 6" more than the 103" here; each bay loses about 3"
    [[255, 280, 259.5, 321.5], []],
    // laundry south wall
    [[220, 275.5, 323, 280], []],
  ]
  const wallBoxes = walls.flatMap(([b, o]) => wall(b, o))
  add(wallBoxes.map(boxGeo), drywall,
    'Interior walls on the main floor: bedroom 1, bedroom 2, west bath, 3/4 bath, hall, entry, laundry sink bay, washer/dryer bay, hall linen closet and bedroom closets. ' +
    'Positions from A-2 drawing 1 scaled and squared up (the plan draws the bedroom doors on an angled wall pair), confidence scaled / inferred. ' +
    `Walls ${A.wall}" thick and ${WH}" high up to the loft joists, 8'-0" above the floor (A-6, stated; thickness and white drywall assumed). ` +
    'Door openings: 30" (baths), 32" (bedrooms), 48" closets (A-2, stated); laundry bays open to the entry, 33" and 58" (photo PXL_20230205_212421589.MP, seen; A-2 draws a 60" bifold on the washer/dryer bay); hall linen closet 17" (A-2 about 20", scaled); opening height 80" assumed. The entry is open to the hall over its full depth (A-2; photo PXL_20230205_212415772, seen). Wall pieces beside the openings and the tub wall: position inferred from the room sizes. Bedroom 1 is 147" deep and the entry 109" x 65" (A-2, stated); the hall is 44" wide (A-2, stated).')
  solids.push(...wallBoxes)

  // Doors standing open 90 degrees against the walls they open toward (leaf only; the leaves are not solid)
  const d = A.doorT
  add([
    leaf([73 - d, 370.5, 73, 400.5]), // west bath, hinged at the east jamb, opens south into the bath
    leaf([137, 329 - d, 167, 329]), // guest (3/4) bath, hinged at the north jamb, opens west into the bath (A-2 draws the swing this way). Opening y 299 to 329: A-2 '1'-6" wall return at door' (stated; 19" so the leaf swing clears the vanity corner)
    leaf([135, 414, 167, 414 + d]), // bedroom 1, hinged at the south jamb, opens west into the bedroom
    leaf([220, 418.5, 252, 418.5 + d]), // bedroom 2, hinged at the south jamb, opens east into the bedroom
  ], woodDoor,
    'Interior doors standing open 90 degrees: west bath 30", 3/4 bath 30", bedroom 1 32", bedroom 2 32" (A-2 drawing 1, stated widths). ' +
    'Which side each door hinges on and the 80" height and 1 3/4" thickness are assumed. The plan draws no doors on the closets or the laundry (bifold, not drawn).')

  // Laundry bays: washer and dryer side by side, and a white vanity with a steel utility sink (photo PXL_20230205_212421589.MP; sizes assumed)
  const white = std(0xf2f2f0, 0.5), wd = [], vb = [[221, 280, FLOOR1, 245, 301, FLOOR1 + 34]]
  for (const x0 of [262, 291]) {
    wd.push(boxGeo([x0, 280, FLOOR1, x0 + 27, 310, FLOOR1 + 39]))
    solids.push([x0, 280, FLOOR1, x0 + 27, 310, FLOOR1 + 39])
  }
  add(wd, white, 'Washer and dryer side by side in the washer/dryer bay (Ryan, 2026-11-06, stated; A-2 "W/D"). Front-loading, 27" wide, 30" deep, 39" high (assumed).')
  add(vb.map(boxGeo), white, 'White two-door vanity in the laundry sink bay, against the back wall at the west side (photo PXL_20230205_212421589.MP, seen). 24" x 21" x 34" (assumed).')
  add([boxGeo([221, 280, FLOOR1 + 34, 245, 301, FLOOR1 + 35])], steel, 'Stainless utility sink on the laundry vanity (photo PXL_20230205_212421589.MP, seen; A-2 draws a sink here). Size assumed.')
  add([boxGeo([224, 283, FLOOR1 + 35, 242, 298, FLOOR1 + 35.1])], std(0x1f2022, 0.5), 'Bowl of the laundry sink (assumed look).')
  solids.push(...vb)

  // ---------- 1b. bathrooms ----------
  // Master bath (west bath, x 13 to 77.5, y 280 to 400.5): photos PXL_20231229_221430030 (2023, tiling not done) and received_328693656296719 (finished).
  // Guest bath (3/4 bath, x 82 to 167, y 280 to 374.5): Ryan, 2026-11-06, stated, plus A-2 drawing 1 for the sizes.
  const tile = std(0xf4f3ef, 0.35), hex = std(0x4a4643, 0.6), lvp = std(0x5b4a3d, 0.7), grayCab = std(0x8e9296, 0.6)
  const fiber = std(0xf7f6f2, 0.25), porcelain = std(0xfafafa, 0.2), basin = std(0xe4e4e2, 0.2)
  const toilet = (cx, back) => [ // faces north: tank against the wall at y = back, bowl toward +y (sizes assumed)
    boxGeo([cx - 10, back, FLOOR1 + 15, cx + 10, back + 8, FLOOR1 + 30]),
    cylGeo(cx, back + 18, 5, FLOOR1, FLOOR1 + 10, 16), cylGeo(cx, back + 18, 8, FLOOR1 + 10, FLOOR1 + 15.5, 20)]
  const sinkTop = (r) => [boxGeo([r[0], r[1], FLOOR1 + 33, r[2], r[3], FLOOR1 + 34.5])]
  const sinkBowl = ([x0, y0, x1, y1]) => [boxGeo([x0 + 4, y0 + 5, FLOOR1 + 34.5, x1 - 4, y1 - 5, FLOOR1 + 34.6])]
  const mv = [13, 349, 34, 379], gv = [119, 280, 155, 301] // vanities [x0, y0, x1, y1]
  const MS = [21, 280, 77.5, 318] // master shower, inside the curb
  add([boxGeo([13, 280, FLOOR1, 21, 318, CEIL])], tile,
    'Master bath: tiled plumbing chase about 8" deep against the west log wall along the shower (photos PXL_20231229_221430030 and received_328693656296719, seen: framed box with PVC pipes, tiled; depth estimated from the photo). It holds the shower wall off the round logs.')
  add([boxGeo([MS[0], MS[1], FLOOR1, MS[2], MS[1] + 0.5, CEIL]), boxGeo([MS[2] - 0.5, MS[1], FLOOR1, MS[2], MS[3], CEIL]),
    boxGeo([MS[0], MS[3] - 4, FLOOR1, MS[2], MS[3], FLOOR1 + 6])], tile,
    `Master bath shower: white textured large-format tile on all three walls up to the top of the wall, tiled curb 6" high across the front, no door or glass (photo received_328693656296719, seen). Inside about ${MS[2] - MS[0]}" wide x ${MS[3] - MS[1] - 4}" deep (A-2 drawing 1: shower 3'-0" x 5'-0", stated; width less the chase, estimated). Two black corner shelves not drawn.`)
  add([boxGeo([MS[0] + 0.5, MS[1] + 0.5, FLOOR1, MS[2] - 0.5, MS[3] - 4, FLOOR1 + 0.3])], hex,
    'Master bath shower floor: dark gray hexagon mosaic tile with a square drain (photo received_328693656296719, seen).')
  add([boxGeo([13, MS[3], FLOOR1, 77.5, 400.5, FLOOR1 + 0.2])], lvp,
    'Master bath floor: dark brown wood-look vinyl plank (photos PXL_20231229_221430030 and received_328693656296719, seen).')
  add([...toilet(30, MS[3]), ...toilet(100, 280)], porcelain,
    'Toilets, white. Master bath: tank against the shower chase and curb, facing north toward the door (photo received_328693656296719, seen; A-2 draws it against the west wall facing east, the photo wins). ' +
    'Guest bath: on the south wall, west side, facing north (Ryan, 2026-11-06, stated: sink and toilet on the south side; position along the wall from A-2 drawing 1, scaled). Sizes assumed.')
  add([boxGeo([mv[0], mv[1], FLOOR1, mv[2], mv[3], FLOOR1 + 33]), boxGeo([gv[0], gv[1], FLOOR1, gv[2], gv[3], FLOOR1 + 33])], grayCab,
    'Bath vanities. Master bath: gray Shaker two-door vanity against the west log wall, north of the toilet, 30" x 21" (photos PXL_20231229_221430030 and received_328693656296719, seen; size estimated). ' +
    `Guest bath: on the south wall, east of the toilet, ${gv[2] - gv[0]}" x 21" (Ryan, 2026-11-06, stated: small single sink on the south side; A-2 drawing 1, scaled). Its color is not known; drawn like the master vanity (assumed).`)
  add([...sinkTop(mv), ...sinkTop(gv)], porcelain, 'White one-piece vanity tops with the sink bowl molded in (master: photos, seen; guest: assumed).')
  add([...sinkBowl(mv), ...sinkBowl(gv)], basin, 'Sink bowls (shape assumed).')
  solids.push([13, 280, FLOOR1, 21, 318, CEIL], [MS[0], MS[3] - 4, FLOOR1, MS[2], MS[3], FLOOR1 + 6],
    [20, MS[3], FLOOR1, 40, MS[3] + 26, FLOOR1 + 30], [90, 280, FLOOR1, 110, 306, FLOOR1 + 30],
    [mv[0], mv[1], FLOOR1, mv[2], mv[3], FLOOR1 + 34.5], [gv[0], gv[1], FLOOR1, gv[2], gv[3], FLOOR1 + 34.5])

  // Guest bath: fiberglass tub-shower along the north wall, linen closet east of it (Ryan, 2026-11-06, stated; A-2 drawing 1: 5'-0" tub, "LINENS")
  const TUB = [82, 344.5, 142, 374.5] // 60" x 30" (A-2: 5'-0", stated; 30" depth scaled)
  add([boxGeo([TUB[0], TUB[1], FLOOR1, TUB[2], TUB[3], FLOOR1 + 20]),
    boxGeo([TUB[0], TUB[3] - 1, FLOOR1 + 20, TUB[2], TUB[3], FLOOR1 + 76]), boxGeo([TUB[0], TUB[1], FLOOR1 + 20, TUB[0] + 1, TUB[3], FLOOR1 + 76]),
    boxGeo([TUB[2] - 1, TUB[1], FLOOR1 + 20, TUB[2], TUB[3], FLOOR1 + 76])], fiber,
    'Guest bath: white fiberglass tub-shower, one piece, along the north wall, 60" x 30", surround about 76" high (Ryan, 2026-11-06, stated: fiberglass tub and shower on the north side; A-2 drawing 1: 5\'-0" tub, stated; depth scaled; surround height assumed). Shower curtain not drawn.')
  add([boxGeo([TUB[0] + 3, TUB[1] + 3, FLOOR1 + 20, TUB[2] - 3, TUB[3] - 4, FLOOR1 + 20.1])], basin, 'Inside of the tub (look assumed).')
  const LIN = [[142, 341.7, 146.5, 374.5], [146.5, 341.7, 167, 346.2]] // closet side wall beside the tub, front wall facing the bath
  add(LIN.map(([x0, y0, x1, y1]) => boxGeo([x0, y0, FLOOR1, x1, y1, CEIL])), drywall,
    'Guest bath linen closet, east of the tub end, about 20" wide and as deep as the tub (Ryan, 2026-11-06, stated: small linen closet next to the tub; A-2 drawing 1 "LINENS", size scaled).')
  add([boxGeo([148.5, 341, FLOOR1, 165, 341.7, FLOOR1 + A.door])], woodDoor, 'Guest bath linen closet door, 16 1/2", shown closed (A-2 drawing 1 draws a door; width scaled).')
  solids.push([TUB[0], TUB[1], FLOOR1, TUB[2], TUB[3], FLOOR1 + 20], ...LIN.map(([x0, y0, x1, y1]) => [x0, y0, FLOOR1, x1, y1, CEIL]))

  // ---------- 2. kitchen: island, counters, appliances ----------
  // Layout (Ryan, 2026-11-06, stated): sink in the east log wall counter, refrigerator at its south end (right of the sink when you face east),
  // range against the north drywall wall (the laundry south wall) facing south, upper cabinets on that wall only. Look from Ryan's photos
  // (work/findings/kitchen-photos.md). Every appliance is stainless (Ryan, stated); the photos show a white range and a dark sink, so they may be older.
  const [iw, id] = v(M.rooms.main.kitchen_island.size) // 102 north-south x 44 east-west (8'-6" x 3'-8", stated)
  const ISL = [211, 105.6, 211 + id, 105.6 + iw] // x 211 to 255, y 105.6 to 207.6 (A-2 d1 scaled)
  const CT = A.counterH - 1.5
  const frame = std(0xb08b5c, 0.65), doorM = std(0xd9b98a, 0.55), bead = std(0xd2ae78, 0.6) // hickory: frame darker so the door gaps read as lines
  const topM = std(0x2b2d2f, 0.55), dark = std(0x1f2022, 0.5), faucetM = std(0x1e1e1e, 0.8)
  const PH = 'photos PXL_20260310_232308808, PXL_20260510_035507610.NIGHT, PXL_20240519_141440268.MP'
  const doors = [], strips = [], pulls = [], bodies = [], tops = [], uppers = [], upDoors = [], upPulls = [], topGlass = []
  // Box that sticks out of a vertical plane: face = which way the plane looks (W, E, S, N), d = plane position, o0..o1 = distance out from it
  const fb = (face, d, o0, o1, s0, s1, z0, z1) => ({
    W: [d - o1, s0, FLOOR1 + z0, d - o0, s1, FLOOR1 + z1], E: [d + o0, s0, FLOOR1 + z0, d + o1, s1, FLOOR1 + z1],
    S: [s0, d - o1, FLOOR1 + z0, s1, d - o0, FLOOR1 + z1], N: [s0, d + o0, FLOOR1 + z0, s1, d + o1, FLOOR1 + z1],
  }[face])
  // Shaker door and drawer panels (slightly proud, gaps show the darker frame) with black bar pulls. Cells about 18" wide.
  function fronts(face, d, s0, s1, { z0 = 4, z1 = CT - 0.5, drawer = true, pullLow = false } = {}, dg = doors, pg = pulls) {
    const n = Math.max(1, Math.round((s1 - s0) / 18)), w = (s1 - s0) / n
    for (let i = 0; i < n; i++) {
      const a = s0 + i * w + 0.4, b = s0 + (i + 1) * w - 0.4, m = (a + b) / 2
      const dz1 = drawer ? z1 - 7.5 : z1
      dg.push(boxGeo(fb(face, d, 0, 0.6, a, b, z0, dz1)))
      const pz = pullLow ? z0 + 3 : dz1 - 8
      pg.push(boxGeo(fb(face, d, 0.6, 1.8, a + 2, a + 2.8, pz, pz + 5))) // vertical pull on the door
      if (drawer) {
        dg.push(boxGeo(fb(face, d, 0, 0.6, a, b, z1 - 6.5, z1)))
        pg.push(boxGeo(fb(face, d, 0.6, 1.8, m - 2.5, m + 2.5, z1 - 4, z1 - 3.2)))
      }
    }
  }
  // Island: body set back 12" on the west side so the top overhangs for the stools (photo 2); west face beadboard, kitchen face Shaker
  const IB = [ISL[0] + 12, ISL[1], ISL[2], ISL[3]]
  bodies.push(boxGeo([IB[0], IB[1], FLOOR1, IB[2], IB[3], FLOOR1 + CT]))
  for (let y = IB[1] + 1; y < IB[3] - 3; y += 4) strips.push(boxGeo(fb('W', IB[0], 0, 0.4, y, y + 3.4, 4, CT - 0.5)))
  fronts('E', IB[2], IB[1] + 1, IB[3] - 1)
  tops.push(boxGeo([ISL[0], ISL[1], FLOOR1 + CT, ISL[2], ISL[3], FLOOR1 + A.counterH]))
  solids.push([ISL[0], ISL[1], FLOOR1, ISL[2], ISL[3], FLOOR1 + A.counterH])

  // East run (counter along the inside of the east log wall, x 299 to 323): fridge, cabinet, sink, dishwasher, cabinets
  const EX = 299, EXI = 323, NY = 275.5 // north wall face
  const FR = [EXI - 30, 105.6, EXI, 105.6 + 36] // refrigerator 36" wide x 30" deep (estimated), south end of the run
  const E0 = FR[3], S0 = 181.5, S1 = S0 + 30, D1 = S1 + 24 // sink 30" and dishwasher 24" centred on the run E0 to NY (about 141.6 to 275.5)
  const eRun = [[E0, S0], [S0, S1], [S1, D1], [D1, NY]]
  for (const [a, b] of eRun) bodies.push(boxGeo([EX, a, FLOOR1, EXI, b, FLOOR1 + (a === S0 ? 26 : CT)]))
  fronts('W', EX, E0, S0)
  fronts('W', EX, S0, S1, { z0: 4, z1: 25, drawer: false })
  fronts('W', EX, D1, 251.5) // the last 24" at the north end is the corner, blind behind the north run
  solids.push([EX, E0, FLOOR1, EXI, NY, FLOOR1 + A.counterH])
  // counter tops: the sink hole is cut out of the top
  for (const [a, b] of [[E0, S0], [D1, NY]]) tops.push(boxGeo([EX, a, FLOOR1 + CT, EXI, b, FLOOR1 + A.counterH]))
  tops.push(boxGeo([EX, S0, FLOOR1 + CT, 302, S1, FLOOR1 + A.counterH]), boxGeo([320, S0, FLOOR1 + CT, EXI, S1, FLOOR1 + A.counterH]),
    boxGeo([302, S0, FLOOR1 + CT, 320, S0 + 2, FLOOR1 + A.counterH]), boxGeo([302, S1 - 2, FLOOR1 + CT, 320, S1, FLOOR1 + A.counterH]),
    boxGeo([EX, S1, FLOOR1 + CT, EXI, D1, FLOOR1 + A.counterH])) // over the dishwasher

  // North run (against the drywall, y 275.5): counter, range, counter. The old short counter [272, 255.6, 299, 275.5] is kept but 24" deep.
  const NYF = NY - 24 // cabinet front line, y 251.5
  const RG = [242, NY - 26, 272, NY] // range 30" wide, 26" deep (assumed), x 242 to 272
  for (const [a, b] of [[220, RG[0]], [RG[2], EX]]) {
    bodies.push(boxGeo([a, NYF, FLOOR1, b, NY, FLOOR1 + CT]))
    tops.push(boxGeo([a, NYF, FLOOR1 + CT, b, NY, FLOOR1 + A.counterH]))
    fronts('S', NYF, a, b)
    solids.push([a, NYF, FLOOR1, b, NY, FLOOR1 + A.counterH])
  }
  // Upper cabinets on the north wall only: 1 door left of the range, 3 doors right, nothing over the range (photo PXL_20240519_141440268)
  for (const [a, b] of [[220, RG[0]], [RG[2], EXI]]) {
    uppers.push(boxGeo([a, NY - 12, FLOOR1 + 54, b, NY, FLOOR1 + 84]))
    fronts('S', NY - 12, a, b, { z0: 54.4, z1: 83.6, drawer: false, pullLow: true }, upDoors, upPulls)
    solids.push([a, NY - 12, FLOOR1 + 54, b, NY, FLOOR1 + 84])
  }

  // Appliances (stainless)
  const stl = [], blk = [], gl = []
  // Refrigerator: French doors above, freezer drawer below
  stl.push(boxGeo([FR[0], FR[1], FLOOR1, FR[2], FR[3], FLOOR1 + A.refH]))
  const fx = FR[0] // front face
  blk.push(boxGeo([fx - 0.3, FR[1] + 18, FLOOR1 + 25, fx, FR[1] + 18.5, FLOOR1 + A.refH - 1]), boxGeo([fx - 0.3, FR[1] + 1, FLOOR1 + 24.5, fx, FR[3] - 1, FLOOR1 + 25])) // door gap, freezer line
  stl.push(boxGeo([fx - 1.5, FR[1] + 14, FLOOR1 + 36, fx, FR[1] + 15, FLOOR1 + 58]), boxGeo([fx - 1.5, FR[1] + 21, FLOOR1 + 36, fx, FR[1] + 22, FLOOR1 + 58]), boxGeo([fx - 1.5, FR[1] + 8, FLOOR1 + 17, fx, FR[1] + 28, FLOOR1 + 18]))
  solids.push([FR[0], FR[1], FLOOR1, FR[2], FR[3], FLOOR1 + A.refH])
  // Dishwasher front, 24" wide (assumed)
  stl.push(boxGeo(fb('W', EX, 0, 0.75, S1 + 0.4, D1 - 0.4, 3, 33)), boxGeo(fb('W', EX, 0.75, 2.2, S1 + 2, D1 - 2, 28, 29.2)))
  blk.push(boxGeo(fb('W', EX, 0.75, 0.9, S1 + 2, D1 - 2, 31, 32.5)))
  // Range, 30" freestanding, against the north wall facing south: cooktop with 4 burners, backguard, oven door with glass, handle, knobs
  stl.push(boxGeo([RG[0], RG[1], FLOOR1, RG[2], RG[3], FLOOR1 + A.counterH]), boxGeo([RG[0], NY - 4, FLOOR1 + A.counterH, RG[2], NY, FLOOR1 + A.counterH + 6]),
    boxGeo(fb('S', RG[1], 0, 2.5, RG[0] + 3, RG[2] - 3, 29, 30.5)))
  gl.push(boxGeo(fb('S', RG[1], 0, 0.3, RG[0] + 4, RG[2] - 4, 6, 24)))
  stl.push(boxGeo(fb('S', RG[1], 0.3, 1.8, RG[0] + 4, RG[2] - 4, 27, 28)))
  for (const bxm of [RG[0] + 7.5, RG[0] + 22.5]) for (const by of [RG[1] + 7, RG[1] + 19]) blk.push(boxGeo([bxm - 4, by - 4, FLOOR1 + A.counterH + 0.05, bxm + 4, by + 4, FLOOR1 + A.counterH + 0.4]))
  for (let k = 0; k < 5; k++) { const x = RG[0] + 4 + k * 5.5; blk.push(boxGeo(fb('S', RG[1], 0, 1.2, x, x + 1.5, 31.5, 33))) }
  solids.push([RG[0], RG[1], FLOOR1, RG[2], RG[3], FLOOR1 + A.counterH])
  // Farmhouse sink: apron front 1 1/2" proud of the cabinet fronts, steel walls, dark bowl bottom (a recess look)
  const sk = [boxGeo(fb('W', EX, 0, 1.5, S0 + 0.2, S1 - 0.2, 26, A.counterH)), boxGeo([302, S0 + 2, FLOOR1 + 27, 320, S0 + 2.4, FLOOR1 + A.counterH]), boxGeo([302, S1 - 2.4, FLOOR1 + 27, 320, S1 - 2, FLOOR1 + A.counterH]),
    boxGeo([319.6, S0 + 2, FLOOR1 + 27, 320, S1 - 2, FLOOR1 + A.counterH]), boxGeo([302, S0 + 2, FLOOR1 + 27, 302.4, S1 - 2, FLOOR1 + A.counterH])]
  blk.push(boxGeo([302.4, S0 + 2.4, FLOOR1 + 26.8, 319.6, S1 - 2.4, FLOOR1 + 27.1])) // bowl bottom
  // Faucet, matte black, high arc: stem, arch over the bowl, spout end, lever
  const fy = (S0 + S1) / 2, fz = FLOOR1 + A.counterH
  const fct = [cylBetween([320.5, fy, fz], [320.5, fy, fz + 14], 0.9, 8), cylBetween([320.5, fy, fz + 14], [314, fy, fz + 16], 0.9, 8), cylBetween([314, fy, fz + 16], [310.5, fy, fz + 11], 0.9, 8),
    cylBetween([320.5, fy + 2, fz + 6], [320.5, fy + 5, fz + 10], 0.5, 6)]

  // Stools (island west side) and pendants
  const stools = [], leather = [], pend = [], chain = []
  for (const y of [ISL[1] + 34, ISL[1] + 68]) {
    leather.push(boxGeo([ISL[0] - 15, y - 8, FLOOR1 + 24, ISL[0] - 1, y + 8, FLOOR1 + 26.5]), boxGeo([ISL[0] - 16.5, y - 8, FLOOR1 + 26.5, ISL[0] - 14.5, y + 8, FLOOR1 + 38]))
    for (const [dx, dy] of [[-14, -7], [-14, 7], [-2, -7], [-2, 7]]) stools.push(cylBetween([ISL[0] + dx, y + dy, FLOOR1], [ISL[0] + dx, y + dy, FLOOR1 + 24], 0.7, 6))
    solids.push([ISL[0] - 16.5, y - 8, FLOOR1, ISL[0] - 1, y + 8, FLOOR1 + 38])
    const px = (ISL[0] + ISL[2]) / 2 - 6, py = y
    const dome = new THREE.SphereGeometry(7 * IN, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    dome.translate(px * IN, (FLOOR1 + 66) * IN, -py * IN)
    pend.push(dome)
    chain.push(cylBetween([px, py, FLOOR1 + 72], [px, py, roofUnder(px)], 0.5, 6)) // south of the loft edge (y 224): hangs from the roof boards
  }

  add(bodies, frame, `Kitchen cabinet bodies: island (kitchen face Shaker, west face beadboard), east wall run and north wall run, 24" deep 34 1/2" high (depth and height assumed; A-2 drawing 1 shows the counters, "final layout by owner", positions scaled; the layout of fridge, sink and range is from Ryan, 2026-11-06, stated). Natural light hickory, darker here to show the door gaps (${PH}, seen).`)
  add(doors, doorM, `Shaker door and drawer fronts on the kitchen base cabinets, natural light hickory about #D9B98A (${PH}, seen). Door and drawer layout and sizes assumed (cells about 18" wide); the photos show some stacks of 4 drawers.`)
  add(strips, bead, `Vertical beadboard on the island west (dining) side, about #D2AE78 (photo PXL_20260310_232308808, seen). Board width assumed.`)
  add(pulls, mats.black, `Black bar pulls on the kitchen cabinets (${PH}, seen); size assumed.`)
  add(tops, topM, 'Kitchen counter tops: dark charcoal, square edge, 1 1/2" thick, no backsplash (about #2B2D2F; photos PXL_20260310_232308808, PXL_20260510_035507610.NIGHT, seen; thickness assumed). Island overhang 12" on the west side for seating (estimated from the photo). The island is 102" x 44" (A-2 drawing 1, stated).')
  add(uppers, frame, 'Upper cabinets on the north drywall wall only, one door left of the range and three doors right of it, none over the range, none on the log wall (photo PXL_20240519_141440268.MP, seen). 12" deep, 30" high, bottom 54" above the floor (assumed).')
  add(upDoors, doorM, 'Shaker doors of the upper cabinets, natural light hickory (photo PXL_20240519_141440268.MP, seen); door size assumed.')
  add(upPulls, mats.black, 'Black bar pulls on the upper cabinets (photo PXL_20240519_141440268.MP, seen); size assumed.')
  add(stl, steel, `Stainless steel appliances (Ryan, 2026-11-06, stated; photos may be older: they show a white range and a dark sink): French-door refrigerator 36" x 30" x ${A.refH}" at the south end of the east counter (Ryan, 2026-11-06, stated place; size estimated from photo PXL_20260310_232308808); 30" range on the north drywall wall facing south (Ryan, stated; 30" assumed); dishwasher 24" beside the sink (assumed; photos show a dark front).`)
  add(blk, dark, 'Dark parts of the appliances: refrigerator door gaps, range burners, dishwasher strip, farmhouse sink bowl bottom (assumed look).')
  add(gl, std(0x0e0e10, 0.15), 'Range oven door glass, black (assumed; photo PXL_20240519_141440268.MP showed black oven glass).')
  add(sk, steel, 'Stainless farmhouse (apron-front) single-bowl sink, 30" wide, in the east counter, centred on the run between the refrigerator and the north corner, apron 1 1/2" proud of the cabinet fronts (Ryan, 2026-11-06, stated: stainless apron front; width estimated; photos show it dark and no apron, so photos may be older).')
  add(fct, faucetM, 'Matte black high-arc pull-down faucet (photos PXL_20260510_035507610.NIGHT and PXL_20240519_141440268.MP, seen); size assumed.')
  add(stools, mats.black, 'Black metal stool legs, counter height (photo PXL_20260310_232308808, seen; size assumed).')
  add(leather, std(0x8a4b2a, 0.6), '2 leather counter stools, brown/cognac, on the island west side (photo PXL_20260310_232308808, seen: 2 stools); seat 24" high, size assumed.')
  const pm = std(0x1a1a1c, 0.5); pm.side = THREE.DoubleSide
  add(pend, pm, 'Two black dome pendant lights over the island, about 14" wide (photo PXL_20260310_232308808, seen: 2; size estimated; hang height assumed).')
  add(chain, mats.black, 'Black chains of the island pendants up to the roof boards (the island is south of the loft) (photo PXL_20260310_232308808, seen).')

  // Chandelier in the great room (photo PXL_20260523_151144457.MP, seen; Ryan, 2026-11-06, stated)
  const CH = { x: RIDGE_X, y: 118, z: FLOOR1 + 110 } // bottom of the arms. Position and height estimated from the photo: hangs from the roof boards about mid-room, bottom about level with the loft railing
  const bronze = std(0x3a2a1e, 0.5, { metalness: 0.6 }), shade = std(0xf1e6c8, 0.6, { emissive: 0xffd9a0, emissiveIntensity: 0.35 })
  const chMetal = [cylGeo(CH.x, CH.y, 9, CH.z + 4, CH.z + 16, 24), cylBetween([CH.x, CH.y, CH.z + 16], [CH.x, CH.y, roofUnder(CH.x)], 0.4, 6)]
  const chShades = []
  for (const [n, r, z] of [[8, 17, CH.z], [4, 10, CH.z + 14]]) {
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * (2 * Math.PI) / n, sx = CH.x + r * Math.cos(a), sy = CH.y + r * Math.sin(a)
      chMetal.push(cylBetween([CH.x, CH.y, z + 4], [sx, sy, z], 0.5, 6))
      chShades.push(cylGeo(sx, sy, 2.5, z, z + 5, 10))
    }
  }
  add(chMetal, bronze, 'Chandelier in the great room: dark bronze ring with a pine-tree cutout band, arms and a chain up to the roof boards (photo PXL_20260523_151144457.MP, seen). ' +
    'About 36" wide and 12 lights in two tiers (counted in the photo: 8 lower, 4 upper; size estimated). Position over the middle of the great room on the ridge line and hang height estimated from the photo (low confidence).')
  add(chShades, shade, 'Chandelier glass shades, frosted cream bell shape, 12 (photo PXL_20260523_151144457.MP, seen). Shown slightly lit; no real light added.')

  // ---------- 3. stair to the loft: up going north along the west wall, landing, turn right, up going east ----------
  const lo = v(M.stairs.main_to_loft.lower_run_rect) // [14, 184, 57, 229] (A-2 d1, scaled)
  const upr = v(M.stairs.main_to_loft.upper_run_rect) // [57, 229, 123, 275]
  const R = RISE / (NL + NU + 2) // 16 risers: 4 treads, landing, 10 treads, loft floor
  const LX0 = lo[0], LX1 = lo[2], UX0 = upr[0], UX1 = STAIR_X
  const Y0 = LOFT_Y0, Y1 = upr[1]
  const dl = (Y1 - Y0) / NL, du = (UX1 - UX0) / NU
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
    `Stair main floor to loft: ${NL} treads, the landing, then ${NU} treads to the loft floor (Ryan, 2026-11-06, stated; "log stairs so the rise and run will be unusual"). ` +
    `${NL + NU + 2} risers of ${R.toFixed(2)}" for the ${RISE}" rise (rise stated; riser height worked out, not measured). ` +
    `Lower treads ${dl.toFixed(1)}" deep: the first tread starts at y ${Y0}, the north edge of the west window beside the stove (Ryan, 2026-11-06, stated; window W-west-2 y 138 to 168, A-2, stated), and the landing starts at y ${Y1} (A-2 d1, stated), so the run is worked out (inferred). ` +
    `Upper treads ${du}" deep, running east from x ${UX0} (A-2 d1, scaled) to x ${UX1} (assumed: log-stair depth; A-2 draws only 6 treads to x 123, but 10 treads need more run; ${UX1} keeps the run short of the log post at x 168). ` +
    `Tread thickness 1 1/2" assumed; photos PXL_20260310_232337640, PXL_20221020_201833908 show log stringers and half-log treads.`)
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
    `Log railing on the open sides of the loft stair: east edge of the lower run and south edge of the upper run (A-2 drawing 2 "LOG RAILING SYSTEM", stated; photo PXL_20260310_232337640, seen: log handrail and log balusters). ` +
    `It meets the loft railing at x ${STAIR_X}. Rail height 36" and log sizes assumed.`)
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
