// @ts-nocheck
import type { T3 } from "./types";
import type { MatKit } from "./mats";
import { Rng, clamp } from "./rng";

/**
 * MB = model builder. Primitives are transformed, vertex-coloured and merged into a few meshes per model
 * (one per material and detail tier), so a house is 3-6 draw calls however many beams and shingles it has.
 *
 * Detail tiers: 0 = essential shape (what Low shows), 1 = extra detail (Medium), 2 = small props and fine detail (High).
 * Models are built facing +z (the door side), standing on y = 0, centred on x = z = 0.
 */
export interface PartOpts {
  tier?: 0 | 1 | 2;
  mat?: "lit" | "litDS" | "metal" | "glow" | "lamp" | "sway" | "swayDS";
  /** Faceted (low-poly) shading. */
  flat?: boolean;
  /** Per-part colour jitter amount (default: the builder's). */
  jit?: number;
  /** Vertical colour gradient: [bottomHex, topHex, y0, y1] in model space. */
  grad?: [number, number, number, number];
  /** Sway weight for the wind material: weight rises from 0 at swayY0 to `sway` at swayY0 + swayH. */
  sway?: number;
  swayY0?: number;
  swayH?: number;
  /** Hanging things (vines): the weight is 0 at the top and grows downwards instead. */
  swayInv?: boolean;
  /** Do not darken near the ground. */
  noAO?: boolean;
}

type Group = {
  mat: string;
  tier: number;
  pos: number[];
  nor: number[];
  col: number[];
  sway: number[];
  idx: number[];
  n: number;
};

export class MB {
  T: T3;
  rnd: Rng;
  jitter = 0.05;
  /** Build a pale version of the model (for the green / red placement preview, which multiplies a tint into the colours). */
  ghost = false;
  /** Darken vertices near the ground: strength k over height h above y0. */
  ao = { y0: 0, h: 0.9, k: 0.28 };
  groups = new Map<string, Group>();
  private m = null as any; private q = null as any; private e = null as any; private v = null as any; private nv = null as any; private sc = null as any;
  private nm = null as any; private c = null as any; private c2 = null as any;
  /** Transform applied to every part added (see push / pop): lets a four-sided detail be written once and placed on each side. */
  private base = null as any; private stack: any[] = []; private unit = null as any;
  tris = 0;

  constructor(T: T3, seed = 1) {
    this.T = T;
    this.rnd = new Rng(seed);
    this.m = new T.Matrix4(); this.q = new T.Quaternion(); this.e = new T.Euler(); this.v = new T.Vector3(); this.nv = new T.Vector3(); this.sc = new T.Vector3(1, 1, 1);
    this.nm = new T.Matrix3(); this.c = new T.Color(); this.c2 = new T.Color();
    this.base = new T.Matrix4();
  }

  /** Everything added until the matching pop() is moved to (x, y, z), turned by `yaw` around the y axis and scaled by `s`. Calls nest. */
  push(x = 0, y = 0, z = 0, yaw = 0, s = 1) {
    const T = this.T;
    const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw), new T.Vector3(s, s, s));
    this.stack.push(this.base);
    this.base = this.base.clone().multiply(m);
    return this;
  }
  pop() { this.base = this.stack.pop() || new this.T.Matrix4(); return this; }

  private grp(mat: string, tier: number): Group {
    const k = mat + tier;
    let g = this.groups.get(k);
    if (!g) { g = { mat, tier, pos: [], nor: [], col: [], sway: [], idx: [], n: 0 }; this.groups.set(k, g); }
    return g;
  }

  /** Low-level: merge `geo` (already positioned in its own space) with the transform given by position / euler rotation / scale. */
  add(geo: any, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, o: PartOpts = {}) {
    const T = this.T;
    this.e.set(rx, ry, rz);
    this.q.setFromEuler(this.e);
    this.v.set(x, y, z);
    this.sc.set(sx, sy, sz);
    this.m.compose(this.v, this.q, this.sc);
    this.m.premultiply(this.base);
    this.nm.getNormalMatrix(this.m);
    const mat = o.mat || "lit";
    const g = this.grp(mat, o.tier ?? 0);
    let src = geo;
    if (o.flat) { src = geo.index ? geo.toNonIndexed() : geo; src.computeVertexNormals(); }
    const P = src.attributes.position, N = src.attributes.normal, I = src.index;
    const jit = o.jit ?? this.jitter;
    this.c.setHex(color);
    const j = 1 + (this.rnd.next() - 0.5) * 2 * jit;
    const br = this.c.r * j, bg = this.c.g * j, bb = this.c.b * j;
    let gb: any = null, gt: any = null;
    if (o.grad) { gb = new T.Color(o.grad[0]); gt = new T.Color(o.grad[1]); }
    const ao = this.ao;
    for (let i = 0; i < P.count; i++) {
      this.v.fromBufferAttribute(P, i).applyMatrix4(this.m);
      g.pos.push(this.v.x, this.v.y, this.v.z);
      this.nv.fromBufferAttribute(N, i).applyMatrix3(this.nm).normalize();
      g.nor.push(this.nv.x, this.nv.y, this.nv.z);
      let r = br, gg = bg, b = bb;
      if (gb) {
        const t = clamp((this.v.y - o.grad[2]) / (o.grad[3] - o.grad[2] || 1), 0, 1);
        r = (gb.r + (gt.r - gb.r) * t) * j; gg = (gb.g + (gt.g - gb.g) * t) * j; b = (gb.b + (gt.b - gb.b) * t) * j;
      }
      if (!o.noAO && ao.k > 0) {
        const t = clamp((this.v.y - ao.y0) / ao.h, 0, 1);
        const f = 1 - ao.k * (1 - t) * (1 - t);
        r *= f; gg *= f; b *= f;
      }
      if (this.ghost) { const l = 0.299 * r + 0.587 * gg + 0.114 * b, v = Math.min(1, 0.55 + 0.6 * l); r = gg = b = v; }   // placement previews: pale, so the green / red tint reads clearly
      g.col.push(r, gg, b);
      if (mat === "sway" || mat === "swayDS") {
        const y0 = o.swayY0 ?? 0, h = o.swayH ?? 2;
        const w = clamp((this.v.y - y0) / h, 0, 1);
        g.sway.push((o.swayInv ? 1 - w : w) * (o.sway ?? 1));
      } else g.sway.push(0);
    }
    if (I) for (let i = 0; i < I.count; i++) g.idx.push(I.getX(i) + g.n);
    else for (let i = 0; i < P.count; i++) g.idx.push(i + g.n);
    g.n += P.count;
    this.tris += (I ? I.count : P.count) / 3;
    if (src !== geo) src.dispose();
    geo.dispose();
    return this;
  }

  box(color: number, w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    return this.add(new this.T.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  /** A box standing on y (its bottom at y). */
  bar(color: number, w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0, o: PartOpts = {}) {
    return this.add(new this.T.BoxGeometry(w, h, d), color, x, y + h / 2, z, 0, ry, 0, 1, 1, 1, o);
  }
  cyl(color: number, rTop: number, rBot: number, h: number, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    return this.add(new this.T.CylinderGeometry(rTop, rBot, h, seg, 1), color, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  cone(color: number, r: number, h: number, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    return this.add(new this.T.ConeGeometry(r, h, seg, 1), color, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  sphere(color: number, r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ws = 8, hs = 6, o: PartOpts = {}) {
    return this.add(new this.T.SphereGeometry(r, ws, hs), color, x, y, z, 0, 0, 0, sx, sy, sz, o);
  }
  /** Low-poly rock / blob. */
  blob(color: number, r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 0, ry = 0, o: PartOpts = {}) {
    return this.add(new this.T.IcosahedronGeometry(r, detail), color, x, y, z, 0, ry, 0, sx, sy, sz, { flat: true, ...o });
  }
  torus(color: number, r: number, tube: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 6, tseg = 12, o: PartOpts = {}) {
    return this.add(new this.T.TorusGeometry(r, tube, seg, tseg), color, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  /** Surface of revolution: points are [radius, y] pairs. phi limits the sweep (a half shell for a breastplate, say). */
  lathe(color: number, pts: Array<[number, number]>, x = 0, y = 0, z = 0, seg = 10, sx = 1, sy = 1, sz = 1, o: PartOpts = {}, phiStart = 0, phiLen = Math.PI * 2, ry = 0) {
    const T = this.T;
    return this.add(new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), seg, phiStart, phiLen), color, x, y, z, 0, ry, 0, sx, sy, sz, { ...o });
  }
  /** A dome (half sphere, open underneath), optionally squashed. Good for helmets, pauldrons, mounds. */
  dome(color: number, r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 8, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    return this.add(new this.T.SphereGeometry(r, seg, Math.max(3, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, rx, ry, rz, sx, sy, sz, { mat: o.mat, ...o });
  }
  /** Extruded flat outline (shields, banners, plates): points are [x, y] pairs, depth along z. */
  plate(color: number, pts: Array<[number, number]>, depth: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, bevel = 0.012, o: PartOpts = {}) {
    const T = this.T;
    const sh = new T.Shape();
    pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 4 });
    geo.translate(0, 0, -depth / 2);
    return this.add(geo, color, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  plane(color: number, w: number, h: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    return this.add(new this.T.PlaneGeometry(w, h), color, x, y, z, rx, ry, rz, 1, 1, 1, { mat: "litDS", ...o });
  }
  /** A one-sided w x h picture facing +z (stone blocks, planks, window panes): four vertices only. */
  quad(color: number, w: number, h: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o: PartOpts = {}) {
    if (!this.unit) this.unit = new this.T.PlaneGeometry(1, 1);
    return this.add(this.unit, color, x, y, z, rx, ry, rz, w, h, 1, o);
  }
  /** A square beam between two points. */
  beam(color: number, t: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, o: PartOpts = {}) {
    const T = this.T;
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const geo = new T.BoxGeometry(t, t, len);
    const mm = new T.Matrix4().lookAt(new T.Vector3(0, 0, 0), new T.Vector3(dx, dy, dz), new T.Vector3(0, 1, 0));
    const q = new T.Quaternion().setFromRotationMatrix(mm);
    const e = new T.Euler().setFromQuaternion(q);
    return this.add(geo, color, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, e.x, e.y, e.z, 1, 1, 1, o);
  }
  /** A round pole between two points. */
  pole(color: number, r: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, seg = 6, o: PartOpts = {}) {
    const T = this.T;
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const geo = new T.CylinderGeometry(r, r, len, seg, 1);
    const up = new T.Vector3(0, 1, 0), dir = new T.Vector3(dx, dy, dz).normalize();
    const q = new T.Quaternion().setFromUnitVectors(up, dir);
    const e = new T.Euler().setFromQuaternion(q);
    return this.add(geo, color, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, e.x, e.y, e.z, 1, 1, 1, o);
  }
  /** A tapered round limb between two points (radius rA at the first point, rB at the second). */
  taper(color: number, rA: number, rB: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, seg = 6, o: PartOpts = {}) {
    const T = this.T;
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const geo = new T.CylinderGeometry(rB, rA, len, seg, 1); // top radius = rB (second point)
    const up = new T.Vector3(0, 1, 0), dir = new T.Vector3(dx, dy, dz).normalize();
    const q = new T.Quaternion().setFromUnitVectors(up, dir);
    const e = new T.Euler().setFromQuaternion(q);
    return this.add(geo, color, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, e.x, e.y, e.z, 1, 1, 1, o);
  }
  /** A prism with a triangular cross-section (a gable): width w along x, height h, depth d along z, base on y. */
  gable(color: number, w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0, o: PartOpts = {}) {
    const T = this.T;
    const hw = w / 2, hd = d / 2;
    const P = [-hw, 0, -hd, hw, 0, -hd, 0, h, -hd, -hw, 0, hd, hw, 0, hd, 0, h, hd];
    const geo = new T.BufferGeometry();
    // two slopes + two end triangles (+ bottom)
    const verts: number[] = [];
    const tri = (a: number, b: number, c: number) => { for (const k of [a, b, c]) verts.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); };
    tri(0, 2, 1); tri(3, 4, 5); // ends
    tri(0, 3, 5); tri(0, 5, 2); // left slope
    tri(1, 2, 5); tri(1, 5, 4); // right slope
    tri(0, 1, 4); tri(0, 4, 3); // bottom
    geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return this.add(geo, color, x, y, z, 0, ry, 0, 1, 1, 1, { flat: false, ...o });
  }
  /** A four-sided pyramid: base w x d, height h. */
  pyramid(color: number, w: number, d: number, h: number, x = 0, y = 0, z = 0, ry = 0, o: PartOpts = {}) {
    const g = new this.T.ConeGeometry(0.7071, h, 4, 1);
    g.rotateY(Math.PI / 4);
    return this.add(g, color, x, y + h / 2, z, 0, ry, 0, w, 1, d, { flat: true, ...o });
  }

  /** Finish: one mesh per material + tier. */
  build(mats: MatKit, shadows = true): any {
    const T = this.T;
    const root = new T.Group();
    const tiers: any[][] = [[], [], []];
    this.groups.forEach((g) => {
      if (!g.n) return;
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute("normal", new T.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute("color", new T.Float32BufferAttribute(g.col, 3));
      if (g.mat === "sway" || g.mat === "swayDS") geo.setAttribute("aSway", new T.Float32BufferAttribute(g.sway, 1));
      geo.setIndex(g.n > 65535 ? new T.Uint32BufferAttribute(g.idx, 1) : new T.Uint16BufferAttribute(g.idx, 1));
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, mats[g.mat]);
      const lit = g.mat !== "glow" && g.mat !== "lamp";
      mesh.castShadow = shadows && lit;
      mesh.receiveShadow = lit;
      mesh.userData.tier = g.tier;
      mesh.userData.noShadowCast = !mesh.castShadow;
      tiers[g.tier].push(mesh);
      root.add(mesh);
    });
    root.userData.tiers = tiers;
    root.userData.tris = this.tris;
    return root;
  }
}

/** Show the model parts that belong to the current detail level. */
export function applyTier(root: any, tier: number) {
  const t = root && root.userData && root.userData.tiers;
  if (!t) return;
  for (let i = 0; i < 3; i++) for (const m of t[i]) m.visible = i <= tier;
}

/** Free a model built with MB (geometries only: the materials are shared). */
export function disposeModel(root: any) {
  root.traverse((n: any) => { if (n.geometry) n.geometry.dispose(); });
}
