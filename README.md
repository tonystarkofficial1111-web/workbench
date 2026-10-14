# Workbench 5.62.0 — React + TypeScript rewrite

A from-the-ground-up React/TypeScript rewrite of the single-file Workbench app. It builds to **one self-contained HTML file**
(`dist/Workbench.html`, ~14 MB) that runs straight from `file://` in Chrome: JS, CSS, fonts, both screensaver videos and three.js are all inlined.

## Build (bun only)

```bash
bun install
bun run build        # dist/Workbench.html  (minified + obfuscated)
bun run build:plain  # minified, not obfuscated
bun run build:dev    # readable build for debugging
bun run typecheck
```

### Updating to a newer original release

```bash
bun run tools/split-html.ts "<Workbench_x_y_z.html>" _orig_new   # split it into script/style blocks
# diff _orig_new against _orig (blocks with a different hash are what changed), copy the changed blocks into _orig,
# then re-run the matching generators (bun run gen:engines, bun run tools/extract-data.ts) and rebuild.
```

### Comparing against the original in a browser

`bun run serve` serves the original at `/orig` and the build at `/new`; `/orig-dbg` and `/new-dbg` (build the port with `--dev`) add
test hooks to the Block World engine, and `/harness.js` (`tools/dev-harness.js`) holds the click / placement helpers used to check that
every Block World button behaves the same in both. `bun run build.ts --dbg` puts the same hooks into the real obfuscated build so it can
be driven too. **Never ship a `--dbg` build.** To keep a test build away from `dist/`, set `WB_OUT=<file>` when building and `WB_DIST=<file> PORT=<n>`
when serving (handy when several test runs share one checkout).

## Layout

| Path | What |
|---|---|
| `src/core` | profile / achievements / scoring (same `wb_profile` format), nav, sound, perf monitor, overlay host, access-code gate |
| `src/tabs` | React tabs: Start, Educational, Media, Arcade, Assistant, User/Saves, Developer, Block World |
| `src/edu`, `src/media`, `src/features` | Educational labs, video library/online player, memory/files/summary/badges/shop |
| `src/arcade` | game catalog + library, daily challenge, Wi-Fi dialog, **engines** (`games/*` cabinets, `legacy029` car games, `protos`, `pixelDuel`) |
| `src/world` | Block World three.js engine, recorder, markup |
| `src/styles` | the original CSS, verbatim, in cascade order |
| `tools/` | generators that produce the engine modules from the original source (`bun run gen:engines`) |
| `_orig/` | the original app split into script/style pieces + runtime dumps used for parity checks |

Engines are plain TS modules mounted into a React-owned overlay/section; React owns every tab, the library, menus, labs and all app state.

## Block World: the Infinite world

The Infinite mode (the zombie island) has its own look and a few extra systems; Legacy and the classic sandbox are untouched. The code is in
`src/world/infinite/` and is installed at the very end of the generated engine (`installInfinite(env)`, wired up by `tools/convert-world.ts`).
Every wrapper it puts around an engine function passes straight through unless the Infinite world is running, so the other modes behave exactly as before.

| Module | What |
|---|---|
| `terrain.ts`, `caves.ts` | a jungle island twice as wide as the original (merged-mesh ground, beach, trails), caves with stone-slab paths, rails and lanterns |
| `trees.ts`, `foliage.ts`, `fx.ts` | instanced jungle trees that fall when chopped (stump, leaves), swaying plants, leaf and dust particles |
| `sky.ts`, `air.ts`, `weather.ts`, `water.ts` | sky dome with sunrise / sunset / moon / clouds, wind, rain, fog, storms, animated sea |
| `buildings.ts`, `castle.ts`, `defenses.ts`, `props.ts`, `anim.ts` | the castle, house, farm (with a windmill), mine, workshop, market, armory, walls, towers, torches and traps; flags, smoke, weather vanes and lamps |
| `humans.ts`, `zombies.ts`, `units.ts` | people with real armour pieces, name plates and the Armory halo; zombies with six different gaits |
| `mb.ts`, `mats.ts`, `shapes.ts`, `tex.ts`, `gfx.ts` | the model builder (merged, vertex-coloured, with detail tiers), shared materials, procedural pictures, graphics levels |

**Graphics button** (right column, Infinite only; saved as `wb-inf-gfx`): *High* (sun shadows, foamy waves, all model detail), *Medium* (the
default on Chromebooks and slow machines) and *Low* (fewer pixels, plain shapes, no shadows). Models are built once with three detail tiers
(0 = shape, 1 = extra detail, 2 = props and fine detail); the level only decides which tiers are visible.
**Camera**: Z flattens the view (to watch the sun set), X tilts back down, zoom reaches 150.

### Driving it from a script

`bun run build.ts --dev` and `PORT=5191 bun run serve.ts` give `/new-dbg` (state hooks: `window.__dbg`, `__dbg2`, and `__wbInf` for the Infinite
context) and `/harness.js`. `tools/cdp.ts` starts headless Chrome over the DevTools protocol (GPU WebGL, screenshots, evals), which is how the
screenshots and the placement / mode-switch checks were made.

## Saving: Block World or User saves

Every save / export / back-up button opens one chooser first (`src/components/SaveChooser.tsx`, state in `src/features/saves.ts`): **Block World** or **User saves**.
The Export progress and Back up… buttons (User / Saves tab), the 10-minute reminder bar and the Save button inside Block World (patched in by `tools/convert-world.ts`)
all go through it; the Block World card's *Export world* is explicit and saves the Block World straight away.

| File | What it holds |
|---|---|
| Block World (`workbench-block-world-DATE.json`, format `Stark Workbench Block World Save`) | `serializeWorld()` (blocks, trees, farms, houses, villagers, inventory, camera) plus `BLOCK_WORLD_KEYS` from localStorage (`wb-rare-bank`, `wb-inf-best`, `wb-inf-day`, `wb-bw-maxdefs`, `wb-inf-gfx`) |
| User saves (`workbench-user-saves-DATE.json` / `.wbsave`, format `Stark Workbench User Saves`) | every localStorage key of this app (`wb-`, `wb_`, `stark_` prefixes) except `BLOCK_WORLD_KEYS`, plus the `wbVideos` IndexedDB library. Without videos it is plain JSON; with videos it is a binary container: `WBUSERSAVE1\n`, a 4-byte big-endian manifest length, the manifest JSON (same fields as the JSON file, `videos[]` carries `length`), then each video's bytes |

`importSave(file)` is the one reader behind every Import / Restore button and recognises Block World files, User saves (JSON and `.wbsave`), the old *Complete Save*, the old
*Full Backup* (`backupEverything`, kept) and old progress files. Restoring User saves confirms, never writes Block World keys, de-duplicates videos (name + size + date), and sets
`storeLock` (`src/core/store.ts`) so no timer can write over the restored data before the page reloads. `loadSaveData` in the engine still reads Complete Saves and refuses User saves.
The screensaver's IndexedDB cache is not saved: it only holds the app's own embedded clips.

The Infinite day / night banner (`#wb-inf-hud`) shows only while `wbInfHudVisible()` is true: Infinite is running, the Block World tab is open and the mode picker is closed
(the tick applies it every step; a 100 ms watcher hides it while the tick is stopped).

## F1 Cockpit: the 3D seat, the driving rules and the crash scenes

Since 5.60.0 the cockpit's live feed is a three.js scene and since 5.61.0 the cockpit itself is part of it (`src/arcade/f1/`). The game is still the
generated `legacy029.ts`: it owns the race (laps, timing, tyres, pit stops, corner coach) and every telemetry panel. A WebGL canvas sits right under
the game's 2D canvas, which is transparent and only draws the HUD (controls top left, map top right, the red corner countdown, shift light, barrier
warning). `tools/convert-029.ts` adds the hooks that connect them (about twenty small `rep()` / `repRange()` patches that fail the build when an anchor
is missing); the old 2D renderer stays as `f1RenderScene2D`, the automatic fallback when WebGL is missing or lost.

| Module | What |
|---|---|
| `sim.ts` | the driving rules: manual gearbox with rev limiter (Y / U), a real position across the road, grip (`D = kappa * v^2` against the tyres' limit, sliding wide beyond it), kerbs and gravel, the barrier (touching it ends the race), suspension springs (roll, dive, squat, bumps, wheel travel), and the corner warning (a warning only) |
| `consts.ts` | road width, barrier distance, car half-width, gears, lap progress per mph per frame |
| `hud.ts`, `report.ts` | the on-screen HUD; the disqualification report (impact, race, tyres, systems, car) and the short 2D crash screen |
| `view.ts` | renderer, camera on the chassis (road, slide, roll, dive, bumps), rivals that make room, sun shadow, sky reflections (PMREM), live mirrors, Graphics button, fallback, hand-over to a crash |
| `cockpit.ts`, `car.ts` | the driver's seat: the car seen from the helmet (nose, wishbones, halo, mirrors), steering wheel with a live screen and shift lights, arms; the F1 car model with separate parts and PBR materials |
| `crash.ts` | twenty crash scenes: rigid bodies for the car and every torn-off part, barrier damage, sparks / smoke / fire / dust / debris pools, camera rigs and cuts, slow motion, sounds |
| `path.ts` | the circuit as a smooth 3D path through the game's own track points (same lap fractions, so the prompts line up), nearest-point lookup, the figure-eight's bridge, easing of bends tighter than the road |
| `world.ts` | road, kerbs, run-off, terrain, barriers (breakable), fences, bridge deck, start line, gantry, pit building and stands (placed only where they fit), floodlights, boards, blocky trees, mountains |
| `env.ts`, `sky.ts`, `tex.ts`, `post.ts`, `gfx.ts` | one look per circuit (Midday, Golden hour, Cool morning, Sunset), shader sky and boxy clouds, procedural pictures, the finishing pass (speed blur, bloom, light shafts, grade, ACES), graphics levels |

**Rules of the road**: the gearbox is manual, steering moves the car across the road (it keeps its place when you let go), a bend asks for grip
that grows with the square of the speed, beyond the limit the car is pushed to the outside, gravel slows it, and touching a barrier disqualifies you.
The corner prompt only warns. All physics steps are scaled by the frame time, so the game runs at the same speed on a 60 Hz and a 144 Hz screen.

**Crash scenes**: one of twenty at random (never the same twice in a row), scaled by the impact speed, about seven seconds with a report after
about six. `window.__f1Scene = n` (dev / dbg builds) picks one for tests.

**Graphics button** (next to Restart; saved as `wb-f1-gfx`): *Low* (fewer pixels, no shadows, post pass, live mirrors or reflections, for Chromebooks),
*Balanced* (the default: 4x multisampling, sun shadows, live mirrors at low resolution, sky reflections, light shafts), *High* (sharper, bigger shadows,
crowds, more trees, sharper mirrors, real bloom). The first run starts on Balanced, or on Low on a Chromebook / 4 cores or fewer / 4 GB or less, like
the Infinite world. Changing the level rebuilds the scenery in about 0.3 s without touching the race.
The cockpit's Close button also runs the cockpit's own cleanup (loop, keys, sound, WebGL context).

For tests: a `--dev` or `--dbg` build exposes `window.__f1View` (`.last.player`, `.last.aiCars`, `.turns`, `.dbg()` with the renderer, scene, camera, path and
cockpit). `bun run tools/f1-lab.ts <lap|race|crash|top> <map> ...` builds the dev build, serves it, drives the game in headless Chrome (an autopilot that brakes for the
bends and shifts by hand, or a driver that steers into the barrier) and writes pictures to `_f1lab/`.
## Access codes

The Developer gate, Assistant gate and Assistant-memory lock compare against a **salted, iterated SHA-256 digest** (`src/core/gate.ts`);
the code itself is not in the shipped file. Change it with `bun run tools/make-gate-hash.ts <new code>`.
This is a client-side lock: it deters casual poking but is not a security boundary.

## Parity notes

See `PORTING_NOTES.md` for decisions, what is ported verbatim, and original quirks that were intentionally preserved.
