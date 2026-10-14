import { lsGetRaw, lsSetRaw } from "../../core/store";

/**
 * Graphics levels of the F1 Cockpit's 3D live feed. Balanced is the default; Low is for Chromebooks and other slow devices.
 * (Same idea as the Block World's Graphics button: one saved choice that decides how much is drawn, never how the game plays.)
 */
export type F1Level = 0 | 1 | 2;
export const F1_LEVEL_NAMES = ["Low", "Balanced", "High"] as const;
const KEY = "wb-f1-gfx";

export interface F1Features {
  level: F1Level;
  /** Render resolution as a share of the on-screen size (Low draws fewer pixels than are shown). */
  scale: number;
  /** Highest device-pixel-ratio used. */
  dprCap: number;
  /** Sun shadows (0 = off, otherwise the shadow-map size). */
  shadow: number;
  /** Multisampling of the picture (0 = none). */
  msaa: number;
  /** Full-screen pass: speed blur, vignette, colour grade. */
  post: boolean;
  /** Strength of the speed blur at full speed. */
  blur: number;
  /** Bloom-like glow on bright parts (High). */
  glow: number;
  /** Number of trees around the circuit. */
  trees: number;
  /** Boxy clouds in the sky. */
  clouds: number;
  /** Grandstands, pit building and sponsor boards. */
  props: 0 | 1 | 2;
  /** Mountains in the distance. */
  hills: boolean;
  /** Distance of the terrain grid cells in metres (bigger = fewer triangles). */
  cell: number;
  /** Catch fences along the barriers. */
  fence: boolean;
  /** Shadow distance in metres around the car. */
  shadowReach: number;
}

export function f1FeaturesFor(level: F1Level): F1Features {
  if (level === 0) return { level, scale: 0.62, dprCap: 1, shadow: 0, msaa: 0, post: false, blur: 0, glow: 0, trees: 170, clouds: 5, props: 0, hills: true, cell: 11, fence: false, shadowReach: 0 };
  if (level === 1) return { level, scale: 1, dprCap: 1.5, shadow: 1024, msaa: 4, post: true, blur: 0.9, glow: 0, trees: 480, clouds: 9, props: 1, hills: true, cell: 8, fence: true, shadowReach: 46 };
  return { level, scale: 1, dprCap: 2, shadow: 2048, msaa: 4, post: true, blur: 1.2, glow: 0.35, trees: 860, clouds: 13, props: 2, hills: true, cell: 6, fence: true, shadowReach: 64 };
}

/** First-run default: Balanced, or Low on slow-looking devices (Chromebooks, few cores, little memory), as in the Infinite world. */
function defaultF1Level(): F1Level {
  try {
    const nav = navigator as any;
    if (/CrOS/.test(nav.userAgent || "") || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4) return 0;
  } catch { /* ignore */ }
  return 1;
}

export function loadF1Level(): F1Level {
  const raw = lsGetRaw(KEY);
  const n = raw == null ? NaN : Number(raw);
  return n === 0 || n === 1 || n === 2 ? n : defaultF1Level();
}

export function saveF1Level(l: F1Level) { lsSetRaw(KEY, String(l)); }

/** Low -> Balanced -> High -> Low */
export function nextF1Level(l: F1Level): F1Level { return ((l + 1) % 3) as F1Level; }
