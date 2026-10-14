// @ts-nocheck
import type { Ctx } from "./types";
import { MB } from "./mb";
import { Rng } from "./rng";
import { PAL, shade, stoneBox, quoins, bellRoof, doorAt, lantern, barrel, roundShield, vines, ivy, bush, bracket } from "./props";
import { track, attachDyn, eachWall, type Dyn } from "./buildings";
import { humanParts, randomLook, armourSet, crossbowParts, instantiate, setTier } from "./humans";

/**
 * Walls, towers, torches and traps (Infinite world only). The tower is the showpiece: a stone keep with a door, arrow slits and quoins,
 * a timber lookout with shields on the parapet, a tiled roof, lanterns, a bell and a flag that streams with the wind; an archer
 * appears on the deck while a helper manns it. The contracts of the engine's own models are kept (see the notes on each builder).
 */
const PI = Math.PI;

interface Template { parts: Array<{ geo: any; mat: any; tier: number; cast: boolean; recv: boolean; noCast: boolean }>; dyn: Dyn[] }

export function installDefenses(ctx: Ctx) {
  const { env, T } = ctx;
  const I = env.iife;
  const cache = new Map<string, Template>();
  const faction = () => { try { return I.pf(); } catch { return null; } };

  /** Meshes of a template: the geometry is shared between every copy, so a hundred walls are a hundred small groups, not a hundred geometries. */
  function instance(key: string, build: (ghost: boolean) => { mb: MB; dyn: Dyn[] }, ghost = false) {
    const ck = ghost ? key + "!ghost" : key;
    let t = cache.get(ck);
    if (!t) {
      const r = build(ghost);
      const root = r.mb.build(ctx.mats, true);
      t = { parts: root.children.map((m: any) => ({ geo: m.geometry, mat: m.material, tier: m.userData.tier || 0, cast: m.castShadow, recv: m.receiveShadow, noCast: !!m.userData.noShadowCast })), dyn: r.dyn };
      cache.set(ck, t);
    }
    const g = new T.Group(), tiers: any[][] = [[], [], []];
    for (const p of t.parts) {
      const m = new T.Mesh(p.geo, p.mat);
      m.castShadow = p.cast; m.receiveShadow = p.recv; m.userData.tier = p.tier; m.userData.noShadowCast = p.noCast;
      m.visible = p.tier <= ctx.gfx.f.tier;
      g.add(m); tiers[p.tier]!.push(m);
    }
    g.userData.tiers = tiers;
    track(ctx, g, g);
    return { g, dyn: t.dyn };
  }

  // ---------------------------------------------------------------------------------------------------------------- wall
  /** Local x is the long side (WL), z the thickness (WT). Origin on the ground at the centre of the segment. */
  function buildWall(variant: number, ghost = false) {
    const rnd = new Rng(700 + variant * 53), mb = new MB(T, 701 + variant);
    mb.ghost = ghost;
    const WL = I.WL, WT = I.WT, H = 1.44;
    mb.ao = { y0: 0, h: 1.2, k: 0.26 };
    stoneBox(mb, rnd, WL, 0.16, WT + 0.16, 0, 0, 0, { tier: 1, faces: 5 });
    stoneBox(mb, rnd, WL, H - 0.16, WT, 0, 0.16, 0, { tier: 1, faces: 15 });
    mb.box(PAL.stoneD, WL + 0.02, 0.12, WT + 0.14, 0, H + 0.06, 0);                                              // coping
    mb.box(PAL.stone[2], WL + 0.04, 0.04, WT + 0.18, 0, H + 0.14, 0, 0, 0, 0, { tier: 1 });
    for (const k of [-0.82, 0, 0.82]) {
      mb.bar(PAL.stone[0], 0.52, 0.34, WT * 0.9, k, H + 0.12, 0, 0, { jit: 0.06 });
      mb.box(PAL.stoneL, 0.58, 0.06, WT + 0.06, k, H + 0.49, 0, 0, 0, 0, { tier: 1 });
      for (const sg of [-1, 1]) mb.quad(PAL.stone[3], 0.46, 0.3, k, H + 0.3, sg * (WT * 0.45 + 0.008), 0, sg > 0 ? 0 : PI, 0, { tier: 1, jit: 0.1 });
    }
    for (const sg of [-1, 1]) { // arrow loops on both faces
      mb.push(0, 0, sg * (WT / 2 + 0.006), sg > 0 ? 0 : PI);
      mb.box(0x06070a, 0.08, 0.42, 0.04, 0, 0.82, 0.012, 0, 0, 0, { tier: 1, noAO: true, jit: 0 });
      mb.box(PAL.stoneL, 0.07, 0.52, 0.05, -0.1, 0.82, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.07, 0.52, 0.05, 0.1, 0.82, 0.02, 0, 0, 0, { tier: 1 });
      mb.box(PAL.stoneL, 0.27, 0.07, 0.05, 0, 1.1, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.27, 0.06, 0.06, 0, 0.55, 0.025, 0, 0, 0, { tier: 1 });
      mb.pop();
    }
    ivy(mb, rnd, rnd.range(-0.7, 0.7), 0.2, WT / 2 + 0.01, 0.9, 0.9, { n: 5 + (variant % 3) * 3 });
    ivy(mb, rnd, rnd.range(-0.7, 0.7), 0.2, -WT / 2 - 0.01, 0.9, 0.9, { n: 5 });
    if (variant % 2) vines(mb, rnd, rnd.range(-0.6, 0.6), H + 0.1, WT / 2 + 0.03, 3, 0.25, 0.3, 0.8, { tier: 1 });
    mb.blob(PAL.moss[0], 0.12, rnd.range(-0.9, 0.9), 0.02, WT / 2 + 0.2, 1.5, 0.4, 1, 0, 0, { tier: 2 });
    return { mb, dyn: [] as Dyn[] };
  }

  // ---------------------------------------------------------------------------------------------------------------- tower
  function slit(mb: MB, x: number, y: number, z: number, big = false) {
    const h = big ? 0.62 : 0.5;
    mb.box(0x06070a, 0.09, h, 0.05, x, y, z + 0.012, 0, 0, 0, { tier: 0, noAO: true, jit: 0 });
    mb.box(PAL.stoneL, 0.08, h + 0.1, 0.07, x - 0.11, y, z + 0.025, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.08, h + 0.1, 0.07, x + 0.11, y, z + 0.025, 0, 0, 0, { tier: 1 });
    mb.box(PAL.stoneL, 0.32, 0.08, 0.07, x, y + h / 2 + 0.05, z + 0.025, 0, 0, 0, { tier: 1 }); mb.box(PAL.stone[2], 0.34, 0.06, 0.1, x, y - h / 2 - 0.04, z + 0.035, 0, 0, 0, { tier: 1 });
  }

  function buildTower(ghost = false) {
    const f = faction(), main = f ? f.color : 0x4f8fd6, accent = 0xe8c04a;
    const rnd = new Rng(555), mb = new MB(T, 556), dyn: Dyn[] = [];
    mb.ghost = ghost;
    mb.ao = { y0: 0, h: 1.1, k: 0.26 };
    const WD = PAL.wood[0], WD2 = PAL.wood[1], DECK = 4.0, STONE_TOP = 1.96;
    // stone foot: plinth, body, string course
    stoneBox(mb, rnd, 2.62, 0.22, 2.62, 0, 0, 0, { tier: 1 });
    stoneBox(mb, rnd, 2.2, STONE_TOP - 0.22, 2.2, 0, 0.22, 0, { tier: 1 });
    mb.box(PAL.stoneD, 2.44, 0.14, 2.44, 0, STONE_TOP + 0.07, 0);
    mb.box(PAL.stone[2], 2.5, 0.05, 2.5, 0, STONE_TOP + 0.165, 0, 0, 0, 0, { tier: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) quoins(mb, rnd, sx * 1.1, sz * 1.1, 0.22, STONE_TOP, 0.13, 2);
    // faces: door, slits, moss
    eachWall(mb, 2.2, 2.2, (i, fw, fz) => {
      if (i === 0) {
        doorAt(mb, rnd, 0, fz, { w: 0.66, h: 1.24, y0: 0.22, step: false });
        slit(mb, -0.62, 1.5, fz, true); slit(mb, 0.62, 1.5, fz, true);
        bracket(mb, 0.62, 1.2, fz + 0.01, 0.2); lantern(mb, 0.62, 1.04, fz + 0.2, { tier: 1 });
        bracket(mb, -0.62, 1.2, fz + 0.01, 0.2); lantern(mb, -0.62, 1.04, fz + 0.2, { tier: 1 });
        dyn.push({ kind: "halo", x: 0.62, y: 1.04, z: fz + 0.2, o: { size: 0.8, color: 0xffc070, flicker: 0.06 } });
        dyn.push({ kind: "halo", x: -0.62, y: 1.04, z: fz + 0.2, o: { size: 0.8, color: 0xffc070, flicker: 0.06 } });
      } else { slit(mb, 0, 1.3, fz); if (i === 2) slit(mb, 0, 0.55, fz); }
      if (i === 2 || i === 3) ivy(mb, rnd, 0.1, 0.3, fz + 0.01, 1.4, 1.5, { n: 14 });
    });
    mb.bar(PAL.stone[1], 1.1, 0.11, 0.3, 0, 0, 1.46, 0, { tier: 1 });
    vines(mb, rnd, 0, STONE_TOP + 0.02, 1.2, 4, 0.9, 0.3, 0.8, { tier: 1 });
    vines(mb, rnd, -1.22, STONE_TOP + 0.02, 0, 3, 0.9, 0.3, 0.9, { ry: PI / 2, tier: 1 });
    bush(mb, rnd, -1.5, 0, 1.2, 0.3, { tier: 2, flowers: 4 }); bush(mb, rnd, 1.45, 0, -1.3, 0.3, { tier: 2 });
    // timber lookout: four tapering legs, belts, cross braces
    const cx = [1, 1, -1, -1], cz = [1, -1, 1, -1];
    for (let i = 0; i < 4; i++) {
      mb.beam(WD, 0.27, cx[i]! * 0.98, STONE_TOP + 0.12, cz[i]! * 0.98, cx[i]! * 0.82, DECK - 0.05, cz[i]! * 0.82);
      mb.box(PAL.stone[1], 0.44, 0.1, 0.44, cx[i]! * 0.98, STONE_TOP + 0.21, cz[i]! * 0.98, 0, 0, 0, { tier: 1 });
      mb.box(PAL.iron, 0.3, 0.05, 0.3, cx[i]! * 0.9, 2.6, cz[i]! * 0.9, 0, 0, 0, { tier: 2, mat: "metal" });
    }
    for (const s of [-1, 1]) {
      mb.box(WD2, 1.95, 0.13, 0.13, 0, 2.85, s * 0.89); mb.box(WD2, 0.13, 0.13, 1.95, s * 0.89, 2.85, 0);
      mb.beam(WD2, 0.11, -0.9, 2.2, s * 0.9, 0.82, 3.72, s * 0.82, { tier: 1 }); mb.beam(WD2, 0.11, 0.9, 2.2, s * 0.9, -0.82, 3.72, s * 0.82, { tier: 1 });
      mb.beam(WD2, 0.11, s * 0.9, 2.2, -0.9, s * 0.82, 3.72, 0.82, { tier: 1 }); mb.beam(WD2, 0.11, s * 0.9, 2.2, 0.9, s * 0.82, 3.72, -0.82, { tier: 1 });
    }
    // a hoist on the back: beam, rope and bucket
    mb.beam(WD2, 0.1, 0, 3.75, -0.85, 0, 3.95, -1.5, { tier: 2 }); mb.beam(WD2, 0.07, 0, 3.3, -0.85, 0, 3.78, -1.35, { tier: 2 });
    mb.box(0x8a7a5a, 0.025, 1.1, 0.025, 0, 3.4, -1.45, 0, 0, 0, { tier: 2 });
    mb.cyl(PAL.wood[0], 0.1, 0.08, 0.16, 0, 2.8, -1.45, 8, 0, 0, 0, { tier: 2 });
    // ladder on the east side
    for (const s of [-1, 1]) mb.box(WD, 0.07, DECK + 0.1, 0.07, 1.4, (DECK + 0.1) / 2, s * 0.3, 0, 0, 0, { tier: 0 });
    for (let k = 0; k < 9; k++) mb.box(WD2, 0.06, 0.06, 0.6, 1.4, 0.4 + k * 0.4, 0, 0, 0, 0, { tier: 1 });
    // deck, corbels, planks
    mb.box(WD2, 2.9, 0.2, 2.9, 0, DECK, 0);
    mb.box(0x2e2118, 2.6, 0.1, 2.6, 0, DECK - 0.14, 0, 0, 0, 0, { tier: 1 });
    for (let k = 0; k < 11; k++) mb.box(PAL.woodD, 0.025, 0.01, 2.9, -1.3 + k * 0.26, DECK + 0.102, 0, 0, 0, 0, { tier: 1, noAO: true });
    for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) {
      mb.beam(WD2, 0.1, k * 0.8, DECK - 0.1, s * 1.45, k * 0.75, DECK - 0.62, s * 0.95, { tier: 1 });
      mb.beam(WD2, 0.1, s * 1.45, DECK - 0.1, k * 0.8, s * 0.95, DECK - 0.62, k * 0.75, { tier: 1 });
    }
    // parapet panels with a gap to shoot through, shields on the outside
    eachWall(mb, 2.9, 2.9, (i, fw, fz) => {
      for (const sg of [-1, 1]) {
        mb.box(WD, 1.0, 0.5, 0.1, sg * 0.92, DECK + 0.35, fz - 0.05);
        mb.box(WD2, 1.1, 0.08, 0.18, sg * 0.92, DECK + 0.64, fz - 0.05);
        for (const yy of [0.27, 0.43]) mb.box(PAL.woodD, 0.98, 0.012, 0.11, sg * 0.92, DECK + yy + 0.2, fz - 0.05, 0, 0, 0, { tier: 1, noAO: true });
        roundShield(mb, sg * 0.92, DECK + 0.38, fz + 0.04, (i + (sg > 0 ? 1 : 0)) % 2 ? accent : main, 0.2, 1);
      }
      mb.box(WD2, 0.8, 0.14, 0.12, 0, DECK + 0.17, fz - 0.05);
    });
    // roof posts and beams
    for (let i = 0; i < 4; i++) { mb.box(WD, 0.17, 1.62, 0.17, cx[i]! * 1.38, DECK + 0.1 + 0.81, cz[i]! * 1.38); mb.box(PAL.iron, 0.22, 0.05, 0.22, cx[i]! * 1.38, DECK + 0.3, cz[i]! * 1.38, 0, 0, 0, { tier: 2, mat: "metal" }); }
    for (const s of [-1, 1]) { mb.box(WD2, 3.0, 0.15, 0.15, 0, 5.62, s * 1.38); mb.box(WD2, 0.15, 0.15, 3.0, s * 1.38, 5.62, 0); }
    for (let k = -2; k <= 2; k++) mb.box(PAL.woodD, 0.08, 0.1, 2.8, k * 0.6, 5.68, 0, 0, 0, 0, { tier: 1 });
    // tiled hip roof, finial and a streaming flag
    bellRoof(mb, rnd, { w: 3.0, y: 5.72, h1: 0.5, h2: 1.15, flare: 0.3, cols: PAL.tile });
    mb.sphere(PAL.brass, 0.1, 0, 7.44, 0, 1, 1, 1, 8, 6, { mat: "metal" });
    mb.box(WD2, 0.05, 0.8, 0.05, 0, 7.8, 0);
    dyn.push({ kind: "flag", x: 0, y: 8.18, z: 0, o: { w: 1.0, h: 0.5, kind: "swallow", main, accent, pattern: "cross" } });
    // hanging lanterns, a bell and the quiver rack
    for (const sx of [-1, 1]) { lantern(mb, sx * 1.4, 5.2, 1.45, { tier: 1, hang: 0.3 }); dyn.push({ kind: "halo", x: sx * 1.4, y: 5.2, z: 1.45, o: { size: 0.9, color: 0xffc070, flicker: 0.06 } }); }
    mb.box(WD2, 0.08, 0.08, 0.7, -0.9, 5.35, -1.1, 0, 0, 0, { tier: 2 });
    mb.cone(PAL.brass, 0.14, 0.22, -0.9, 5.05, -0.8, 9, 0, 0, 0, { tier: 2, mat: "metal" });
    mb.sphere(PAL.brass, 0.045, -0.9, 4.93, -0.8, 1, 1, 1, 6, 4, { tier: 2, mat: "metal" });
    barrel(mb, 0.75, DECK + 0.1, -1.05, { tier: 2, r: 0.2, h: 0.4 });
    for (let k = 0; k < 7; k++) { mb.box(PAL.wood[2], 0.014, 0.5, 0.014, 0.69 + (k % 4) * 0.05, DECK + 0.62, -1.03 + (k > 3 ? 0.07 : 0), 0, 0, (k - 3) * 0.05, { tier: 2 }); mb.box([0xf0f0f0, 0xd8283a][k % 2]!, 0.04, 0.09, 0.012, 0.69 + (k % 4) * 0.05, DECK + 0.84, -1.03 + (k > 3 ? 0.07 : 0), 0, 0, 0, { tier: 2, noAO: true }); }
    crateOnDeck(mb, -0.9, DECK + 0.1, 0.85);
    return { mb, dyn };
  }
  const crateOnDeck = (mb: MB, x: number, y: number, z: number) => {
    mb.push(x, y, z, 0.3);
    mb.bar(PAL.plank[1], 0.38, 0.38, 0.38, 0, 0, 0, 0, { tier: 2 });
    mb.pop();
  };

  /** A static armoured crossbowman for the deck (same body parts as the helpers, posed to aim). */
  function makeGuard(main: number) {
    const g = new T.Group(), tiers: any[] = [];
    const L = randomLook(new Rng(321), main);
    const P = humanParts(ctx, L), A = armourSet(ctx, L, 0xc03030), C = crossbowParts(ctx);
    const piv = (x: number, y: number, z = 0) => { const p = new T.Group(); p.position.set(x, y, z); return p; };
    const body = piv(0, 0.4), headP = piv(0, 0.4), aL = piv(-0.205 * L.build, 0.33), aR = piv(0.205 * L.build, 0.33), lL = piv(-0.085, 0.4), lR = piv(0.085, 0.4);
    body.add(instantiate(ctx, P.torso, tiers), instantiate(ctx, A.torso, tiers)); headP.add(instantiate(ctx, P.head, tiers), instantiate(ctx, A.head, tiers)); body.add(headP);
    aL.add(instantiate(ctx, P.armL, tiers), instantiate(ctx, A.armL, tiers)); aR.add(instantiate(ctx, P.armR, tiers), instantiate(ctx, A.armR, tiers)); body.add(aL, aR);
    lL.add(instantiate(ctx, P.legL, tiers), instantiate(ctx, A.legL, tiers)); lR.add(instantiate(ctx, P.legR, tiers), instantiate(ctx, A.legR, tiers));
    const mount = new T.Group(); mount.position.set(0.02, 0.2, 0.14);
    const stock = instantiate(ctx, C.stock, tiers), limb = instantiate(ctx, C.limb, tiers), str = instantiate(ctx, C.string, tiers);
    stock.position.z = 0.1; limb.position.z = 0.15; str.position.z = 0.22;
    mount.add(stock, limb, str); body.add(mount);
    aL.rotation.set(-1.2, 0, -0.35); aR.rotation.set(-1.1, 0, 0.35); body.rotation.x = 0.06;
    g.add(body, lL, lR);
    g.scale.setScalar(1.15);
    g.traverse((m: any) => { m.raycast = () => {}; });
    return { g, tiers };
  }

  // ---------------------------------------------------------------------------------------------------------------- torch and trap
  function buildTorch(ghost = false) {
    const rnd = new Rng(808), mb = new MB(T, 809);
    mb.ghost = ghost;
    mb.ao = { y0: 0, h: 0.6, k: 0.2 };
    for (let i = 0; i < 5; i++) { const a = i * 1.3; mb.blob(rnd.pick(PAL.stone), 0.1 + rnd.range(0, 0.06), Math.cos(a) * 0.17, 0.06, Math.sin(a) * 0.17, 1.2, 0.7, 1.2, 0, rnd.range(0, 6), { tier: i < 3 ? 0 : 1 }); }
    mb.cyl(PAL.stone[1], 0.2, 0.24, 0.1, 0, 0.05, 0, 8, 0, 0, 0, { jit: 0.05 });
    mb.taper(PAL.wood[0], 0.09, 0.065, 0, 0.1, 0, 0, 1.38, 0, 8);
    for (const y of [0.5, 0.95]) mb.cyl(PAL.iron, 0.095, 0.095, 0.05, 0, y, 0, 8, 0, 0, 0, { tier: 1, mat: "metal" });
    for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4; mb.beam(PAL.iron, 0.04, 0, 1.28, 0, Math.cos(a) * 0.22, 1.5, Math.sin(a) * 0.22, { mat: "metal" }); }
    mb.lathe(PAL.iron, [[0.04, 0], [0.13, 0.04], [0.23, 0.13], [0.25, 0.2], [0.22, 0.2], [0.2, 0.13], [0.1, 0.07]], 0, 1.4, 0, 10, 1, 1, 1, { mat: "metal" });
    mb.blob(0xff5a1a, 0.15, 0, 1.55, 0, 1, 0.45, 1, 0, 0, { mat: "lamp", noAO: true, jit: 0.1 });
    for (let k = 0; k < 4; k++) mb.blob(0xffb040, 0.04, Math.cos(k * 1.6) * 0.1, 1.6, Math.sin(k * 1.6) * 0.1, 1, 0.8, 1, 0, 0, { tier: 1, mat: "lamp", noAO: true });
    return { mb, dyn: [] as Dyn[] };
  }

  function buildTrap(ghost = false) {
    const rnd = new Rng(909), mb = new MB(T, 910);
    mb.ghost = ghost;
    mb.ao = { y0: 0, h: 0.5, k: 0.2 };
    mb.bar(PAL.wood[1], 1.5, 0.1, 1.5, 0, 0, 0);
    for (const sx of [-1, 1]) { mb.bar(PAL.wood[0], 0.13, 0.17, 1.56, sx * 0.72, 0, 0, 0, { tier: 1 }); mb.bar(PAL.wood[0], 1.56, 0.17, 0.13, 0, 0, sx * 0.72, 0, { tier: 1 }); }
    mb.bar(PAL.iron, 1.2, 0.04, 1.2, 0, 0.1, 0, 0, { mat: "metal" });
    for (let i = 0; i < 9; i++) {
      const x = (i % 3 - 1) * 0.4, z = (Math.floor(i / 3) - 1) * 0.4;
      mb.cone(0xc9ccd4, 0.085, 0.52, x, 0.4, z, 6, 0, 0, 0, { mat: "metal", jit: 0.06 });
      mb.cyl(PAL.iron, 0.1, 0.1, 0.04, x, 0.14, z, 6, 0, 0, 0, { tier: 1, mat: "metal" });
    }
    for (let i = 0; i < 4; i++) mb.box(0x7a1a1a, 0.18, 0.012, 0.14, rnd.range(-0.5, 0.5), 0.112, rnd.range(-0.5, 0.5), 0, rnd.range(0, 3), 0, { tier: 2, noAO: true });
    mb.cyl(0xe8e0cc, 0.05, 0.05, 0.3, 0.32, 0.17, -0.55, 6, 0, 0, PI / 2, { tier: 2 });
    mb.sphere(0xe8e0cc, 0.09, -0.5, 0.19, 0.5, 1, 1, 1, 7, 5, { tier: 2 });
    for (const [sx, sz] of [[-0.76, -0.76], [0.76, 0.76]]) mb.torus(PAL.iron, 0.08, 0.014, sx!, 0.2, sz!, PI / 2, 0, 0, 4, 8, { tier: 2, mat: "metal" });
    return { mb, dyn: [] as Dyn[] };
  }

  // ---------------------------------------------------------------------------------------------------------------- hook them into the engine's MESH table
  const MESH = I.MESH;
  const orig = { wall: MESH.wall, tower: MESH.tower, torch: MESH.torch, trap: MESH.trap };
  let wallCount = 0;
  MESH.wall = function () {
    if (!ctx.isInf()) return orig.wall.apply(this, arguments);
    try {
      const ghost = arguments[0] === true, v = ghost ? 0 : (wallCount++) % 5;       // the engine asks for the placement preview with `true`
      return instance("wall" + v, (gh) => buildWall(v, gh), ghost).g;
    } catch (e) { console.error("wall model", e); return orig.wall.apply(this, arguments); }
  };
  MESH.tower = function () {
    if (!ctx.isInf()) return orig.tower.apply(this, arguments);
    try {
      const f = faction(), main = f ? f.color : 0x4f8fd6;
      const ghost = arguments[0] === true;
      const { g, dyn } = instance("tower" + main, (gh) => buildTower(gh), ghost);
      if (ghost) return g;
      attachDyn(ctx, g, g, dyn);
      const gd = makeGuard(main);
      gd.g.position.set(-0.5, 4.1, 0.2); gd.g.visible = false;
      g.add(gd.g); g.userData.guard = gd.g;
      const handle = { userData: { tiers: [[], [], []], owner: g } };
      gd.g.traverse((m: any) => { if (m.isMesh && m.userData.tier != null) handle.userData.tiers[m.userData.tier]!.push(m); });
      ctx.tiered.push(handle); setTier(gd.g, ctx.gfx.f.tier);
      return g;
    } catch (e) { console.error("tower model", e); return orig.tower.apply(this, arguments); }
  };
  MESH.torch = function (ghostOnly: boolean) {
    if (!ctx.isInf()) return orig.torch.apply(this, arguments);
    try {
      const { g } = instance("torch", (gh) => buildTorch(gh), !!ghostOnly);
      // flame (the engine scales it every tick), halo and ground glow use the engine's shared materials
      const fl = new T.Group(); fl.position.y = 1.62;
      const f1 = new T.Mesh(flameGeo.outer, I.FLAME_MAT); f1.position.y = 0.28;
      const f2 = new T.Mesh(flameGeo.core, I.CORE_MAT); f2.position.y = 0.18;
      fl.add(f1, f2); g.add(fl); g.userData.flame = fl;
      if (!ghostOnly) {
        const halo = new T.Sprite(I.HALO_MAT); halo.position.y = 1.95; halo.scale.set(2.4, 2.4, 1); g.add(halo); g.userData.halo = halo;
        const gl = new T.Mesh(I.glowGeo, I.GLOW_MAT); gl.rotation.x = -PI / 2; gl.position.y = 0.09; g.add(gl); g.userData.glow = gl;
      }
      return g;
    } catch (e) { console.error("torch model", e); return orig.torch.apply(this, arguments); }
  };
  MESH.trap = function () {
    if (!ctx.isInf()) return orig.trap.apply(this, arguments);
    try { return instance("trap", (gh) => buildTrap(gh), arguments[0] === true).g; } catch (e) { console.error("trap model", e); return orig.trap.apply(this, arguments); }
  };
  const flameGeo = { outer: new T.ConeGeometry(0.2, 0.55, 8), core: new T.ConeGeometry(0.11, 0.32, 8) };
}
