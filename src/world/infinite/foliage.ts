// @ts-nocheck
import type { Ctx } from "./types";
import type { Island } from "./terrain";
import { MB } from "./mb";
import { Rng, fbm, smoothstep, clamp } from "./rng";
import { bladeGeo, frondGeo, leafGeo } from "./shapes";

/**
 * Ground cover: grass tufts, ferns, bushes, big leaves, flowers and mossy rocks, all GPU-instanced and swaying in the wind.
 * Hundreds of plants cost a handful of draw calls; the Graphics level only changes how many instances are drawn.
 */
interface Set { mesh: any; x: number[]; z: number[]; y: number[]; rot: number[]; sc: number[]; total: number; key: string; share: number }

export class Foliage {
  ctx: Ctx;
  group: any;
  sets: Set[] = [];
  private tmp: any;

  constructor(ctx: Ctx, island: Island, seed: number) {
    this.ctx = ctx;
    const T = ctx.T;
    this.group = new T.Group(); this.group.name = "wb-foliage";
    const rnd = new Rng(seed * 11 + 5);
    const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), E = new T.Euler();
    this.tmp = { M, Q, V, S, E };

    const dens = (island as any).density || 1;   // Free Style's land is five times bigger: more plants
    const mk = (key: string, build: (mb: MB, r: Rng) => void, mat: string, count0: number, share: number, accept: (x: number, z: number, rr: Rng) => boolean, scaleRange: [number, number], tint?: [number, number]) => {
      const count = Math.round(count0 * dens);
      const mb = new MB(T, seed + count0);
      mb.ao = { y0: 0, h: 0.3, k: 0.4 };
      build(mb, rnd.fork(count0));
      const root = mb.build(ctx.mats, false);
      const parts = root.children;
      // all parts of one plant share its instances
      const meshes = parts.map((p: any) => {
        const im = new T.InstancedMesh(p.geometry, p.material, count);
        im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.userData.noShadowCast = true;
        return im;
      });
      const s: Set = { mesh: meshes, x: [], z: [], y: [], rot: [], sc: [], total: 0, key, share } as any;
      const tmpC = new T.Color();
      let tries = 0;
      while (s.x.length < count && tries++ < count * 30) {
        const a = rnd.range(0, Math.PI * 2), rr = Math.sqrt(rnd.next()) * ((island as any).spread || 56);   // Free Style passes a bigger spread
        const x = island.cx + Math.cos(a) * rr, z = island.cz + Math.sin(a) * rr;
        if (!island.isLand(x, z)) continue;
        if (!accept(x, z, rnd)) continue;
        s.x.push(x); s.z.push(z); s.y.push(1); s.rot.push(Math.floor(rnd.next() * 4) * (Math.PI / 2)); s.sc.push(rnd.range(scaleRange[0], scaleRange[1]));
      }
      const n = s.x.length;
      for (let i = 0; i < n; i++) {
        E.set(0, s.rot[i]!, 0); Q.setFromEuler(E); V.set(s.x[i]!, 1, s.z[i]!); S.setScalar(s.sc[i]!);
        M.compose(V, Q, S);
        meshes.forEach((im: any) => {
          im.setMatrixAt(i, M);
          if (tint) { tmpC.setScalar(rnd.range(tint[0], tint[1])); tmpC.r *= rnd.range(0.92, 1.05); tmpC.b *= rnd.range(0.9, 1.05); im.setColorAt(i, tmpC); }
        });
      }
      meshes.forEach((im: any) => { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; this.group.add(im); });
      s.total = n;
      this.sets.push(s);
    };

    const G = island.G;
    const tuftOK = (x: number, z: number, rr: Rng) => {
      const r = Math.hypot(x - island.cx, z - island.cz);
      if (r < 3.2) return false;
      if (island.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.2)) return false;
      if (island.pathDist(x, z) < 0.5) return false;
      const d = fbm(x * 0.09, z * 0.09, 17, 3);
      const beach = r > G + 1;
      return rr.next() < (beach ? 0.18 : 0.35 + 0.65 * smoothstep(0.35, 0.7, d));
    };
    const jungleOK = (x: number, z: number, rr: Rng) => {
      const r = Math.hypot(x - island.cx, z - island.cz);
      if (r < 6 || r > G + 0.5) return false;
      if (island.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.3)) return false;
      if (island.pathDist(x, z) < 0.7) return false;
      return rr.next() < 0.25 + 0.75 * smoothstep(0.3, 0.75, fbm(x * 0.07 + 40, z * 0.07, 29, 3));
    };

    mk("grass", (mb, r) => {
      for (let i = 0; i < 7; i++) {
        const h = r.range(0.28, 0.5), yaw = r.range(0, 6.28), d = r.range(0, 0.12);
        mb.add(bladeGeo(T, h, 0.065, r.range(-0.5, 0.5), 2), r.pick([0x4f9a3c, 0x5fae45, 0x6fb84e, 0x3f8a36]), Math.cos(yaw) * d, 0, Math.sin(yaw) * d, 0, yaw, 0, 1, 1, 1,
          { mat: "swayDS", sway: 1, swayY0: 0, swayH: h, grad: [0x2a5a22, 0x9ad04f, 0, h] });
      }
    }, "swayDS", 2600, 1, tuftOK, [0.8, 1.4], [0.85, 1.1]);

    mk("fern", (mb, r) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const yaw = (i / n) * 6.28 + r.range(-0.2, 0.2), len = r.range(0.5, 0.78);
        mb.add(frondGeo(T, len, 0.17, 0.55, 4, 0.5), 0x3f8a36, 0, 0.04, 0, 0, -yaw, r.range(0.1, 0.35), 1, 1, 1,
          { mat: "swayDS", sway: 1, swayY0: 0, swayH: 0.5, grad: [0x1f5226, 0x7ac04c, 0, 0.45] });
      }
    }, "swayDS", 760, 1, jungleOK, [0.8, 1.5], [0.85, 1.1]);

    mk("bush", (mb, r) => {
      for (let i = 0; i < 4; i++) {
        const a = r.range(0, 6.28), d = i ? r.range(0.12, 0.3) : 0, rad = r.range(0.2, 0.34);
        const c = r.pick([0x2f7a38, 0x3a8a3c, 0x4a9a40, 0x2b6a30]);
        mb.box(c, rad * 1.75, rad * 1.4, rad * 1.75, Math.cos(a) * d, rad * 0.7, Math.sin(a) * d, 0, 0, 0,
          { mat: "swayDS", sway: 1, swayY0: 0, swayH: 0.7, grad: [0x1d4a22, c, 0, 0.7] });
      }
    }, "swayDS", 320, 1, jungleOK, [0.9, 1.6], [0.88, 1.08]);

    mk("bigleaf", (mb, r) => {
      for (let i = 0; i < 3; i++) {
        const yaw = (i / 3) * 6.28 + r.range(0, 1), len = r.range(0.7, 1.0);
        mb.add(leafGeo(T, len, 0.4, 0.55, 4), r.pick([0x2f7a34, 0x3c8c3a, 0x4a9a40]), 0, 0.05, 0, 0, -yaw, r.range(0.35, 0.6), 1, 1, 1,
          { mat: "swayDS", sway: 1, swayY0: 0, swayH: 0.8, grad: [0x1d4a22, 0x6fb04a, 0, 0.7] });
      }
    }, "swayDS", 170, 1, jungleOK, [0.9, 1.5], [0.9, 1.08]);

    const flower = (key: string, petal: number, n: number) => mk(key, (mb, r) => {
      for (let i = 0; i < 3; i++) {
        const a = r.range(0, 6.28), d = r.range(0.02, 0.12), h = r.range(0.25, 0.42);
        mb.box(0x3f8a36, 0.02, h, 0.02, Math.cos(a) * d, h / 2, Math.sin(a) * d, 0, 0, 0, { mat: "sway", sway: 1, swayY0: 0, swayH: h, noAO: true });
        mb.box(petal, 0.11, 0.08, 0.11, Math.cos(a) * d, h + 0.03, Math.sin(a) * d, 0, 0, 0, { mat: "sway", sway: 1, swayY0: 0, swayH: h, noAO: true });
      }
    }, "sway", n, 1, jungleOK, [0.9, 1.3]);
    flower("flowerR", 0xe0435a, 70); flower("flowerY", 0xf2d24a, 70); flower("flowerP", 0xb86ae0, 50);

    mk("rock", (mb, r) => {
      for (let i = 0; i < 2; i++) {
        const rad = r.range(0.14, 0.3), c = r.pick([0x77716a, 0x6a665e, 0x84806f]);
        mb.box(c, rad * 2 * r.range(1, 1.3), rad * 1.2 * r.range(0.7, 1), rad * 2 * r.range(1, 1.3), r.range(-0.15, 0.15), rad * 0.5, r.range(-0.15, 0.15), 0, 0, 0, { grad: [c, 0x4c6a36, 0, rad * 1.2] });
      }
    }, "lit", 150, 1, (x, z, rr) => tuftOK(x, z, rr) && rr.next() < 0.6, [0.9, 1.8]);

    ctx.env.scene.add(this.group);
    this.applyGfx();
  }

  /** The Graphics level decides how many of the plants are drawn (instances are in random order, so this thins them evenly). */
  applyGfx() {
    const f = this.ctx.gfx.f.foliage;
    const tier = this.ctx.gfx.f.tier;
    this.sets.forEach((s) => {
      const share = s.key === "rock" || s.key.startsWith("flower") ? (tier >= 1 ? f : 0) : f;
      s.mesh.forEach((im: any) => { im.count = Math.floor(s.total * share); im.visible = im.count > 0; });
    });
  }

  /** Flatten the plants under something that was just built (a building, a wall, a tower). */
  clearArea(x: number, z: number, r: number) {
    const { M, Q, V, S } = this.tmp;
    M.makeScale(0, 0, 0);
    const r2 = r * r;
    this.sets.forEach((s) => {
      let hit = false;
      for (let i = 0; i < s.total; i++) {
        const dx = s.x[i]! - x, dz = s.z[i]! - z;
        if (dx * dx + dz * dz < r2 && s.sc[i] !== 0) {
          s.sc[i] = 0; hit = true;
          s.mesh.forEach((im: any) => im.setMatrixAt(i, M));
        }
      }
      if (hit) s.mesh.forEach((im: any) => { im.instanceMatrix.needsUpdate = true; });
    });
  }

  dispose() {
    this.group.traverse((n: any) => { if (n.isInstancedMesh) { n.geometry.dispose(); n.dispose(); } });
    this.ctx.env.scene.remove(this.group);
  }
}
