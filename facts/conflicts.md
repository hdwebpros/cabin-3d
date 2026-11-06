# Conflicts between sources

Each item gives both values and both sources. Nothing here is settled silently. "Working value" is what `cabin-facts.md` and `measurements.json` use until Ryan answers.
Directions are real compass directions: the lake wall faces south, the driveway is north (Ryan, 2026-11-05, stated).

## Top conflict: basement wall height

- Ryan: the basement walls are **12 ft** tall, 100% certain | Ryan, 2026-11-05 | stated. **Working value for the 3D model: 12 ft (144")**, read as top of slab to underside of the floor framing. Do not ask Ryan again.
- Plans: **10'-0" floor to floor** (lower level 90'-0" to first floor 100'-0") | A-4, A-5, A-6 level marks | stated
- Plans: **8'-6" clear** from the top of the slab to the underside of the first-floor framing | A-6 section | stated
- Difference: 144" - 102" = **42" (3'-6") more height** than the plans.
- The drop ceiling (finish-decisions.md) must hang below the boiler pipes, the drain and vent pipes and the in-floor heat lines under the floor above, so the finished ceiling will be lower than 12 ft.

### Heights that change because of this (work these out from the drawings)

With 144" clear plus the 18" floor build-up drawn on A-6, the first floor is about 162" (13'-6") above the slab, not 120".
**Update with Ryan's truss depth (Ryan, 2026-11-05, about 1 ft, assumed: he is not sure):** 144" + 12" truss + about 2" subfloor = **about 158" (13'-2")**, so the first floor is about **38"** higher than drawn (was 42"). Working value: 158 (`levels_z.first_floor_ryan_check`, `levels_z.ryan_basement_offset` = 38). Plan truss: 1'-4" (A-6, stated). Measure on the next visit (question 1).
Two ways this can be true:
- (a) The slab is 42" lower than drawn, and everything from the first floor up stays where the plans put it relative to the ground.
- (b) The slab is where drawn, and the whole house above it is 42" higher.

Each item below changes with that choice:
1. **First floor z** = about 158" instead of 120". All main-level, loft and roof z values in measurements.json are plan values from the slab; add 38" to each (`levels_z.ryan_basement_offset`).
2. **Grade at the north wall.** Plans: 98'-0", 8'-0" above the slab and 2'-0" below the first floor. Reading (a): grade stays 2'-0" below the first floor, so about 11'-6" above the slab. Reading (b): grade stays 8'-0" above the slab, so the first floor is 5'-6" above grade on the driveway side. Photos of the road gable show the bottom log close to the ground, which favors (a). Ryan says the basement is almost fully underground on the driveway side, which fits (a).
3. **Grade lines on the side walls and at the lake corners** (A-4 East, A-5 West): all shift with the same choice. The walkout at the lake stays at slab level (Ryan: flat walkout).
4. **Basement lake wall openings.** Plans: window and slider heads at 7'-0", windows 5'-0" high with a 2'-0" sill. With a 12 ft wall, either the heads stay at 7'-0" and about 5'-0" of wall sits above them, or the openings are higher. The photo PXL_20250905_215819202 shows a framed wall above the slider header. Head heights cannot be worked out from the drawings; keep 7'-0" until a photo or tape shows otherwise. The wall is wood framed and can be changed freely (Ryan, 2026-11-05), so this does not block the design.
5. **Basement stair.** Plans: 120" total rise, 13 treads, 15 risers. A 158" rise needs about 21 risers at about 7 1/2", so about 6 more treads (about 5'-6" more run). The landing turn matches Ryan's description, so the extra treads are in the runs: run A may end closer to the lake than y 12'-11", or the runs start higher. Question 22 (count the steps).
6. **Foundation wall height.** Plans draw about 10'-0" of concrete. Under reading (a) the north, east and west concrete walls are about 3'-6" taller. Footing depth below the slab is not affected.
7. **Grade to peak height.** Permit p05 says 26 ft and the plans give 26'-2". Reading (a) keeps this; reading (b) adds about 3'-6", which would not match the permit.
8. **Proposed plan 10'-0" ceiling** now fits under the framing (see proposed-vs-existing.md).

## Other conflicts

1. **North foundation width. Resolved: 28'-0"** (Ryan confirmed 28 x 46 ft, 2026-11-05). A-4 North elevation writes "30'-0" FOUNDATION". A-1, A-2, A-3, A-5, A-6 (scaled), permit p05 and the title-block area (1288 SF = 28 x 46) all give 28'-0". The drawn faces on A-4 also scale 28'-0"; the 30'-0" extension line sits 2'-0" outside the drawn wall. Working value: 28'-0" (likely a drafting error).

2. **Which way is north. Resolved in favor of Ryan.** The phone compass in 11 photos says the lake gable faces compass east (for example PXL_20260523_152023253 at 103 degrees looking at the lake wall from inside; PXL_20261009_180844424 at 278 degrees looking back at it from the lake). Ryan says the lake wall faces south and the driveway is north (Ryan, 2026-11-05, stated). The plan elevation names and the permit p09 and p11 north arrows agree with Ryan. All files use Ryan's directions.

3. **Grade at the south (lake) corners.** A-5 West and A-4 East draw grade dropping to about 95'-11" at both south corners (about 5'-11" above the slab), which would bury most of the lake-end side walls. A-5 South draws the lake wall fully exposed down to 90'-0" with "RETAINING WALL AS REQUIRED" at each side. Photos PXL_20260703_223907684 and PXL_20261009_180831582 show the lawn at lower-floor level along the lake wall and rising up both sides. Working value: lake wall face at z = 0; corners at z = 71" (scaled) until checked. Ryan: they dug into the hill and the walkout to the lake is flat (Ryan, 2026-11-05, stated); this does not give the corner grade. Question 18. Ryan (2026-11-05, stated): there are no retaining walls anywhere on the property, so the ground slopes down beside the walkout.

4. **First-floor system depth.** A-6 section writes basement clear height 8'-6" and floor system 1'-4", which adds to 9'-10". The level marks give 10'-0" (90'-0" to 100'-0"). The drawn floor system scales about 1'-6". 2" is not explained. A-6 also says "confirm floor truss style and depth with owner". Plan value: underside of floor at z = 102" (8'-6"). The working value is now Ryan's 12 ft (top conflict). The floor build-up depth still matters for the first floor height; question 1 (truss drawings).

5. **Foundation wall thickness.** A-1 note: "8" MIN". A-6 detail 5 label: "8-10"" and two 10" dimensions. A-1 and the A-6 section draw about 8". The utility room size (13'-6 1/2" to the 14'-0" centerline partition) fits 8". Working value: 8". Question 21.

6. **Log diameter.** Title block: 18" average; A-2, A-3 and the A-6 section draw 18". A-6 details 1 to 4 draw about 14". Working value: 18" (details are generic).

7. **Eave overhang.** A-6 detail 4: "3'-0" UNLESS NOTED OTHERWISE". A-3 roof plan, A-4 North and the A-6 section: 3'-6". Working value: 3'-6" (the "noted otherwise" value).

8. **Main-level lake wall openings.** A-5 South draws three 6'-0" two-panel units with "5'-0"" high and "2'-0"" sill dimensioned beside the east one, so they read as three windows. A-2 tags the center one as a 72" sliding door. Photos PXL_20260523_152023253 and PXL_20260311_135523110 show window, sliding door, window. A-2 draws the east one as two 3'-0" units; photo PXL_20261009_180831582 read it as one picture window. Working value: windows 5'-0" x 2'-0" sill at the sides, door in the center (height unknown).

9. **Porch wall height.** A-4 North: 8'-4". A-4 East: 8'-3". A-6 section: porch ceiling 8'-8" (may measure a different point). Working value: 8'-4".

10. **Main roof slope length.** A-4 and A-6 write 23'-8". Geometry from the ridge (14'-8" above the loft floor) and 3'-6" overhang at 10/12 gives about 22'-9". Probably measured to a different point (roof surface or past the fascia). Working value: build the roof from pitch and overhang, not from 23'-8".

11. **Loft edge.** A-2 drawing 2: 27'-4" VFY from the north foundation line. A-2 drawing 1 "LINE OF LOFT OVERHEAD" scales about 27'-9". Loft area: title block 710 SF; scaled from A-3 about 697 SF. Working value: 27'-4" (east half).

12. **Deck area.** Title block: 509 SF. Parts drawn on A-2 add to about 513 SF (south deck 440, east strip 24.6, north landing 48.8). Small.

13. **Main-level bath labels.** A-2: the room labeled "BATH" has a shower; the room labeled "3/4 BATH" has a tub. Normally the 3/4 bath is the shower-only one. Labels may be swapped; geometry does not change.

14. **Main-level west bath window.** A-5 West shows a 2'-0" x 2'-0" window with a 5'-0" sill, about 16'-2" to 18'-2" from the north line. A-2 dimensions a 2'-0" segment at the same spot but draws no window symbol. Working value: window exists. Question 12.

15. **Porch outer (east) wall.** A-4 East: 4 window units, each 5'-0" x 5'-0", 2'-0" sill. A-2: 8 panels at 3'-9" between 5 posts at 7'-6". A-4 North and A-2: the porch entry door (36") is on the porch north wall. Photos PXL_20261101_163027116, PXL_20261009_181108106 and PXL_20251004_135433269: 3 two-panel sliding windows and a white door with a half-round light near the house wall, on the long face. Question 11.

16. **Deck stairs.** A-4 East and A-5 South: a deck stair at the east end of the south deck. A-2: steps north off the porch landing. Photos show a stair at the north end of the porch deck down to the driveway. Ryan: that driveway stair was built later and is not on the plans (Ryan, 2026-11-05, stated). Still open: was the lake-end stair on A-4 and A-5 built? Question 11.

17. **Lower lake wall construction. Resolved: wood stud wall, not concrete. It can be changed freely and will get tongue-and-groove** (Ryan, 2026-11-05, stated). Earlier text: A-1 draws the lake wall as 8" poured concrete with 2'-6" piers between three 6'-0" openings. A-5 South draws four posts or pilasters about 1'-2" wide. Outside photos show dark gray board-and-batten siding over the whole lower lake wall. The inside photo PXL_20250905_215819202_southwall.jpg shows a wood stud wall with R19 batts from the floor up, also between the openings where A-1 draws concrete piers; no concrete is visible, but a short concrete wall at the bottom is not ruled out. Ryan says the cabin was built as drawn. Questions 2 and 17.

18. **South deck west edge.** A-2 and A-1: deck starts at the west foundation line (scaled flush). A-5 South: deck starts about 1'-10" west of the west foundation line (scaled). Working value: flush (A-2 also states 36'-8" overall from the west foundation line).

19. **Wall base detail.** A-6 detail 5 shows a half sill log on a framed floor (LVL rim, subfloor) on top of the foundation. The A-6 section draws full round wall logs starting at the first floor. Photos at the road gable show a tan board band under the bottom log. Not a number conflict.

20. **Lower level elevation in hidden text.** The A-6 PDF text layer has a hidden "LOWER LEVEL 89'-6"" under the detail graphics. All visible marks say 90'-0". Working value: 90'-0" (89'-6" is likely the footing top / slab bottom).

21. **East log wall thickness.** A-2 draws the house wall next to the porch about 13" thick; the other log walls are about 18". No note explains it. Question 13.

22. **Kitchen sink.** A-2: sink and dishwasher in the island ("FINAL LAYOUT BY OWNER"). Photo PXL_20260523_151144457.MP: sink on the east wall under a mirror. This moves the drain line in the basement ceiling. Question 10.

23. **Top of the basement stair. Resolved: open, protected by a log railing on the main level, no door** (Ryan, 2026-11-05, stated). Earlier text: A-2: the stair top is a 3'-9" VFY space with a 30" door facing the kitchen. Photo PXL_20260310_232337640: a log guard rail at floor level next to the TV, which may be an open stair top. Question 8.

24. **Site fall vs plan grade.** Permit p17 (septic sketch, local datum) gives about 100.75 at the north wall and about 96 to 98 just south of the house, a fall of about 3 to 5 ft. The plans need 8'-0" of fall from the north grade (98'-0") to the walkout slab (90'-0"), with retaining walls "as required". Different datums; the p17 sketch is not to scale.

25. **House to lake distance.** Permits p09 and p11: 123'-6". Permit p17 scales about 158 ft (sketch). The p17 house box also scales about 40 x 38 ft instead of 28 x 46. Working value: 123'-6".

26. **Height grade to peak.** Permit p05: 26 ft. Plans: 98'-0" to 124'-2" = 26'-2". Small.

27. **Address.** Plan title blocks: 8585 W Teal Point Ln. Address number on the porch log post in photos PXL_20251004_135433269 and PXL_20261009_181108106: "8539". Question 14.

28. **Lower-level stair labels on A-1.** Drawing 1 calls the open area "STORAGE"; drawing 2 calls it "UNFINISHED LOWER LEVEL". Same space.

29. **Deck footing at Y 8'-8".** A-1 drawing 1 shows only a dashed footing circle 8'-8" south of the north line on the east post line; drawing 2 shows no post there.

30. **West wall dimension start.** A-2 west wall north chain starts about 4" south of the north foundation line; the overall 22'-6" starts at the line. Window W1 offset could be 38'-6" or 38'-2" from the south corner.

31. **Proposed plan vs real basement.** Every difference is in `proposed-vs-existing.md` (ceiling 10'-0" vs 8'-6", utility 15'-6" vs 13'-6 1/2", widths that add to 34'-0" on a 26'-8" inside width, stair in the entertainment area, and more). The proposed plan also contradicts itself (lake-wall string adds to 20'-0", area counts the utility room twice, "DOWN" on a basement stair, 4'-0" hall drawn about 11 ft wide); see `work/findings/proposed.md`.

32. **Mechanical equipment and heat.** A-1 shows no equipment and does not mention in-floor heat. The basement photos and video show, all in the utility room: a Navien wall-hung gas boiler, a well pressure tank, a water softener, the electrical panel, a laundry tub, and in-floor heat manifolds (one feeding the main floor, one feeding tubing in the basement slab). There is no furnace and no ducts. The proposed plan shows a furnace ("FURN"); there is none. Ryan (2026-11-05, stated): the Navien is a combi unit (boiler and instant hot water), so there is no separate water heater (the proposed "WH" does not exist either); the black tank read as a water softener is a whole-house water filtration system; there is no sump pit and no sewage pump. Sources: PXL_20221016_151511095.jpg, PXL_20250405_200342711.mp4, PXL_20260905_012801106.MP.jpg (seen). Not a number conflict; recorded in cabin-facts.md sections 4 and 12.

33. **Foam and furring on the east wall. Resolved: pink foam is on every basement wall except the south walkout wall** (north, east and west are concrete; all will be covered with tongue-and-groove) (Ryan, 2026-11-05, stated). Earlier text: A-1 draws the future furring wall with rigid insulation on the west and north walls only. Photos PXL_20250905_215819202.jpg and PXL_20250906_011045382.MP.jpg show pink FOAMULAR 250 foam with a wood furring grid built on the full east wall; PXL_20221016_151511095.jpg shows the same on the west wall in the utility room. The north wall is not in any photo. Question 7.

34. **Utility room door position. Resolved: about in the middle of the utility room's east wall** (Ryan, 2026-11-05, stated). The utility room is on the west wall. Working position: y about 27'-5 1/2" to 30'-5 1/2" (centered on the room). Both earlier readings were wrong: A-1 puts the 36" door near the south end (y about 24'-4" to 27'-5"), and the 2022 photo PXL_20221016_151511095.jpg was read as an opening at the north end.

35. **Window sizes: Menards order vs plan-written sizes.** Source: `source/orders/menards-windows.pdf` (saved design, printed 9/6/2021, before the 11/22/21 plans); details in `work/findings/menards-windows.md`. The order has no room labels, so each match is inferred from size and operation. The order wins where it applies.
   - **Basement W-L1 and W-L2:** plan 6'-0" wide x 5'-0" high (A-1 width, A-5 South height, stated). Order lines 500-1 and 600-1: 60" x 60" unit, RO 60 1/2" x 60 1/2" (stated). Ryan remembers about 5 x 5 ft. **Width differs by 12"; height agrees. Working value: 60" x 60".**
   - **North loft gable G-N1, G-N2:** plan 2'-6" x 4'-0" (A-2 d2, A-4, stated). Best match: casements 200-1 and 300-1, 36" x 48". Width differs by 6". If these casements are bedroom 2's window N3 instead (plan 4'-0" wide), the pair is 72" wide, 24" more than the plan. measurements.json keeps the plan values for main-level and loft openings.
   - **Second 60" x 48" slider (line 400-1):** no plan opening of that size except W1. Candidates N3 or E1 (both plan 4'-0" wide).
   - Exact matches (no conflict): S3 = 2 x 36" x 60" (700-1); west bath window = 24" x 24" fixed tempered (800-1); W1 = 60" x 48" (400-1); N1, N2 and N3 as two units = 4 x 24" x 48" (100-1).
   - Not in the order: main S1, west great-room windows, E1, the 4 lake gable windows, porch windows, and all doors (including the basement slider D-L1, which keeps its plan 6'-0" width).
   - If N3 is two 24" x 48" single hung units, bedroom 2 has no egress window (the order marks that unit "does not meet egress"). Main-floor only; not needed for the basement design.

## Check pass fixes

Independent check, 2026-11-05. Method: the vector lines and dimension tick marks in the plan PDF (exact to about 1/4"), plus the text layer. 20 key numbers checked. Fixes:

1. **Utility room width.** The "13'-6 1/2"" dimension on A-1 has its ticks on the inside face of the west wall and on the **east** face of the centerline partition. It includes the partition. Clear width = about 13'-1 3/4" (was called "clear 13'-6 1/2""). The 11'-3 1/2" is a true clear size. Fixed in both files.
2. **Utility room position.** Drawn wall faces are y 23'-3 1/2" and 34'-7 1/4" (was 23'-5" and 34'-8 1/2", worked out from the wrong side). Fixed in both files.
3. **Partition thickness.** Drawn 4 1/2" (2x4 plus drywall), not 3 1/2". Bath and utility east edges moved to the partition's west face (x 13'-9 3/4"). Fixed in both files.
4. **Grade on the east wall.** A-4 East grade line is flat for 24'-8" from the north corner, not 25'-8". West wall is also 24'-8" (was 24'-7"). Both now y = 256". Fixed in both files.
5. **Basement slider height.** The frame head is drawn at 7'-0", the same as the windows. 7'-3" (87") was the top of the trim. Height now 84". Fixed in both files.
6. **Basement stair.** 13 treads are drawn (7 + 6), so 15 risers at 8.0", not "likely 16 at 7 1/2"". Run A sits 4.8" in from the concrete (stair wall face x 12.8") and ends at the west face of the stair posts. Stair rectangles in measurements.json moved to the drawn lines. The stair question was updated (now question 22).
7. **Floor system (item 4 above).** Not a number change. On A-6 the 1'-4" dimension starts 2" below the first-floor line and the 8'-6" dimension starts where it ends. So 8'-6" + 1'-6" = 10'-0"; the 1'-4" is likely the truss only. measurements.json had 102" + 16" = 118", short of 120"; a note now explains the 2".
8. **Added from the drawing:** posts drawn 8" x 8"; toilet symbol position (x about 25", y about 440"); positions of the four basement interior doors (were null).

Confirmed with no change: 28'-0" x 46'-0" footprint; 8" wall on A-1; 8'-6" clear (ticks checked); levels 90'-0", 98'-0", 100'-0", 109'-6", 124'-2"; stair width 3'-10"; three post positions (14'-0"/23'-6", and the 5'-3" line at 18'-9" and 13'-2"); stair beam 5'-7"; lake wall openings at 2'-6", 11'-0", 19'-6", 6'-0" wide; window 5'-0" high, 2'-0" sill; grade 5'-11" above the slab at both lake corners; floor drain (4'-0", 30'-0"); shower drain (3'-2", 42'-4").
