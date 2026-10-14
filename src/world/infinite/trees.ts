// @ts-nocheck
import type { Ctx } from "./types";
import type { Island } from "./terrain";
import { MB } from "./mb";
import { Rng, lerp, clamp, smoothstep } from "./rng";
import { frondGeo } from "./shapes";

/**
 * Jungle trees. Every species is a few merged, wind-swaying meshes drawn with GPU instancing (a whole forest is a few dozen draw calls).
 * The game still sees ordinary tree objects: {x, z, age, group, parts}. `group` is an invisible stand-in whose scale the game animates
 * while a sapling grows, and whose three invisible `parts` are what mouse clicks hit. When a tree is chopped it topples over with a
 * short shake, thud, leaves and a stump.
 */
export type Kind = "jungle" | "broadleaf" | "palm" | "bamboo" | "giant";

interface Part { geo: any; mat: any; tier: number; shadow: boolean; kind: string }
interface Variant { kind: Kind; parts: Part[]; trunkH: number; trunkR: number; canopyY: number; canopyR: number; proxy: any }
interface VSet { v: Variant; meshes: any[]; slots: Rec[]; cap: number }
interface Rec { t: any; vi: number; slot: number; lastS: number; rotY: number; tint: any; x: number; z: number; y: number }

const GREENS = [0x2d6a2e, 0x3a7d34, 0x4a9a3d, 0x5aae46, 0x3f8a3a, 0x2f7a38];
const DARK = 0x1c4a20;
const BARK = [0x6b5238, 0x5d4730, 0x73593c, 0x655040];

function partsOf(root: any): Part[] {
  const out: Part[] = [];
  root.children.forEach((m: any) => out.push({ geo: m.geometry, mat: m.material, tier: m.userData.tier || 0, shadow: m.castShadow, kind: "" }));
  return out;
}

const snap = (v: number, g: number) => Math.round(v / g) * g;
const shadeC = (c: number, f: number) => (Math.min(255, Math.round(((c >> 16) & 255) * f)) << 16) | (Math.min(255, Math.round(((c >> 8) & 255) * f)) << 8) | Math.min(255, Math.round((c & 255) * f));

/**
 * A chunky leaf mass: one block, plus a smaller block on top and two stuck to its sides, so the outline steps like a clump of cubes
 * instead of a ball. Only the main block is drawn at the Low level; the extra blocks come with Medium and High.
 */
function leafClump(mb: MB, rnd: Rng, c: number, r: number, x: number, y: number, z: number, sy: number, tier: 0 | 1 | 2, swayY0: number, swayH: number) {
  const w = r * rnd.range(1.6, 1.9), d = r * rnd.range(1.6, 1.9), h = Math.max(0.12, r * 1.45 * sy);
  const o = (t: number, col: number, yy: number, hh: number) => ({ tier: t as 0 | 1 | 2, mat: "swayDS" as const, grad: [DARK, col, yy - hh * 0.5, yy + hh * 0.5] as [number, number, number, number], sway: 1, swayY0, swayH });
  mb.box(c, w, h, d, x, y, z, 0, 0, 0, o(tier, c, y, h));
  const t1 = Math.max(tier, 1) as 1 | 2;
  const c2 = rnd.chance(0.5) ? c : rnd.pick(GREENS), w2 = w * rnd.range(0.5, 0.7), d2 = d * rnd.range(0.5, 0.7), h2 = h * rnd.range(0.5, 0.7), y2 = y + h / 2 + h2 / 2 - 0.03;
  mb.box(c2, w2, h2, d2, x + rnd.range(-0.2, 0.2) * w, y2, z + rnd.range(-0.2, 0.2) * d, 0, 0, 0, o(t1, c2, y2, h2));
  for (let i = 0; i < 2; i++) {
    const side = rnd.int(0, 3), sxn = side === 0 ? 1 : side === 1 ? -1 : 0, szn = side === 2 ? 1 : side === 3 ? -1 : 0, c3 = rnd.chance(0.5) ? c : rnd.pick(GREENS);
    const bw = sxn ? w * 0.42 : w * rnd.range(0.5, 0.7), bd = szn ? d * 0.42 : d * rnd.range(0.5, 0.7), bh = h * rnd.range(0.55, 0.8);
    const bx = x + sxn * (w / 2 + bw / 2 - 0.05) + (szn ? rnd.range(-0.2, 0.2) * w : 0), bz = z + szn * (d / 2 + bd / 2 - 0.05) + (sxn ? rnd.range(-0.2, 0.2) * d : 0);
    const by = y - h * 0.1 - rnd.range(0, 0.1) * h;
    mb.box(c3, bw, bh, bd, bx, by, bz, 0, 0, 0, o(t1, c3, by, bh));
  }
  for (let i = 0; i < 2; i++) { // small corner blocks (High only) break the outline into finer steps
    const c4 = rnd.pick(GREENS), s4 = r * rnd.range(0.45, 0.7), by = y + h * rnd.range(-0.1, 0.25);
    mb.box(c4, s4, s4 * 0.8, s4, x + (rnd.chance(0.5) ? 1 : -1) * w * 0.42, by, z + (rnd.chance(0.5) ? 1 : -1) * d * 0.42, 0, 0, 0, o(2, c4, by, s4 * 0.8));
  }
}

/** A square trunk built from stacked blocks that step sideways in whole blocks as it leans, instead of a smooth bent cylinder. */
function stepTrunk(mb: MB, bark: number, h: number, steps: number, w0: number, w1: number, bendX: number, bendZ: number, q: number, sway: number) {
  const dh = h / steps;
  let tx = 0, tz = 0;
  for (let i = 0; i < steps; i++) {
    const t1 = (i + 1) / steps, w = lerp(w0, w1, (i + 0.5) / steps);
    tx = snap(bendX * t1 * t1, q); tz = snap(bendZ * t1 * t1, q);
    mb.box(bark, w, dh * 1.03, w, tx, i * dh + dh / 2, tz, 0, 0, 0, { mat: "sway", sway, swayY0: 0, swayH: h });
  }
  return { x: tx, z: tz };
}

function buildJungle(ctx: Ctx, rnd: Rng, giant: boolean): Variant {
  const T = ctx.T, k = giant ? 2.7 : 1;
  const mb = new MB(T, rnd.int(1, 1e6));
  mb.ao = { y0: 0, h: 1.3 * k, k: 0.35 };
  const h = rnd.range(1.55, 2.05) * k, bark = rnd.pick(BARK);
  const bendX = rnd.range(-0.28, 0.28) * k, bendZ = rnd.range(-0.28, 0.28) * k;
  const top = stepTrunk(mb, bark, h, giant ? 8 : 5, 0.46 * k, 0.24 * k, bendX, bendZ, 0.1 * k, 0.3);
  for (let i = 0; i < 3; i++) { // bark knots: small cubes stuck on the trunk (tier 1)
    const y = rnd.range(0.2, 0.8) * h, a = Math.floor(rnd.next() * 4) * Math.PI / 2, tt = y / h, w = lerp(0.46, 0.24, tt) * k;
    mb.box(shadeC(bark, 0.78), 0.12 * k, 0.12 * k, 0.12 * k, snap(bendX * tt * tt, 0.1 * k) + Math.cos(a) * (w / 2 + 0.02), y, snap(bendZ * tt * tt, 0.1 * k) + Math.sin(a) * (w / 2 + 0.02), 0, 0, 0, { tier: 1 });
  }
  // buttress roots (tier 1): square beams
  const nr = giant ? 7 : 5;
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + rnd.range(-0.3, 0.3), rl = rnd.range(0.38, 0.55) * k;
    mb.beam(bark, 0.15 * k, Math.cos(a) * rl, 0.03, Math.sin(a) * rl, Math.cos(a) * 0.1 * k, 0.8 * k, Math.sin(a) * 0.1 * k, { tier: 1 });
  }
  // canopy: an umbrella of leaf clumps
  const cy = h + 0.2 * k, cx = top.x, cz = top.z;
  const lobe = (tier: 0 | 1 | 2, r: number, x: number, y: number, z: number, sy = 0.62) => leafClump(mb, rnd, rnd.pick(GREENS), r, x, y, z, sy, tier, h - 0.3 * k, 1.6 * k);
  lobe(0, rnd.range(0.7, 0.88) * k, cx, cy + 0.3 * k, cz, 0.6);
  const n0 = 3, n1 = 4;
  for (let i = 0; i < n0; i++) { const a = (i / n0) * 6.28 + rnd.range(0, 1), d = rnd.range(0.62, 0.88) * k; lobe(0, rnd.range(0.5, 0.7) * k, cx + Math.cos(a) * d, cy + rnd.range(0, 0.25) * k, cz + Math.sin(a) * d); }
  for (let i = 0; i < n1; i++) { const a = (i / n1) * 6.28 + rnd.range(0, 1), d = rnd.range(1.15, 1.5) * k; lobe(1, rnd.range(0.5, 0.7) * k, cx + Math.cos(a) * d, cy - rnd.range(0.05, 0.3) * k, cz + Math.sin(a) * d, 0.55); }
  for (let i = 0; i < 3; i++) { const a = rnd.range(0, 6.28), d = rnd.range(0.2, 1.1) * k; lobe(2, rnd.range(0.3, 0.45) * k, cx + Math.cos(a) * d, cy + rnd.range(0.55, 0.9) * k, cz + Math.sin(a) * d, 0.7); }
  // branches into the canopy (tier 1)
  for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + 0.5, d = 0.8 * k; mb.beam(bark, 0.1 * k, cx * 0.7, h * 0.72, cz * 0.7, cx + Math.cos(a) * d, cy + 0.05, cz + Math.sin(a) * d, { tier: 1 }); }
  // hanging vines (tier 2) that sway
  for (let i = 0; i < 6; i++) {
    const a = rnd.range(0, 6.28), d = rnd.range(0.9, 1.5) * k, len = rnd.range(0.6, 1.5) * k, vtop = cy - 0.15 * k;
    mb.box(rnd.pick([0x3f7a30, 0x356b2c, 0x4a8a38]), 0.045 * k, len, 0.045 * k, cx + Math.cos(a) * d, vtop - len / 2, cz + Math.sin(a) * d, 0, 0, 0,
      { tier: 2, mat: "sway", sway: 1, swayY0: vtop - len, swayH: len, swayInv: true, noAO: true });
  }
  for (let i = 0; i < 3; i++) { // blossoms: small cubes
    const a = rnd.range(0, 6.28), d = rnd.range(0.4, 1.2) * k, s = 0.15 * k;
    mb.box(rnd.pick([0xff7aa0, 0xffa04a, 0xf2e45a]), s, s, s, cx + Math.cos(a) * d, cy + rnd.range(0.6, 0.95) * k, cz + Math.sin(a) * d, 0, 0, 0, { tier: 2, noAO: true });
  }
  const root = mb.build(ctx.mats, true);
  const parts = partsOf(root);
  return { kind: giant ? "giant" : "jungle", parts, trunkH: h, trunkR: 0.3 * k, canopyY: cy + 0.25 * k, canopyR: 1.25 * k, proxy: null };
}

function buildBroadleaf(ctx: Ctx, rnd: Rng): Variant {
  const T = ctx.T, mb = new MB(T, rnd.int(1, 1e6));
  mb.ao = { y0: 0, h: 1.0, k: 0.32 };
  const h = rnd.range(1.15, 1.5), bark = rnd.pick(BARK);
  const bx = rnd.range(-0.15, 0.15), bz = rnd.range(-0.15, 0.15);
  const top = stepTrunk(mb, bark, h, 4, 0.4, 0.24, bx, bz, 0.08, 0.25);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + rnd.range(0, 1); mb.beam(bark, 0.12, Math.cos(a) * 0.36, 0.02, Math.sin(a) * 0.36, 0, 0.55, 0, { tier: 1 }); }
  const base = rnd.pick(GREENS);
  const lobe = (tier: 0 | 1 | 2, r: number, x: number, y: number, z: number, sy = 0.82) => leafClump(mb, rnd, rnd.chance(0.6) ? base : rnd.pick(GREENS), r, x, y, z, sy, tier, h - 0.3, 1.5);
  lobe(0, rnd.range(0.82, 0.98), top.x, h + 0.45, top.z, 0.85);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + rnd.range(0, 1); lobe(0, rnd.range(0.52, 0.7), top.x + Math.cos(a) * 0.62, h + 0.15, top.z + Math.sin(a) * 0.62); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + 0.4; lobe(1, rnd.range(0.34, 0.46), top.x + Math.cos(a) * 0.95, h - 0.05, top.z + Math.sin(a) * 0.95, 0.7); }
  for (let i = 0; i < 4; i++) { // fruit: small cubes
    const a = rnd.range(0, 6.28), d = rnd.range(0.4, 1.1);
    mb.box(rnd.pick([0xe0553a, 0xf0b030, 0xc84a8a]), 0.13, 0.13, 0.13, top.x + Math.cos(a) * d, h + rnd.range(0.0, 0.7), top.z + Math.sin(a) * d, 0, 0, 0, { tier: 2, noAO: true });
  }
  const root = mb.build(ctx.mats, true);
  return { kind: "broadleaf", parts: partsOf(root), trunkH: h, trunkR: 0.26, canopyY: h + 0.4, canopyR: 1.05, proxy: null };
}

function buildPalm(ctx: Ctx, rnd: Rng): Variant {
  const T = ctx.T, mb = new MB(T, rnd.int(1, 1e6));
  mb.ao = { y0: 0, h: 1.0, k: 0.25 };
  const h = rnd.range(2.5, 3.3), lean = rnd.range(0.3, 0.7), dir = rnd.range(0, 6.28);
  const segs = 6, bark = rnd.pick([0x8f7048, 0x9a7a50, 0x84683f]), q = 0.07;
  const at = (t: number) => ({ x: snap(Math.cos(dir) * lean * t * t * h * 0.42, q), y: h * t, z: snap(Math.sin(dir) * lean * t * t * h * 0.42, q) });
  for (let i = 0; i < segs; i++) { // a square trunk that steps sideways in whole blocks
    const pm = at((i + 0.5) / segs), w = lerp(0.3, 0.17, (i + 0.5) / segs), p1 = at((i + 1) / segs);
    mb.box(bark, w, (h / segs) * 1.05, w, pm.x, pm.y, pm.z, 0, 0, 0, { mat: "sway", sway: 0.35, swayY0: 0, swayH: h });
    if (i < segs - 1) mb.box(0x6c5233, w + 0.06, 0.05, w + 0.06, p1.x, p1.y, p1.z, 0, 0, 0, { tier: 2 });
  }
  const top = at(1);
  const nf = 8;
  for (let i = 0; i < nf; i++) {
    const yaw = (i / nf) * Math.PI * 2 + rnd.range(-0.15, 0.15), len = rnd.range(1.5, 1.95);
    const geo = frondGeo(T, len, rnd.range(0.38, 0.5), rnd.range(0.45, 0.8), 5, 0.3);
    const c = rnd.pick([0x2f7a34, 0x3c8c3a, 0x4a9a40]);
    mb.add(geo, c, top.x, top.y, top.z, rnd.range(-0.1, 0.1), -yaw, rnd.range(-0.15, 0.1), 1, 1, 1,
      { mat: "swayDS", tier: i % 2 ? 1 : 0, sway: 1.1, swayY0: top.y - 0.9, swayH: 1.2, grad: [0x7ab34a, c, top.y - 0.9, top.y + 0.4], noAO: true });
  }
  for (let i = 0; i < 3; i++) mb.box(0x6b4a2c, 0.15, 0.15, 0.15, top.x + Math.cos(i * 2.1) * 0.13, top.y - 0.14, top.z + Math.sin(i * 2.1) * 0.13, 0, 0, 0, { tier: 1, noAO: true });   // coconuts
  const root = mb.build(ctx.mats, true);
  return { kind: "palm", parts: partsOf(root), trunkH: h, trunkR: 0.2, canopyY: h + 0.1, canopyR: 1.4, proxy: null };
}

function buildBamboo(ctx: Ctx, rnd: Rng): Variant {
  const T = ctx.T, mb = new MB(T, rnd.int(1, 1e6));
  mb.ao = { y0: 0, h: 0.8, k: 0.25 };
  const n = rnd.int(6, 9);
  let maxH = 0;
  for (let i = 0; i < n; i++) {
    const a = rnd.range(0, 6.28), r = rnd.range(0.0, 0.42), H = rnd.range(2.4, 3.6), la = rnd.range(0, 6.28), lean = rnd.range(0.05, 0.22) * H;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    maxH = Math.max(maxH, H);
    const col = rnd.pick([0x8aa63f, 0x7a9a34, 0x9bb348]);
    const segs = 5, sh = H / segs;
    let qx = bx, qz = bz;
    for (let s = 0; s < segs; s++) { // square stalk: stacked blocks with a thicker joint on top of each
      const t1 = (s + 1) / segs, w = 0.1 * (1 - s * 0.08);
      qx = bx + snap(Math.cos(la) * lean * t1 * t1, 0.05); qz = bz + snap(Math.sin(la) * lean * t1 * t1, 0.05);
      mb.box(col, w, sh * 1.02, w, qx, s * sh + sh / 2, qz, 0, 0, 0, { mat: "sway", sway: 1.3, swayY0: 0, swayH: H });
      if (s < segs - 1) mb.box(0x5d7a2a, w + 0.045, 0.05, w + 0.045, qx, (s + 1) * sh, qz, 0, 0, 0, { tier: 1, mat: "sway", sway: 1.3, swayY0: 0, swayH: H });
    }
    for (let l = 0; l < 4; l++) {
      const yaw = (l / 4) * 6.28 + rnd.range(0, 1);
      mb.add(frondGeo(T, rnd.range(0.5, 0.75), 0.11, 0.35, 3, 0.15), rnd.pick([0x4f9a3c, 0x5fae45]), qx, H - 0.1 - l * 0.12, qz, 0, -yaw, 0, 1, 1, 1,
        { mat: "swayDS", tier: l < 2 ? 0 : 1, sway: 1.4, swayY0: H - 0.8, swayH: 0.9, noAO: true });
    }
  }
  const root = mb.build(ctx.mats, true);
  return { kind: "bamboo", parts: partsOf(root), trunkH: maxH * 0.7, trunkR: 0.5, canopyY: maxH * 0.8, canopyR: 0.7, proxy: null };
}

/** Stump mesh (shared geometry per kind size): a block of trunk with a lighter cut top. */
function stumpGeo(ctx: Ctx, r: number) {
  const mb = new MB(ctx.T, 5);
  mb.box(0x6b5238, r * 2.3, 0.34, r * 2.3, 0, 0.17, 0, 0, 0, 0, { sway: 0 });
  mb.box(0xc8a46a, r * 1.9, 0.03, r * 1.9, 0, 0.345, 0, 0, 0, 0, { noAO: true });
  mb.box(0xa88450, r * 0.9, 0.012, r * 0.9, 0, 0.364, 0, 0, 0, 0, { noAO: true });
  const root = mb.build(ctx.mats, false);
  return partsOf(root);
}

export class TreeField {
  ctx: Ctx;
  variants: Variant[] = [];
  byKind: Record<string, number[]> = {};
  sets: VSet[] = [];
  recs = new Set<Rec>();
  group: any;
  falling: any[] = [];
  stumps: any[] = [];
  statics: any[] = [];
  private tmpM: any; private tmpQ: any; private tmpV: any; private tmpS: any; private tmpE: any; private tmpC: any;
  private proxyMat: any;
  private proxyGeo = new Map<number, any>();
  private stumpParts = new Map<string, Part[]>();

  constructor(ctx: Ctx, seed: number) {
    this.ctx = ctx;
    const T = ctx.T;
    this.group = new T.Group(); this.group.name = "wb-trees";
    this.tmpM = new T.Matrix4(); this.tmpQ = new T.Quaternion(); this.tmpV = new T.Vector3(); this.tmpS = new T.Vector3(); this.tmpE = new T.Euler(); this.tmpC = new T.Color();
    this.proxyMat = new T.MeshBasicMaterial({ visible: false });
    const rnd = new Rng(seed * 5 + 3);
    const add = (kind: string, v: Variant) => { (this.byKind[kind] ||= []).push(this.variants.length); this.variants.push(v); };
    for (let i = 0; i < 6; i++) add("jungle", buildJungle(ctx, rnd.fork(i), false));
    for (let i = 0; i < 4; i++) add("broadleaf", buildBroadleaf(ctx, rnd.fork(20 + i)));
    for (let i = 0; i < 4; i++) add("palm", buildPalm(ctx, rnd.fork(40 + i)));
    for (let i = 0; i < 3; i++) add("bamboo", buildBamboo(ctx, rnd.fork(60 + i)));
    for (let i = 0; i < 3; i++) add("giant", buildJungle(ctx, rnd.fork(80 + i), true));
    this.variants.forEach((v) => this.makeSet(v, 24));
    ctx.env.scene.add(this.group);
    this.applyGfx();
  }

  private makeSet(v: Variant, cap: number): VSet {
    const T = this.ctx.T;
    const meshes = v.parts.map((p) => {
      const m = new T.InstancedMesh(p.geo, p.mat, cap);
      m.count = 0; m.frustumCulled = false; m.userData.tier = p.tier; m.userData.partShadow = p.shadow;
      m.castShadow = p.shadow; m.receiveShadow = true; m.userData.noShadowCast = !p.shadow;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.group.add(m);
      return m;
    });
    const set: VSet = { v, meshes, slots: [], cap };
    this.sets.push(set);
    return set;
  }

  /** Grow a set's capacity when it fills up. */
  private grow(set: VSet) {
    const T = this.ctx.T, cap = set.cap * 2;
    set.meshes = set.meshes.map((old: any, i: number) => {
      const m = new T.InstancedMesh(old.geometry, old.material, cap);
      m.count = old.count; m.frustumCulled = false; m.userData = old.userData; m.castShadow = old.castShadow; m.receiveShadow = true;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.instanceMatrix.array.set(old.instanceMatrix.array);
      m.visible = old.visible;
      this.group.remove(old); this.group.add(m); old.dispose();
      return m;
    });
    set.cap = cap;
    set.slots.forEach((r, i) => this.writeMatrix(set, r, i));
  }

  applyGfx() {
    const tier = this.ctx.gfx.f.tier;
    this.sets.forEach((s) => s.meshes.forEach((m: any) => { m.visible = m.userData.tier <= tier; }));
  }

  private writeMatrix(set: VSet, r: Rec, i: number) {
    this.tmpE.set(0, r.rotY, 0); this.tmpQ.setFromEuler(this.tmpE);
    this.tmpV.set(r.x, r.y, r.z); this.tmpS.setScalar(Math.max(0.02, r.lastS));
    this.tmpM.compose(this.tmpV, this.tmpQ, this.tmpS);
    set.meshes.forEach((m: any) => { m.setMatrixAt(i, this.tmpM); m.setColorAt(i, r.tint); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }

  private proxyFor(vi: number) {
    let g = this.proxyGeo.get(vi);
    if (!g) {
      const T = this.ctx.T, v = this.variants[vi]!;
      g = {
        trunk: new T.CylinderGeometry(Math.max(0.2, v.trunkR * 0.8), Math.max(0.25, v.trunkR), v.trunkH, 6),
        canopy: new T.SphereGeometry(v.canopyR * 0.78, 7, 5),
        low: new T.ConeGeometry(Math.max(0.3, v.canopyR * 0.55), Math.max(0.6, v.canopyY * 0.8), 6),
      };
      this.proxyGeo.set(vi, g);
    }
    return g;
  }

  /** Create the game-visible tree and add it to the forest. `variant` picks the model; null picks by kind. */
  create(x: number, z: number, kind: Kind, spawnTime: number, rnd: Rng) {
    const ctx = this.ctx, T = ctx.T, env = ctx.env;
    const list = this.byKind[kind]!;
    const vi = list[Math.floor(rnd.next() * list.length)]!;
    const v = this.variants[vi]!;
    const gy = env.getGroundHeight(x, z);
    const t: any = { x, z, age: spawnTime === -1000 ? env.TREE_GROW_TIME : 0, kind };
    const grp = new T.Group();
    const pg = this.proxyFor(vi);
    const trunk = new T.Mesh(pg.trunk, this.proxyMat); trunk.position.y = v.trunkH / 2;
    const canopy = new T.Mesh(pg.canopy, this.proxyMat); canopy.position.y = v.canopyY;
    const low = new T.Mesh(pg.low, this.proxyMat); low.position.y = Math.max(0.6, v.canopyY * 0.8) / 2;
    [trunk, canopy, low].forEach((m) => { m.visible = false; m.userData = { isTree: true, treeRef: t }; });
    grp.add(trunk, canopy, low);
    const s = t.age >= env.TREE_GROW_TIME ? 1 : 0.02;
    grp.position.set(x, gy, z);
    grp.scale.setScalar(s);
    t.group = grp; t.parts = [trunk, canopy, low];
    env.scene.add(grp);
    // the instanced picture
    const set = this.sets[vi]!;
    if (set.slots.length >= set.cap) this.grow(set);
    const tint = this.tmpC.clone().setScalar(1).multiplyScalar(rnd.range(0.88, 1.1));
    tint.r *= rnd.range(0.94, 1.04); tint.b *= rnd.range(0.92, 1.05);
    const r: Rec = { t, vi, slot: set.slots.length, lastS: s, rotY: Math.floor(rnd.next() * 4) * (Math.PI / 2), tint, x, y: gy, z };
    set.slots.push(r);
    set.meshes.forEach((m: any) => { m.count = set.slots.length; });
    this.writeMatrix(set, r, r.slot);
    this.recs.add(r);
    t.rec = r;
    return t;
  }

  private detach(r: Rec) {
    const set = this.sets[r.vi]!;
    const i = r.slot, last = set.slots.length - 1;
    if (i !== last) {
      const moved = set.slots[last]!;
      set.slots[i] = moved; moved.slot = i;
      this.writeMatrix(set, moved, i);
    }
    set.slots.pop();
    set.meshes.forEach((m: any) => { m.count = set.slots.length; m.instanceMatrix.needsUpdate = true; });
    this.recs.delete(r);
  }

  /** Static scenery (not choppable, not in the game's tree list). */
  addStatic(x: number, z: number, kind: Kind, rnd: Rng, scale = 1) {
    const list = this.byKind[kind]!, vi = list[Math.floor(rnd.next() * list.length)]!, set = this.sets[vi]!;
    const gy = this.ctx.env.getGroundHeight(x, z);
    if (set.slots.length >= set.cap) this.grow(set);
    const tint = this.tmpC.clone().setScalar(rnd.range(0.85, 1.05));
    const r: Rec = { t: null, vi, slot: set.slots.length, lastS: scale, rotY: Math.floor(rnd.next() * 4) * (Math.PI / 2), tint, x, y: gy, z };
    set.slots.push(r);
    set.meshes.forEach((m: any) => { m.count = set.slots.length; });
    this.writeMatrix(set, r, r.slot);
    this.statics.push(r);
    return r;
  }

  /** Called every frame: follow the growth animation the game plays on the stand-in groups. */
  update(dt: number) {
    this.recs.forEach((r) => {
      const s = r.t.group.scale.x;
      if (s !== r.lastS) { r.lastS = s; this.writeMatrix(this.sets[r.vi]!, r, r.slot); }
    });
    this.updateFalling(dt);
  }

  // ------------------------------------------------------------------ chopping: shake, topple, thud, stump
  chop(t: any, by: any) {
    const ctx = this.ctx, T = ctx.T, env = ctx.env, r: Rec | undefined = t.rec;
    if (!r) { env.scene.remove(t.group); return; }
    const v = this.variants[r.vi]!;
    const x = r.x, z = r.z, y = r.y;
    this.detach(r); t.rec = null;
    env.scene.remove(t.group);
    // build a loose copy of the tree to topple (plain materials: no wind on a falling log)
    const g = new T.Group(), inner = new T.Group();
    const swap: Record<string, any> = { };
    v.parts.forEach((p) => {
      let mat = p.mat;
      if (mat === ctx.mats.sway) mat = ctx.mats.lit; else if (mat === ctx.mats.swayDS) mat = ctx.mats.litDS;
      const m = new T.Mesh(p.geo, mat);
      m.castShadow = p.shadow; m.userData.tier = p.tier;
      m.visible = p.tier <= ctx.gfx.f.tier;
      inner.add(m);
    });
    inner.rotation.y = r.rotY; inner.position.y = -0.3; inner.scale.setScalar(Math.max(0.05, r.lastS));
    g.add(inner); g.position.set(x, y + 0.3, z);
    this.group.add(g);
    let dx = 1, dz = 0;
    if (by && by.x != null) { dx = x - by.x; dz = z - by.z; }
    else { const a = Math.random() * 6.28; dx = Math.cos(a); dz = Math.sin(a); }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    this.falling.push({ g, inner, x, y, z, dx, dz, t: 0, phase: 0, v, thud: false, kind: v.kind, chips: 0 });
    this.addStump(v, x, y, z);
    env.spawnShards(x, y + 0.7, z, 0x6b4a2c);
  }

  private addStump(v: Variant, x: number, y: number, z: number) {
    const T = this.ctx.T;
    const key = v.kind + Math.round(v.trunkR * 10);
    let parts = this.stumpParts.get(key);
    if (!parts) { parts = stumpGeo(this.ctx, Math.max(0.16, Math.min(0.55, v.trunkR * 0.7))); this.stumpParts.set(key, parts); }
    const g = new T.Group();
    parts.forEach((p) => { const m = new T.Mesh(p.geo, p.mat); m.castShadow = false; m.receiveShadow = true; g.add(m); });
    g.position.set(x, y, z); g.rotation.y = Math.random() * 6.28;
    this.group.add(g);
    this.stumps.push({ g, t: 0 });
    if (this.stumps.length > 60) { const o = this.stumps.shift(); this.group.remove(o.g); }
  }

  private updateFalling(dt: number) {
    const ctx = this.ctx, T = ctx.T, fx = ctx.fx;
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      const t = f.t, SH = 0.5, FALL = 1.25, REST = 1.4, SINK = 1.4;
      const axis = this.tmpV.set(f.dz, 0, -f.dx);
      let th = 0;
      if (t < SH) { // axe blows: a quick shiver
        th = Math.sin(t * 52) * 0.035 * (1 - t / SH);
        if (f.chips < 2 && t > f.chips * 0.22) { f.chips++; ctx.env.spawnShards(f.x, f.y + 0.8, f.z, 0x8a6a40); fx && fx.leafBurst(f.x, f.y + f.v.canopyY * 0.8, f.z, 5, 0x3f8a3a); }
      } else if (t < SH + FALL) {
        const k = (t - SH) / FALL;
        th = (Math.PI / 2) * Math.pow(k, 2.3) * 0.98;
        f.inner.rotation.y += 0.002;
      } else {
        const k = clamp((t - SH - FALL) / 0.35, 0, 1); // settle with a small rebound
        th = (Math.PI / 2) * (0.98 + 0.02 * k) - Math.sin(k * Math.PI) * 0.07;
        if (!f.thud) {
          f.thud = true;
          const ex = f.x + f.dx * f.v.trunkH * 0.9, ez = f.z + f.dz * f.v.trunkH * 0.9;
          if (fx) { fx.leafBurst(ex, f.y + 0.5, ez, 26, 0x3a7d34); fx.dust(ex, f.y + 0.2, ez, 1.1); fx.leafBurst(f.x + f.dx * f.v.trunkH * 0.5, f.y + 0.4, f.z + f.dz * f.v.trunkH * 0.5, 8, 0x4a9a3d); }
          ctx.env.spawnShards(ex, f.y + 0.3, ez, 0x6b5238);
        }
      }
      f.g.quaternion.setFromAxisAngle(axis, th);
      if (t > SH + FALL + REST) {
        const k = clamp((t - SH - FALL - REST) / SINK, 0, 1);
        f.g.position.y = f.y + 0.3 - k * 0.9;
        f.inner.scale.multiplyScalar(1 - 0.03 * k);
      }
      if (t > SH + FALL + REST + SINK) { this.group.remove(f.g); this.falling.splice(i, 1); }
    }
    for (let i = this.stumps.length - 1; i >= 0; i--) {
      const s = this.stumps[i]; s.t += dt;
      if (s.t > 40) { const k = clamp((s.t - 40) / 3, 0, 1); s.g.position.y -= dt * 0.12; s.g.scale.setScalar(1 - k * 0.5); }
      if (s.t > 43) { this.group.remove(s.g); this.stumps.splice(i, 1); }
    }
  }

  /** Remove every tree standing within r of (x, z) (land cleared for a new building); no wood. */
  clearArea(x: number, z: number, r: number) {
    const env = this.ctx.env, list: any[] = env.trees;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      if (Math.hypot(t.x - x, t.z - z) < r + 0.35) { list.splice(i, 1); this.chop(t, { x, z }); }
    }
  }

  dispose() {
    const env = this.ctx.env;
    this.group.traverse((n: any) => { if (n.isInstancedMesh) n.dispose(); });
    env.scene.remove(this.group);
    this.variants.forEach((v) => v.parts.forEach((p) => p.geo.dispose()));
    this.stumpParts.forEach((ps) => ps.forEach((p) => p.geo.dispose()));
    this.proxyGeo.forEach((g) => { g.trunk.dispose(); g.canopy.dispose(); g.low.dispose(); });
    this.proxyMat.dispose();
    this.recs.clear(); this.falling.length = 0; this.stumps.length = 0; this.statics.length = 0;
  }
}

/** Which species grows where. */
export function pickKind(island: Island, x: number, z: number, rnd: Rng): Kind {
  const r = Math.hypot(x - island.cx, z - island.cz);
  const beach = r > island.G - 1 || island.dWater[Math.floor(z) * 160 + Math.floor(x)]! < 3;
  const u = rnd.next();
  if (beach) return u < 0.72 ? "palm" : u < 0.86 ? "bamboo" : "broadleaf";
  return u < 0.52 ? "jungle" : u < 0.82 ? "broadleaf" : "bamboo";
}
