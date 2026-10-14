// @ts-nocheck
import type { Ctx } from "./types";
import { Rng, fbm, vnoise, clamp, lerp, smoothstep } from "./rng";
import { MB, applyTier } from "./mb";
import { addCave } from "./caves";
import { jungleFloorTexture, sandTexture, pathTexture } from "./tex";

/**
 * The Infinite island: about twice as wide as the original (a ring of sand around a jungle), drawn as a handful of merged meshes
 * instead of one mesh per block. The game still sees ordinary blocks: one stub per land cell in the engine's `world` map keeps
 * getGroundHeight(), the pathfinding grid and the placement checks working exactly as before.
 */
export const GRID = 160;
export const CENTER = { x: 80, z: 80 };
export const WATER_Y = 0.36;

export interface Obstacle { x: number; z: number; r: number; kind: "cave" | "rock" | "giant" }
export interface CaveSite { x: number; z: number; yaw: number; R: number; mouthX: number; mouthZ: number; pathStart: [number, number] }
export interface PathLine { pts: Array<[number, number]>; w: number; kind: "cave" | "trail" }

export interface Island {
  seed: number;
  cx: number; cz: number; G: number;
  land: Uint8Array;
  /** For land cells: distance in cells to the nearest water. */
  dWater: Float32Array;
  /** For water cells: distance in cells to the nearest land. */
  dLand: Float32Array;
  coastR(theta: number): number;
  isLand(x: number, z: number): boolean;
  obstacles: Obstacle[];
  caves: CaveSite[];
  paths: PathLine[];
  /** Sampled centre-line points of all paths, for "is this on a path" queries. */
  pathPts: Array<[number, number, number]>;
  pathDist(x: number, z: number): number;
  group: any;
  caveGroups: any[];
  shoreTex: any;
  dispose(): void;
}

class Block {
  userData: any;
  material: any = null;
  geometry: any = null;
  position: any;
  layers = { test: () => false };
  constructor(x: number, y: number, z: number, t: number) {
    this.userData = { x, y, z, typeIndex: t, inScene: false };
    this.position = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
  }
  raycast() {}
}

function chamfer(target: Uint8Array, N: number): Float32Array {
  const d = new Float32Array(N * N);
  for (let i = 0; i < d.length; i++) d[i] = target[i] ? 0 : 1e6;
  const D1 = 1, D2 = 1.4142;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; let v = d[i]!;
    if (x > 0) v = Math.min(v, d[i - 1]! + D1);
    if (z > 0) { v = Math.min(v, d[i - N]! + D1); if (x > 0) v = Math.min(v, d[i - N - 1]! + D2); if (x < N - 1) v = Math.min(v, d[i - N + 1]! + D2); }
    d[i] = v;
  }
  for (let z = N - 1; z >= 0; z--) for (let x = N - 1; x >= 0; x--) {
    const i = z * N + x; let v = d[i]!;
    if (x < N - 1) v = Math.min(v, d[i + 1]! + D1);
    if (z < N - 1) { v = Math.min(v, d[i + N]! + D1); if (x < N - 1) v = Math.min(v, d[i + N + 1]! + D2); if (x > 0) v = Math.min(v, d[i + N - 1]! + D2); }
    d[i] = v;
  }
  return d;
}

/** A closed, wobbly coastline: radius as a function of the angle (a periodic noise, different every run). */
export function makeCoast(seed: number) {
  const o1 = (seed % 97) * 0.37, o2 = (seed % 53) * 0.71;
  return (theta: number) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    const n = fbm(c * 1.6 + 11.3 + o1, s * 1.6 + 7.1 + o2, seed, 3) * 2 - 1;
    const m = vnoise(Math.cos(theta * 2) * 0.9 + 3 + o2, Math.sin(theta * 2) * 0.9 + 9 + o1, seed + 9) * 2 - 1;
    return 49.5 + 3.4 * n + 1.8 * m;
  };
}

function catmull(pts: Array<[number, number]>, step: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const P = (i: number) => pts[clamp(i, 0, pts.length - 1)]!;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

const hex = (T: any, v: number) => new T.Color(v);

export function buildIsland(ctx: Ctx, seed: number): Island {
  const { env, T } = ctx;
  const N = GRID, CX = CENTER.x, CZ = CENTER.z;
  const G = env.WB_GRASS_R as number;
  const rnd = new Rng(seed);
  const coast = makeCoast(seed);
  const group = new T.Group();
  group.name = "wb-island";

  // ---- land mask and the game's block stubs
  const land = new Uint8Array(N * N);
  const world: Map<string, any> = env.world;
  const key = (x: number, y: number, z: number) => x + "," + y + "," + z;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, r2 = dx * dx + dz * dz;
    if (r2 > 58 * 58) continue;
    if (Math.sqrt(r2) <= coast(Math.atan2(dz, dx))) {
      land[z * N + x] = 1;
      world.set(key(x, 0, z), new Block(x, 0, z, Math.sqrt(r2) > G ? 3 : 0));
    }
  }
  const water = new Uint8Array(N * N);
  for (let i = 0; i < water.length; i++) water[i] = land[i] ? 0 : 1;
  const dLand = chamfer(land, N);   // for water cells: distance to land
  const dWater = chamfer(water, N); // for land cells: distance to water
  const isLand = (x: number, z: number) => {
    const ix = Math.floor(x), iz = Math.floor(z);
    return ix >= 0 && iz >= 0 && ix < N && iz < N && land[iz * N + ix] === 1;
  };

  // ---- caves: three rocky mounds in the jungle ring, each facing the castle, with a stone path leading to the mouth
  const caves: CaveSite[] = [];
  const obstacles: Obstacle[] = [];
  const paths: PathLine[] = [];
  const a0 = rnd.range(0, Math.PI * 2);
  const CAVE_R = 3.4;
  for (let i = 0; i < 3; i++) {
    const a = a0 + (i * Math.PI * 2) / 3 + rnd.range(-0.4, 0.4);
    const r = rnd.range(30, 36);
    const x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r;
    const dx = -Math.cos(a), dz = -Math.sin(a);
    const zf = CAVE_R * 0.74;
    const mouthX = x + dx * zf, mouthZ = z + dz * zf;
    const site: CaveSite = { x, z, yaw: Math.atan2(dx, dz), R: CAVE_R, mouthX, mouthZ, pathStart: [mouthX + dx * 1.0, mouthZ + dz * 1.0] };
    caves.push(site);
    obstacles.push({ x, z, r: CAVE_R * 1.08, kind: "cave" });
    // the path to the castle clearing, bending a little
    const qx = CX + Math.cos(a) * 11, qz = CZ + Math.sin(a) * 11;
    const mx = (site.pathStart[0] + qx) / 2, mz = (site.pathStart[1] + qz) / 2;
    const side = rnd.range(-6, 6);
    paths.push({ pts: catmull([site.pathStart, [mx - dz * side, mz + dx * side], [qx, qz]], 1.4), w: 1.7, kind: "cave" });
  }
  // two trails that wander out to the beach
  for (let i = 0; i < 2; i++) {
    const a = a0 + Math.PI / 3 + i * Math.PI + rnd.range(-0.5, 0.5);
    const rEnd = coast(a) - 4.5;
    const p0: [number, number] = [CX + Math.cos(a) * 10.5, CZ + Math.sin(a) * 10.5];
    const p1: [number, number] = [CX + Math.cos(a + 0.35) * 24, CZ + Math.sin(a + 0.35) * 24];
    const p2: [number, number] = [CX + Math.cos(a - 0.25) * 36, CZ + Math.sin(a - 0.25) * 36];
    const p3: [number, number] = [CX + Math.cos(a) * rEnd, CZ + Math.sin(a) * rEnd];
    paths.push({ pts: catmull([p0, p1, p2, p3], 1.4), w: 1.5, kind: "trail" });
  }
  // loose rock clusters (obstacles too)
  const rockClusters: Array<{ x: number; z: number; n: number }> = [];
  for (let tries = 0, k = 0; k < 7 && tries < 200; tries++) {
    const a = rnd.range(0, Math.PI * 2), r = rnd.range(20, coast(a) - 3);
    const x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 5)) continue;
    k++;
    rockClusters.push({ x, z, n: rnd.int(3, 6) });
    obstacles.push({ x, z, r: 1.7, kind: "rock" });
  }

  // ---- sampled path points for distance queries
  const pathPts: Array<[number, number, number]> = [];
  paths.forEach((p) => p.pts.forEach((q) => pathPts.push([q[0], q[1], p.w])));
  const pathDist = (x: number, z: number) => {
    let best = 1e9;
    for (let i = 0; i < pathPts.length; i++) {
      const p = pathPts[i]!, d = Math.hypot(p[0] - x, p[1] - z) - p[2] * 0.5;
      if (d < best) best = d;
    }
    return best;
  };

  // ---- colours
  const cJ0 = hex(T, 0x3e7d31), cJ1 = hex(T, 0x72a447), cJ2 = hex(T, 0x2c5a2c), cMud = hex(T, 0x6b5232), cMoss = hex(T, 0x4b7a3c), cGreen = hex(T, 0x5f9444);
  const cS0 = hex(T, 0xe6d6a2), cS1 = hex(T, 0xd5c08a), cWet = hex(T, 0xb4a070), cS2 = hex(T, 0xf0e3b6);
  const tmp = new T.Color();
  const cornerColor = (x: number, z: number, sand: boolean, out: any) => {
    const n1 = fbm(x * 0.045, z * 0.045, 3, 3), n2 = fbm(x * 0.12 + 50, z * 0.12, 7, 3), n3 = fbm(x * 0.3, z * 0.3 + 9, 11, 2);
    const ix = clamp(Math.floor(x), 0, N - 1), iz = clamp(Math.floor(z), 0, N - 1);
    const dW = dWater[iz * N + ix]!;
    if (sand) {
      out.copy(cS0).lerp(cS1, n1).lerp(cS2, smoothstep(0.55, 0.85, n3) * 0.5);
      out.lerp(cWet, smoothstep(2.6, 0.2, dW) * 0.8);
      return out;
    }
    out.copy(cJ0).lerp(cJ1, n1).lerp(cJ2, smoothstep(0.5, 0.8, n2) * 0.8).lerp(cMoss, smoothstep(0.55, 0.9, n3) * 0.35);
    const mud = smoothstep(0.6, 0.78, n3 * 0.65 + n2 * 0.55);
    out.lerp(cMud, mud * 0.65);
    const r = Math.hypot(x - CX, z - CZ);
    out.lerp(cGreen, smoothstep(17, 5, r) * 0.45);                    // a lighter lawn around the castle
    const pd = pathDist(x, z);
    out.lerp(cMud, smoothstep(2.0, 0.2, pd) * 0.45);                  // trodden earth beside paths
    if (r > G - 4) out.lerp(cS1, smoothstep(G - 4, G + 1, r) * 0.55); // sand creeping into the grass
    return out;
  };

  // ---- top surfaces: jungle floor and sand, merged
  type Arr = { pos: number[]; nor: number[]; uv: number[]; col: number[]; idx: number[]; n: number };
  const mk = (): Arr => ({ pos: [], nor: [], uv: [], col: [], idx: [], n: 0 });
  const jungle = mk(), sandA = mk();
  const corner = new Map<number, [number, number, number]>();
  const cc = (x: number, z: number, sand: boolean): [number, number, number] => {
    const k = (z * (N + 1) + x) * 2 + (sand ? 1 : 0);
    let v = corner.get(k);
    if (!v) { cornerColor(x, z, sand, tmp); v = [tmp.r, tmp.g, tmp.b]; corner.set(k, v); }
    return v;
  };
  const TILE = 6;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (!land[z * N + x]) continue;
    const r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    const sand = r > G + (vnoise(x * 0.2, z * 0.2, 5) - 0.5) * 3.2;
    const a = sand ? sandA : jungle;
    const y = 1;
    const corners = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
    for (const c of corners) {
      a.pos.push(c[0]!, y, c[1]!);
      a.nor.push(0, 1, 0);
      a.uv.push(c[0]! / TILE, c[1]! / TILE);
      const col = cc(c[0]!, c[1]!, sand);
      a.col.push(col[0], col[1], col[2]);
    }
    // alternate the diagonal so the lighting has no visible pattern
    if ((x + z) & 1) a.idx.push(a.n, a.n + 2, a.n + 1, a.n, a.n + 3, a.n + 2);
    else a.idx.push(a.n, a.n + 3, a.n + 1, a.n + 1, a.n + 3, a.n + 2);
    a.n += 4;
  }
  const meshOf = (a: Arr, mat: any, shadow: boolean) => {
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(a.pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(a.nor, 3));
    if (a.uv.length) geo.setAttribute("uv", new T.Float32BufferAttribute(a.uv, 2));
    geo.setAttribute("color", new T.Float32BufferAttribute(a.col, 3));
    geo.setIndex(a.n > 65535 ? new T.Uint32BufferAttribute(a.idx, 1) : new T.Uint16BufferAttribute(a.idx, 1));
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, mat);
    m.receiveShadow = shadow; m.castShadow = false; m.userData.noShadowCast = true; m.userData.island = true;
    m.matrixAutoUpdate = false;
    return m;
  };
  const matJungle = new T.MeshLambertMaterial({ map: jungleFloorTexture(T), vertexColors: true });
  const matSand = new T.MeshLambertMaterial({ map: sandTexture(T), vertexColors: true });
  const matFlat = new T.MeshLambertMaterial({ vertexColors: true });
  if (jungle.n) group.add(meshOf(jungle, matJungle, true));
  if (sandA.n) group.add(meshOf(sandA, matSand, true));

  // ---- the island's edge and the sloping sea floor around it
  const wall = mk();
  const seaFloor = mk();
  const colTop = hex(T, 0xcbb98a), colBot = hex(T, 0x6a5a3e);
  const quad = (a: Arr, p: number[][], nrm: number[], cols: any[]) => {
    for (let i = 0; i < 4; i++) { a.pos.push(p[i]![0]!, p[i]![1]!, p[i]![2]!); a.nor.push(nrm[0]!, nrm[1]!, nrm[2]!); a.col.push(cols[i].r, cols[i].g, cols[i].b); }
    a.idx.push(a.n, a.n + 1, a.n + 2, a.n, a.n + 2, a.n + 3); a.n += 4;
  };
  const SEA0 = 0.12;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (!land[z * N + x]) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const d of dirs) {
      const nx = x + d[0]!, nz = z + d[1]!;
      if (nx >= 0 && nz >= 0 && nx < N && nz < N && land[nz * N + nx]) continue;
      let p: number[][];
      if (d[0] === 1) p = [[x + 1, 1, z], [x + 1, 1, z + 1], [x + 1, SEA0, z + 1], [x + 1, SEA0, z]];
      else if (d[0] === -1) p = [[x, 1, z + 1], [x, 1, z], [x, SEA0, z], [x, SEA0, z + 1]];
      else if (d[1] === 1) p = [[x + 1, 1, z + 1], [x, 1, z + 1], [x, SEA0, z + 1], [x + 1, SEA0, z + 1]];
      else p = [[x, 1, z], [x + 1, 1, z], [x + 1, SEA0, z], [x, SEA0, z]];
      const n = [d[0]!, 0, d[1]!];
      const top = tmp.copy(colTop).lerp(cWet, 0.35).clone(), bot = colBot.clone();
      quad(wall, p, n, [top, top, bot, bot]);
    }
  }
  if (wall.n) group.add(meshOf({ ...wall, uv: [] }, matFlat, false));
  // sea floor: every water cell near land, heights follow the distance to the coast
  const FLOORD = 15;
  const floorH = (d: number) => SEA0 - 3.9 * (1 - Math.exp(-Math.max(0, d) / 6));
  const dAt = (x: number, z: number) => { // distance to land at a grid corner (average of the cells around it)
    let s = 0, c = 0;
    for (let ox = -1; ox <= 0; ox++) for (let oz = -1; oz <= 0; oz++) {
      const ix = x + ox, iz = z + oz;
      if (ix < 0 || iz < 0 || ix >= N || iz >= N) continue;
      s += land[iz * N + ix] ? 0 : dLand[iz * N + ix]!; c++;
    }
    return c ? s / c : FLOORD;
  };
  const cShallow = hex(T, 0xd9c78f), cMid = hex(T, 0x58a0a0), cDeep = hex(T, 0x15405a);
  const floorColor = (d: number) => {
    const t = clamp(d / FLOORD, 0, 1);
    const c = tmp.copy(cShallow).lerp(cMid, smoothstep(0, 0.35, t)).lerp(cDeep, smoothstep(0.3, 1, t));
    return c.clone();
  };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (land[z * N + x]) continue;
    if (dLand[z * N + x]! > FLOORD) continue;
    const cs = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
    const ds = cs.map((c) => dAt(c[0]!, c[1]!));
    const pts = cs.map((c, i) => [c[0]!, floorH(ds[i]!), c[1]!]);
    quad(seaFloor, pts, [0, 1, 0], ds.map((d) => floorColor(d)));
  }
  if (seaFloor.n) group.add(meshOf({ ...seaFloor, uv: [] }, matFlat, false));

  // ---- trodden paths: soft-edged dirt ribbons just above the ground
  const pathMat = new T.MeshLambertMaterial({ map: pathTexture(T), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ribbon = { pos: [] as number[], nor: [] as number[], uv: [] as number[], col: [] as number[], idx: [] as number[], n: 0 };
  const cDirt = hex(T, 0x8f7048), cDirt2 = hex(T, 0x7a5d3a);
  paths.forEach((p) => {
    let run = 0;
    for (let i = 0; i < p.pts.length; i++) {
      const q = p.pts[i]!, a = p.pts[Math.max(0, i - 1)]!, b = p.pts[Math.min(p.pts.length - 1, i + 1)]!;
      let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = -tz, nz = tx;
      if (i) run += Math.hypot(q[0] - p.pts[i - 1]![0], q[1] - p.pts[i - 1]![1]);
      const w = p.w * (0.85 + 0.3 * vnoise(q[0] * 0.3, q[1] * 0.3, 4)) * 0.5;
      const col = tmp.copy(cDirt).lerp(cDirt2, vnoise(q[0] * 0.2, q[1] * 0.2, 8));
      const edge = [-1, 0, 1];
      for (const e of edge) {
        ribbon.pos.push(q[0] + nx * w * e * 1.25, 1.012, q[1] + nz * w * e * 1.25);
        ribbon.nor.push(0, 1, 0);
        ribbon.uv.push(run * 0.45, (e + 1) * 0.5 * 0.9);
        ribbon.col.push(col.r, col.g, col.b, e === 0 ? 1 : 0);
      }
      if (i) { const k = ribbon.n - 3; for (let e = 0; e < 2; e++) ribbon.idx.push(k + e, k + e + 1, k + 3 + e, k + e + 1, k + 4 + e, k + 3 + e); }
      ribbon.n += 3;
    }
  });
  if (ribbon.n) {
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(ribbon.pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(ribbon.nor, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(ribbon.uv, 2));
    geo.setAttribute("color", new T.Float32BufferAttribute(ribbon.col, 4));
    geo.setIndex(new T.Uint32BufferAttribute(ribbon.idx, 1));
    const m = new T.Mesh(geo, pathMat);
    m.renderOrder = 1; m.receiveShadow = true; m.userData.noShadowCast = true; m.userData.island = true;
    group.add(m);
  }

  // ---- the caves and rock clusters
  const caveGroups: any[] = [];
  caves.forEach((c, i) => {
    const mb = new MB(T, seed * 13 + i * 101);
    addCave(mb, { R: c.R, H: 4.7, rnd: new Rng(seed * 7 + i * 31) });
    const g = mb.build(ctx.mats, true);
    g.position.set(c.x, 1, c.z);
    g.rotation.y = c.yaw;
    g.userData.cave = c;
    applyTier(g, ctx.gfx.f.tier);
    ctx.tiered.push(g);
    group.add(g); caveGroups.push(g);
  });
  rockClusters.forEach((rc, i) => {
    const mb = new MB(T, seed * 17 + i * 53), rr = new Rng(seed * 3 + i);
    for (let k = 0; k < rc.n; k++) {
      const a = rr.range(0, 6.28), d = k === 0 ? 0 : rr.range(0.6, 1.4), rho = rr.range(0.45, 0.95) * (k === 0 ? 1.25 : 1);
      const base = rr.pick([0x77716a, 0x6a665e, 0x84806f, 0x5f5b54]);
      mb.blob(base, rho, Math.cos(a) * d, rho * 0.45, Math.sin(a) * d, rr.range(0.9, 1.3), rr.range(0.7, 1), rr.range(0.9, 1.3), 1, rr.range(0, 6),
        { grad: [base, rr.chance(0.5) ? 0x4c6a36 : base, rho * 0.1, rho * 1.1] });
    }
    const g = mb.build(ctx.mats, true);
    g.position.set(rc.x, 1, rc.z);
    group.add(g);
  });

  // ---- shore picture for the water: how far each water cell is from the coast (0 at the beach .. 1 far out)
  const shoreData = new Uint8Array(N * N);
  for (let i = 0; i < shoreData.length; i++) shoreData[i] = land[i] ? 0 : Math.round(clamp(dLand[i]! / 14, 0, 1) * 255);
  const shoreTex = new T.DataTexture(shoreData, N, N, T.RedFormat, T.UnsignedByteType);
  shoreTex.magFilter = T.LinearFilter; shoreTex.minFilter = T.LinearFilter;
  shoreTex.wrapS = shoreTex.wrapT = T.ClampToEdgeWrapping;
  shoreTex.needsUpdate = true;
  ctx.air.u.uShore!.value = shoreTex;

  ctx.env.scene.add(group);

  return {
    seed, cx: CX, cz: CZ, G, land, dWater, dLand, coastR: coast, isLand, obstacles, caves, paths, pathPts, pathDist,
    group, caveGroups, shoreTex,
    dispose() {
      ctx.env.scene.remove(group);
      group.traverse((n: any) => { if (n.geometry) n.geometry.dispose(); });
      matJungle.dispose(); matSand.dispose(); matFlat.dispose(); pathMat.dispose();
      shoreTex.dispose();
      ctx.air.u.uShore!.value = null;
      caveGroups.forEach((g) => { const i = ctx.tiered.indexOf(g); if (i >= 0) ctx.tiered.splice(i, 1); });
    },
  };
}
