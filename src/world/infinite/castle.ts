// @ts-nocheck
import type { Ctx } from "./types";
import { MB } from "./mb";
import { Rng } from "./rng";
import { PAL, shade, stoneBox, quoins, bellRoof, doorAt, windowAt, lantern, barrel, crate, roundShield, vines, ivy, bush, bracket } from "./props";
import { track, attachDyn, eachWall, type Dyn } from "./buildings";

/**
 * Your castle: a walled keep with four round corner towers, a gatehouse with portcullis and drawbridge, a three-tier keep, a courtyard
 * with a well, banners and lanterns, and flags that stream with the wind. It is bigger than the engine's box (the footprint is about
 * 5 x 5 plus the bridge); the gate faces +z, towards where the king starts. When the castle is hurt it smokes and then burns.
 */
const PI = Math.PI;

function disposeKids(o: any) {
  o.traverse((n: any) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material && !(n.material.userData && n.material.userData.shared)) { if (n.material.map && n.userData.ownMap) n.material.map.dispose(); n.material.dispose(); }
  });
}

function buildCastleModel(ctx: Ctx, faction: any, castle: any) {
  const T = ctx.T, rnd = new Rng(1301), mb = new MB(T, 1302), dyn: Dyn[] = [];
  const main = faction.color, roofC = shade(main, 0.88), accent = 0xe8c04a, cream = 0xf1e8d0;
  mb.ao = { y0: 0, h: 1.6, k: 0.28 };
  const S = 2.45, WTH = 0.5, WHT = 1.9, Y0 = 0.1, GW = 0.95;

  // ---------------------------------------------------------------------------------------------- footing and courtyard
  mb.bar(0x6a655d, 2 * S + 1.0, Y0, 2 * S + 1.0, 0, 0, 0);
  mb.bar(0x7a756c, 2 * S - 0.3, 0.03, 2 * S - 0.3, 0, Y0, 0, 0);
  for (let k = 0; k < 130; k++) {
    const x = rnd.range(-S + 0.4, S - 0.4), z = rnd.range(-S + 0.4, S - 0.4);
    mb.quad(rnd.pick([0x8b867a, 0x7d786d, 0x948e80, 0x6f6a62]), rnd.range(0.22, 0.42), rnd.range(0.2, 0.34), x, Y0 + 0.034, z, -PI / 2, 0, rnd.range(0, PI), { tier: 1, noAO: true, jit: 0.08 });
  }

  // ---------------------------------------------------------------------------------------------- curtain walls
  const seg = (x: number, z: number, len: number, yaw: number) => {
    mb.push(x, Y0, z, yaw);
    stoneBox(mb, rnd, len, WHT, WTH, 0, 0, 0, { tier: 1 });
    mb.box(PAL.stoneD, len + 0.02, 0.14, WTH + 0.18, 0, WHT + 0.07, 0);
    mb.box(PAL.stone[2], len + 0.02, 0.05, WTH + 0.22, 0, WHT + 0.165, 0, 0, 0, 0, { tier: 1 });
    const n = Math.max(2, Math.round(len / 0.64)), mw = len / n * 0.6;
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (k + 0.5) * len / n;
      mb.bar(PAL.stone[0], mw, 0.38, WTH * 0.9, u, WHT + 0.19, 0, 0, { jit: 0.06 });
      mb.box(PAL.stoneL, mw + 0.06, 0.06, WTH + 0.04, u, WHT + 0.59, 0, 0, 0, 0, { tier: 1 });
    }
    for (let k = 0; k < Math.floor(len / 1.3); k++) { // arrow loops, both faces
      const u = -len / 2 + (k + 0.5) * len / Math.floor(len / 1.3);
      for (const sg of [-1, 1]) { mb.push(u, 0, sg * (WTH / 2 + 0.006), sg > 0 ? 0 : PI); mb.box(0x06070a, 0.08, 0.5, 0.04, 0, 1.15, 0.012, 0, 0, 0, { tier: 1, noAO: true, jit: 0 }); mb.box(PAL.stoneL, 0.28, 0.07, 0.06, 0, 1.43, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.07, 0.6, 0.06, -0.1, 1.15, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.07, 0.6, 0.06, 0.1, 1.15, 0.02, 0, 0, 0, { tier: 1 }); mb.pop(); }
    }
    mb.pop();
  };
  seg(0, -S, 2 * S, 0); seg(-S, 0, 2 * S, PI / 2); seg(S, 0, 2 * S, PI / 2);
  seg(-(S + GW) / 2, S, S - GW, 0); seg((S + GW) / 2, S, S - GW, 0);
  mb.push(-S - WTH / 2 - 0.01, Y0, 0.0, -PI / 2); ivy(mb, rnd, 0, 0.2, 0, 2.2, 1.5, { n: 18 }); vines(mb, rnd, 0, WHT + 0.1, 0.03, 5, 1.8, 0.3, 0.9, { tier: 1 }); mb.pop();
  mb.push(0, Y0, -S - WTH / 2 - 0.01, PI); ivy(mb, rnd, 0.8, 0.2, 0, 2.0, 1.5, { n: 14 }); mb.pop();

  // ---------------------------------------------------------------------------------------------- corner towers
  const R = 0.74, TH = 3.1;
  const tower = (sx: number, sz: number) => {
    const x = sx * S, z = sz * S, ang = Math.atan2(sx, sz);
    mb.cyl(PAL.stone[0], R * 0.93, R, TH, x, Y0 + TH / 2, z, 14, 0, 0, 0, { grad: [PAL.stoneD, PAL.stone[2], Y0, Y0 + TH], jit: 0.05 });
    for (let y = 0.3; y < TH - 0.15; y += 0.27) { const r = R - (R * 0.07) * (y / TH) + 0.012; mb.cyl(PAL.mortar, r, r, 0.022, x, Y0 + y, z, 14, 0, 0, 0, { tier: 1, jit: 0.05 }); }
    for (const y of [1.15, 2.2]) mb.cyl(PAL.stoneL, R + 0.05, R + 0.05, 0.1, x, Y0 + y, z, 14, 0, 0, 0, { tier: 1 });
    mb.cyl(PAL.stoneD, R + 0.2, R * 0.93, 0.24, x, Y0 + TH + 0.12, z, 14);
    mb.cyl(PAL.stone[1], R + 0.17, R + 0.17, 0.12, x, Y0 + TH + 0.3, z, 14);
    for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2; mb.bar(PAL.stone[0], 0.34, 0.34, 0.2, x + Math.cos(a) * (R + 0.12), Y0 + TH + 0.36, z + Math.sin(a) * (R + 0.12), -(a + PI / 2), { jit: 0.06 }); }
    mb.push(x, Y0, z, ang);
    for (const y of [1.0, 1.9, 2.55]) { mb.box(0x06070a, 0.09, 0.46, 0.06, 0, y, R - 0.03, 0, 0, 0, { tier: 0, noAO: true, jit: 0 }); mb.box(PAL.stoneL, 0.07, 0.56, 0.08, -0.1, y, R - 0.01, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.07, 0.56, 0.08, 0.1, y, R - 0.01, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.3, 0.07, 0.08, 0, y + 0.3, R - 0.01, 0, 0, 0, { tier: 1 }); }
    mb.pop();
    const base = Y0 + TH + 0.42;
    mb.cone(roofC, R + 0.22, 1.4, x, base + 0.7, z, 14, 0, 0, 0, { jit: 0.03 });
    for (let i = 1; i <= 4; i++) { const f = i / 5, rr = (R + 0.22) * (1 - f); mb.cyl(i % 2 ? shade(roofC, 0.8) : shade(roofC, 1.12), rr + 0.015, rr + 0.04, 0.045, x, base + 1.4 * f, z, 14, 0, 0, 0, { tier: 1 }); }
    mb.sphere(PAL.brass, 0.08, x, base + 1.42, z, 1, 1, 1, 8, 6, { mat: "metal" });
    mb.box(PAL.wood[1], 0.04, 0.8, 0.04, x, base + 1.8, z);
    dyn.push({ kind: "flag", x, y: base + 2.15, z, o: { w: 0.62, h: 0.32, kind: "pennant", main: accent, accent: main, pattern: "bands" } });
    if (sx < 0 && sz < 0) ivy(mb, rnd, x - 0.5, 0.4, z - 0.4, 0.9, 2.2, { n: 10 });
  };
  tower(-1, -1); tower(1, -1); tower(-1, 1); tower(1, 1);

  // ---------------------------------------------------------------------------------------------- gatehouse
  for (const sx of [-1, 1]) {
    stoneBox(mb, rnd, 1.2, 2.9, 1.5, sx * 1.2, Y0, S, { tier: 1 });
    mb.box(PAL.stoneD, 1.38, 0.14, 1.68, sx * 1.2, Y0 + 2.97, S);
    for (let k = 0; k < 3; k++) { mb.bar(PAL.stone[0], 0.3, 0.36, 0.28, sx * 1.2 - 0.4 + k * 0.4, Y0 + 3.04, S + 0.72); mb.bar(PAL.stone[0], 0.3, 0.36, 0.28, sx * 1.2 - 0.4 + k * 0.4, Y0 + 3.04, S - 0.72); }
    for (const sz of [-1, 1]) mb.bar(PAL.stone[0], 0.28, 0.36, 0.5, sx * 1.2 + sx * 0.62, Y0 + 3.04, S + sz * 0.3);
    quoins(mb, rnd, sx * 1.8, S + 0.75, Y0, Y0 + 2.9, 0.12, 2);
    for (const y of [1.6, 2.35]) { mb.push(sx * 1.2, Y0, S + 0.75, 0); mb.box(0x06070a, 0.09, 0.5, 0.05, 0, y, 0.01, 0, 0, 0, { tier: 1, noAO: true, jit: 0 }); mb.box(PAL.stoneL, 0.08, 0.6, 0.07, -0.11, y, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.08, 0.6, 0.07, 0.11, y, 0.02, 0, 0, 0, { tier: 1 }); mb.box(PAL.stoneL, 0.3, 0.07, 0.07, 0, y + 0.32, 0.02, 0, 0, 0, { tier: 1 }); mb.pop(); }
    bracket(mb, sx * 0.72, Y0 + 1.2, S + 0.76, 0.22); lantern(mb, sx * 0.72, Y0 + 1.04, S + 0.98, { tier: 1 });
    dyn.push({ kind: "halo", x: sx * 0.72, y: Y0 + 1.04, z: S + 0.98, o: { size: 1.0, color: 0xffc070, flicker: 0.06 } });
    mb.box(PAL.wood[1], 0.04, 0.9, 0.04, sx * 1.2, Y0 + 3.45 + 0.45, S);
    dyn.push({ kind: "flag", x: sx * 1.2, y: Y0 + 4.3, z: S, o: { w: 0.6, h: 0.3, kind: "pennant", main, accent: cream, pattern: "chevron" } });
  }
  stoneBox(mb, rnd, 1.24, 1.2, 1.5, 0, Y0 + 1.7, S, { tier: 1 });                                // chamber over the passage
  mb.box(PAL.stoneD, 1.44, 0.14, 1.68, 0, Y0 + 2.97, S);
  for (let k = 0; k < 3; k++) { mb.bar(PAL.stone[0], 0.3, 0.36, 0.28, -0.4 + k * 0.4, Y0 + 3.04, S + 0.72); mb.bar(PAL.stone[0], 0.3, 0.36, 0.28, -0.4 + k * 0.4, Y0 + 3.04, S - 0.72); }
  mb.box(0x07080a, 1.12, 1.66, 1.2, 0, Y0 + 0.84, S);                                            // the dark passage
  const arch: Array<[number, number]> = [[-0.6, 0], [0.6, 0]];
  for (let i = 0; i <= 10; i++) { const a = i / 10 * PI; arch.push([Math.cos(a) * 0.6, 1.1 + Math.sin(a) * 0.6]); }
  mb.plate(0x07080a, arch, 0.06, 0, Y0, S + 0.77, 0, 0, 0, 0, { noAO: true, jit: 0 });
  for (let i = 0; i < 9; i++) { const a = i / 8 * PI, rr = 0.69; mb.box(i % 2 ? PAL.stone[2] : PAL.stoneL, 0.14, 0.17, 0.14, Math.cos(a) * rr, Y0 + 1.1 + Math.sin(a) * rr, S + 0.76, 0, 0, a - PI / 2, { tier: 1 }); }
  mb.box(PAL.brass, 0.14, 0.18, 0.15, 0, Y0 + 1.1 + 0.75, S + 0.77, 0, 0, 0, { tier: 1, mat: "metal" });
  for (let k = 0; k < 9; k++) { // raised portcullis
    mb.box(PAL.iron, 0.035, 0.7, 0.04, -0.46 + k * 0.115, Y0 + 1.35, S + 0.8, 0, 0, 0, { tier: 1, mat: "metal" });
    mb.cone(PAL.iron, 0.03, 0.1, -0.46 + k * 0.115, Y0 + 0.97, S + 0.8, 4, PI, 0, 0, { tier: 1, mat: "metal" });
  }
  for (const y of [1.15, 1.45, 1.7]) mb.box(PAL.iron, 1.0, 0.04, 0.04, 0, Y0 + y, S + 0.8, 0, 0, 0, { tier: 1, mat: "metal" });
  for (let k = 0; k < 7; k++) mb.box(PAL.stoneD, 0.12, 0.1, 0.22, -0.54 + k * 0.18, Y0 + 2.86, S + 0.76, 0, 0, 0, { tier: 1 });    // machicolations
  mb.box(shade(main, 0.9), 0.62, 0.95, 0.025, 0, Y0 + 2.3, S + 0.78, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.8, swayH: 0.95, swayInv: true });
  mb.box(accent, 0.1, 0.62, 0.03, 0, Y0 + 2.36, S + 0.785, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.8, swayH: 0.95, swayInv: true });
  mb.box(accent, 0.34, 0.1, 0.03, 0, Y0 + 2.45, S + 0.785, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.8, swayH: 0.95, swayInv: true });
  // drawbridge
  mb.bar(PAL.plank[2], 1.0, 0.1, 1.05, 0, Y0 - 0.02, S + 1.3, 0);
  for (let k = 0; k < 8; k++) mb.box(PAL.woodD, 0.9, 0.012, 0.025, 0, Y0 + 0.082, S + 0.85 + k * 0.13, 0, 0, 0, { tier: 1, noAO: true });
  for (const sx of [-1, 1]) { mb.beam(0x8a8f98, 0.03, sx * 0.5, Y0 + 1.7, S + 0.78, sx * 0.5, Y0 + 0.1, S + 1.75, { tier: 1, mat: "metal" }); mb.bar(PAL.wood[1], 0.08, 0.14, 1.05, sx * 0.52, Y0, S + 1.3, 0, { tier: 1 }); }
  slabsOut(mb, rnd, S + 1.85, S + 2.7);

  // ---------------------------------------------------------------------------------------------- the keep
  const kz = -0.85;
  mb.push(0, 0, kz, 0);
  stoneBox(mb, rnd, 2.1, 2.9, 2.1, 0, Y0, 0, { tier: 1 });
  mb.box(PAL.stoneD, 2.34, 0.16, 2.34, 0, Y0 + 2.98, 0);
  mb.box(PAL.stone[2], 2.4, 0.05, 2.4, 0, Y0 + 3.09, 0, 0, 0, 0, { tier: 1 });
  stoneBox(mb, rnd, 1.7, 1.3, 1.7, 0, Y0 + 3.06, 0, { tier: 1, cols: [0x969ba3, 0x858a92, 0xa4a9b0, 0x7d838b] });
  mb.box(PAL.stoneD, 2.0, 0.16, 2.0, 0, Y0 + 4.44, 0);
  for (let i = 0; i < 4; i++) { // merlons all round the balcony
    mb.push(0, 0, 0, i * PI / 2);
    for (let k = -2; k <= 2; k++) mb.bar(PAL.stone[0], 0.26, 0.34, 0.2, k * 0.38, Y0 + 4.58, 0.9);
    mb.pop();
  }
  stoneBox(mb, rnd, 1.2, 0.95, 1.2, 0, Y0 + 4.52, 0, { tier: 1, cols: [0x969ba3, 0xa4a9b0, 0x858a92] });
  bellRoof(mb, rnd, { w: 1.3, y: Y0 + 5.5, h1: 0.4, h2: 1.25, flare: 0.24, cols: [roofC, shade(roofC, 1.12), shade(roofC, 0.78)] });
  mb.sphere(PAL.brass, 0.11, 0, Y0 + 7.22, 0, 1, 1, 1, 8, 6, { mat: "metal" });
  mb.box(PAL.wood[1], 0.06, 0.95, 0.06, 0, Y0 + 7.65, 0);
  dyn.push({ kind: "flag", x: 0, y: Y0 + 8.1, z: kz, o: { w: 1.3, h: 0.66, kind: "swallow", main, accent, pattern: "crest" } });
  eachWall(mb, 2.1, 2.1, (i, fw, fz) => {
    if (i === 0) {
      doorAt(mb, rnd, 0, fz, { w: 0.8, h: 1.4, y0: Y0, step: true });
      for (const sx of [-1, 1]) {
        windowAt(mb, rnd, sx * 0.7, Y0 + 2.0, fz, { w: 0.34, h: 0.55, shutter: main, open: 0.7 });
        bracket(mb, sx * 0.55, Y0 + 1.5, fz + 0.01, 0.22); lantern(mb, sx * 0.55, Y0 + 1.34, fz + 0.22, { tier: 1 });
        dyn.push({ kind: "halo", x: sx * 0.55, y: Y0 + 1.34, z: kz + fz + 0.22, o: { size: 0.9, color: 0xffc070, flicker: 0.06 } });
      }
    } else { windowAt(mb, rnd, -0.45, Y0 + 2.0, fz, { w: 0.34, h: 0.55, shutter: main, open: 0.7 }); windowAt(mb, rnd, 0.45, Y0 + 2.0, fz, { w: 0.34, h: 0.55, shutter: main, open: 0.7 }); }
    quoins(mb, rnd, fw / 2, fz, Y0, Y0 + 2.9, 0.14, 2);
  });
  eachWall(mb, 1.7, 1.7, (i, fw, fz) => { windowAt(mb, rnd, 0, Y0 + 3.75, fz, { w: 0.3, h: 0.5, shutter: i % 2 ? accent : main, open: 0.8 }); });
  eachWall(mb, 1.2, 1.2, (i, fw, fz) => {
    mb.box(0x07080a, 0.22, 0.46, 0.05, 0, Y0 + 5.0, fz + 0.012, 0, 0, 0, { tier: 0, noAO: true, jit: 0 });
    mb.quad(PAL.glow, 0.16, 0.38, 0, Y0 + 5.0, fz + 0.04, 0, 0, 0, { tier: 1, mat: "lamp", noAO: true, jit: 0 });
    mb.box(PAL.stoneL, 0.3, 0.07, 0.08, 0, Y0 + 5.27, fz + 0.02, 0, 0, 0, { tier: 1 });
  });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.bar(PAL.stone[1], 0.34, 1.7, 0.34, sx * 1.1, Y0, sz * 1.1, 0, { tier: 1 });          // buttresses
  for (const sx of [-1, 1]) { // hanging banners on the front
    mb.box(PAL.iron, 0.46, 0.03, 0.03, sx * 0.9, Y0 + 2.75, 1.13, 0, 0, 0, { tier: 1, mat: "metal" });
    mb.box(main, 0.4, 1.0, 0.02, sx * 0.9, Y0 + 2.22, 1.14, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.7, swayH: 1.0, swayInv: true });
    mb.box(accent, 0.08, 0.7, 0.025, sx * 0.9, Y0 + 2.3, 1.145, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.7, swayH: 1.0, swayInv: true });
    mb.box(accent, 0.28, 0.08, 0.025, sx * 0.9, Y0 + 2.45, 1.145, 0, 0, 0, { tier: 1, mat: "swayDS", sway: 1.1, swayY0: Y0 + 1.7, swayH: 1.0, swayInv: true });
  }
  mb.pop();

  // ---------------------------------------------------------------------------------------------- courtyard
  mb.cyl(PAL.stone[1], 0.36, 0.38, 0.5, 1.35, Y0 + 0.25, 0.8, 12);
  mb.cyl(PAL.stoneD, 0.27, 0.27, 0.02, 1.35, Y0 + 0.5, 0.8, 12, 0, 0, 0, { tier: 1 });
  mb.cyl(0x2c5a7a, 0.26, 0.26, 0.02, 1.35, Y0 + 0.4, 0.8, 12, 0, 0, 0, { tier: 1, mat: "lamp", jit: 0 });
  for (const sx of [-1, 1]) mb.bar(PAL.wood[0], 0.07, 0.9, 0.07, 1.35 + sx * 0.32, Y0 + 0.5, 0.8, 0, { tier: 1 });
  mb.box(PAL.wood[1], 0.8, 0.07, 0.07, 1.35, Y0 + 1.35, 0.8, 0, 0, 0, { tier: 1 });
  mb.gable(PAL.wood[2], 0.9, 0.3, 0.5, 1.35, Y0 + 1.36, 0.8, PI / 2, { tier: 1 });
  mb.cyl(PAL.wood[0], 0.07, 0.06, 0.12, 1.35, Y0 + 1.05, 0.8, 7, 0, 0, 0, { tier: 2 });
  barrel(mb, -2.05, Y0, -0.5, { tier: 1 }); barrel(mb, -2.0, Y0, 0.0, { tier: 1 }); barrel(mb, -1.8, Y0, -0.75, { tier: 2, r: 0.17, h: 0.36 });
  crate(mb, 1.95, Y0, -1.7, 0.4, 0.2, { tier: 1 }); crate(mb, 1.95, Y0 + 0.4, -1.65, 0.3, -0.2, { tier: 2 });
  mb.bar(PAL.wood[1], 0.07, 0.8, 0.07, -1.5, Y0, 1.3, 0, { tier: 2 }); mb.box(PAL.wood[1], 0.55, 0.06, 0.06, -1.5, Y0 + 0.6, 1.3, 0, 0, 0, { tier: 2 }); mb.sphere(0xb89a52, 0.14, -1.5, Y0 + 0.9, 1.3, 1, 1, 1, 7, 5, { tier: 2 }); // dummy
  for (let k = 0; k < 4; k++) { mb.pole(PAL.wood[0], 0.015, -0.9 + k * 0.1, Y0, 1.55, -0.85 + k * 0.1, Y0 + 1.2, 1.5, 5, { tier: 2 }); mb.cone(PAL.steel, 0.03, 0.12, -0.85 + k * 0.1, Y0 + 1.26, 1.5, 4, 0, 0, 0, { tier: 2, mat: "metal" }); }
  for (const [x, z, ry] of [[-1.3, -S + 0.38, 0], [1.3, -S + 0.38, 0], [-S + 0.38, 0.4, PI / 2], [S - 0.38, 0.4, -PI / 2]] as Array<[number, number, number]>) {
    mb.push(x, 0, z, ry);
    bracket(mb, 0, Y0 + 1.5, -0.05, 0.2); lantern(mb, 0, Y0 + 1.34, 0.15, { tier: 1 });
    mb.pop();
    const wx = ry === PI / 2 ? 0.15 : ry === -PI / 2 ? -0.15 : 0, wz = ry === 0 ? 0.15 : 0;
    dyn.push({ kind: "halo", x: x + wx, y: Y0 + 1.34, z: z + wz, o: { size: 0.95, color: 0xffc070, flicker: 0.06 } });
  }
  bush(mb, rnd, -2.7, 0, 1.0, 0.3, { tier: 2, flowers: 4 }); bush(mb, rnd, 2.7, 0, 1.1, 0.3, { tier: 2 }); bush(mb, rnd, -S - 0.6, 0, 2.8, 0.34, { tier: 2 });

  // ---------------------------------------------------------------------------------------------- hurt: smoke, then fire
  dyn.push({ kind: "smoke", x: 0.45, y: Y0 + 6.1, z: kz, o: { n: 5, size: 0.8, rise: 3.0, period: 3.0, show: () => castle.alive && castle.health < castle.maxHealth * 0.66, dark: 0.45 } });
  dyn.push({ kind: "smoke", x: -1.7, y: Y0 + 2.4, z: 1.2, o: { n: 4, size: 0.6, rise: 2.4, period: 2.7, show: () => castle.alive && castle.health < castle.maxHealth * 0.4, dark: 0.55 } });
  dyn.push({ kind: "halo", x: 0.45, y: Y0 + 5.9, z: kz + 0.2, o: { size: 2.4, color: 0xff6a20, flicker: 0.2, day: 0.5, show: () => castle.alive && castle.health < castle.maxHealth * 0.4 } });
  dyn.push({ kind: "halo", x: -1.7, y: Y0 + 2.2, z: 1.2, o: { size: 1.8, color: 0xff6a20, flicker: 0.2, day: 0.5, show: () => castle.alive && castle.health < castle.maxHealth * 0.25 } });
  return { mb, dyn };
}

/** Path stones leading away from the drawbridge. */
function slabsOut(mb: MB, rnd: Rng, z0: number, z1: number) {
  for (let z = z0; z < z1; z += 0.45) mb.box(rnd.pick([0x8b867a, 0x7d786d, 0x948e80]), rnd.range(0.7, 1.1), 0.04, 0.34, rnd.range(-0.1, 0.1), 0.05, z, 0, rnd.range(-0.2, 0.2), 0, { tier: 1, noAO: true });
}

export function installCastle(ctx: Ctx) {
  const { env, T } = ctx;
  const origMake = env.makeCastle;
  env.makeCastle = function (faction: any, territory: any) {
    const castle = origMake(faction, territory);
    if (!castle || !ctx.isInf()) return castle;
    try { dress(castle, faction); } catch (e) { console.error("castle model", e); }
    return castle;
  };

  function dress(castle: any, faction: any) {
    const g = castle.group;
    g.children.slice().forEach((c: any) => { if (c === castle.hbSprite) return; g.remove(c); disposeKids(c); });
    const { mb, dyn } = buildCastleModel(ctx, faction, castle);
    const root = mb.build(ctx.mats, true);
    root.children.slice().forEach((m: any) => g.add(m));
    track(ctx, root, g);
    attachDyn(ctx, g, g, dyn);
    // clicks on an enemy castle use these two meshes (there are no enemy castles here, but the engine expects them)
    const proxy = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ visible: false }));
      m.position.set(x, y, z); m.userData.castleRef = castle; g.add(m); return m;
    };
    castle.pickables = [proxy(2.4, 6, 2.4, 0, 3, -0.85), proxy(1.2, 1.8, 0.4, 0, 1, 3.2)];
    if (castle.hbSprite) castle.hbSprite.position.y = 9.4;
    // solid for walkers: units and zombies slide round the walls instead of through them
    if (ctx.island) ctx.island.obstacles.push({ x: castle.x, z: castle.z, r: 3.0, kind: "castle" });
    const clear = (c: any) => { try { c && c.clearArea(castle.x, castle.z, 5.4); } catch { /* ignore */ } };
    clear(ctx.trees); clear(ctx.foliage);
  }
}
