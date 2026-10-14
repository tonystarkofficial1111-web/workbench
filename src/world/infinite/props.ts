// @ts-nocheck
import type { MB } from "./mb";
import type { Rng } from "./rng";

/**
 * Building blocks for the Infinite world's models: stone walls made of single blocks, roofs with shingle courses, windows, doors,
 * lanterns, barrels and the like. Every function adds parts to an MB model; parts that only matter up close carry a higher detail tier
 * (1 = Medium and High, 2 = High only), so the Low graphics level keeps just the plain shapes.
 * Details are written facing +z and placed with mb.push(x, y, z, yaw) / mb.pop().
 */
export const PAL = {
  stone: [0x8a8f98, 0x7d838b, 0x969ba3, 0x72777f, 0x858a92],
  stoneD: 0x5d626a, mortar: 0x565b63, stoneL: 0xa4a9b0,
  moss: [0x4c6a36, 0x3f5c30, 0x587a3c, 0x466b3c],
  wood: [0x6b4a2c, 0x5a3d24, 0x7a5636], woodD: 0x3a281a, woodDD: 0x2a1c12,
  plank: [0x8b6a3c, 0x7d5d34, 0x967443, 0x6f5230],
  plaster: [0xe6dabb, 0xdccfae, 0xeee4c8], thatch: [0xc9a45a, 0xb8943f, 0xd8b66a, 0xa88838],
  tile: [0xa84a30, 0x9a3f2b, 0xb25536, 0x8f3b2b], tileD: 0x6e2a1f,
  slate: [0x4f5663, 0x5a6270, 0x454c58],
  iron: 0x3a3f48, steel: 0x9aa0a8, brass: 0xc9a24a, glow: 0xffc060, ember: 0xff6b3d,
  glass: 0x2a3340,
};

const PI = Math.PI;

/** Colour helpers: scale a 0xRRGGBB colour, or blend two of them. */
export const shade = (c: number, f: number) => {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
};
export const mix = (a: number, b: number, t: number) => {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t), g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
};

// ------------------------------------------------------------------------------------------------------------------ masonry
/** Courses of single stone blocks on a flat face (x from -w/2, bottom at y0, standing out `z` from the wall). The wall behind it is the mortar. */
export function stoneFace(mb: MB, rnd: Rng, w: number, h: number, o: { x0?: number; y0?: number; z?: number; bw?: number; bh?: number; tier?: number; cols?: number[]; gap?: number } = {}) {
  const x0 = o.x0 ?? -w / 2, y0 = o.y0 ?? 0, z = o.z ?? 0.007, bw = o.bw ?? 0.42, bh = o.bh ?? 0.21, gap = o.gap ?? 0.03, cols = o.cols ?? PAL.stone;
  const rows = Math.max(1, Math.round(h / bh)), rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = x0 - (r % 2 ? bw * 0.5 : 0) - rnd.range(0, bw * 0.25);
    const y = y0 + r * rh;
    while (x < x0 + w - 0.02) {
      const wd = bw * rnd.range(0.75, 1.25), a = Math.max(x, x0), b = Math.min(x + wd, x0 + w);
      if (b - a > 0.06) mb.quad(rnd.pick(cols), b - a - gap, rh - gap, (a + b) / 2, y + rh / 2, z, 0, 0, 0, { tier: o.tier ?? 1, jit: 0.07 });
      x += wd;
    }
  }
}

/** A block of masonry standing on y0 with its centre at (x, z): a mortar core with stone blocks on the chosen sides (bit 0 +z, 1 +x, 2 -z, 3 -x). */
export function stoneBox(mb: MB, rnd: Rng, w: number, h: number, d: number, x: number, y0: number, z: number, o: { core?: number; cols?: number[]; tier?: number; bw?: number; bh?: number; faces?: number; ry?: number; top?: boolean } = {}) {
  mb.push(x, y0, z, o.ry ?? 0);
  const core = o.core ?? PAL.mortar;
  mb.bar(core, w, h, d, 0, 0, 0, 0, { grad: [PAL.stoneD, core, y0, y0 + h] });
  const faces = o.faces ?? 15;
  for (let i = 0; i < 4; i++) {
    if (!(faces & (1 << i))) continue;
    mb.push(0, 0, 0, i * PI / 2);
    stoneFace(mb, rnd, i % 2 ? d : w, h, { z: (i % 2 ? w : d) / 2 + 0.006, tier: o.tier ?? 1, cols: o.cols, bw: o.bw, bh: o.bh });
    mb.pop();
  }
  mb.pop();
}

/** Alternating long and short corner stones up a wall corner. */
export function quoins(mb: MB, rnd: Rng, x: number, z: number, y0: number, y1: number, size = 0.17, tier = 2, col = PAL.stoneL) {
  let k = 0;
  for (let y = y0; y < y1 - 0.05; y += 0.24, k++) {
    const long = k % 2 === 0;
    mb.box(col, long ? size * 1.9 : size * 1.1, 0.2, long ? size * 1.1 : size * 1.9, x, y + 0.11, z, 0, 0, 0, { tier, jit: 0.06 });
  }
}

// ------------------------------------------------------------------------------------------------------------------ roofs
/** A gabled roof, ridge along x, sloping to +z and -z, with rows of shingles (tier 1), barge boards and a ridge cap. y is the height of the wall top. */
export function gableRoof(mb: MB, rnd: Rng, o: { w: number; d: number; h: number; y: number; x?: number; z?: number; ry?: number; ov?: number; ovx?: number; cols?: number[]; ridge?: number; t?: number; end?: number; wall?: number }) {
  const T = mb.T;
  const { w, d, h, y } = o, ov = o.ov ?? 0.26, ovx = o.ovx ?? 0.16, t = o.t ?? 0.09, cols = o.cols ?? PAL.tile;
  const a = Math.atan2(h, d / 2), ta = Math.tan(a), run = d / 2 + ov, L = run / Math.cos(a), sa = Math.sin(a), ca = Math.cos(a);
  mb.push(o.x ?? 0, 0, o.z ?? 0, o.ry ?? 0);
  for (const sg of [1, -1]) {
    const zc = sg * run / 2, yc = y + h - run / 2 * ta;
    mb.box(cols[0], w + 2 * ovx, t, L, 0, yc + ca * t / 2, zc + sg * sa * t / 2, sg * a, 0, 0, { jit: 0.04 });
    mb.box(PAL.woodD, w + 2 * ovx, 0.07, 0.05, 0, y + h - run * ta - 0.015, sg * (run + 0.012), 0, 0, 0, { tier: 1 });           // fascia along the eave
    const rows = Math.max(3, Math.round(L / 0.2));
    for (let k = 0; k < rows; k++) {
      const s = (k + 0.5) / rows * L, c = cols[k % cols.length];
      mb.box(c, w + 2 * ovx - 0.03, 0.026, L / rows * 0.62, 0, y + h - s * sa + ca * (t + 0.014), sg * (s * ca + sa * (t + 0.014)), sg * a, 0, 0, { tier: 1, jit: 0.08 });
    }
    for (const sx of [1, -1]) mb.box(PAL.woodD, 0.06, 0.11, L + 0.05, sx * (w / 2 + ovx - 0.02), yc + ca * (t + 0.02), zc + sg * sa * (t + 0.02), sg * a, 0, 0, { tier: 1 });   // barge boards
    for (let k = 0; k < Math.round(w / 0.36); k++) mb.box(PAL.wood[1], 0.07, 0.07, 0.22, -w / 2 + 0.18 + k * (w - 0.36) / Math.max(1, Math.round(w / 0.36) - 1), y + h - run * ta + 0.02, sg * (run - 0.18), 0, 0, 0, { tier: 2 });   // rafter tails
  }
  mb.box(o.ridge ?? PAL.tileD, w + 2 * ovx + 0.04, 0.1, 0.17, 0, y + h + 0.045, 0, 0, 0, 0);
  for (const sx of [1, -1]) {
    mb.plate(o.end ?? PAL.plaster[0], [[-d / 2, 0], [d / 2, 0], [0, h]], 0.08, sx * (w / 2 - 0.04), y, 0, 0, PI / 2, 0, 0, { jit: 0.03 });
    mb.box(PAL.brass, 0.05, 0.16, 0.05, sx * (w / 2 + ovx), y + h + 0.1, 0, 0, 0, 0, { tier: 2, mat: "metal" });                      // ridge finials
  }
  mb.pop();
}

/** A four-sided tower roof: a flared lower skirt and a steeper top, with shingle belts. Width is the roof's width at the wall top. */
export function bellRoof(mb: MB, rnd: Rng, o: { w: number; y: number; h1: number; h2: number; x?: number; z?: number; flare?: number; cols?: number[]; belt?: number; top?: number }) {
  const cols = o.cols ?? PAL.tile, fl = o.flare ?? 0.28, k = Math.SQRT1_2;
  const wb = o.w + fl * 2, wm = o.w * 0.66;
  const x = o.x ?? 0, z = o.z ?? 0;
  mb.cyl(cols[0], wm * k, wb * k, o.h1, x, o.y + o.h1 / 2, z, 4, 0, PI / 4, 0, { flat: true, jit: 0.03 });
  mb.cyl(cols[1] ?? cols[0], 0.02, wm * k, o.h2, x, o.y + o.h1 + o.h2 / 2, z, 4, 0, PI / 4, 0, { flat: true, jit: 0.03 });
  for (let i = 1; i <= 4; i++) { // shingle belts
    const f = i / 5, ww = (wb + (wm - wb) * f) * k + 0.025, yy = o.y + o.h1 * f;
    mb.cyl(i % 2 ? PAL.tileD : cols[2] ?? cols[0], ww, ww + 0.05, 0.05, x, yy, z, 4, 0, PI / 4, 0, { tier: 1, jit: 0.05 });
  }
  for (let i = 1; i <= 3; i++) {
    const f = i / 4, ww = wm * (1 - f) * k + 0.02, yy = o.y + o.h1 + o.h2 * f;
    mb.cyl(i % 2 ? PAL.tileD : cols[2] ?? cols[0], ww, ww + 0.04, 0.045, x, yy, z, 4, 0, PI / 4, 0, { tier: 1, jit: 0.05 });
  }
}

// ------------------------------------------------------------------------------------------------------------------ openings
/** A window on a wall (wall surface at z): dark glass at Low, warm glowing panes with frame, mullions, shutters and a sill from Medium. */
export function windowAt(mb: MB, rnd: Rng, x: number, y: number, z: number, o: { w?: number; h?: number; shutter?: number; box?: boolean; frame?: number; arch?: boolean; open?: number } = {}) {
  const w = o.w ?? 0.4, h = o.h ?? 0.5, fr = o.frame ?? PAL.wood[2];
  mb.quad(PAL.glass, w, h, x, y, z + 0.014, 0, 0, 0, { tier: 0, noAO: true, jit: 0 });
  mb.quad(PAL.glow, w - 0.04, h - 0.04, x, y, z + 0.024, 0, 0, 0, { tier: 1, mat: "lamp", noAO: true, jit: 0.1 });
  const fw = 0.05;
  mb.box(fr, w + fw * 2, fw, 0.07, x, y + h / 2 + fw / 2, z + 0.035, 0, 0, 0, { tier: 1 });
  mb.box(fr, w + fw * 2, fw, 0.07, x, y - h / 2 - fw / 2, z + 0.035, 0, 0, 0, { tier: 1 });
  for (const sg of [-1, 1]) mb.box(fr, fw, h, 0.07, x + sg * (w / 2 + fw / 2), y, z + 0.035, 0, 0, 0, { tier: 1 });
  mb.box(fr, 0.03, h, 0.05, x, y, z + 0.04, 0, 0, 0, { tier: 1 });
  mb.box(fr, w, 0.03, 0.05, x, y, z + 0.04, 0, 0, 0, { tier: 1 });
  mb.box(PAL.stoneL, w + 0.18, 0.05, 0.13, x, y - h / 2 - fw - 0.025, z + 0.06, 0, 0, 0, { tier: 1 });                               // sill
  if (o.shutter != null) for (const sg of [-1, 1]) {
    const op = o.open ?? 0.5;
    mb.box(o.shutter, w / 2 * 0.98, h + 0.02, 0.035, x + sg * (w / 2 + fw + w / 4 * Math.cos(op)), y, z + 0.05 + w / 4 * Math.sin(op), 0, -sg * op, 0, { tier: 1 });
    mb.box(PAL.woodD, w / 2 * 0.9, 0.02, 0.04, x + sg * (w / 2 + fw + w / 4 * Math.cos(op)), y + h * 0.25, z + 0.07 + w / 4 * Math.sin(op), 0, -sg * op, 0, { tier: 2 });
  }
  if (o.box) { // flower box
    mb.box(PAL.wood[1], w + 0.14, 0.1, 0.12, x, y - h / 2 - 0.14, z + 0.1, 0, 0, 0, { tier: 2 });
    const cols = [0xd8283a, 0xf0c040, 0xe86aa8, 0xffffff];
    for (let i = 0; i < 6; i++) mb.blob(i % 2 ? 0x3f7a32 : rnd.pick(cols), 0.05, x - w / 2 + 0.04 + i * (w - 0.08) / 5, y - h / 2 - 0.06, z + 0.1 + rnd.range(-0.02, 0.02), 1, 0.9, 1, 0, rnd.range(0, 6), { tier: 2, mat: "sway", sway: 0.6, swayY0: y - h / 2 - 0.1, swayH: 0.15 });
  }
}

/** A door in a wall (wall surface at z, bottom at y0 = 0): plank door with an arched head, jambs, iron straps and a step. */
export function doorAt(mb: MB, rnd: Rng, x: number, z: number, o: { w?: number; h?: number; col?: number; jamb?: number; step?: boolean; y0?: number; ring?: boolean } = {}) {
  const w = o.w ?? 0.6, h = o.h ?? 1.15, r = w / 2, y0 = o.y0 ?? 0, col = o.col ?? PAL.wood[1], jam = o.jamb ?? PAL.stoneL;
  const pts: Array<[number, number]> = [[-w / 2, 0], [w / 2, 0]];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI; pts.push([Math.cos(a) * r, h - r + Math.sin(a) * r]); }
  mb.plate(PAL.woodDD, pts, 0.05, x, y0, z + 0.012, 0, 0, 0, 0, { tier: 0, noAO: true, jit: 0 });
  for (let i = 0; i < 5; i++) { // vertical boards
    const bx = -w / 2 + (i + 0.5) * w / 5, top = i === 0 || i === 4 ? h - r * 0.45 : i === 1 || i === 3 ? h - r * 0.12 : h - 0.0;
    mb.box(i % 2 ? col : rnd.pick(PAL.plank), w / 5 - 0.012, top - 0.02, 0.03, x + bx, y0 + (top - 0.02) / 2 + 0.01, z + 0.032, 0, 0, 0, { tier: 1, jit: 0.06 });
  }
  for (const yy of [h * 0.28, h * 0.66]) mb.box(PAL.iron, w * 1.02, 0.06, 0.03, x, y0 + yy, z + 0.055, 0, 0, 0, { tier: 1, mat: "metal" });
  if (o.ring !== false) mb.torus(PAL.iron, 0.035, 0.008, x + w * 0.28, y0 + h * 0.46, z + 0.065, 0, 0, 0, 4, 10, { tier: 2, mat: "metal" });
  for (const sg of [-1, 1]) mb.box(jam, 0.1, h - r + 0.05, 0.11, x + sg * (w / 2 + 0.05), y0 + (h - r + 0.05) / 2, z + 0.04, 0, 0, 0, { tier: 1 });
  for (let i = 0; i < 7; i++) { // arch stones
    const a = (i / 6) * PI, rr = r + 0.07;
    mb.box(i % 2 ? jam : PAL.stone[2], 0.11, 0.13, 0.12, x + Math.cos(a) * rr, y0 + h - r + Math.sin(a) * rr, z + 0.04, 0, 0, a - PI / 2, { tier: 1 });
  }
  if (o.step !== false) mb.box(PAL.stone[1], w + 0.35, 0.09, 0.3, x, y0 + 0.045, z + 0.15, 0, 0, 0, { tier: 1 });
}

// ------------------------------------------------------------------------------------------------------------------ small props
export function lantern(mb: MB, x: number, y: number, z: number, o: { tier?: number; hang?: number; size?: number } = {}) {
  const s = o.size ?? 1, t = o.tier ?? 1;
  if (o.hang) mb.box(PAL.iron, 0.014 * s, o.hang, 0.014 * s, x, y + 0.15 * s + o.hang / 2, z, 0, 0, 0, { tier: t, mat: "metal" });
  mb.box(PAL.iron, 0.18 * s, 0.03 * s, 0.18 * s, x, y - 0.115 * s, z, 0, 0, 0, { tier: t, mat: "metal" });
  mb.box(PAL.glow, 0.14 * s, 0.2 * s, 0.14 * s, x, y, z, 0, 0, 0, { tier: t, mat: "lamp", noAO: true, jit: 0 });
  mb.cone(PAL.iron, 0.13 * s, 0.1 * s, x, y + 0.15 * s, z, 4, 0, PI / 4, 0, { tier: t, mat: "metal" });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(PAL.iron, 0.012 * s, 0.2 * s, 0.012 * s, x + sx * 0.07 * s, y, z + sz * 0.07 * s, 0, 0, 0, { tier: t, mat: "metal" });
}

export function barrel(mb: MB, x: number, y0: number, z: number, o: { r?: number; h?: number; tier?: number; col?: number; lid?: boolean } = {}) {
  const r = o.r ?? 0.2, h = o.h ?? 0.42, t = o.tier ?? 1;
  mb.cyl(o.col ?? PAL.wood[0], r * 0.88, r * 0.88, h, x, y0 + h / 2, z, 10, 0, 0, 0, { tier: t });
  mb.cyl(o.col ?? PAL.wood[2], r * 1.06, r * 1.06, h * 0.5, x, y0 + h / 2, z, 10, 0, 0, 0, { tier: t });
  for (const f of [0.14, 0.86]) mb.cyl(PAL.iron, r * 0.98, r * 0.98, 0.03, x, y0 + h * f, z, 10, 0, 0, 0, { tier: t, mat: "metal" });
  if (o.lid !== false) mb.cyl(PAL.wood[1], r * 0.8, r * 0.8, 0.02, x, y0 + h + 0.005, z, 10, 0, 0, 0, { tier: t });
}

export function crate(mb: MB, x: number, y0: number, z: number, s = 0.32, ry = 0, o: { tier?: number; col?: number } = {}) {
  const t = o.tier ?? 1, c = o.col ?? PAL.plank[1];
  mb.push(x, y0, z, ry);
  mb.bar(c, s, s, s, 0, 0, 0, 0, { tier: t });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.bar(PAL.wood[1], s * 0.1, s * 1.02, s * 0.1, sx * s * 0.46, -0.005, sz * s * 0.46, 0, { tier: t });
  mb.bar(PAL.wood[1], s * 1.02, s * 0.1, s * 1.02, 0, s * 0.44, 0, 0, { tier: t });
  mb.pop();
}

export function sack(mb: MB, x: number, y0: number, z: number, o: { s?: number; col?: number; tier?: number; ry?: number } = {}) {
  const s = o.s ?? 0.2, t = o.tier ?? 2, c = o.col ?? 0xb59a6a;
  mb.sphere(c, s, x, y0 + s * 0.78, z, 1, 1.1, 0.9, 7, 5, { tier: t, jit: 0.08 });
  mb.cone(c, s * 0.42, s * 0.5, x, y0 + s * 1.7, z, 6, 0, 0, 0, { tier: t, jit: 0.08 });
  mb.torus(PAL.wood[1], s * 0.3, 0.012, x, y0 + s * 1.38, z, PI / 2, 0, 0, 4, 8, { tier: t });
}

export function hayBale(mb: MB, x: number, y0: number, z: number, ry = 0, tier = 1) {
  mb.push(x, y0, z, ry);
  mb.bar(0xd6b559, 0.58, 0.34, 0.38, 0, 0, 0, 0, { tier, jit: 0.1 });
  for (const sx of [-0.15, 0.15]) mb.bar(PAL.wood[1], 0.02, 0.36, 0.4, sx, -0.01, 0, 0, { tier: 2 });
  mb.pop();
}

/** A stack of logs seen end-on (axis along z). */
export function woodPile(mb: MB, rnd: Rng, x: number, y0: number, z: number, ry = 0, rows = 3, len = 0.5, tier = 1) {
  mb.push(x, y0, z, ry);
  for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) {
    const lx = (i - (rows - r - 1) / 2) * 0.17, ly = 0.075 + r * 0.15;
    mb.cyl(rnd.pick(PAL.wood), 0.072, 0.072, len, lx, ly, 0, 7, PI / 2, 0, 0, { tier, jit: 0.08 });
    mb.cyl(0xc8a46e, 0.062, 0.062, 0.01, lx, ly, len / 2 + 0.003, 7, PI / 2, 0, 0, { tier: 2, noAO: true });
  }
  mb.pop();
}

/** A fence from (x1,z1) to (x2,z2): posts every ~0.7 and two rails. */
export function fence(mb: MB, rnd: Rng, x1: number, z1: number, x2: number, z2: number, h = 0.5, o: { tier?: number; col?: number; gap?: number[] } = {}) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 0.7)), t = o.tier ?? 1, c = o.col ?? PAL.wood[0];
  const gap = o.gap;
  for (let i = 0; i <= n; i++) {
    const f = i / n, px = x1 + (x2 - x1) * f, pz = z1 + (z2 - z1) * f;
    mb.bar(c, 0.07, h + rnd.range(-0.03, 0.05), 0.07, px, 0, pz, 0, { tier: t, jit: 0.08 });
    mb.pyramid(c, 0.07, 0.07, 0.04, px, h + 0.0, pz, 0, { tier: t });
  }
  for (let i = 0; i < n; i++) {
    const f0 = i / n, f1 = (i + 1) / n;
    if (gap && ((f0 + f1) / 2 > gap[0] && (f0 + f1) / 2 < gap[1])) continue;
    for (const hy of [h * 0.35, h * 0.78]) mb.beam(PAL.wood[2], 0.04, x1 + (x2 - x1) * f0, hy, z1 + (z2 - z1) * f0, x1 + (x2 - x1) * f1, hy + rnd.range(-0.02, 0.02), z1 + (z2 - z1) * f1, { tier: t });
  }
}

/** A small leafy shrub that moves in the wind. */
export function bush(mb: MB, rnd: Rng, x: number, y0: number, z: number, r = 0.25, o: { tier?: number; cols?: number[]; flowers?: number } = {}) {
  const cols = o.cols ?? [0x2f6a2a, 0x3a7a30, 0x2a5a26], t = o.tier ?? 2;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rnd.range(0, 1), rr = r * rnd.range(0.55, 0.8);
    mb.blob(rnd.pick(cols), rr, x + Math.cos(a) * r * 0.45, y0 + rr * 0.75, z + Math.sin(a) * r * 0.45, 1.1, 0.85, 1.1, 1, rnd.range(0, 6), { tier: t, mat: "sway", sway: 0.8, swayY0: y0, swayH: r * 1.6, noAO: true });
  }
  if (o.flowers) for (let i = 0; i < o.flowers; i++) {
    const a = rnd.range(0, 6.28), d = r * rnd.range(0.2, 0.9);
    mb.blob(rnd.pick([0xf0c040, 0xe86aa8, 0xffffff, 0xd8283a]), 0.04, x + Math.cos(a) * d, y0 + r * rnd.range(0.7, 1.2), z + Math.sin(a) * d, 1, 1, 1, 0, 0, { tier: 2, noAO: true });
  }
}

/** Hanging vines that sway (weight grows downwards). */
export function vines(mb: MB, rnd: Rng, x: number, top: number, z: number, n: number, spread: number, minLen = 0.4, maxLen = 1.2, o: { ry?: number; tier?: number } = {}) {
  mb.push(x, 0, z, o.ry ?? 0);
  for (let i = 0; i < n; i++) {
    const vx = rnd.range(-spread, spread), len = rnd.range(minLen, maxLen);
    mb.box(rnd.pick(PAL.moss), 0.04, len, 0.04, vx, top - len / 2, 0, 0, 0, 0, { tier: o.tier ?? 1, mat: "sway", sway: 1, swayY0: top - len, swayH: len, swayInv: true, noAO: true });
    mb.blob(rnd.pick(PAL.moss), 0.05, vx, top - len, 0.0, 1, 1.3, 0.5, 0, 0, { tier: 2, mat: "sway", sway: 1, swayY0: top - len, swayH: len, swayInv: true, noAO: true });
  }
  mb.pop();
}

/** Moss and ivy patches on a wall (wall surface at z). */
export function ivy(mb: MB, rnd: Rng, x: number, y0: number, z: number, w: number, h: number, o: { n?: number; tier?: number } = {}) {
  const n = o.n ?? 14;
  for (let i = 0; i < n; i++) {
    const f = Math.pow(rnd.next(), 0.8), px = x + rnd.range(-w / 2, w / 2), py = y0 + h * f, s = rnd.range(0.05, 0.11);
    mb.blob(rnd.pick(PAL.moss), s, px, py, z + 0.03, 1.3, 1, 0.35, 0, rnd.range(0, 6), { tier: o.tier ?? 2, mat: "sway", sway: 0.5, swayY0: y0, swayH: h, noAO: true });
  }
}

/** A round shield with a boss, hung on a wall or parapet facing +z. */
export function roundShield(mb: MB, x: number, y: number, z: number, color: number, r = 0.26, tier = 1) {
  mb.cyl(color, r, r, 0.045, x, y, z, 14, PI / 2, 0, 0, { tier, noAO: true });
  mb.torus(PAL.steel, r, 0.018, x, y, z + 0.02, 0, 0, 0, 5, 16, { tier, mat: "metal" });
  mb.sphere(PAL.steel, r * 0.26, x, y, z + 0.03, 1, 1, 0.55, 8, 5, { tier, mat: "metal" });
  mb.box(0xf0f0f0, r * 1.5, r * 0.22, 0.02, x, y, z + 0.026, 0, 0, 0, { tier: 2, noAO: true });
}

/** A hanging cloth bracket: wall plate + horizontal pole (the cloth itself is a flag, see anim.ts). */
export function bracket(mb: MB, x: number, y: number, z: number, len = 0.5, tier = 1) {
  mb.box(PAL.iron, 0.07, 0.07, 0.07, x, y, z, 0, 0, 0, { tier, mat: "metal" });
  mb.beam(PAL.iron, 0.03, x, y, z, x, y, z + len, { tier, mat: "metal" });
  mb.beam(PAL.iron, 0.025, x, y - 0.18, z, x, y, z + len * 0.8, { tier, mat: "metal" });
}

/** A ground patch of worn stone slabs (a path to a door). */
export function slabs(mb: MB, rnd: Rng, x: number, z0: number, z1: number, w = 0.7, tier = 1) {
  for (let z = z0; z < z1; z += 0.42) mb.box(rnd.pick([0x8b867a, 0x7d786d, 0x948e80]), w * rnd.range(0.8, 1.25), 0.04, 0.36, x + rnd.range(-0.1, 0.1), 0.02, z, 0, rnd.range(-0.2, 0.2), 0, { tier, noAO: true });
}
