/**
 * Drift King's night-dock courses, easiest first. Each is a closed loop of control points in metres (x east, z south), the width of the
 * course between its barriers, the quay slab it sits on (anything outside the slab is harbour water), clipping zones (drift close to the
 * marker for a bonus) and the scores for the three medals. Each map is a little harder than the one before: narrower, tighter, more zones,
 * and on the last one the sea is right beside the course.
 */
export interface DriftMap {
  id: string;
  name: string;
  stars: number;
  blurb: string;
  pts: Array<{ x: number; y: number }>;
  width: number;
  /** the quay slab reaches this far beyond the course's extent: west, east, north, south (metres). Beyond it is harbour water. */
  quay: [number, number, number, number];
  /** clipping zones: lap fraction and side (+1 right, -1 left) */
  clips: Array<[number, 1 | -1]>;
  /** bronze, silver, gold */
  medals: [number, number, number];
  laps: number;
  /** what lines the course: share of containers vs concrete barriers vs tyre walls */
  walls: "barriers" | "containers" | "mixed" | "pier";
  seed: number;
}

const P = (a: number[][]) => a.map(([x, y]) => ({ x: x!, y: y! }));

export const DRIFT_MAPS: DriftMap[] = [
  {
    id: "lot", name: "Harbour Lot", stars: 1, blurb: "A wide loop round the empty trailer park. Learn to hold a slide.",
    pts: P([[0, 0], [40, -6], [80, 0], [108, 16], [112, 42], [95, 64], [60, 70], [30, 60], [8, 72], [-26, 66], [-42, 40], [-36, 12]]),
    width: 22, quay: [60, 60, 50, 50], clips: [[0.22, -1], [0.55, 1], [0.84, -1]], medals: [9000, 18000, 30000], laps: 2, walls: "barriers", seed: 11,
  },
  {
    id: "alley", name: "Container Alley", stars: 2, blurb: "Two hairpins joined by a wiggle between walls of shipping containers.",
    pts: P([[0, 0], [30, -5], [60, 4], [85, -7], [106, 4], [113, 23], [100, 39], [78, 32], [55, 41], [30, 30], [5, 41], [-16, 35], [-24, 16], [-15, 3]]),
    width: 17, quay: [55, 55, 45, 45], clips: [[0.12, 1], [0.33, -1], [0.47, 1], [0.66, -1], [0.88, 1]], medals: [12000, 24000, 38000], laps: 2, walls: "containers", seed: 23,
  },
  {
    id: "crane", name: "Crane Yard", stars: 3, blurb: "Tight switchbacks under the gantry cranes. Linking the turns is everything.",
    pts: P([[0, 0], [24, -9], [45, 5], [63, -11], [84, 0], [94, 21], [79, 37], [58, 27], [40, 45], [19, 34], [-1, 49], [-19, 36], [-17, 13]]),
    width: 14, quay: [50, 50, 45, 45], clips: [[0.07, -1], [0.19, 1], [0.3, -1], [0.45, 1], [0.58, -1], [0.7, 1], [0.83, -1], [0.94, 1]], medals: [14000, 28000, 44000], laps: 2, walls: "mixed", seed: 37,
  },
  {
    id: "pier", name: "Pier Edge", stars: 4, blurb: "Along the edge of the pier with nothing between you and the sea. Fall in and you lose the chain.",
    pts: P([[0, 0], [40, 0], [80, 0], [112, 0], [131, 11], [129, 29], [111, 35], [90, 26], [70, 35], [45, 27], [20, 36], [-5, 30], [-17, 13]]),
    width: 12, quay: [45, 9.5, 6.3, 45], clips: [[0.1, -1], [0.22, -1], [0.33, 1], [0.48, -1], [0.62, 1], [0.76, -1], [0.9, 1]], medals: [16000, 32000, 50000], laps: 2, walls: "pier", seed: 41,
  },
];
