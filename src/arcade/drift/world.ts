// @ts-nocheck
import { MB } from "../../world/infinite/mb";
import { Rng } from "../../world/infinite/rng";
import { TrackPath } from "../f1/path";
import { makeKit } from "../f1/car";
import type { Features } from "../car3d/stage";
import type { DriftMap } from "./maps";
import { concreteTexture, asphaltTexture, lightPoolTexture, streakTexture, containerTexture, windowsTexture, dashTexture, nightSkyTexture, checkerTexture } from "../car3d/tex";
import { createCarSky, SUNSET } from "../car3d/sky";

/**
 * The night docks around a Drift King course: quay slab, harbour water, the course with its painted edges, barriers / container walls / tyre
 * walls, sodium lamps with pools of light, container stacks, gantry cranes with blinking aviation lights, a moored container ship, warehouses,
 * a city skyline across the water, stars and the moon. Also the data the game needs: where the walls and the water are, the clipping zones.
 */
export interface DriftWorld {
  path: TrackPath;
  map: DriftMap;
  kit: any;
  /** quay slab in world coordinates */
  quay: { x0: number; x1: number; z0: number; z1: number };
  /** distance from the centre line to the barrier on each side, per path sample (Infinity where the side is open to the sea) */
  wallL: Float32Array; wallR: Float32Array;
  clips: Array<{ u: number; side: number; x: number; z: number; mark: any; lit: number }>;
  start: { x: number; z: number; h: number };
  moon: any;
  update(dt: number, t: number, cam: any, focus: { x: number; z: number }): void;
  dispose(): void;
}

const CONT = ["#b5332a", "#2a5aa8", "#2e8a4e", "#d48a1e", "#6c6f75", "#7b2d6e", "#c9c3b5", "#1e6f78", "#a8402a", "#25407a"];

export function buildDriftWorld(T: any, scene: any, map: DriftMap, f: Features, time: "night" | "sunset" = "night"): DriftWorld {
  const kit = makeKit(T), rnd = new Rng(map.seed * 7 + 3), own: any[] = [];
  const mine = <A>(a: A): A => { own.push(a); return a; };
  const group = new T.Group(); scene.add(group);
  const path = new TrackPath(map.pts, () => 0, 1, map.width * 0.72);
  const n = path.n, hw = map.width / 2;
  const q = { x0: path.minX - map.quay[0], x1: path.maxX + map.quay[1], z0: path.minZ - map.quay[2], z1: path.maxZ + map.quay[3] };
  const onQuay = (x: number, z: number) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1;
  const tmp = { d: 0, h: 0, i: 0, side: 1 };
  /** true if a point is at least `m` metres outside the course (from every stretch of it) and on the quay */
  const clear = (x: number, z: number, m: number) => { path.nearest(x, z, tmp); return tmp.d > hw + m && onQuay(x, z); };
  const amount = f.amount;

  // ------------------------------------------------------------------ sky, fog, moon, stars, lights
  // 5.67.0: "sunset" swaps the night for golden hour over the harbour (Forza-style sky, low orange sun, the lamps just coming on)
  const sunset = time === "sunset";
  scene.fog = sunset ? new T.FogExp2(0x9a5a48, 0.0042) : new T.FogExp2(0x0a0e18, 0.0065);
  scene.background = new T.Color(sunset ? 0x3a2228 : 0x05070d);
  const sunDir = new T.Vector3(-0.62, 0.07, -0.78).normalize();
  const goldSky = sunset ? createCarSky(T, scene, { top: SUNSET.top, mid: SUNSET.mid, low: SUNSET.low, sunDir, sunColor: SUNSET.sun, gold: 1, clouds: 0.45, quality: amount >= 1 ? 1 : 0 }) : null;
  const sky = new T.Mesh(mine(new T.SphereGeometry(1400, 24, 12)), mine(new T.MeshBasicMaterial({ map: nightSkyTexture(T), side: T.BackSide, fog: false, depthWrite: false })));
  sky.renderOrder = -10; if (!sunset) group.add(sky);
  if (!sunset) {
    const N = Math.round(900 * amount), sp = new Float32Array(N * 3), r = new Rng(5);
    for (let i = 0; i < N; i++) { const a = r.range(0, Math.PI * 2), e = r.range(0.12, 1.45); sp[i * 3] = Math.cos(a) * Math.cos(e) * 1300; sp[i * 3 + 1] = Math.sin(e) * 1300; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 1300; }
    const g = mine(new T.BufferGeometry()); g.setAttribute("position", new T.BufferAttribute(sp, 3));
    const stars = new T.Points(g, mine(new T.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
    group.add(stars);
  }
  const moon = new T.Mesh(mine(new T.CircleGeometry(38, 24)), mine(new T.MeshBasicMaterial({ color: 0xf2eedd, fog: false })));
  moon.position.set(-700, 520, -900); moon.lookAt(0, 0, 0); if (!sunset) group.add(moon);
  const hemi = sunset ? new T.HemisphereLight(SUNSET.hemiSky, SUNSET.hemiGround, 0.85) : new T.HemisphereLight(0x3a4a78, 0x0c0c12, 0.55); scene.add(hemi);
  const moonL = sunset ? new T.DirectionalLight(SUNSET.sun, 2.6) : new T.DirectionalLight(0xa8bcff, 0.5);   // at sunset this is the low sun
  if (sunset) moonL.position.copy(sunDir).multiplyScalar(150); else moonL.position.set(-70, 60, -90);
  if (f.shadow) {
    moonL.castShadow = true; moonL.shadow.mapSize.set(f.shadow, f.shadow);
    const c = moonL.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 260; moonL.shadow.bias = -0.0006;
  }
  scene.add(moonL); scene.add(moonL.target);

  // ------------------------------------------------------------------ quay slab and water
  const cTex = concreteTexture(T, map.seed); cTex.repeat.set((q.x1 - q.x0) / 9, (q.z1 - q.z0) / 9); mine(cTex);
  const slabMat = mine(new T.MeshStandardMaterial({ map: cTex, roughness: 0.82, metalness: 0.05, color: 0x9a9ca2 }));
  const slab = new T.Mesh(mine(new T.BoxGeometry(q.x1 - q.x0, 3, q.z1 - q.z0)), slabMat);
  slab.position.set((q.x0 + q.x1) / 2, -1.5, (q.z0 + q.z1) / 2); slab.receiveShadow = true; group.add(slab);
  const water = new T.Mesh(mine(new T.PlaneGeometry(4000, 4000, 1, 1)), mine(new T.MeshStandardMaterial({ color: sunset ? 0x1a2a3c : 0x050d16, roughness: sunset ? 0.12 : 0.18, metalness: 0.7 })));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.7; group.add(water);

  // quay edge: yellow-and-black kerb, bollards, rubber fenders hanging over the water
  const edge = new MB(T, 40); edge.jitter = 0.02; edge.ao = { y0: -2, h: 1, k: 0 };
  const sides: Array<[number, number, number, number]> = [[q.x0, q.z0, q.x1, q.z0], [q.x1, q.z0, q.x1, q.z1], [q.x1, q.z1, q.x0, q.z1], [q.x0, q.z1, q.x0, q.z0]];
  for (const [ax, az, bx, bz] of sides) {
    const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len, yaw = Math.atan2(dx, dz), nx = dz, nz = -dx;   // n points out to sea
    for (let s = 1; s < len; s += 3) {
      const x = ax + dx * s - nx * 0.25, z = az + dz * s - nz * 0.25;
      edge.box(Math.floor(s / 3) % 2 ? 0xe0b020 : 0x1a1a1c, 0.5, 0.18, 3, x, 0.09, z, 0, yaw, 0, { jit: 0 });
      if (Math.floor(s / 3) % 5 === 2) { edge.cyl(0x2a2c30, 0.22, 0.26, 0.6, x - nx * 0.4, 0.3, z - nz * 0.4, 8); edge.cyl(0x2a2c30, 0.32, 0.32, 0.1, x - nx * 0.4, 0.62, z - nz * 0.4, 8); }
      if (Math.floor(s / 3) % 7 === 0) edge.box(0x111214, 0.5, 1.4, 1.2, x + nx * 0.5, -0.9, z + nz * 0.5, 0, yaw, 0);
    }
  }
  group.add(edge.build(kit, f.shadow > 0));

  // ------------------------------------------------------------------ the course: tarmac, edge lines, start line
  const strip = (d0: (i: number) => number, d1: (i: number) => number, y: number, uv?: (k: number, s: number) => number[]) => {
    const m = n + 1, pos = new Float32Array(m * 6), uvs = new Float32Array(m * 4), idx: number[] = [];
    for (let k = 0; k < m; k++) {
      const i = k % n, x = path.px[i]!, z = path.pz[i]!, rx = -path.fz[i]!, rz = path.fx[i]!;
      for (let s = 0; s < 2; s++) {
        const d = s ? d1(i) : d0(i), o = (k * 2 + s) * 3;
        pos[o] = x + rx * d; pos[o + 1] = y; pos[o + 2] = z + rz * d;
        const t = uv ? uv(k, s) : [s, path.arc[k]! / 8]; uvs[(k * 2 + s) * 2] = t[0]!; uvs[(k * 2 + s) * 2 + 1] = t[1]!;
      }
    }
    for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    return mine(g);
  };
  const aTex = mine(asphaltTexture(T, map.seed)); aTex.repeat.set(1, 1);
  const course = new T.Mesh(strip(() => -hw, () => hw, 0.01, (k, s) => [s * map.width / 8, path.arc[k]! / 8]), mine(new T.MeshStandardMaterial({ map: aTex, roughness: 0.62, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  course.receiveShadow = true; group.add(course);
  const dTex = mine(dashTexture(T, "#f0f0f2")), yTex = mine(dashTexture(T, "#f2c230"));
  const lineMat = (t: any) => mine(new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xb8b8bc }));
  group.add(new T.Mesh(strip(() => -hw + 0.25, () => -hw + 0.5, 0.012, (k, s) => [s, path.arc[k]! / 4]), lineMat(dTex)));
  group.add(new T.Mesh(strip(() => hw - 0.5, () => hw - 0.25, 0.012, (k, s) => [s, path.arc[k]! / 4]), lineMat(dTex)));
  group.add(new T.Mesh(strip(() => -0.12, () => 0.12, 0.012, (k, s) => [s, path.arc[k]! / 9]), lineMat(yTex)));
  {
    const s = path.at(0), ck = mine(checkerTexture(T)); ck.repeat.set(map.width / 2, 1);
    const g = new T.Mesh(mine(new T.PlaneGeometry(map.width, 1.2)), mine(new T.MeshBasicMaterial({ map: ck, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, color: 0xaaaaaa })));
    g.rotation.set(-Math.PI / 2, 0, Math.atan2(s.fx, s.fz)); g.rotation.order = "YXZ"; g.rotation.set(-Math.PI / 2, Math.atan2(s.fx, s.fz), 0);
    g.position.set(s.x, 0.013, s.z); group.add(g);
  }

  // ------------------------------------------------------------------ walls (collision data first)
  const wallL = new Float32Array(n).fill(hw), wallR = new Float32Array(n).fill(hw);
  for (let i = 0; i < n; i++) {
    for (const side of [-1, 1]) {
      const x = path.px[i]! - path.fz[i]! * side * (hw + 0.3), z = path.pz[i]! + path.fx[i]! * side * (hw + 0.3);
      if (!onQuay(x, z)) (side < 0 ? wallL : wallR)[i] = Infinity;
    }
  }
  const walls = new MB(T, 50); walls.jitter = 0.04; walls.ao = { y0: 0, h: 0.9, k: 0.3 };
  const tyreMB = new MB(T, 51); tyreMB.jitter = 0.03; tyreMB.ao = { y0: 0, h: 1, k: 0.2 };
  const contPlaced: Array<{ x: number; z: number; yaw: number; len: number; tier: number; col: number }> = [];
  const placeAlong = (spacing: number, fn: (i: number, side: number, x: number, z: number, yaw: number, s: any) => void) => {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, step = Math.hypot(path.px[j]! - path.px[i]!, path.pz[j]! - path.pz[i]!);
      acc += step;
      if (acc < spacing) continue;
      acc -= spacing;
      for (const side of [-1, 1]) {
        if ((side < 0 ? wallL : wallR)[i] === Infinity) continue;
        const rx = -path.fz[i]! * side, rz = path.fx[i]! * side;
        fn(i, side, path.px[i]! + rx, path.pz[i]! + rz, Math.atan2(path.fx[i]!, path.fz[i]!), { rx, rz });
      }
    }
  };
  // concrete barriers with red / white bands, or tyre stacks with a white band, at the course edge
  let band = 0;
  placeAlong(2.1, (i, side, x0, z0, yaw, s) => {
    const d = hw + 0.32, x = path.px[i]! + s.rx * d, z = path.pz[i]! + s.rz * d;
    // on the inside of a tight bend a straight block would poke into the course: skip it where the curvature is too high for the spacing
    if (Math.abs(path.kap[i]!) * (hw + 1) > 0.9) return;
    band++;
    const useTyres = map.walls === "mixed" ? Math.floor(i / 40) % 2 === 1 : false;
    if (useTyres) {
      for (let k = 0; k < 2; k++) for (let h = 0; h < 3; h++) tyreMB.cyl(0x141417, 0.42, 0.42, 0.3, x + Math.sin(yaw) * (k - 0.5) * 0.95, 0.15 + h * 0.3, z + Math.cos(yaw) * (k - 0.5) * 0.95, 10, 0, 0, 0);
      tyreMB.cyl(0xe9e9ee, 0.43, 0.43, 0.08, x, 0.95, z, 10, 0, 0, 0, { jit: 0 });
    } else {
      walls.box(0xa9abb0, 0.62, 0.82, 2.0, x, 0.41, z, 0, yaw, 0);
      walls.box(0x8d8f94, 0.36, 0.16, 2.0, x, 0.88, z, 0, yaw, 0);
      walls.box(band % 2 ? 0xd2262d : 0xf0f0f2, 0.64, 0.24, 2.02, x, 0.5, z, 0, yaw, 0, { jit: 0 });
    }
  });
  // container walls behind the barriers (Container Alley, Crane Yard), stacked 1-3 high
  if (map.walls === "containers" || map.walls === "mixed") {
    placeAlong(6.4, (i, side, x0, z0, yaw, s) => {
      const d = hw + 2.1, x = path.px[i]! + s.rx * d, z = path.pz[i]! + s.rz * d;
      if (!clear(x, z, 1.6)) return;
      const cx = x + Math.sin(yaw) * 3, cz = z + Math.cos(yaw) * 3, cx2 = x - Math.sin(yaw) * 3, cz2 = z - Math.cos(yaw) * 3;
      if (!clear(cx, cz, 1.4) || !clear(cx2, cz2, 1.4)) return;
      const tiers = 1 + (rnd.chance(0.55) ? 1 : 0) + (rnd.chance(0.25) ? 1 : 0);
      for (let t = 0; t < tiers; t++) contPlaced.push({ x, z, yaw, len: 6.06, tier: t, col: rnd.int(0, CONT.length - 1) });
    });
  }
  group.add(walls.build(kit, f.shadow > 0));
  group.add(tyreMB.build({ ...kit, lit: kit.rubber }, f.shadow > 0));

  // ------------------------------------------------------------------ container yard: stacks wherever the quay is free
  {
    const cell = 7;
    for (let x = q.x0 + 8; x < q.x1 - 8; x += cell * (rnd.chance(0.5) ? 1 : 2)) for (let z = q.z0 + 10; z < q.z1 - 10; z += 13.5) {
      if (!clear(x, z, 9) || !clear(x, z + 6, 9) || !clear(x, z - 6, 9) || !rnd.chance(0.55 * amount + 0.2)) continue;
      const tiers = rnd.int(1, 4);
      for (let t = 0; t < tiers; t++) contPlaced.push({ x: x + rnd.range(-0.2, 0.2), z, yaw: 0, len: 12.2, tier: t, col: rnd.int(0, CONT.length - 1) });
    }
  }
  // all containers: one instanced mesh per colour (each colour has its own painted side with a line's name)
  const contGeo = mine(new T.BoxGeometry(2.44, 2.59, 1));
  const byCol = new Map<number, typeof contPlaced>();
  for (const c of contPlaced) { if (!byCol.has(c.col)) byCol.set(c.col, []); byCol.get(c.col)!.push(c); }
  const dummy = new T.Object3D();
  byCol.forEach((list, ci) => {
    const t = mine(containerTexture(T, CONT[ci]!, ci));
    const side = mine(new T.MeshLambertMaterial({ map: t }));
    const end = mine(new T.MeshLambertMaterial({ color: new T.Color(CONT[ci]!).multiplyScalar(0.8) }));
    const im = new T.InstancedMesh(contGeo, [side, side, end, end, end, end], list.length);
    // box faces: +x, -x, +y, -y, +z, -z; the long sides of a container are +-x after the scale below (length along z)
    list.forEach((c, k) => { dummy.position.set(c.x, 1.3 + c.tier * 2.6, c.z); dummy.rotation.set(0, c.yaw, 0); dummy.scale.set(1, 1, c.len); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); });
    im.castShadow = f.shadow > 0; im.receiveShadow = true;
    group.add(im);
  });

  // ------------------------------------------------------------------ sodium lamps: poles, glowing heads, pools of light; a few cast real light
  const lampMB = new MB(T, 60); lampMB.jitter = 0.02; lampMB.ao = { y0: 0, h: 2, k: 0.2 };
  const lampHead = new MB(T, 61); lampHead.jitter = 0; lampHead.ao = { y0: -9, h: 1, k: 0 };
  const lamps: Array<{ x: number; z: number; hx: number; hz: number }> = [];
  {
    let acc = 0, k = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n; acc += Math.hypot(path.px[j]! - path.px[i]!, path.pz[j]! - path.pz[i]!);
      if (acc < 30) continue; acc = 0; k++;
      const side = k % 2 ? 1 : -1, d = hw + 3.4, rx = -path.fz[i]! * side, rz = path.fx[i]! * side;
      const x = path.px[i]! + rx * d, z = path.pz[i]! + rz * d;
      if (!clear(x, z, 2.2)) continue;
      const hx = x - rx * 2.6, hz = z - rz * 2.6, yaw = Math.atan2(-rx, -rz);
      lampMB.cyl(0x5d6168, 0.14, 0.2, 10, x, 5, z, 6);
      lampMB.box(0x5d6168, 0.14, 0.14, 2.8, (x + hx) / 2, 9.9, (z + hz) / 2, 0, yaw, 0);
      lampMB.box(0x3d4046, 0.7, 0.22, 0.9, hx, 9.8, hz, 0, yaw, 0);
      lampHead.box(0xffb066, 0.56, 0.06, 0.74, hx, 9.67, hz, 0, yaw, 0, { mat: "lamp" });
      lamps.push({ x, z, hx, hz });
    }
  }
  group.add(lampMB.build(kit, f.shadow > 0));
  const headMat = mine(new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  group.add(lampHead.build({ ...kit, lamp: headMat }, false));
  const poolTex = mine(lightPoolTexture(T)), poolMat = mine(new T.MeshBasicMaterial({ map: poolTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, opacity: 0.55 }));
  const poolGeo = mine(new T.PlaneGeometry(26, 26));
  for (const l of lamps) { const p = new T.Mesh(poolGeo, poolMat); p.rotation.x = -Math.PI / 2; p.position.set(l.hx, 0.02, l.hz); p.renderOrder = 2; group.add(p); }
  // a few real lights: spread evenly along the lamps (the course is lit, the shading on the cars and walls is real)
  const realLights: any[] = [];
  const nReal = Math.min(lamps.length, f.lights);
  for (let k = 0; k < nReal; k++) {
    const l = lamps[Math.floor((k * lamps.length) / nReal)]!;
    const pl = new T.PointLight(0xffa860, 120, 38, 2); pl.position.set(l.hx, 9.2, l.hz); scene.add(pl); realLights.push(pl);
  }

  // ------------------------------------------------------------------ gantry cranes on the quay edge, a ship alongside, warehouses inland
  const big = new MB(T, 70); big.jitter = 0.03; big.ao = { y0: 0, h: 6, k: 0.15 };
  const blink: any[] = [];
  const blinkMB = new MB(T, 71); blinkMB.jitter = 0; blinkMB.ao = { y0: -99, h: 1, k: 0 };
  const craneCount = map.id === "crane" ? 4 : 2;
  const south = q.z1;
  for (let k = 0; k < craneCount; k++) {
    const x = q.x0 + ((k + 0.7) / (craneCount + 0.4)) * (q.x1 - q.x0), z = south - 9;
    if (!clear(x, z, 4) && !clear(x, z - 12, 4)) continue;
    big.push(x, 0, z, 0);
    const col = 0xc9302c, col2 = 0xd8dadf;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) big.box(col, 1.2, 34, 1.2, sx * 9, 17, sz * 7);
    for (const sz of [-1, 1]) { big.box(col, 19.2, 1.6, 1.6, 0, 34, sz * 7); big.box(col, 19.2, 1.2, 1.2, 0, 14, sz * 7); }
    for (const sx of [-1, 1]) big.box(col, 1.6, 1.6, 15.6, sx * 9, 34, 0);
    big.box(col, 4.4, 2.2, 88, 0, 37, 22);                     // boom out over the water
    big.box(col2, 7, 5, 8, 0, 40, -6);                         // machinery house
    big.box(0x1a2a3a, 7.1, 1.2, 8.1, 0, 41, -6);
    big.box(0x30343a, 3.2, 2.2, 3.2, 0, 34.5, 30);             // trolley and the spreader on its ropes
    big.box(0x9aa0a8, 0.08, 18, 0.08, -1, 25, 30); big.box(0x9aa0a8, 0.08, 18, 0.08, 1, 25, 30);
    big.box(0xe0b020, 6.2, 0.5, 2.6, 0, 16, 30);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) big.box(0xe0b020, 1.6, 0.8, 2.6, sx * 9, 0.4, sz * 7);
    big.pop();
    for (const p of [[x, 41.8, z - 6], [x, 38.4, z + 65]]) { blinkMB.box(0xff2020, 0.5, 0.5, 0.5, p[0]!, p[1]!, p[2]!, 0, 0, 0, { mat: "lamp" }); }
  }
  // the ship moored past the south edge
  {
    const L = Math.min(190, (q.x1 - q.x0) * 0.85), sx = (q.x0 + q.x1) / 2, sz = south + 14;
    big.push(sx, -1.7, sz, 0);
    big.box(0x1c2733, L, 9, 24, 0, 2.5, 0); big.box(0x8a1f1f, L - 2, 2.2, 23.6, 0, -1.2, 0); big.box(0xe0e2e6, L, 0.5, 24.2, 0, 7.1, 0);
    big.box(0x1c2733, 14, 9, 20, L / 2 - 4, 3, 0, 0, 0, 0);
    big.box(0xe9ebee, 12, 18, 22, -L / 2 + 16, 16, 0);         // bridge superstructure
    big.box(0x2a2e35, 3, 8, 3, -L / 2 + 10, 28, 0);            // funnel
    const r2 = new Rng(77);
    for (let x = -L / 2 + 26; x < L / 2 - 12; x += 13) for (let zz = -9; zz <= 9; zz += 2.6) { const h = r2.int(1, 5); for (let t = 0; t < h; t++) big.box(new T.Color(r2.pick(CONT)).getHex(), 12.2, 2.55, 2.4, x, 8.6 + t * 2.6, zz); }
    big.pop();
    const bw = mine(new T.MeshBasicMaterial({ map: mine(windowsTexture(T, 31, 0.6)), color: 0xb0b0b0 }));
    const bridgeWin = new T.Mesh(mine(new T.PlaneGeometry(10, 6)), bw); bridgeWin.position.set(sx - L / 2 + 16, -1.7 + 20, sz - 11.1); bridgeWin.rotation.y = Math.PI; group.add(bridgeWin);
    blinkMB.box(0xff2020, 0.6, 0.6, 0.6, sx - L / 2 + 10, 31, sz, 0, 0, 0, { mat: "lamp" });
    blinkMB.box(0x30ff60, 0.5, 0.5, 0.5, sx + L / 2, 8, sz, 0, 0, 0, { mat: "lamp" });
  }
  // warehouses along the north edge, with lit office windows
  {
    const winMat = mine(new T.MeshBasicMaterial({ map: mine(windowsTexture(T, 12, 0.25)), color: 0x9a9a9a }));
    for (let x = q.x0 + 20; x < q.x1 - 20; x += 46) {
      const z = q.z0 + 12;
      if (!clear(x, z, 8) || !clear(x - 18, z, 8) || !clear(x + 18, z, 8)) continue;
      big.push(x, 0, z, 0);
      big.box(0x7d838c, 40, 11, 18, 0, 5.5, 0); big.gable(0x5a6068, 40.6, 3, 18.6, 0, 11, 0, Math.PI / 2);
      for (let k = -2; k <= 2; k++) { big.box(0x4a4f57, 5, 6, 0.2, k * 7.5, 3, 9.05); big.box(0xe0b020, 5.2, 0.3, 0.25, k * 7.5, 6.2, 9.1); }
      big.pop();
      const w = new T.Mesh(mine(new T.PlaneGeometry(36, 2.4)), winMat); w.position.set(x, 8.5, z + 9.12); group.add(w);
    }
  }
  group.add(big.build(kit, f.shadow > 0));
  const blinkMat = mine(new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const blinkRoot = blinkMB.build({ ...kit, lamp: blinkMat }, false); group.add(blinkRoot);

  // ------------------------------------------------------------------ the city across the water
  {
    const N = Math.round(90 * amount + 30), r3 = new Rng(map.seed + 99);
    const geo = mine(new T.BoxGeometry(1, 1, 1));
    const mat = mine(new T.MeshBasicMaterial({ map: mine(windowsTexture(T, 44, 0.3)), color: 0x8c8c94 }));
    const im = new T.InstancedMesh(geo, mat, N);
    for (let k = 0; k < N; k++) {
      const a = r3.range(-1.25, 1.25) + Math.PI * 1.5, R = r3.range(650, 1000), w = r3.range(25, 60), h = r3.range(30, 180) * (r3.chance(0.15) ? 1.8 : 1);
      dummy.position.set(Math.cos(a) * R, h / 2 - 2, Math.sin(a) * R); dummy.rotation.set(0, r3.range(0, 3), 0); dummy.scale.set(w, h, w); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
    }
    group.add(im);
  }

  // ------------------------------------------------------------------ clipping zones and cones
  const clipMat = mine(new T.MeshBasicMaterial({ color: 0x1fb6ff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  const clipGeo = mine(new T.PlaneGeometry(2.6, 7));
  const clips = map.clips.map(([u, side]) => {
    const s = path.at(u), d = side * (hw - 1.5), x = s.x + s.rx * d, z = s.z + s.rz * d;
    const m = new T.Mesh(clipGeo, clipMat.clone()); own.push(m.material);
    m.rotation.order = "YXZ"; m.rotation.set(-Math.PI / 2, Math.atan2(s.fx, s.fz), 0); m.position.set(x, 0.03, z); m.renderOrder = 2; group.add(m);
    // a light post at the wall with the zone's colour
    const post = new T.Mesh(mine(new T.BoxGeometry(0.25, 2.2, 0.25)), mine(new T.MeshBasicMaterial({ color: 0x1fb6ff, toneMapped: false })));
    post.position.set(s.x + s.rx * side * (hw + 0.9), 1.1, s.z + s.rz * side * (hw + 0.9)); group.add(post);
    return { u, side, x, z, mark: m, lit: 0 };
  });
  const cones = new MB(T, 80); cones.jitter = 0.03; cones.ao = { y0: 0, h: 0.6, k: 0.2 };
  for (const c of clips) for (const k of [-3, 3]) {
    const s = path.at(c.u + k / path.total), d = c.side * (hw - 0.4);
    const x = s.x + s.rx * d, z = s.z + s.rz * d;
    cones.cone(0xff6a1a, 0.22, 0.7, x, 0.38, z, 6); cones.box(0xf0f0f2, 0.3, 0.07, 0.3, x, 0.45, z, 0, 0, 0, { jit: 0 }); cones.box(0x1a1a1c, 0.5, 0.06, 0.5, x, 0.03, z);
  }
  group.add(cones.build(kit, f.shadow > 0));

  // ------------------------------------------------------------------ lamp reflections on the water (streaks that face the camera)
  const strTex = mine(streakTexture(T)), strMat = mine(new T.MeshBasicMaterial({ map: strTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55, side: T.DoubleSide }));
  const streaks: any[] = [];
  const refl = (x: number, z: number, len: number) => { const m = new T.Mesh(mine(new T.PlaneGeometry(1.6, len)), strMat); m.userData = { x, z, len }; group.add(m); streaks.push(m); };
  // the quay's own lamps on the water's edge + the ship and city glow
  for (const l of lamps) { path.nearest(l.x, l.z, tmp); const nearEdge = Math.min(l.x - q.x0, q.x1 - l.x, l.z - q.z0, q.z1 - l.z) < 18; if (nearEdge) refl(l.x, l.z, 30); }
  for (let k = 0; k < 14; k++) refl(Math.cos(Math.PI * 1.5 + (k - 7) * 0.16) * 700, Math.sin(Math.PI * 1.5 + (k - 7) * 0.16) * 700, 260);

  const s0 = path.at(0.004);
  let t0 = 0;
  return {
    path, map, kit, quay: q, wallL, wallR, clips, moon: moonL,
    start: { x: s0.x, z: s0.z, h: Math.atan2(s0.fx, s0.fz) },
    update(dt: number, t: number, cam: any, focus: { x: number; z: number }) {
      t0 += dt;
      if (sunset) moonL.position.set(focus.x + sunDir.x * 150, sunDir.y * 150 + 6, focus.z + sunDir.z * 150);
      else moonL.position.set(focus.x - 70, 60, focus.z - 90);
      moonL.target.position.set(focus.x, 0, focus.z); moonL.target.updateMatrixWorld();
      sky.position.copy(cam.position);
      if (goldSky) goldSky.update(dt, cam);
      blinkRoot.visible = Math.floor(t0 * 1.1) % 2 === 0;
      // streaks lie on the water and point from the light toward the camera
      for (const m of streaks) {
        const u = m.userData, dx = cam.position.x - u.x, dz = cam.position.z - u.z, l = Math.hypot(dx, dz) || 1;
        // only in front of the quay (water lies outside the slab)
        const px = u.x + (dx / l) * (u.len / 2 + 2), pz = u.z + (dz / l) * (u.len / 2 + 2);
        m.visible = !onQuay(px, pz);
        m.position.set(px, -1.66, pz);
        m.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI);
        m.rotation.order = "YXZ"; m.rotation.set(-Math.PI / 2, Math.atan2(dx, dz), 0);
        m.material.opacity = 0.42 + Math.sin(t0 * 2 + u.x) * 0.08;
      }
      for (const c of clips) { c.lit = Math.max(0, c.lit - dt * 1.5); c.mark.material.opacity = 0.32 + c.lit * 0.6 + Math.sin(t0 * 4) * 0.05; }
    },
    dispose() {
      scene.remove(group); realLights.forEach((l) => scene.remove(l)); scene.remove(hemi); scene.remove(moonL); scene.remove(moonL.target); goldSky && goldSky.dispose();
      group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
      own.forEach((o) => o && o.dispose && o.dispose());
      kit.list().forEach((m: any) => m.dispose());
      scene.fog = null;
    },
  };
}
