// @ts-nocheck
import type * as THREE_NS from "three";
import { MB } from "../../world/infinite/mb";
import { Rng, fbm } from "../../world/infinite/rng";
import type { TrackPath } from "./path";
import type { F1Env } from "./env";
import type { F1Features } from "./gfx";
import { asphaltTexture, checkerTexture, gridTexture, stripeTexture, fenceTexture, boardTextures, garageTexture, grassTexture } from "./tex";
import { makeKit } from "./car";
import { createSky, createClouds } from "./sky";

type T3 = typeof THREE_NS;

import { ROAD_HALF, WALL_D, KERB_W, SHOULDER } from "./consts";
export { ROAD_HALF, WALL_D };
const WATER = -6.5;
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const circ = (a: number, b: number) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };

export interface F1World {
  group: any;
  sky: any;
  sunDir: any;
  groundY(x: number, z: number): number;
  update(dt: number, cam: any): void;
  dispose(): void;
  /** Knock a stretch of barrier (and its fence) out between two lap fractions on one side (+1 right, -1 left). */
  breakBarrier(side: number, u0: number, u1: number): void;
  /** Put every broken barrier back. */
  repair(): void;
}

interface RibbonOpts {
  d0: (i: number) => number; d1: (i: number) => number;
  y0?: (i: number) => number; y1?: (i: number) => number;
  c0?: (i: number) => number[]; c1?: (i: number) => number[];
  uv?: (k: number, s: number) => number[];
  skip?: (k: number) => boolean;
}

/**
 * A strip along the whole circuit between two lateral distances (right of the road is positive). The loop is closed with one extra pair of
 * vertices so that the texture coordinates (which follow the distance along the road) do not jump at the start line.
 * Quads wind so that the front face looks up when d1 > d0.
 */
function ribbon(T: T3, path: TrackPath, o: RibbonOpts) {
  const n = path.n, m = n + 1, pos = new Float32Array(m * 6), col = new Float32Array(m * 6), uv = new Float32Array(m * 4), idx: number[] = [];
  const white = [1, 1, 1];
  for (let k = 0; k < m; k++) {
    const i = k % n, x = path.px[i]!, y = path.py[i]!, z = path.pz[i]!, rx = -path.fz[i]!, rz = path.fx[i]!;
    for (let s = 0; s < 2; s++) {
      let d = s ? o.d1(i) : o.d0(i);
      // on the inside of a tight bend nothing may sit farther out than the bend's own radius, or the strip would fold over itself
      const kp = path.kap[i]!;
      if (kp * d > 0) { const lim = Math.max(0.8, 1 / Math.abs(kp) - 0.8); if (Math.abs(d) > lim) d = d < 0 ? -lim : lim; }
      const dy = (s ? o.y1 : o.y0)?.(i) ?? 0, cf = s && o.c1 ? o.c1 : o.c0, c = cf ? cf(i) : white, q = (k * 2 + s) * 3;
      pos[q] = x + rx * d; pos[q + 1] = y + dy; pos[q + 2] = z + rz * d;
      col[q] = c[0]!; col[q + 1] = c[1]!; col[q + 2] = c[2]!;
      const t = o.uv ? o.uv(k, s) : [s, path.arc[k]! / 7];
      uv[(k * 2 + s) * 2] = t[0]!; uv[(k * 2 + s) * 2 + 1] = t[1]!;
    }
  }
  const quadStart = new Int32Array(n).fill(-1);       // where each quad's six indices sit (a crash can knock a piece out of a barrier)
  for (let k = 0; k < n; k++) {
    if (o.skip && o.skip(k)) continue;
    const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
    quadStart[k] = idx.length;
    idx.push(a, b, c, c, b, d);
  }
  const g = new T.BufferGeometry();
  g.userData.quadStart = quadStart;
  g.setAttribute("position", new T.BufferAttribute(pos, 3));
  g.setAttribute("color", new T.BufferAttribute(col, 3));
  g.setAttribute("uv", new T.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const rgb = (T: T3, hex: number) => { const c = new T.Color(hex); return [c.r, c.g, c.b]; };
const mixc = (a: number[], b: number[], t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];
const hexStr = (n: number) => "#" + n.toString(16).padStart(6, "0");

/** Textured quads (each [x,y,z] x four corners) merged into one geometry. */
function quadGeo(T: T3, quads: number[][]) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  quads.forEach((q, k) => {
    for (let c = 0; c < 4; c++) pos.push(q[c * 3]!, q[c * 3 + 1]!, q[c * 3 + 2]!);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
  });
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildWorld(T: T3, path: TrackPath, env: F1Env, f: F1Features): F1World {
  const group = new T.Group(), kit = makeKit(T), rnd = new Rng(env.seed * 31 + 5);
  const disposables: any[] = [];
  const own = <A>(a: A): A => { disposables.push(a); return a; };
  const n = path.n, sh = f.shadow > 0;
  const gA = rgb(T, env.grassA), gB = rgb(T, env.grassB), gFar = rgb(T, env.grassFar), gravel = rgb(T, env.gravel);
  const kap = (i: number) => path.kap[i % n]!;

  // corners: where the curvature is among the highest on this circuit (so every map gets kerbs and gravel in its own bends)
  const ks = Array.from(path.kap, (v) => Math.abs(v)).sort((a, b) => a - b);
  const kLo = ks[Math.floor(n * 0.5)]!, kHi = Math.max(ks[Math.floor(n * 0.82)]!, kLo * 1.25 + 0.002);
  const corner = (i: number) => smooth(kLo, kHi, Math.abs(kap(i)));
  const mow = (i: number) => (Math.floor(path.arc[i % n]! / 18) & 1 ? gA : gB);
  const cr = path.crossings[0];
  const underBridge = (i: number) => !!cr && circ(i / n, cr[1]) < 0.035;

  // ------------------------------------------------------------------------------------------------ ground
  const nxz = (x: number, z: number) => fbm(x * 0.0045 + env.seed, z * 0.0045 - env.seed, env.seed, 4);
  const margin = 95;
  const lines = (lo: number, hi: number) => {
    const out: number[] = [];
    for (let v = lo - margin; v <= hi + margin; v += f.cell) out.push(v);
    let step = f.cell * 1.5, a = out[0]!, b = out[out.length - 1]!;
    for (let k = 0; k < 12; k++) { a -= step; b += step; out.unshift(a); out.push(b); step *= 1.45; }
    return out;
  };
  const xs = lines(path.minX, path.maxX), zs = lines(path.minZ, path.maxZ), NX = xs.length, NZ = zs.length;
  const gh = new Float32Array(NX * NZ), gpos = new Float32Array(NX * NZ * 3), gcol = new Float32Array(NX * NZ * 3), guv = new Float32Array(NX * NZ * 2);
  const tmp = { d: 0, h: 0, i: 0, side: 1 };
  const sand = rgb(T, 0xcdbf8c);
  for (let a = 0; a < NX; a++) for (let b = 0; b < NZ; b++) {
    const x = xs[a]!, z = zs[b]!, k = a * NZ + b;
    path.nearest(x, z, tmp);
    const far = (nxz(x, z) - 0.45) * 46;
    const blend = 1 - smooth(16, 80, tmp.d);
    const y = far + (tmp.h - 0.35 - far) * blend;
    gh[k] = y;
    gpos[k * 3] = x; gpos[k * 3 + 1] = y; gpos[k * 3 + 2] = z; guv[k * 2] = x * 0.09; guv[k * 2 + 1] = z * 0.09;
    const near = 1 - smooth(20, 70, tmp.d);
    const nz = fbm(x * 0.03, z * 0.03, 9, 3);
    let c = mixc(gFar, mow(tmp.i), near);
    const forest = fbm(x * 0.02 + 40, z * 0.02, 4, 3) > 0.52 ? 0.84 : 1;
    const v = (0.9 + nz * 0.22) * forest;
    c = [c[0]! * v, c[1]! * v, c[2]! * v];
    if (y < WATER + 1.2) c = mixc(c, sand, smooth(WATER + 1.2, WATER - 0.4, y));
    gcol[k * 3] = c[0]!; gcol[k * 3 + 1] = c[1]!; gcol[k * 3 + 2] = c[2]!;
  }
  const gidx: number[] = [];
  for (let a = 0; a < NX - 1; a++) for (let b = 0; b < NZ - 1; b++) {
    const i00 = a * NZ + b, i01 = i00 + 1, i10 = (a + 1) * NZ + b, i11 = i10 + 1;
    gidx.push(i00, i01, i10, i10, i01, i11);
  }
  const gg = own(new T.BufferGeometry());
  gg.setAttribute("position", new T.BufferAttribute(gpos, 3)); gg.setAttribute("color", new T.BufferAttribute(gcol, 3)); gg.setAttribute("uv", new T.BufferAttribute(guv, 2));
  gg.setIndex(new T.BufferAttribute(new Uint32Array(gidx), 1)); gg.computeVertexNormals();
  const terrain = new T.Mesh(gg, own(new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: grassTexture(T) })));
  terrain.receiveShadow = sh; group.add(terrain);
  const bsearch = (arr: number[], v: number) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m]! <= v) lo = m; else hi = m; } return lo; };
  const groundY = (x: number, z: number) => {
    const a = bsearch(xs, x), b = bsearch(zs, z), x0 = xs[a]!, x1 = xs[a + 1]!, z0 = zs[b]!, z1 = zs[b + 1]!;
    const tx = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))), tz = Math.max(0, Math.min(1, (z - z0) / (z1 - z0)));
    const h00 = gh[a * NZ + b]!, h01 = gh[a * NZ + b + 1]!, h10 = gh[(a + 1) * NZ + b]!, h11 = gh[(a + 1) * NZ + b + 1]!;
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  };
  // lakes where the far hills sink low
  const water = new T.Mesh(own(new T.PlaneGeometry(9000, 9000)), own(new T.MeshPhongMaterial({ color: 0x2f6f9a, transparent: true, opacity: 0.88, shininess: 90, specular: 0xbad4ea, flatShading: true })));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER, 0); group.add(water);

  // ------------------------------------------------------------------------------------------------ road, kerbs, run-off
  // the tarmac is a real PBR surface: a little sheen towards the sun and the sky, and a bump from the grain of the asphalt
  const roadMat = f.reflect
    ? new T.MeshStandardMaterial({ map: asphaltTexture(T), bumpMap: asphaltTexture(T), bumpScale: 1.4, roughness: 0.62, metalness: 0, envMapIntensity: 0.45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    : new T.MeshLambertMaterial({ map: asphaltTexture(T), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const road = new T.Mesh(own(ribbon(T, path, { d0: () => -ROAD_HALF, d1: () => ROAD_HALF })), own(roadMat));
  road.receiveShadow = sh; group.add(road);

  const kerbMat = own(new T.MeshLambertMaterial({ map: stripeTexture(T, "#d2262d", "#f0f0f2"), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  for (const side of [1, -1]) {
    const w = (i: number) => KERB_W * corner(i);
    const g = ribbon(T, path, {
      d0: (i) => side * (side > 0 ? ROAD_HALF - 0.05 : ROAD_HALF + w(i)), d1: (i) => side * (side > 0 ? ROAD_HALF + w(i) : ROAD_HALF - 0.05),
      y0: () => (side > 0 ? 0.035 : 0.012), y1: () => (side > 0 ? 0.012 : 0.035), uv: (k, s) => [s, path.arc[k]! / 2.8],
    });
    const m = new T.Mesh(own(g), kerbMat); m.receiveShadow = sh; group.add(m);
  }
  const shMat = own(new T.MeshLambertMaterial({ vertexColors: true, map: grassTexture(T), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  for (const side of [1, -1]) {
    const outside = (i: number) => (kap(i) * side < 0 ? 1 : 0);   // the outer side of a corner: gravel
    const g = ribbon(T, path, {
      d0: (i) => side * (side > 0 ? ROAD_HALF + KERB_W * corner(i) - 0.05 : SHOULDER), d1: (i) => side * (side > 0 ? SHOULDER : ROAD_HALF + KERB_W * corner(i) - 0.05),
      y0: () => -0.02, y1: () => -0.02, c0: (i) => mixc(mow(i), gravel, corner(i) * outside(i)),
    });
    const m = new T.Mesh(own(g), shMat); m.receiveShadow = sh; group.add(m);
  }

  // ------------------------------------------------------------------------------------------------ barriers, fences, bridge deck
  const breakables: Record<string, Array<{ geo: any; backup: any }>> = { "1": [], "-1": [] };
  const breakable = (side: number, geo: any) => breakables[String(side)]!.push({ geo, backup: geo.index.array.slice() });
  const wallMat = own(new T.MeshLambertMaterial({ map: stripeTexture(T, "#f0f0f2", hexStr(env.id === "technical" ? 0xe0a458 : 0xd2262d)), vertexColors: true, side: T.DoubleSide }));
  const capMat = own(new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  const tyre = rgb(T, 0x1b1c20), cap = rgb(T, 0xb7bcc3), conc = rgb(T, 0x8d9096);
  for (const side of [1, -1]) {
    const dark = (i: number) => { const g = corner(i) * (kap(i) * side < 0 ? 0.88 : 0); return mixc([1, 1, 1], tyre, g); };
    const face = ribbon(T, path, { d0: () => side * WALL_D, d1: () => side * WALL_D, y0: () => -0.4, y1: () => 1.05, c0: dark, uv: (k) => [0.5, path.arc[k]! / 12] });
    const top = ribbon(T, path, { d0: () => side * (WALL_D - 0.25), d1: () => side * (WALL_D + 0.25), y0: () => 1.05, y1: () => 1.05, c0: () => cap });
    const m1 = new T.Mesh(own(face), wallMat), m2 = new T.Mesh(own(top), capMat);
    for (const m of [m1, m2]) { m.castShadow = sh; m.receiveShadow = sh; group.add(m); }
    breakable(side, face); breakable(side, top);
  }
  // where the road is lifted well above the ground (the bridge of a figure-eight) it gets an underside and a concrete beam
  if (cr) {
    const lift = (i: number) => path.py[i % n]! - groundY(path.px[i % n]!, path.pz[i % n]!);
    const low = (k: number) => lift(k) < 0.9 && lift(k + 1) < 0.9;
    const deck = ribbon(T, path, { d0: () => -WALL_D, d1: () => WALL_D, y0: () => -0.55, y1: () => -0.55, c0: () => conc, skip: low });
    const m = new T.Mesh(own(deck), own(new T.MeshLambertMaterial({ vertexColors: true, side: T.BackSide })));
    m.castShadow = sh; group.add(m);
    for (const side of [1, -1]) {
      const beam = ribbon(T, path, { d0: () => side * WALL_D, d1: () => side * WALL_D, y0: () => -1.7, y1: () => -0.4, c0: () => conc, skip: low });
      group.add(new T.Mesh(own(beam), capMat));
    }
  }
  if (f.fence) {
    // with multisampling the mesh fades smoothly into the distance (alpha to coverage); without it the plain cut-out is used
    const fm = own(new T.MeshBasicMaterial({ map: fenceTexture(T), alphaTest: f.msaa ? 0 : 0.5, alphaToCoverage: f.msaa > 0, side: T.DoubleSide, color: 0x9aa2ac }));
    const mb = new MB(T, 5); mb.ao = { y0: -9, h: 1, k: 0 }; mb.jitter = 0.01;
    for (const side of [1, -1]) {
      const g = ribbon(T, path, { d0: () => side * (WALL_D + 0.1), d1: () => side * (WALL_D + 0.1), y0: () => 1.1, y1: () => 3.5, uv: (k, s) => [path.arc[k]! / 1.4, s * 2], skip: underBridge });
      group.add(new T.Mesh(own(g), fm)); breakable(side, g);
      for (let i = 0; i < n; i += 11) if (!underBridge(i)) mb.bar(0x70767e, 0.14, 3.5, 0.14, path.px[i]! - path.fz[i]! * side * (WALL_D + 0.1), path.py[i]!, path.pz[i]! + path.fx[i]! * side * (WALL_D + 0.1));
    }
    const m = mb.build(kit, false); m.traverse((o: any) => { o.castShadow = false; }); group.add(m);
  }

  // ------------------------------------------------------------------------------------------------ start line, grid and gantry
  {
    const chk = ribbon(T, path, { d0: () => -ROAD_HALF, d1: () => ROAD_HALF, y0: () => 0.04, y1: () => 0.04, uv: (k, s) => [s, k === 0 ? 0 : 1], skip: (k) => k !== 0 });
    group.add(new T.Mesh(own(chk), own(new T.MeshLambertMaterial({ map: checkerTexture(T), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))));
    const G = Math.min(n - 2, Math.ceil(48 / (path.total / n)));
    const grid = ribbon(T, path, { d0: () => -ROAD_HALF, d1: () => ROAD_HALF, y0: () => 0.035, y1: () => 0.035, uv: (k, s) => [s, k / G], skip: (k) => k >= G });   // the rivals line up ahead of the player's start
    group.add(new T.Mesh(own(grid), own(new T.MeshLambertMaterial({ map: gridTexture(T), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))));
  }
  const placed: Array<{ x: number; z: number; r: number }> = [{ x: path.px[0]!, z: path.pz[0]!, r: 60 }];
  const props = new MB(T, 91); props.ao = { y0: 0, h: 1.2, k: 0.2 }; props.jitter = 0.03;
  const lampMB = new MB(T, 92); lampMB.ao = { y0: -9, h: 1, k: 0 }; lampMB.jitter = 0;
  {
    const s = path.at(0.5 / n), yaw = Math.atan2(s.fx, s.fz), hw = ROAD_HALF + 2.4;
    props.push(s.x, s.y, s.z, yaw);
    for (const sd of [-1, 1]) { props.box(0x24282f, 1.1, 7.6, 1.1, sd * hw, 3.8, 0); props.box(0xd2262d, 1.3, 0.5, 1.3, sd * hw, 0.25, 0); }
    props.box(0x2c313a, hw * 2 + 1.1, 1.4, 1.5, 0, 7.6, 0);
    props.box(0xf2f2f4, hw * 2 + 1.1, 0.14, 1.54, 0, 8.37, 0);
    props.pop();
    lampMB.push(s.x, s.y, s.z, yaw);
    for (let k = 0; k < 5; k++) lampMB.box(0xff2a2a, 0.6, 0.38, 0.1, -2.4 + k * 1.2, 7.6, -0.78, 0, 0, 0, { mat: "lamp", noAO: true, jit: 0 });
    lampMB.pop();
  }

  // floodlight towers along the start straight
  for (const u of [0.9, 0.93, 0.96, 0.99, 0.03, 0.06]) {
    const s = path.at(u), d = (WALL_D + 2.2), x = s.x + s.rx * d, z = s.z + s.rz * d, gy = Math.max(s.y - 0.1, groundY(x, z));
    props.push(x, gy, z, Math.atan2(-s.rx, -s.rz));
    props.cyl(0x7a7f87, 0.11, 0.17, 11.5, 0, 5.75, 0, 6);
    props.box(0x2c313a, 1.5, 0.35, 0.8, 0, 11.6, -0.3); props.box(0xdfe3e7, 1.3, 0.12, 0.5, 0, 11.38, -0.35);
    lampMB.push(x, gy, z, Math.atan2(-s.rx, -s.rz)); lampMB.box(0xfff4d6, 1.2, 0.08, 0.42, 0, 11.3, -0.38, 0, 0, 0, { mat: "lamp", noAO: true, jit: 0 }); lampMB.pop();
    props.pop();
  }

  // ------------------------------------------------------------------------------------------------ pit building, grandstands, tyre walls, boards
  const built: Array<{ x: number; z: number; r: number }> = [];
  const ptmp = { d: 0, h: 0, i: 0, side: 1 };
  /** True when a box set `d` metres sideways of the road at lap position `u`, facing away from it, stays clear of every stretch of the circuit (also the ones that pass close by). */
  const clearOf = (u: number, d: number, side: number, x0: number, x1: number, depth: number) => {
    const s = path.at(u);
    for (let a = x0; a <= x1 + 0.1; a += 4) for (let z = 0; z <= depth + 0.1; z += 3) {
      const px = s.x + s.rx * d + s.fx * a + side * s.rx * z, pz = s.z + s.rz * d + s.fz * a + side * s.rz * z;
      path.nearest(px, pz, ptmp);
      if (ptmp.d < WALL_D + 3.5) return false;
    }
    return true;
  };
  /** Builds a building only where it fits; returns null (and builds nothing) where it would stand on the track or on another building. */
  const place = (mb: MB, u: number, d: number, side: number, r: number, x0: number, x1: number, depth: number, fn: () => void) => {
    u = ((u % 1) + 1) % 1;
    const s = path.at(u), x = s.x + s.rx * d, z = s.z + s.rz * d;
    if (!clearOf(u, d, side, x0, x1, depth)) return null;
    if (built.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r - 8) ** 2)) return null;
    built.push({ x, z, r });
    const gy = Math.min(Math.max(s.y - 0.1, groundY(x, z)), s.y + 0.2);
    // models face +z; the spectators look to -z, so +z must point away from the track
    mb.push(x, gy, z, Math.atan2(s.rx * side, s.rz * side)); fn(); mb.pop();
    placed.push({ x, z, r });
    return { x, z, y: gy, s };
  };
  const SEAT = [0x2a5ac8, 0xd2262d, 0xf0f0f2, 0xe8b830, 0x2ea05a];
  const stand = (mb: MB, len: number, rows: number, crowd: boolean) => {
    const rd = new Rng(Math.floor(len * 13 + rows));
    mb.box(0x70757d, len, 1.8, rows + 2, 0, -0.7, rows * 0.5 + 0.8);
    for (let r = 0; r < rows; r++) {
      const y = 0.4 + r * 0.55, z = 0.4 + r * 1.0;
      mb.box(0xa5aab2, len, y, 0.9, 0, y / 2, z + 0.1);
      for (let x = -len / 2 + 1.3; x < len / 2 - 0.6; x += 2.6) mb.box(SEAT[(Math.floor((x + len) / 2.6) + r * 2) % SEAT.length]!, 2.2, 0.16, 0.7, x, y + 0.08, z - 0.05);
      if (crowd) for (let x = -len / 2 + 0.7; x < len / 2 - 0.4; x += 0.95) if (rd.chance(0.62)) {
        mb.box(rd.pick([0xe8c39e, 0xc99870, 0x8a5a3c, 0xf5d5b5]), 0.3, 0.3, 0.3, x + rd.range(-0.1, 0.1), y + 0.82, z - 0.05);
        mb.box(rd.pick([0xd2262d, 0x2a5ac8, 0xf0f0f2, 0xe8b830, 0x1a1c20, 0x2ea05a]), 0.42, 0.42, 0.3, x + rd.range(-0.1, 0.1), y + 0.46, z - 0.05);
      }
    }
    const top = 0.4 + rows * 0.55 + 3.3, depth = rows * 1.0 + 1.6;
    for (const sx of [-1, 1]) for (const k of [0.15, 0.95]) mb.box(0x59606a, 0.35, top, 0.35, sx * (len / 2 - 0.4), top / 2, depth * k);
    mb.box(0xe9ecef, len + 1.2, 0.35, depth + 1.8, 0, top, depth * 0.55);
    mb.box(0xd2262d, len + 1.2, 0.5, 0.2, 0, top + 0.1, -0.9);
  };
  if (f.props > 0) {
    // the pit building near the start line, with its garage doors painted on the track side. It is moved along the straight, or to the other side,
    // until it stands clear of the track (some circuits loop back close to their start).
    let pb: any = null, pbSide = -1;
    search: for (const du of [0, -0.012, 0.012, -0.025, 0.025, -0.04, 0.04, -0.06, 0.06]) for (const sd of [-1, 1]) {
      pb = place(props, 0.972 + du, sd * (WALL_D + 8.5), sd, 40, -29, 37, 9.8, () => {
        props.box(0xdfe3e7, 56, 4.6, 8.5, 0, 2.3, 4.2); props.box(0x2c313a, 56.6, 0.5, 9.3, 0, 4.7, 4.2); props.box(0xd2262d, 56.6, 0.3, 9.3, 0, 5.05, 4.2);
        props.box(0xe9ecef, 10, 8.2, 9, 31.5, 4.1, 4.4); props.box(0x1a2a3a, 10.2, 1.7, 9.2, 31.5, 6.4, 4.4);
      });
      if (pb) { pbSide = sd; break search; }
    }
    if (pb) {
      const s = pb.s, e = -pbSide * 0.12;
      const px = pb.x + s.rx * e, pz = pb.z + s.rz * e, ax = s.fx * 28, az = s.fz * 28, y0 = pb.y + 0.3, y1 = pb.y + 4.1;
      group.add(new T.Mesh(own(quadGeo(T, [[px - ax, y0, pz - az, px + ax, y0, pz + az, px + ax, y1, pz + az, px - ax, y1, pz - az]])), own(new T.MeshLambertMaterial({ map: garageTexture(T), side: T.DoubleSide }))));
    }
  }
  const standCount = f.props === 0 ? 0 : f.props === 1 ? 3 : 6;
  for (let k = 0; k < standCount; k++) {
    const u0 = 0.1 + (k * 0.85) / Math.max(1, standCount) + rnd.range(-0.02, 0.02), len = 34 + (k % 2) * 8, rows = 6 + (k % 3), depth = rows + 2.5;
    // outside of the bend first: the cars come straight at the crowd; then the other side; then a little further along
    let done = false;
    for (const du of [0, -0.012, 0.012, -0.025, 0.025, -0.04, 0.04, -0.06, 0.06]) {
      const u = u0 + du, s = path.at(u), outer = s.kap > 0 ? -1 : 1;
      if (cr && (circ(u, cr[0]) < 0.06 || circ(u, cr[1]) < 0.06)) continue;
      for (const sd of [outer, -outer]) if (place(props, u, sd * (WALL_D + 9), sd, 26, -len / 2 - 1.5, len / 2 + 1.5, depth + 1.5, () => stand(props, len, rows, f.props >= 2))) { done = true; break; }
      if (done) break;
    }
  }
  if (f.props > 0) {
    // tyre walls on the outside of the sharpest corners
    for (let i = 0; i < n; i += 5) {
      if (corner(i) < 0.95 || (i * 7) % 11 !== 0 || underBridge(i)) continue;
      const side = kap(i) > 0 ? -1 : 1, s = path.at(i / n), d = side * (WALL_D - 1.5);
      props.push(s.x + s.rx * d, s.y, s.z + s.rz * d, Math.atan2(s.fx, s.fz));
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
        props.box(0x1b1c20, 0.9, 0.42, 0.9, a * 1.0 - 1, 0.21 + b * 0.44, 0, 0, a * 0.2, 0);
        if (b === 1) props.box(0xf0f0f2, 0.92, 0.1, 0.92, a * 1.0 - 1, 0.7, 0, 0, a * 0.2, 0, { jit: 0 });
      }
      props.pop();
    }
  }
  group.add(props.build(kit, sh));
  group.add(lampMB.build(kit, false));

  if (f.props > 0) {
    // sponsor boards in front of the walls (invented brands); the picture reads left to right when seen from the road
    const tex = boardTextures(T), per: number[][][] = tex.map(() => []);
    let b = 0;
    for (let m = 6; m < n; m += 19) for (const side of [1, -1]) {
      if (underBridge(m)) continue;
      const s = path.at(m / n), d = side * (WALL_D - 0.7), hw = 2.1, h0 = 0.12, h1 = 1.02;
      const ax = s.fx * hw, az = s.fz * hw, bx = s.x + s.rx * d, bz = s.z + s.rz * d, y = s.y;
      const q = side > 0
        ? [bx + ax, y + h0, bz + az, bx - ax, y + h0, bz - az, bx - ax, y + h1, bz - az, bx + ax, y + h1, bz + az]
        : [bx - ax, y + h0, bz - az, bx + ax, y + h0, bz + az, bx + ax, y + h1, bz + az, bx - ax, y + h1, bz - az];
      per[b % tex.length]!.push(q); b++;
    }
    per.forEach((qs, i) => { if (qs.length) group.add(new T.Mesh(own(quadGeo(T, qs)), own(new T.MeshBasicMaterial({ map: tex[i], side: T.DoubleSide, color: 0xdddddd })))); });
  }

  // ------------------------------------------------------------------------------------------------ trees: boxy, never round
  {
    const variants: MB[] = [];
    const leafPick = (r: Rng) => r.pick(env.leaves);
    for (let v = 0; v < 3; v++) {
      const r = new Rng(env.seed * 13 + v * 7), mb = new MB(T, 200 + v); mb.ao = { y0: 0, h: 5, k: 0.3 }; mb.jitter = 0.07;
      if (v < 2) { // broadleaf: a square trunk and three stepped cubes with a few loose blocks on the corners
        const h = 2.8 + v * 0.5;
        mb.bar(env.trunk, 0.55, h, 0.55, 0, 0, 0);
        mb.box(leafPick(r), 3.5 - v * 0.4, 1.8, 3.5 - v * 0.4, 0, h + 0.7, 0);
        mb.box(leafPick(r), 2.6, 1.6, 2.6, 0.2, h + 2.1, -0.1);
        mb.box(leafPick(r), 1.6, 1.3, 1.6, -0.1, h + 3.4, 0.1);
        for (let k = 0; k < 3; k++) mb.box(leafPick(r), 1.0, 0.9, 1.0, r.pick([-1.5, 1.5]), h + 0.5 + k * 0.7, r.pick([-1.4, 1.4]));
      } else { // pine: narrowing square tiers
        mb.bar(env.trunk, 0.5, 2.0, 0.5, 0, 0, 0);
        for (let k = 0; k < 4; k++) mb.box(k % 2 ? 0x347a44 : 0x2c6a3a, 3.4 - k * 0.7, 1.5, 3.4 - k * 0.7, 0, 2.2 + k * 1.25, 0);
        mb.box(0x347a44, 0.8, 0.9, 0.8, 0, 7.2, 0);
      }
      variants.push(mb);
    }
    const bush = new MB(T, 210); bush.ao = { y0: 0, h: 1, k: 0.2 };
    bush.box(0x4a8f3e, 1.7, 1.0, 1.7, 0, 0.5, 0); bush.box(0x5aa04a, 1.1, 0.8, 1.1, 0.3, 1.2, 0.1);
    variants.push(bush);
    const want = [0.42, 0.28, 0.2, 0.1].map((q) => Math.round(f.trees * q));
    const treeMat = own(new T.MeshLambertMaterial({ vertexColors: true }));
    const dummy = new T.Object3D(), col = new T.Color();
    variants.forEach((mb, vi) => {
      const root = mb.build(kit, false), geo = root.children[0].geometry;   // one material, so one mesh; its materials are the shared kit
      disposables.push(geo);
      const im = new T.InstancedMesh(geo, treeMat, want[vi]!);
      let made = 0;
      for (let tries = 0; made < want[vi]! && tries < want[vi]! * 14; tries++) {
        const x = rnd.range(path.minX - 170, path.maxX + 170), z = rnd.range(path.minZ - 170, path.maxZ + 170);
        const forest = fbm(x * 0.02 + 40, z * 0.02, 4, 3) > 0.5;
        if (!forest && !rnd.chance(0.3)) continue;
        path.nearest(x, z, tmp);
        if (tmp.d < WALL_D + 8 || tmp.d > 170) continue;
        if (!forest && tmp.d > 40) continue;
        if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r)) continue;
        const gy = groundY(x, z);
        if (gy < WATER + 0.8) continue;
        const sc = vi === 3 ? rnd.range(0.7, 1.4) : rnd.range(0.85, 1.6);
        dummy.position.set(x, gy - 0.1, z); dummy.rotation.set(0, rnd.int(0, 3) * Math.PI / 2, 0); dummy.scale.set(sc, sc * rnd.range(0.9, 1.25), sc); dummy.updateMatrix();
        im.setMatrixAt(made, dummy.matrix);
        col.setScalar(rnd.range(0.82, 1.12)); im.setColorAt(made, col);
        made++;
      }
      im.count = made; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = sh && vi < 3; im.receiveShadow = false; im.frustumCulled = false;
      group.add(im);
    });
  }

  // ------------------------------------------------------------------------------------------------ mountains far away (stacked boxes, tinted toward the haze)
  if (f.hills) {
    const mb = new MB(T, 300); mb.ao = { y0: -99, h: 1, k: 0 }; mb.jitter = 0.03;
    const r = new Rng(env.seed * 5 + 1), haze = new T.Color(env.fog), hillA = new T.Color(env.hillA), hillB = new T.Color(env.hillB);
    const N = 38, TIERS = 6, wood = new T.Color(env.leaves[0]).lerp(hillA, 0.55);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 + r.range(-0.05, 0.05), R = r.range(1000, 1400), w = r.range(300, 560);
      const h = r.range(55, 150) * (0.65 + 0.7 * fbm(Math.cos(a) * 3 + env.seed, Math.sin(a) * 3, 3, 2));
      mb.push(Math.cos(a) * R, -30, Math.sin(a) * R, -a + Math.PI / 2 + r.range(-0.3, 0.3));
      for (let t = 0; t < TIERS; t++) {
        const wt = w * (1 - t / (TIERS + 0.7)), ht = (h + 30) / TIERS, q = t / (TIERS - 1);
        const c = new T.Color().copy(wood).lerp(hillB, smooth(0.2, 0.9, q)).lerp(haze, 0.46 - q * 0.1);
        if (env.id === "complex" && t >= TIERS - 2) c.lerp(new T.Color(0xf4f8ff), 0.75);
        mb.box(c.getHex(), wt, ht * 1.03, wt * 0.8, (t % 2 ? 1 : -1) * t * 4, ht * (t + 0.5), 0);
      }
      mb.pop();
    }
    const hm = own(new T.MeshLambertMaterial({ vertexColors: true, fog: false }));
    const hmesh = mb.build({ ...kit, lit: hm }, false); hmesh.traverse((o: any) => { o.castShadow = false; o.receiveShadow = false; }); group.add(hmesh);
  }

  // ------------------------------------------------------------------------------------------------ sky and clouds
  const sky = createSky(T, env);
  const clouds = createClouds(T, kit, env, f.clouds);
  group.add(clouds.group);

  return {
    group, sky, sunDir: sky.sunDir, groundY,
    update(dt: number, cam: any) { clouds.update(dt, cam); },
    breakBarrier(side: number, u0: number, u1: number) {
      const k0 = Math.floor(u0 * n), k1 = Math.ceil(u1 * n);
      for (const b of breakables[String(side)] || []) {
        const qs = b.geo.userData.quadStart as Int32Array, arr = b.geo.index.array;
        for (let k = k0; k <= k1; k++) { const s = qs[((k % n) + n) % n]!; if (s >= 0) arr.fill(0, s, s + 6); }
        b.geo.index.needsUpdate = true;
      }
    },
    repair() {
      for (const side of ["1", "-1"]) for (const b of breakables[side]!) { b.geo.index.array.set(b.backup); b.geo.index.needsUpdate = true; }
    },
    dispose() {
      sky.dispose(); clouds.dispose();
      group.traverse((o: any) => { if (o.geometry && !o.isInstancedMesh) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
      disposables.forEach((d) => d.dispose && d.dispose());
      kit.list().forEach((m: any) => m.dispose());
    },
  };
}
