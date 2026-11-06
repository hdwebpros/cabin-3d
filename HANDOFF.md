# Handoff: Boog cabin 3D model and basement finish

Written 2026-11-05 by the Claude session in `~/Work/happydog.digital`. Read this whole file before you do anything.

## Goal

Ryan and Emily Boog own a log cabin on Teal Lake (Hayward, WI area, per the plan title block). The footprint is 28 ft by 46 ft. They are going to fully finish the basement (the plans call it the "lower level"; it walks out to the lake through a patio slider).

The project has two parts:

1. **First: understand the cabin.** Read every source file and write down how the cabin is built, with exact measurements and where each number came from. No 3D work starts until this is done and Ryan has looked at it. Ryan asked for this order on purpose.
2. **Then: build a 3D model** that Ryan can walk through in a browser and restyle (layout, paint, flooring, furniture, fixtures). First the cabin as it is now, then the proposed basement as a switchable option.

## Source files

All originals are in `source/`. They are gitignored (private house plans, large photos). Never edit or move them. Write any converted copies (page images, crops) to `work/`, which is also gitignored.

| File | What it is |
|---|---|
| `source/plans/Boog Plans_11.22.21.pdf` | 6-sheet construction set dated 11/22/21, sheet size 36x24 in. A-1 foundation plan and lower level. A-2 main level and upper level floor plans. A-3 loft framing and roof plan. A-4 north and east elevations. A-5 south and west elevations. A-6 building section and typical log details (roof, built-up floor, log post, partition, foundation). This is the main source for measurements. |
| `source/permits/Teal Lake permits - ALL.pdf` | 22 letter-size pages of permits. Ryan says the only reason it is here is that it shows the lot elevation (the slope of the ground). Find those pages. Ignore the rest. |
| `source/proposed/proposed-basement-floor-plan.png` | "Proposed Basement Floor Plan." Spa suite (sauna 6x8, cold plunge 4x6, shower, bathroom with 2 sinks), utility room 15'-6" x 11', bedroom 1 14'-6" x 15' with two queen beds, 4 ft hall, stairs, entertainment area 28' x 19'-6", patio slider to lake walkout. Notes say 10 ft ceiling and "contractor to verify all dimensions in field." The file name pattern suggests it was made with an AI image tool, so treat it as a design idea, not a measured drawing. Check every number on it against sheet A-1 and A-6. |
| `source/photos/` | Only 3 photos (Pixel phone, Oct 9, Oct 17 and Nov 1, 2026, 8160x6144 each). Ryan said he downloaded "a bunch" of inside and outside pictures, and the zip was named `Photos-1-001.zip`, which suggests more parts. Ask Ryan for the rest before you rely on photos. |

## Rules that apply to the whole project

- **Measurements beat images.** Tests show Claude often misreads floor plans from images alone (rooms with no doors, wrong proportions). Every number must come from a dimension string written on a drawing, a scale bar calculation (say so), or Ryan's tape measure. Never guess from the look of a picture.
- **Every fact gets a source.** Write sheet and detail number (for example "A-1, detail 2") or photo file name, plus a confidence: `stated` (a written dimension), `scaled` (measured with the scale), `inferred` (reasoned from other facts), or `assumed`.
- **Conflicts are written down, not settled silently.** If two sources disagree, record both in `facts/conflicts.md`.
- **Questions for Ryan go in one file**, `facts/questions-for-ryan.md`, written in plain sentences. Include things he can measure with a tape, with where to measure from.
- Ryan's global rules in `~/.claude/CLAUDE.md` apply (plain language, pull before work, commit only when he asks, check UI work in a real browser).

## Phase 1: understand the cabin (do this first)

### Output files (create them; these are the record of the work)

- `facts/cabin-facts.md` — the main result. One section per topic: footprint and walls, foundation and basement walls, floor framing, each level's rooms with sizes, stairs, doors and windows (size, sill height, which wall, distance from a corner), ceiling heights, floor-to-floor heights, roof, porch and deck, lot slope and grade line at each wall, plumbing and mechanical locations (water heater, furnace, drains), anything structural in the basement (posts, beams, bearing walls) that limits the new layout.
- `facts/measurements.json` — the same numbers in a form a script can read. Inches. Origin at the outside southwest corner of the foundation, x east, y north, z up from basement floor. (Confirm the compass direction from the north arrow on the sheets first; change the origin note if needed.)
- `facts/proposed-vs-existing.md` — every difference between the proposed basement plan and sheet A-1, and every place the proposal conflicts with posts, beams, stairs, windows, or the mechanical room.
- `facts/conflicts.md` and `facts/questions-for-ryan.md` as above.
- `facts/sources.md` — a list of each source page or photo, what it shows, and which facts came from it.
- `STATUS.md` — the progress log. See "Keeping the main session from running out of context."

### Suggested way to split the work across subagents

Ryan expects many subagents working in parallel. Split by source, so no two agents read the same page:

1. One agent first turns each PDF page into a high-resolution image in `work/pages/` (for example `pdftoppm -r 200`). The plan sheets are 36x24 in, so also cut each sheet into its separate drawings (detail crops) so a reader agent gets one drawing at full size, not a shrunken whole sheet.
2. One reader agent per drawing: foundation plan, lower level, main level, upper level, loft framing, roof plan, each elevation, building section, each typical detail. Each one writes its findings to `work/findings/<drawing>.md` in the fact format above.
3. One agent finds the lot elevation pages in the permit PDF and writes the grade information.
4. One agent reads the proposed basement image.
5. One agent per photo writes what it shows, which room and wall, and what finishes and features are visible.
6. Then one agent (or two, checking each other) merges all findings into the `facts/` files, cross-checks numbers between drawings (for example: does the 28 ft and 46 ft footprint match on every sheet, do floor heights match between the section and the elevations), and fills in conflicts and questions.

Ryan must say "use a workflow" (or turn on ultracode) in the new session for the Workflow tool to run a large group of agents. Without that, use the Agent tool for a few at a time.

### Done when

Every topic in `cabin-facts.md` has numbers with sources or an open question. Ryan has read the facts and answered the questions. Stop and wait for him at this point.

## Phase 2: the 3D model (only after Phase 1 is approved)

- **Software:** a web page built with Three.js (likely React Three Fiber, which is a React wrapper for Three.js). A script builds walls, floors, openings and stairs from `facts/measurements.json`, so the model changes when the numbers change. Look at https://github.com/ripa1993/vibe-interiors for a working example of this approach (scene file, live reload, first-person walk-through, furniture from product sizes, path-traced still images). It has very few users, so copy ideas, do not depend on it.
- **Order:** basement as it is now, then the whole cabin shell (for the lake walkout, windows and grade), then the proposed basement as a switchable option, then finish options (paint, flooring, fixtures) as named sets Ryan can switch between.
- **Assets:** Poly Haven (https://polyhaven.com) for free textures and lighting. Sketchfab for furniture in glTF format (check each license). For simple pieces, build them from product dimensions.
- **Photo-quality images (later, optional):** three-gpu-pathtracer in the browser, or export glTF and render in Blender Cycles.
- Check every view in a real browser with Playwright before telling Ryan it is done.

## Keeping the main session from running out of context

Ryan expects the main session to run out of context. Plan for it:

- The main session plans and checks. It does not read PDFs, images, or big files itself. Subagents do that and write to files.
- Each subagent writes its full result to a file and returns only a short summary (a few lines and the file path).
- After each step, the main session updates `STATUS.md`: what is done, which files hold the results, what is next, and open questions. A new session must be able to continue from `HANDOFF.md` plus `STATUS.md` alone.
- When starting fresh, read `HANDOFF.md`, then `STATUS.md`, then only the `facts/` files you need.

## What is set up already

- This folder, with git started on branch `main`. No GitHub remote yet. Ask Ryan before creating one.
- `source/` with the files above, gitignored.
- A Herdr workspace named `cabin-3d` pointed at this folder. No agent has been started.
- Nothing else. No app code, no `facts/` files, no `STATUS.md`. Those are yours to create.
