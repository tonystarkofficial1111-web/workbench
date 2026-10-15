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
function buildTent(ctx: FsCtx, mb: MB, rnd: Rng, main: number) {
  const dyn: any[] = [];
  const W = 3.4, D = 3.0, WH = 1.15, H = 1.6, cream = 0xeee2c4;
  mb.ao = { y0: 0, h: 1, k: 0.22 };
  // trodden ground and a wooden floor
  mb.box(0x7a5d3a, W + 1.6, 0.03, D + 1.6, 0, 0.015, 0, 0, 0, 0, { noAO: true, jit: 0.04 });
  for (let k = 0; k < 8; k++) mb.box(PAL.plank[k % 4], W - 0.2, 0.05, (D - 0.2) / 8 - 0.02, 0, 0.05, -D / 2 + 0.1 + (k + 0.5) * (D - 0.2) / 8, 0, 0, 0, { tier: 1, jit: 0.05 });
  // striped canvas walls (vertical stripes), front left open with the flaps tied back
  const stripes = 12;
  for (let side = 0; side < 4; side++) {
    mb.push(0, 0, 0, side * PI / 2);
    const fw = side % 2 ? D : W, fz = (side % 2 ? W : D) / 2;
    for (let k = 0; k < stripes; k++) {
      const x = -fw / 2 + (k + 0.5) * fw / stripes;
      if (side === 0 && Math.abs(x) < 0.55) continue;                 // the door
      mb.box(k % 2 ? main : cream, fw / stripes + 0.005, WH, 0.04, x, WH / 2, fz, 0, 0, 0, { jit: 0.02 });
    }
    mb.box(shade(main, 0.75), fw + 0.08, 0.12, 0.06, 0, WH - 0.06, fz + 0.01, 0, 0, 0, { tier: 1 });   // valance
    for (let k = 0; k < 6; k++) mb.box(k % 2 ? cream : main, fw / 6, 0.14, 0.03, -fw / 2 + (k + 0.5) * fw / 6, WH - 0.2, fz + 0.04, 0, 0, 0, { tier: 2 });   // scalloped trim (square)
    mb.pop();
  }
  // door flaps tied back
  for (const s of [-1, 1]) { mb.box(cream, 0.26, WH - 0.15, 0.05, s * 0.68, (WH - 0.15) / 2, D / 2 + 0.12, 0, s * 0.5, 0); mb.box(0x8a6a3c, 0.3, 0.04, 0.07, s * 0.68, 0.55, D / 2 + 0.14, 0, s * 0.5, 0, { tier: 1 }); }
  // pyramid roof in stripes (four triangular faces made of stacked blocks so it stays blocky)
  const steps = 7;
  for (let k = 0; k < steps; k++) {
    const t = k / steps, w = (W + 0.3) * (1 - t * 0.92), d = (D + 0.3) * (1 - t * 0.92);
    mb.box(k % 2 ? cream : main, w, H / steps + 0.01, d, 0, WH + (k + 0.5) * H / steps, 0, 0, 0, 0, { jit: 0.015 });
  }
  mb.box(PAL.wood[1], 0.12, 0.6, 0.12, 0, WH + H + 0.3, 0);                         // centre pole top
  mb.box(PAL.brass, 0.18, 0.18, 0.18, 0, WH + H + 0.62, 0, 0, PI / 4, 0, { mat: "metal", tier: 1 });
  dyn.push({ kind: "flag", x: 0, y: WH + H + 0.55, z: 0, o: { w: 0.9, h: 0.45, kind: "pennant", main, accent: 0xe8c04a, pattern: "cross" } });
  // corner poles, guy ropes and pegs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mb.box(PAL.wood[0], 0.1, WH + 0.1, 0.1, sx * W / 2, (WH + 0.1) / 2, sz * D / 2);
    mb.beam(0xd8c8a0, 0.02, sx * W / 2, WH, sz * D / 2, sx * (W / 2 + 0.9), 0.05, sz * (D / 2 + 0.9), { tier: 1 });
    mb.box(PAL.wood[1], 0.06, 0.18, 0.06, sx * (W / 2 + 0.9), 0.07, sz * (D / 2 + 0.9), 0, 0, 0, { tier: 1 });
  }
  // inside: bedrolls and a chest, seen through the door
  for (let k = 0; k < 3; k++) mb.box([0x8a3a2a, 0x3a5a8a, 0x5a7a3a][k]!, 0.5, 0.08, 1.2, -1.0 + k * 0.7, 0.12, -0.6, 0, 0, 0, { tier: 1 });
  crate(mb, 1.2, 0.07, 0.8, 0.36, 0.2, { tier: 1 });
  // stockpile outside: barrels, sacks, crates, a wood pile
  barrel(mb, -2.35, 0, 0.6, { tier: 0 }); barrel(mb, -2.35, 0, 1.2, { tier: 1 }); barrel(mb, -2.85, 0, 0.9, { tier: 1, col: 0x6a5a3a });
  sack(mb, 2.3, 0, 0.8, { tier: 1 }); sack(mb, 2.5, 0, 1.2, { tier: 1 }); sack(mb, 2.2, 0.3, 1.0, { tier: 2 });
  crate(mb, 2.4, 0, -0.6, 0.4, 0.3, { tier: 0 }); crate(mb, 2.4, 0.4, -0.6, 0.32, 0.6, { tier: 1 });
  woodPile(mb, rnd, -2.5, 0, -0.9, PI / 2, 3, 0.7, 0);
  // a banner post by the door, lanterns on the front poles
  mb.box(PAL.wood[1], 0.08, 1.9, 0.08, 1.05, 0.95, D / 2 + 0.8);
  mb.box(main, 0.42, 0.8, 0.03, 1.05, 1.35, D / 2 + 0.83, 0, 0, 0, { mat: "swayDS", sway: 1, swayY0: 1.0, swayH: 0.8, swayInv: true });
  mb.box(0xe8c04a, 0.12, 0.5, 0.032, 1.05, 1.4, D / 2 + 0.835, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1, swayY0: 1.0, swayH: 0.8, swayInv: true });
  for (const s of [-1, 1]) { lantern(mb, s * W / 2, WH - 0.2, D / 2 + 0.12, { tier: 1 }); dyn.push({ kind: "halo", x: s * W / 2, y: WH - 0.2, z: D / 2 + 0.12, o: { size: 0.8, color: 0xffc070 } }); }
  return dyn;
}

// ------------------------------------------------------------------------------------------------ campfire, well, tower
function buildCampfire(ctx: FsCtx, mb: MB, rnd: Rng) {
  const dyn: any[] = [];
  mb.ao = { y0: 0, h: 0.5, k: 0.2 };
  mb.box(0x4a3a2a, 1.3, 0.02, 1.3, 0, 0.01, 0, 0, 0, 0, { noAO: true });
  for (let k = 0; k < 9; k++) { const a = (k / 9) * PI * 2; mb.box(rnd.pick(PAL.stone), 0.26, 0.2, 0.2, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5, 0, -a, 0); }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2 + 0.4; mb.box(PAL.wood[k % 3], 0.6, 0.1, 0.1, Math.cos(a) * 0.12, 0.12 + k * 0.03, Math.sin(a) * 0.12, 0, -a, 0.35); }
  mb.box(0xff7a20, 0.24, 0.32, 0.24, 0, 0.3, 0, 0, PI / 4, 0, { mat: "lamp", noAO: true }); mb.box(0xffd060, 0.12, 0.42, 0.12, 0, 0.32, 0, 0, 0, 0, { mat: "lamp", noAO: true });
  // a spit over the fire and a pot on a tripod
  for (const s of [-1, 1]) { mb.box(PAL.woodD, 0.06, 0.8, 0.06, s * 0.55, 0.4, 0); mb.box(PAL.woodD, 0.14, 0.06, 0.06, s * 0.55, 0.78, 0, 0, 0, s * 0.5); }
  mb.box(PAL.woodD, 1.2, 0.04, 0.04, 0, 0.8, 0, 0, 0, 0, { tier: 1 });
  mb.box(0x2a2a2e, 0.3, 0.26, 0.3, 0.75, 0.25, 0.55, 0, 0, 0, { mat: "metal", tier: 1 });
  for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2; mb.beam(PAL.woodD, 0.03, 0.75 + Math.cos(a) * 0.3, 0, 0.55 + Math.sin(a) * 0.3, 0.75, 0.75, 0.55, { tier: 1 }); }
  barrel(mb, -0.85, 0, 0.5, { tier: 1, r: 0.18, h: 0.4 });
  dyn.push({ kind: "smoke", x: 0, y: 0.6, z: 0, o: { n: 5, size: 0.45, rise: 2.4 } }, { kind: "halo", x: 0, y: 0.45, z: 0, o: { size: 1.8, color: 0xff9a40, flicker: 0.18, day: 0.3 } });
  return dyn;
}

function buildWell(ctx: FsCtx, mb: MB, rnd: Rng) {
  mb.ao = { y0: 0, h: 0.8, k: 0.25 };
  stoneBox(mb, rnd, 1.3, 0.75, 1.3, 0, 0, 0, { tier: 1 });
  mb.box(0x1d3a4a, 0.9, 0.04, 0.9, 0, 0.7, 0, 0, 0, 0, { noAO: true });
  for (const s of [-1, 1]) mb.box(PAL.wood[1], 0.1, 1.5, 0.1, s * 0.6, 1.3, 0);
  mb.box(PAL.wood[0], 1.4, 0.08, 0.08, 0, 1.9, 0);
  gableRoof(mb, rnd, { w: 1.5, d: 1.3, h: 0.5, y: 1.95, cols: PAL.thatch, ridge: 0x8a7030, end: PAL.plank[1], ov: 0.12, ovx: 0.1 });
  mb.box(0x8a6a3c, 0.5, 0.06, 0.06, 0, 1.6, 0, 0, 0, 0, { tier: 1 });                         // crank axle
  mb.box(PAL.woodD, 0.06, 0.25, 0.06, 0.32, 1.5, 0, 0, 0, 0, { tier: 1 });
  mb.box(0xd8c8a0, 0.02, 0.6, 0.02, 0, 1.3, 0, 0, 0, 0, { tier: 1 });                         // rope
  barrel(mb, 0, 0.92, 0, { r: 0.12, h: 0.18, tier: 1, col: 0x6a5030 });                     // bucket
  return [];
}

function buildTower(ctx: FsCtx, mb: MB, rnd: Rng, main: number) {
  const dyn: any[] = [];
  const H = 3.4, P = 1.6;
  mb.ao = { y0: 0, h: 1.2, k: 0.25 };
  stoneBox(mb, rnd, P + 0.4, 0.5, P + 0.4, 0, 0, 0, { tier: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(PAL.wood[1], 0.2, H, 0.2, sx * P / 2, H / 2 + 0.3, sz * P / 2);
  for (const y of [1.2, 2.3]) for (let s = 0; s < 4; s++) { mb.push(0, 0, 0, s * PI / 2); mb.box(PAL.wood[0], P, 0.12, 0.12, 0, y, P / 2); mb.beam(PAL.woodD, 0.08, -P / 2, y - 0.9, P / 2, P / 2, y, P / 2, { tier: 1 }); mb.pop(); }
  // platform with railings and shields
  mb.box(PAL.plank[0], P + 0.7, 0.14, P + 0.7, 0, H + 0.3, 0);
  for (let s = 0; s < 4; s++) {
    mb.push(0, 0, 0, s * PI / 2);
    for (let k = 0; k < 5; k++) mb.box(PAL.wood[1], 0.08, 0.6, 0.08, -0.9 + k * 0.45, H + 0.67, 1.0);
    mb.box(PAL.wood[0], P + 0.7, 0.08, 0.08, 0, H + 0.95, 1.0);
    mb.box(main, 0.36, 0.36, 0.05, 0, H + 0.62, 1.05, 0, 0, PI / 4, { tier: 1 });
    mb.box(0xe8c04a, 0.12, 0.12, 0.055, 0, H + 0.62, 1.06, 0, 0, PI / 4, { tier: 2 });
    mb.pop();
  }
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
    const c = [0xf4f0e6, 0xb8743a, 0x2a2420][variant % 3]!;
    body = pivot(T, 0, 0.28, 0); head = pivot(T, 0, 0.18, 0.13);
    body.add(partGeo(ctx, "ch-body" + c, (mb) => {
      mb.box(c, 0.22, 0.2, 0.3, 0, 0, 0); mb.box(shade(c, 0.9), 0.24, 0.1, 0.18, 0, 0.02, -0.02);   // body, wings
      for (const s of [-1, 1]) mb.box(shade(c, 0.82), 0.03, 0.12, 0.2, s * 0.125, 0, -0.01);
      mb.box(shade(c, 0.75), 0.14, 0.14, 0.08, 0, 0.1, -0.17, -0.5, 0, 0);                          // tail feathers
    }));
    head.add(partGeo(ctx, "ch-head" + c, (mb) => {
      mb.box(c, 0.13, 0.15, 0.13, 0, 0.06, 0); mb.box(0xe8b020, 0.06, 0.04, 0.07, 0, 0.05, 0.09);    // head, beak
      mb.box(0xd02020, 0.03, 0.06, 0.1, 0, 0.16, 0.01); mb.box(0xd02020, 0.035, 0.05, 0.03, 0, 0.0, 0.08);   // comb, wattle
      for (const s of [-1, 1]) mb.box(0x101010, 0.012, 0.025, 0.025, s * 0.067, 0.08, 0.03, 0, 0, 0, { noAO: true });
    }));
    body.add(head);
    for (const s of [-1, 1]) { const l = pivot(T, s * 0.06, 0.2, 0); l.add(partGeo(ctx, "ch-leg", (mb) => { mb.box(0xe8b020, 0.03, 0.18, 0.03, 0, -0.09, 0); mb.box(0xe8b020, 0.08, 0.02, 0.09, 0, -0.18, 0.03); })); legs.push(l); group.add(l); }
    proxyR = 0.25; proxyH = 0.45;
  } else if (kind === "sheep") {
    const wool = [0xf0ece2, 0xe6e0d2, 0x4a4440][variant % 3]!;
    body = pivot(T, 0, 0.62, 0); head = pivot(T, 0, 0.12, 0.42);
    body.add(partGeo(ctx, "sh-body" + wool, (mb) => {
      mb.box(wool, 0.6, 0.48, 0.8, 0, 0, 0);
      for (let k = 0; k < 9; k++) mb.box(shade(wool, 0.95 + (k % 3) * 0.03), 0.2, 0.16, 0.2, ((k % 3) - 1) * 0.2, 0.24 + (k % 2) * 0.02, (Math.floor(k / 3) - 1) * 0.26, 0, 0, 0, { tier: 1 });   // fluffy tufts
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) mb.box(shade(wool, 0.92), 0.06, 0.18, 0.2, s * 0.31, -0.02 + (k % 2) * 0.06, (k - 1) * 0.25, 0, 0, 0, { tier: 1 });
      mb.box(shade(wool, 0.9), 0.14, 0.14, 0.1, 0, 0.05, -0.43);
    }));
    head.add(partGeo(ctx, "sh-head", (mb) => {
      mb.box(0x2a2420, 0.2, 0.24, 0.3, 0, 0, 0.08); mb.box(0xf0ece2, 0.24, 0.12, 0.16, 0, 0.12, 0.0, 0, 0, 0, { tier: 1 });   // face, wool cap
      for (const s of [-1, 1]) { mb.box(0x2a2420, 0.12, 0.05, 0.08, s * 0.15, 0.04, 0.02, 0, 0, s * 0.4); mb.box(0xe8e0c0, 0.03, 0.03, 0.01, s * 0.06, 0.05, 0.235, 0, 0, 0, { noAO: true }); }
    }));
    body.add(head);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = pivot(T, sx * 0.18, 0.42, sz * 0.26); l.add(partGeo(ctx, "sh-leg", (mb) => { mb.box(0x2a2420, 0.1, 0.42, 0.1, 0, -0.21, 0); })); legs.push(l); group.add(l); }
    proxyR = 0.45; proxyH = 0.9;
  } else {
    const base = [0xf2f0ea, 0x6b4428, 0x2a2622][variant % 3]!, patch = variant % 3 === 0 ? 0x1a1816 : 0xf2f0ea;
    body = pivot(T, 0, 0.95, 0); head = pivot(T, 0, 0.2, 0.75);
    body.add(partGeo(ctx, "cw-body" + base, (mb) => {
      mb.box(base, 0.8, 0.7, 1.4, 0, 0, 0);
      for (const [x, y, z, w, d] of [[0.41, 0.1, 0.2, 0.36, 0.4], [-0.41, -0.05, -0.3, 0.3, 0.5], [0.2, 0.36, -0.2, 0.3, 0.4], [-0.41, 0.15, 0.4, 0.25, 0.25]]) mb.box(patch, x === 0.2 ? w : 0.02, x === 0.2 ? 0.02 : w * 0.8, d, x, y, z, 0, 0, 0, { tier: 1, noAO: true });   // patches
      mb.box(0xe8a0a0, 0.3, 0.12, 0.3, 0, -0.38, -0.35, 0, 0, 0, { tier: 1 });   // udder
      for (let k = 0; k < 4; k++) mb.box(0xe8a0a0, 0.04, 0.08, 0.04, (k % 2 ? 0.08 : -0.08), -0.46, -0.35 + (k > 1 ? 0.08 : -0.08), 0, 0, 0, { tier: 2 });
    }));
    head.add(partGeo(ctx, "cw-head" + base, (mb) => {
      mb.box(base, 0.42, 0.42, 0.5, 0, 0, 0.1); mb.box(0xe8b8a0, 0.36, 0.22, 0.14, 0, -0.1, 0.38);   // head, muzzle
      for (const s of [-1, 1]) {
        mb.box(0xd8d0b0, 0.2, 0.06, 0.06, s * 0.27, 0.2, 0.02, 0, 0, s * 0.3); mb.box(0x3a3028, 0.06, 0.1, 0.06, s * 0.37, 0.27, 0.02, 0, 0, 0, { tier: 1 });   // horns
        mb.box(base, 0.16, 0.06, 0.12, s * 0.27, 0.08, -0.05, 0, 0, -s * 0.3);   // ears
        mb.box(0x101010, 0.02, 0.05, 0.05, s * 0.21, 0.08, 0.22, 0, 0, 0, { noAO: true });
        mb.box(0x5a3a3a, 0.05, 0.04, 0.02, s * 0.08, -0.12, 0.455, 0, 0, 0, { tier: 1, noAO: true });   // nostrils
      }
    }));
    body.add(head);
    tail = pivot(T, 0, 0.25, -0.7);
    tail.add(partGeo(ctx, "cw-tail", (mb) => { mb.box(0x3a3028, 0.05, 0.6, 0.05, 0, -0.3, 0); mb.box(0x1a1816, 0.1, 0.14, 0.1, 0, -0.62, 0); }));
    body.add(tail);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = pivot(T, sx * 0.26, 0.62, sz * 0.48); l.add(partGeo(ctx, "cw-leg" + base, (mb) => { mb.box(base, 0.16, 0.5, 0.16, 0, -0.25, 0); mb.box(0x2a2420, 0.18, 0.12, 0.18, 0, -0.56, 0); })); legs.push(l); group.add(l); }
    proxyR = 0.6; proxyH = 1.4;
  }
  group.add(body);
  const proxy = new T.Mesh(new T.CylinderGeometry(proxyR, proxyR, proxyH, 6), new T.MeshBasicMaterial({ visible: false }));
  proxy.position.y = proxyH / 2; group.add(proxy);
  group.traverse((o: any) => { if (o.userData && o.userData.tiers) { ctx.tiered.push(o); applyTier(o, ctx.gfx.f.tier); } });
  return { group, body, head, legs, tail, proxy, kind };
}
