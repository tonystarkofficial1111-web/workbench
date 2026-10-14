# Workbench 5.59.4 — React + TypeScript rewrite

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
## Access codes

The Developer gate, Assistant gate and Assistant-memory lock compare against a **salted, iterated SHA-256 digest** (`src/core/gate.ts`);
the code itself is not in the shipped file. Change it with `bun run tools/make-gate-hash.ts <new code>`.
This is a client-side lock: it deters casual poking but is not a security boundary.

## Parity notes

See `PORTING_NOTES.md` for decisions, what is ported verbatim, and original quirks that were intentionally preserved.
