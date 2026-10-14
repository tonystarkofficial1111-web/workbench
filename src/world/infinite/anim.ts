// @ts-nocheck
import type { Ctx } from "./types";
import { makeClothMaterial } from "./mats";
import { glowTexture } from "./tex";
import { clamp, smoothstep } from "./rng";

/**
 * Things on buildings that move: flags that stream with the wind, chimney smoke, weather vanes, windmill sails and the day / night
 * light of windows and lanterns. Every item belongs to an owner (a building, a tower...); when the owner leaves the scene (demolished,
 * destroyed, a placement preview that was cancelled) its items are dropped on the next frame.
 */
type Pattern = (u: number, v: number) => number;
const PATTERN: Record<string, Pattern> = {
  plain: () => 0,
  cross: (u, v) => (Math.abs(v - 0.5) < 0.17 || Math.abs(u - 0.34) < 0.1 ? 1 : 0),
  bands: (u, v) => (v < 0.21 || v > 0.79 ? 1 : 0),
  diamond: (u, v) => (Math.abs(u - 0.5) + Math.abs(v - 0.5) * 0.95 < 0.33 ? 1 : 0),
  chevron: (u, v) => { const k = Math.abs(v - 0.5) * 1.1 + (0.46 - u); return k > -0.04 && k < 0.2 ? 1 : 0; },
  crest: (u, v) => (Math.hypot((u - 0.46) * 1.7, v - 0.5) < 0.25 ? 1 : 0),
  split: (u, v) => (v < 0.5 ? 1 : 0),
};

export type FlagKind = "banner" | "pennant" | "swallow";

/**
 * Flag cloth: hangs from the pole at x = 0 and runs along +x (the cloth shader makes it stream), made of flat-coloured cells so a
 * pattern stays crisp. `pennant` tapers to a point, `swallow` has a notched tail.
 */
export function flagGeo(T: any, w: number, h: number, kind: FlagKind, main: number, accent: number, pattern = "plain", nx = 12, ny = 6) {
  const pos: number[] = [], col: number[] = [], nor: number[] = [], idx: number[] = [];
  const cm = new T.Color(main), ca = new T.Color(accent), cs = new T.Color(main).multiplyScalar(0.55), tmp = new T.Color();
  const pat = PATTERN[pattern] || PATTERN.plain!;
  const half = (u: number) => (kind === "pennant" ? 0.5 * (1 - 0.94 * u) : 0.5);
  const notch = kind === "swallow" ? 0.28 : 0;
  const xe = (v: number) => (notch ? w * (1 - notch * (1 - Math.abs(2 * v - 1))) : w);
  const P = (u: number, v: number): number[] => [u * xe(v), -h * (0.5 + (v - 0.5) * 2 * half(u)), 0];
  let n = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
      const q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      tmp.copy(i === 0 ? cs : pat(um, vm) ? ca : cm).multiplyScalar(1 - 0.07 * vm + ((i * 7 + j * 13) % 5) * 0.01);
      for (const p of q) { pos.push(p[0]!, p[1]!, 0); nor.push(0, 0, 1); col.push(tmp.r, tmp.g, tmp.b); }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export interface FlagOpts { w?: number; h?: number; kind?: FlagKind; main?: number; accent?: number; pattern?: string }

export function installAnim(ctx: Ctx) {
  const { env, T, air } = ctx;
  const wind = air.u.uWind!.value;
  const scene = env.scene;
  const items: Array<{ owner: any; fn: (dt: number, t: number) => void; dispose?: () => void }> = [];
  const clothCache = new Map<string, any>();
  const soft = glowTexture(T);

  const attached = (o: any) => { for (let p = o; p; p = p.parent) if (p === scene) return true; return false; };
  /** Yaw of an object in the world (only yaw turns are used in the scene graph of buildings). */
  const yawOf = (o: any) => { if (!o) return 0; o.updateWorldMatrix(true, false); const e = o.matrixWorld.elements; return Math.atan2(e[8]!, e[0]!); };

  function clothMat(w: number, h: number) {
    const k = w.toFixed(2) + "x" + h.toFixed(2);
    let m = clothCache.get(k);
    if (!m) { m = makeClothMaterial(T, air, w, h, 0xffffff, ""); clothCache.set(k, m); }
    return m;
  }

  const api = {
    attached, yawOf,
    /** Run `fn` every frame for as long as `owner` is in the scene. */
    add(owner: any, fn: (dt: number, t: number) => void, dispose?: () => void) { items.push({ owner, fn, dispose }); },

    /** A flag on a pole: pole top at (x, y, z) inside `parent`. It points downwind whatever way the building is turned. */
    flag(owner: any, parent: any, x: number, y: number, z: number, o: FlagOpts = {}) {
      const w = o.w ?? 0.8, h = o.h ?? 0.5;
      const geo = flagGeo(T, w, h, o.kind ?? "banner", o.main ?? 0x2f5fb8, o.accent ?? 0xe8c04a, o.pattern ?? "plain");
      const mesh = new T.Mesh(geo, clothMat(w, h));
      mesh.raycast = () => {}; mesh.userData.noShadowCast = true; mesh.castShadow = false; mesh.receiveShadow = false;
      const pivot = new T.Group();
      pivot.position.set(x, y, z); pivot.add(mesh);
      parent.add(pivot);
      let ph = Math.random() * 6;
      api.add(owner, () => {
        const P = yawOf(pivot.parent);
        const target = -Math.atan2(wind.y, wind.x) - P;
        let d = target - pivot.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        pivot.rotation.y += d * 0.15;
        pivot.rotation.z = Math.sin(ctx.rtime * 0.9 + ph) * 0.02;
      }, () => { geo.dispose(); });
      return pivot;
    },

    /** Smoke rising from (x, y, z) in `parent`, leaning away from the wind. */
    smoke(owner: any, parent: any, x: number, y: number, z: number, o: { n?: number; size?: number; rise?: number; period?: number; show?: () => boolean; dark?: number } = {}) {
      const n = o.n ?? 4, size = o.size ?? 0.34, rise = o.rise ?? 1.8, period = o.period ?? 3.4;
      const puffs = [];
      for (let i = 0; i < n; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: soft, color: 0xb9b4aa, transparent: true, opacity: 0, depthWrite: false }));
        sp.renderOrder = 4; sp.raycast = () => {}; sp.visible = false;
        parent.add(sp); puffs.push(sp);
      }
      api.add(owner, (dt, t) => {
        const on = ctx.gfx.f.particles >= 0.5 && (!o.show || o.show());
        const P = yawOf(parent), c = Math.cos(P), s = Math.sin(P);
        const k = 0.25 + wind.z * 1.9;
        const light = ctx.x.sky ? ctx.x.sky.light : 1;
        for (let i = 0; i < n; i++) {
          const sp = puffs[i];
          const p = ((t / period) + i / n) % 1;
          sp.visible = on;
          if (!on) continue;
          const dx = wind.x * k * p * p, dz = wind.y * k * p * p;
          sp.position.set(x + dx * c - dz * s, y + rise * p, z + dx * s + dz * c);
          const sc = size * (0.5 + 1.5 * p); sp.scale.set(sc, sc, 1);
          sp.material.opacity = 0.55 * smoothstep(0, 0.18, p) * Math.pow(1 - p, 1.3);
          const g = (0.3 + 0.5 * light) * (1 - (o.dark ?? 0)); sp.material.color.setRGB(g * 0.95, g * 0.93, g * 0.9);
        }
      }, () => { puffs.forEach((sp) => { if (sp.parent) sp.parent.remove(sp); sp.material.dispose(); }); });
    },

    /** A soft additive halo (a lantern, a forge mouth) that flickers a little and shines brighter when it is dark. */
    halo(owner: any, parent: any, x: number, y: number, z: number, o: { color?: number; size?: number; flicker?: number; day?: number; show?: () => boolean } = {}) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: soft, color: o.color ?? 0xffb050, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      sp.position.set(x, y, z); sp.renderOrder = 5; sp.raycast = () => {};
      parent.add(sp);
      const size = o.size ?? 1.1, fl = o.flicker ?? 0.1, ph = Math.random() * 10, day = o.day ?? 0.18;
      api.add(owner, (dt, t) => {
        const night = ctx.x.sky ? ctx.x.sky.night : 0;
        const dark = clamp(night + air.dark * 0.5 + air.rain * 0.3 + air.fog * 0.2 + air.blood * 0.4, 0, 1);
        const k = 1 + fl * Math.sin(t * 11 + ph) + fl * 0.5 * Math.sin(t * 23 + ph * 2);
        sp.visible = ctx.gfx.f.tier >= 1 && (!o.show || o.show());
        sp.material.opacity = (day + (0.75 - day) * dark) * (0.85 + 0.15 * k);
        const s = size * k * (0.8 + 0.5 * dark); sp.scale.set(s, s, 1);
      }, () => { if (sp.parent) sp.parent.remove(sp); sp.material.dispose(); });
      return sp;
    },

    /** Turn a group so that its +x axis points into the wind (a weather vane). */
    vane(owner: any, g: any) {
      api.add(owner, () => {
        const P = yawOf(g.parent);
        const target = -Math.atan2(wind.y, wind.x) - Math.PI - P;
        let d = target - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        g.rotation.y += d * (0.04 + 0.1 * wind.z);
        g.rotation.z = Math.sin(ctx.rtime * 1.3) * 0.03 * (0.3 + wind.z * 3);
      });
    },

    /** Turn a group around its z axis at a speed that follows the wind (windmill sails). */
    spin(owner: any, g: any, k = 4, base = 0.15) {
      let v = base;
      api.add(owner, (dt) => {
        const tv = base + k * wind.z;
        v += (tv - v) * Math.min(1, dt * 0.8);
        g.rotation.z -= v * dt;
      });
    },

    /** A windmill cap that turns its sails into the wind (group's +z axis faces the wind). */
    face(owner: any, g: any, rate = 0.5) {
      api.add(owner, (dt) => {
        const P = yawOf(g.parent);
        const target = Math.atan2(-wind.x, -wind.y) - P;
        let d = target - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        g.rotation.y += d * Math.min(1, dt * rate);
      });
    },

    update(dt: number) {
      const t = ctx.rtime;
      // lamps: warm light in windows and lanterns is faint in daylight, strong at night and in storms
      const night = ctx.x.sky ? ctx.x.sky.night : 0;
      const dark = clamp(night + air.dark * 0.5 + air.rain * 0.3 + air.fog * 0.2 + air.blood * 0.4, 0, 1);
      ctx.mats.lamp.color.setScalar(0.16 + 0.84 * dark);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]!;
        if (!attached(it.owner)) { try { it.dispose && it.dispose(); } catch { /* ignore */ } items.splice(i, 1); continue; }
        it.fn(dt, t);
      }
    },
    count: () => items.length,
    dispose() { items.splice(0).forEach((it) => { try { it.dispose && it.dispose(); } catch { /* ignore */ } }); },
  };
  ctx.x.anim = api;
  ctx.frame.push(api.update);
  ctx.cleanup.push(() => { api.dispose(); clothCache.forEach((m) => m.dispose()); clothCache.clear(); });
  return api;
}
