// @ts-nocheck
import { Rng, fbm, vnoise, clamp, smoothstep } from "../infinite/rng";
import { MB, applyTier } from "../infinite/mb";
import { jungleFloorTexture, sandTexture } from "../infinite/tex";
import { PAL } from "../infinite/props";
import { VERT as WATER_VERT, FRAG as WATER_FRAG, waterPicture } from "../infinite/water";
import type { FsCtx } from "./ctx";

/**
 * Free Style's land: about five times the Infinite island's area. A wide mainland with a ragged coast, lakes, a river, meadows, forests and
 * rocky hills with stone and iron. Drawn the same way as the Infinite island (merged ground meshes with vertex colours and the same
 * textures, cliff edges at the water, a sloping lake / sea floor, the same wave shader), and it doubles as the game's map: land / water,
 * distance to water, where the shore is, and a coarse walk grid for path finding.
 */
export const N = 256;
export const WATER_Y = 0.36;
export const START = { x: 128, z: 128 };

export interface Node { id: number; kind: "stone" | "iron"; x: number; z: number; amount: number; max: number; r: number; model: any; claimed?: any }

export interface Land {
  seed: number;
  land: Uint8Array;
  dWater: Float32Array;
  dLand: Float32Array;
  zone: Uint8Array;           // 0 meadow, 1 forest, 2 rocky
  isLand(x: number, z: number): boolean;
  shore: Array<[number, number]>;
  nearestShore(x: number, z: number): [number, number] | null;
  nodes: Node[];
  /** footprints that block walking (buildings, rocks): circles */
  blockers: Array<{ x: number; z: number; r: number; o?: any }>;
  walkable(x: number, z: number): boolean;
  /** call after adding / removing blockers */
  refreshBlocks(): void;
  path(ax: number, az: number, bx: number, bz: number): Array<[number, number]> | null;
  bridges: Array<{ x: number; z: number; a: number; hl: number; hw: number }>;
  lakes: Array<{ x: number; z: number; r: number }>;
  /** for Foliage */
  island: any;
  group: any;
  nodeGroup: any;
  removeNode(n: Node): void;
  dispose(): void;
}

function chamfer(target: Uint8Array, n: number): Float32Array {
  const d = new Float32Array(n * n);
  for (let i = 0; i < d.length; i++) d[i] = target[i] ? 0 : 1e6;
  const D1 = 1, D2 = 1.4142;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const i = z * n + x; let v = d[i]!;
    if (x > 0) v = Math.min(v, d[i - 1]! + D1);
    if (z > 0) { v = Math.min(v, d[i - n]! + D1); if (x > 0) v = Math.min(v, d[i - n - 1]! + D2); if (x < n - 1) v = Math.min(v, d[i - n + 1]! + D2); }
    d[i] = v;
  }
  for (let z = n - 1; z >= 0; z--) for (let x = n - 1; x >= 0; x--) {
    const i = z * n + x; let v = d[i]!;
    if (x < n - 1) v = Math.min(v, d[i + 1]! + D1);
    if (z < n - 1) { v = Math.min(v, d[i + n]! + D1); if (x < n - 1) v = Math.min(v, d[i + n + 1]! + D2); if (x > 0) v = Math.min(v, d[i + n - 1]! + D2); }
    d[i] = v;
  }
  return d;
}

export function buildLand(ctx: FsCtx, seed: number): Land {
  const T = ctx.T, rnd = new Rng(seed);
  const group = new T.Group(); group.name = "fs-land";
  const nodeGroup = new T.Group(); group.add(nodeGroup);

  // ---------------------------------------------------------------- land and water
  const land = new Uint8Array(N * N);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const edge = Math.min(x, z, N - 1 - x, N - 1 - z);
    const coast = 9 + fbm(x * 0.03 + seed % 37, z * 0.03, seed + 3, 4) * 16;
    land[z * N + x] = edge > coast ? 1 : 0;
  }
  // lakes: one close to the start (early water), then three more spread out
  const lakes: Array<{ x: number; z: number; r: number }> = [];
  const a0 = rnd.range(0, Math.PI * 2);
  lakes.push({ x: START.x + Math.cos(a0) * 15, z: START.z + Math.sin(a0) * 15, r: rnd.range(5, 6.5) });
  for (let tries = 0; lakes.length < 4 && tries < 300; tries++) {
    const x = rnd.range(40, N - 40), z = rnd.range(40, N - 40), r = rnd.range(7, 13);
    if (Math.hypot(x - START.x, z - START.z) < 36) continue;
    if (lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + r + 18)) continue;
    lakes.push({ x, z, r });
  }
  const carve = (x: number, z: number, r: number) => {
    for (let iz = Math.floor(z - r - 3); iz <= z + r + 3; iz++) for (let ix = Math.floor(x - r - 3); ix <= x + r + 3; ix++) {
      if (ix < 0 || iz < 0 || ix >= N || iz >= N) continue;
      const d = Math.hypot(ix + 0.5 - x, iz + 0.5 - z), wob = (vnoise(ix * 0.25, iz * 0.25, seed + 11) - 0.5) * 3;
      if (d < r + wob) land[iz * N + ix] = 0;
    }
  };
  lakes.forEach((l) => carve(l.x, l.z, l.r));
  // a river from the farthest lake out to the sea, meandering
  const riv: Array<[number, number, number]> = [];
  {
    const l = lakes[lakes.length - 1]!;
    let x = l.x, z = l.z;
    const ex = x < N / 2 ? -1 : 1, dir = Math.atan2(0, ex);
    let a = dir;
    for (let s = 0; s < 400; s++) {
      a += (vnoise(s * 0.08, 3, seed) - 0.5) * 0.4;
      a += (dir - a) * 0.05;
      x += Math.cos(a) * 0.8; z += Math.sin(a) * 0.8;
      carve(x, z, 1.4 + vnoise(s * 0.05, 9, seed) * 0.9);
      riv.push([x, z, a]);
      if (x < 4 || z < 4 || x > N - 4 || z > N - 4) break;
    }
  }
  // the start clearing is always land
  for (let iz = START.z - 8; iz <= START.z + 8; iz++) for (let ix = START.x - 8; ix <= START.x + 8; ix++) if (Math.hypot(ix - START.x, iz - START.z) < 8) land[iz * N + ix] = 1;
  const water = new Uint8Array(N * N); for (let i = 0; i < water.length; i++) water[i] = land[i] ? 0 : 1;
  const dLand = chamfer(land, N), dWater = chamfer(water, N);
  const isLand = (x: number, z: number) => { const ix = Math.floor(x), iz = Math.floor(z); return ix >= 0 && iz >= 0 && ix < N && iz < N && land[iz * N + ix] === 1; };

  // bridges over the river (the river would otherwise cut the land in two): where both banks are close, spaced well apart
  const bridges: Array<{ x: number; z: number; a: number; hl: number; hw: number }> = [];
  for (let k = 6; k < riv.length - 6 && bridges.length < 4; k += 3) {
    const [rx, rz, ra] = riv[k]!;
    if (isLand(rx, rz)) continue;
    const px = -Math.sin(ra), pz = Math.cos(ra);
    let l1 = 0, l2 = 0;
    for (let d = 0.5; d < 9; d += 0.5) if (isLand(rx + px * d, rz + pz * d) && isLand(rx + px * (d + 1), rz + pz * (d + 1))) { l1 = d; break; }
    for (let d = 0.5; d < 9; d += 0.5) if (isLand(rx - px * d, rz - pz * d) && isLand(rx - px * (d + 1), rz - pz * (d + 1))) { l2 = d; break; }
    if (!l1 || !l2 || l1 + l2 > 10) continue;
    const cx = rx + px * (l1 - l2) / 2, cz = rz + pz * (l1 - l2) / 2;
    if (bridges.some((b) => Math.hypot(b.x - cx, b.z - cz) < 34)) continue;
    bridges.push({ x: cx, z: cz, a: Math.atan2(px, pz), hl: (l1 + l2) / 2 + 1.6, hw: 1.9 });
  }
  const onBridge = (x: number, z: number) => bridges.some((b) => { const dx = x - b.x, dz = z - b.z, s = Math.sin(b.a), c = Math.cos(b.a); const along = dx * s + dz * c, side = dx * c - dz * s; return Math.abs(along) < b.hl && Math.abs(side) < b.hw; });
  const walkOK = (x: number, z: number) => isLand(x, z) || onBridge(x, z);

  // ---------------------------------------------------------------- zones: forests and rocky hills
  const zone = new Uint8Array(N * N);
  const rocky: Array<{ x: number; z: number; r: number; iron: boolean }> = [];
  rocky.push({ x: START.x + Math.cos(a0 + 2.4) * 18, z: START.z + Math.sin(a0 + 2.4) * 18, r: 4.5, iron: true });   // a small one near the start
  for (let tries = 0; rocky.length < 9 && tries < 500; tries++) {
    const x = rnd.range(30, N - 30), z = rnd.range(30, N - 30), r = rnd.range(6, 10);
    const d = Math.hypot(x - START.x, z - START.z);
    if (d < 30 || !isLand(x, z) || dWater[Math.floor(z) * N + Math.floor(x)]! < r + 2) continue;
    if (rocky.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + 14)) continue;
    rocky.push({ x, z, r, iron: d > 55 || rnd.chance(0.35) });   // iron is richer far from home
  }
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; if (!land[i]) continue;
    const near = Math.hypot(x - START.x, z - START.z);
    if (rocky.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 1.5)) { zone[i] = 2; continue; }
    const f = fbm(x * 0.028 + 40, z * 0.028, seed + 7, 4);
    if (f > 0.53 && near > 13) zone[i] = 1;
  }

  // ---------------------------------------------------------------- ground colours
  const hex = (v: number) => new T.Color(v);
  const cM0 = hex(0x5e9a3e), cM1 = hex(0x86b552), cM2 = hex(0x4b8436), cF0 = hex(0x3e7d31), cF1 = hex(0x2c5a2c), cMud = hex(0x6b5232), cRock = hex(0x7d7563), cGreen = hex(0x6fa54a);
  const cS0 = hex(0xe6d6a2), cS1 = hex(0xd5c08a), cWet = hex(0xb4a070);
  const tmp = new T.Color();
  const zoneAt = (x: number, z: number) => zone[clamp(Math.floor(z), 0, N - 1) * N + clamp(Math.floor(x), 0, N - 1)]!;
  const cornerColor = (x: number, z: number, sand: boolean, out: any) => {
    const n1 = fbm(x * 0.045, z * 0.045, 3, 3), n2 = fbm(x * 0.12 + 50, z * 0.12, 7, 3), n3 = fbm(x * 0.3, z * 0.3 + 9, 11, 2);
    const dW = dWater[clamp(Math.floor(z), 0, N - 1) * N + clamp(Math.floor(x), 0, N - 1)]!;
    if (sand) { out.copy(cS0).lerp(cS1, n1); out.lerp(cWet, smoothstep(2.4, 0.2, dW) * 0.8); return out; }
    const zn = zoneAt(x, z);
    out.copy(cM0).lerp(cM1, n1 * 0.9).lerp(cM2, smoothstep(0.55, 0.85, n2) * 0.6);
    if (zn === 1) out.lerp(cF0, 0.55).lerp(cF1, smoothstep(0.5, 0.8, n2) * 0.5);
    if (zn === 2) out.lerp(cRock, 0.45 + 0.25 * n3).lerp(cMud, smoothstep(0.6, 0.85, n2) * 0.3);
    out.lerp(cMud, smoothstep(0.62, 0.8, n3 * 0.6 + n2 * 0.55) * 0.4);
    out.lerp(cGreen, smoothstep(14, 4, Math.hypot(x - START.x, z - START.z)) * 0.35);
    return out;
  };

  // ---------------------------------------------------------------- surfaces (merged, like the Infinite island)
  type Arr = { pos: number[]; nor: number[]; uv: number[]; col: number[]; idx: number[]; n: number };
  const mk = (): Arr => ({ pos: [], nor: [], uv: [], col: [], idx: [], n: 0 });
  const grass = mk(), forest = mk(), sandA = mk();
  const corner = new Map<number, [number, number, number]>();
  const cc = (x: number, z: number, sand: boolean) => {
    const k = (z * (N + 1) + x) * 2 + (sand ? 1 : 0);
    let v = corner.get(k);
    if (!v) { cornerColor(x, z, sand, tmp); v = [tmp.r, tmp.g, tmp.b]; corner.set(k, v); }
    return v;
  };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; if (!land[i]) continue;
    const sand = dWater[i]! < 2.2 + (vnoise(x * 0.2, z * 0.2, 5) - 0.5) * 1.6;
    const a = sand ? sandA : zone[i] === 1 ? forest : grass;
    for (const c of [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]) {
      a.pos.push(c[0]!, 1, c[1]!); a.nor.push(0, 1, 0); a.uv.push(c[0]! / 6, c[1]! / 6);
      const col = cc(c[0]!, c[1]!, sand); a.col.push(col[0], col[1], col[2]);
    }
    if ((x + z) & 1) a.idx.push(a.n, a.n + 2, a.n + 1, a.n, a.n + 3, a.n + 2); else a.idx.push(a.n, a.n + 3, a.n + 1, a.n + 1, a.n + 3, a.n + 2);
    a.n += 4;
  }
  const meshOf = (a: Arr, mat: any, shadow: boolean) => {
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(a.pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(a.nor, 3));
    if (a.uv.length) geo.setAttribute("uv", new T.Float32BufferAttribute(a.uv, 2));
    geo.setAttribute("color", new T.Float32BufferAttribute(a.col, 3));
    geo.setIndex(new T.Uint32BufferAttribute(a.idx, 1));
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, mat); m.receiveShadow = shadow; m.castShadow = false; m.userData.noShadowCast = true; m.userData.ground = true; m.matrixAutoUpdate = false;
    return m;
  };
  const floorTex = jungleFloorTexture(T), sTex = sandTexture(T);
  const matGrass = new T.MeshLambertMaterial({ map: floorTex, vertexColors: true, color: 0xe8f4d8 });
  const matForest = new T.MeshLambertMaterial({ map: floorTex, vertexColors: true });
  const matSand = new T.MeshLambertMaterial({ map: sTex, vertexColors: true });
  const matFlat = new T.MeshLambertMaterial({ vertexColors: true });
  group.add(meshOf(grass, matGrass, true), meshOf(forest, matForest, true), meshOf(sandA, matSand, true));

  // cliff faces at the water and the sloping floor under it
  const wall = mk(), floor = mk(), SEA0 = 0.12;
  const colTop = hex(0xcbb98a).lerp(cWet, 0.35), colBot = hex(0x6a5a3e);
  const quad = (a: Arr, p: number[][], nrm: number[], cols: any[]) => {
    for (let i = 0; i < 4; i++) { a.pos.push(p[i]![0]!, p[i]![1]!, p[i]![2]!); a.nor.push(nrm[0]!, nrm[1]!, nrm[2]!); a.col.push(cols[i].r, cols[i].g, cols[i].b); }
    a.idx.push(a.n, a.n + 1, a.n + 2, a.n, a.n + 2, a.n + 3); a.n += 4;
  };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (!land[z * N + x]) continue;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + d[0]!, nz = z + d[1]!;
      if (nx >= 0 && nz >= 0 && nx < N && nz < N && land[nz * N + nx]) continue;
      let p: number[][];
      if (d[0] === 1) p = [[x + 1, 1, z], [x + 1, 1, z + 1], [x + 1, SEA0, z + 1], [x + 1, SEA0, z]];
      else if (d[0] === -1) p = [[x, 1, z + 1], [x, 1, z], [x, SEA0, z], [x, SEA0, z + 1]];
      else if (d[1] === 1) p = [[x + 1, 1, z + 1], [x, 1, z + 1], [x, SEA0, z + 1], [x + 1, SEA0, z + 1]];
      else p = [[x, 1, z], [x + 1, 1, z], [x + 1, SEA0, z], [x, SEA0, z]];
      quad(wall, p, [d[0]!, 0, d[1]!], [colTop, colTop, colBot, colBot]);
    }
  }
  group.add(meshOf({ ...wall, uv: [] }, matFlat, false));
  const FLOORD = 15, floorH = (d: number) => SEA0 - 3.9 * (1 - Math.exp(-Math.max(0, d) / 6));
  const dAt = (x: number, z: number) => { let s = 0, c = 0; for (let ox = -1; ox <= 0; ox++) for (let oz = -1; oz <= 0; oz++) { const ix = x + ox, iz = z + oz; if (ix < 0 || iz < 0 || ix >= N || iz >= N) { s += FLOORD; c++; continue; } s += land[iz * N + ix] ? 0 : dLand[iz * N + ix]!; c++; } return c ? s / c : FLOORD; };
  const cShallow = hex(0xd9c78f), cMid = hex(0x58a0a0), cDeep = hex(0x15405a);
  const floorColor = (d: number) => { const t = clamp(d / FLOORD, 0, 1); return tmp.copy(cShallow).lerp(cMid, smoothstep(0, 0.35, t)).lerp(cDeep, smoothstep(0.3, 1, t)).clone(); };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (land[z * N + x] || dLand[z * N + x]! > FLOORD) continue;
    const cs = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], ds = cs.map((c) => dAt(c[0]!, c[1]!));
    quad(floor, cs.map((c, i) => [c[0]!, floorH(ds[i]!), c[1]!]), [0, 1, 0], ds.map(floorColor));
  }
  group.add(meshOf({ ...floor, uv: [] }, matFlat, false));

  // ---------------------------------------------------------------- water: the Infinite wave shader over the whole map
  const shoreData = new Uint8Array(N * N);
  for (let i = 0; i < shoreData.length; i++) shoreData[i] = land[i] ? 0 : Math.round(clamp(dLand[i]! / 14, 0, 1) * 255);
  const shoreTex = new T.DataTexture(shoreData, N, N, T.RedFormat, T.UnsignedByteType);
  shoreTex.magFilter = shoreTex.minFilter = T.LinearFilter; shoreTex.wrapS = shoreTex.wrapT = T.ClampToEdgeWrapping; shoreTex.needsUpdate = true;
  const u = ctx.air.u;
  const uni = {
    uTime: u.uTime, uAmp: { value: 0.1 }, uQ: { value: 2 }, uLight: { value: 1 }, uRain: u.uRain, uSkyQ: { value: 2 },
    uSunDir: u.uSunDir, uSunCol: u.uSunCol, uSunAmt: u.uSunAmt, uZenith: u.uZenith, uHorizon: u.uHorizon, uFogCol: u.uFogCol, uFogRange: u.uFogRange,
    uWind: u.uWind, uNoise: u.uNoise, uShore: { value: shoreTex }, uGrid: { value: N },
  };
  const wGeo = new T.PlaneGeometry(N + 600, N + 600, 260, 260); wGeo.rotateX(-Math.PI / 2);
  const wLow = new T.PlaneGeometry(N + 600, N + 600, 1, 1); wLow.rotateX(-Math.PI / 2);
  let wMesh: any = null, wMode = -1, wMat: any = null, wBasic: any = null, wPic: any = null;
  const pickWater = () => {
    const m = ctx.gfx.f.water; if (m === wMode && wMesh) return; wMode = m;
    if (wMesh) group.remove(wMesh);
    if (m === 0) { if (!wBasic) { wPic = waterPicture(T); wBasic = new T.MeshBasicMaterial({ map: wPic, transparent: true, opacity: 0.88 }); } wMesh = new T.Mesh(wLow, wBasic); }
    else { if (!wMat) wMat = new T.ShaderMaterial({ vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, uniforms: uni, transparent: true, depthWrite: false, fog: false }); wMesh = new T.Mesh(wGeo, wMat); }
    wMesh.position.set(N / 2, WATER_Y, N / 2); wMesh.renderOrder = 2; wMesh.frustumCulled = false; wMesh.userData.noShadowCast = true; wMesh.castShadow = false; wMesh.receiveShadow = false;
    group.add(wMesh);
  };
  pickWater();
  ctx.gfxChanged.push(pickWater);
  ctx.frame.push((dt) => {
    pickWater();
    uni.uAmp.value = 0.05 + ctx.air.strength * 0.34 + ctx.air.storm * 0.2;
    uni.uQ.value = ctx.gfx.f.water; uni.uLight.value = 0.2 + 0.8 * (ctx.x.sky ? ctx.x.sky.light : 1);
    if (wMode === 0 && wPic) { const wx = u.uWind!.value; wPic.offset.x += wx.x * dt * 0.012; wPic.offset.y += wx.y * dt * 0.012; wBasic.color.copy(u.uHorizon!.value).lerp(new T.Color(0x3f8fb0), 0.55).multiplyScalar(0.35 + 0.9 * (ctx.x.sky ? ctx.x.sky.light : 1)); }
  });

  // ---------------------------------------------------------------- shore points (water carriers fill up here)
  const shore: Array<[number, number]> = [];
  for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const i = z * N + x; if (!land[i] || dWater[i]! > 1.5) continue;
    if ((x + z) % 2) continue;
    shore.push([x + 0.5, z + 0.5]);
  }
  const nearestShore = (x: number, z: number): [number, number] | null => {
    let best = 1e9, out: [number, number] | null = null;
    for (const p of shore) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; out = p; } }
    return out;
  };

  // ---------------------------------------------------------------- stone and iron deposits (blocky outcrops)
  const nodes: Node[] = [];
  const blockers: Array<{ x: number; z: number; r: number; o?: any }> = [];
  let nid = 1;
  const addNode = (kind: "stone" | "iron", x: number, z: number) => {
    const r2 = new Rng(seed * 7 + nid * 13), mb = new MB(T, seed + nid * 31);
    mb.jitter = 0.05; mb.ao = { y0: 0, h: 1.2, k: 0.25 };
    const n = kind === "iron" ? r2.int(3, 5) : r2.int(4, 7);
    for (let k = 0; k < n; k++) {
      const a = r2.range(0, 6.28), d = k === 0 ? 0 : r2.range(0.4, 1.0), s = r2.range(0.45, 0.85) * (k === 0 ? 1.3 : 1);
      const base = kind === "iron" ? r2.pick([0x5a524c, 0x4e4844, 0x625a52]) : r2.pick([0x8a857c, 0x7a756c, 0x949086, 0x6e6a62]);
      mb.box(base, s * 1.7, s * 1.25, s * 1.6, Math.cos(a) * d, s * 0.62, Math.sin(a) * d, 0, a, 0, { grad: [base, kind === "iron" ? 0x6a5040 : 0x5c7a40, 0, s * 1.3] });
      if (kind === "iron") for (let j = 0; j < 4; j++) { const c = r2.chance(0.6) ? 0xb0602a : 0xc9ced6; mb.box(c, 0.16, 0.1, 0.16, Math.cos(a) * d + r2.range(-s * 0.6, s * 0.6), s * r2.range(0.5, 1.15), Math.sin(a) * d + r2.range(-s * 0.6, s * 0.6), 0, r2.range(0, 3), 0, { noAO: true, jit: 0.1, mat: c === 0xc9ced6 ? "metal" : "lit" }); }
      else if (r2.chance(0.5)) mb.box(0x5c7a40, s * 1.2, 0.06, s * 1.1, Math.cos(a) * d, s * 1.25, Math.sin(a) * d, 0, a, 0, { noAO: true });   // moss on top
    }
    const g = mb.build(ctx.mats, true); g.position.set(x, 1, z); nodeGroup.add(g);
    applyTier(g, ctx.gfx.f.tier); ctx.tiered.push(g);
    const node: Node = { id: nid++, kind, x, z, amount: kind === "iron" ? 30 : 45, max: kind === "iron" ? 30 : 45, r: 1.3, model: g };
    g.traverse((o: any) => { if (o.isMesh) o.userData.node = node; });
    nodes.push(node); blockers.push({ x, z, r: 1.15, o: node });
    return node;
  };
  rocky.forEach((q, qi) => {
    const nStone = qi === 0 ? 3 : rnd.int(4, 7), nIron = q.iron ? (qi === 0 ? 2 : rnd.int(2, 4)) : 0;
    const spots: Array<[number, number]> = [];
    for (let tries = 0; spots.length < nStone + nIron && tries < 200; tries++) {
      const a = rnd.range(0, 6.28), d = rnd.range(0, q.r), x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
      if (!isLand(x, z) || dWater[Math.floor(z) * N + Math.floor(x)]! < 2.5) continue;
      if (spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 3)) continue;
      if (Math.hypot(x - START.x, z - START.z) < 9) continue;
      spots.push([x, z]);
    }
    spots.forEach((s, k) => addNode(k < nIron ? "iron" : "stone", s[0], s[1]));
  });
  // the bridges: plank deck on log piles, with rails
  bridges.forEach((b, bi) => {
    const mb = new MB(T, seed + 900 + bi), r2 = new Rng(seed + 77 + bi), L = b.hl * 2, W = 2.4;
    mb.ao = { y0: 0.2, h: 1, k: 0.2 };
    mb.push(b.x, 0, b.z, b.a);
    for (let k = 0; k < Math.round(L / 0.36); k++) mb.box(r2.pick(PAL.plank), W, 0.1, 0.32, 0, 1.06, -L / 2 + 0.18 + k * 0.36, 0, 0, r2.range(-0.02, 0.02), { jit: 0.06 });
    for (const s of [-1, 1]) {
      mb.box(PAL.wood[1], 0.16, 0.16, L, s * (W / 2 - 0.25), 0.94, 0);
      mb.box(PAL.wood[0], 0.08, 0.08, L, s * (W / 2 - 0.05), 1.62, 0, 0, 0, 0, { tier: 1 });
      for (let k = 0; k <= Math.round(L / 1.4); k++) { const z = -L / 2 + k * L / Math.round(L / 1.4); mb.box(PAL.wood[1], 0.1, 0.62, 0.1, s * (W / 2 - 0.05), 1.36, z, 0, 0, 0, { tier: 1 }); }
    }
    for (let k = 1; k < Math.round(L / 2.4); k++) for (const s of [-1, 1]) mb.cyl(PAL.wood[1], 0.12, 0.13, 1.5, s * (W / 2 - 0.3), 0.3, -L / 2 + k * L / Math.round(L / 2.4), 7);
    mb.pop();
    const g = mb.build(ctx.mats, true); group.add(g); applyTier(g, ctx.gfx.f.tier); ctx.tiered.push(g);
  });
  group.add(nodeGroup);
  ctx.scene.add(group);

  // ---------------------------------------------------------------- walking: a coarse grid (2 x 2 cells) and A*
  const C = 2, M = N / C;
  // per coarse cell: 1 = walkable. Land is fixed; blockers (rocks, buildings) are stamped in by refreshBlocks()
  const landOK = new Uint8Array(M * M), walk = new Uint8Array(M * M);
  for (let cz = 0; cz < M; cz++) for (let cx = 0; cx < M; cx++) { const x = cx * C + 1, z = cz * C + 1; landOK[cz * M + cx] = onBridge(x, z) || (isLand(x, z) && isLand(x - 0.6, z - 0.6) && isLand(x + 0.6, z + 0.6)) ? 1 : 0; }
  function refreshBlocks() {
    walk.set(landOK);
    for (const b of blockers) {
      const r = b.r + 0.4;
      for (let cz = Math.floor((b.z - r) / C); cz <= Math.floor((b.z + r) / C); cz++) for (let cx = Math.floor((b.x - r) / C); cx <= Math.floor((b.x + r) / C); cx++) {
        if (cx < 0 || cz < 0 || cx >= M || cz >= M) continue;
        if ((cx * C + 1 - b.x) ** 2 + (cz * C + 1 - b.z) ** 2 < r * r) walk[cz * M + cx] = 0;
      }
    }
  }
  const cellOK = (cx: number, cz: number) => cx >= 0 && cz >= 0 && cx < M && cz < M && walk[cz * M + cx] === 1;
  const walkable = (x: number, z: number) => walkOK(x, z) && cellOK(Math.floor(x / C), Math.floor(z / C));
  const lineClear = (ax: number, az: number, bx: number, bz: number) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.7);
    for (let k = 1; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (!walkOK(x, z)) return false; if (!cellOK(Math.floor(x / C), Math.floor(z / C)) && Math.hypot(x - bx, z - bz) > 2.2 && Math.hypot(x - ax, z - az) > 2.2) return false; }
    return true;
  };
  refreshBlocks();
  const gScore = new Float32Array(M * M), came = new Int32Array(M * M), closed = new Uint8Array(M * M), f = new Float32Array(M * M), inOpen = new Uint8Array(M * M);
  function path(ax: number, az: number, bx: number, bz: number): Array<[number, number]> | null {
    if (lineClear(ax, az, bx, bz)) return [[bx, bz]];
    const sx = clamp(Math.floor(ax / C), 0, M - 1), sz = clamp(Math.floor(az / C), 0, M - 1);
    let tx = clamp(Math.floor(bx / C), 0, M - 1), tz = clamp(Math.floor(bz / C), 0, M - 1);
    if (!cellOK(tx, tz)) { // the target itself sits on a blocker (a rock, a building): aim for the nearest free cell around it
      let best = 1e9, bt = -1;
      for (let oz = -2; oz <= 2; oz++) for (let ox = -2; ox <= 2; ox++) { if (!cellOK(tx + ox, tz + oz)) continue; const d = ox * ox + oz * oz; if (d < best) { best = d; bt = (tz + oz) * M + tx + ox; } }
      if (bt < 0) return null; tx = bt % M; tz = Math.floor(bt / M);
    }
    gScore.fill(1e9); came.fill(-1); closed.fill(0); inOpen.fill(0);
    const open: number[] = [];
    const s = sz * M + sx, t = tz * M + tx;
    gScore[s] = 0; f[s] = Math.hypot(tx - sx, tz - sz); open.push(s); inOpen[s] = 1;
    let iter = 0;
    while (open.length && iter++ < 9000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]!]! < f[open[bi]!]!) bi = k;
      const cur = open[bi]!; open[bi] = open[open.length - 1]!; open.pop(); inOpen[cur] = 0;
      if (cur === t) break;
      closed[cur] = 1;
      const cx = cur % M, cz = Math.floor(cur / M);
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oz) continue;
        const nx = cx + ox, nz = cz + oz; if (!cellOK(nx, nz)) continue;
        if (ox && oz && (!cellOK(cx + ox, cz) || !cellOK(cx, cz + oz))) continue;
        const ni = nz * M + nx; if (closed[ni]) continue;
        const g = gScore[cur]! + (ox && oz ? 1.414 : 1);
        if (g < gScore[ni]!) { gScore[ni] = g; came[ni] = cur; f[ni] = g + Math.hypot(tx - nx, tz - nz); if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; } }
      }
    }
    if (came[t] < 0 && t !== s) return null;
    const out: Array<[number, number]> = [];
    for (let c = t; c !== s && c >= 0; c = came[c]!) out.push([(c % M) * C + 1, Math.floor(c / M) * C + 1]);
    out.reverse();
    // drop corners we can see past
    const pts: Array<[number, number]> = [];
    let px = ax, pz = az;
    for (let k = 0; k < out.length; k++) {
      const nxt = out[k + 1];
      if (nxt && lineClear(px, pz, nxt[0], nxt[1])) continue;
      pts.push(out[k]!); px = out[k]![0]; pz = out[k]![1];
    }
    pts.push([bx, bz]);
    return pts;
  }

  // what Foliage needs from an "island": the start clearing stays bare, plants avoid rocks
  const island = {
    cx: START.x, cz: START.z, G: 1e6, isLand: (x: number, z: number) => isLand(x, z) && dWater[Math.floor(z) * N + Math.floor(x)]! > 1.2,
    obstacles: blockers, pathDist: () => 99, spread: N * 0.62, density: 4.2,
  };

  return {
    seed, land, dWater, dLand, zone, isLand, shore, nearestShore, nodes, blockers, walkable, path, island, group, nodeGroup, refreshBlocks, bridges, lakes,
    removeNode(n: Node) {
      const i = nodes.indexOf(n); if (i >= 0) nodes.splice(i, 1);
      const b = blockers.findIndex((q) => q.o === n); if (b >= 0) blockers.splice(b, 1);
      refreshBlocks();
      nodeGroup.remove(n.model); n.model.traverse((o: any) => o.geometry && o.geometry.dispose());
      const ti = ctx.tiered.indexOf(n.model); if (ti >= 0) ctx.tiered.splice(ti, 1);
    },
    dispose() {
      ctx.scene.remove(group);
      group.traverse((o: any) => { if (o.geometry && o.geometry !== wGeo && o.geometry !== wLow) o.geometry.dispose(); });
      wGeo.dispose(); wLow.dispose(); wMat && wMat.dispose(); wBasic && wBasic.dispose(); wPic && wPic.dispose();
      [matGrass, matForest, matSand, matFlat, floorTex, sTex, shoreTex].forEach((m: any) => m.dispose());
    },
  };
}
