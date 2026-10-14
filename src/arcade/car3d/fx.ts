// @ts-nocheck
/**
 * Effects for the car games: block particles (tyre smoke, dust, gravel, mud, snow, water spray, sparks) and tyre marks on the ground.
 * Particles are cubes in one instanced mesh per pool (blocky, like everything else); they grow, drift, fall and shrink away instead of fading,
 * so the whole pool is one draw call with one material.
 */
export interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; s: number; grow: number; life: number; max: number; g: number; drag: number; r: number; gr: number; b: number; spin: number; a: number }

export function createParticles(T: any, scene: any, max: number, opts: { additive?: boolean; lit?: boolean; opacity?: number; spin?: boolean } = {}) {
  const spinning = opts.spin ?? !!opts.additive;
  const geo = new T.BoxGeometry(1, 1, 1);
  const mat = opts.additive
    ? new T.MeshBasicMaterial({ transparent: true, opacity: opts.opacity ?? 0.9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })
    : opts.lit
      ? new T.MeshLambertMaterial({ transparent: true, opacity: opts.opacity ?? 0.6, depthWrite: false })
      : new T.MeshBasicMaterial({ transparent: true, opacity: opts.opacity ?? 0.6, depthWrite: false });
  // per-particle opacity: an instanced attribute multiplied into the fragment's alpha (so a puff thins out instead of popping)
  const alpha = new T.InstancedBufferAttribute(new Float32Array(max).fill(1), 1); alpha.setUsage(T.DynamicDrawUsage);
  geo.setAttribute("aAlpha", alpha);
  mat.onBeforeCompile = (sh: any) => {
    sh.vertexShader = "attribute float aAlpha;\nvarying float vAlpha;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlpha = aAlpha;");
    sh.fragmentShader = "varying float vAlpha;\n" + sh.fragmentShader.replace("#include <dithering_fragment>", "gl_FragColor.a *= vAlpha;\n#include <dithering_fragment>");
  };
  const mesh = new T.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3;
  const col = new T.Color(1, 1, 1);
  for (let i = 0; i < max; i++) mesh.setColorAt(i, col);
  scene.add(mesh);
  const list: Particle[] = [];
  const dummy = new T.Object3D();
  let camX = 0, camY = 0, camZ = 0;
  return {
    mesh,
    get count() { return list.length; },
    spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, s: number, life: number, color: number, o: { grow?: number; g?: number; drag?: number } = {}) {
      if (list.length >= max) list.shift();
      col.setHex(color);
      list.push({ x, y, z, vx, vy, vz, s, grow: o.grow ?? 1.2, life, max: life, g: o.g ?? 0, drag: o.drag ?? 1.2, r: col.r, gr: col.g, b: col.b, spin: (Math.random() - 0.5) * 2, a: Math.random() * 6 });
    },
    update(dt: number) {
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]!;
        p.life -= dt;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.g > 0 && p.y < 0.03) { p.y = 0.03; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
        p.s += p.grow * dt; p.a += p.spin * dt;
      }
      for (const p of list) {
        const t = p.life / p.max, sc = p.s * (opts.additive ? Math.min(1, t * 2.5) : 1);
        // smoke and dust stay square to the world (voxel clouds); sparks and debris tumble
        dummy.position.set(p.x, p.y, p.z); if (spinning) dummy.rotation.set(p.a, p.a * 0.7, 0); else dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(0.001, sc)); dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix); col.setRGB(p.r, p.gr, p.b); mesh.setColorAt(n, col);
        // thin out with age, and near the camera (so a cloud the camera drives through does not fill the screen)
        const dc = Math.hypot(p.x - camX, p.y - camY, p.z - camZ);
        alpha.array[n] = Math.min(1, t * 1.6) * Math.min(1, Math.max(0, (dc - sc * 0.6 - 0.8) / 3));
        n++;
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; alpha.needsUpdate = true;
    },
    /** where the camera is, for the near fade */
    camera(x: number, y: number, z: number) { camX = x; camY = y; camZ = z; },
    clear() { list.length = 0; mesh.count = 0; },
    dispose() { scene.remove(mesh); geo.dispose(); mat.dispose(); mesh.dispose(); },
  };
}
export type Particles = ReturnType<typeof createParticles>;

/**
 * Tyre marks: a ring buffer of quads. Each wheel that slides adds a strip from where it was last frame to where it is now;
 * old marks are overwritten when the buffer wraps. Dark on tarmac, lighter grooves on gravel or snow (the colour is chosen by the caller).
 */
export function createMarks(T: any, scene: any, max = 2400) {
  const pos = new Float32Array(max * 4 * 3), colA = new Float32Array(max * 4 * 4), idx = new Uint32Array(max * 6);
  for (let q = 0; q < max; q++) { const a = q * 4; idx.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], q * 6); }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute("color", new T.BufferAttribute(colA, 4).setUsage(T.DynamicDrawUsage));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  geo.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
  const mat = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 1;
  scene.add(mesh);
  let head = 0;
  const last: Array<null | { x: number; y: number; z: number; px: number; pz: number }> = [];
  const c = new T.Color();
  return {
    mesh,
    /**
     * wheel i is at (x, y, z) travelling along (dx, dz) (unit), mark half-width hw, strength 0..1 (0 lifts the "pen").
     */
    add(i: number, x: number, y: number, z: number, dx: number, dz: number, hw: number, strength: number, color: number) {
      if (strength <= 0.02) { last[i] = null; return; }
      const px = -dz * hw, pz = dx * hw;
      const L = last[i];
      if (L && Math.hypot(x - L.x, z - L.z) < 0.25) return;
      if (L && Math.hypot(x - L.x, z - L.z) < 4) {
        const q = head; head = (head + 1) % max;
        const o = q * 12;
        pos[o] = L.x - L.px; pos[o + 1] = L.y; pos[o + 2] = L.z - L.pz;
        pos[o + 3] = L.x + L.px; pos[o + 4] = L.y; pos[o + 5] = L.z + L.pz;
        pos[o + 6] = x - px; pos[o + 7] = y; pos[o + 8] = z - pz;
        pos[o + 9] = x + px; pos[o + 10] = y; pos[o + 11] = z + pz;
        c.setHex(color);
        const a = Math.min(0.85, strength * 0.9);
        for (let k = 0; k < 4; k++) colA.set([c.r, c.g, c.b, a], q * 16 + k * 4);
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      }
      last[i] = { x, y, z, px, pz };
    },
    lift() { for (let i = 0; i < last.length; i++) last[i] = null; },
    clear() { pos.fill(0); colA.fill(0); head = 0; this.lift(); geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; },
    dispose() { scene.remove(mesh); geo.dispose(); mat.dispose(); },
  };
}
export type Marks = ReturnType<typeof createMarks>;
