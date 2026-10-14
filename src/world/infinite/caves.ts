// @ts-nocheck
import type { MB } from "./mb";
import { Rng, angDiff } from "./rng";

/**
 * A rocky mound with a real cave mouth: stone arch, timber frames that get darker and smaller as the tunnel goes in, lanterns, glowing
 * crystals, mine-cart rails running out of the entrance and a stone-slab path leading up to it.
 * Used for the natural caves scattered in the jungle (R about 3.4) and, smaller, for the Mine building (R about 1.9).
 * The mouth faces +z; the model stands on y = 0 centred on the mound.
 */
export interface CaveInfo {
  /** z of the front of the mound (where the arch stands). */
  mouthZ: number;
  /** z where the stone path ends. */
  pathEndZ: number;
  /** Rail track centre-line x. */
  scale: number;
}

const ROCKS = [0x6e6a62, 0x7a756b, 0x5f5b54, 0x847d70, 0x6a665e, 0x77716a];
const MOSS = [0x4c6a36, 0x3f5c30, 0x587a3c, 0x466b3c];
const WOOD = [0x6b4a2c, 0x5a3d24, 0x4a321c];

export function addCave(mb: MB, o: { R: number; H: number; rnd: Rng; mine?: boolean; short?: boolean }): CaveInfo {
  const { R, H, rnd } = o;
  const s = R / 3.4;
  const mouth = Math.PI / 2;
  const zf = R * 0.74;
  const rock = () => rnd.pick(ROCKS);
  // boulders are chunky blocks, each turned a little, instead of round lumps
  const turn = (a: number) => Math.sin(a * 3.1) * 0.32;
  const blob = (c: number, rho: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, _detail: number, ry: number, o: any = {}) =>
    mb.box(c, rho * 1.8 * sx, rho * 1.55 * sy, rho * 1.8 * sz, x, y, z, 0, turn(ry), 0, o);

  // ---- the rock mass: ring of boulders, a second ring, a roof over the mouth and a crown
  const n1 = Math.round(6 + R * 1.5);
  for (let i = 0; i < n1; i++) {
    const phi = (i / n1) * Math.PI * 2 + rnd.range(-0.12, 0.12);
    if (Math.abs(angDiff(phi, mouth)) < 0.62) continue;
    const rr = R * rnd.range(0.62, 0.82), rho = R * rnd.range(0.4, 0.56);
    const c = rock(), y = rho * 0.42;
    blob(c, rho, Math.cos(phi) * rr, y, Math.sin(phi) * rr, rnd.range(0.9, 1.25), rnd.range(0.7, 1), rnd.range(0.9, 1.25), 1, rnd.range(0, 6.28),
      { grad: [c, rnd.chance(0.45) ? rnd.pick(MOSS) : rock(), y - rho * 0.25, y + rho * 0.8] });
  }
  const n2 = Math.max(4, Math.round(3 + R * 1.2));
  for (let i = 0; i < n2; i++) {
    const phi = (i / n2) * Math.PI * 2 + rnd.range(-0.2, 0.2);
    if (Math.abs(angDiff(phi, mouth)) < 0.95) continue;
    const rr = R * rnd.range(0.38, 0.5), rho = R * rnd.range(0.42, 0.55), y = H * 0.36;
    const c = rock();
    blob(c, rho, Math.cos(phi) * rr, y, Math.sin(phi) * rr, 1, rnd.range(0.75, 1), 1, 1, rnd.range(0, 6.28), { grad: [c, rnd.pick(MOSS), y - rho * 0.2, y + rho * 0.9] });
  }
  for (const d of [-0.55, 0, 0.55]) { // the roof over the arch
    const rr = R * 0.5, rho = R * 0.4, y = H * 0.62, c = rock();
    blob(c, rho, Math.cos(mouth + d) * rr, y, Math.sin(mouth + d) * rr, 1.1, 0.85, 1.05, 1, rnd.range(0, 6.28), { grad: [c, rnd.pick(MOSS), y - rho * 0.2, y + rho * 0.8] });
  }
  for (let i = 0; i < 3; i++) {
    const c = rock(), rho = R * rnd.range(0.32, 0.42), y = H * (0.78 + 0.05 * i);
    blob(c, rho, rnd.range(-0.25, 0.25) * R, y, rnd.range(-0.25, 0.1) * R, 1, 0.85, 1, 1, rnd.range(0, 6.28), { grad: [c, rnd.pick(MOSS), y - rho * 0.2, y + rho] });
  }
  // moss caps and loose rubble (tier 1 / 2)
  for (let i = 0; i < Math.round(3 + R); i++) {
    const phi = rnd.range(0, 6.28);
    if (Math.abs(angDiff(phi, mouth)) < 0.8) continue;
    blob(rnd.pick(MOSS), R * rnd.range(0.14, 0.24), Math.cos(phi) * R * rnd.range(0.2, 0.55), H * rnd.range(0.62, 0.95), Math.sin(phi) * R * rnd.range(0.2, 0.55), 1.2, 0.45, 1.2, 0, rnd.range(0, 6), { tier: 1 });
  }
  for (let i = 0; i < Math.round(4 + R * 2); i++) {
    const phi = rnd.range(0, 6.28), rr = R * rnd.range(0.95, 1.35), rho = R * rnd.range(0.05, 0.12);
    blob(rock(), rho, Math.cos(phi) * rr, rho * 0.5, Math.sin(phi) * rr, 1, 0.7, 1, 0, rnd.range(0, 6), { tier: 2 });
  }

  // ---- the arch
  const PW = 0.55 * s, PH = 2.05 * s, px = 1.0 * s;
  for (const sg of [-1, 1]) {
    const c = rock();
    mb.box(c, PW, PH, 0.75 * s, sg * px, PH / 2, zf, 0, sg * 0.05, sg * 0.03, { grad: [0x55514a, c, 0, PH] });
    blob(rock(), 0.34 * s, sg * (px + 0.08 * s), PH * 0.9, zf + 0.05, 1.1, 0.9, 1.1, 0, rnd.range(0, 3), { tier: 1 });
  }
  mb.box(rock(), 2.55 * s, 0.5 * s, 0.85 * s, 0, PH + 0.18 * s, zf, 0, 0, 0.01);
  mb.box(0x8b867a, 0.5 * s, 0.4 * s, 0.9 * s, 0, PH + 0.5 * s, zf, 0, 0, 0, { tier: 1 }); // keystone
  blob(rock(), 0.45 * s, -px * 0.92, PH + 0.1 * s, zf, 1, 0.8, 1.1, 0, 0.5, { tier: 1 });
  blob(rock(), 0.45 * s, px * 0.92, PH + 0.1 * s, zf, 1, 0.8, 1.1, 0, 1.5, { tier: 1 });

  // ---- the dark tunnel behind it: a black box with timber frames that shrink and darken as they go in
  const D = R * 0.9;
  mb.box(0x040507, 1.5 * s, 1.95 * s, D, 0, 0.98 * s, zf - D / 2 - 0.05, 0, 0, 0, { noAO: true, jit: 0 });
  for (let k = 0; k < 4; k++) {
    const sc = 1 - 0.1 * k, z = zf - 0.28 * s - k * 0.62 * s;
    const col = k === 0 ? WOOD[0] : k === 1 ? WOOD[1] : WOOD[2];
    const t = k === 0 ? 0 : 1;
    for (const sg of [-1, 1]) mb.box(col, 0.15 * s, 1.85 * s * sc, 0.15 * s, sg * 0.74 * s * sc, 0.93 * s * sc, z, 0, 0, 0, { tier: t, noAO: k > 0 });
    mb.box(col, 1.72 * s * sc, 0.17 * s, 0.17 * s, 0, 1.86 * s * sc, z, 0, 0, 0, { tier: t, noAO: k > 0 });
    if (k < 2) mb.beam(col, 0.07 * s, -0.74 * s * sc, 1.2 * s * sc, z, -0.32 * s * sc, 1.84 * s * sc, z, { tier: 1 });
  }
  // rails, sleepers
  const nSlab = o.short ? 4 : 7, railZ0 = zf - D * 0.8, railZ1 = zf + (o.short ? 2.5 : 3.7) * s;
  for (const sg of [-1, 1]) mb.box(0x4a4d55, 0.06 * s, 0.07 * s, railZ1 - railZ0, sg * 0.27 * s, 0.07 * s, (railZ0 + railZ1) / 2, 0, 0, 0, { tier: 1, mat: "metal" });
  for (let z = railZ0 + 0.2; z < railZ1; z += 0.44 * s) mb.box(WOOD[1], 0.82 * s, 0.05 * s, 0.14 * s, 0, 0.03 * s, z, 0, 0, 0, { tier: 1 });
  // lanterns, crystals
  for (const sg of [-1, 1]) {
    mb.box(WOOD[2], 0.025 * s, 0.34 * s, 0.025 * s, sg * 0.55 * s, 1.68 * s, zf - 0.2 * s, 0, 0, 0, { tier: 1 });
    mb.box(0xffc064, 0.15 * s, 0.2 * s, 0.15 * s, sg * 0.55 * s, 1.43 * s, zf - 0.2 * s, 0, 0, 0, { tier: 1, mat: "glow", jit: 0, noAO: true });
    mb.cone(0x33e0ff, 0.12 * s, 0.5 * s, sg * 0.5 * s, 0.25 * s, zf - 0.9 * s, 4, 0.1, 0, sg * 0.18, { tier: 1, mat: "glow", jit: 0.2, noAO: true });
    mb.cone(0x7af0ff, 0.08 * s, 0.34 * s, sg * 0.38 * s, 0.17 * s, zf - 0.75 * s, 4, 0, 0.5, -sg * 0.3, { tier: 1, mat: "glow", jit: 0.2, noAO: true });
    mb.cone(0xffb040, 0.09 * s, 0.3 * s, sg * 0.62 * s, 0.16 * s, zf - 1.5 * s, 4, 0, 0, sg * 0.25, { tier: 2, mat: "glow", jit: 0.2, noAO: true });
  }
  // the ore cart on the rails outside
  const cz = zf + 1.5 * s;
  mb.box(0x3a3f48, 0.62 * s, 0.34 * s, 0.82 * s, 0, 0.3 * s, cz, 0, 0, 0, { tier: 1, mat: "metal" });
  mb.box(0x2c3037, 0.68 * s, 0.05 * s, 0.88 * s, 0, 0.48 * s, cz, 0, 0, 0, { tier: 1, mat: "metal" });
  for (let i = 0; i < 4; i++) blob(i % 2 ? 0x4fd8e0 : 0x9a9a9a, 0.13 * s, (i % 2 ? 0.14 : -0.14) * s, 0.55 * s, cz + (i < 2 ? -0.2 : 0.2) * s, 1, 0.8, 1, 0, i, { tier: 1, mat: i % 2 ? "glow" : "lit" });
  for (const wx of [-1, 1]) for (const wz of [-1, 1]) mb.cyl(0x25282e, 0.1 * s, 0.1 * s, 0.05 * s, wx * 0.3 * s, 0.1 * s, cz + wz * 0.27 * s, 8, 0, 0, Math.PI / 2, { tier: 2, mat: "metal" });
  // path: flat stone slabs from the mouth outward
  for (let k = 0; k < nSlab; k++) {
    const z = zf + 0.95 * s + k * 0.58 * s;
    mb.box(rnd.pick([0x8b867a, 0x7d786d, 0x948e80]), (0.9 + rnd.range(0, 0.35)) * s, 0.05, 0.5 * s, rnd.range(-0.12, 0.12) * s, 0.025, z, 0, rnd.range(-0.25, 0.25), 0, { tier: k < 4 ? 0 : 1, noAO: true });
  }
  // hanging vines
  for (let i = 0; i < 7; i++) {
    const x = rnd.range(-1.25, 1.25) * s, len = rnd.range(0.5, 1.5) * s, top = PH + 0.4 * s;
    mb.box(rnd.pick(MOSS), 0.045 * s, len, 0.045 * s, x, top - len / 2, zf + 0.42 * s, 0, 0, 0, { tier: 1, mat: "sway", sway: 1, swayY0: top - len, swayH: len, swayInv: true, noAO: true });
  }
  // props
  mb.cyl(0x6b4a2c, 0.2 * s, 0.22 * s, 0.5 * s, 1.5 * s, 0.25 * s, zf + 0.7 * s, 10, 0, 0, 0, { tier: 2 });
  mb.cyl(0x3a3d44, 0.225 * s, 0.225 * s, 0.05 * s, 1.5 * s, 0.14 * s, zf + 0.7 * s, 10, 0, 0, 0, { tier: 2, mat: "metal" });
  mb.cyl(0x3a3d44, 0.225 * s, 0.225 * s, 0.05 * s, 1.5 * s, 0.38 * s, zf + 0.7 * s, 10, 0, 0, 0, { tier: 2, mat: "metal" });
  mb.beam(0x6b4a2c, 0.05 * s, -1.45 * s, 0.9 * s, zf + 0.5 * s, -1.28 * s, 0.1 * s, zf + 0.62 * s, { tier: 2 }); // pickaxe handle
  mb.box(0x8a8f98, 0.4 * s, 0.05 * s, 0.05 * s, -1.47 * s, 0.93 * s, zf + 0.5 * s, 0, 0, 0.5, { tier: 2, mat: "metal" });
  for (let i = 0; i < 3; i++) blob(0xb59a6a, 0.2 * s, -1.2 * s + i * 0.22 * s, 0.13 * s, zf + 1.1 * s + (i % 2) * 0.2 * s, 1, 0.8, 1, 0, i, { tier: 2 }); // ore sacks
  return { mouthZ: zf, pathEndZ: zf + 0.95 * s + (nSlab - 1) * 0.58 * s + 0.3, scale: s };
}
