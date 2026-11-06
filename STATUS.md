# Status

## 2026-11-05 — Phase 1 started

- No git remote exists, so there was nothing to pull.
- Plan PDF pages are in `work/pages/plan-1.png` to `plan-6.png` (200 dpi). Permit pages are in `work/pages/permit-01.png` to `permit-22.png` (150 dpi). The plan PDF has a text layer (`work/pages/plans.txt`). The permit PDF is scanned and has no text.
- Workflow `cabin-phase1` (run `wf_6091fd3c-7e3`) is running. It has one reader per plan sheet, plus permits, proposed plan and photos. Readers write `work/findings/*.md` and crops to `work/crops/`. Then one agent merges into `facts/`, and one agent re-checks the main numbers.
- Next: when the workflow is done, read `facts/questions-for-ryan.md` and ask Ryan. Then wait for his approval of Phase 1.

- `work/findings/photos-2.md` is done (the 14 new photos). None show the basement. The phone compass says the side the plans call "south" (the lake end) faces compass east. Check how the merge handled the north arrow against this.

- Basement photos (4 photos, 1 video) came from `~/Downloads/Photos-1-001 (2).zip`, copied into `source/photos/basement/`. Done: `work/findings/photos-basement.md`. All photos and the video show only the utility room. It holds a Navien gas boiler, the well pressure tank, a water softener, the electrical panel, a laundry tub, and in-floor heat manifolds. There is no furnace and no ducts. Possible conflicts with A-1: the south wall looks like a stud wall (A-1 says poured concrete), and the utility door may be at the other end of its wall. Neither photos nor video show the bathroom stub-in, the stair, or the posts.
- Finish decisions from Ryan are in `facts/finish-decisions.md` (carpet in bedrooms and on stairs, epoxy everywhere else, tongue-and-groove walls, drop ceiling with aluminum panels).
- Ceiling height: Ryan is 100% certain the basement walls are 12 ft. Use 12 ft. The plans say 10'-0" slab to main floor and 8'-6" clear; keep that only as a recorded conflict. Do not ask again.
- Stairs (Ryan): basement stair goes down to a landing, turns left, then down to the basement. Loft stair goes up to a landing, turns right, then up to the loft.
- Proposed plan (Ryan): the spa suite dimension is the total of the two spa rooms beside it, not a separate width.
- Workflow `cabin-phase1` finished (11 agents, about 1.1 million tokens). All `facts/` files exist. The check agent confirmed 13 of 20 key numbers, fixed 6, and left 4 in doubt (see the bottom of `facts/conflicts.md`).
- Update agent done: photos-basement, Ryan's answers, 12 ft walls, stair turns and spa width are in `facts/`. Stairs match the drawings. With 12 ft walls, heights above the basement are plan value + 42 in (noted in measurements.json). The proposed plan's middle row (utility, hall, bedroom) still adds to 34 ft against 26'-8" inside.
- Sent Ryan the questions in `facts/questions-for-ryan.md` (22: 14 from memory, 4 photos, 4 tape). Waiting for answers, then Phase 1 approval.
- Ryan answered the questions (stud south wall, 5x5 windows each side of slider, utility door mid east wall of utility room, Navien combi = hot water, black tank = filtration, no sump, open log railing at stair top, foam on all concrete walls, trusses about 1 ft). Menards window order copied to `source/orders/menards-windows.pdf`. An agent reads it and adds the answers to `facts/`.
- Done: window order in `work/findings/menards-windows.md`. Basement lake-wall windows are 60x60 sliders (order beats plan 6'-0"). Slider not in the order, keeps plan size 6'-0" x 7'-0". With 1 ft trusses (assumed) the main floor is about 158" above the slab. 13 questions remain, none block Phase 2.
- `facts/measurements.json` is valid JSON (checked after clearing temp space).
- Asked Ryan to approve Phase 1. He is compacting the session and setting effort to high. Next session: confirm he approved Phase 1, then start Phase 2 step 1 (basement as it is now). Then remind him to set effort to high.

## 2026-11-05 — Phase 2 started
- Ryan set effort to xhigh, compacted, and said "You are good to proceed!" Phase 1 is approved.
- Step 1: 3D model of the basement as it is now. App: Vite + plain Three.js at the repo root (`index.html`, `src/`). The model is built from `facts/measurements.json`.
- Step 1 built. `src/basement.js` builds the basement from `facts/measurements.json`; `src/main.js` has the overview (orbit) and walk mode (W A S D, steps and walls work). Sizes nobody measured are in the `ASSUMED` block at the top of basement.js; every part has a hover label with its source.
- Stair: 21 steps worked out for 12 ft walls (158 in rise, 7.52 in each). Upper run keeps 6 treads; lower run gets 13, so the bottom step is at y 88.1 (66 in closer to the lake than drawn).
- Run `npm run dev` to view (http://localhost:5173). Run `npm run check` for the browser check (stair numbers, walking rules, no console errors; screenshots to `work/shots/`). It uses the system Chromium at /usr/bin/chromium.
- Textures and sky from Poly Haven (free to use) are in `public/textures/` and `public/hdri/`.
- A reviewer agent is comparing the model to the facts; report goes to `work/findings/review-step1.md`.
- Ryan looked at step 1 (2026-11-05). He confirmed the basement is not finished: the bathroom is not framed, only the drains exist. The model already shows it that way. He agreed step 2 is next. He compacted before step 2.

## 2026-11-05 — Step 1 review fixed, step 2 started (after the compact)
- Reviewer report `work/findings/review-step1.md`. Fixed: removed the water softener and brine tank (they do not exist; the black tank is the filter); removed the assumed post under the landing; added the dark gray board-and-batten siding outside the lake wall; added the PVC drain stack beside the boiler; stair posts stop under the beam; trusses bear on the walls with a 3" rim at the outside face; lower stringers start at the slab; label fixes (posts, utility room size, furring, window sill confidence, panel position unsure, bath water lines not drawn). Fixed `facts/proposed-vs-existing.md` (bath walls do not exist). Not done (cosmetic): the center post still overlaps the utility wall corner framing; window rough opening 60 1/2" vs 60"; ceiling drain pipes in the utility room (no positions known).
- Shared code moved to `src/geo.js`. It also holds the values every part must agree on: `up()` (plan height + 38), `FLOOR1` 158, `LOG_BASE` 156, `roofTop(x)`/`roofUnder(x)`/`ROOF_DEPTH` 18 (assumed), `WALL_TOP` about 286 (roof underside at the outer log face), `gradeAt(x, y)` (assumed ground shape: 134 at the north wall, a level pad at slab height for 22 ft in front of the walkout (Ryan), mulch under the deck, grass past it, earth banks at about 1 in 2 beside it (no retaining walls anywhere, Ryan), lake surface about -61 at 123'-6" south).
- Parts: `src/shell/ground.js`, `walls.js`, `roof.js`, `porch.js`, each `export function buildX() -> { group, solids }`. `src/main.js` joins them; the checkbox "Show the cabin above the basement" hides walls, roof and porch (the ground always shows). Views: overview (outside, from the lake side), driveway, basement (cabin hidden), top, and the walk views.
- Screenshots of any camera: `npm run shot -- work/shots/<name> '[{"name":"a","cam":[x,y,z],"target":[x,y,z]}]'` (one at a time through a lock, to save memory; the computer has about 2 GB free).
- Workflow `cabin-shell-step2` (run wf_7736451b-5d2; two earlier runs were stopped before any part was built, to apply Ryan's ground corrections) builds the four parts, reviews each, and fixes what the review finds. Started 2026-11-05.

- Workflow finished (12 agents: 4 build, 4 review, 4 fix). Main session then fixed: porch roof shine to match the main roof, porch floor slot along the house wall, deck beam end, far-ground trough, two labels, basement lights no longer reach the lake, overview camera. `npm run check` passes (106k triangles in the overview). Textures added by the agents (Poly Haven CC0, not committed; ask Ryan): leafy_grass, gravel_floor_02, wood_chip_path, coated_pine, roof_slates_03, wood_planks, rough_wood (rough_wood looks unused). public/textures is 21 MB.
- Ryan asked to look at it (2026-11-05). A fresh reviewer agent checks the joins between parts and walk mode; report goes to `work/findings/review-step2.md`.

- Ryan looked at step 2 (2026-11-05): "everything looks good and perfectly in ratio with the actual cabin". One thing wrong: the model has a stair down from the deck (the plans' deck stair at the east end of the south deck, in `src/shell/porch.js`). It does not exist. The only outside stair down is on the north side, from the north landing toward the driveway, and it has 5 steps (the model has 4). Facts files updated; question 24 asks for one step's height.
- Ryan's idea (2026-11-05): keep the cabin as it sits as the base, and build variations off it, so he can quickly switch between them and compare.

## 2026-11-05 — Versions and interiors (Ryan stepped away; work goes on phase by phase)
- Ryan: work without him in phases. Use Sonnet subagents at lower effort, check each phase, keep STATUS.md current. No commits.
- Version switch added (main session): buttons at the top of the page (and the V key) pick "As it sits", "Proposed basement" or "Proposed basement, finished". In `src/main.js`, VERSIONS lists the versions; each turns on layers. A layer is `build(base) -> { group, solids, hide, ceiling? }` in `src/variants/`. All layers are built at the start, so switching is instant. The walker's solids change with the version. `npm run shot` takes `"version": n`. New button "Walk the main floor" (view walk-main).
- `npm run check` now also uses the lock (one browser at a time).
- Workflow `cabin-interiors-versions` (run wf_a13813a6-3fe, Sonnet agents, medium effort): builds `src/shell/interior.js` (main floor inside: partitions, doors, island, loft stair, wood stove), `src/variants/proposed-basement.js` (proposed layout; also writes work/findings/proposed-layout.md), then `src/variants/basement-finish.js` (carpet, epoxy, tongue-and-groove, drop ceiling, stair carpet). Each is built, reviewed and fixed.
- Ryan (2026-11-05, while away): keep going all night. Added work: trees and landscaping that match the photos, a much bigger lake (it looked like a pond), and in the proposed basement, floor-to-ceiling walls along the open sides of the basement stair (not a railing) that make a storage room or hidden room under the stair, with one wall a Northwoods mural (misty pines, fog at the top, darker pines at the bottom). Later: a cleanup phase (Ponytail or similar) so the code stays easy to maintain.
- Workflow `cabin-yard-stairwalls` (run wf_b8856dcc-e81, Sonnet, medium): `src/shell/landscape.js` (new, always shown; notes in work/findings/landscape.md) plus the lake in `src/shell/ground.js`; `src/variants/stair-walls.js` (new layer in versions 1 and 2; exports WALLS; mural painted in code on a canvas).
- After both workflows: add the stair walls' WALLS to the tongue-and-groove in `src/variants/basement-finish.js` (faces without the mural), and check that the stair walls and the proposed layout do not overlap.
- Ryan's fans were loud (2026-11-05): the headless test browser draws in software and used about 6 cores. Fixed: `scripts/chromium-low.sh` runs it on 2 cores at low priority; `src/main.js` draws only when the picture changes (`changed()`); the test server has no hot reload, so file edits do not reload a running test.
- Walk mode controls (Ryan: "make it like minecraft"): W A S D walk, drag with the mouse to look, or click once to steer with the mouse (Esc to stop), left and right arrows turn, up and down arrows walk, Shift faster. Test script: scratchpad walktest.mjs (camera direction changes after a drag and after the left arrow).
- Both workflows finished (2026-11-06, 15 agents). Built: `src/shell/interior.js` (partitions 4.5" from z 158 to 254, door openings with open leaves, kitchen island and east-wall counters from A-2, loft stair 15 risers to the loft landing, wood stove and pipe to the chimney, log guard rail at the south edge of the basement stair opening); `src/variants/proposed-basement.js` (exports ROOMS, WALLS; sizes chosen to fit are labeled "proposed fit by the model, not decided by Ryan"; table in work/findings/proposed-layout.md); `src/variants/basement-finish.js` (carpet in the bedroom, epoxy elsewhere, tongue-and-groove on the room side of outside and new walls, aluminum drop ceiling at 120" in the `ceiling` group, stair carpet); `src/shell/landscape.js` (seeded trees: white pine, spruce, birch, maple; shrubs, rocks, shore grass, path, dock and pontoon; notes in work/findings/landscape.md); `src/shell/ground.js` lake: far shore half a mile south, sides about 3000 ft out (assumed), exports heightAt; `src/variants/stair-walls.js` (stairwell walls slab to ceiling, room under the stair with a hidden door in the south wall of the upper run, canvas mural on the east face of the lower-run wall).
- Main session joins: the walker stands on `heightAt` (ground.js) outside the foundation, never below the lake surface (makeWalker takes a `floor` function); the check's straight-down ray skips hidden layers; the finish layer puts boards on the two stair-wall faces seen from the open basement; questions 25-32 added to facts/questions-for-ryan.md.
- Main session checked screenshots of every version (work/shots/int/). Good: proposed layout, finished version, mural, main floor, loft stair, gable. Problems: trees blocked the overview and driveway views and looked like cartoons (pastel blobs); tongue-and-groove too orange. Changed the boards to light natural pine (plywood texture, 0xf0d6a8). A Sonnet agent is rebuilding the tree shapes and colours from the photos and clearing the camera sight lines (landscape.js only). A second Sonnet agent does a read-only cleanup audit to work/findings/cleanup-audit.md; apply its safe items after the tree agent is done.
- Trees rebuilt from the photos (tall thin trunks, high clumped crowns, dark spruces, fall colours, grass tufts, granite rocks; sight lines kept clear for the overview and driveway views). It raised the overview to 1.4M triangles. Tongue-and-groove now a painted light knotty-pine canvas texture with 5 1/2" boards (basement-finish.js pineBoards()). `rng(seed)` added to geo.js.
- Cleanup agent (Sonnet) applies the audit's "Do first" items (shared materials in geo.js, texture cache, shared basement wall faces, shared helpers, dead code incl. the unused `hide` layer feature, facts instead of typed numbers), proves no visible change with before/after screenshot diffs (work/shots/clean/), then cuts the overview under 900k triangles.

## 2026-11-06 — Phase done: interiors, versions, yard, cleanup
- Cleanup applied (audit items 1-8): shared materials and helpers in geo.js, texture cache in pbr(), basement wall faces exported from basement.js, dead code removed (incl. the unused `hide` layer feature and rough_wood textures), facts read instead of typed numbers. Before/after screenshot diffs showed no visible change (work/shots/clean/). Overview cut from 1.4M to 872k triangles (simpler far trees, grass tufts).
- Main session: tongue-and-groove is a painted light knotty-pine texture; basement bulbs halved (intensity 30) so light finishes do not wash out; lock path works from any folder.
- Verified: `npm run check` all ok (872k triangles); walking routes all pass: great room up the loft stair to the loft (z 272), basement slab up to the main floor with the stair walls, into the hidden room under the stair, walkout down the path onto the dock, around the outside to the driveway stair. Walk controls tested (drag look, arrows turn, W walks).

## 2026-11-06 — Loft stair fixed from Ryan's photo PXL_20221020_201833908
- Lower run now has 5 steps, then the landing (Ryan). With the plan's 11" treads it starts at y 174, past the window beside the stove (was y 154, too close to the stove). 13 risers of 8.8" (upper run 6 treads as drawn; question 33).
- The main-floor opening for the basement stair now starts at the first loft step (y 174), so there is floor in front of the stair. basement.js imports LOFT_Y0 from interior.js.
- Full log railing at floor level along y 229 from the landing corner post to x 168 (posts, top and bottom rail, balusters). Replaces the short top rail and the hidden wall.
- Verified: `npm run check` all ok; walking routes all pass; screenshots work/shots/loftstair-front.png and -stove.png match the photos' layout.

## 2026-11-06 — Ryan's inline answers applied (Ryan away; said "commit and push", no more questions)
- Ryan answered everything inline in facts/questions-for-ryan.md, plus extra fixes. A Sonnet agent moved the answers into facts/ and rewrote the questions file (no open questions now).
- Heights: truss 16" (Ryan picked the plan's 1'-4"), so FLOOR1 162, RAISE 42, LOG_BASE 160. Concrete walls 10". Basement posts 6x6 (log posts upstairs stay 14").
- Basement stair: 9 treads, landing, 9 treads = 20 risers of 8.1" (stairPlan reads `stairs.basement.risers / treads_*`). Upper run now ends at x 157.8; bottom step y 132.1. Stair walls (stair-walls.js) follow it: end wall at the upper run end, hidden door moved into the east end wall (Ryan: "facing east").
- Missed wall from Ryan's screenshot (source/photos/screenshot-2026-11-06_08-35-30.png): the bare studs of the utility room south wall, east of the stair. proposed-basement.js adds a drywall skin there (in WALLS), so the finish layer boards it.
- New basement walls 4" (2x4 studs + 1/4" drywall each side, Ryan); T&G 3/4". Main-floor partitions stay 4.5" because Ryan's bedroom sizes use 4.5".
- Drop ceiling: the grid tees sat above the panels and showed only as broken dots. Now the grid hangs at 120" with panels 1/4" above it; 24" x 24"; wall angle around walls and openings only.
- No chinking (logs are hand scribed): removed from walls.js; gable backing uses the log end colour.
- Main floor: bedroom partition x 182-186.5 (master 169", guest 136.5"). Kitchen rebuilt from Ryan + photos (source/photos/kitchen/, work/findings/kitchen-photos.md): sink (stainless farmhouse) and fridge (south end) on the east counter, range on the north drywall, hickory Shaker cabinets, charcoal tops, uppers on the north wall, island with overhang, 2 stools, 2 pendants. All stainless (Ryan beats the photos, which show a white range).
- Loft stair: 4 treads (about 15", first tread at the north edge of window W-west-2, y 168), landing, 10 treads of 10" (assumed) to the loft at x 157 (STAIR_X, exported from interior.js, used by roof.js). 16 risers of about 7.1".
- Lake: Ryan guessed "125 feet"; a photo check (work/findings/lake-distance.md) puts the far shore at 2,000-5,000 ft, so the half mile stays. Recorded in conflicts.md.
- `npm run check` now also walks slab to main floor and main floor to loft (all ok, no console errors). Screenshots: work/shots/bsmt-*.png, kitchen-*.png, loft-*.png.

## Next session: start here
1. Tell Ryan what changed (entry above). Committed and pushed to main as he asked.
2. Possible next work, only if Ryan wants it: the outside items (he said "last"), more finish sets as versions, real mural artwork, lighting fixtures, main-floor stools/sink details beyond the kitchen.
3. Audit items not done are in work/findings/cleanup-audit.md.

## Answers from Ryan (2026-11-05)
- Direction (Ryan, settled): the cabin is on the north side of the lake. The walkout faces the lake to the south. The gravel driveway is on the north side. This matches the plans' "south" = lake end. The phone compass data in photos-2 said east; Ryan's answer wins. Record the photo reading in facts/conflicts.md only.
- They dug into the hill. The basement is almost fully underground on the driveway (north) side, and the walkout to the lake is flat.
- The stair from the driveway up to the deck at the road end was built later. It is not on the plans.
- Basement today: stairs, a utility room, and a stubbed-in bathroom (drain and water lines only). Nothing else is built.
- The cabin was built as drawn in the 11/22/21 plans.
- Ryan is not at the cabin and will not be for a while. Keep tape-measure questions to the few that matter most.
- Proposed basement: the rooms are fixed, the sizes can change some. No cold plunge; that space becomes a recovery room (later: massage chairs and similar).
- The utility room and the bathroom stub-in stay where they are.
- The 3D model is only for Ryan and Emily, run on Ryan's computer. No hosting.
- 14 more photos came from `~/Downloads/Photos-1-001 (1).zip`, copied into `source/photos/` (17 photos now). A separate agent reads them into `work/findings/photos-2.md`. If the merge ran before that file existed, merge it into `facts/` afterward.
- Sauna: electric heater (needs a 240 volt circuit).
- Bedroom: no egress window. Ryan and Emily checked the code; it passes. Settled. Do not bring it up again.
- Entertainment area contents: decide later. Do not ask design-detail questions during Phase 1.
- Old note: Ryan said to use the zip. `~/Downloads/Photos-1-001.zip` holds only the same 3 photos already in `source/photos/`. Ryan will look for more if asked.
