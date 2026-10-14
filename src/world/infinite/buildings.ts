// @ts-nocheck
import type { Ctx } from "./types";
import { MB, applyTier } from "./mb";
import { Rng } from "./rng";
import { PAL, shade, mix, stoneBox, gableRoof, windowAt, doorAt, lantern, barrel, crate, sack, hayBale, woodPile, fence, bush, vines, ivy, roundShield, bracket, slabs, quoins } from "./props";
import { addCave } from "./caves";

/**
 * The player's buildings in the Infinite world: house, farm (with a windmill), mine, workshop, market and armory. Each model is built
 * once as merged, vertex-coloured meshes (a few draw calls) with detail tiers for the Graphics levels. Parts that move (flags,
 * smoke, a weather vane, windmill sails, halos) are separate small objects handled by anim.ts.
 */
const PI = Math.PI;

export interface FC { main: number; accent: number; variant: number }
export type Dyn =
  | { kind: "flag"; x: number; y: number; z: number; o?: any }
  | { kind: "smoke"; x: number; y: number; z: number; o?: any }
  | { kind: "halo"; x: number; y: number; z: number; o?: any }
  | { kind: "vane"; x: number; y: number; z: number; mb: MB }
  | { kind: "mill"; x: number; y: number; z: number; cap: MB; rotor: MB; rz: number; ry: number }
  | { kind: "tick"; fn: (owner: any, dt: number, t: number) => void };

/** Run `fn` once for each of the four walls of a W x D box: the wall plane is at local z = fz, and the wall is fw wide. */
export function eachWall(mb: MB, W: number, D: number, fn: (i: number, fw: number, fz: number) => void) {
  for (let i = 0; i < 4; i++) { mb.push(0, 0, 0, i * PI / 2); fn(i, i % 2 ? D : W, (i % 2 ? W : D) / 2); mb.pop(); }
}

/** A small arrow-shaped weather vane (points along +x). */
export function vaneModel(ctx: Ctx, size = 1): MB {
  const mb = new MB(ctx.T, 91);
  mb.ao = { y0: -9, h: 1, k: 0 };
  const m = { mat: "metal" as const, tier: 2 as const, noAO: true };
  mb.box(PAL.brass, 0.5 * size, 0.025 * size, 0.025 * size, 0, 0, 0, 0, 0, 0, m);
  mb.cone(PAL.brass, 0.07 * size, 0.2 * size, 0.33 * size, 0, 0, 5, 0, 0, -PI / 2, m);
  mb.plate(PAL.brass, [[0, -0.01], [-0.2 * size, 0.1 * size], [-0.26 * size, 0.1 * size], [-0.2 * size, 0], [-0.26 * size, -0.1 * size], [-0.2 * size, -0.1 * size]], 0.012, -0.2 * size, 0, 0, 0, 0, 0, 0, m);
  return mb;
}

// ------------------------------------------------------------------------------------------------------------------ house
function buildHouse(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [];
  const W = 2.3, D = 1.9, FH = 0.28, WH = 1.47, TOP = FH + WH, RH = 1.0;
  const v = fc.variant % 3;
  const wall = v === 1 ? PAL.plank[1] : PAL.plaster[v === 0 ? 0 : 1];
  const roof = v === 0 ? PAL.tile : v === 1 ? PAL.thatch : PAL.slate;
  const ridgeC = v === 0 ? PAL.tileD : v === 1 ? 0x8a7030 : 0x353b46;
  const trim = v === 1 ? PAL.woodD : PAL.wood[1];
  mb.ao = { y0: 0, h: 0.9, k: 0.22 };

  stoneBox(mb, rnd, W + 0.16, FH, D + 0.16, 0, 0, 0, { tier: 1 });
  mb.bar(wall, W, WH, D, 0, FH, 0, 0, { grad: [shade(wall, 0.8), wall, FH, TOP], jit: 0.03 });
  if (v === 2) stoneBox(mb, rnd, W + 0.05, 0.72, D + 0.05, 0, FH, 0, { tier: 1 });                  // stone lower storey
  eachWall(mb, W, D, (i, fw, fz) => {
    if (v === 1) { // vertical boards
      const n = Math.round(fw / 0.2), bw = fw / n;
      for (let k = 0; k < n; k++) mb.quad(rnd.pick(PAL.plank), bw - 0.012, WH, -fw / 2 + (k + 0.5) * bw, FH + WH / 2, fz + 0.006, 0, 0, 0, { tier: 1, jit: 0.06 });
      mb.box(trim, fw + 0.1, 0.1, 0.1, 0, TOP - 0.05, fz + 0.02, 0, 0, 0, { tier: 1 });
      for (const sx of [-1, 1]) mb.box(trim, 0.12, WH, 0.12, sx * fw / 2, FH + WH / 2, fz + 0.02, 0, 0, 0, { tier: 1 });
    } else { // timber frame over plaster
      mb.box(trim, fw + 0.12, 0.1, 0.1, 0, FH + 0.05, fz + 0.015, 0, 0, 0, { tier: 1 });
      mb.box(trim, fw + 0.12, 0.12, 0.12, 0, TOP - 0.06, fz + 0.02, 0, 0, 0, { tier: 1 });
      for (const sx of [-1, 1]) {
        mb.box(trim, 0.12, WH, 0.12, sx * fw / 2, FH + WH / 2, fz + 0.02, 0, 0, 0, { tier: 1 });
        mb.beam(trim, 0.07, sx * (fw / 2 - 0.05), FH + 0.12, fz + 0.03, sx * (fw / 2 - 0.44), TOP - 0.14, fz + 0.03, { tier: 1 });
      }
      if (i % 2 === 0) mb.box(trim, 0.09, WH, 0.09, 0.04, FH + WH / 2, fz + 0.015, 0, 0, 0, { tier: 1 });
    }
    const sh = v === 1 ? PAL.wood[0] : fc.main;
    if (i === 0) {
      doorAt(mb, rnd, -0.55, fz, { w: 0.58, h: 1.12, y0: FH, step: false });
      windowAt(mb, rnd, 0.62, FH + 0.86, fz, { w: 0.4, h: 0.5, shutter: sh, box: true });
    } else if (i === 2) windowAt(mb, rnd, 0.6, FH + 0.86, fz, { w: 0.4, h: 0.5, shutter: sh });
    else windowAt(mb, rnd, 0, FH + 0.86, fz, { w: 0.4, h: 0.5, shutter: sh });
  });
  // doorstep
  mb.bar(PAL.stone[1], 0.95, 0.14, 0.34, -0.55, 0, D / 2 + 0.22, 0, { tier: 1 });
  mb.bar(PAL.stone[2], 0.85, 0.14, 0.26, -0.55, 0.14, D / 2 + 0.12, 0, { tier: 1 });
  quoins(mb, rnd, W / 2, D / 2, FH, TOP, 0.12, 2);
  quoins(mb, rnd, -W / 2, D / 2, FH, TOP, 0.12, 2);

  gableRoof(mb, rnd, { w: W, d: D, h: RH, y: TOP, cols: roof, ridge: ridgeC, end: wall, t: v === 1 ? 0.16 : 0.09, ov: v === 1 ? 0.34 : 0.26 });

  // chimney through the back slope
  stoneBox(mb, rnd, 0.36, 1.0, 0.36, 0.62, TOP + 0.38, -0.4, { tier: 1 });
  mb.box(PAL.stoneD, 0.46, 0.08, 0.46, 0.62, TOP + 1.42, -0.4, 0, 0, 0);
  mb.box(0x151515, 0.2, 0.02, 0.2, 0.62, TOP + 1.47, -0.4, 0, 0, 0, { tier: 1 });
  dyn.push({ kind: "smoke", x: 0.62, y: TOP + 1.5, z: -0.4 });

  // porch lantern
  bracket(mb, 0.02, FH + 1.2, D / 2 + 0.02, 0.2);
  lantern(mb, 0.02, FH + 1.03, D / 2 + 0.2, { tier: 1 });
  dyn.push({ kind: "halo", x: 0.02, y: FH + 1.03, z: D / 2 + 0.2, o: { size: 0.75, color: 0xffc070, flicker: 0.05 } });

  // yard
  barrel(mb, 0.98, 0, D / 2 + 0.3, { tier: 1 });
  barrel(mb, 1.2, 0, D / 2 + 0.16, { tier: 2, r: 0.16, h: 0.34 });
  woodPile(mb, rnd, -W / 2 - 0.3, 0, 0.1, PI / 2, 3, 0.55, 1);
  crate(mb, 1.05, 0, D / 2 + 0.7, 0.3, 0.3, { tier: 2 });
  bush(mb, rnd, -1.12, 0, D / 2 + 0.28, 0.28, { tier: 2, flowers: 5 });
  bush(mb, rnd, W / 2 + 0.15, 0, -D / 2 - 0.1, 0.3, { tier: 2 });
  ivy(mb, rnd, 0.0, FH + 0.15, -D / 2 - 0.01, 1.6, 1.1, { n: 10 });
  slabs(mb, rnd, -0.55, D / 2 + 0.45, D / 2 + 1.2, 0.6, 1);

  // flag on the left gable, weather vane on the right
  mb.box(PAL.wood[1], 0.05, 0.95, 0.05, -(W / 2 + 0.16), TOP + RH + 0.42, 0);
  dyn.push({ kind: "flag", x: -(W / 2 + 0.16), y: TOP + RH + 0.86, z: 0, o: { w: 0.62, h: 0.3, kind: "pennant", main: fc.main, accent: fc.accent, pattern: "bands" } });
  mb.box(PAL.iron, 0.025, 0.28, 0.025, W / 2 + 0.16, TOP + RH + 0.14, 0, 0, 0, 0, { tier: 2, mat: "metal" });
  dyn.push({ kind: "vane", x: W / 2 + 0.16, y: TOP + RH + 0.3, z: 0, mb: vaneModel(ctx, 0.9) });
  return dyn;
}

// ------------------------------------------------------------------------------------------------------------------ farm
function buildFarm(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [], T = ctx.T;
  mb.ao = { y0: 0, h: 0.5, k: 0.16 };
  const FX = 3.0, FZ = 2.3, CZ = 0.2;
  mb.bar(0x5a3e28, FX + 0.2, 0.09, FZ + 0.2, 0, 0, CZ, 0, { jit: 0.03 });
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const x = -FX / 2 + 0.22 + r * (FX - 0.44) / (rows - 1), kind = [0, 1, 0, 2, 0, 1, 0][r]!;
    mb.bar(r % 2 ? 0x6a4a30 : 0x4c3422, 0.24, 0.07, FZ - 0.1, x, 0.09, CZ, 0, { jit: 0.05 });
    mb.bar(kind === 1 ? 0x5aa832 : kind === 2 ? 0x6ab04a : 0xd0b048, 0.15, 0.1, FZ - 0.5, x, 0.16, CZ, 0, { jit: 0.1, noAO: true });
    const N = 9;
    for (let c = 0; c < N; c++) {
      const z = CZ - (FZ - 0.5) / 2 + c * (FZ - 0.5) / (N - 1) + rnd.range(-0.05, 0.05), t = c % 2 ? 2 : 1;
      if (kind === 0) { // wheat: two crossed blades with a heavy ear
        const h = rnd.range(0.42, 0.58), a = rnd.range(0, 3);
        for (let k = 0; k < 2; k++) mb.quad(0xd8b84a, 0.2, h, x, 0.2 + h / 2, z, 0, a + k * PI / 2, 0, { tier: t, mat: "swayDS", grad: [0x5e8a2a, 0xe6c85a, 0.2, 0.2 + h], sway: 1.3, swayY0: 0.2, swayH: h, jit: 0.1, noAO: true });
      } else if (kind === 1) { // cabbages
        mb.blob(0x4f9a3a, 0.1, x, 0.22, z, 1, 0.8, 1, 0, rnd.range(0, 6), { tier: t, jit: 0.1, noAO: true });
        mb.blob(0x8ac060, 0.06, x, 0.27, z, 1, 0.8, 1, 0, 0, { tier: 2, noAO: true });
      } else { // carrot tops
        for (let k = 0; k < 3; k++) mb.cone(0x5aa832, 0.035, 0.22, x + rnd.range(-0.04, 0.04), 0.3, z + rnd.range(-0.04, 0.04), 5, rnd.range(-0.3, 0.3), 0, rnd.range(-0.3, 0.3), { tier: t, mat: "sway", sway: 1, swayY0: 0.2, swayH: 0.22, noAO: true });
        mb.blob(0xe8802a, 0.04, x, 0.2, z, 1, 0.8, 1, 0, 0, { tier: 2, noAO: true });
      }
    }
  }
  for (let i = 0; i < 4; i++) { // pumpkins at the end of the rows
    const px = -FX / 2 + 0.22 + (i * 2 + 1) * (FX - 0.44) / (rows - 1), pz = CZ + FZ / 2 - 0.16;
    mb.sphere(0xe87a1a, 0.13, px, 0.2, pz, 1, 0.78, 1, 8, 6, { tier: 2, jit: 0.1 });
    mb.box(0x4a6a2a, 0.04, 0.08, 0.04, px, 0.34, pz, 0.2, 0, 0, { tier: 2 });
  }
  // fence with a gate gap at the front
  const fx = FX / 2 + 0.18, z0 = CZ - FZ / 2 - 0.15, z1 = CZ + FZ / 2 + 0.15;
  fence(mb, rnd, -fx, z0, fx, z0, 0.5, { tier: 1 });
  fence(mb, rnd, -fx, z0, -fx, z1, 0.5, { tier: 1 });
  fence(mb, rnd, fx, z0, fx, z1, 0.5, { tier: 1 });
  fence(mb, rnd, -fx, z1, -0.32, z1, 0.5, { tier: 1 });
  fence(mb, rnd, 0.32, z1, fx, z1, 0.5, { tier: 1 });
  for (const sx of [-1, 1]) { mb.bar(PAL.wood[1], 0.11, 0.85, 0.11, sx * 0.32, 0, z1, 0, { tier: 1 }); mb.box(PAL.wood[2], 0.15, 0.05, 0.15, sx * 0.32, 0.87, z1, 0, 0, 0, { tier: 1 }); }
  mb.box(PAL.plank[0], 0.5, 0.2, 0.04, 0, 0.78, z1, 0, 0, 0, { tier: 1 });                                                     // sign over the gate
  mb.beam(PAL.wood[1], 0.04, -0.3, 0.65, z1, 0.3, 0.9, z1, { tier: 1 });
  for (const sx of [-0.12, 0.12]) mb.cone(0xe0c050, 0.04, 0.16, sx, 0.78, z1 + 0.03, 5, 0, 0, 0, { tier: 2, noAO: true });

  // scarecrow
  const sx = 0.9, sz = CZ + 0.05;
  mb.bar(PAL.wood[1], 0.06, 1.35, 0.06, sx, 0, sz, 0, { tier: 1 });
  mb.box(PAL.wood[0], 0.9, 0.05, 0.05, sx, 1.0, sz, 0, 0, 0.06, { tier: 1 });
  mb.sphere(0xb89a52, 0.17, sx, 0.82, sz, 0.9, 1.15, 0.8, 7, 5, { tier: 1, mat: "sway", sway: 0.6, swayY0: 0.5, swayH: 0.9, jit: 0.1 });
  mb.sphere(0xcdb27a, 0.1, sx, 1.3, sz, 1, 1, 1, 7, 5, { tier: 1 });
  mb.cyl(0x5a3d24, 0.22, 0.22, 0.025, sx, 1.4, sz, 10, 0, 0, 0, { tier: 1 });
  mb.cone(0x6a4a2c, 0.12, 0.2, sx, 1.52, sz, 8, 0, 0, 0.08, { tier: 1 });
  for (const sg of [-1, 1]) {
    mb.box(0x3f5f9a, 0.12, 0.26, 0.02, sx + sg * 0.5, 0.84, sz + 0.02, 0, 0, sg * 0.05, { tier: 2, mat: "swayDS", sway: 1.2, swayY0: 0.7, swayH: 0.28, swayInv: true });
    mb.cone(0xe0c050, 0.04, 0.14, sx + sg * 0.46, 1.0, sz, 5, 0, 0, sg * 1.2, { tier: 2, mat: "sway", sway: 1, swayY0: 0.95, swayH: 0.1 });
  }
  mb.box(0x1a1410, 0.02, 0.02, 0.01, sx - 0.04, 1.32, sz + 0.1, 0, 0, 0, { tier: 2, noAO: true });
  mb.box(0x1a1410, 0.02, 0.02, 0.01, sx + 0.04, 1.32, sz + 0.1, 0, 0, 0, { tier: 2, noAO: true });

  // windmill behind the field
  const mx = -1.15, mz = -1.55, MH = 2.3;
  mb.cyl(PAL.stone[0], 0.7, 0.72, 0.34, mx, 0.17, mz, 10, 0, 0, 0, { grad: [PAL.stoneD, PAL.stone[2], 0, 0.34] });
  mb.cyl(PAL.plaster[0], 0.42, 0.62, MH - 0.3, mx, 0.34 + (MH - 0.3) / 2, mz, 10, 0, 0, 0, { grad: [PAL.plaster[1], PAL.plaster[0], 0.3, MH] });
  for (const f of [0.34, 0.62, 0.9]) { const y = 0.34 + (MH - 0.3) * f, r = 0.62 - 0.2 * (y - 0.34) / (MH - 0.3); mb.cyl(PAL.wood[1], r + 0.03, r + 0.04, 0.07, mx, y, mz, 10, 0, 0, 0, { tier: 1 }); }
  mb.push(mx, 0, mz, 0);
  doorAt(mb, rnd, 0, 0.6, { w: 0.34, h: 0.66, y0: 0.0, step: false });
  windowAt(mb, rnd, 0, 1.35, 0.52, { w: 0.2, h: 0.28, shutter: fc.main });
  windowAt(mb, rnd, 0, 1.85, 0.46, { w: 0.18, h: 0.24 });
  mb.pop();
  for (const sg of [-1, 1]) mb.beam(PAL.wood[1], 0.06, mx + sg * 0.5, 0.34, mz + 0.35, mx + sg * 0.44, 1.2, mz + 0.3, { tier: 1 });          // buttress props
  const cap = new MB(T, 77);
  cap.ao = { y0: -9, h: 1, k: 0 };
  cap.cyl(PAL.wood[1], 0.46, 0.44, 0.12, 0, 0.06, 0, 10);
  cap.dome(PAL.wood[0], 0.5, 0, 0.12, 0, 1, 0.95, 1.15, 10);
  cap.box(PAL.wood[2], 0.08, 0.1, 0.9, 0, 0.64, 0.1, 0, 0, 0, { tier: 1 });
  cap.cyl(PAL.iron, 0.05, 0.05, 0.62, 0, 0.36, 0.46, 8, PI / 2, 0, 0, { mat: "metal" });
  cap.cone(PAL.brass, 0.06, 0.2, 0, 0.72, 0, 5, 0, 0, 0, { tier: 1, mat: "metal" });
  const rotor = new MB(T, 78);
  rotor.ao = { y0: -9, h: 1, k: 0 };
  rotor.sphere(PAL.iron, 0.1, 0, 0, 0, 1, 1, 0.8, 8, 6, { mat: "metal" });
  for (let k = 0; k < 4; k++) {
    const al = k * PI / 2 + PI / 4, dx = Math.cos(al), dy = Math.sin(al), nx = -dy, ny = dx;
    rotor.beam(PAL.wood[1], 0.06, dx * 0.08, dy * 0.08, 0, dx * 1.18, dy * 1.18, 0);
    rotor.box(0xe8dcc0, 0.3, 0.86, 0.025, dx * 0.7 + nx * 0.17, dy * 0.7 + ny * 0.17, 0.02, 0, 0, al - PI / 2, { mat: "litDS", jit: 0.04, noAO: true });
    rotor.box(fc.main, 0.3, 0.1, 0.03, dx * 1.05 + nx * 0.17, dy * 1.05 + ny * 0.17, 0.025, 0, 0, al - PI / 2, { tier: 1, mat: "litDS", noAO: true });
    for (let b = 0; b < 4; b++) rotor.box(PAL.wood[0], 0.32, 0.025, 0.03, dx * (0.3 + b * 0.22) + nx * 0.17, dy * (0.3 + b * 0.22) + ny * 0.17, 0.04, 0, 0, al - PI / 2 + PI / 2, { tier: 1 });
  }
  dyn.push({ kind: "mill", x: mx, y: MH + 0.02, z: mz, cap, rotor, rz: 0.55, ry: 0.36 });

  // yard
  hayBale(mb, 1.3, 0, 1.8, 0.2, 1); hayBale(mb, 1.7, 0, 1.55, -0.3, 1); hayBale(mb, 1.45, 0.34, 1.72, 0.1, 2);
  mb.bar(PAL.wood[0], 0.9, 0.2, 0.3, -1.3, 0, 1.82, 0.1, { tier: 1 });
  mb.quad(0x4a8fc0, 0.8, 0.22, -1.3, 0.2, 1.82, -PI / 2, 0.1, 0, { tier: 1, mat: "litDS", noAO: true, jit: 0 });
  barrel(mb, -0.85, 0, 1.78, { tier: 1 });
  mb.bar(PAL.wood[1], 0.06, 1.25, 0.06, -0.55, 0, 1.7, 0, { tier: 1 });
  lantern(mb, -0.55, 1.3, 1.7, { tier: 1 });
  dyn.push({ kind: "halo", x: -0.55, y: 1.3, z: 1.7, o: { size: 0.7, color: 0xffc070, flicker: 0.05 } });
  mb.bar(PAL.wood[1], 0.05, 1.7, 0.05, 0.62, 0, z1 + 0.06, 0);
  dyn.push({ kind: "flag", x: 0.62, y: 1.7, z: z1 + 0.06, o: { w: 0.62, h: 0.3, kind: "pennant", main: fc.main, accent: fc.accent, pattern: "bands" } });
  bush(mb, rnd, 1.9, 0, 0.4, 0.3, { tier: 2, flowers: 4 });
  bush(mb, rnd, -1.95, 0, 0.5, 0.26, { tier: 2 });
  return dyn;
}

// ------------------------------------------------------------------------------------------------------------------ mine
function buildMine(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [];
  mb.ao = { y0: 0, h: 0.9, k: 0.26 };
  const info = addCave(mb, { R: 1.7, H: 2.3, rnd, mine: true, short: true });
  const zf = info.mouthZ;
  // signpost with crossed pickaxes
  mb.bar(PAL.wood[1], 0.07, 1.05, 0.07, -0.98, 0, zf + 0.6, 0, { tier: 1 });
  mb.box(PAL.plank[0], 0.56, 0.3, 0.05, -0.98, 0.92, zf + 0.6, 0, 0, 0, { tier: 1 });
  mb.box(PAL.woodD, 0.6, 0.04, 0.06, -0.98, 1.08, zf + 0.6, 0, 0, 0, { tier: 1 });
  mb.beam(PAL.woodD, 0.03, -1.15, 0.8, zf + 0.64, -0.8, 1.04, zf + 0.64, { tier: 2 });
  mb.beam(PAL.woodD, 0.03, -1.15, 1.04, zf + 0.64, -0.8, 0.8, zf + 0.64, { tier: 2 });
  mb.box(PAL.steel, 0.14, 0.04, 0.03, -1.14, 1.04, zf + 0.64, 0, 0, 0.5, { tier: 2, mat: "metal" });
  mb.box(PAL.steel, 0.14, 0.04, 0.03, -0.81, 1.04, zf + 0.64, 0, 0, -0.5, { tier: 2, mat: "metal" });
  // lamp post by the path
  mb.bar(PAL.wood[1], 0.06, 1.2, 0.06, 0.92, 0, zf + 0.55, 0, { tier: 1 });
  lantern(mb, 0.92, 1.32, zf + 0.55, { tier: 1 });
  dyn.push({ kind: "halo", x: 0.92, y: 1.32, z: zf + 0.55, o: { size: 0.8, color: 0xffc070, flicker: 0.05 } });
  // ore heaps and a wheelbarrow
  for (let i = 0; i < 5; i++) mb.blob(i % 2 ? 0x4fd8e0 : rnd.pick([0x7a756b, 0x8a8f98, 0x6a665e]), 0.09 + i * 0.01, 1.02 + rnd.range(-0.15, 0.2), 0.08, zf + 1.1 + rnd.range(-0.15, 0.25), 1.1, 0.8, 1, 0, rnd.range(0, 6), { tier: 1, mat: i % 2 ? "glow" : "lit" });
  mb.box(PAL.wood[0], 0.34, 0.1, 0.5, -0.5, 0.24, zf + 1.35, 0, 0.4, 0, { tier: 2 });
  mb.cyl(PAL.iron, 0.09, 0.09, 0.04, -0.5, 0.1, zf + 1.6, 8, 0, 0, PI / 2, { tier: 2, mat: "metal" });
  // a little dust drifts out of the shaft now and then
  let acc = rnd.range(0, 3);
  dyn.push({ kind: "tick", fn: (owner, dt) => {
    acc -= dt; if (acc > 0) return; acc = 4 + rnd.range(0, 4);
    if (ctx.gfx.f.particles < 0.5 || !ctx.fx) return;
    const p = new ctx.T.Vector3(0, 0.9, zf * 0.92); owner.localToWorld(p); ctx.fx.dust(p.x, p.y, p.z, 0.8);
  } });
  return dyn;
}

// ------------------------------------------------------------------------------------------------------------------ workshop
function buildWorkshop(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [];
  mb.ao = { y0: 0, h: 0.7, k: 0.2 };
  const PH = 0.14, X = 1.2, Z = 0.92;
  // platform of planks
  mb.bar(PAL.plank[2], 2.75, PH, 2.2, 0, 0, 0, 0, { jit: 0.04 });
  for (let k = 0; k < 11; k++) mb.box(PAL.woodD, 0.02, 0.01, 2.2, -1.25 + k * 0.25, PH + 0.002, 0, 0, 0, 0, { tier: 1, noAO: true });
  mb.bar(PAL.stone[1], 2.95, 0.07, 2.4, 0, 0, 0, 0, { tier: 1 });
  // posts and roof frame
  const posts = [[-X, Z], [X, Z], [-X, -Z], [X, -Z]];
  posts.forEach(([x, z]) => {
    mb.beam(PAL.wood[0], 0.17, x, PH, z, x * 0.98, 1.92, z * 0.98);
    mb.box(PAL.stone[1], 0.3, 0.12, 0.3, x, PH + 0.06, z, 0, 0, 0, { tier: 1 });
    mb.beam(PAL.wood[1], 0.08, x, 1.78, z, x * 0.6, 1.95, z * 0.6 + (z > 0 ? -0.2 : 0.2), { tier: 1 });
  });
  mb.box(PAL.wood[1], 2.6, 0.14, 0.14, 0, 1.9, Z * 0.98);
  mb.box(PAL.wood[1], 2.6, 0.14, 0.14, 0, 1.9, -Z * 0.98);
  for (const sx of [-1, 1]) mb.box(PAL.wood[1], 0.14, 0.14, 1.9, sx * X * 0.98, 1.9, 0);
  gableRoof(mb, rnd, { w: 2.7, d: 2.0, h: 0.72, y: 1.97, cols: PAL.plank, ridge: PAL.woodD, end: PAL.plank[1], ov: 0.3, t: 0.1 });
  // back wall with hanging tools
  mb.bar(PAL.plank[1], 2.4, 1.78, 0.08, 0, PH, -Z + 0.04);
  for (let k = 0; k < 12; k++) mb.quad(rnd.pick(PAL.plank), 0.19, 1.74, -1.1 + k * 0.2, PH + 0.89, -Z + 0.085, 0, 0, 0, { tier: 1, jit: 0.06 });
  mb.push(0, 0, -Z + 0.09, 0);
  mb.box(PAL.steel, 0.6, 0.07, 0.02, -0.7, 1.4, 0.02, 0, 0, 0.04, { tier: 2, mat: "metal" });                                  // saw
  for (let k = 0; k < 10; k++) mb.cone(PAL.steel, 0.02, 0.05, -0.99 + k * 0.062, 1.34, 0.02, 3, PI, 0, 0, { tier: 2, mat: "metal" });
  mb.box(PAL.wood[2], 0.1, 0.09, 0.03, -1.03, 1.42, 0.03, 0, 0, 0, { tier: 2 });
  for (let k = 0; k < 3; k++) { mb.box(PAL.wood[0], 0.04, 0.34, 0.03, -0.1 + k * 0.2, 1.3, 0.03, 0, 0, 0, { tier: 2 }); mb.box(PAL.iron, 0.14, 0.09, 0.05, -0.1 + k * 0.2, 1.5, 0.03, 0, 0, 0, { tier: 2, mat: "metal" }); }
  mb.pop();
  // workbench
  const bx = -0.3, bz = -Z + 0.5;
  mb.box(PAL.plank[0], 1.7, 0.09, 0.55, bx, 0.9, bz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.bar(PAL.wood[1], 0.09, 0.84, 0.09, bx + sx * 0.76, PH, bz + sz * 0.21);
  mb.box(PAL.wood[1], 1.6, 0.06, 0.5, bx, 0.42, bz, 0, 0, 0, { tier: 1 });
  mb.box(PAL.iron, 0.16, 0.14, 0.12, bx + 0.7, 1.02, bz + 0.2, 0, 0, 0, { tier: 1, mat: "metal" });                              // vise
  mb.box(PAL.plank[2], 0.5, 0.04, 0.2, bx - 0.4, 0.97, bz, 0, 0.1, 0, { tier: 1 });                                              // planks being cut
  mb.box(PAL.plank[0], 0.5, 0.04, 0.2, bx - 0.4, 1.01, bz + 0.02, 0, -0.08, 0, { tier: 1 });
  mb.beam(PAL.wood[2], 0.04, bx + 0.1, 0.96, bz + 0.1, bx + 0.32, 0.96, bz + 0.1, { tier: 2 }); mb.box(PAL.iron, 0.12, 0.07, 0.05, bx + 0.34, 0.99, bz + 0.1, 0, 0, 0, { tier: 2, mat: "metal" });  // hammer
  for (let k = 0; k < 5; k++) mb.cone(PAL.steel, 0.012, 0.07, bx + 0.0 + k * 0.03, 0.99, bz - 0.15, 4, 0, 0, 0, { tier: 2, mat: "metal" });
  // catapult under construction
  const cx = 0.5, cz = 0.2;
  mb.push(cx, PH, cz, -0.15);
  for (const sx of [-1, 1]) { mb.box(PAL.wood[0], 0.14, 0.14, 1.25, sx * 0.34, 0.26, 0, 0, 0, 0); mb.cyl(PAL.wood[1], 0.2, 0.2, 0.07, sx * 0.43, 0.2, 0.46, 12, 0, 0, PI / 2); mb.cyl(PAL.wood[1], 0.2, 0.2, 0.07, sx * 0.43, 0.2, -0.46, 12, 0, 0, PI / 2); mb.cyl(PAL.iron, 0.07, 0.07, 0.09, sx * 0.43, 0.2, 0.46, 8, 0, 0, PI / 2, { mat: "metal", tier: 1 }); mb.cyl(PAL.iron, 0.07, 0.07, 0.09, sx * 0.43, 0.2, -0.46, 8, 0, 0, PI / 2, { mat: "metal", tier: 1 }); }
  for (const z of [-0.5, 0, 0.5]) mb.box(PAL.wood[1], 0.82, 0.1, 0.1, 0, 0.3, z, 0, 0, 0, { tier: 1 });
  for (const sx of [-1, 1]) { mb.beam(PAL.wood[0], 0.12, sx * 0.34, 0.3, -0.12, sx * 0.3, 0.98, -0.12); mb.beam(PAL.wood[0], 0.12, sx * 0.34, 0.3, 0.3, sx * 0.3, 0.98, -0.12); }
  mb.box(PAL.iron, 0.8, 0.06, 0.06, 0, 0.98, -0.12, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.beam(PAL.wood[2], 0.11, 0, 0.98, -0.12, 0, 1.5, 0.62);                                                                      // throwing arm
  mb.beam(PAL.wood[2], 0.11, 0, 0.98, -0.12, 0, 0.72, -0.44);
  mb.box(PAL.stone[1], 0.34, 0.26, 0.3, 0, 0.58, -0.5, 0, 0, 0, { tier: 1 });                                                    // counterweight
  mb.cyl(PAL.wood[1], 0.15, 0.1, 0.12, 0, 1.52, 0.64, 8, 0, 0, 0, { tier: 1 });                                                  // bucket
  mb.cyl(0x6a4a30, 0.01, 0.01, 0.9, 0.0, 1.0, 0.1, 4, PI / 2.6, 0, 0, { tier: 2 });
  mb.pop();
  // lumber, sawhorse, grindstone, bolts
  for (let k = 0; k < 5; k++) mb.box(rnd.pick(PAL.plank), 1.0, 0.07, 0.22, 0.95 + rnd.range(-0.03, 0.03), PH + 0.04 + k * 0.075, -0.4 + rnd.range(-0.03, 0.03), 0, rnd.range(-0.05, 0.05), 0, { tier: 1 });
  mb.push(-0.9, PH, 0.35, 0.4);
  mb.box(PAL.wood[1], 0.9, 0.08, 0.1, 0, 0.5, 0, 0, 0, 0, { tier: 1 });
  for (const sx of [-1, 1]) { mb.beam(PAL.wood[1], 0.07, sx * 0.34, 0, 0.12, sx * 0.3, 0.5, 0, { tier: 1 }); mb.beam(PAL.wood[1], 0.07, sx * 0.34, 0, -0.12, sx * 0.3, 0.5, 0, { tier: 1 }); }
  mb.box(PAL.plank[0], 0.8, 0.05, 0.2, 0.05, 0.56, 0, 0, 0, 0, { tier: 1 });
  mb.pop();
  mb.cyl(PAL.stone[2], 0.2, 0.2, 0.08, -1.02, PH + 0.5, -0.1, 14, 0, 0, PI / 2, { tier: 2 });
  mb.bar(PAL.wood[1], 0.06, 0.5, 0.3, -1.12, PH, -0.1, 0, { tier: 2 }); mb.bar(PAL.wood[1], 0.06, 0.5, 0.3, -0.92, PH, -0.1, 0, { tier: 2 });
  barrel(mb, 1.05, PH, 0.55, { tier: 1 });
  for (let k = 0; k < 6; k++) { mb.box(PAL.wood[2], 0.02, 0.4, 0.02, 1.0 + (k % 3) * 0.05, PH + 0.5, 0.52 + (k > 2 ? 0.06 : 0), 0, 0, (k - 2.5) * 0.04, { tier: 2 }); mb.cone(PAL.steel, 0.02, 0.07, 1.0 + (k % 3) * 0.05 + (k - 2.5) * 0.007, PH + 0.74, 0.52 + (k > 2 ? 0.06 : 0), 4, 0, 0, 0, { tier: 2, mat: "metal" }); }
  // hanging sign (a gear) and lantern
  mb.beam(PAL.iron, 0.03, -X, 1.55, Z + 0.1, -X - 0.55, 1.55, Z + 0.1, { tier: 1, mat: "metal" });
  mb.torus(PAL.iron, 0.13, 0.03, -X - 0.4, 1.34, Z + 0.1, 0, 0, 0, 5, 12, { tier: 1, mat: "metal" });
  for (let k = 0; k < 8; k++) { const a = k * PI / 4; mb.box(PAL.iron, 0.06, 0.06, 0.05, -X - 0.4 + Math.cos(a) * 0.17, 1.34 + Math.sin(a) * 0.17, Z + 0.1, 0, 0, a, { tier: 1, mat: "metal" }); }
  lantern(mb, 0, 1.62, Z - 0.05, { tier: 1, hang: 0.2 });
  dyn.push({ kind: "halo", x: 0, y: 1.62, z: Z - 0.05, o: { size: 0.9, color: 0xffc070, flicker: 0.05 } });
  // flag
  mb.box(PAL.wood[1], 0.05, 0.8, 0.05, -1.5, 2.69 + 0.4, 0);
  dyn.push({ kind: "flag", x: -1.5, y: 3.4, z: 0, o: { w: 0.7, h: 0.34, kind: "swallow", main: fc.main, accent: fc.accent, pattern: "chevron" } });
  bush(mb, rnd, 1.5, 0, -0.9, 0.28, { tier: 2 });
  return dyn;
}

// ------------------------------------------------------------------------------------------------------------------ market
function buildMarket(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [];
  mb.ao = { y0: 0, h: 0.7, k: 0.2 };
  const stripeA = fc.main, stripeB = 0xf1e8d0;
  // base
  mb.bar(PAL.plank[2], 2.9, 0.14, 1.9, 0, 0, 0, 0, { jit: 0.04 });
  for (let k = 0; k < 12; k++) mb.box(PAL.woodD, 0.02, 0.01, 1.9, -1.35 + k * 0.245, 0.142, 0, 0, 0, 0, { tier: 1, noAO: true });
  // posts
  for (const sx of [-1, 1]) {
    mb.bar(PAL.wood[0], 0.13, 2.2, 0.13, sx * 1.3, 0.14, -0.8);
    mb.bar(PAL.wood[0], 0.13, 1.72, 0.13, sx * 1.3, 0.14, 0.82);
    mb.box(PAL.iron, 0.19, 0.04, 0.19, sx * 1.3, 0.2, 0.82, 0, 0, 0, { tier: 1, mat: "metal" });
  }
  // back wall
  mb.bar(PAL.plank[1], 2.6, 1.72, 0.08, 0, 0.14, -0.88);
  for (let k = 0; k < 13; k++) mb.quad(rnd.pick(PAL.plank), 0.19, 1.7, -1.2 + k * 0.2, 1.0, -0.835, 0, 0, 0, { tier: 1, jit: 0.06 });
  for (const y of [0.85, 1.4]) mb.box(PAL.wood[1], 2.4, 0.05, 0.28, 0, y, -0.74, 0, 0, 0, { tier: 1 });
  for (let i = 0; i < 9; i++) mb.cyl(rnd.pick([0x6a9a5a, 0xc86a3a, 0x4a7ab0, 0xd8b84a]), 0.045, 0.045, 0.14, -1.05 + i * 0.26, 0.95, -0.74, 7, 0, 0, 0, { tier: 2 });   // jars
  for (let i = 0; i < 6; i++) mb.cyl(rnd.pick([0xb04a3a, 0xe8d8a0, 0x8a6a4a]), 0.06, 0.06, 0.1, -0.8 + i * 0.3, 1.5, -0.74, 7, 0, 0, 0, { tier: 2 });
  // awning: stripes sloping down to the front, with a scalloped valance
  const L = Math.hypot(2.1, 0.44), th = Math.atan2(0.44, 2.1);
  for (let k = 0; k < 7; k++) mb.box(k % 2 ? stripeB : stripeA, 0.4, 0.045, L, -1.2 + k * 0.4, 2.0, 0.08, th, 0, 0, { mat: "litDS", jit: 0.03 });
  mb.box(PAL.wood[1], 2.8, 0.09, 0.09, 0, 1.76, 1.12, 0, 0, 0, { tier: 1 });
  mb.box(PAL.wood[1], 2.8, 0.09, 0.09, 0, 2.24, -1.0, 0, 0, 0, { tier: 1 });
  for (let k = 0; k < 7; k++) mb.plate(k % 2 ? stripeB : stripeA, [[-0.2, 0], [0.2, 0], [0.2, -0.1], [0, -0.26], [-0.2, -0.1]], 0.012, -1.2 + k * 0.4 + 0.2, 1.76, 1.13, 0, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.4, swayY0: 1.5, swayH: 0.26, swayInv: true, jit: 0.03 });
  // counter with goods
  mb.bar(PAL.wood[1], 2.4, 0.78, 0.6, 0, 0.14, 0.5);
  mb.box(PAL.plank[0], 2.55, 0.08, 0.72, 0, 0.94, 0.5);
  mb.quad(shade(fc.main, 0.85), 2.2, 0.5, 0, 0.5, 0.805, 0, 0, 0, { tier: 1, mat: "litDS", noAO: true });
  mb.box(PAL.brass, 2.2, 0.03, 0.02, 0, 0.77, 0.81, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.box(PAL.brass, 2.2, 0.03, 0.02, 0, 0.27, 0.81, 0, 0, 0, { tier: 1, mat: "metal" });
  crate(mb, -0.85, 0.98, 0.5, 0.42, 0, { tier: 1 });
  for (let i = 0; i < 7; i++) mb.blob(i % 3 ? 0xc03a2a : 0x8ab04a, 0.07, -0.95 + (i % 4) * 0.1, 1.42, 0.43 + Math.floor(i / 4) * 0.12, 1, 1, 1, 0, 0, { tier: 2 });
  for (let i = 0; i < 4; i++) mb.sphere(0xcf9a52, 0.08, -0.25 + i * 0.17, 1.04, 0.45 + (i % 2) * 0.12, 1.5, 0.8, 0.9, 6, 4, { tier: 1 });                      // loaves
  mb.cyl(0xe8c850, 0.15, 0.15, 0.1, 0.55, 1.03, 0.4, 12, 0, 0, 0, { tier: 1 });                                                                           // cheese
  mb.cyl(0xe8c850, 0.12, 0.12, 0.09, 0.55, 1.12, 0.4, 12, 0, 0, 0, { tier: 2 });
  for (let i = 0; i < 6; i++) mb.cyl(0xe8c040, 0.045, 0.045, 0.012, 1.0 + (i % 3) * 0.02, 0.99 + Math.floor(i / 3) * 0.013, 0.5, 8, 0, 0, 0, { tier: 2, mat: "metal" });   // coins
  sack(mb, 1.05, 0.98, 0.75, { s: 0.14, tier: 2, col: 0xc8b078 });
  // balance scale hanging from the awning
  mb.beam(PAL.iron, 0.02, 0.2, 1.95, 0.35, 0.2, 1.62, 0.35, { tier: 2, mat: "metal" });
  mb.box(PAL.iron, 0.6, 0.02, 0.02, 0.2, 1.62, 0.35, 0, 0, 0.05, { tier: 2, mat: "metal" });
  for (const sx of [-1, 1]) mb.cyl(PAL.brass, 0.1, 0.07, 0.025, 0.2 + sx * 0.28, 1.34, 0.35, 9, 0, 0, 0, { tier: 2, mat: "metal" });
  // lantern, bunting
  lantern(mb, -0.8, 1.72, 0.55, { tier: 1, hang: 0.2 });
  dyn.push({ kind: "halo", x: -0.8, y: 1.72, z: 0.55, o: { size: 0.9, color: 0xffc070, flicker: 0.05 } });
  for (let k = 0; k < 9; k++) {
    const f = (k + 0.5) / 9, x = -1.3 + f * 2.6, y = 1.69 - Math.sin(f * PI) * 0.1 - 0.0;
    mb.plate([0xd8283a, 0xf0c040, 0x3a8ad8, 0xffffff, 0x3f9a4a][k % 5]!, [[-0.07, 0], [0.07, 0], [0, -0.15]], 0.01, x, y - 0.0, 0.95, 0, 0, 0, 0, { tier: 2, mat: "swayDS", sway: 1.4, swayY0: y - 0.15, swayH: 0.15, swayInv: true });
  }
  // sign and crates outside
  mb.bar(PAL.wood[1], 0.07, 1.25, 0.07, -1.62, 0, 0.7, 0, { tier: 1 });
  mb.cyl(PAL.brass, 0.2, 0.2, 0.04, -1.62, 1.18, 0.74, 14, PI / 2, 0, 0, { tier: 1, mat: "metal" });
  mb.torus(PAL.woodD, 0.2, 0.025, -1.62, 1.18, 0.75, 0, 0, 0, 5, 14, { tier: 1 });
  mb.box(PAL.woodD, 0.08, 0.2, 0.02, -1.62, 1.18, 0.78, 0, 0, 0, { tier: 2 });
  crate(mb, 1.62, 0, 0.55, 0.38, 0.2, { tier: 1 }); crate(mb, 1.58, 0.38, 0.5, 0.28, -0.1, { tier: 2 });
  barrel(mb, -1.55, 0, 0.1, { tier: 1 }); barrel(mb, -1.45, 0, -0.2, { tier: 2, r: 0.17, h: 0.36 });
  sack(mb, 1.5, 0, -0.3, { s: 0.2, tier: 2 }); sack(mb, 1.62, 0, -0.1, { s: 0.17, tier: 2, col: 0xa8906a });
  slabs(mb, rnd, 0, 1.15, 1.7, 1.2, 1);
  // tall pennant at the front corner
  mb.bar(PAL.wood[1], 0.06, 2.6, 0.06, 1.5, 0, 1.0);
  dyn.push({ kind: "flag", x: 1.5, y: 2.58, z: 1.0, o: { w: 0.85, h: 0.42, kind: "swallow", main: fc.main, accent: fc.accent, pattern: "diamond" } });
  return dyn;
}

// ------------------------------------------------------------------------------------------------------------------ armory
function buildArmory(ctx: Ctx, mb: MB, rnd: Rng, fc: FC): Dyn[] {
  const dyn: Dyn[] = [];
  mb.ao = { y0: 0, h: 0.9, k: 0.24 };
  const W = 2.4, D = 1.4, WZ = -0.3, FH = 0.22, WH = 1.45, TOP = FH + WH, FZ = WZ + D / 2;
  stoneBox(mb, rnd, W + 0.16, FH, D + 0.16, 0, 0, WZ, { tier: 1 });
  stoneBox(mb, rnd, W, WH, D, 0, FH, WZ, { tier: 1, cols: [0x7d838b, 0x70757d, 0x8a8f98, 0x6a6f77] });
  quoins(mb, rnd, W / 2, FZ, FH, TOP, 0.12, 2); quoins(mb, rnd, -W / 2, FZ, FH, TOP, 0.12, 2);
  mb.box(PAL.stoneD, W + 0.12, 0.1, D + 0.12, 0, TOP, WZ, 0, 0, 0, { tier: 1 });                                                             // string course
  gableRoof(mb, rnd, { w: W, d: D, h: 0.85, y: TOP + 0.05, z: WZ, cols: PAL.slate, ridge: 0x2c313a, end: PAL.stone[1], ov: 0.26 });
  // big arched door
  mb.push(0, 0, FZ, 0);
  doorAt(mb, rnd, 0.1, 0, { w: 0.85, h: 1.25, y0: FH, step: false, jamb: PAL.stoneL, col: PAL.wood[1] });
  mb.pop();
  mb.bar(PAL.stone[1], 1.2, 0.11, 0.4, 0.1, 0, FZ + 0.25, 0, { tier: 1 }); mb.bar(PAL.stone[2], 1.05, 0.11, 0.3, 0.1, 0.11, FZ + 0.12, 0, { tier: 1 });
  // forge window on the left: glowing coals behind a stone surround
  const fx = -0.82;
  mb.box(PAL.stoneD, 0.66, 0.6, 0.12, fx, FH + 0.62, FZ + 0.02, 0, 0, 0, { tier: 1 });
  mb.quad(0x7a2a10, 0.5, 0.44, fx, FH + 0.62, FZ + 0.085, 0, 0, 0, { tier: 0, noAO: true, jit: 0 });
  mb.quad(PAL.ember, 0.46, 0.4, fx, FH + 0.6, FZ + 0.092, 0, 0, 0, { tier: 0, mat: "lamp", grad: [0xff5a1a, 0xffd070, FH + 0.4, FH + 0.82], noAO: true, jit: 0 });
  mb.box(PAL.iron, 0.52, 0.04, 0.05, fx, FH + 0.38, FZ + 0.1, 0, 0, 0, { tier: 1, mat: "metal" });
  dyn.push({ kind: "halo", x: fx, y: FH + 0.62, z: FZ + 0.3, o: { size: 1.5, color: 0xff7a30, flicker: 0.14, day: 0.28 } });
  // chimney on the back-left
  stoneBox(mb, rnd, 0.52, 1.8, 0.46, -0.9, TOP - 0.2, WZ - 0.2, { tier: 1 });
  mb.box(PAL.stoneD, 0.62, 0.09, 0.56, -0.9, TOP + 1.65, WZ - 0.2, 0, 0, 0);
  mb.box(0x120a08, 0.3, 0.02, 0.26, -0.9, TOP + 1.7, WZ - 0.2, 0, 0, 0, { tier: 1 });
  dyn.push({ kind: "smoke", x: -0.9, y: TOP + 1.75, z: WZ - 0.2, o: { size: 0.42, rise: 2.2 } });
  dyn.push({ kind: "halo", x: -0.9, y: TOP + 1.74, z: WZ - 0.2, o: { size: 0.6, color: 0xff7a30, flicker: 0.2, day: 0.1 } });
  // weapon rack on the right of the door
  const rx = 0.95, rz = FZ + 0.18;
  mb.bar(PAL.wood[1], 0.08, 1.1, 0.08, rx - 0.38, 0, rz, 0, { tier: 1 }); mb.bar(PAL.wood[1], 0.08, 1.1, 0.08, rx + 0.38, 0, rz, 0, { tier: 1 });
  mb.box(PAL.wood[1], 0.9, 0.06, 0.07, rx, 1.0, rz, 0, 0, 0, { tier: 1 }); mb.box(PAL.wood[1], 0.9, 0.06, 0.07, rx, 0.55, rz, 0, 0, 0, { tier: 1 });
  for (let k = 0; k < 4; k++) { // swords
    mb.box(PAL.steel, 0.045, 0.62, 0.015, rx - 0.28 + k * 0.1, 0.85, rz + 0.02, 0, 0, (k - 1.5) * 0.035, { tier: 2, mat: "metal" });
    mb.box(PAL.brass, 0.14, 0.03, 0.03, rx - 0.28 + k * 0.1, 0.5, rz + 0.02, 0, 0, 0, { tier: 2, mat: "metal" });
  }
  for (let k = 0; k < 2; k++) { // spears
    mb.pole(PAL.wood[0], 0.015, rx + 0.12 + k * 0.1, 0.0, rz - 0.04 + k * 0.05, rx + 0.2 + k * 0.1, 1.55, rz - 0.04 + k * 0.05, 5, { tier: 2 });
    mb.cone(PAL.steel, 0.035, 0.14, rx + 0.2 + k * 0.1, 1.62, rz - 0.04 + k * 0.05, 4, 0, 0, 0, { tier: 2, mat: "metal" });
  }
  roundShield(mb, rx + 0.1, 1.28, FZ + 0.06, fc.main, 0.2, 1);
  // anvil on a stump, grindstone, quench barrel, armour stand
  const ax = 0.5, az = FZ + 0.95;
  mb.cyl(PAL.wood[1], 0.19, 0.22, 0.34, ax, 0.17, az, 9, 0, 0, 0, { tier: 1 });
  mb.box(PAL.iron, 0.3, 0.1, 0.18, ax, 0.4, az, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.box(PAL.iron, 0.13, 0.08, 0.12, ax, 0.47, az, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.box(0x4a4f58, 0.38, 0.09, 0.15, ax, 0.55, az, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.cone(0x4a4f58, 0.07, 0.2, ax + 0.27, 0.55, az, 5, 0, 0, -PI / 2, { tier: 1, mat: "metal" });
  mb.beam(PAL.wood[2], 0.035, ax - 0.1, 0.62, az + 0.02, ax - 0.34, 0.6, az + 0.14, { tier: 2 });
  mb.box(PAL.iron, 0.1, 0.07, 0.07, ax - 0.08, 0.62, az + 0.02, 0, 0, 0, { tier: 2, mat: "metal" });
  mb.cyl(PAL.stone[2], 0.2, 0.2, 0.07, -0.25, 0.5, az, 14, 0, 0, PI / 2, { tier: 2 });
  mb.bar(PAL.wood[1], 0.06, 0.46, 0.34, -0.37, 0, az, 0, { tier: 2 }); mb.bar(PAL.wood[1], 0.06, 0.46, 0.34, -0.13, 0, az, 0, { tier: 2 });
  barrel(mb, -1.0, 0, az + 0.1, { tier: 1 });
  mb.quad(0x3a7aa8, 0.3, 0.3, -1.0, 0.43, az + 0.1, -PI / 2, 0, 0, { tier: 1, mat: "litDS", noAO: true, jit: 0 });
  const sx = 1.12, sz = az + 0.1;
  mb.bar(PAL.wood[1], 0.06, 0.95, 0.06, sx, 0, sz, 0, { tier: 1 });
  mb.box(PAL.wood[1], 0.5, 0.05, 0.05, sx, 0.8, sz, 0, 0, 0, { tier: 1 });
  mb.add(new ctx.T.CylinderGeometry(0.17, 0.13, 0.42, 9, 1), PAL.steel, sx, 0.62, sz, 0, 0, 0, 1.1, 1, 0.7, { tier: 1, mat: "metal" });         // breastplate
  mb.sphere(PAL.steel, 0.11, sx, 1.06, sz, 1, 1.1, 1, 8, 6, { tier: 1, mat: "metal" });                                                          // helm
  mb.box(0x10141a, 0.12, 0.02, 0.02, sx, 1.04, sz + 0.11, 0, 0, 0, { tier: 2 });
  mb.cone(fc.main, 0.035, 0.16, sx, 1.24, sz, 5, 0, 0, 0.2, { tier: 2, mat: "swayDS", sway: 1, swayY0: 1.15, swayH: 0.15 });
  crate(mb, -1.45, 0, FZ + 0.6, 0.34, 0.2, { tier: 2 });
  slabs(mb, rnd, 0.1, FZ + 0.5, FZ + 1.6, 0.8, 1);
  // vertical banner by the door
  mb.beam(PAL.iron, 0.03, -0.45, 1.55, FZ + 0.05, -0.45, 1.55, FZ + 0.34, { tier: 1, mat: "metal" });
  mb.box(PAL.iron, 0.4, 0.03, 0.03, -0.45, 1.55, FZ + 0.34, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.box(fc.main, 0.32, 0.8, 0.02, -0.45, 1.13, FZ + 0.34, 0, 0, 0, { tier: 0, mat: "swayDS", sway: 1.1, swayY0: 0.8, swayH: 0.8, swayInv: true, jit: 0.02 });
  mb.box(fc.accent, 0.08, 0.5, 0.022, -0.45, 1.2, FZ + 0.345, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: 0.8, swayH: 0.8, swayInv: true, jit: 0.02 });
  mb.box(fc.accent, 0.24, 0.08, 0.022, -0.45, 1.3, FZ + 0.345, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: 0.8, swayH: 0.8, swayInv: true, jit: 0.02 });
  lantern(mb, 1.0, 1.45, FZ + 0.12, { tier: 1 });
  dyn.push({ kind: "halo", x: 1.0, y: 1.45, z: FZ + 0.12, o: { size: 0.7, color: 0xffc070, flicker: 0.05 } });
  // pennant on the roof ridge
  mb.box(PAL.wood[1], 0.05, 0.9, 0.05, W / 2 + 0.15, TOP + 0.05 + 0.85 + 0.42, WZ);
  dyn.push({ kind: "flag", x: W / 2 + 0.15, y: TOP + 0.05 + 0.85 + 0.86, z: WZ, o: { w: 0.62, h: 0.3, kind: "pennant", main: fc.main, accent: fc.accent, pattern: "cross" } });
  bush(mb, rnd, 1.5, 0, WZ - 0.4, 0.3, { tier: 2 });
  return dyn;
}

export const BUILDERS: Record<string, (ctx: Ctx, mb: MB, rnd: Rng, fc: FC) => Dyn[]> = {
  house: buildHouse, farm: buildFarm, mine: buildMine, workshop: buildWorkshop, market: buildMarket, armory: buildArmory,
};

// ------------------------------------------------------------------------------------------------------------------ putting models into the scene
const noRay = () => {};

/** Keep a model's detail tiers in step with the Graphics level for as long as `owner` is in the scene. */
export function track(ctx: Ctx, root: any, owner: any) {
  root.userData.owner = owner;
  ctx.tiered.push(root);
  applyTier(root, ctx.gfx.f.tier);
}

/** Add the moving parts of a model (flags, smoke, vane, windmill, halos...) to `parent`. */
export function attachDyn(ctx: Ctx, owner: any, parent: any, dyn: Dyn[]) {
  const anim = ctx.x.anim, T = ctx.T;
  if (!anim) return;
  const fill = (g: any, mbm: MB) => {
    const m = mbm.build(ctx.mats, true);
    m.children.slice().forEach((c: any) => { c.raycast = noRay; g.add(c); });
    track(ctx, m, owner);
  };
  for (const d of dyn) {
    if (d.kind === "flag") anim.flag(owner, parent, d.x, d.y, d.z, d.o);
    else if (d.kind === "smoke") anim.smoke(owner, parent, d.x, d.y, d.z, d.o);
    else if (d.kind === "halo") anim.halo(owner, parent, d.x, d.y, d.z, d.o);
    else if (d.kind === "vane") { const g = new T.Group(); g.position.set(d.x, d.y, d.z); parent.add(g); fill(g, d.mb); anim.vane(owner, g); }
    else if (d.kind === "mill") {
      const cap = new T.Group(); cap.position.set(d.x, d.y, d.z); parent.add(cap); fill(cap, d.cap);
      const rotor = new T.Group(); rotor.position.set(0, d.ry, d.rz); cap.add(rotor); fill(rotor, d.rotor);
      anim.face(owner, cap, 0.6); anim.spin(owner, rotor, 4.2, 0.12);
    } else if (d.kind === "tick") anim.add(owner, (dt, t) => d.fn(owner, dt, t));
  }
}

function disposeKids(o: any) {
  o.traverse((n: any) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material && !(n.material.userData && n.material.userData.shared)) n.material.dispose();
  });
}

export function installBuildings(ctx: Ctx) {
  const { env, T } = ctx;
  const origCreate = env.createBuilding;
  env.createBuilding = function (faction: any, type: string, territoryId?: string) {
    const b = origCreate(faction, type, territoryId);
    if (!b || !ctx.isInf() || !BUILDERS[type]) return b;
    try {
      const same = (env.legacyBuildings || []).filter((x: any) => x.type === type).length - 1;   // the preview and the building placed from it get the same look
      const seed = 4000 + same * 977 + type.length * 131 + (type.charCodeAt(0) | 0) * 17;
      const rnd = new Rng(seed), mb = new MB(T, seed + 5);
      const fc: FC = { main: faction.color, accent: 0xe8c04a, variant: Math.max(0, same) };
      const dyn = BUILDERS[type]!(ctx, mb, rnd, fc);
      b.mesh.children.slice().forEach((c: any) => { b.mesh.remove(c); disposeKids(c); });
      const root = mb.build(ctx.mats, true);
      root.children.slice().forEach((m: any) => { b.mesh.add(m); });     // direct children: the engine's click test only looks at those
      track(ctx, root, b.mesh);
      attachDyn(ctx, b.mesh, b.mesh, dyn);
    } catch (e) { console.error("building model", type, e); }
    return b;
  };
}
