// @ts-nocheck
import type { Ctx } from "./types";
import { glowTexture } from "./tex";
import { Rng } from "./rng";

/** Small pooled particle effects: falling leaves, dust puffs. (Rain, wind-blown leaves and lightning live in weather.ts.) */
interface Leaf { x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; spin: number; life: number; max: number; s: number; rest: boolean; gy: number }
interface Puff { sp: any; life: number; max: number; vy: number; grow: number; s: number }

export class Fx {
  ctx: Ctx;
  group: any;
  leaves: Leaf[] = [];
  puffs: Puff[] = [];
  private mesh: any;
  private cap = 140;
  private free: number[] = [];
  private rnd = new Rng(4242);
  private pool: any[] = [];
  private dummy: any;
  private col: any;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
    const T = ctx.T;
    this.group = new T.Group(); this.group.name = "wb-fx";
    const geo = new T.PlaneGeometry(0.16, 0.1);
    const mat = new T.MeshLambertMaterial({ side: T.DoubleSide, color: 0xffffff });
    mat.userData.shared = true;
    this.mesh = new T.InstancedMesh(geo, mat, this.cap);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.userData.noShadowCast = true;
    this.group.add(this.mesh);
    this.dummy = new T.Object3D(); this.col = new T.Color();
    const tex = glowTexture(T);
    for (let i = 0; i < 24; i++) {
      const m = new T.SpriteMaterial({ map: tex, color: 0xcdbf9a, transparent: true, opacity: 0, depthWrite: false });
      const sp = new T.Sprite(m); sp.visible = false; sp.renderOrder = 5;
      this.group.add(sp); this.pool.push(sp);
    }
    ctx.env.scene.add(this.group);
  }

  /** A shower of leaves from (x, y, z). Fewer on slower graphics levels. */
  leafBurst(x: number, y: number, z: number, n: number, color: number) {
    const k = this.ctx.gfx.f.particles;
    n = Math.max(2, Math.round(n * k));
    const env = this.ctx.env, T = this.ctx.T;
    for (let i = 0; i < n; i++) {
      if (this.leaves.length >= this.cap) break;
      const a = this.rnd.range(0, 6.28), sp = this.rnd.range(0.3, 2.4);
      this.col.setHex(color).multiplyScalar(this.rnd.range(0.7, 1.2));
      const lf: Leaf = { x: x + this.rnd.range(-0.4, 0.4), y: y + this.rnd.range(-0.2, 0.5), z: z + this.rnd.range(-0.4, 0.4), vx: Math.cos(a) * sp, vy: this.rnd.range(0.4, 2.4), vz: Math.sin(a) * sp,
        rot: this.rnd.range(0, 6.28), spin: this.rnd.range(-6, 6), life: 0, max: this.rnd.range(1.8, 3.2), s: this.rnd.range(0.8, 1.5), rest: false, gy: env.getGroundHeight(x, z) };
      (lf as any).c = [this.col.r, this.col.g, this.col.b];
      this.leaves.push(lf);
    }
  }

  dust(x: number, y: number, z: number, size = 1) {
    const T = this.ctx.T;
    const n = Math.max(2, Math.round(5 * this.ctx.gfx.f.particles));
    for (let i = 0; i < n; i++) {
      const sp = this.pool.find((p: any) => !p.visible);
      if (!sp) return;
      sp.visible = true; sp.material.opacity = 0.5; sp.material.color.setHex(0xcdbf9a);
      sp.position.set(x + this.rnd.range(-0.5, 0.5) * size, y + this.rnd.range(0, 0.3), z + this.rnd.range(-0.5, 0.5) * size);
      const s = this.rnd.range(0.5, 0.9) * size; sp.scale.set(s, s, 1);
      this.puffs.push({ sp, life: 0, max: this.rnd.range(0.7, 1.3), vy: this.rnd.range(0.25, 0.7), grow: this.rnd.range(0.8, 1.6), s });
    }
  }

  update(dt: number) {
    const wind = this.ctx.air.u.uWind!.value;
    const m = this.mesh, d = this.dummy;
    let n = 0;
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i]!;
      l.life += dt;
      if (!l.rest) {
        l.vy -= 3.2 * dt; l.vx += wind.x * wind.z * 1.5 * dt; l.vz += wind.y * wind.z * 1.5 * dt;
        l.vx *= 1 - 0.8 * dt; l.vz *= 1 - 0.8 * dt; if (l.vy < -1.1) l.vy = -1.1; // leaves flutter down, they do not drop like stones
        l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt; l.rot += l.spin * dt;
        if (l.y <= l.gy + 0.03) { l.y = l.gy + 0.03; l.rest = true; }
      }
      const fade = l.life > l.max ? Math.max(0, 1 - (l.life - l.max) / 0.8) : 1;
      if (fade <= 0) { this.leaves.splice(i, 1); continue; }
    }
    this.leaves.forEach((l) => {
      const fade = l.life > l.max ? Math.max(0, 1 - (l.life - l.max) / 0.8) : 1;
      d.position.set(l.x, l.y, l.z);
      if (l.rest) d.rotation.set(-Math.PI / 2, 0, l.rot); else d.rotation.set(l.rot * 0.7, l.rot, l.rot * 0.4);
      d.scale.setScalar(l.s * fade);
      d.updateMatrix();
      m.setMatrixAt(n, d.matrix);
      const c = (l as any).c; this.col.setRGB(c[0], c[1], c[2]);
      m.setColorAt(n, this.col);
      n++;
    });
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]!;
      p.life += dt;
      const k = p.life / p.max;
      p.sp.position.y += p.vy * dt;
      const s = p.s * (1 + p.grow * k); p.sp.scale.set(s, s, 1);
      p.sp.material.opacity = 0.5 * (1 - k);
      if (k >= 1) { p.sp.visible = false; this.puffs.splice(i, 1); }
    }
  }

  dispose() {
    this.group.traverse((n: any) => { if (n.isInstancedMesh) { n.geometry.dispose(); n.dispose(); } if (n.isSprite) n.material.dispose(); });
    this.ctx.env.scene.remove(this.group);
    this.leaves.length = 0; this.puffs.length = 0;
  }
}
