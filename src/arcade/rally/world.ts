// @ts-nocheck
import { MB } from "../../world/infinite/mb";
import { Rng, fbm } from "../../world/infinite/rng";
import { makeKit } from "../f1/car";
import type { TrackPath } from "../f1/path";
import type { Features } from "../car3d/stage";
import type { Ground } from "../car3d/vehicle";
import { groundTexture, checkerTexture, asphaltTexture } from "../car3d/tex";
import type { RallyMap } from "./maps";
import { createCarSky, SUNSET } from "../car3d/sky";

/**
 * The scenery of a rally stage and the ground the cars drive on: terrain that follows the road, the road with its wheel ruts and verges,
 * a line of trees / rocks / snow banks at the edge of the stage (hit them and the car is damaged), forest or canyon walls beyond, crowds at
 * the jumps, chevron boards on the hairpins, a start arch, river crossings, sky, sun, fog and falling snow / rain / dust.
 */
export interface RallyWorld {
  path: TrackPath;
  map: RallyMap;
  kit: any;
  /** distance from the centre line where the solid scenery starts */
  edge: number;
  /** `hint`: the path sample the car was last on (keeps it on its own stretch where two pass close by) */
  ground(x: number, z: number, hint?: number): Ground & { lat: number; i: number; water: boolean };
  sunDir: any;
  start(slot: number): { x: number; z: number; h: number; y: number };
  update(dt: number, cam: any, focus: { x: number; z: number }): void;
  dispose(): void;
}

const TREES: Record<string, Array<{ trunk: number; leaf: number[]; kind: string }>> = {
  forest: [{ trunk: 0x5a3e28, leaf: [0x2f5a2a, 0x2a5226, 0x356634], kind: "pine" }, { trunk: 0xe6e2d6, leaf: [0x5e8a3a, 0x6c9a40], kind: "birch" }],
  canyon: [{ trunk: 0x6a5a3a, leaf: [0x5a7a3a], kind: "cactus" }],
  alpine: [{ trunk: 0x4a3424, leaf: [0x2a4a32, 0x305438], kind: "snowpine" }],
  jungle: [{ trunk: 0x4a3a24, leaf: [0x2e5a22, 0x3a6a26, 0x24481c], kind: "broad" }, { trunk: 0x5a4a2a, leaf: [0x4a7a2a], kind: "palm" }],
};

export function buildRallyWorld(T: any, scene: any, map: RallyMap, path: TrackPath, f: Features, time: "day" | "sunset" = "day"): RallyWorld {
  const kit = makeKit(T), rnd = new Rng(map.seed * 13 + 1), own: any[] = [];
  const mine = <A>(a: A): A => { own.push(a); return a; };
  const group = new T.Group(); scene.add(group);
  const n = path.n, hw = map.width / 2, EDGE = hw + 8.6, VERGE = hw + 2.4;
  const amount = f.amount;
  const tmp = { d: 0, h: 0, i: 0, side: 1 };

  // ------------------------------------------------------------------ sky, sun, fog, light
  // 5.67.0: a Forza-style shader sky (glowing sun, clouds, rays, flares); "sunset" turns the stage to golden hour with the sun low ahead
  const sunset = time === "sunset";
  const hex = (s: string) => parseInt(s.replace("#", ""), 16);
  const sunDir = new T.Vector3(map.sun[0], map.sun[1], map.sun[2]).normalize();
  if (sunset) { const az = Math.atan2(sunDir.x, sunDir.z); sunDir.set(Math.sin(az) * 0.995, 0.075, Math.cos(az) * 0.995).normalize(); }
  const sunColor = sunset ? SUNSET.sun : map.sunColor;
  const clouds = map.weather === "rain" ? 0.95 : map.weather === "snow" ? 0.75 : map.weather === "dust" ? 0.15 : 0.42;
  const sky = createCarSky(T, scene, {
    top: sunset ? SUNSET.top : hex(map.sky[0]), mid: sunset ? SUNSET.mid : hex(map.sky[1]), low: sunset ? SUNSET.low : hex(map.sky[2]),
    sunDir, sunColor, gold: sunset ? 1 : 0, clouds, quality: f.amount >= 1 ? 1 : 0, radius: 1500,
  });
  sky.uni.uDim.value = map.weather === "rain" ? 0.15 : map.weather === "snow" ? 0.6 : 1;
  const fogCol = new T.Color(map.fog); if (sunset) fogCol.lerp(new T.Color(SUNSET.fog), 0.65);
  scene.background = sunset ? new T.Color(SUNSET.low) : new T.Color(map.sky[2]);
  scene.fog = new T.FogExp2(fogCol, map.fogDensity * (sunset ? 0.85 : 1));
  const hemi = sunset ? new T.HemisphereLight(SUNSET.hemiSky, SUNSET.hemiGround, map.hemiI * 0.75) : new T.HemisphereLight(map.hemiSky, map.hemiGround, map.hemiI); scene.add(hemi);
  const sun = new T.DirectionalLight(sunColor, map.sunI * (sunset ? 1.05 : 1));
  if (f.shadow) {
    sun.castShadow = true; sun.shadow.mapSize.set(f.shadow, f.shadow);
    const c = sun.shadow.camera; c.left = -55; c.right = 55; c.top = 55; c.bottom = -55; c.near = 1; c.far = 400; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  }
  scene.add(sun); scene.add(sun.target);

  // ------------------------------------------------------------------ terrain: hills far away, the road's own height close to it
  const margin = 170, cell = amount >= 1 ? 5 : amount >= 0.7 ? 6.5 : 9;
  const xs: number[] = [], zs: number[] = [];
  for (let x = path.minX - margin; x <= path.maxX + margin; x += cell) xs.push(x);
  for (let z = path.minZ - margin; z <= path.maxZ + margin; z += cell) zs.push(z);
  const NX = xs.length, NZ = zs.length, gh = new Float32Array(NX * NZ), gpos = new Float32Array(NX * NZ * 3), gcol = new Float32Array(NX * NZ * 3), guv = new Float32Array(NX * NZ * 2);
  const cNear = new T.Color(map.ground[0]), cFar = new T.Color(map.ground[1]), cAlt = new T.Color(map.ground[2]), cRock = new T.Color(map.scenery === "alpine" ? 0x8a8f98 : map.scenery === "canyon" ? 0xa45a36 : 0x6a6458), c = new T.Color();
  const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let a = 0; a < NX; a++) for (let b = 0; b < NZ; b++) {
    const x = xs[a]!, z = zs[b]!, k = a * NZ + b;
    path.nearest(x, z, tmp);
    const hill = (fbm(x * 0.006 + map.seed, z * 0.006 - map.seed, map.seed, 4) - 0.45) * map.hills * 2;
    const blend = 1 - smooth(hw + 3, hw + 40, tmp.d);
    const y = hill + (tmp.h - 0.12 - hill) * blend - (tmp.d < VERGE ? 0.05 : 0);
    gh[k] = y; gpos[k * 3] = x; gpos[k * 3 + 1] = y; gpos[k * 3 + 2] = z; guv[k * 2] = x * 0.12; guv[k * 2 + 1] = z * 0.12;
    const nz = fbm(x * 0.04, z * 0.04, 7, 3);
    c.copy(cNear).lerp(cFar, smooth(20, 120, tmp.d)).lerp(cAlt, nz > 0.55 ? 0.6 : 0);
    if (map.scenery !== "forest" && map.scenery !== "jungle") c.lerp(cRock, smooth(0.5, 0.9, Math.abs(hill - (tmp.h - 0.12)) / Math.max(1, map.hills) * (1 - blend)) * 0.7);
    const v = 0.9 + nz * 0.2; gcol[k * 3] = c.r * v; gcol[k * 3 + 1] = c.g * v; gcol[k * 3 + 2] = c.b * v;
  }
  const gidx: number[] = [];
  for (let a = 0; a < NX - 1; a++) for (let b = 0; b < NZ - 1; b++) { const i00 = a * NZ + b, i01 = i00 + 1, i10 = (a + 1) * NZ + b, i11 = i10 + 1; gidx.push(i00, i01, i10, i10, i01, i11); }
  const gg = mine(new T.BufferGeometry());
  gg.setAttribute("position", new T.BufferAttribute(gpos, 3)); gg.setAttribute("color", new T.BufferAttribute(gcol, 3)); gg.setAttribute("uv", new T.BufferAttribute(guv, 2));
  gg.setIndex(new T.BufferAttribute(new Uint32Array(gidx), 1)); gg.computeVertexNormals();
  const grassKind = map.scenery === "alpine" ? "snow" : map.scenery === "canyon" ? "sand" : "grass";
  const terrTex = mine(groundTexture(T, grassKind, map.seed));
  const terrain = new T.Mesh(gg, mine(new T.MeshLambertMaterial({ vertexColors: true, map: terrTex, flatShading: true })));
  terrain.receiveShadow = true; group.add(terrain);
  const bs = (arr: number[], v: number) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m]! <= v) lo = m; else hi = m; } return lo; };
  const terrainY = (x: number, z: number) => {
    const a = bs(xs, x), b = bs(zs, z), x0 = xs[a]!, x1 = xs[a + 1] ?? x0 + cell, z0 = zs[b]!, z1 = zs[b + 1] ?? z0 + cell;
    const tx = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))), tz = Math.max(0, Math.min(1, (z - z0) / (z1 - z0)));
    const h00 = gh[a * NZ + b]!, h01 = gh[a * NZ + b + 1] ?? h00, h10 = gh[(a + 1) * NZ + b] ?? h00, h11 = gh[(a + 1) * NZ + b + 1] ?? h00;
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  };

  // ------------------------------------------------------------------ the road: surface, ruts, verges
  const strip = (d0: number, d1: number, dy: number, col?: (i: number, s: number) => number[], uvScale = 6) => {
    const m = n + 1, pos = new Float32Array(m * 6), uvs = new Float32Array(m * 4), cols = new Float32Array(m * 6), idx: number[] = [];
    for (let k = 0; k < m; k++) {
      const i = k % n, x = path.px[i]!, z = path.pz[i]!, rx = -path.fz[i]!, rz = path.fx[i]!;
      for (let s = 0; s < 2; s++) {
        let d = s ? d1 : d0;
        const kp = path.kap[i]!; if (kp * d > 0) { const lim = Math.max(0.6, 1 / Math.abs(kp) - 0.6); if (Math.abs(d) > lim) d = d < 0 ? -lim : lim; }
        const o = (k * 2 + s) * 3, px = x + rx * d, pz = z + rz * d;
        const roadY = path.py[i]!;
        // the verge's outer edge meets the terrain
        const y = Math.abs(d) > hw + 0.1 ? Math.min(roadY, terrainY(px, pz) + 0.06) + dy : roadY + dy;
        pos[o] = px; pos[o + 1] = y; pos[o + 2] = pz;
        uvs[(k * 2 + s) * 2] = (d - d0) / uvScale; uvs[(k * 2 + s) * 2 + 1] = path.arc[k]! / uvScale;
        const cc = col ? col(i, s) : [1, 1, 1]; cols[o] = cc[0]!; cols[o + 1] = cc[1]!; cols[o + 2] = cc[2]!;
      }
    }
    for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uvs, 2)); g.setAttribute("color", new T.BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
    return mine(g);
  };
  const roadTex = mine(map.surface === "tarmac" ? asphaltTexture(T, map.seed + 5) : groundTexture(T, map.surface === "sand" ? "sand" : map.surface === "snow" ? "snow" : map.surface === "mud" ? "mud" : "gravel", map.seed + 5));
  const roadMat = mine(new T.MeshLambertMaterial({ map: roadTex, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const rutC = map.surface === "snow" ? [0.78, 0.82, 0.88] : map.surface === "mud" ? [0.7, 0.66, 0.62] : [0.78, 0.74, 0.7];
  // three strips across: ruts darker where the wheels run
  for (const [a, b, dark] of [[-hw, -hw * 0.55, 0], [-hw * 0.55, -hw * 0.2, 1], [-hw * 0.2, hw * 0.2, 0], [hw * 0.2, hw * 0.55, 1], [hw * 0.55, hw, 0]] as Array<[number, number, number]>) {
    const m = new T.Mesh(strip(a, b, 0.03, () => (dark ? rutC : [1, 1, 1]), 4), roadMat); m.receiveShadow = true; group.add(m);
  }
  const vergeCol = new T.Color(map.ground[0]).lerp(new T.Color(map.surface === "snow" ? 0xffffff : 0x8a7a60), 0.35);
  for (const s of [-1, 1]) {
    const m = new T.Mesh(strip(s < 0 ? -VERGE : hw - 0.05, s < 0 ? -hw + 0.05 : VERGE, 0.02, (i, side) => { const k = (s < 0 ? side : 1 - side); return [vergeCol.r * (0.75 + 0.25 * k), vergeCol.g * (0.75 + 0.25 * k), vergeCol.b * (0.75 + 0.25 * k)]; }, 4), mine(new T.MeshLambertMaterial({ map: terrTex, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    m.receiveShadow = true; group.add(m);
  }

  // ------------------------------------------------------------------ the stage edge: trees, rocks, snow banks (solid) and the scenery beyond
  const props = new MB(T, 90); props.jitter = 0.05; props.ao = { y0: -50, h: 1, k: 0 };
  const placeOK = (x: number, z: number, m: number) => { path.nearest(x, z, tmp); return tmp.d > hw + m; };
  const kinds = TREES[map.scenery]!;
  const treeAt = (mb: MB, x: number, z: number, s: number, r: Rng, yAt?: number) => {
    const y = yAt ?? terrainY(x, z) - 0.2, t = r.pick(kinds), leaf = () => r.pick(t.leaf);
    mb.push(x, y, z, r.int(0, 3) * Math.PI / 2, s);
    if (t.kind === "pine" || t.kind === "snowpine") {
      mb.bar(t.trunk, 0.5, 2.4, 0.5, 0, 0, 0);
      for (let k = 0; k < 4; k++) { const w = 3.4 - k * 0.75; mb.box(leaf(), w, 1.4, w, 0, 2.4 + k * 1.15, 0); if (t.kind === "snowpine") mb.box(0xf4f8fc, w * 0.92, 0.25, w * 0.92, 0, 3.15 + k * 1.15, 0, 0, 0, 0, { jit: 0.02 }); }
      mb.box(leaf(), 0.7, 0.9, 0.7, 0, 7.4, 0);
    } else if (t.kind === "birch") {
      mb.bar(t.trunk, 0.36, 4.2, 0.36, 0, 0, 0); for (let k = 0; k < 4; k++) mb.box(0x2a2a2a, 0.38, 0.08, 0.38, 0, 0.6 + k * 0.9, 0, 0, 0, 0, { jit: 0 });
      mb.box(leaf(), 2.4, 2.2, 2.4, 0, 5.0, 0); mb.box(leaf(), 1.6, 1.4, 1.6, 0.3, 6.4, -0.2);
    } else if (t.kind === "cactus") {
      mb.bar(0x4f7a3a, 0.5, 3.2, 0.5, 0, 0, 0); mb.bar(0x4f7a3a, 0.36, 1.2, 0.36, 0.6, 1.4, 0); mb.box(0x4f7a3a, 0.6, 0.3, 0.3, 0.3, 1.4, 0); mb.bar(0x4f7a3a, 0.34, 1.0, 0.34, -0.55, 1.9, 0); mb.box(0x4f7a3a, 0.5, 0.28, 0.3, -0.3, 1.9, 0);
    } else if (t.kind === "palm") {
      for (let k = 0; k < 6; k++) mb.box(t.trunk, 0.42, 1.1, 0.42, k * 0.08, 0.55 + k * 1.05, 0);
      for (let a = 0; a < 5; a++) { const ang = (a / 5) * Math.PI * 2; mb.box(leaf(), 3.2, 0.12, 0.7, Math.cos(ang) * 1.5 + 0.5, 6.4, Math.sin(ang) * 1.5, 0, -ang, -0.35); }
    } else {
      mb.bar(t.trunk, 0.7, 3.4, 0.7, 0, 0, 0);
      mb.box(leaf(), 4.6, 2.6, 4.6, 0, 4.4, 0); mb.box(leaf(), 3.2, 1.8, 3.2, 0.4, 6.0, -0.3); mb.box(leaf(), 2.0, 1.4, 2.0, -0.6, 3.4, 1.6);
      for (let k = 0; k < 3; k++) mb.box(0x3a6a22, 1.2, 0.2, 0.5, (k - 1) * 0.8, 1.2, 1.8, 0, k, 0.4);
    }
    mb.pop();
  };
  const rockAt = (mb: MB, x: number, z: number, s: number, r: Rng, yAt?: number) => {
    const y = yAt ?? terrainY(x, z) - 0.4, col = map.scenery === "canyon" ? r.pick([0xa45a36, 0x8e4a2c, 0xb86a40]) : map.scenery === "alpine" ? r.pick([0x7d838c, 0x6a7078]) : r.pick([0x7a766c, 0x6a665c]);
    mb.push(x, y, z, r.range(0, 3), s);
    mb.box(col, 2.2, 1.4, 1.8, 0, 0.7, 0); mb.box(col, 1.4, 1.0, 1.2, 0.4, 1.6, 0.2); mb.box(col, 1.0, 0.6, 1.0, -0.6, 0.3, 0.9);
    if (map.scenery === "alpine") mb.box(0xf4f8fc, 1.5, 0.2, 1.3, 0.4, 2.15, 0.2, 0, 0, 0, { jit: 0.02 });
    mb.pop();
  };
  // the edge line: one solid thing every few metres on both sides, a little irregular
  const r1 = new Rng(map.seed + 7);
  for (let i = 0; i < n; i += 1) {
    if (r1.next() > 0.16 * Math.max(0.5, amount)) continue;
    for (const side of [-1, 1]) {
      const d = side * (EDGE + 0.6 + r1.range(0, 2.6)), x = path.px[i]! - path.fz[i]! * d, z = path.pz[i]! + path.fx[i]! * d;
      if (!placeOK(x, z, EDGE - hw - 0.2)) continue;
      if (map.scenery === "canyon" || (map.scenery === "alpine" && r1.chance(0.4))) rockAt(props, x, z, r1.range(0.8, 1.4), r1);
      else treeAt(props, x, z, r1.range(0.85, 1.25), r1);
    }
  }
  // snow banks along the alpine road / red rock walls along the canyon
  if (map.scenery === "alpine" || map.scenery === "canyon") {
    for (let i = 0; i < n; i += 6) for (const side of [-1, 1]) {
      const d = side * (EDGE - 0.9), x = path.px[i]! - path.fz[i]! * d, z = path.pz[i]! + path.fx[i]! * d;
      if (!placeOK(x, z, EDGE - hw - 1.2)) continue;
      const y = terrainY(x, z), yaw = Math.atan2(path.fx[i]!, path.fz[i]!);
      if (map.scenery === "alpine") { props.box(0xf2f6fa, 1.8, 1.2, 7.2, x, y + 0.35, z, 0, yaw, 0, { jit: 0.02 }); props.box(0xe6edf4, 1.2, 0.7, 5.0, x, y + 1.1, z, 0, yaw, 0, { jit: 0.02 }); }
      else { const h = r1.range(8, 26); props.box(r1.pick([0xa45a36, 0x9a5030, 0xb86a40]), 6, h, 7.5, x + side * -path.fz[i]! * 4.1, y + h / 2 - 1, z + side * path.fx[i]! * 4.1, 0, yaw, 0); props.box(0x8e4a2c, 6.4, 1.2, 7.8, x + side * -path.fz[i]! * 4.1, y + h * 0.6, z + side * path.fx[i]! * 4.1, 0, yaw, 0); }
    }
  }
  group.add(props.build(kit, f.shadow > 0));

  // the forest (or rocks / mesas) beyond: instanced, many
  {
    const variants: MB[] = [];
    for (let v = 0; v < 3; v++) { const mb = new MB(T, 120 + v); mb.jitter = 0.06; mb.ao = { y0: 0, h: 4, k: 0.3 }; const r = new Rng(map.seed + v * 11); if (map.scenery === "canyon") rockAt(mb, 0, 0, 1 + v * 0.5, r, -0.4); else treeAt(mb, 0, 0, 1, r, 0); variants.push(mb); }   // built at the origin: each copy is put on the ground below
    const want = Math.round((map.scenery === "jungle" ? 1400 : map.scenery === "canyon" ? 260 : 1000) * amount);
    const dummy = new T.Object3D(), col = new T.Color(), mat = mine(new T.MeshLambertMaterial({ vertexColors: true }));
    const r2 = new Rng(map.seed + 33);
    variants.forEach((mb, vi) => {
      const root = mb.build(kit, false); let geo = null; root.traverse((o: any) => { if (!geo && o.isMesh) geo = o.geometry; });
      if (!geo) return; own.push(geo);
      const count = Math.round(want / 3), im = new T.InstancedMesh(geo, mat, count);
      let made = 0;
      for (let t = 0; made < count && t < count * 12; t++) {
        const x = r2.range(path.minX - 160, path.maxX + 160), z = r2.range(path.minZ - 160, path.maxZ + 160);
        path.nearest(x, z, tmp);
        if (tmp.d < EDGE + 4 || tmp.d > 165) continue;
        if (map.scenery !== "jungle" && fbm(x * 0.012, z * 0.012, map.seed, 2) < 0.42 && tmp.d > 30) continue;
        const sc = r2.range(0.8, 1.7);
        dummy.position.set(x, terrainY(x, z) - 0.2, z); dummy.rotation.set(0, r2.int(0, 3) * Math.PI / 2, 0); dummy.scale.set(sc, sc * r2.range(0.9, 1.3), sc); dummy.updateMatrix();
        im.setMatrixAt(made, dummy.matrix); col.setScalar(r2.range(0.8, 1.12)); im.setColorAt(made, col); made++;
      }
      im.count = made; im.castShadow = f.shadow > 0 && vi < 2; im.frustumCulled = false;
      group.add(im);
    });
  }

  // ------------------------------------------------------------------ start arch, chevrons, crowds at the jumps, hay bales, distance boards
  const deco = new MB(T, 140); deco.jitter = 0.04; deco.ao = { y0: -50, h: 1, k: 0 };
  {
    const s = path.at(0.002), yaw = Math.atan2(s.fx, s.fz), w = hw + 1.6;
    deco.push(s.x, s.y, s.z, yaw);
    for (const sd of [-1, 1]) { deco.box(0x2c313a, 0.8, 6.4, 0.8, sd * w, 3.2, 0); deco.box(0xd2262d, 1.0, 0.6, 1.0, sd * w, 0.3, 0); }
    deco.box(0x1a1d22, w * 2 + 0.8, 1.6, 0.6, 0, 6.6, 0); deco.box(0xffd34d, w * 2 + 0.8, 0.25, 0.64, 0, 7.5, 0); deco.box(0xf2f2f4, w * 2 - 1, 0.7, 0.62, 0, 6.6, 0);
    deco.pop();
  }
  // chevrons on the outside of the tightest bends
  for (let i = 0; i < n; i += 4) {
    if (Math.abs(path.kap[i]!) < 0.055) continue;
    if (Math.abs(path.kap[(i + n - 4) % n]!) >= 0.055 && i % 24 !== 0) continue;
    const side = path.kap[i]! > 0 ? -1 : 1, d = side * (VERGE + 0.8), x = path.px[i]! - path.fz[i]! * d, z = path.pz[i]! + path.fx[i]! * d;
    if (!placeOK(x, z, 2.2)) continue;
    const y = terrainY(x, z), yaw = Math.atan2(-path.fz[i]! * side, path.fx[i]! * side) + Math.PI;
    deco.push(x, y, z, yaw);
    deco.box(0x6d737b, 0.1, 1.6, 0.1, -0.6, 0.8, 0); deco.box(0x6d737b, 0.1, 1.6, 0.1, 0.6, 0.8, 0);
    deco.box(0xd2262d, 1.6, 0.6, 0.06, 0, 1.3, 0);
    for (let k = 0; k < 3; k++) deco.box(0xf2f2f4, 0.16, 0.5, 0.07, (k - 1) * 0.45 + 0.08 * -side, 1.3, 0.01, 0, 0, side * 0.6, { jit: 0 });
    deco.pop();
  }
  // spectators behind tape at each jump, with a photographer or two
  const people = (cx: number, cz: number, yaw: number, count: number, r: Rng) => {
    for (let k = 0; k < count; k++) {
      const x = cx + Math.cos(yaw) * (k - count / 2) * 0.9 + r.range(-0.2, 0.2), z = cz - Math.sin(yaw) * (k - count / 2) * 0.9 + r.range(-0.3, 0.3);
      const y = terrainY(x, z);
      deco.box(r.pick([0x1b1d22, 0x2a3a5a, 0x4a3a2a]), 0.34, 0.8, 0.26, x, y + 0.4, z);
      deco.box(r.pick([0xd2262d, 0x2a5ac8, 0xf2f2f4, 0xe8b830, 0x2ea05a, 0xff7a1a]), 0.46, 0.62, 0.32, x, y + 1.1, z);
      deco.box(r.pick([0xe8c39e, 0xc99870, 0x8a5a3c]), 0.3, 0.3, 0.3, x, y + 1.6, z);
      if (r.chance(0.3)) deco.box(r.pick([0x1b1d22, 0xd2262d, 0x2a5ac8]), 0.34, 0.1, 0.34, x, y + 1.8, z, 0, 0, 0, { jit: 0 });
    }
  };
  const r3 = new Rng(map.seed + 55);
  for (const [u] of map.jumps) {
    const s = path.at(u + 0.004);
    for (const side of [-1, 1]) {
      const d = side * (VERGE + 4.5), x = s.x + s.rx * d, z = s.z + s.rz * d;
      if (!placeOK(x, z, 3)) continue;
      const yaw = Math.atan2(s.fx, s.fz) + Math.PI / 2;
      // tape on posts between the crowd and the road
      const tx = s.x + s.rx * side * (VERGE + 2.2), tz = s.z + s.rz * side * (VERGE + 2.2), ty = terrainY(tx, tz);
      for (let k = -3; k <= 3; k++) deco.box(0x9aa0a8, 0.05, 1.0, 0.05, tx + s.fx * k * 2.2, ty + 0.5, tz + s.fz * k * 2.2, 0, 0, 0, { jit: 0 });
      deco.box(0xd2262d, 0.03, 0.06, 13.2, tx, ty + 0.92, tz, 0, Math.atan2(s.fx, s.fz), 0, { jit: 0 });
      people(x, z, yaw, Math.round(9 * amount + 3), r3);
    }
  }
  // hay bales on the outside of corner exits
  for (let i = 0; i < n; i += 9) {
    if (Math.abs(path.kap[i]!) < 0.035 || r3.next() > 0.35) continue;
    const side = path.kap[i]! > 0 ? -1 : 1, d = side * (VERGE + 1.6), x = path.px[i]! - path.fz[i]! * d, z = path.pz[i]! + path.fx[i]! * d;
    if (!placeOK(x, z, 2.6)) continue;
    const y = terrainY(x, z), yaw = Math.atan2(path.fx[i]!, path.fz[i]!);
    deco.box(0xd8b860, 1.2, 0.8, 2.2, x, y + 0.4, z, 0, yaw, 0); deco.box(0xc8a850, 1.2, 0.8, 2.2, x, y + 1.2, z, 0, yaw + 0.1, 0);
  }
  group.add(deco.build(kit, f.shadow > 0));

  // ------------------------------------------------------------------ river crossings: moving water across the road, with banks of reeds
  const rivers: any[] = [];
  for (const u of map.water) {
    const s = path.at(u), yaw = Math.atan2(s.fx, s.fz);
    const wt = document.createElement("canvas"); wt.width = 64; wt.height = 64;
    const g = wt.getContext("2d")!; g.fillStyle = "#4a5a52"; g.fillRect(0, 0, 64, 64);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(220,235,235,${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * 64, Math.random() * 64, 6 + Math.random() * 12, 1.5); }
    const wtex = mine(new T.CanvasTexture(wt)); wtex.wrapS = wtex.wrapT = T.RepeatWrapping; wtex.repeat.set(6, 1); wtex.colorSpace = T.SRGBColorSpace;
    const w = new T.Mesh(mine(new T.PlaneGeometry(60, 14)), mine(new T.MeshStandardMaterial({ map: wtex, color: 0x8aa0a0, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.86 })));
    w.rotation.order = "YXZ"; w.rotation.set(-Math.PI / 2, yaw + Math.PI / 2, 0); w.position.set(s.x, s.y - 0.35, s.z); group.add(w);
    rivers.push(wtex);
  }

  // ------------------------------------------------------------------ weather: snow, rain or dust around the camera
  let wx: any = null, wxPos: Float32Array | null = null, wxVel = 0;
  if (map.weather !== "clear") {
    const N = Math.round((map.weather === "dust" ? 500 : 2200) * amount);
    wxPos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { wxPos[i * 3] = (Math.random() - 0.5) * 80; wxPos[i * 3 + 1] = Math.random() * 30; wxPos[i * 3 + 2] = (Math.random() - 0.5) * 80; }
    const g = mine(new T.BufferGeometry()); g.setAttribute("position", new T.BufferAttribute(wxPos, 3));
    const col = map.weather === "snow" ? 0xffffff : map.weather === "rain" ? 0xb8c8d0 : 0xe8c090;
    wx = new T.Points(g, mine(new T.PointsMaterial({ color: col, size: map.weather === "snow" ? 0.22 : map.weather === "rain" ? 0.08 : 0.5, transparent: true, opacity: map.weather === "dust" ? 0.35 : 0.85, depthWrite: false })));
    wx.frustumCulled = false; group.add(wx);
    wxVel = map.weather === "snow" ? 2.2 : map.weather === "rain" ? 16 : 0.6;
  }

  // ------------------------------------------------------------------ the physics ground
  const near = { d: 0, h: 0, i: 0, side: 1 };
  const roadS = { mu: map.mu, drag: 0.002, rough: map.surface === "mud" ? 0.22 : map.surface === "snow" ? 0.08 : 0.14, kind: map.surface };
  const vergeS = { mu: map.muVerge, drag: 0.012, rough: 0.45, kind: "verge" };
  const wildS = { mu: map.muVerge * 0.9, drag: 0.03, rough: 0.8, kind: "rough" };
  const waterS = { mu: map.mu * 0.8, drag: 0.09, rough: 0.3, kind: "water" };
  const out: any = { h: 0, s: roadS, lat: 0, i: 0, water: false };
  const ground = (x: number, z: number, hint = -1) => {
    if (hint >= 0) path.nearestFrom(x, z, hint, 90, near); else path.nearest(x, z, near);
    const i = near.i, j = (i + 1) % n, rx = -path.fz[i]!, rz = path.fx[i]!;
    const lat = (x - path.px[i]!) * rx + (z - path.pz[i]!) * rz;
    const seg = Math.hypot(path.px[j]! - path.px[i]!, path.pz[j]! - path.pz[i]!) || 1;
    const along = ((x - path.px[i]!) * path.fx[i]! + (z - path.pz[i]!) * path.fz[i]!) / seg;
    const k = along < 0 ? (i - 1 + n) % n : j, t = Math.min(1, Math.abs(along));
    const roadH = path.py[i]! + (path.py[k]! - path.py[i]!) * t;
    const a = Math.abs(lat);
    let h: number, s: any;
    if (a <= hw) { h = roadH; s = roadS; }
    else if (a <= VERGE) { const tt = (a - hw) / (VERGE - hw); h = roadH + (Math.min(roadH, terrainY(x, z) + 0.06) - roadH) * tt; s = vergeS; }
    else { h = terrainY(x, z); s = wildS; }
    let water = false;
    if (a <= VERGE + 3) for (const u of map.water) { let d = Math.abs(i / n - u); d = Math.min(d, 1 - d); if (d < 0.009) { water = true; s = waterS; } }
    out.h = h; out.s = s; out.lat = lat; out.i = i; out.water = water;
    return out;
  };

  const startH = (slot: number) => {
    // grid: two by two behind the line, staggered
    const back = 9 + Math.floor(slot / 2) * 9, side = (slot % 2 ? 1 : -1) * hw * 0.42;
    const u = 1 - back / path.total, s = path.at(u);
    const x = s.x + s.rx * side, z = s.z + s.rz * side;
    return { x, z, h: Math.atan2(s.fx, s.fz), y: s.y };
  };

  let t0 = 0;
  return {
    path, map, kit, edge: EDGE, ground, sunDir,
    start: startH,
    update(dt: number, cam: any, focus: { x: number; z: number }) {
      t0 += dt;
      sky.update(dt, cam);
      sun.position.set(focus.x + sunDir.x * 160, sunDir.y * 160 + 10, focus.z + sunDir.z * 160); sun.target.position.set(focus.x, 0, focus.z); sun.target.updateMatrixWorld();
      for (const w of rivers) w.offset.x -= dt * 0.25;
      if (wx && wxPos) {
        const N = wxPos.length / 3, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
        for (let i = 0; i < N; i++) {
          let x = wxPos[i * 3]!, y = wxPos[i * 3 + 1]!, z = wxPos[i * 3 + 2]!;
          y -= wxVel * dt * (0.7 + (i % 7) * 0.08);
          if (map.weather !== "rain") { x += Math.sin(t0 + i) * dt * 0.6; z += Math.cos(t0 * 0.7 + i) * dt * 0.6; }
          if (map.weather === "dust") { x += dt * 3; y += Math.sin(t0 + i) * dt * 0.5 + wxVel * dt * 0.95; }
          if (y < cy - 6) y += 30; if (y > cy + 24) y -= 30;
          if (x < cx - 40) x += 80; if (x > cx + 40) x -= 80; if (z < cz - 40) z += 80; if (z > cz + 40) z -= 80;
          wxPos[i * 3] = x; wxPos[i * 3 + 1] = y; wxPos[i * 3 + 2] = z;
        }
        wx.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      scene.remove(group); scene.remove(hemi); scene.remove(sun); scene.remove(sun.target); sky.dispose();
      group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
      own.forEach((o) => o && o.dispose && o.dispose());
      kit.list().forEach((m: any) => m.dispose());
      scene.fog = null;
    },
  };
}
