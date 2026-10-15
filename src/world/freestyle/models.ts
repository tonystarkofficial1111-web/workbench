// @ts-nocheck
import { MB, applyTier } from "../infinite/mb";
import { Rng } from "../infinite/rng";
import { PAL, shade, gableRoof, bellRoof, lantern, barrel, crate, sack, woodPile, fence, stoneBox, hayBale } from "../infinite/props";
import { BUILDERS, attachDyn, track } from "../infinite/buildings";
import type { FsCtx } from "./ctx";
import type { BType } from "./data";

/**
 * Free Style's own models, in the Infinite world's style (blocky, merged, vertex coloured, detail tiers): the tent that replaces the castle,
 * the campfire, the well, the watchtower, a building site, and the animals (chicken, sheep, cow) with legs and heads that move.
 * House, farm, mine, workshop, market and armory reuse the Infinite world's builders.
 */
const PI = Math.PI;

function finish(ctx: FsCtx, mb: MB, owner: any) {
  const g = mb.build(ctx.mats, true);
  track(ctx, g, owner);
  return g;
}

// ------------------------------------------------------------------------------------------------ tent
/**
 * The tent: a plain canvas wall tent in faded olive green (a little like an army tent, but patched and lived in). Ridge along z, door on the
 * +z gable end under a porch fly. Everything is blocks: canvas strips with seams and patches, a pole frame, guy lines to pegs, a stove pipe,
 * cots inside, a duckboard path and the village's stockpile around it. Detail goes up with the graphics level (tiers 1 and 2).
 */
const CANVAS = [0x737d57, 0x6c7652, 0x7a845d, 0x68714e];
const CANVAS_D = 0x575f42, CANVAS_L = 0x8a9269, KHAKI = 0x9a9473, SOD = 0x4c5237, ROPE = 0xc2b48a, POLE = 0x6b4f33;
function buildTent(ctx: FsCtx, mb: MB, rnd: Rng, main: number) {
  const dyn: any[] = [];
  const W = 3.0, L = 3.6, WH = 1.0, RH = 2.15, PORCH = 1.0, OV = 0.16;     // width (x), length (z), wall height, ridge height, porch fly, eave overhang
  const hz = L / 2, hw = W / 2;
  mb.ao = { y0: 0, h: 1.1, k: 0.24 };

  // ---- ground: trodden earth, a stone-edged drainage ditch, duckboards to the door
  // trodden earth as a ragged patch of blocky tiles (thinning out at the edges, worn grass between)
  const EARTH = [0x6a583c, 0x67553a, 0x6e5b3e, 0x655339, 0x6c5a3f];
  for (let gx = -hw - 1.4; gx <= hw + 1.4; gx += 0.4) for (let gz = -hz - 1.2; gz <= hz + PORCH + 1.6; gz += 0.4) {
    const ex = Math.abs(gx) / (hw + 1.5), ez = Math.abs(gz - PORCH / 2) / (hz + PORCH / 2 + 1.5), e = Math.max(ex, ez);
    if (e > 0.7 && rnd.next() < (e - 0.7) * 3.2) { if (rnd.next() < 0.3) mb.box(0x5d7a3a, 0.4, 0.02, 0.4, gx, 0.008, gz, 0, 0, 0, { noAO: true, jit: 0.1, tier: 1 }); continue; }
    mb.box(rnd.pick(EARTH), 0.41, 0.02 + rnd.next() * 0.012, 0.41, gx, 0.01, gz, 0, 0, 0, { noAO: true, jit: 0.025 });
    if (rnd.next() < 0.12) mb.box(rnd.pick([0x8a8270, 0x7a7262, 0x938b78]), rnd.range(0.06, 0.12), 0.05, rnd.range(0.05, 0.1), gx + rnd.range(-0.15, 0.15), 0.035, gz + rnd.range(-0.15, 0.15), 0, rnd.range(0, 3), 0, { tier: 2 });   // pebbles
  }
  // the drainage ditch round the walls, edged with stones
  for (let k = 0; k < 30; k++) { const a = (k / 30) * PI * 2, rx = hw + 0.42, rz = hz + 0.4; mb.box(rnd.pick([0x7d7668, 0x6f695d, 0x8a8374, 0x625c51]), rnd.range(0.14, 0.24), rnd.range(0.07, 0.12), rnd.range(0.12, 0.2), Math.cos(a) * rx, 0.045, Math.sin(a) * rz, 0, rnd.range(0, 3), 0, { tier: 1, jit: 0.08 }); }
  for (const s of [-1, 1]) mb.box(0x4f412e, 0.18, 0.012, L + 0.5, s * (hw + 0.24), 0.026, 0, 0, 0, 0, { noAO: true, tier: 1 });
  for (let k = 0; k < 7; k++) {   // duckboards
    const z = hz + 0.2 + k * 0.36;
    mb.box(PAL.plank[k % 4], 1.0, 0.05, 0.3, rnd.range(-0.03, 0.03), 0.045, z, 0, rnd.range(-0.04, 0.04), 0, { jit: 0.06 });
    if (k % 2 === 0) for (const s of [-1, 1]) mb.box(PAL.woodD, 0.06, 0.06, 0.7, s * 0.4, 0.02, z + 0.17, 0, 0, 0, { tier: 2 });
  }

  // ---- wooden floor inside
  for (let k = 0; k < 10; k++) mb.box(PAL.plank[(k + 1) % 4], W - 0.12, 0.05, L / 10 - 0.02, 0, 0.06, -hz + (k + 0.5) * (L / 10), 0, 0, 0, { tier: 1, jit: 0.05 });

  // ---- side walls: vertical canvas panels with seams, a darker sod cloth at the bottom and tie-down loops
  for (const s of [-1, 1]) {
    const n = 8;
    for (let k = 0; k < n; k++) {
      const z = -hz + (k + 0.5) * L / n;
      mb.box(rnd.pick(CANVAS), 0.05, WH - 0.12, L / n + 0.004, s * hw, 0.12 + (WH - 0.12) / 2, z, 0, 0, 0, { jit: 0.03 });
      mb.box(CANVAS_D, 0.06, WH - 0.14, 0.025, s * (hw + 0.004), 0.12 + (WH - 0.12) / 2, z + L / n / 2, 0, 0, 0, { tier: 1 });                         // seam
      mb.box(ROPE, 0.03, 0.08, 0.04, s * (hw + 0.03), 0.16, z, 0, 0, 0, { tier: 2 });                                                                  // tie loop
      mb.box(PAL.wood[1], 0.04, 0.12, 0.04, s * (hw + 0.1), 0.04, z, 0, 0, 0.4 * s, { tier: 2 });                                                   // small peg
    }
    mb.box(SOD, 0.07, 0.13, L + 0.02, s * (hw + 0.01), 0.065, 0, 0, 0, 0);                                                                             // sod cloth
    mb.box(CANVAS_D, 0.08, 0.05, L + 0.04, s * (hw + 0.01), WH - 0.02, 0, 0, 0, 0, { tier: 1 });                                                       // eave hem
    // a window with a rolled-up flap and a mesh in the middle of each side
    mb.box(0x2a2e22, 0.06, 0.32, 0.6, s * (hw + 0.005), 0.62, 0.2, 0, 0, 0, { noAO: true });
    for (let k = 0; k < 4; k++) mb.box(0x3c4230, 0.065, 0.01, 0.6, s * (hw + 0.006), 0.48 + k * 0.09, 0.2, 0, 0, 0, { tier: 2, noAO: true });
    mb.box(CANVAS_L, 0.12, 0.1, 0.66, s * (hw + 0.05), 0.83, 0.2, 0, 0, 0, { tier: 1 });                                                               // rolled flap
    for (const z of [-0.08, 0.48]) mb.box(ROPE, 0.13, 0.12, 0.025, s * (hw + 0.05), 0.83, z, 0, 0, 0, { tier: 2 });
  }

  // ---- roof: each slope is a row of canvas strips running the whole length plus the porch, with seams and the odd patch
  const run = hw + OV, rise = RH - WH, slopeLen = Math.hypot(run, rise), ang = Math.atan2(rise, run), strips = 11;
  const RL = L + PORCH + 0.25, rz0 = PORCH / 2 + 0.06;
  for (const s of [-1, 1]) {
    for (let k = 0; k < strips; k++) {
      const t = (k + 0.5) / strips, x = s * (run - t * run), y = WH - OV * Math.tan(ang) + t * (rise + OV * Math.tan(ang));
      const sag = Math.sin(t * PI) * 0.03;
      mb.box(k === 0 ? CANVAS_D : rnd.pick(CANVAS), slopeLen / strips + 0.012, 0.05, RL, x, y - sag, rz0, 0, 0, -s * ang, { jit: 0.035 });
      if (k % 3 === 2) mb.box(CANVAS_D, 0.03, 0.055, RL + 0.01, x - s * Math.cos(ang) * slopeLen / strips / 2, y - sag + 0.006, rz0, 0, 0, -s * ang, { tier: 1 });   // seam
    }
    // seams across the slope (canvas widths) and reinforcing bands over the rafters
    for (let k = 0; k <= 5; k++) {
      const z = -hz + k * (L / 5);
      mb.box(k === 0 || k === 5 ? CANVAS_D : 0x646d4a, slopeLen + 0.04, 0.06, 0.07, s * run / 2, WH + rise / 2 + 0.012, z, 0, 0, -s * ang, { tier: 1 });
    }
    // patches
    for (let k = 0; k < 3; k++) {
      const t = rnd.range(0.2, 0.8), z = rnd.range(-hz + 0.3, hz - 0.3), w = rnd.range(0.22, 0.42);
      mb.box(k === 1 ? KHAKI : CANVAS_L, w * Math.cos(ang), 0.056, w * 0.8, s * (run - t * run), WH + t * rise + 0.018, z, 0, 0, -s * ang, { tier: 2, jit: 0.04 });
    }
    // guy lines from the eaves to pegs, three a side
    for (const z of [-hz + 0.3, 0, hz - 0.3]) {
      const ex = s * (hw + OV), ey = WH - 0.02, px = s * (hw + 1.15);
      mb.beam(ROPE, 0.018, ex, ey, z, px, 0.12, z, { tier: 1 });
      mb.box(PAL.wood[1], 0.06, 0.2, 0.06, px, 0.08, z, 0, 0, s * 0.35, { tier: 0 });
      mb.box(PAL.woodD, 0.1, 0.03, 0.06, px - s * 0.03, 0.18, z, 0, 0, 0, { tier: 2 });
      mb.box(0x8f8a70, 0.05, 0.08, 0.03, s * (hw + 0.55), 0.55, z, 0, 0, s * 0.6, { tier: 2 });            // runner on the line
    }
  }
  // ridge cap
  mb.box(CANVAS_D, 0.16, 0.07, RL + 0.02, 0, RH + 0.02, rz0);

  // ---- gable ends: stepped canvas (blocky triangles); the front one has the door
  const rows = 9;
  for (const e of [-1, 1]) {
    const z = e * hz;
    for (let r = 0; r < rows; r++) {
      const y0 = WH + (r / rows) * rise, w = W * (1 - (r + 0.5) / rows) + 0.06;
      mb.box(rnd.pick(CANVAS), w, rise / rows + 0.006, 0.05, 0, y0 + rise / rows / 2, z, 0, 0, 0, { jit: 0.025 });
    }
    // end wall below the eaves (the front is open in the middle)
    const nP = 6;
    for (let k = 0; k < nP; k++) {
      const x = -hw + (k + 0.5) * W / nP;
      if (e > 0 && Math.abs(x) < 0.5) continue;
      mb.box(rnd.pick(CANVAS), W / nP + 0.004, WH - 0.12, 0.05, x, 0.12 + (WH - 0.12) / 2, z, 0, 0, 0, { jit: 0.03 });
      mb.box(CANVAS_D, 0.025, WH - 0.14, 0.06, x + W / nP / 2, 0.12 + (WH - 0.12) / 2, z + e * 0.004, 0, 0, 0, { tier: 1 });
    }
    mb.box(SOD, W + 0.02, 0.13, 0.07, 0, 0.065, z + e * 0.01, 0, 0, 0);
    // vent at the top of the gable
    mb.box(0x2a2e22, 0.3, 0.18, 0.06, 0, RH - 0.45, z + e * 0.005, 0, 0, 0, { noAO: true, tier: 1 });
    mb.box(CANVAS_L, 0.4, 0.06, 0.14, 0, RH - 0.33, z + e * 0.05, 0, 0, 0, { tier: 2 });
  }
  // door: dark opening, flaps rolled up and tied, a toggle strip
  mb.box(0x221f18, 0.98, WH + 0.35, 0.03, 0, (WH + 0.35) / 2 + 0.05, hz - 0.03, 0, 0, 0, { noAO: true });
  for (const s of [-1, 1]) {
    mb.box(CANVAS_L, 0.16, 0.16, 0.16, s * 0.52, 1.08, hz + 0.06, 0, 0, 0, { jit: 0.04 });                                    // rolled flap (square roll)
    mb.box(rnd.pick(CANVAS), 0.12, 0.9, 0.06, s * 0.52, 0.55, hz + 0.05, 0, 0, s * 0.04);                                      // flap hanging below the roll
    for (const y of [1.0, 1.16]) mb.box(ROPE, 0.2, 0.025, 0.2, s * 0.52, y, hz + 0.06, 0, 0, 0, { tier: 2 });
    for (let k = 0; k < 5; k++) mb.box(PAL.wood[1], 0.03, 0.06, 0.03, s * 0.44, 0.2 + k * 0.2, hz + 0.04, 0, 0, 0, { tier: 2 });   // toggles
  }

  // ---- frame: front and back uprights, the ridge pole sticking out, the porch poles with their own guy lines
  for (const e of [-1, 1]) {
    mb.box(POLE, 0.1, RH + 0.05, 0.1, 0, (RH + 0.05) / 2, e * (hz + 0.04));
    mb.box(PAL.woodD, 0.16, 0.06, 0.16, 0, 0.03, e * (hz + 0.04), 0, 0, 0, { tier: 1 });
  }
  mb.box(POLE, 0.09, 0.09, RL + 0.35, 0, RH + 0.08, rz0);
  for (const s of [-1, 1]) {
    const px = s * (hw + OV - 0.05), pz = hz + PORCH;
    mb.box(POLE, 0.08, WH + 0.02, 0.08, px, (WH + 0.02) / 2, pz);
    mb.box(PAL.woodD, 0.13, 0.05, 0.13, px, 0.025, pz, 0, 0, 0, { tier: 1 });
    mb.beam(ROPE, 0.018, px, WH, pz, px + s * 0.6, 0.12, pz + 0.9, { tier: 1 });
    mb.box(PAL.wood[1], 0.06, 0.2, 0.06, px + s * 0.6, 0.08, pz + 0.9, 0.3, 0, 0);
  }
  mb.box(POLE, 0.08, RH - 0.02, 0.08, 0, (RH - 0.02) / 2, hz + PORCH + 0.1);                                                    // porch ridge pole
  mb.beam(ROPE, 0.018, 0, RH, hz + PORCH + 0.12, 0, 0.12, hz + PORCH + 1.3, { tier: 1 });
  mb.box(PAL.wood[1], 0.06, 0.2, 0.06, 0, 0.08, hz + PORCH + 1.3, 0.3, 0, 0, { tier: 1 });

  // ---- stove pipe through the back of the roof, with a rain cap
  const sx = -0.45, sz = -hz + 0.4, sy = WH + (1 - 0.45 / run) * rise;
  mb.box(0x3a3d40, 0.13, 0.9, 0.13, sx, sy + 0.38, sz, 0, 0, 0, { mat: "metal" });
  mb.box(0x2c2e30, 0.24, 0.04, 0.24, sx, sy + 0.86, sz, 0, 0, 0, { mat: "metal", tier: 1 });
  mb.box(0x2c2e30, 0.2, 0.04, 0.2, sx, sy + 0.92, sz, 0, PI / 4, 0, { mat: "metal", tier: 2 });
  mb.box(0x8a8f80, 0.3, 0.03, 0.3, sx, sy + 0.03, sz, 0, 0, -0.47, { tier: 1 });                                                  // fire ring in the canvas
  dyn.push({ kind: "smoke", x: sx, y: sy + 0.98, z: sz, o: { n: 4, size: 0.3, rise: 2.0, period: 4 } });

  // ---- inside: three cots with blankets, a small stove, a table with a lamp, a chest
  for (let k = 0; k < 3; k++) {
    const cx = [-hw + 0.42, hw - 0.42, 0.46][k]!, z = -0.3;
    mb.box(PAL.wood[0], 0.5, 0.05, 1.5, cx, 0.32, z, 0, 0, 0, { tier: 1 });
    for (const a of [-1, 1]) for (const b of [-1, 1]) mb.box(PAL.woodD, 0.05, 0.28, 0.05, cx + a * 0.22, 0.17, z + b * 0.7, 0, 0, 0, { tier: 2 });
    mb.box([0x5a6244, 0x6a6a52, 0x4f5a40][k]!, 0.52, 0.07, 1.0, cx, 0.38, z + 0.2, 0, 0, 0, { tier: 1, jit: 0.05 });          // blanket
    mb.box(0xd8d0b8, 0.38, 0.08, 0.22, cx, 0.39, z - 0.55, 0, 0, 0, { tier: 2 });                                            // pillow
  }
  mb.box(0x2e3032, 0.38, 0.42, 0.38, sx, 0.27, sz, 0, 0, 0, { mat: "metal", tier: 1 });                                         // stove
  mb.box(0xff7a30, 0.14, 0.08, 0.02, sx, 0.2, sz + 0.2, 0, 0, 0, { mat: "lamp", tier: 1, noAO: true });
  mb.box(PAL.wood[2], 0.6, 0.05, 0.45, 0.7, 0.55, hz - 0.65, 0, 0, 0, { tier: 1 });
  for (const a of [-1, 1]) for (const b of [-1, 1]) mb.box(PAL.woodD, 0.05, 0.5, 0.05, 0.7 + a * 0.25, 0.3, hz - 0.65 + b * 0.18, 0, 0, 0, { tier: 2 });
  lantern(mb, 0.62, 0.68, hz - 0.62, { tier: 2, size: 0.6 });
  dyn.push({ kind: "halo", x: 0.62, y: 0.7, z: hz - 0.62, o: { size: 0.9, color: 0xffb860, day: 0.15 } });
  crate(mb, -0.85, 0.08, hz - 0.6, 0.4, 0.2, { tier: 1, col: 0x6a5a40 });

  // ---- the village stockpile around the tent
  // left: barrels (one for water with a ladle), a firewood rack under a little canvas
  barrel(mb, -2.45, 0, 1.05, { tier: 0, col: 0x5c4630 }); barrel(mb, -2.45, 0, 1.55, { tier: 1, col: 0x6b5236 }); barrel(mb, -2.9, 0, 1.3, { tier: 1, col: 0x54402c });
  mb.box(0x2f5a6a, 0.3, 0.02, 0.3, -2.45, 0.43, 1.05, 0, 0, 0, { tier: 2, noAO: true });
  mb.box(PAL.wood[2], 0.03, 0.03, 0.34, -2.4, 0.5, 1.05, 0.5, 0, 0, { tier: 2 });
  for (const z of [-1.5, -0.3]) for (const x of [-2.25, -2.95]) mb.box(POLE, 0.07, 1.0, 0.07, x, 0.5, z);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) mb.box(rnd.pick(PAL.wood), 0.13, 0.13, 1.05, -2.33 - i * 0.11 - (r % 2) * 0.05, 0.08 + r * 0.13, -0.9, 0, 0, 0, { tier: r < 2 ? 0 : 1, jit: 0.1 });
  for (let i = 0; i < 6; i++) mb.box(0xc8a46e, 0.1, 0.1, 0.01, -2.33 - i * 0.11, 0.08, -0.37, 0, 0, 0, { tier: 2, noAO: true });   // cut ends
  for (let k = 0; k < 5; k++) mb.box(k % 2 ? CANVAS_D : rnd.pick(CANVAS), 0.85, 0.04, 1.45 / 5 + 0.01, -2.6, 1.02 + k * 0.012, -1.5 + 0.15 + k * 1.45 / 5 - 0.1, 0, 0, 0.12, { tier: 1 });
  // right: crates with rope, sacks of grain, a tool rack, a chopping block with an axe
  crate(mb, 2.35, 0, 1.15, 0.44, 0.15, { tier: 0, col: 0x6a5a40 }); crate(mb, 2.35, 0.44, 1.15, 0.36, 0.5, { tier: 1, col: 0x74603f }); crate(mb, 2.85, 0, 1.4, 0.38, -0.2, { tier: 1, col: 0x5f5038 });
  mb.box(ROPE, 0.46, 0.025, 0.04, 2.35, 0.3, 1.15, 0, 0.15, 0, { tier: 2 }); mb.box(ROPE, 0.04, 0.025, 0.46, 2.35, 0.3, 1.15, 0, 0.15, 0, { tier: 2 });
  for (let k = 0; k < 4; k++) { mb.box(0xa89a72, 0.32, 0.36, 0.26, 2.55 + (k % 2) * 0.34, 0.18 + Math.floor(k / 2) * 0.33, 0.35, 0, rnd.range(-0.2, 0.2), 0, { tier: k < 2 ? 0 : 1, jit: 0.06 }); mb.box(0x8a7c58, 0.12, 0.1, 0.12, 2.55 + (k % 2) * 0.34, 0.4 + Math.floor(k / 2) * 0.33, 0.35, 0, 0, 0, { tier: 2 }); }
  mb.box(POLE, 0.06, 1.0, 0.06, 2.3, 0.5, -0.9); mb.box(POLE, 0.06, 1.0, 0.06, 2.3, 0.5, -0.1); mb.box(POLE, 0.06, 0.06, 0.9, 2.3, 0.92, -0.5);
  mb.box(PAL.wood[2], 0.04, 0.9, 0.04, 2.36, 0.48, -0.75, 0.1, 0, 0, { tier: 1 }); mb.box(0x6a6e72, 0.04, 0.22, 0.16, 2.36, 0.1, -0.8, 0, 0, 0, { tier: 1, mat: "metal" });   // shovel
  mb.box(PAL.wood[2], 0.04, 0.85, 0.04, 2.36, 0.48, -0.45, -0.08, 0, 0, { tier: 1 }); for (let k = 0; k < 4; k++) mb.box(0x6a6e72, 0.04, 0.1, 0.03, 2.36, 0.06, -0.57 + k * 0.08, 0, 0, 0, { tier: 2, mat: "metal" });   // rake
  mb.box(PAL.wood[1], 0.44, 0.38, 0.44, 1.95, 0.19, -1.7, 0, 0.3, 0); mb.box(0xc8a46e, 0.4, 0.01, 0.4, 1.95, 0.385, -1.7, 0, 0.3, 0, { tier: 2, noAO: true });
  mb.box(PAL.wood[2], 0.04, 0.04, 0.5, 1.95, 0.5, -1.65, 0.9, 0.3, 0, { tier: 1 }); mb.box(0x8a8e92, 0.03, 0.13, 0.1, 1.95, 0.4, -1.62, 0, 0.3, 0, { tier: 1, mat: "metal" });
  // a bench by the door and a lantern post
  mb.box(PAL.plank[0], 0.9, 0.05, 0.28, -1.25, 0.38, hz + 0.75); for (const a of [-1, 1]) mb.box(PAL.woodD, 0.06, 0.36, 0.22, -1.25 + a * 0.36, 0.18, hz + 0.75, 0, 0, 0, { tier: 1 });
  mb.box(POLE, 0.08, 1.6, 0.08, 1.25, 0.8, hz + 0.9); mb.box(POLE, 0.3, 0.05, 0.05, 1.12, 1.55, hz + 0.9, 0, 0, 0, { tier: 1 });
  lantern(mb, 1.0, 1.36, hz + 0.9, { tier: 0, hang: 0.08 });
  dyn.push({ kind: "halo", x: 1.0, y: 1.36, z: hz + 0.9, o: { size: 1.0, color: 0xffc070 } });
  // a plain green pennant on the ridge pole
  dyn.push({ kind: "flag", x: 0, y: RH + 0.75, z: hz + PORCH + 0.1, o: { w: 0.5, h: 0.24, kind: "pennant", main: 0x5a6444, accent: 0x5a6444, pattern: "plain" } });
  mb.box(POLE, 0.05, 0.75, 0.05, 0, RH + 0.4, hz + PORCH + 0.1, 0, 0, 0, { tier: 1 });
  return dyn;
}

// ------------------------------------------------------------------------------------------------ campfire, well, tower
const ROCK = [0x7d7668, 0x6f695d, 0x8a8374, 0x625c51, 0x75705f];
function buildCampfire(ctx: FsCtx, mb: MB, rnd: Rng) {
  const dyn: any[] = [];
  mb.ao = { y0: 0, h: 0.5, k: 0.2 };
  // ash and scorched earth in blocky tiles
  for (let gx = -0.8; gx <= 0.8; gx += 0.2) for (let gz = -0.8; gz <= 0.8; gz += 0.2) {
    const d = Math.hypot(gx, gz); if (d > 0.85 + rnd.range(-0.15, 0.1)) continue;
    mb.box(d < 0.38 ? rnd.pick([0x3a3532, 0x46403b, 0x2e2a28]) : rnd.pick([0x5a4a36, 0x4e3f2e, 0x645339]), 0.21, 0.02, 0.21, gx, 0.01, gz, 0, 0, 0, { noAO: true, jit: 0.08 });
  }
  // a double ring of stones, the inner ones blackened
  for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2 + rnd.range(-0.08, 0.08); mb.box(rnd.pick(ROCK), rnd.range(0.2, 0.28), rnd.range(0.16, 0.24), rnd.range(0.16, 0.22), Math.cos(a) * 0.52, 0.1, Math.sin(a) * 0.52, 0, -a + rnd.range(-0.2, 0.2), 0, { jit: 0.06 }); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2 + 0.26; mb.box(0x3c3833, 0.12, 0.05, 0.1, Math.cos(a) * 0.4, 0.19, Math.sin(a) * 0.4, 0, -a, 0, { tier: 2 }); }
  // logs laid as a teepee, with pale cut ends and glowing charcoal underneath
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * PI * 2 + 0.3;
    mb.push(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18, -a + PI / 2);
    mb.box(PAL.wood[k % 3], 0.1, 0.1, 0.55, 0, 0.18, 0, -0.55, 0, 0, { jit: 0.08 });
    mb.box(0x2a1e16, 0.1, 0.03, 0.2, 0, 0.32, -0.11, -0.55, 0, 0, { tier: 1 });                  // charred tip
    mb.box(0xc8a46e, 0.09, 0.09, 0.01, 0, 0.05, 0.25, -0.55, 0, 0, { tier: 2, noAO: true });    // cut end
    mb.pop();
  }
  for (let k = 0; k < 10; k++) mb.box(rnd.chance(0.5) ? 0xff5a18 : 0xc83a10, 0.08, 0.05, 0.08, rnd.range(-0.22, 0.22), 0.04, rnd.range(-0.22, 0.22), 0, rnd.range(0, 3), 0, { mat: "lamp", noAO: true, tier: 1 });
  // flames: stacked blocks from deep orange to yellow, smaller towards the top
  const fl = [[0, 0.26, 0, 0.26, 0xff6a1a], [0.07, 0.42, 0.04, 0.18, 0xff8a24], [-0.06, 0.4, -0.05, 0.17, 0xff7a20], [0.02, 0.56, 0, 0.13, 0xffa83a], [-0.03, 0.68, 0.02, 0.09, 0xffc850], [0.03, 0.78, -0.01, 0.06, 0xffe070], [0.1, 0.3, -0.1, 0.12, 0xff6a1a], [-0.1, 0.3, 0.09, 0.12, 0xff7a20]];
  for (const f of fl) mb.box(f[4]!, f[3]!, f[3]! * 1.3, f[3]!, f[0]!, f[1]!, f[2]!, 0, PI / 4 * (f[3]! > 0.15 ? 1 : 0), 0, { mat: "lamp", noAO: true });
  // the spit: forked uprights, a crank, a joint of meat
  for (const s of [-1, 1]) {
    mb.box(PAL.woodD, 0.07, 0.86, 0.07, s * 0.62, 0.43, 0);
    mb.box(PAL.woodD, 0.05, 0.16, 0.05, s * 0.62 - 0.04, 0.9, 0, 0, 0, 0.35); mb.box(PAL.woodD, 0.05, 0.16, 0.05, s * 0.62 + 0.04, 0.9, 0, 0, 0, -0.35);
  }
  mb.box(0x5a4632, 1.42, 0.035, 0.035, 0, 0.86, 0, 0, 0, 0, { tier: 1 });
  mb.box(0x3a3d40, 0.035, 0.18, 0.035, 0.74, 0.79, 0, 0, 0, 0, { tier: 2, mat: "metal" });
  mb.box(0x8a4a2a, 0.26, 0.18, 0.2, 0, 0.86, 0, 0, 0, 0, { tier: 1, jit: 0.05 }); mb.box(0x6a3420, 0.18, 0.12, 0.22, 0.04, 0.88, 0, 0, 0, 0, { tier: 2 });
  // a pot on a tripod, a log seat, a water barrel and a basket of firewood
  for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2; mb.beam(PAL.woodD, 0.035, 0.85 + Math.cos(a) * 0.32, 0, 0.6 + Math.sin(a) * 0.32, 0.85, 0.78, 0.6, { tier: 1 }); }
  mb.box(0x2a2a2e, 0.3, 0.24, 0.3, 0.85, 0.4, 0.6, 0, 0, 0, { mat: "metal", tier: 1 }); mb.box(0x3a3d40, 0.34, 0.04, 0.34, 0.85, 0.53, 0.6, 0, 0, 0, { mat: "metal", tier: 2 });
  mb.box(0x6a8aa0, 0.24, 0.01, 0.24, 0.85, 0.52, 0.6, 0, 0, 0, { tier: 2, noAO: true });
  mb.box(0x2a1e16, 0.24, 0.12, 0.24, 0.85, 0.06, 0.6, 0, PI / 4, 0, { tier: 2 });
  mb.box(PAL.wood[0], 0.9, 0.24, 0.26, -0.15, 0.12, -1.0, 0, 0.2, 0, { jit: 0.05 }); mb.box(0xc8a46e, 0.01, 0.2, 0.22, -0.6, 0.12, -0.91, 0, 0.2, 0, { tier: 2, noAO: true });
  barrel(mb, -0.9, 0, 0.55, { tier: 1, r: 0.18, h: 0.4, col: 0x5c4630 });
  for (let k = 0; k < 5; k++) mb.box(rnd.pick(PAL.wood), 0.09, 0.09, 0.42, 1.0 + (k % 3) * 0.1, 0.06 + Math.floor(k / 3) * 0.09, -0.55, 0, 0.1, 0, { tier: 1, jit: 0.1 });
  dyn.push({ kind: "smoke", x: 0, y: 0.8, z: 0, o: { n: 5, size: 0.45, rise: 2.4 } }, { kind: "halo", x: 0, y: 0.45, z: 0, o: { size: 2.0, color: 0xff9a40, flicker: 0.22, day: 0.3 } });
  return dyn;
}

function buildWell(ctx: FsCtx, mb: MB, rnd: Rng) {
  mb.ao = { y0: 0, h: 0.8, k: 0.25 };
  // a ring of cut stones, three courses, staggered, with moss low down
  const R = 0.62;
  for (let c = 0; c < 3; c++) for (let k = 0; k < 14; k++) {
    const a = (k / 14) * PI * 2 + (c % 2) * (PI / 14);
    mb.box(rnd.pick(ROCK), 0.3, 0.22, 0.2, Math.cos(a) * R, 0.11 + c * 0.23, Math.sin(a) * R, 0, -a + PI / 2, 0, { jit: 0.07 });
    if (c === 0 && rnd.chance(0.35)) mb.box(rnd.pick(PAL.moss), 0.2, 0.06, 0.06, Math.cos(a) * (R + 0.11), 0.06, Math.sin(a) * (R + 0.11), 0, -a + PI / 2, 0, { tier: 2, noAO: true });
  }
  for (let k = 0; k < 14; k++) { const a = (k / 14) * PI * 2; mb.box(0x9a9384, 0.32, 0.06, 0.26, Math.cos(a) * R, 0.72, Math.sin(a) * R, 0, -a + PI / 2, 0, { tier: 1 }); }   // cap stones
  mb.box(0x0e1a20, 0.95, 0.6, 0.95, 0, 0.38, 0, 0, 0, 0, { noAO: true });                                  // the dark shaft
  mb.box(0x1d3a4a, 0.8, 0.02, 0.8, 0, 0.42, 0, 0, 0, 0, { noAO: true, tier: 1 });
  // the frame: posts on stone feet, braces, the windlass with its crank, rope and bucket
  for (const s of [-1, 1]) {
    mb.box(PAL.wood[1], 0.12, 1.6, 0.12, s * 0.74, 0.8, 0);
    mb.box(rnd.pick(ROCK), 0.24, 0.12, 0.24, s * 0.74, 0.06, 0);
    mb.beam(PAL.woodD, 0.06, s * 0.74, 1.3, 0, s * 0.74, 0.6, 0.4, { tier: 1 }); mb.beam(PAL.woodD, 0.06, s * 0.74, 1.3, 0, s * 0.74, 0.6, -0.4, { tier: 1 });
  }
  mb.box(0x7a5636, 1.5, 0.1, 0.1, 0, 1.25, 0);                                                                 // windlass drum
  for (let k = 0; k < 4; k++) mb.box(0xc2b48a, 0.04, 0.115, 0.115, -0.15 + k * 0.08, 1.25, 0, 0, 0, 0, { tier: 2 });    // rope wound on it
  mb.box(PAL.woodD, 0.05, 0.3, 0.05, 0.86, 1.13, 0, 0, 0, 0, { tier: 1 }); mb.box(PAL.woodD, 0.18, 0.05, 0.05, 0.92, 1.0, 0, 0, 0, 0, { tier: 1 });
  mb.box(0xc2b48a, 0.025, 0.5, 0.025, 0, 0.98, 0, 0, 0, 0, { tier: 1 });
  barrel(mb, 0, 0.78, 0, { r: 0.13, h: 0.2, tier: 1, col: 0x6a5030 });
  // a small roof of planks
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) mb.box(PAL.plank[(k + (s > 0 ? 1 : 0)) % 4], 1.7, 0.05, 0.2, 0, 1.7 + (4 - k) * 0.07, s * (0.06 + k * 0.17), s * -0.42, 0, 0, { jit: 0.05 });
  mb.box(PAL.woodD, 1.8, 0.08, 0.08, 0, 2.0, 0);
  // a trough and a wet patch beside it
  mb.box(PAL.wood[0], 0.9, 0.22, 0.3, 0, 0.11, 1.0); mb.box(0x2f5a6a, 0.8, 0.02, 0.2, 0, 0.215, 1.0, 0, 0, 0, { noAO: true, tier: 1 });
  mb.box(0x4a5a48, 1.1, 0.012, 0.6, 0.1, 0.006, 1.05, 0, 0, 0, { noAO: true, tier: 1 });
  return [];
}

function buildTower(ctx: FsCtx, mb: MB, rnd: Rng, main: number) {
  const dyn: any[] = [];
  const H = 3.4, P = 1.6;
  mb.ao = { y0: 0, h: 1.2, k: 0.25 };
  // stone footing in courses of single blocks
  for (let c = 0; c < 3; c++) for (let s = 0; s < 4; s++) {
    mb.push(0, 0, 0, s * PI / 2);
    const w = P + 0.5 - c * 0.08;
    for (let k = 0; k < 5; k++) mb.box(rnd.pick(ROCK), w / 5 - 0.02, 0.17, 0.2, -w / 2 + (k + 0.5) * w / 5 + (c % 2) * 0.06, 0.085 + c * 0.17, w / 2 - 0.1, 0, 0, 0, { jit: 0.07 });
    mb.pop();
  }
  mb.box(0x5d626a, P + 0.3, 0.5, P + 0.3, 0, 0.25, 0);
  // log legs with bark bands, two tiers of rails and X bracing on every side
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mb.box(PAL.wood[1], 0.22, H, 0.22, sx * P / 2, H / 2 + 0.3, sz * P / 2);
    for (let k = 0; k < 5; k++) mb.box(PAL.woodD, 0.235, 0.05, 0.235, sx * P / 2, 0.7 + k * 0.62, sz * P / 2, 0, 0, 0, { tier: 2 });
  }
  for (let s = 0; s < 4; s++) {
    mb.push(0, 0, 0, s * PI / 2);
    for (const y of [1.25, 2.4]) mb.box(PAL.wood[0], P, 0.13, 0.13, 0, y, P / 2);
    mb.beam(PAL.woodD, 0.09, -P / 2, 0.5, P / 2, P / 2, 1.25, P / 2, { tier: 0 }); mb.beam(PAL.woodD, 0.09, P / 2, 0.5, P / 2, -P / 2, 1.25, P / 2, { tier: 1 });
    mb.beam(PAL.woodD, 0.09, -P / 2, 1.25, P / 2, P / 2, 2.4, P / 2, { tier: 0 }); mb.beam(PAL.woodD, 0.09, P / 2, 1.25, P / 2, -P / 2, 2.4, P / 2, { tier: 1 });
    mb.beam(PAL.woodD, 0.08, -P / 2, 2.4, P / 2, P / 2, H + 0.2, P / 2, { tier: 1 });
    for (const x of [-P / 2, P / 2]) for (const y of [1.25, 2.4]) mb.box(0x3a3f48, 0.06, 0.06, 0.06, x, y, P / 2 + 0.07, 0, 0, 0, { tier: 2, mat: "metal" });   // pegs
    mb.pop();
  }
  // platform: joists, single planks, a plank breastwork with arrow slits, hide covers and shields
  for (let k = 0; k < 4; k++) mb.box(PAL.woodD, P + 0.75, 0.12, 0.12, 0, H + 0.17, -0.75 + k * 0.5);
  for (let k = 0; k < 9; k++) mb.box(PAL.plank[k % 4], 0.25, 0.07, P + 0.75, -(P + 0.75) / 2 + (k + 0.5) * (P + 0.75) / 9, H + 0.27, 0, 0, 0, 0, { jit: 0.06 });
  for (let s = 0; s < 4; s++) {
    mb.push(0, 0, 0, s * PI / 2);
    const E = (P + 0.7) / 2;
    for (let k = 0; k < 8; k++) {
      const x = -E + (k + 0.5) * (2 * E) / 8;
      if (k === 3 || k === 4) { mb.box(PAL.plank[k % 4], 2 * E / 8 - 0.02, 0.22, 0.06, x, H + 0.42, E); mb.box(PAL.plank[(k + 1) % 4], 2 * E / 8 - 0.02, 0.22, 0.06, x, H + 0.86, E); continue; }   // slit between
      mb.box(PAL.plank[(k + s) % 4], 2 * E / 8 - 0.02, 0.66 + (k % 2) * 0.05, 0.06, x, H + 0.64, E, 0, 0, 0, { jit: 0.05 });
    }
    mb.box(PAL.wood[0], 2 * E + 0.08, 0.08, 0.1, 0, H + 1.0, E);
    mb.box(0x7a5a3a, 0.5, 0.36, 0.03, -E * 0.55, H + 0.6, E + 0.045, 0, 0, 0.05, { tier: 2, jit: 0.06 });                        // a hide hung over the side
    mb.box(main, 0.34, 0.34, 0.05, E * 0.55, H + 0.62, E + 0.05, 0, 0, PI / 4, { tier: 1 });
    mb.box(0x3a3f48, 0.1, 0.1, 0.06, E * 0.55, H + 0.62, E + 0.07, 0, 0, PI / 4, { tier: 2, mat: "metal" });
    mb.pop();
  }
  // on the platform: a quiver of arrows, a rack of spears, a brazier
  mb.box(0x5a3d26, 0.14, 0.4, 0.14, 0.6, H + 0.51, -0.6, 0.15, 0, 0, { tier: 1 });
  for (let k = 0; k < 5; k++) mb.box(0xe8e4d6, 0.02, 0.14, 0.02, 0.58 + (k % 3) * 0.03, H + 0.78, -0.62 + Math.floor(k / 3) * 0.03, 0.15, 0, 0, { tier: 2, noAO: true });
  mb.box(0x2e3032, 0.26, 0.2, 0.26, -0.6, H + 0.42, -0.6, 0, 0, 0, { tier: 1, mat: "metal" }); mb.box(0xff7a30, 0.16, 0.1, 0.16, -0.6, H + 0.55, -0.6, 0, PI / 4, 0, { tier: 1, mat: "lamp", noAO: true });
  dyn.push({ kind: "halo", x: -0.6, y: H + 0.65, z: -0.6, o: { size: 1.1, color: 0xff9a40, flicker: 0.2, day: 0.1 } });
  // roof on four posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(PAL.wood[1], 0.1, 1.2, 0.1, sx * (P / 2 + 0.25), H + 0.95, sz * (P / 2 + 0.25));
  bellRoof(mb, rnd, { w: P + 0.7, y: H + 1.55, h1: 0.35, h2: 0.6, cols: PAL.thatch, flare: 0.15 });
  // ladder
  for (const s of [-1, 1]) mb.box(PAL.woodD, 0.05, H + 0.3, 0.05, s * 0.22, (H + 0.3) / 2, P / 2 + 0.25);
  for (let k = 0; k < 9; k++) mb.box(PAL.woodD, 0.44, 0.04, 0.05, 0, 0.35 + k * 0.38, P / 2 + 0.25, 0, 0, 0, { tier: 1 });
  dyn.push({ kind: "flag", x: 0, y: H + 2.9, z: 0, o: { w: 0.7, h: 0.38, kind: "pennant", main, accent: 0xe8c04a } });
  mb.box(PAL.wood[1], 0.06, 0.8, 0.06, 0, H + 2.5, 0);
  return dyn;
}

/** A building site: corner posts, a frame, a pile of materials. `p` 0..1 raises the frame. */
export function siteModel(ctx: FsCtx, r: number, owner: any) {
  const mb = new MB(ctx.T, 777); mb.ao = { y0: 0, h: 0.6, k: 0.2 };
  const rnd = new Rng(5);
  mb.box(0x7a5d3a, r * 2 + 0.4, 0.03, r * 2 + 0.4, 0, 0.015, 0, 0, 0, 0, { noAO: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { mb.box(PAL.wood[1], 0.12, 1.1, 0.12, sx * r * 0.8, 0.55, sz * r * 0.8); mb.box(0xe8c04a, 0.14, 0.08, 0.14, sx * r * 0.8, 1.1, sz * r * 0.8, 0, 0, 0, { tier: 1 }); }
  for (let s = 0; s < 4; s++) { mb.push(0, 0, 0, s * PI / 2); mb.box(0xd8c8a0, r * 1.6, 0.02, 0.02, 0, 0.5, r * 0.8, 0, 0, 0, { tier: 1 }); mb.pop(); }
  woodPile(mb, rnd, -r * 0.4, 0, r * 0.3, 0, 2, 0.6, 0);
  for (let k = 0; k < 3; k++) mb.box(rnd.pick(PAL.stone), 0.3, 0.2, 0.3, r * 0.4 + k * 0.2, 0.1, -r * 0.3 + k * 0.1);
  return finish(ctx, mb, owner);
}

/** Build any Free Style building model into a group (`owner` is the scene object that owns its animations). */
export function buildingModel(ctx: FsCtx, type: BType, seed: number, owner: any, color = 0x2f5fb8) {
  const T = ctx.T, rnd = new Rng(seed), mb = new MB(T, seed + 5);
  let dyn: any[] = [];
  if (type === "tent") dyn = buildTent(ctx, mb, rnd, 0xb8302a);
  else if (type === "campfire") dyn = buildCampfire(ctx, mb, rnd);
  else if (type === "well") dyn = buildWell(ctx, mb, rnd);
  else if (type === "tower") dyn = buildTower(ctx, mb, rnd, color);
  else dyn = BUILDERS[type](ctx, mb, rnd, { main: color, accent: 0xe8c04a, variant: seed % 3 });
  const g = mb.build(ctx.mats, true);
  track(ctx, g, owner);
  owner.add(g);
  attachDyn(ctx, owner, owner, dyn);
  return g;
}

// ------------------------------------------------------------------------------------------------ animals
export interface AnimalRig { group: any; body: any; head: any; legs: any[]; tail?: any; proxy: any; kind: string }

function pivot(T: any, x: number, y: number, z: number) { const g = new T.Group(); g.position.set(x, y, z); return g; }

const animalCache = new Map<string, any>();
/** One animal part: built once per key, then every animal gets its own meshes over the shared geometry. */
function partGeo(ctx: FsCtx, key: string, fill: (mb: MB) => void) {
  let p = animalCache.get(key);
  if (!p) { const mb = new MB(ctx.T, key.length * 31 + key.charCodeAt(0)); mb.ao = { y0: -1, h: 1.2, k: 0.1 }; mb.jitter = 0.03; fill(mb); p = mb.build(ctx.mats, true); animalCache.set(key, p); }
  const g = new ctx.T.Group(), tiers: any[][] = [[], [], []];
  p.children.forEach((c: any) => { const m = new ctx.T.Mesh(c.geometry, c.material); m.userData.tier = c.userData.tier; m.castShadow = c.castShadow; m.receiveShadow = c.receiveShadow; tiers[c.userData.tier].push(m); g.add(m); });
  g.userData.tiers = tiers;
  return g;
}
export function disposeAnimalCache() { animalCache.forEach((g) => g.traverse((o: any) => o.geometry && o.geometry.dispose())); animalCache.clear(); }

/** Stop tracking the detail tiers of everything under `root` (when it leaves the scene for good). */
export function untrack(ctx: FsCtx, root: any) {
  const gone = new Set<any>(); root.traverse((o: any) => gone.add(o));
  ctx.tiered = ctx.tiered.filter((m: any) => !gone.has(m) && !gone.has(m.userData && m.userData.owner));
}

export function animalModel(ctx: FsCtx, kind: "chicken" | "sheep" | "cow", variant: number): AnimalRig {
  const T = ctx.T, group = new T.Group();
  const legs: any[] = [];
  let body: any, head: any, tail: any = null, proxyR = 0.4, proxyH = 0.5;
  if (kind === "chicken") {
    const c = [0xf4f0e6, 0xb8743a, 0x2a2420][variant % 3]!, wing = shade(c, 0.86), dark = shade(c, 0.72);
    body = pivot(T, 0, 0.28, 0); head = pivot(T, 0, 0.17, 0.13);
    body.add(partGeo(ctx, "ch-body" + c, (mb) => {
      mb.box(c, 0.22, 0.19, 0.28, 0, 0, 0);
      mb.box(shade(c, 1.04), 0.2, 0.08, 0.12, 0, -0.07, 0.12);                                        // breast
      mb.box(shade(c, 0.95), 0.18, 0.06, 0.2, 0, 0.11, -0.02, 0, 0, 0, { tier: 1 });                  // back
      for (const s of [-1, 1]) {                                                                       // wings in three feather rows
        mb.box(wing, 0.035, 0.13, 0.2, s * 0.12, 0.01, -0.01);
        mb.box(dark, 0.04, 0.04, 0.16, s * 0.125, -0.05, -0.05, 0, 0, 0, { tier: 1 });
        mb.box(shade(c, 0.8), 0.04, 0.035, 0.1, s * 0.125, -0.085, -0.09, 0, 0, 0, { tier: 2 });
      }
      for (let k = 0; k < 3; k++) mb.box(k === 1 ? dark : wing, 0.05, 0.16 - k * 0.02, 0.05, (k - 1) * 0.055, 0.1 + (k === 1 ? 0.03 : 0), -0.17, -0.55 - (k - 1) * 0.05, 0, (k - 1) * 0.25);   // tail fan
      mb.box(shade(c, 0.9), 0.14, 0.06, 0.06, 0, -0.1, -0.12, 0, 0, 0, { tier: 2 });                   // fluff under the tail
    }));
    head.add(partGeo(ctx, "ch-head" + c, (mb) => {
      mb.box(c, 0.12, 0.15, 0.12, 0, 0.06, 0);
      mb.box(0xe8b020, 0.055, 0.03, 0.06, 0, 0.07, 0.085); mb.box(0xc89018, 0.045, 0.025, 0.05, 0, 0.045, 0.08, 0, 0, 0, { tier: 1 });   // beak, upper and lower
      for (let k = 0; k < 3; k++) mb.box(0xd02020, 0.03, 0.05 + (k === 1 ? 0.02 : 0), 0.035, 0, 0.15 + (k === 1 ? 0.01 : 0), 0.04 - k * 0.04);   // comb
      mb.box(0xd02020, 0.035, 0.05, 0.03, 0, 0.015, 0.075);                                           // wattle
      for (const s of [-1, 1]) { mb.box(0xf0e8d0, 0.012, 0.03, 0.03, s * 0.062, 0.085, 0.03, 0, 0, 0, { tier: 1, noAO: true }); mb.box(0x101010, 0.014, 0.018, 0.018, s * 0.064, 0.085, 0.035, 0, 0, 0, { noAO: true }); mb.box(0xc03030, 0.012, 0.03, 0.025, s * 0.062, 0.05, 0.02, 0, 0, 0, { tier: 2, noAO: true }); }
    }));
    body.add(head);
    for (const s of [-1, 1]) { const l = pivot(T, s * 0.06, 0.2, 0); l.add(partGeo(ctx, "ch-leg" + c, (mb) => {
      mb.box(c, 0.06, 0.05, 0.06, 0, -0.01, 0, 0, 0, 0, { tier: 1 });                                // feathered thigh
      mb.box(0xe8b020, 0.03, 0.16, 0.03, 0, -0.1, 0);
      for (let k = -1; k <= 1; k++) mb.box(0xe8b020, 0.018, 0.018, 0.08, k * 0.022, -0.185, 0.035, 0, k * 0.4, 0);   // three toes forward
      mb.box(0xd8a018, 0.018, 0.018, 0.04, 0, -0.185, -0.025, 0, 0, 0, { tier: 2 });                // back toe
    })); legs.push(l); group.add(l); }
    proxyR = 0.25; proxyH = 0.45;
  } else if (kind === "sheep") {
    const wool = [0xf0ece2, 0xe6e0d2, 0x4a4440][variant % 3]!, face = variant % 3 === 2 ? 0x1e1a18 : 0x2a2420;
    body = pivot(T, 0, 0.62, 0); head = pivot(T, 0, 0.14, 0.42);
    body.add(partGeo(ctx, "sh-body" + wool, (mb) => {
      mb.box(shade(wool, 0.9), 0.56, 0.44, 0.78, 0, 0, 0);
      // fleece: a shell of chunky cubes of slightly different size and shade
      const r2 = new Rng(wool & 0xffff);
      for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 5; iz++) {
        const x = -0.24 + ix * 0.16, z = -0.33 + iz * 0.165, s = r2.range(0.17, 0.22);
        mb.box(shade(wool, r2.range(0.94, 1.06)), s, s * 0.8, s, x + r2.range(-0.02, 0.02), 0.22 + r2.range(-0.01, 0.03), z, 0, 0, 0, { tier: ix === 0 || ix === 3 ? 1 : 0, jit: 0.03 });
      }
      for (const sd of [-1, 1]) for (let iy = 0; iy < 2; iy++) for (let iz = 0; iz < 5; iz++) { const s = r2.range(0.15, 0.2); mb.box(shade(wool, r2.range(0.9, 1.04)), s * 0.7, s, s, sd * (0.28 + r2.range(0, 0.02)), -0.1 + iy * 0.19, -0.33 + iz * 0.165, 0, 0, 0, { tier: iy ? 1 : 0, jit: 0.03 }); }
      for (let k = 0; k < 4; k++) mb.box(shade(wool, r2.range(0.92, 1.02)), 0.18, 0.18, 0.08, -0.15 + (k % 2) * 0.3, -0.05 + Math.floor(k / 2) * 0.2, -0.42, 0, 0, 0, { tier: 1 });   // rump
      for (let k = 0; k < 4; k++) mb.box(shade(wool, r2.range(0.95, 1.05)), 0.18, 0.18, 0.08, -0.15 + (k % 2) * 0.3, -0.05 + Math.floor(k / 2) * 0.2, 0.42, 0, 0, 0, { tier: 1 });    // chest
      mb.box(shade(wool, 0.85), 0.1, 0.12, 0.06, 0, 0.02, -0.47, 0, 0, 0, { tier: 2 });                // little tail
    }));
    head.add(partGeo(ctx, "sh-head" + wool, (mb) => {
      mb.box(face, 0.19, 0.22, 0.28, 0, 0, 0.08); mb.box(shade(face, 1.3), 0.15, 0.1, 0.06, 0, -0.06, 0.23);   // face, nose
      for (let k = 0; k < 5; k++) mb.box(shade(wool, 1 - (k % 2) * 0.05), 0.1, 0.09, 0.1, -0.08 + (k % 3) * 0.08, 0.13 + (k > 2 ? 0.04 : 0), -0.02 + (k > 2 ? 0.04 : 0), 0, 0, 0, { tier: k < 3 ? 0 : 1 });   // wool cap
      for (const s of [-1, 1]) {
        mb.box(face, 0.13, 0.05, 0.08, s * 0.15, 0.04, 0.0, 0, 0, s * 0.45); mb.box(0xc89090, 0.08, 0.02, 0.05, s * 0.16, 0.045, 0.01, 0, 0, s * 0.45, { tier: 2 });   // ears
        mb.box(0xe8e0c0, 0.012, 0.035, 0.04, s * 0.098, 0.04, 0.15, 0, 0, 0, { noAO: true }); mb.box(0x101010, 0.014, 0.02, 0.022, s * 0.1, 0.04, 0.16, 0, 0, 0, { noAO: true, tier: 1 });   // eyes
        mb.box(0x101010, 0.02, 0.02, 0.01, s * 0.035, -0.05, 0.262, 0, 0, 0, { tier: 2, noAO: true });   // nostrils
      }
    }));
    body.add(head);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = pivot(T, sx * 0.17, 0.42, sz * 0.26); l.add(partGeo(ctx, "sh-leg" + wool, (mb) => {
      mb.box(shade(wool, 0.95), 0.15, 0.14, 0.15, 0, -0.04, 0, 0, 0, 0, { tier: 1 });                // wool at the top of the leg
      mb.box(face, 0.09, 0.36, 0.09, 0, -0.22, 0); mb.box(0x151210, 0.1, 0.06, 0.11, 0, -0.39, 0.01);
    })); legs.push(l); group.add(l); }
    proxyR = 0.45; proxyH = 0.9;
  } else {
    const base = [0xf2f0ea, 0x6b4428, 0x2a2622][variant % 3]!, patch = variant % 3 === 0 ? 0x1a1816 : variant % 3 === 1 ? 0xf2f0ea : 0x4a4038;
    const spot = (seed: number, a: number, b: number) => { const v = Math.sin(a * 2.1 + seed) * Math.cos(b * 1.7 - seed * 0.7) + Math.sin(a * 0.8 - b * 1.3 + seed * 2); return v > 0.75; };
    body = pivot(T, 0, 0.95, 0); head = pivot(T, 0, 0.2, 0.75);
    body.add(partGeo(ctx, "cw-body" + base, (mb) => {
      mb.box(base, 0.78, 0.66, 1.36, 0, 0, 0);
      mb.box(shade(base, 1.04), 0.72, 0.12, 0.5, 0, 0.36, 0.35);                                     // shoulders
      mb.box(shade(base, 0.97), 0.74, 0.1, 0.46, 0, 0.35, -0.42);                                    // hips
      mb.box(shade(base, 0.9), 0.66, 0.1, 1.1, 0, -0.36, 0, 0, 0, 0, { tier: 1 });                   // belly
      mb.box(shade(base, 1.06), 0.5, 0.42, 0.16, 0, -0.06, 0.72, 0, 0, 0, { tier: 1 });              // dewlap / chest
      // patches as a pixel pattern of small blocks on the sides and back
      const P = 0.11;
      for (const s of [-1, 1]) for (let iy = 0; iy < 6; iy++) for (let iz = 0; iz < 12; iz++) {
        if (!spot(s * 3 + variant, iz, iy)) continue;
        mb.box(patch, 0.016, P, P, s * 0.396, -0.28 + iy * P, -0.6 + iz * P, 0, 0, 0, { tier: 1, noAO: true, jit: 0.04 });
      }
      for (let ix = 0; ix < 7; ix++) for (let iz = 0; iz < 12; iz++) { if (!spot(9 + variant, iz, ix + 3)) continue; mb.box(patch, P, 0.016, P, -0.33 + ix * P, 0.338, -0.6 + iz * P, 0, 0, 0, { tier: 1, noAO: true, jit: 0.04 }); }
      mb.box(0xe8a0a0, 0.3, 0.12, 0.3, 0, -0.42, -0.35, 0, 0, 0, { tier: 1 });                        // udder
      for (let k = 0; k < 4; k++) mb.box(0xd88a8a, 0.04, 0.08, 0.04, (k % 2 ? 0.08 : -0.08), -0.5, -0.35 + (k > 1 ? 0.08 : -0.08), 0, 0, 0, { tier: 2 });
    }));
    head.add(partGeo(ctx, "cw-head" + base, (mb) => {
      mb.box(base, 0.4, 0.4, 0.46, 0, 0.02, 0.1);
      mb.box(shade(base, 1.08), 0.28, 0.1, 0.06, 0, 0.17, 0.33, 0, 0, 0, { tier: 1 });                // forehead
      mb.box(patch, 0.14, 0.2, 0.02, 0, 0.08, 0.335, 0, 0, 0, { tier: 1, noAO: true });               // blaze
      mb.box(0xe8b8a0, 0.36, 0.22, 0.14, 0, -0.1, 0.38); mb.box(0xd8a090, 0.3, 0.06, 0.12, 0, -0.2, 0.37, 0, 0, 0, { tier: 1 });   // muzzle, chin
      mb.box(shade(base, 0.85), 0.3, 0.06, 0.06, 0, 0.24, 0.0, 0, 0, 0, { tier: 2 });                 // poll tuft
      for (const s of [-1, 1]) {
        mb.box(0xd8d0b0, 0.14, 0.07, 0.07, s * 0.25, 0.22, 0.02, 0, 0, s * 0.25); mb.box(0xc8c0a0, 0.06, 0.12, 0.06, s * 0.34, 0.3, 0.02, 0, 0, -s * 0.2, { tier: 1 }); mb.box(0x3a3028, 0.05, 0.06, 0.05, s * 0.36, 0.38, 0.02, 0, 0, 0, { tier: 2 });   // horns
        mb.box(base, 0.16, 0.06, 0.12, s * 0.27, 0.08, -0.04, 0, 0, -s * 0.3); mb.box(0xc89090, 0.1, 0.02, 0.07, s * 0.28, 0.085, -0.03, 0, 0, -s * 0.3, { tier: 2 });   // ears
        mb.box(0xf0f0f0, 0.02, 0.06, 0.07, s * 0.205, 0.08, 0.22, 0, 0, 0, { noAO: true, tier: 1 }); mb.box(0x101010, 0.025, 0.05, 0.04, s * 0.207, 0.08, 0.235, 0, 0, 0, { noAO: true });   // eyes
        mb.box(0x5a3a3a, 0.06, 0.05, 0.02, s * 0.08, -0.1, 0.455, 0, 0, 0, { tier: 1, noAO: true });   // nostrils
      }
    }));
    body.add(head);
    tail = pivot(T, 0, 0.25, -0.69);
    tail.add(partGeo(ctx, "cw-tail" + base, (mb) => { mb.box(shade(base, 0.9), 0.06, 0.6, 0.06, 0, -0.3, 0); mb.box(0x1a1816, 0.11, 0.16, 0.11, 0, -0.64, 0); mb.box(0x2a2420, 0.08, 0.08, 0.08, 0, -0.74, 0, 0, 0, 0, { tier: 2 }); }));
    body.add(tail);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = pivot(T, sx * 0.25, 0.62, sz * 0.46); l.add(partGeo(ctx, "cw-leg" + base + sz, (mb) => {
      mb.box(base, 0.19, 0.24, 0.2, 0, -0.08, 0);                                                     // upper leg
      mb.box(shade(base, 0.95), 0.15, 0.2, 0.15, 0, -0.3, 0); mb.box(shade(base, 0.85), 0.16, 0.06, 0.16, 0, -0.2, 0.0, 0, 0, 0, { tier: 1 });   // lower leg, knee
      mb.box(0xece6d8, 0.15, 0.06, 0.15, 0, -0.44, 0, 0, 0, 0, { tier: 1 });                         // pale fetlock
      for (const s of [-1, 1]) mb.box(0x221c18, 0.07, 0.11, 0.17, s * 0.04, -0.56, 0.01);           // split hoof
    })); legs.push(l); group.add(l); }
    proxyR = 0.6; proxyH = 1.4;
  }
  group.add(body);
  const proxy = new T.Mesh(new T.CylinderGeometry(proxyR, proxyR, proxyH, 6), new T.MeshBasicMaterial({ visible: false }));
  proxy.position.y = proxyH / 2; group.add(proxy);
  group.traverse((o: any) => { if (o.userData && o.userData.tiers) { ctx.tiered.push(o); applyTier(o, ctx.gfx.f.tier); } });
  return { group, body, head, legs, tail, proxy, kind };
}
