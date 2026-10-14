/**
 * The circuit as a smooth 3D path. The game's own track points (the ones the minimap and the TURN prompts use) are the control points,
 * so a corner that the game calls "left" really bends left here. Positions are indexed by the game's lap fraction (lapDist), so the car, the
 * rivals and the prompts all stay exactly where the game thinks they are.
 *
 * Map coordinates are x right, y down; the world is x right, z down (the same picture seen from above), y up. A "right" corner has a
 * positive curvature.
 */
export interface MapPt { x: number; y: number }

/** Metres per map unit: a 500 x 350 map becomes a circuit about 500 m long, so 100 mph in the game is a believable ~75 m/s on screen. */
export const WORLD_SCALE = 0.55;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export interface PathSample { x: number; y: number; z: number; fx: number; fz: number; rx: number; rz: number; slope: number; kap: number; arc: number }

export class TrackPath {
  readonly n: number;
  readonly S = 8;
  readonly px: Float32Array; readonly py: Float32Array; readonly pz: Float32Array;
  readonly fx: Float32Array; readonly fz: Float32Array;
  readonly kap: Float32Array;
  readonly slope: Float32Array;
  readonly arc: Float32Array;
  total = 0;
  minX = 1e9; maxX = -1e9; minZ = 1e9; maxZ = -1e9;
  /** Lap fractions where the circuit crosses itself (a figure-eight): one road goes over the other. */
  crossings: Array<[number, number]> = [];
  private grid = new Map<number, number[]>();
  private readonly cell = 24;

  /**
   * Some of the game's circuits have bends tighter than the road is wide (the Curvy Ring's notches are a metre or two across), which
   * would fold the road over itself. Those bends are eased until no sample turns tighter than `minR` metres; every other part is untouched.
   * Samples keep their index, so lap positions still line up with the game.
   */
  static relax(px: Float32Array, pz: Float32Array, minR: number) {
    const n = px.length, W = 3, nx = new Float32Array(n), nz = new Float32Array(n);
    for (let it = 0; it < 3000; it++) {
      let worst = 1e9;
      for (let m = 0; m < n; m++) {
        const a = (m - W + n) % n, b = (m + W) % n;
        const ax = px[a]! - px[m]!, az = pz[a]! - pz[m]!, bx = px[b]! - px[m]!, bz = pz[b]! - pz[m]!;
        const cross = Math.abs(ax * bz - az * bx), la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lab = Math.hypot(bx - ax, bz - az);
        const R = (la * lb * lab) / (2 * cross + 1e-9);
        if (R < worst) worst = R;
        const w = R < minR ? Math.min(0.5, (minR / R - 1) * 0.25) : 0;
        nx[m] = px[m]! + ((px[a]! + px[b]!) / 2 - px[m]!) * w;
        nz[m] = pz[m]! + ((pz[a]! + pz[b]!) / 2 - pz[m]!) * w;
      }
      px.set(nx); pz.set(nz);
      if (worst >= minR * 0.96) break;
    }
  }

  constructor(points: MapPt[], heightFn: (u: number, path: TrackPath) => number, scale = WORLD_SCALE, minRadius = 12) {
    const k = points.length, S = this.S, n = k * S;
    this.n = n;
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
    cx /= k; cy /= k;
    const P = points.map((p) => [(p.x - cx) * scale, (p.y - cy) * scale]);
    const px = (this.px = new Float32Array(n)), py = (this.py = new Float32Array(n)), pz = (this.pz = new Float32Array(n));
    // centripetal-free uniform Catmull-Rom through the points
    for (let i = 0; i < k; i++) {
      const p0 = P[(i - 1 + k) % k]!, p1 = P[i]!, p2 = P[(i + 1) % k]!, p3 = P[(i + 2) % k]!;
      for (let j = 0; j < S; j++) {
        const t = j / S, t2 = t * t, t3 = t2 * t, m = i * S + j;
        px[m] = 0.5 * (2 * p1[0]! + (-p0[0]! + p2[0]!) * t + (2 * p0[0]! - 5 * p1[0]! + 4 * p2[0]! - p3[0]!) * t2 + (-p0[0]! + 3 * p1[0]! - 3 * p2[0]! + p3[0]!) * t3);
        pz[m] = 0.5 * (2 * p1[1]! + (-p0[1]! + p2[1]!) * t + (2 * p0[1]! - 5 * p1[1]! + 4 * p2[1]! - p3[1]!) * t2 + (-p0[1]! + 3 * p1[1]! - 3 * p2[1]! + p3[1]!) * t3);
      }
    }
    TrackPath.relax(px, pz, minRadius);
    for (let m = 0; m < n; m++) { this.minX = Math.min(this.minX, px[m]!); this.maxX = Math.max(this.maxX, px[m]!); this.minZ = Math.min(this.minZ, pz[m]!); this.maxZ = Math.max(this.maxZ, pz[m]!); }
    this.arc = new Float32Array(n + 1);
    for (let m = 0; m < n; m++) { const q = (m + 1) % n; this.arc[m + 1] = this.arc[m]! + Math.hypot(px[q]! - px[m]!, pz[q]! - pz[m]!); }
    this.total = this.arc[n]!;
    this.fx = new Float32Array(n); this.fz = new Float32Array(n);
    const phi = new Float32Array(n);
    for (let m = 0; m < n; m++) {
      const a = (m - 1 + n) % n, b = (m + 1) % n;
      let dx = px[b]! - px[a]!, dz = pz[b]! - pz[a]!; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      this.fx[m] = dx; this.fz[m] = dz; phi[m] = Math.atan2(dz, dx);
    }
    this.kap = new Float32Array(n);
    for (let m = 0; m < n; m++) {
      const a = (m - 2 + n) % n, b = (m + 2) % n;
      const ds = (this.arc[b]! - this.arc[a]! + (b < a ? this.total : 0)) || 1;
      this.kap[m] = wrap(phi[b]! - phi[a]!) / ds;
    }
    // light smoothing so the curvature does not flicker between samples
    const kk = new Float32Array(n);
    for (let m = 0; m < n; m++) kk[m] = (this.kap[(m - 1 + n) % n]! + 2 * this.kap[m]! + this.kap[(m + 1) % n]!) / 4;
    this.kap.set(kk);
    this.findCrossings();
    for (let m = 0; m < n; m++) py[m] = heightFn(m / n, this);
    this.slope = new Float32Array(n);
    for (let m = 0; m < n; m++) {
      const a = (m - 2 + n) % n, b = (m + 2) % n;
      const ds = (this.arc[b]! - this.arc[a]! + (b < a ? this.total : 0)) || 1;
      this.slope[m] = (py[b]! - py[a]!) / ds;
    }
    for (let m = 0; m < n; m++) {
      const key = this.key(px[m]!, pz[m]!);
      let l = this.grid.get(key); if (!l) { l = []; this.grid.set(key, l); }
      l.push(m);
    }
  }

  private key(x: number, z: number) { return (Math.floor(x / this.cell) + 512) * 4096 + (Math.floor(z / this.cell) + 512); }

  /** Pairs of lap fractions where two stretches of the circuit cross in plan view. */
  private findCrossings() {
    const n = this.n, px = this.px, pz = this.pz, step = 2, out: Array<[number, number]> = [];
    for (let a = 0; a < n; a += step) {
      const a2 = (a + step) % n;
      for (let b = a + n / 8; b < n; b += step) {
        const b2 = (b + step) % n;
        if (b2 === a || b === a2) continue;
        const dx1 = px[a2]! - px[a]!, dz1 = pz[a2]! - pz[a]!, dx2 = px[b2]! - px[b]!, dz2 = pz[b2]! - pz[b]!;
        const den = dx1 * dz2 - dz1 * dx2;
        if (Math.abs(den) < 1e-6) continue;
        const t = ((px[b]! - px[a]!) * dz2 - (pz[b]! - pz[a]!) * dx2) / den, s = ((px[b]! - px[a]!) * dz1 - (pz[b]! - pz[a]!) * dx1) / den;
        if (t >= 0 && t < 1 && s >= 0 && s < 1) {
          const ua = (a + t * step) / n, ub = (b + s * step) / n;
          if (!out.some((o) => Math.abs(o[0] - ua) < 0.03 && Math.abs(o[1] - ub) < 0.03)) out.push([ua, ub]);
        }
      }
    }
    this.crossings = out;
  }

  /** Smooth bump: 1 on the plateau around lap fraction c, easing to 0 over `ramp`. */
  static bump(u: number, c: number, plateau: number, ramp: number) {
    let d = Math.abs(u - c); d = Math.min(d, 1 - d);
    return 1 - smooth(plateau, plateau + ramp, d);
  }

  /** Position and frame at lap fraction u (0..1, wraps). */
  at(u: number, o: PathSample = { x: 0, y: 0, z: 0, fx: 1, fz: 0, rx: 0, rz: 1, slope: 0, kap: 0, arc: 0 }): PathSample {
    const n = this.n;
    let m = (((u % 1) + 1) % 1) * n; const i = Math.floor(m) % n, j = (i + 1) % n; const t = m - Math.floor(m);
    o.x = this.px[i]! + (this.px[j]! - this.px[i]!) * t;
    o.y = this.py[i]! + (this.py[j]! - this.py[i]!) * t;
    o.z = this.pz[i]! + (this.pz[j]! - this.pz[i]!) * t;
    let fx = this.fx[i]! + (this.fx[j]! - this.fx[i]!) * t, fz = this.fz[i]! + (this.fz[j]! - this.fz[i]!) * t;
    const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    o.fx = fx; o.fz = fz; o.rx = -fz; o.rz = fx;
    o.slope = this.slope[i]! + (this.slope[j]! - this.slope[i]!) * t;
    o.kap = this.kap[i]! + (this.kap[j]! - this.kap[i]!) * t;
    o.arc = this.arc[i]! + (this.arc[j]! - this.arc[i]!) * t + (j < i ? this.total * t : 0);
    return o;
  }

  /** Nearest samples around a world point: the closest distance, and the lowest road height among samples about as close. */
  nearest(x: number, z: number, out = { d: 1e9, h: 0, i: 0, side: 1 }) {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    let best = 1e18, bi = 0;
    const found: Array<[number, number]> = [];
    for (let r = 1; r <= 8; r++) {
      for (let gx = cx - r; gx <= cx + r; gx++) for (let gz = cz - r; gz <= cz + r; gz++) {
        if (Math.max(Math.abs(gx - cx), Math.abs(gz - cz)) !== r && r !== 1) continue;
        const l = this.grid.get((gx + 512) * 4096 + (gz + 512));
        if (!l) continue;
        for (const m of l) { const dx = this.px[m]! - x, dz = this.pz[m]! - z, d2 = dx * dx + dz * dz; found.push([d2, m]); if (d2 < best) { best = d2; bi = m; } }
      }
      if (best < (r * this.cell) * (r * this.cell) * 0.8) break;
    }
    const d = Math.sqrt(best);
    let h = this.py[bi]!;
    for (const [d2, m] of found) if (Math.sqrt(d2) < d + 7 && this.py[m]! < h) h = this.py[m]!;
    out.d = d; out.h = h; out.i = bi;
    out.side = (x - this.px[bi]!) * (-this.fz[bi]!) + (z - this.pz[bi]!) * this.fx[bi]! >= 0 ? 1 : -1;
    return out;
  }
}
