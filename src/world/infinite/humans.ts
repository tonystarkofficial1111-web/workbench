// @ts-nocheck
import type { Ctx } from "./types";
import { MB } from "./mb";
import { Rng } from "./rng";

/**
 * Detailed people for the Infinite world: rounded limbs and heads, tunics, belts, boots, hair, and real armour pieces (breastplate,
 * pauldrons, greaves, helm with plume), a kite shield, spear, crossbow and swords. Every body part is a merged mesh hanging from a pivot,
 * so walking and fighting animate whole limbs. Models stand on y = 0, face +z, and are about 1.0 tall (the original soldiers were boxes).
 *
 * World height levels (hips at 0.40): feet 0, knee .21, hips .40, chest .66, shoulders .74, neck .78, head centre .89.
 */
export interface Part { geo: any; mat: any; tier: number; shadow: boolean }
export interface Look {
  skin: number; hair: number; hairStyle: number; tunic: number; trim: number; pants: number; boots: number;
  beard: boolean; build: number; crown?: boolean; cape?: boolean; key: string;
}
export interface HumanParts { head: Part[]; torso: Part[]; armL: Part[]; armR: Part[]; legL: Part[]; legR: Part[] }

export const SKINS = [0xf0c8a0, 0xe2b48c, 0xc99870, 0xa87858, 0x7d5638, 0xf5d5b5];
export const HAIRS = [0x2b1d12, 0x5a3a1e, 0x8a5a2a, 0xc9a24a, 0x1a1a1e, 0x8a3a22, 0xb8b0a0];
export const STEEL = 0xb8bec8, STEEL_D = 0x8a909a, BRASS = 0xc9a24a, LEATHER = 0x5a3d26, LEATHER_D = 0x3a281a;

export function partsOf(mb: MB, ctx: Ctx, shadow = true): Part[] {
  const root = mb.build(ctx.mats, shadow);
  const out: Part[] = [];
  root.children.forEach((m: any) => out.push({ geo: m.geometry, mat: m.material, tier: m.userData.tier || 0, shadow: m.castShadow }));
  return out;
}

export function randomLook(rnd: Rng, tunic: number, o: { crown?: boolean; cape?: boolean } = {}): Look {
  const skin = rnd.pick(SKINS), hair = rnd.pick(HAIRS), hairStyle = rnd.int(0, 3), beard = rnd.chance(0.28);
  const pants = rnd.pick([0x4a4a52, 0x5a4a38, 0x3f4a5a, 0x4e3f35]);
  const boots = rnd.pick([0x3a281a, 0x2e2418, 0x4a3422]);
  const trim = rnd.pick([0xd8c070, 0xe0e0e8, 0xb0382a, 0x2f7a4a]);
  const build = rnd.range(0.94, 1.08);
  const key = [skin, hair, hairStyle, +beard, Math.round(build * 20), tunic, trim, pants, boots, o.crown ? 1 : 0].join("-");
  return { skin, hair, hairStyle, tunic, trim, pants, boots, beard, build, crown: o.crown, cape: o.cape, key };
}

const cache = new Map<string, HumanParts>();

function legMB(ctx: Ctx, L: Look, seed: number) {
  const mb = new MB(ctx.T, seed);
  mb.ao = { y0: -0.4, h: 0.5, k: 0.16 };
  mb.taper(L.pants, 0.076, 0.06, 0, 0, 0, 0, -0.21, 0.01, 7);
  mb.taper(L.pants, 0.06, 0.05, 0, -0.21, 0.01, 0, -0.32, 0, 7);
  mb.taper(L.boots, 0.058, 0.052, 0, -0.27, 0, 0, -0.385, 0, 7);                       // boot shaft
  mb.torus(LEATHER_D, 0.058, 0.012, 0, -0.27, 0, Math.PI / 2, 0, 0, 4, 8, { tier: 1 });  // boot cuff
  mb.box(L.boots, 0.1, 0.06, 0.19, 0, -0.375, 0.045);
  mb.box(0x2a2018, 0.104, 0.022, 0.195, 0, -0.395, 0.045, 0, 0, 0, { noAO: true });
  mb.box(L.boots, 0.085, 0.04, 0.07, 0, -0.36, 0.12, 0, 0, 0, { tier: 1 });            // toe cap
  mb.blob(L.pants, 0.045, 0, -0.205, 0.045, 1, 0.8, 0.8, 0, 0, { tier: 1 });          // knee patch
  return partsOf(mb, ctx);
}

function torsoMB(ctx: Ctx, L: Look, seed: number) {
  const T = ctx.T, mb = new MB(T, seed);
  mb.ao = { y0: 0, h: 0.5, k: 0.14 };
  const tun = L.tunic;
  mb.add(new T.CylinderGeometry(0.128 * L.build, 0.118 * L.build, 0.2, 10), tun, 0, 0.1, 0, 0, 0, 0, 1.12, 1, 0.8);        // abdomen
  mb.add(new T.CylinderGeometry(0.168 * L.build, 0.135 * L.build, 0.2, 10), tun, 0, 0.27, 0, 0, 0, 0, 1.16, 1, 0.82);       // chest
  mb.box(tun, 0.4 * L.build, 0.06, 0.17, 0, 0.35, 0, 0, 0, 0);                                                            // shoulder yoke
  mb.cyl(L.skin, 0.043, 0.05, 0.07, 0, 0.4, 0, 8);                                                                         // neck
  mb.cyl(0xe8e0d0, 0.075, 0.085, 0.03, 0, 0.38, 0.02, 8, 0, 0, 0, { tier: 1 });                                            // collar
  mb.add(new T.TorusGeometry(0.128 * L.build, 0.02, 5, 14), LEATHER, 0, 0.02, 0, Math.PI / 2, 0, 0, 1.12, 0.8, 1);          // belt
  mb.box(BRASS, 0.05, 0.045, 0.02, 0, 0.02, 0.105 * L.build, 0, 0, 0, { mat: "metal", noAO: true });                       // buckle
  mb.add(new T.CylinderGeometry(0.135 * L.build, 0.18 * L.build, 0.16, 10, 1, true), tun, 0, -0.07, 0, 0, 0, 0, 1.1, 1, 0.85, { mat: "litDS", tier: 1 }); // tunic skirt
  // sash and chest emblem
  mb.beam(L.trim, 0.03, -0.12, 0.38, 0.09, 0.1, 0.06, 0.1, { tier: 1 });
  mb.box(L.trim, 0.06, 0.06, 0.012, 0, 0.27, 0.125 * L.build, 0, 0, Math.PI / 4, { tier: 2, noAO: true });
  mb.box(LEATHER_D, 0.07, 0.08, 0.04, 0.15 * L.build, 0.0, 0.0, 0, 0, 0.1, { tier: 2 });                                     // pouch
  if (L.cape) { // royal cloak that streams behind
    mb.add(new T.PlaneGeometry(0.34, 0.62, 3, 4), 0xa8222a, 0, 0.1, -0.1, 0.12, 0, 0, 1, 1, 1,
      { mat: "swayDS", tier: 0, sway: 1.2, swayY0: -0.2, swayH: 0.6, swayInv: true, noAO: true });
    mb.box(BRASS, 0.34, 0.03, 0.03, 0, 0.36, -0.07, 0, 0, 0, { mat: "metal", tier: 1 });
  }
  return partsOf(mb, ctx);
}

function headMB(ctx: Ctx, L: Look, seed: number) {
  const T = ctx.T, mb = new MB(T, seed);
  mb.ao = { y0: 0.2, h: 0.3, k: 0.0 }; mb.jitter = 0.02;
  mb.sphere(L.skin, 0.103, 0, 0.14, 0, 1, 1.07, 1, 10, 8);                                  // skull
  mb.box(L.skin, 0.07, 0.05, 0.05, 0, 0.075, 0.07);                                         // jaw
  mb.box(L.skin, 0.025, 0.04, 0.03, 0, 0.13, 0.108, 0, 0, 0, { tier: 1 });                 // nose
  for (const sg of [-1, 1]) {
    mb.box(0x1a1410, 0.022, 0.026, 0.01, sg * 0.04, 0.16, 0.098, 0, 0, 0, { noAO: true });  // eyes
    mb.box(L.hair, 0.04, 0.011, 0.012, sg * 0.04, 0.188, 0.098, 0, 0, sg * 0.15, { tier: 1, noAO: true }); // brows
    mb.sphere(L.skin, 0.022, sg * 0.1, 0.14, 0, 0.6, 1, 1, 5, 4, { tier: 2 });              // ears
  }
  mb.box(0xb86a5a, 0.04, 0.008, 0.01, 0, 0.098, 0.1, 0, 0, 0, { tier: 1, noAO: true });   // mouth
  const hs = L.hairStyle;
  if (hs !== 2) { // hair cap
    mb.dome(L.hair, 0.111, 0, 0.145, -0.004, 1, 1.05, 1.02, 9, 0, 0, 0, { noAO: true });
    if (hs === 0) mb.box(L.hair, 0.15, 0.04, 0.03, 0, 0.215, 0.085, 0.3, 0, 0, { tier: 1, noAO: true }); // fringe
  }
  if (hs === 1) mb.taper(L.hair, 0.09, 0.05, 0, 0.17, -0.07, 0, 0.0, -0.1, 7, { tier: 1, noAO: true });   // long hair
  if (hs === 3) { mb.sphere(L.hair, 0.035, 0, 0.17, -0.12, 1, 1, 1, 6, 5, { tier: 1, noAO: true }); mb.taper(L.hair, 0.03, 0.012, 0, 0.16, -0.13, 0, 0.04, -0.16, 5, { tier: 1, noAO: true }); }
  if (L.beard) mb.cone(L.hair, 0.07, 0.12, 0, 0.04, 0.06, 6, Math.PI, 0, 0, { tier: 1, noAO: true });
  if (L.crown) {
    mb.cyl(BRASS, 0.108, 0.108, 0.04, 0, 0.25, 0, 10, 0, 0, 0, { mat: "metal", noAO: true });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mb.cone(BRASS, 0.018, 0.06, Math.cos(a) * 0.105, 0.3, Math.sin(a) * 0.105, 4, 0, 0, 0, { mat: "metal", noAO: true }); }
    mb.sphere(0xd8283a, 0.022, 0, 0.256, 0.109, 1, 1, 1, 5, 4, { tier: 1, noAO: true });
  }
  return partsOf(mb, ctx);
}

function armMB(ctx: Ctx, L: Look, side: number, seed: number) {
  const mb = new MB(ctx.T, seed);
  mb.ao = { y0: -0.34, h: 0.4, k: 0.12 };
  const tun = L.tunic;
  mb.taper(tun, 0.058, 0.048, 0, 0, 0, 0, -0.17, 0.005, 7);                         // upper arm (sleeve)
  mb.sphere(tun, 0.06, 0, 0.0, 0, 1, 1, 1, 7, 5);                                    // shoulder
  mb.taper(L.skin, 0.044, 0.038, 0, -0.17, 0.005, 0, -0.3, 0.02, 7);                  // forearm
  mb.cyl(LEATHER, 0.047, 0.042, 0.07, 0, -0.26, 0.015, 7, 0, 0, 0, { tier: 1 });       // bracer
  mb.sphere(L.skin, 0.043, 0, -0.325, 0.025, 1, 1.1, 1.05, 7, 5);                     // hand
  mb.box(L.skin, 0.02, 0.03, 0.04, side * -0.03, -0.31, 0.04, 0, 0, 0, { tier: 2 }); // thumb
  mb.torus(L.trim, 0.054, 0.01, 0, -0.16, 0, Math.PI / 2, 0, 0, 4, 8, { tier: 1 });  // sleeve band
  return partsOf(mb, ctx);
}

export function humanParts(ctx: Ctx, L: Look): HumanParts {
  let p = cache.get(L.key);
  if (p) return p;
  const seed = Math.abs(L.key.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  p = { head: headMB(ctx, L, seed + 1), torso: torsoMB(ctx, L, seed + 2), armL: armMB(ctx, L, -1, seed + 3), armR: armMB(ctx, L, 1, seed + 4), legL: legMB(ctx, L, seed + 5), legR: legMB(ctx, L, seed + 6) };
  cache.set(L.key, p);
  return p;
}
export function disposeHumanCache() {
  cache.forEach((p) => (Object.values(p) as Part[][]).forEach((ps) => ps.forEach((x) => x.geo.dispose())));
  cache.clear();
}

/** Meshes for a list of parts (the geometry is shared between everyone with the same look). */
export function instantiate(ctx: Ctx, parts: Part[], tierRoots?: any[]): any {
  const T = ctx.T, g = new T.Group();
  parts.forEach((p) => {
    const m = new T.Mesh(p.geo, p.mat);
    m.castShadow = p.shadow; m.receiveShadow = true; m.userData.tier = p.tier;
    m.visible = p.tier <= ctx.gfx.f.tier;
    g.add(m);
  });
  if (tierRoots) tierRoots.push(g);
  return g;
}

/** Show or hide detail tiers of a group of meshes made by instantiate(). */
export function setTier(g: any, tier: number) {
  g.traverse((m: any) => { if (m.isMesh && m.userData.tier != null) m.visible = m.userData.tier <= tier; });
}

// ------------------------------------------------------------------------------------------------------------ equipment
function steelOpts(extra: any = {}) { return { mat: "metal", ...extra }; }

/** Plate armour: breastplate + backplate, gorget, tassets, pauldrons, bracers, greaves, knee cops and a plumed helm. */
export function armourSet(ctx: Ctx, L: Look, plume: number) {
  const T = ctx.T;
  const torso = new MB(T, 501), head = new MB(T, 502), armL = new MB(T, 503), armR = new MB(T, 504), legL = new MB(T, 505), legR = new MB(T, 506);
  [torso, head, armL, armR, legL, legR].forEach((m) => { m.ao = { y0: -0.4, h: 0.7, k: 0.1 }; m.jitter = 0.03; });
  // breastplate (front shell) and backplate: half lathes with a centre ridge, rim and rivets
  const prof: Array<[number, number]> = [[0.138, 0.0], [0.17, 0.09], [0.178, 0.19], [0.15, 0.3], [0.1, 0.36]];
  torso.lathe(STEEL, prof, 0, 0.0, 0.0, 12, 1.0, 1, 0.78, steelOpts(), -Math.PI * 0.62, Math.PI * 1.24, 0);                          // front shell (round +z)
  torso.lathe(STEEL_D, prof, 0, 0.0, -0.005, 12, 1.0, 1, 0.74, steelOpts(), -Math.PI * 0.55, Math.PI * 1.1, Math.PI);               // back shell
  torso.box(STEEL, 0.02, 0.3, 0.02, 0, 0.19, 0.138, 0.1, 0, 0, steelOpts({ tier: 1 }));                                               // centre ridge
  torso.torus(BRASS, 0.152, 0.012, 0, 0.35, 0.0, Math.PI / 2, 0, 0, 4, 14, steelOpts({ tier: 1 }));                                    // neck rim
  for (let i = 0; i < 4; i++) torso.sphere(BRASS, 0.011, (i % 2 ? 0.07 : -0.07), 0.12 + (i >> 1) * 0.14, 0.136, 1, 1, 1, 4, 3, steelOpts({ tier: 2 }));
  torso.cyl(STEEL, 0.1, 0.11, 0.06, 0, 0.4, 0, 10, 0, 0, 0, steelOpts({ tier: 0 }));                                                   // gorget
  for (let i = -1; i <= 1; i++) torso.box(STEEL_D, 0.075, 0.12, 0.02, i * 0.075, -0.08, 0.1 - Math.abs(i) * 0.02, 0.1, i * 0.25, 0, steelOpts({ tier: 1 })); // tassets
  // helm: dome with a brim, visor slit, crest and plume
  head.dome(STEEL, 0.122, 0, 0.14, 0, 1, 1.08, 1.04, 10, 0, 0, 0, steelOpts());
  head.cyl(STEEL, 0.126, 0.127, 0.06, 0, 0.12, 0, 10, 0, 0, 0, steelOpts());
  head.box(0x15161a, 0.1, 0.016, 0.02, 0, 0.145, 0.118, 0, 0, 0, { noAO: true });                                                      // visor slit
  head.box(STEEL_D, 0.024, 0.05, 0.1, 0, 0.12, 0.118, 0, 0, 0, steelOpts({ tier: 1 }));                                               // nasal guard
  head.box(STEEL_D, 0.03, 0.06, 0.26, 0, 0.275, 0, 0, 0, 0, steelOpts({ tier: 1 }));                                                  // crest
  head.cone(plume, 0.05, 0.22, 0, 0.33, -0.14, 6, -0.9, 0, 0, { mat: "swayDS", tier: 1, sway: 1.4, swayY0: 0.2, swayH: 0.2, noAO: true });   // plume
  head.torus(BRASS, 0.12, 0.007, 0, 0.1, 0, Math.PI / 2, 0, 0, 4, 12, steelOpts({ tier: 2 }));
  // pauldrons (they swing with the arms), vambraces, gauntlets
  for (const [m, sg] of [[armL, -1], [armR, 1]] as any) {
    m.dome(STEEL, 0.092, sg * 0.02, 0.02, 0, 1, 0.85, 1, 8, 0, 0, sg * 0.35, steelOpts());
    m.dome(STEEL_D, 0.082, sg * 0.04, -0.03, 0, 1, 0.7, 1, 8, 0, 0, sg * 0.5, steelOpts({ tier: 1 }));
    m.cyl(STEEL, 0.054, 0.046, 0.12, 0, -0.24, 0.015, 8, 0, 0, 0, steelOpts({ tier: 1 }));
    m.sphere(STEEL_D, 0.05, 0, -0.325, 0.025, 1, 1.05, 1.05, 7, 5, steelOpts({ tier: 1 }));
    m.torus(BRASS, 0.056, 0.008, 0, -0.18, 0, Math.PI / 2, 0, 0, 4, 10, steelOpts({ tier: 2 }));
  }
  // greaves, knee cops, sabatons
  for (const m of [legL, legR]) {
    m.taper(STEEL, 0.058, 0.05, 0, -0.2, 0.01, 0, -0.34, 0.0, 8, steelOpts());
    m.sphere(STEEL, 0.06, 0, -0.205, 0.045, 1, 0.9, 0.8, 7, 5, steelOpts({ tier: 1 }));
    m.box(STEEL_D, 0.1, 0.05, 0.13, 0, -0.372, 0.07, 0, 0, 0, steelOpts({ tier: 1 }));
    m.cyl(STEEL_D, 0.066, 0.07, 0.07, 0, -0.1, 0, 8, 0, 0, 0, steelOpts({ tier: 1 }));   // cuisse
  }
  return { torso: partsOf(torso, ctx), head: partsOf(head, ctx), armL: partsOf(armL, ctx), armR: partsOf(armR, ctx), legL: partsOf(legL, ctx), legR: partsOf(legR, ctx) };
}

/** Kite shield with a boss, rim and a heraldic cross in the faction colour. Faces +z; the face plate is at z = 0. */
export function shieldParts(ctx: Ctx, color: number, trim: number) {
  const mb = new MB(ctx.T, 601);
  mb.ao = { y0: -0.3, h: 0.7, k: 0.0 }; mb.jitter = 0.03;
  const kite: Array<[number, number]> = [[-0.12, 0.17], [0.12, 0.17], [0.13, 0.04], [0.09, -0.1], [0, -0.22], [-0.09, -0.1], [-0.13, 0.04]];
  mb.plate(color, kite, 0.03, 0, 0, 0, 0, 0, 0, 0.012, { noAO: true });
  mb.plate(STEEL_D, kite.map((p) => [p[0] * 1.08, p[1] * 1.06 - (p[1] < 0 ? 0.005 : -0.003)] as [number, number]), 0.022, 0, 0, -0.012, 0, 0, 0, 0.004, steelOpts({ noAO: true }));
  mb.box(trim, 0.035, 0.34, 0.012, 0, -0.01, 0.026, 0, 0, 0, { tier: 1, noAO: true });
  mb.box(trim, 0.2, 0.035, 0.012, 0, 0.07, 0.026, 0, 0, 0, { tier: 1, noAO: true });
  mb.dome(STEEL, 0.05, 0, 0.0, 0.04, 1, 0.7, 1, 8, Math.PI / 2, 0, 0, steelOpts());
  mb.torus(BRASS, 0.12, 0.008, 0, 0.04, 0.02, 0, 0, 0, 4, 10, steelOpts({ tier: 2 }));
  return partsOf(mb, ctx);
}

export function swordParts(ctx: Ctx, big: boolean) {
  const mb = new MB(ctx.T, big ? 612 : 611), k = big ? 1.35 : 1;
  mb.ao = { y0: 0, h: 1, k: 0 }; mb.jitter = 0.02;
  // blade points along +z from the hand
  mb.box(0xdfe3ea, 0.034 * k, 0.012 * k, 0.5 * k, 0, 0, 0.3 * k, 0, 0, 0, steelOpts({ noAO: true }));
  mb.box(0xa8aeb8, 0.012 * k, 0.014 * k, 0.46 * k, 0, 0, 0.3 * k, 0, 0, 0, steelOpts({ tier: 1, noAO: true }));
  mb.cone(0xdfe3ea, 0.017 * k, 0.07 * k, 0, 0, 0.58 * k, 4, Math.PI / 2, 0, Math.PI / 4, steelOpts({ noAO: true }));
  mb.box(BRASS, 0.04 * k, 0.12 * k, 0.025, 0, 0, 0.04 * k, 0, 0, 0, steelOpts({ noAO: true }));            // crossguard
  mb.cyl(LEATHER_D, 0.017, 0.017, 0.1 * k, 0, 0, -0.03 * k, 6, Math.PI / 2, 0, 0, { noAO: true });
  mb.sphere(BRASS, 0.026, 0, 0, -0.09 * k, 1, 1, 1, 6, 4, steelOpts({ noAO: true }));
  return partsOf(mb, ctx);
}

export function spearParts(ctx: Ctx, pennant: number) {
  const mb = new MB(ctx.T, 621);
  mb.ao = { y0: 0, h: 1, k: 0 }; mb.jitter = 0.02;
  mb.pole(0x7a5a38, 0.015, 0, 0, -0.5, 0, 0, 0.75, 6, { noAO: true });
  mb.pole(LEATHER_D, 0.018, 0, 0, -0.04, 0, 0, 0.06, 6, { noAO: true });
  mb.cone(0xdfe3ea, 0.034, 0.17, 0, 0, 0.84, 4, Math.PI / 2, 0, Math.PI / 4, steelOpts({ noAO: true }));
  mb.torus(BRASS, 0.02, 0.006, 0, 0, 0.75, 0, 0, 0, 4, 8, steelOpts({ tier: 1, noAO: true }));
  mb.add(new ctx.T.PlaneGeometry(0.2, 0.09, 4, 1), pennant, 0, 0, 0, 0, 0, 0, 1, 1, 1, { mat: "swayDS", tier: 1, sway: 1.5, swayY0: 0, swayH: 0.2, noAO: true });
  return partsOf(mb, ctx);
}

/** Crossbow. Part positions (z .1 / .15 / .22) match the engine's recoil effect, which moves stock, prod and string. */
export function crossbowParts(ctx: Ctx) {
  const T = ctx.T;
  const stock = new MB(T, 631), limb = new MB(T, 632), str = new MB(T, 633);
  [stock, limb, str].forEach((m) => { m.ao = { y0: 0, h: 1, k: 0 }; m.jitter = 0.02; });
  stock.box(0x6b4a2c, 0.05, 0.06, 0.34, 0, 0, 0, 0, 0, 0, { noAO: true });
  stock.box(0x4a321c, 0.045, 0.085, 0.12, 0, -0.03, -0.1, 0.25, 0, 0, { noAO: true });
  stock.box(STEEL_D, 0.03, 0.02, 0.1, 0, 0.04, 0.02, 0, 0, 0, steelOpts({ tier: 1, noAO: true }));
  stock.box(0x5a5a62, 0.07, 0.05, 0.015, 0, 0, 0.17, 0, 0, 0, steelOpts({ tier: 1, noAO: true }));
  limb.add(new T.TorusGeometry(0.2, 0.014, 4, 10, Math.PI), 0x553311, 0, 0, 0, 0, 0, 0, 1, 1, 1, { noAO: true });
  limb.box(STEEL_D, 0.46, 0.012, 0.012, 0, 0.0, 0.2, 0, 0, 0, steelOpts({ tier: 1, noAO: true }));
  str.box(0xe8e4d6, 0.4, 0.007, 0.007, 0, 0, 0, 0, 0, 0, { noAO: true });
  str.box(0xdfe3ea, 0.012, 0.012, 0.26, 0, 0.034, -0.1, 0, 0, 0, steelOpts({ tier: 1, noAO: true }));   // bolt
  return { stock: partsOf(stock, ctx), limb: partsOf(limb, ctx), string: partsOf(str, ctx) };
}
