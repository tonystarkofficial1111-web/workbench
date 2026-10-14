import { lsGetRaw, lsSetRaw } from "../../core/store";

/** Graphics levels of the Infinite world. Low is meant for Chromebooks and other slow devices. */
export type GfxLevel = 0 | 1 | 2;
export const GFX_NAMES = ["Low", "Medium", "High"] as const;
const KEY = "wb-inf-gfx";

export interface GfxFeatures {
  level: GfxLevel;
  /** Highest device-pixel-ratio the canvas may use (Low draws fewer pixels than the screen has). */
  dprCap: number;
  /** Fixed ratio used instead of the device ratio when set (Low). */
  fixedRatio: number | null;
  /** Detail tiers of models that are shown (0 = essential parts only, 2 = everything). */
  tier: 0 | 1 | 2;
  /** 0 = scrolling picture, 1 = animated waves, 2 = waves + foam + sun glitter + reflections. */
  water: 0 | 1 | 2;
  /** 0 = plain gradient, 1 = gradient + clouds, 2 = clouds + sun glow + stars. */
  sky: 0 | 1 | 2;
  /** Amount of ground plants 0..1. */
  foliage: number;
  /** Wind sway of trees and plants. */
  sway: boolean;
  /** Amount of weather / leaf / dust particles 0..1. */
  particles: number;
  /** Tree model detail: 0 trunk + one canopy, 2 full jungle trees with vines and roots. */
  trees: 0 | 1 | 2;
  /** Soft sun shadows (also needs the engine's Shaders switch). */
  shadows: boolean;
}

export function featuresFor(level: GfxLevel): GfxFeatures {
  if (level === 0)
    return { level, dprCap: 1, fixedRatio: 0.7, tier: 0, water: 0, sky: 0, foliage: 0.3, sway: false, particles: 0.25, trees: 0, shadows: false };
  if (level === 1)
    return { level, dprCap: 1.25, fixedRatio: null, tier: 1, water: 1, sky: 1, foliage: 0.65, sway: true, particles: 0.6, trees: 1, shadows: false };
  return { level, dprCap: 2, fixedRatio: null, tier: 2, water: 2, sky: 2, foliage: 1, sway: true, particles: 1, trees: 2, shadows: true };
}

/** First-run default: slow-looking devices (Chromebooks, few cores, little memory) start on Medium. */
function defaultLevel(): GfxLevel {
  try {
    const nav = navigator as any;
    const cros = /CrOS/.test(nav.userAgent || "");
    const cores = nav.hardwareConcurrency || 8;
    const mem = nav.deviceMemory || 8;
    if (cros || cores <= 4 || mem <= 4) return 1;
  } catch { /* ignore */ }
  return 2;
}

export class Gfx {
  level: GfxLevel;
  f: GfxFeatures;
  /** Pixel-ratio ceiling set by the Developer-options performance monitor (its "Lite" level). */
  perfCap: number | null = null;
  /** The player picked a level (as opposed to the first-run default). */
  chosen = false;
  private listeners: Array<(g: Gfx) => void> = [];

  constructor() {
    const raw = lsGetRaw(KEY);
    const n = raw == null ? NaN : Number(raw);
    if (n === 0 || n === 1 || n === 2) { this.level = n; this.chosen = true; }
    else this.level = defaultLevel();
    this.f = featuresFor(this.level);
  }

  name() { return GFX_NAMES[this.level]; }

  set(level: GfxLevel, save = true) {
    if (level === this.level && this.f.level === level) return;
    this.level = level;
    this.f = featuresFor(level);
    if (save) { this.chosen = true; lsSetRaw(KEY, String(level)); }
    this.listeners.forEach((l) => l(this));
  }

  /** High -> Medium -> Low -> High. */
  cycle() { this.set(this.level === 2 ? 1 : this.level === 1 ? 0 : 2); }

  onChange(fn: (g: Gfx) => void) { this.listeners.push(fn); }

  /** Pixel ratio to give the renderer. */
  pixelRatio(dpr: number): number {
    const base = this.f.fixedRatio != null ? this.f.fixedRatio : Math.min(dpr || 1, this.f.dprCap);
    return this.perfCap != null ? Math.min(base, this.perfCap) : base;
  }
}
