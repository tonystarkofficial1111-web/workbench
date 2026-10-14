import type { T3 } from "./types";
import { mulberry32, clamp } from "./rng";

/**
 * Atmosphere shared by the sky dome, the water, plants, flags and the particles: wind, clouds, light colours and a clock.
 * Shaders hold references to the uniform objects below, so values are changed in place and never replaced.
 */

/** A tileable RGBA noise picture (four independent fractal layers) used by clouds, waves and foam. */
export function makeNoiseTexture(T: T3, size = 128): any {
  const data = new Uint8Array(size * size * 4);
  const layers = [
    { base: 4, seed: 11 },
    { base: 6, seed: 23 },
    { base: 3, seed: 37 },
    { base: 8, seed: 41 },
  ];
  const fade = (t: number) => t * t * (3 - 2 * t);
  layers.forEach((layer, c) => {
    // sum of octaves, each a periodic lattice of random values
    const octs = [1, 2, 4, 8];
    const lattices = octs.map((o, k) => {
      const n = layer.base * o;
      const rnd = mulberry32(layer.seed * 1000 + k * 77);
      const arr = new Float32Array(n * n);
      for (let i = 0; i < arr.length; i++) arr[i] = rnd();
      return { n, arr };
    });
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, amp = 0.5, norm = 0;
        for (const { n, arr } of lattices) {
          const fx = (x / size) * n, fy = (y / size) * n;
          const ix = Math.floor(fx), iy = Math.floor(fy);
          const tx = fade(fx - ix), ty = fade(fy - iy);
          const x0 = ix % n, y0 = iy % n, x1 = (ix + 1) % n, y1 = (iy + 1) % n;
          const a = arr[y0 * n + x0]!, b = arr[y0 * n + x1]!, d = arr[y1 * n + x0]!, e = arr[y1 * n + x1]!;
          v += (a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty) * amp;
          norm += amp;
          amp *= 0.5;
        }
        data[(y * size + x) * 4 + c] = Math.round(clamp(v / norm, 0, 1) * 255);
      }
    }
  });
  const tex = new T.DataTexture(data, size, size, T.RGBAFormat);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export class Air {
  readonly T: T3;
  readonly u: Record<string, { value: any }>;
  noise: any;

  // wind: direction is the way the wind blows TOWARD, in radians around Y (x = cos, z = sin)
  windDir = 0.7;
  windBase = 0.16;
  windStr = 0.16;
  windGust = 0;
  private windOff: any;

  // weather as smooth 0..1 amounts (the Infinite weather module sets the targets)
  cover = 0.3; dark = 0; rain = 0; storm = 0; fog = 0; blood = 0; flash = 0;

  constructor(T: T3) {
    this.T = T;
    this.noise = makeNoiseTexture(T);
    this.windOff = new T.Vector2();
    this.u = {
      uTime: { value: 0 },
      uWind: { value: new T.Vector4(Math.cos(this.windDir), Math.sin(this.windDir), this.windStr, 0) },
      uWindOff: { value: this.windOff },
      uSunDir: { value: new T.Vector3(0, 1, 0) },
      uMoonDir: { value: new T.Vector3(0, -1, 0) },
      uSunCol: { value: new T.Color(1, 0.95, 0.85) },
      uSunAmt: { value: 1 },
      uZenith: { value: new T.Color(0.14, 0.38, 0.82) },
      uHorizon: { value: new T.Color(0.62, 0.78, 0.96) },
      uFogCol: { value: new T.Color(0.62, 0.78, 0.96) },
      uFogRange: { value: new T.Vector2(60, 320) },
      uTwilight: { value: 0 },
      uNight: { value: 0 },
      uCover: { value: this.cover },
      uCloudDark: { value: 0 },
      uRain: { value: 0 },
      uFlash: { value: 0 },
      uNoise: { value: this.noise },
      uShore: { value: null },
    };
  }

  /** Strength 0..~1.2 after gusts. */
  get strength() { return this.windStr; }
  get kmh() { return Math.round(this.windStr * 62); }
  get windWord() {
    const s = this.windStr;
    return s < 0.12 ? "Calm" : s < 0.3 ? "Light breeze" : s < 0.55 ? "Windy" : s < 0.85 ? "Strong wind" : "Gale";
  }

  /** Called once per drawn frame. `rtime` is the animation clock in seconds. */
  update(dt: number, rtime: number) {
    // follow the day's base wind, with slow swings and gusts on top
    const g = 0.5 + 0.5 * Math.sin(rtime * 0.37) * 0.6 + 0.35 * Math.sin(rtime * 1.13 + 1.7) * 0.5 + 0.15 * Math.sin(rtime * 2.9);
    this.windGust += (g - this.windGust) * Math.min(1, dt * 1.5);
    const target = this.windBase * (0.65 + 0.7 * this.windGust);
    this.windStr += (target - this.windStr) * Math.min(1, dt * 1.2);
    this.windDir += Math.sin(rtime * 0.05) * dt * 0.04;
    const dx = Math.cos(this.windDir), dz = Math.sin(this.windDir);
    const w = this.u.uWind!.value;
    w.set(dx, dz, this.windStr, this.windGust);
    // clouds drift with the wind
    const drift = (0.004 + 0.03 * this.windStr) * dt;
    this.windOff.x += dx * drift;
    this.windOff.y += dz * drift;
    this.u.uTime!.value = rtime;
    this.u.uCover!.value = this.cover;
    this.u.uCloudDark!.value = this.dark;
    this.u.uRain!.value = this.rain;
    this.u.uFlash!.value = this.flash;
  }
}
