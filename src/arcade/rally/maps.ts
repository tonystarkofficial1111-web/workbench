import { TrackPath } from "../f1/path";

/**
 * Rally stages, easiest first: closed off-road loops (so it races like the F1 Cockpit, against three rival crews), each with its own
 * surface, weather, scenery and height profile with crests and jumps. Coordinates are metres (x east, z south). Each stage is a little
 * harder than the one before: narrower, twistier, slipperier, and with bigger jumps.
 */
export type Surface = "gravel" | "sand" | "snow" | "mud";
export interface RallyMap {
  id: string;
  name: string;
  stars: number;
  blurb: string;
  pts: Array<[number, number]>;
  width: number;
  surface: Surface;
  laps: number;
  /** grip of the road surface and of the verges beside it */
  mu: number; muVerge: number;
  /** road height along the lap: hills plus crests / jumps */
  height: (u: number) => number;
  /** crests and jumps (lap fraction, metres of lift) and water crossings (lap fraction) */
  jumps: Array<[number, number]>;
  water: number[];
  /** sky and light */
  sky: [string, string, string];
  sun: [number, number, number];
  sunColor: number; sunI: number; hemiSky: number; hemiGround: number; hemiI: number;
  fog: number; fogDensity: number;
  /** ground colours (near the road, far away) and what grows */
  ground: [number, number, number];
  scenery: "forest" | "canyon" | "alpine" | "jungle";
  weather: "clear" | "dust" | "snow" | "rain";
  hills: number;
  seed: number;
}

const jumpShape = (u: number, c: number, h: number) => {
  // up the ramp over ~1.6% of the lap, then a sharp drop: a car going fast takes off at the top
  let d = u - c; if (d > 0.5) d -= 1; if (d < -0.5) d += 1;
  if (d < -0.016 || d > 0.008) return 0;
  return d < 0 ? h * (1 - (d / -0.016) ** 2) * (1 + d / 0.016 * 0) : h * (1 - d / 0.008);
};
const S = (u: number, k: number, ph = 0) => Math.sin((u * k + ph) * Math.PI * 2);

export const RALLY_MAPS: RallyMap[] = [
  {
    id: "forest", name: "Forest Gravel", stars: 1, blurb: "Fast gravel through pine forest, with a couple of crests to jump. Finland in summer.",
    pts: [[0, 0], [80, -12], [150, 8], [205, -22], [265, 0], [295, 62], [262, 124], [200, 142], [150, 108], [90, 152], [30, 132], [-22, 92], [-42, 40]],
    width: 9.5, surface: "gravel", laps: 2, mu: 0.8, muVerge: 0.58,
    height: (u) => 5 * S(u, 2) + 2.5 * S(u, 5, 0.3),
    jumps: [[0.2, 1.8], [0.62, 2.2]], water: [],
    sky: ["#3f78c8", "#8fbde8", "#e4eef6"], sun: [0.5, 0.62, -0.6], sunColor: 0xfff1d8, sunI: 2.6, hemiSky: 0xbcd6f4, hemiGround: 0x4a5a32, hemiI: 1.0,
    fog: 0xbcd0e2, fogDensity: 0.0042, ground: [0x4f7a34, 0x3e6a2c, 0x56703c], scenery: "forest", weather: "clear", hills: 22, seed: 3,
  },
  {
    id: "canyon", name: "Desert Canyon", stars: 2, blurb: "Loose sand between red rock walls at sunset. Big jumps, soft edges, dust everywhere.",
    pts: [[0, 0], [70, 22], [130, -10], [192, 12], [232, 72], [202, 132], [140, 152], [110, 100], [60, 132], [0, 112], [-42, 60]],
    width: 10, surface: "sand", laps: 2, mu: 0.72, muVerge: 0.5,
    height: (u) => 3 * S(u, 3) + 2 * S(u, 7, 0.4),
    jumps: [[0.14, 2.4], [0.47, 2.8], [0.8, 2.2]], water: [],
    sky: ["#30406e", "#d9825a", "#f6c27a"], sun: [-0.7, 0.18, -0.68], sunColor: 0xffb070, sunI: 2.4, hemiSky: 0xf0b080, hemiGround: 0x7a4a30, hemiI: 0.9,
    fog: 0xd8a070, fogDensity: 0.0048, ground: [0xc8955c, 0xb27a48, 0xd2a066], scenery: "canyon", weather: "dust", hills: 30, seed: 17,
  },
  {
    id: "alpine", name: "Alpine Snow", stars: 3, blurb: "Snow and ice up a mountain and back down. Hairpins, snow banks and very little grip.",
    pts: [[0, 0], [62, -32], [122, -12], [102, 40], [42, 62], [92, 102], [162, 92], [202, 142], [152, 192], [82, 172], [22, 202], [-32, 152], [-22, 82], [-52, 32]],
    width: 8.5, surface: "snow", laps: 2, mu: 0.6, muVerge: 0.42,
    height: (u) => 26 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2)) + 2 * S(u, 9, 0.2),
    jumps: [[0.33, 1.6], [0.74, 1.8]], water: [],
    sky: ["#5a86c8", "#a8c8ec", "#eef4fa"], sun: [0.4, 0.45, 0.8], sunColor: 0xfff6ea, sunI: 2.4, hemiSky: 0xdfeaff, hemiGround: 0xb8c4d4, hemiI: 1.2,
    fog: 0xdce6f2, fogDensity: 0.0055, ground: [0xeef3f8, 0xdde6f0, 0xf6f9fc], scenery: "alpine", weather: "snow", hills: 60, seed: 29,
  },
  {
    id: "jungle", name: "Rainforest Mud", stars: 4, blurb: "Narrow, muddy and wet, with river crossings and jungle right at the edge. The hardest one.",
    pts: [[0, 0], [52, -26], [112, -16], [142, 32], [112, 72], [152, 112], [112, 162], [52, 142], [12, 182], [-42, 142], [-22, 92], [-62, 52], [-42, 12]],
    width: 7.6, surface: "mud", laps: 2, mu: 0.62, muVerge: 0.4,
    height: (u) => 4 * S(u, 3, 0.1) + 3 * S(u, 8),
    jumps: [[0.27, 2.0], [0.69, 2.4]], water: [0.12, 0.55, 0.88],
    sky: ["#3a4a52", "#6c7e84", "#9aa6a6"], sun: [0.3, 0.5, 0.7], sunColor: 0xd8e4d8, sunI: 1.3, hemiSky: 0x9fb0a8, hemiGround: 0x2c3a22, hemiI: 1.1,
    fog: 0x7c8c86, fogDensity: 0.0105, ground: [0x3e5a26, 0x2e4a1e, 0x4a3a26], scenery: "jungle", weather: "rain", hills: 26, seed: 41,
  },
];

/** Dense control points (Catmull-Rom through the map's points every few metres) so the road can carry sharp crests. */
export function rallyPath(m: RallyMap): TrackPath {
  const P = m.pts, k = P.length, out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < k; i++) {
    const p0 = P[(i - 1 + k) % k]!, p1 = P[i]!, p2 = P[(i + 1) % k]!, p3 = P[(i + 2) % k]!;
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.max(2, Math.round(len / 7));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  return new TrackPath(out, (u) => m.height(u) + m.jumps.reduce((s, [c, h]) => s + jumpShape(u, c, h), 0) - m.water.reduce((s, c) => { let d = Math.abs(u - c); d = Math.min(d, 1 - d); return s + (d < 0.012 ? 0.9 * (0.5 + 0.5 * Math.cos((d / 0.012) * Math.PI)) : 0); }, 0), 1, m.width * 1.1);
}
