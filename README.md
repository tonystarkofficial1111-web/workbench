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
be driven too. **Never ship a `--dbg` build.**

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

## Access codes

The Developer gate, Assistant gate and Assistant-memory lock compare against a **salted, iterated SHA-256 digest** (`src/core/gate.ts`);
the code itself is not in the shipped file. Change it with `bun run tools/make-gate-hash.ts <new code>`.
This is a client-side lock: it deters casual poking but is not a security boundary.

## Parity notes

See `PORTING_NOTES.md` for decisions, what is ported verbatim, and original quirks that were intentionally preserved.
