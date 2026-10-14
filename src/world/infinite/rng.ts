// Small deterministic helpers shared by the Infinite-world generators: a seeded random source and 2D value noise.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private f: () => number;
  constructor(public seed: number) {
    this.f = mulberry32(seed);
  }
  next() { return this.f(); }
  range(a: number, b: number) { return a + (b - a) * this.f(); }
  int(a: number, b: number) { return Math.floor(a + (b - a + 1) * this.f()); }
  chance(p: number) { return this.f() < p; }
  pick<T>(list: readonly T[]): T { return list[Math.floor(this.f() * list.length) % list.length] as T; }
  /** Roughly normal, mean 0, spread ~1. */
  gauss() { return (this.f() + this.f() + this.f() + this.f() - 2) * 1.2247; }
  fork(tag: number) { return new Rng((this.seed * 31 + tag * 7919) >>> 0); }
}

function hash2(ix: number, iz: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in [0,1]. */
export function vnoise(x: number, z: number, seed = 1): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = fade(x - ix), fz = fade(z - iz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Fractal noise in [0,1]. */
export function fbm(x: number, z: number, seed = 1, octaves = 4): number {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x * f, z * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
