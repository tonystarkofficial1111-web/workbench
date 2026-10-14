// @ts-nocheck
import type { Ctx } from "./types";
import { MB } from "./mb";
import { Rng } from "./rng";
import { partsOf, STEEL_D, LEATHER_D, BRASS, type Part, type HumanParts } from "./humans";

/**
 * Jungle zombies. Pale-green rotting skin, sunken glowing eyes, an open jaw, claws, tattered clothes in several styles, exposed ribs and
 * bones, moss and vines growing on them. A dozen different bodies are built once and shared; each zombie also gets its own build
 * (thin, tall, heavy), its own way of walking (shamble, lurch, limp, crawl, stagger, sprint) and its own idle twitches.
 */
export type GaitKind = "shamble" | "lurch" | "limp" | "crawl" | "stagger" | "sprint";
export interface Gait {
  kind: GaitKind;
  cadence: number;      // phase gained per unit walked (stride length)
  legAmp: number; armPose: number; armSwing: number; lean: number; bob: number; sway: number; headLag: number;
  speedMul: number; dragSide: number; twitch: number; crouch: number; phase: number;
}

const SKINS = [0x7f9c6b, 0x8aa07a, 0x6f8f72, 0x9aa88a, 0x7a8f60, 0x889a82, 0x738a68];
const CLOTHS = [0x6b4f3a, 0x3f5470, 0x5a3d6b, 0x6a6f78, 0x4a5a3a, 0x7a5a3a, 0x55423a];
const MOSS = [0x4b7a3c, 0x3f6a34, 0x5b8a40];
const BONE = 0xe6dcc0;

export interface ZLook { skin: number; cloth: number; cloth2: number; hair: number; kind: number; build: number; ribs: boolean; eyes: number; key: string; boss?: boolean }

export function zombieLook(rnd: Rng, boss = false): ZLook {
  const skin = boss ? 0x7a4f8a : rnd.pick(SKINS), cloth = boss ? 0x3a2a4a : rnd.pick(CLOTHS), cloth2 = rnd.pick(CLOTHS);
  const hair = rnd.pick([0x2b1d12, 0x4a3a28, 0x1a1a1e, 0x6a6a5a]);
  const kind = boss ? 3 : rnd.int(0, 3), build = boss ? 1.2 : rnd.range(0.92, 1.12), ribs = rnd.chance(0.35);
  const eyes = boss ? 0xff4a2a : rnd.pick([0xe0e050, 0xd8c040, 0xff6a3a, 0x80f070]);
  return { skin, cloth, cloth2, hair, kind, build, ribs, eyes, key: [skin, cloth, kind, Math.round(build * 20), +ribs, eyes, boss ? "B" : ""].join("-"), boss };
}

const cache = new Map<string, HumanParts>();

function rag(mb: MB, color: number, x: number, y: number, z: number, w: number, h: number, rx = 0, ry = 0, rz = 0) {
  mb.add(new mb.T.PlaneGeometry(w, h, 1, 2), color, x, y - h / 2, z, rx, ry, rz, 1, 1, 1, { mat: "swayDS", tier: 1, sway: 1, swayY0: y - h, swayH: h, swayInv: true, noAO: true });
}

function head(ctx: Ctx, Z: ZLook, seed: number) {
  const mb = new MB(ctx.T, seed); mb.ao = { y0: 0.2, h: 0.3, k: 0 }; mb.jitter = 0.04;
  mb.sphere(Z.skin, 0.105, 0, 0.14, 0, 1, 1.05, 1.02, 10, 8);
  mb.box(Z.skin, 0.075, 0.04, 0.05, 0, 0.065, 0.045, 0.28, 0, 0);                                      // slack jaw, hanging open
  mb.box(0x1a0d0d, 0.055, 0.03, 0.045, 0, 0.1, 0.075, 0, 0, 0, { noAO: true });                       // mouth cavity
  for (let i = 0; i < 4; i++) mb.box(0xcfc7a6, 0.012, 0.016, 0.008, -0.025 + i * 0.017, 0.118, 0.1, 0, 0, 0, { tier: 2, noAO: true }); // teeth
  mb.box(Z.skin, 0.024, 0.036, 0.03, 0, 0.125, 0.108, 0, 0, 0, { tier: 1 });
  for (const sg of [-1, 1]) {
    mb.sphere(0x0c0808, 0.03, sg * 0.04, 0.16, 0.088, 1, 1, 0.6, 6, 5, { noAO: true });               // sunken socket
    mb.sphere(Z.eyes, 0.014, sg * 0.04, 0.16, 0.1, 1, 1, 0.7, 5, 4, { mat: "glow", noAO: true, jit: 0 }); // glowing eye
    mb.sphere(Z.skin, 0.02, sg * 0.1, 0.14, 0, 0.6, 1, 1, 5, 4, { tier: 2 });
  }
  if (Z.kind !== 1) { // patchy, matted hair: a cap over the back of the skull and a few long strands that hang down (never spikes that read as horns)
    mb.add(new ctx.T.SphereGeometry(0.111, 9, 5, 2.5, 4.3, 0, 1.15), Z.hair, 0, 0.14, -0.004, 0, 0, 0, 1, 1.07, 1.02, { tier: 1, noAO: true });
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.4 + i * 0.55, ex = Math.cos(a), ez = Math.sin(a), len = 0.1 + ((i * 5) % 3) * 0.035;
      mb.taper(Z.hair, 0.014, 0.006, ex * 0.088, 0.2, ez * 0.088, ex * 0.108, 0.2 - len, ez * 0.112, 4, { tier: 1, noAO: true, mat: "sway", sway: 0.8, swayY0: 0.2 - len, swayH: len, swayInv: true });
    }
  }
  mb.dome(BONE, 0.045, 0.045, 0.2, -0.02, 1, 0.6, 1, 6, 0, 0, 0.5, { tier: 1, noAO: true });          // exposed skull patch
  mb.blob(0x6b1010, 0.025, -0.06, 0.17, 0.07, 1, 0.8, 0.5, 0, 0, { tier: 1, noAO: true });             // wound
  if (Z.kind === 1) { // soldier: rusted helmet, half gone
    mb.dome(0x6a4a30, 0.125, 0, 0.15, 0, 1, 1.0, 1.05, 9, 0, 0, 0.18, { mat: "metal" });
    mb.box(0x4a3322, 0.07, 0.02, 0.1, 0, 0.13, 0.12, 0, 0, 0, { mat: "metal", tier: 1 });
  }
  if (Z.boss) { for (const sg of [-1, 1]) mb.cone(BONE, 0.035, 0.2, sg * 0.09, 0.27, 0.0, 5, 0, 0, -sg * 0.5, { noAO: true }); mb.cone(0xff5a2a, 0.02, 0.09, 0, 0.27, 0.1, 4, 0.6, 0, 0, { mat: "glow", noAO: true }); }
  return partsOf(mb, ctx);
}

function torso(ctx: Ctx, Z: ZLook, seed: number) {
  const T = ctx.T, mb = new MB(T, seed); mb.ao = { y0: 0, h: 0.5, k: 0.16 }; mb.jitter = 0.05;
  const b = Z.build, cl = Z.cloth;
  mb.add(new T.CylinderGeometry(0.12 * b, 0.11 * b, 0.2, 9), Z.skin, 0, 0.1, 0, 0, 0, 0, 1.05, 1, 0.78);
  mb.add(new T.CylinderGeometry(0.16 * b, 0.125 * b, 0.2, 9), Z.kind === 2 ? Z.skin : cl, 0, 0.27, 0, 0, 0, 0, 1.14, 1, 0.82);
  mb.box(Z.kind === 2 ? Z.skin : cl, 0.37 * b, 0.05, 0.16, 0, 0.35, 0, 0, 0, 0.04);
  mb.cyl(Z.skin, 0.04, 0.048, 0.07, 0, 0.4, 0.01, 7);
  // torn clothing, by style: 0 villager tunic, 1 soldier remnants, 2 tribal (leaf kilt), 3 explorer coat
  if (Z.kind === 2) {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; mb.add(new T.PlaneGeometry(0.075, 0.16), rnd3(i, [0x3f7a34, 0x4a8a3a, 0x356b2c]), Math.cos(a) * 0.13, -0.02, Math.sin(a) * 0.1, 0.15, a, 0, 1, 1, 1, { mat: "swayDS", tier: 0, sway: 1, swayY0: -0.1, swayH: 0.16, swayInv: true, noAO: true }); }
    mb.torus(0xb59a6a, 0.12, 0.012, 0, 0.03, 0, Math.PI / 2, 0, 0, 4, 12, { tier: 1 });
    for (let i = 0; i < 4; i++) mb.cone(BONE, 0.012, 0.05, -0.07 + i * 0.047, 0.4, 0.1, 4, Math.PI, 0, 0, { tier: 2, noAO: true }); // bone necklace
  } else {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + 0.3; rag(mb, i % 2 ? cl : Z.cloth2, Math.cos(a) * 0.15 * b, 0.0, Math.sin(a) * 0.115 * b, 0.07 + (i % 3) * 0.02, 0.1 + ((i * 7) % 5) * 0.025, 0.1, a, 0); }
    if (Z.kind === 1) { mb.add(new T.PlaneGeometry(0.2, 0.2), 0x6a4a30, 0, 0.27, 0.131 * b, 0, 0, 0.1, 1, 1, 1, { mat: "metal", tier: 0, noAO: true }); mb.box(0x4a3322, 0.04, 0.2, 0.01, 0.07, 0.27, 0.136, 0, 0, 0.5, { mat: "metal", tier: 1 }); }
    mb.torus(LEATHER_D, 0.125 * b, 0.016, 0, 0.03, 0, Math.PI / 2, 0, 0, 4, 12, { tier: 1 });
  }
  if (Z.ribs) { // the front of the shirt is gone
    for (let i = 0; i < 4; i++) mb.box(BONE, 0.19 * b, 0.012, 0.012, 0, 0.2 + i * 0.045, 0.116 * b, 0, 0, 0, { tier: 1, noAO: true });
    mb.box(0x5a1a1a, 0.15 * b, 0.17, 0.012, 0, 0.27, 0.114 * b, 0, 0, 0, { tier: 1, noAO: true });
  }
  mb.blob(MOSS[0]!, 0.05, 0.12 * b, 0.35, -0.02, 1.4, 0.6, 1.2, 0, 0, { tier: 1, noAO: true });         // moss on the shoulder
  mb.box(0x3f7a30, 0.02, 0.2, 0.02, -0.1, 0.2, -0.1, 0, 0, 0.1, { mat: "swayDS", tier: 2, sway: 1, swayY0: 0.1, swayH: 0.2, swayInv: true, noAO: true }); // a vine
  if (Z.boss) {
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) mb.cone(BONE, 0.03, 0.14 - i * 0.025, sg * (0.2 + i * 0.03), 0.38 + i * 0.03, -0.02, 5, 0, 0, -sg * (0.9 + i * 0.15), { noAO: true });
    mb.torus(STEEL_D, 0.17, 0.02, 0, 0.3, 0, Math.PI / 2, 0, 0, 4, 12, { mat: "metal", tier: 1 });
    mb.add(new T.PlaneGeometry(0.4, 0.6, 3, 4), 0x2a1a38, 0, 0.1, -0.12, 0.12, 0, 0, 1, 1, 1, { mat: "swayDS", sway: 1.2, swayY0: -0.2, swayH: 0.6, swayInv: true, noAO: true });
  }
  return partsOf(mb, ctx);
}
function rnd3(i: number, list: number[]) { return list[i % list.length]!; }

function arm(ctx: Ctx, Z: ZLook, side: number, seed: number) {
  const mb = new MB(ctx.T, seed); mb.ao = { y0: -0.36, h: 0.45, k: 0.1 }; mb.jitter = 0.05;
  const sleeve = Z.kind === 2 ? Z.skin : Z.cloth;
  mb.taper(sleeve, 0.052, 0.04, 0, 0, 0, 0, -0.14, 0.005, 6);
  mb.sphere(sleeve, 0.055, 0, 0, 0, 1, 1, 1, 6, 4);
  mb.taper(Z.skin, 0.04, 0.03, 0, -0.14, 0.005, 0, -0.31, 0.02, 6);                                    // thin forearm
  rag(mb, sleeve, 0, -0.1, 0, 0.1, 0.06, 0, side * 0.6, 0);
  mb.cone(BONE, 0.018, 0.06, 0, -0.14, 0.03, 4, 0.5, 0, 0, { tier: 2, noAO: true });                  // elbow bone
  mb.sphere(Z.skin, 0.04, 0, -0.325, 0.03, 1, 1, 1.2, 6, 4);
  for (let i = -1; i <= 1; i++) mb.cone(0xcfc7a6, 0.011, 0.07, i * 0.025, -0.37, 0.05, 4, Math.PI * 0.85, 0, i * 0.2, { tier: 1, noAO: true }); // claws
  mb.blob(MOSS[1]!, 0.03, 0.01, -0.02, 0.02, 1.3, 0.6, 1, 0, 0, { tier: 2, noAO: true });
  return partsOf(mb, ctx);
}

function leg(ctx: Ctx, Z: ZLook, side: number, seed: number) {
  const mb = new MB(ctx.T, seed); mb.ao = { y0: -0.4, h: 0.5, k: 0.14 }; mb.jitter = 0.05;
  const pants = Z.kind === 2 ? Z.skin : Z.cloth2;
  mb.taper(pants, 0.07, 0.054, 0, 0, 0, 0, -0.2, 0.01, 6);
  mb.taper(Z.skin, 0.054, 0.04, 0, -0.2, 0.01, 0, -0.37, 0, 6);
  rag(mb, pants, 0, -0.17, 0, 0.12, 0.09, 0, side, 0);
  mb.box(Z.skin, 0.085, 0.045, 0.17, 0, -0.385, 0.045);                                                 // bare foot
  for (let i = -1; i <= 1; i++) mb.cone(0xcfc7a6, 0.011, 0.03, i * 0.026, -0.385, 0.14, 4, Math.PI / 2, 0, 0, { tier: 2, noAO: true });
  if (side > 0 && Z.ribs) mb.cone(BONE, 0.016, 0.07, 0.03, -0.12, 0.05, 4, 0.4, 0, 0, { tier: 2, noAO: true }); // bone through the trouser
  return partsOf(mb, ctx);
}

export function zombieParts(ctx: Ctx, Z: ZLook): HumanParts {
  let p = cache.get(Z.key);
  if (p) return p;
  const seed = Math.abs(Z.key.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 3));
  p = { head: head(ctx, Z, seed + 1), torso: torso(ctx, Z, seed + 2), armL: arm(ctx, Z, -1, seed + 3), armR: arm(ctx, Z, 1, seed + 4), legL: leg(ctx, Z, -1, seed + 5), legR: leg(ctx, Z, 1, seed + 6) };
  cache.set(Z.key, p);
  return p;
}
export function disposeZombieCache() {
  cache.forEach((p) => (Object.values(p) as Part[][]).forEach((ps) => ps.forEach((x) => x.geo.dispose())));
  cache.clear();
}

export function randomGait(rnd: Rng, wave: number, boss: boolean): Gait {
  if (boss) return { kind: "shamble", cadence: 3.6, legAmp: 0.55, armPose: 1.15, armSwing: 0.2, lean: 0.12, bob: 0.03, sway: 0.05, headLag: 0.15, speedMul: 1, dragSide: 0, twitch: 0.2, crouch: 0, phase: rnd.range(0, 6.28) };
  const u = rnd.next();
  const kind: GaitKind = u < 0.3 ? "shamble" : u < 0.5 ? "lurch" : u < 0.65 ? "limp" : u < 0.77 ? "crawl" : u < 0.9 ? "stagger" : (wave >= 2 ? "sprint" : "shamble");
  const g: Gait = { kind, cadence: 5.5, legAmp: 0.6, armPose: 1.3, armSwing: 0.18, lean: 0.18, bob: 0.04, sway: 0.04, headLag: 0.2, speedMul: 1, dragSide: 0, twitch: rnd.range(0.4, 1), crouch: 0, phase: rnd.range(0, 6.28) };
  switch (kind) {
    case "shamble": g.cadence = rnd.range(4.4, 5.2); g.legAmp = 0.45; g.armPose = rnd.range(1.15, 1.5); g.dragSide = rnd.chance(0.5) ? 1 : -1; g.speedMul = 0.92; break;
    case "lurch": g.cadence = rnd.range(3.4, 4.2); g.legAmp = 0.7; g.armPose = rnd.range(0.35, 0.8); g.lean = 0.3; g.bob = 0.07; g.sway = 0.1; g.speedMul = 1.0; break;
    case "limp": g.cadence = rnd.range(4.6, 5.4); g.legAmp = 0.55; g.armPose = rnd.range(0.9, 1.4); g.dragSide = rnd.chance(0.5) ? 1 : -1; g.bob = 0.08; g.sway = 0.08; g.speedMul = 0.85; break;
    case "crawl": g.cadence = rnd.range(5.5, 6.5); g.legAmp = 0.5; g.armPose = 1.9; g.armSwing = 0.5; g.lean = 1.15; g.crouch = 0.3; g.bob = 0.02; g.speedMul = 0.8; break;
    case "stagger": g.cadence = rnd.range(4.8, 5.8); g.legAmp = 0.5; g.armPose = rnd.range(0.2, 1.0); g.sway = 0.22; g.lean = 0.12; g.speedMul = 0.95; g.headLag = 0.4; break;
    case "sprint": g.cadence = rnd.range(6.5, 7.5); g.legAmp = 0.95; g.armPose = 0.55; g.armSwing = 0.9; g.lean = 0.4; g.bob = 0.06; g.speedMul = 1.12; break;
  }
  return g;
}
