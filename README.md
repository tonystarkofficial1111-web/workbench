# Workbench 5.60.0 — React + TypeScript rewrite

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

## F1 Cockpit: the 3D live feed

Since 5.60.0 the cockpit's live feed is a three.js scene (`src/arcade/f1/`). The game itself is still the generated `legacy029.ts`: it owns the
state (lap position, speed, steering, rivals, TURN prompts), the 2D cockpit overlay, the minimap and every telemetry panel. A WebGL canvas sits
right under the game's 2D canvas, which is now transparent, and `tools/convert-029.ts` adds the few hooks that connect them (it renames the old
renderer to `f1RenderScene2D`, which stays as the automatic fallback when WebGL is missing or lost).

| Module | What |
|---|---|
| `view.ts` | renderer, camera rig (eye on the player's lap position, lane, steering, brake dive, cornering roll, shake), rivals, sun shadow that follows the camera, Graphics button, fallback |
| `path.ts` | the circuit as a smooth 3D path through the game's own track points (same lap fractions, so the prompts line up), nearest-point lookup, bridge for the figure-eight, easing of bends tighter than the road |
| `world.ts` | road, kerbs, run-off, terrain, barriers, fences, bridge deck, start line and grid, gantry, pit building, grandstands, tyre walls, sponsor boards, blocky instanced trees, mountains |
| `env.ts` | one look per circuit: Midday (Circle), Golden hour (Technical Loop), Cool morning (Complex), Sunset (Curvy Ring); the sun azimuth is also what the 2D cockpit uses for its lighting |
| `sky.ts`, `car.ts`, `tex.ts`, `post.ts`, `gfx.ts` | shader sky dome and boxy clouds, rival car model, procedural pictures, the full-screen pass (speed blur, vignette, grade, ACES), graphics levels |

**Graphics button** (next to Restart; saved as `wb-f1-gfx`): *Low* (fewer pixels, no shadows or post pass, fewer trees, for Chromebooks), *Balanced*
(the default: 4x multisampling, sun shadows, post pass, stands and boards), *High* (sharper, bigger shadows, crowds, more trees, a little glow).
The first run starts on Balanced, or on Low on a Chromebook / 4 cores or fewer / 4 GB or less, like the Infinite world's first-run default.
Changing the level rebuilds the scenery in about 0.1 s without touching the race.
The cockpit's Close button now also runs the cockpit's own cleanup (loop, keys, sound, WebGL context); before, only the shell was closed.

For tests: a `--dev` or `--dbg` build exposes `window.__f1View` (`.last.player`, `.last.aiCars`, `.turns`, `.dbg()` with the renderer, scene, camera and path).

## Access codes

The Developer gate, Assistant gate and Assistant-memory lock compare against a **salted, iterated SHA-256 digest** (`src/core/gate.ts`);
the code itself is not in the shipped file. Change it with `bun run tools/make-gate-hash.ts <new code>`.
This is a client-side lock: it deters casual poking but is not a security boundary.

## Parity notes

See `PORTING_NOTES.md` for decisions, what is ported verbatim, and original quirks that were intentionally preserved.
