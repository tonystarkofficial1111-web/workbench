// @ts-nocheck
import { MB } from "../infinite/mb";
import { Rng } from "../infinite/rng";
import { PAL, shade } from "../infinite/props";

/**
 * Siege engines, built from blocks like the rest of the Infinite world but with a lot of small parts: a catapult (mangonel) and a giant
 * crossbow (ballista) on wheeled carriages, the giant bolt, and the deck crossbow for watchtowers. Each model is built once per colour and
 * shared: a unit gets its own meshes over the shared geometry, with the moving parts (wheels, throwing arm, slider, limbs, winch) on pivots.
 * Everything faces +z (towards the target) and stands on y = 0. Detail tiers: 0 shape, 1 detail, 2 fine detail.
 */
const PI = Math.PI;
const WOOD = [0x7a5636, 0x6b4a2c, 0x845d3a], WOODD = 0x4a3220, ROPE = 0xc2ad7a, IRON = 0x3a3f48, STEEL = 0x8a9098, LEATHER = 0x6a4a2c;

type Part = { geo: any; mat: any; tier: number; shadow: boolean };
const cache = new Map<string, Part[]>();
function parts(ctx: any, key: string, seed: number, fill: (mb: MB, r: Rng) => void): Part[] {
  let p = cache.get(key);
  if (p) return p;
  const mb = new MB(ctx.T, seed); mb.ao = { y0: 0, h: 1.0, k: 0.22 }; mb.jitter = 0.04;
  fill(mb, new Rng(seed + 3));
  const root = mb.build(ctx.mats, true);
  p = root.children.map((m: any) => ({ geo: m.geometry, mat: m.material, tier: m.userData.tier || 0, shadow: m.castShadow }));
  cache.set(key, p);
  return p;
}
/** meshes for shared parts; `tiers` collects them so the graphics level can show / hide detail */
function inst(ctx: any, p: Part[], tiers: any[][]) {
  const T = ctx.T, g = new T.Group();
  for (const q of p) { const m = new T.Mesh(q.geo, q.mat); m.castShadow = q.shadow; m.receiveShadow = true; m.userData.tier = q.tier; m.visible = q.tier <= ctx.gfx.f.tier; tiers[q.tier]!.push(m); g.add(m); }
  return g;
}
export function disposeSiegeCache() { cache.forEach((p) => p.forEach((q) => q.geo.dispose())); cache.clear(); }

// ------------------------------------------------------------------------------------------------ shared pieces
/** A wheel with its axle along x: rim segments, iron tyre, spokes and a hub. */
function wheel(mb: MB, r: number, w: number) {
  const n = 12;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * PI * 2, seg = 2 * PI * r / n + 0.02;
    mb.box(WOOD[k % 3]!, w, 0.09, seg, 0, Math.cos(a) * (r - 0.045), Math.sin(a) * (r - 0.045), a, 0, 0, { jit: 0.05 });
    mb.box(IRON, w + 0.012, 0.025, seg, 0, Math.cos(a) * (r + 0.006), Math.sin(a) * (r + 0.006), a, 0, 0, { mat: "metal", tier: 1 });
    if (k % 3 === 0) mb.box(STEEL, w + 0.03, 0.03, 0.03, 0, Math.cos(a) * r, Math.sin(a) * r, a, 0, 0, { mat: "metal", tier: 2 });   // tyre nails
  }
  for (let k = 0; k < 4; k++) mb.box(WOOD[1]!, w * 0.55, (r - 0.08) * 2, 0.05, 0, 0, 0, (k / 4) * PI, 0, 0);
  mb.box(WOODD, w + 0.06, 0.16, 0.16, 0, 0, 0, PI / 4, 0, 0);
  mb.box(IRON, w + 0.1, 0.08, 0.08, 0, 0, 0, 0, 0, 0, { mat: "metal", tier: 1 });
}

/** A wheeled carriage: side beams, cross beams, deck, iron straps and bolts, axles. Wheels are separate (they turn). */
function carriage(mb: MB, r: Rng, W: number, L: number, y: number, deckFrom: number, deckTo: number) {
  for (const s of [-1, 1]) {
    mb.box(WOOD[0]!, 0.15, 0.17, L, s * W / 2, y, 0, 0, 0, 0, { jit: 0.05 });
    for (let k = 0; k < 4; k++) mb.box(IRON, 0.16, 0.18, 0.04, s * W / 2, y, -L / 2 + 0.12 + k * (L - 0.24) / 3, 0, 0, 0, { mat: "metal", tier: 1 });   // straps
    for (const e of [-1, 1]) mb.box(WOODD, 0.17, 0.19, 0.06, s * W / 2, y, e * (L / 2 - 0.02), 0, 0, 0, { tier: 1 });                               // end grain
  }
  for (let k = 0; k < 4; k++) {
    const z = -L / 2 + 0.15 + k * (L - 0.3) / 3;
    mb.box(WOOD[1]!, W + 0.1, 0.12, 0.12, 0, y + 0.02, z);
    for (const s of [-1, 1]) mb.box(STEEL, 0.04, 0.04, 0.04, s * (W / 2 + 0.08), y + 0.02, z, 0, 0, 0, { mat: "metal", tier: 2 });            // bolt heads
  }
  for (let z = deckFrom; z < deckTo - 0.05; z += 0.13) mb.box(PAL.plank[Math.round(z * 10) & 3], W - 0.06, 0.04, 0.11, 0, y + 0.1, z + 0.06, 0, 0, r.range(-0.02, 0.02), { tier: 1, jit: 0.06 });
  for (const z of [-L / 2 + 0.32, L / 2 - 0.32]) { mb.box(IRON, W + 0.34, 0.07, 0.07, 0, 0.3, z, 0, 0, 0, { mat: "metal" }); for (const s of [-1, 1]) mb.box(WOODD, 0.1, 0.24, 0.12, s * W / 2, 0.38, z, 0, 0, 0, { tier: 1 }); }   // axles + hangers
}

/** A banner pole with a faction-coloured flag and a cross on it. */
function banner(mb: MB, x: number, z: number, h: number, color: number) {
  mb.box(WOODD, 0.05, h, 0.05, x, h / 2, z);
  mb.box(color, 0.03, 0.34, 0.42, x, h - 0.22, z - 0.23, 0, 0, 0, { noAO: true, mat: "swayDS", sway: 0.9, swayY0: h - 0.4, swayH: 0.4 });
  mb.box(0xe8c04a, 0.035, 0.07, 0.42, x, h - 0.22, z - 0.23, 0, 0, 0, { noAO: true, tier: 1, mat: "swayDS", sway: 0.9, swayY0: h - 0.4, swayH: 0.4 });
  mb.box(0xe8c04a, 0.035, 0.34, 0.07, x, h - 0.22, z - 0.2, 0, 0, 0, { noAO: true, tier: 1, mat: "swayDS", sway: 0.9, swayY0: h - 0.4, swayH: 0.4 });
  mb.box(PAL.brass, 0.08, 0.08, 0.08, x, h + 0.04, z, 0, PI / 4, 0, { mat: "metal", tier: 2 });
}

/** A blocky boulder (several chunks). */
function boulder(mb: MB, r: Rng, x: number, y: number, z: number, s: number) {
  const cols = [0x7d7668, 0x6f695d, 0x8a8374, 0x625c51];
  mb.box(r.pick(cols), s, s * 0.85, s * 0.9, x, y, z, 0, r.range(0, 1), 0, { jit: 0.06 });
  mb.box(r.pick(cols), s * 0.7, s * 0.7, s * 0.7, x + s * 0.18, y + s * 0.2, z - s * 0.12, r.range(0, 1), r.range(0, 1), 0, { tier: 1, jit: 0.06 });
  mb.box(r.pick(cols), s * 0.55, s * 0.6, s * 0.55, x - s * 0.2, y + s * 0.12, z + s * 0.15, 0, r.range(0, 1), r.range(0, 1), { tier: 1, jit: 0.06 });
}

/** The giant bolt: a long shaft along +z, a heavy iron head, three fletching vanes and binding. Length about 1.35. */
export function boltParts(ctx: any) {
  return parts(ctx, "bolt", 7101, (mb) => {
    mb.ao = { y0: -1, h: 1, k: 0 };
    mb.box(0x8a6a44, 0.06, 0.06, 1.2, 0, 0, 0);
    for (const z of [-0.3, 0.1, 0.42]) mb.box(0x3a2a1a, 0.07, 0.07, 0.04, 0, 0, z, 0, 0, 0, { tier: 1 });                    // binding
    mb.box(IRON, 0.1, 0.1, 0.12, 0, 0, 0.62, 0, 0, PI / 4, { mat: "metal" });
    mb.box(0xb8bec8, 0.12, 0.03, 0.16, 0, 0, 0.74, 0, 0, 0, { mat: "metal" });                                                   // blade
    mb.box(0xb8bec8, 0.03, 0.12, 0.16, 0, 0, 0.74, 0, 0, 0, { mat: "metal" });
    mb.box(0xd0d6de, 0.05, 0.05, 0.12, 0, 0, 0.86, 0, 0, PI / 4, { mat: "metal" });                                              // point
    for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2; mb.box(k ? 0xe8e4d6 : 0xb03030, 0.012, 0.13, 0.26, Math.sin(a) * 0.07, Math.cos(a) * 0.07, -0.48, 0, 0, -a); }   // vanes
  });
}

// ------------------------------------------------------------------------------------------------ catapult
export interface CatapultRig { root: any; pivot: any; bucket: any; ammo: any; winch: any; wheels: any[]; tiers: any[][]; pick: any[] }

export function buildCatapult(ctx: any, color: number): CatapultRig {
  const T = ctx.T, tiers: any[][] = [[], [], []];
  const W = 0.9, L = 1.75, Y = 0.5;
  const body = parts(ctx, "cat-body" + color, 7201, (mb, r) => {
    carriage(mb, r, W, L, Y, -L / 2 + 0.1, -0.2);
    // uprights at the front with a padded stop beam, braced back to the deck
    for (const s of [-1, 1]) {
      mb.box(WOOD[2]!, 0.13, 1.05, 0.13, s * 0.33, Y + 0.6, 0.32);
      mb.beam(WOOD[1]!, 0.1, s * 0.33, Y + 0.95, 0.3, s * 0.38, Y + 0.08, -0.3, {});
      mb.beam(WOOD[1]!, 0.08, s * 0.33, Y + 0.6, 0.38, s * 0.38, Y + 0.08, 0.72, { tier: 1 });
      mb.box(IRON, 0.15, 0.06, 0.15, s * 0.33, Y + 0.3, 0.32, 0, 0, 0, { mat: "metal", tier: 1 });
      mb.box(IRON, 0.15, 0.06, 0.15, s * 0.33, Y + 1.0, 0.32, 0, 0, 0, { mat: "metal", tier: 1 });
    }
    mb.box(WOOD[0]!, 0.86, 0.14, 0.16, 0, Y + 1.12, 0.32);
    mb.box(0xc8a868, 0.5, 0.16, 0.12, 0, Y + 1.12, 0.22, 0, 0, 0, { jit: 0.08 });                    // straw cushion
    for (let k = 0; k < 4; k++) mb.box(LEATHER, 0.52, 0.03, 0.13, 0, Y + 1.06 + k * 0.04, 0.22, 0, 0, 0, { tier: 2 });   // leather wraps
    // the torsion skein the arm passes through: rope bundles between the side beams, iron levers to wind it
    mb.box(ROPE, W - 0.12, 0.26, 0.26, 0, Y + 0.16, -0.05, 0, 0, 0, { jit: 0.06 });
    for (let k = 0; k < 6; k++) mb.box(shade(ROPE, 0.85), 0.03, 0.28, 0.28, -0.32 + k * 0.128, Y + 0.16, -0.05, 0, 0, 0, { tier: 2 });
    for (const s of [-1, 1]) {
      mb.box(IRON, 0.08, 0.34, 0.34, s * (W / 2 + 0.06), Y + 0.16, -0.05, PI / 4, 0, 0, { mat: "metal" });
      mb.box(STEEL, 0.04, 0.5, 0.05, s * (W / 2 + 0.11), Y + 0.16, -0.05, 0.6, 0, 0, { mat: "metal", tier: 1 });   // winding lever
    }
    // winch posts at the back, ratchet and pawl
    for (const s of [-1, 1]) { mb.box(WOOD[2]!, 0.1, 0.4, 0.12, s * 0.36, Y + 0.3, -0.72); mb.box(IRON, 0.12, 0.05, 0.14, s * 0.36, Y + 0.42, -0.72, 0, 0, 0, { mat: "metal", tier: 2 }); }
    mb.box(IRON, 0.04, 0.2, 0.04, 0.24, Y + 0.38, -0.62, 0.5, 0, 0, { mat: "metal", tier: 2 });
    // spare stones on the deck, a bucket of water for the ropes, a mallet
    boulder(mb, r, -0.18, Y + 0.24, -0.5, 0.2); boulder(mb, r, 0.14, Y + 0.24, -0.44, 0.18); boulder(mb, r, 0.0, Y + 0.38, -0.47, 0.16);
    mb.box(0x5a4632, 0.18, 0.18, 0.18, 0.3, Y + 0.2, -0.38, 0, 0.3, 0, { tier: 1 }); mb.box(0x3a6a8a, 0.15, 0.01, 0.15, 0.3, Y + 0.3, -0.38, 0, 0.3, 0, { tier: 2, noAO: true });
    mb.box(WOODD, 0.05, 0.05, 0.42, -0.32, Y + 0.14, 0.05, 0, 0.3, 0, { tier: 2 }); mb.box(WOOD[0]!, 0.12, 0.12, 0.2, -0.38, Y + 0.14, 0.22, 0, 0.3, 0, { tier: 2 });
    banner(mb, -W / 2 - 0.02, -L / 2 + 0.05, 1.7, color);
  });
  const armP = parts(ctx, "cat-arm", 7202, (mb, r) => {
    mb.box(WOOD[0]!, 0.13, 1.3, 0.13, 0, 0.55, 0);
    mb.box(WOOD[2]!, 0.15, 0.4, 0.15, 0, -0.02, 0, 0, 0, 0, { tier: 1 });                         // thick butt in the skein
    for (const y of [0.25, 0.6, 0.95]) mb.box(IRON, 0.15, 0.05, 0.15, 0, y, 0, 0, 0, 0, { mat: "metal", tier: 1 });
    // the cup: a square bowl of planks with an iron rim
    mb.box(WOOD[1]!, 0.4, 0.06, 0.4, 0, 1.22, 0.05);
    for (const s of [-1, 1]) { mb.box(WOOD[2]!, 0.06, 0.16, 0.4, s * 0.2, 1.3, 0.05); mb.box(WOOD[2]!, 0.4, 0.16, 0.06, 0, 1.3, 0.05 + s * 0.2); }
    for (const s of [-1, 1]) { mb.box(IRON, 0.07, 0.03, 0.42, s * 0.2, 1.39, 0.05, 0, 0, 0, { mat: "metal", tier: 2 }); mb.box(IRON, 0.42, 0.03, 0.07, 0, 1.39, 0.05 + s * 0.2, 0, 0, 0, { mat: "metal", tier: 2 }); }
    mb.box(ROPE, 0.03, 0.03, 0.55, 0, 0.32, -0.27, -0.3, 0, 0, { tier: 1 });                           // pull rope (to the winch)
  });
  const ammoP = parts(ctx, "cat-ammo", 7203, (mb, r) => boulder(mb, r, 0, 0, 0, 0.26));
  const wheelP = parts(ctx, "cat-wheel", 7204, (mb) => wheel(mb, 0.3, 0.12));
  const winchP = parts(ctx, "cat-winch", 7205, (mb) => {
    mb.box(WOOD[1]!, 0.66, 0.15, 0.15, 0, 0, 0, PI / 4, 0, 0);
    for (let k = 0; k < 5; k++) mb.box(ROPE, 0.035, 0.17, 0.17, -0.12 + k * 0.05, 0, 0, PI / 4, 0, 0, { tier: 1 });
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) mb.box(WOODD, 0.05, 0.5, 0.05, s * 0.36, 0, 0, (k / 2) * PI, 0, 0, { tier: 1 });   // handspikes
  });

  const root = new T.Group();
  root.add(inst(ctx, body, tiers));
  const pivot = new T.Group(); pivot.position.set(0, Y + 0.16, -0.05); root.add(pivot);
  pivot.add(inst(ctx, armP, tiers));
  const bucket = new T.Object3D(); bucket.position.set(0, 1.36, 0.05); pivot.add(bucket);
  const ammo = inst(ctx, ammoP, tiers); ammo.position.set(0, 1.42, 0.05); pivot.add(ammo);
  const winch = new T.Group(); winch.position.set(0, Y + 0.42, -0.72); winch.add(inst(ctx, winchP, tiers)); root.add(winch);
  const wheels: any[] = [];
  for (const [x, z] of [[0.6, 0.55], [-0.6, 0.55], [0.6, -0.55], [-0.6, -0.55]]) { const w = new T.Group(); w.position.set(x!, 0.3, z!); w.add(inst(ctx, wheelP, tiers)); root.add(w); wheels.push(w); }
  pivot.rotation.x = -1.2;
  const pick: any[] = []; root.traverse((m: any) => { if (m.isMesh) pick.push(m); });
  return { root, pivot, bucket, ammo, winch, wheels, tiers, pick };
}

// ------------------------------------------------------------------------------------------------ giant crossbow
export interface BallistaRig { root: any; mount: any; slider: any; bolt: any; limbs: any[]; tips: any[]; strings: any[]; winch: any; wheels: any[]; tiers: any[][]; pick: any[] }
export const SLIDE_REST = 0.5, SLIDE_DRAWN = -0.62;

/** The crossbow itself (no carriage): rail, front frame with torsion springs, limbs, slider with the bolt, winch. Used on the carriage and on towers. */
function crossbowTop(ctx: any, color: number, tiers: any[][], scale = 1) {
  const T = ctx.T;
  const frame = parts(ctx, "bal-frame" + color, 7301, (mb, r) => {
    // the rail (stock) with two guide strips and a trough
    mb.box(WOOD[0]!, 0.22, 0.14, 2.15, 0, 0, 0.0);
    for (const s of [-1, 1]) mb.box(WOOD[2]!, 0.05, 0.06, 2.0, s * 0.085, 0.09, 0.02, 0, 0, 0, { tier: 1 });
    for (let k = 0; k < 5; k++) mb.box(IRON, 0.24, 0.16, 0.04, 0, 0, -0.85 + k * 0.4, 0, 0, 0, { mat: "metal", tier: 1 });
    // the front frame (capital): two stiles, top and bottom rails, iron plates, the torsion springs (rope bundles with iron washers)
    const FZ = 0.62;
    mb.box(WOOD[1]!, 0.9, 0.12, 0.22, 0, 0.3, FZ); mb.box(WOOD[1]!, 0.9, 0.12, 0.22, 0, -0.26, FZ);
    for (const s of [-1, 1]) {
      mb.box(WOOD[2]!, 0.12, 0.62, 0.22, s * 0.42, 0.02, FZ);
      mb.box(WOOD[2]!, 0.1, 0.62, 0.2, s * 0.12, 0.02, FZ, 0, 0, 0, { tier: 1 });
      mb.box(ROPE, 0.16, 0.5, 0.16, s * 0.27, 0.02, FZ, 0, 0, 0, { jit: 0.06 });
      for (let k = 0; k < 5; k++) mb.box(shade(ROPE, 0.82), 0.17, 0.025, 0.17, s * 0.27, -0.18 + k * 0.1, FZ, 0, 0, 0, { tier: 2 });
      for (const y of [0.38, -0.34]) { mb.box(IRON, 0.22, 0.05, 0.22, s * 0.27, y, FZ, 0, 0, 0, { mat: "metal" }); mb.box(STEEL, 0.05, 0.06, 0.26, s * 0.27, y + 0.04 * Math.sign(y), FZ, 0, 0, 0, { mat: "metal", tier: 1 }); }   // washers + levers
      mb.box(IRON, 0.04, 0.6, 0.24, s * 0.48, 0.02, FZ, 0, 0, 0, { mat: "metal", tier: 1 });
      for (const y of [0.25, -0.2]) mb.box(STEEL, 0.05, 0.05, 0.05, s * 0.5, y, FZ + 0.08, 0, 0, 0, { mat: "metal", tier: 2 });
    }
    // a shield plate on the front with the faction colour, and the aiming sight
    mb.box(color, 0.3, 0.2, 0.03, 0, 0.12, FZ + 0.13, 0, 0, 0, { noAO: true, tier: 1 });
    mb.box(0xe8c04a, 0.08, 0.2, 0.035, 0, 0.12, FZ + 0.135, 0, 0, 0, { noAO: true, tier: 2 });
    mb.box(IRON, 0.04, 0.12, 0.04, 0, 0.42, FZ - 0.05, 0, 0, 0, { mat: "metal", tier: 2 });
    // the winch frame at the back with a ratchet
    for (const s of [-1, 1]) { mb.box(WOOD[2]!, 0.08, 0.3, 0.14, s * 0.2, -0.02, -1.02); mb.box(IRON, 0.1, 0.04, 0.16, s * 0.2, 0.12, -1.02, 0, 0, 0, { mat: "metal", tier: 2 }); }
    mb.box(IRON, 0.03, 0.16, 0.03, 0.12, 0.06, -0.92, 0.6, 0, 0, { mat: "metal", tier: 2 });
    // a quiver of spare bolts strapped to the side of the rail
    for (let k = 0; k < 3; k++) { mb.box(0x8a6a44, 0.045, 0.045, 1.0, -0.17 - k * 0.05, -0.08 - (k % 2) * 0.04, -0.2, 0, 0, 0, { tier: 1 }); mb.box(0xb8bec8, 0.06, 0.06, 0.1, -0.17 - k * 0.05, -0.08 - (k % 2) * 0.04, 0.33, 0, 0, PI / 4, { mat: "metal", tier: 2 }); }
    mb.box(LEATHER, 0.2, 0.18, 0.05, -0.22, -0.08, 0.05, 0, 0, 0, { tier: 2 });
  });
  const limbP = parts(ctx, "bal-limb", 7302, (mb) => {
    // a long laminated arm reaching out from the spring: three tapering layers with leather wraps and an iron tip
    mb.box(WOOD[0]!, 0.7, 0.12, 0.12, 0.35, 0, 0);
    mb.box(WOOD[2]!, 0.55, 0.09, 0.15, 0.32, 0.0, -0.01, 0, 0, 0, { tier: 1 });
    mb.box(0x5a3d26, 0.3, 0.08, 0.17, 0.2, 0, 0, 0, 0, 0, { tier: 2 });
    for (const x of [0.12, 0.45]) mb.box(LEATHER, 0.05, 0.14, 0.14, x, 0, 0, 0, 0, 0, { tier: 2 });
    mb.box(IRON, 0.1, 0.13, 0.13, 0.72, 0, 0, 0, 0, 0, { mat: "metal" });
  });
  const sliderP = parts(ctx, "bal-slider", 7303, (mb) => {
    mb.box(WOOD[2]!, 0.26, 0.12, 0.26, 0, 0.13, 0);
    mb.box(IRON, 0.08, 0.1, 0.08, 0, 0.22, 0.08, 0, 0, 0, { mat: "metal" });                      // the claw that holds the string
    mb.box(IRON, 0.04, 0.12, 0.04, 0.07, 0.14, -0.12, 0.4, 0, 0, { mat: "metal", tier: 1 });      // trigger
    mb.box(ROPE, 0.03, 0.03, 0.5, 0, 0.13, -0.38, 0, 0, 0, { tier: 1 });                          // haul rope to the winch
  });
  const winchP = parts(ctx, "bal-winch", 7304, (mb) => {
    mb.box(WOOD[1]!, 0.34, 0.12, 0.12, 0, 0, 0, PI / 4, 0, 0);
    for (let k = 0; k < 4; k++) mb.box(ROPE, 0.03, 0.14, 0.14, -0.08 + k * 0.05, 0, 0, PI / 4, 0, 0, { tier: 1 });
    for (const s of [-1, 1]) { mb.box(WOODD, 0.05, 0.08, 0.08, s * 0.22, 0, 0, 0, 0, 0); for (let k = 0; k < 4; k++) mb.box(WOODD, 0.035, 0.34, 0.035, s * 0.26, 0, 0, (k / 4) * PI, 0, 0, { tier: 1 }); }   // capstan spokes
  });
  const mount = new T.Group(); mount.scale.setScalar(scale);
  mount.add(inst(ctx, frame, tiers));
  const limbs: any[] = [], tips: any[] = [];
  for (const s of [-1, 1]) {
    const piv = new T.Group(); piv.position.set(s * 0.27, 0.02, 0.62); mount.add(piv);
    const l = inst(ctx, limbP, tiers); if (s < 0) l.scale.x = -1; piv.add(l);
    const tip = new T.Object3D(); tip.position.set(s * 0.74, 0, 0); piv.add(tip);
    piv.rotation.y = s * 0.42; limbs.push(piv); tips.push(tip);
  }
  const slider = new T.Group(); slider.position.set(0, 0, SLIDE_REST); mount.add(slider);
  slider.add(inst(ctx, sliderP, tiers));
  const bolt = inst(ctx, boltParts(ctx), tiers); bolt.position.set(0, 0.16, 0.66); slider.add(bolt);
  const strMat = new T.MeshLambertMaterial({ color: 0xd8c898 });
  const strGeo = new T.BoxGeometry(0.025, 0.025, 1);
  const strings = [new T.Mesh(strGeo, strMat), new T.Mesh(strGeo, strMat)];
  strings.forEach((m) => { m.castShadow = true; mount.add(m); });
  const winch = new T.Group(); winch.position.set(0, -0.02, -1.02); winch.add(inst(ctx, winchP, tiers)); mount.add(winch);
  return { mount, slider, bolt, limbs, tips, strings, winch, strMat, strGeo };
}

const tmpA: any = {}, tmpB: any = {};
/** Re-lay the bow string from each limb tip to the slider's claw (after limbs or slider moved). */
export function layString(T: any, r: any) {
  const claw = (tmpA.v || (tmpA.v = new T.Vector3())).set(0, 0.24, r.slider.position.z + 0.08);
  const p = tmpB.v || (tmpB.v = new T.Vector3());
  r.mount.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) {
    r.tips[i].getWorldPosition(p); r.mount.worldToLocal(p);
    const m = r.strings[i];
    m.position.set((p.x + claw.x) / 2, (p.y + claw.y) / 2, (p.z + claw.z) / 2);
    m.scale.set(1, 1, Math.max(0.01, p.distanceTo(claw)));
    m.lookAt(r.mount.localToWorld(claw.clone()));
  }
}

export function buildBallista(ctx: any, color: number): BallistaRig {
  const T = ctx.T, tiers: any[][] = [[], [], []];
  const W = 1.0, L = 2.0, Y = 0.5;
  const body = parts(ctx, "bal-body" + color, 7401, (mb, r) => {
    carriage(mb, r, W, L, Y, -L / 2 + 0.1, L / 2 - 0.1);
    // turntable and the post the crossbow sits on
    mb.box(WOOD[1]!, 0.7, 0.08, 0.7, 0, Y + 0.16, 0, 0, PI / 4, 0);
    mb.box(IRON, 0.74, 0.03, 0.74, 0, Y + 0.21, 0, 0, PI / 4, 0, { mat: "metal", tier: 1 });
    mb.box(WOOD[0]!, 0.22, 0.6, 0.22, 0, Y + 0.5, 0);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2 + PI / 4; mb.beam(WOOD[2]!, 0.08, Math.cos(a) * 0.32, Y + 0.2, Math.sin(a) * 0.32, Math.cos(a) * 0.08, Y + 0.65, Math.sin(a) * 0.08, { tier: 1 }); }
    mb.box(IRON, 0.26, 0.06, 0.26, 0, Y + 0.8, 0, 0, 0, 0, { mat: "metal", tier: 1 });
    // a plank mantlet low on the front to cover the crew, iron studded
    for (let k = 0; k < 6; k++) mb.box(PAL.plank[k % 4], 0.18, 0.46, 0.06, -0.45 + k * 0.18, Y + 0.33, L / 2 - 0.02, 0, 0, 0, { jit: 0.06 });
    mb.box(WOOD[1]!, 1.12, 0.07, 0.08, 0, Y + 0.56, L / 2 - 0.02, 0, 0, 0, { tier: 1 });
    for (let k = 0; k < 6; k++) mb.box(STEEL, 0.035, 0.035, 0.03, -0.45 + k * 0.18, Y + 0.45, L / 2 + 0.02, 0, 0, 0, { mat: "metal", tier: 2 });
    // spare bolts in a rack along one side, a crate of heads, a water bucket
    for (let k = 0; k < 4; k++) { mb.box(0x8a6a44, 0.05, 0.05, 1.2, W / 2 - 0.1 - k * 0.07, Y + 0.16, -0.05, 0, 0, 0, { tier: 1 }); mb.box(0xb8bec8, 0.07, 0.07, 0.12, W / 2 - 0.1 - k * 0.07, Y + 0.16, 0.6, 0, 0, PI / 4, { mat: "metal", tier: 2 }); }
    mb.box(PAL.plank[1], 0.26, 0.2, 0.26, -0.32, Y + 0.2, -0.7, 0, 0.2, 0, { tier: 1 }); mb.box(IRON, 0.27, 0.03, 0.27, -0.32, Y + 0.3, -0.7, 0, 0.2, 0, { mat: "metal", tier: 2 });
    banner(mb, -W / 2 - 0.02, -L / 2 + 0.05, 1.9, color);
  });
  const wheelP = parts(ctx, "bal-wheel", 7402, (mb) => wheel(mb, 0.32, 0.13));
  const root = new T.Group();
  root.add(inst(ctx, body, tiers));
  const top = crossbowTop(ctx, color, tiers);
  top.mount.position.set(0, Y + 0.95, 0); root.add(top.mount);
  const wheels: any[] = [];
  for (const [x, z] of [[0.66, 0.62], [-0.66, 0.62], [0.66, -0.62], [-0.66, -0.62]]) { const w = new T.Group(); w.position.set(x!, 0.32, z!); w.add(inst(ctx, wheelP, tiers)); root.add(w); wheels.push(w); }
  const rig: any = { root, ...top, wheels, tiers, pick: [] };
  layString(T, rig);
  root.traverse((m: any) => { if (m.isMesh) rig.pick.push(m); });
  return rig;
}

/** Animate a crossbow rig from its state `st` ({ load 0..1, fire seconds left of the shot }): the slider runs back while it is drawn and snaps
 *  forward on the shot, the limbs bend back with the draw and whip forward, the winch turns, the loaded bolt shows. */
export function animXbow(T: any, r: any, st: any, dt: number) {
  let z: number, bend: number;
  if (st.fire > 0) {
    st.fire -= dt; const k = 1 - Math.max(0, st.fire) / 0.3;
    z = SLIDE_DRAWN + (SLIDE_REST - SLIDE_DRAWN) * Math.min(1, k * 5);
    bend = -0.18 * Math.sin(Math.min(1, k * 2) * PI);
  } else {
    z = SLIDE_REST + (SLIDE_DRAWN - SLIDE_REST) * st.load;
    bend = 0.32 * st.load;
    if (st.load < 1) r.winch.rotation.x -= dt * 5;
  }
  r.slider.position.z = z;
  r.limbs[0].rotation.y = -(0.42 + bend); r.limbs[1].rotation.y = 0.42 + bend;
  r.bolt.visible = !(st.fire > 0) && st.load > 0.05;
  layString(T, r);
}

/** A crossbow on a post for a watchtower deck (turns on its own). */
export function buildDeckCrossbow(ctx: any, color: number) {
  const T = ctx.T, tiers: any[][] = [[], [], []];
  const post = parts(ctx, "deck-post", 7501, (mb) => {
    mb.box(WOOD[1]!, 0.5, 0.06, 0.5, 0, 0.03, 0, 0, PI / 4, 0);
    mb.box(WOOD[0]!, 0.16, 0.55, 0.16, 0, 0.3, 0);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2; mb.beam(WOOD[2]!, 0.06, Math.cos(a) * 0.24, 0.05, Math.sin(a) * 0.24, Math.cos(a) * 0.06, 0.4, Math.sin(a) * 0.06, { tier: 1 }); }
    mb.box(IRON, 0.2, 0.05, 0.2, 0, 0.58, 0, 0, 0, 0, { mat: "metal", tier: 1 });
  });
  const g = new T.Group(); g.add(inst(ctx, post, tiers));
  const yaw = new T.Group(); yaw.position.y = 0.64; g.add(yaw);
  const top = crossbowTop(ctx, color, tiers, 0.62);
  top.mount.position.y = 0.06; yaw.add(top.mount);
  const rig: any = { g, yaw, ...top, tiers };
  layString(T, rig);
  return rig;
}

/** The ballista and catapult as fixed Free Style buildings (no wheels turning; same looks). */
export function siegeStatic(ctx: any, kind: "ballista" | "catapult", color: number) {
  return kind === "ballista" ? buildBallista(ctx, color) : buildCatapult(ctx, color);
}
