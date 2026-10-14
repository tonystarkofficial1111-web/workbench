import { TrackPath } from "./path";

/**
 * One look per circuit: the same track points, but a different hour, sky, land and trees, so the four maps feel like four places.
 * Angles are in the game's plan-view convention (the sun's direction as an angle in the map's x / y plane), which is also what
 * the cockpit overlay uses to light the halo, wheel and bodywork.
 */
export interface F1Env {
  id: string;
  label: string;
  sunAz: number;
  sunEl: number;
  sunColor: number;
  sunI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  grassA: number;
  grassB: number;
  grassFar: number;
  gravel: number;
  leaves: number[];
  trunk: number;
  hillA: number;
  hillB: number;
  cloud: number;
  exposure: number;
  /** Height of the rolling ground along the lap, metres. */
  amp: number;
  /** Colour grade: saturation, contrast, warmth. */
  sat: number;
  contrast: number;
  warm: number;
  /** Tail lights and a low sun glare. */
  dusk: boolean;
  seed: number;
}

const ENVS: Record<string, F1Env> = {
  circle: {
    id: "circle", label: "Midday", sunAz: -0.9, sunEl: 0.9, sunColor: 0xfff1d6, sunI: 3.0, hemiSky: 0xb7d6f5, hemiGround: 0x6b7a50, hemiI: 1.35,
    skyTop: 0x2468d4, skyMid: 0x6aa8ec, skyHorizon: 0xcfe4f6, fog: 0xc4dcf0, fogNear: 120, fogFar: 760,
    grassA: 0x4a9a3e, grassB: 0x3f8836, grassFar: 0x3c7a36, gravel: 0xd8c690, leaves: [0x3f8f3a, 0x4a9e42, 0x347a32, 0x57a84a], trunk: 0x6a4a2c,
    hillA: 0x6f8fa8, hillB: 0x8ea8bc, cloud: 0xffffff, exposure: 1.0, amp: 1.7, sat: 1.12, contrast: 1.06, warm: 0.02, dusk: false, seed: 11,
  },
  technical: {
    id: "technical", label: "Golden hour", sunAz: 2.35, sunEl: 0.3, sunColor: 0xffc27a, sunI: 3.8, hemiSky: 0xf2c79a, hemiGround: 0x8a7a48, hemiI: 2.2,
    skyTop: 0x35569e, skyMid: 0xd9a08c, skyHorizon: 0xffd29a, fog: 0xf0c59a, fogNear: 90, fogFar: 640,
    grassA: 0x7f9a3a, grassB: 0x6f8a32, grassFar: 0x667f30, gravel: 0xe0c48c, leaves: [0xd9892e, 0xc9a232, 0x8fa238, 0xb8662a], trunk: 0x5a3d24,
    hillA: 0x9a7e86, hillB: 0xc0958c, cloud: 0xffd9b0, exposure: 1.05, amp: 1.5, sat: 1.15, contrast: 1.08, warm: 0.09, dusk: false, seed: 23,
  },
  complex: {
    id: "complex", label: "Cool morning", sunAz: 0.5, sunEl: 0.5, sunColor: 0xe6eeff, sunI: 2.4, hemiSky: 0xc7d6e8, hemiGround: 0x5e7a68, hemiI: 1.7,
    skyTop: 0x5f85b8, skyMid: 0xa3bdd8, skyHorizon: 0xe3eaf0, fog: 0xd3dde6, fogNear: 70, fogFar: 520,
    grassA: 0x3f8452, grassB: 0x367848, grassFar: 0x336e48, gravel: 0xbfb8a0, leaves: [0x2f7a52, 0x3d8f5e, 0x286a48, 0x4a9a68], trunk: 0x54402c,
    hillA: 0x5f7f98, hillB: 0x8aa4b8, cloud: 0xf4f8ff, exposure: 1.0, amp: 3.2, sat: 1.05, contrast: 1.05, warm: -0.02, dusk: false, seed: 37,
  },
  curvy: {
    id: "curvy", label: "Sunset", sunAz: -2.3, sunEl: 0.16, sunColor: 0xff9a5a, sunI: 3.6, hemiSky: 0xe8a8a8, hemiGround: 0x6a5a64, hemiI: 2.3,
    skyTop: 0x2a3a78, skyMid: 0xc86a8a, skyHorizon: 0xffa468, fog: 0xe89a78, fogNear: 80, fogFar: 600,
    grassA: 0x5a8a3e, grassB: 0x4e7c36, grassFar: 0x47703a, gravel: 0xd6b48c, leaves: [0x3f7a3a, 0x5a8a38, 0x8a6a2e, 0x7a8a3a], trunk: 0x4e3626,
    hillA: 0x6a4a6a, hillB: 0xa86a7a, cloud: 0xffb48c, exposure: 1.08, amp: 4.0, sat: 1.18, contrast: 1.1, warm: 0.07, dusk: true, seed: 53,
  },
};

export function f1EnvFor(id: string): F1Env { return ENVS[id] || ENVS.circle!; }

/** Height of the road along the lap: gentle hills, and a bridge where the circuit crosses itself. */
export function f1HeightFn(env: F1Env) {
  return (u: number, path: TrackPath) => {
    const t = Math.PI * 2;
    let roll = 0.6 * Math.sin(t * (2 * u + env.seed * 0.13)) + 0.4 * Math.sin(t * (3 * u + env.seed * 0.29));
    let bridge = 0;
    const cr = path.crossings[0];
    if (cr) {
      const low = TrackPath.bump(u, cr[1], 0.045, 0.08);
      roll *= 1 - 0.95 * low;
      bridge = 5.4 * TrackPath.bump(u, cr[0], 0.024, 0.13);
    }
    return roll * env.amp * (cr ? 0.7 : 1) + bridge;
  };
}
