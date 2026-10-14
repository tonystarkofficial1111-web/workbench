// @ts-nocheck
import { MB } from "../../world/infinite/mb";
import type { Vehicle } from "./vehicle";

/**
 * Blocky road and rally cars for the 3D car games, built from boxes with MB (merged per material) so each car is a handful of draw calls.
 * Every model faces +z, stands on y = 0, and has its left on +x (so the car's right is -x). The body (paint, glass, lights) sits on its own
 * group so it can roll, pitch and bounce on the springs while the wheels stay on the ground and steer and spin.
 */
export type CarKind = "skyline" | "mustang" | "impreza" | "yaris" | "hatch" | "pickup";

export interface CarModel {
  kind: CarKind;
  group: any;
  body: any;
  /** FL, FR, RL, RR: roots (they steer) and the spinning part inside */
  wheels: Array<{ root: any; spin: any }>;
  /** tail-light material (brightens under braking) */
  tail: any;
  /** headlight material */
  head: any;
  /** model-space points: exhausts, rear wheels' contact points, front wheels' contact points */
  exhausts: any[];
  wheelPos: Array<[number, number, number]>;
  /** interior pieces only seen from the driver's seat (rally): steering wheel group */
  steeringWheel: any | null;
  eye: [number, number, number];
  update(v: Vehicle, dt: number, braking: boolean): void;
  dispose(): void;
}

const DK = 0x15171b, DK2 = 0x24272d, GL = 0x1b2836, SV = 0xc9ced6, WH = 0xf2f2f4, CH = 0x8d939b;

interface Shape {
  len: number; width: number; wheelZ: [number, number]; track: number; wheelR: number; wheelW: number; rim: number; tyre?: number;
  build(mb: MB, col: number, acc: number, mbl: MB, mbg: MB): void;
  exhausts: Array<[number, number, number]>;
  eye: [number, number, number];
}

/** A slanted pane (windscreen / back window): from (z0, y0) to (z1, y1) across width w. */
function pane(mb: MB, color: number, w: number, z0: number, y0: number, z1: number, y1: number, t = 0.04, o: any = {}) {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  mb.box(color, w, t, len, 0, (y0 + y1) / 2, (z0 + z1) / 2, -Math.atan2(dy, dz), 0, 0, o);
}

const SHAPES: Record<CarKind, Shape> = {
  // Nissan Skyline GT-R (R34): a boxy wedge, long bonnet, four round-ish tail lights, a tall rear wing, front lip
  skyline: {
    len: 4.6, width: 1.79, wheelZ: [1.33, -1.33], track: 0.76, wheelR: 0.33, wheelW: 0.25, rim: 0x5b6068,
    exhausts: [[0.42, 0.3, -2.32]], eye: [0.36, 1.08, -0.15],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.62, 0.14, 4.3, 0, 0.27, 0);                                       // floor
      mb.box(col, 1.78, 0.48, 4.48, 0, 0.56, 0);                                      // lower body
      mb.box(col, 1.72, 0.12, 1.55, 0, 0.84, 1.42, 0.05, 0, 0);                       // bonnet, sloping down to the nose
      mb.box(DK, 0.5, 0.03, 0.34, 0, 0.9, 1.45, 0.05, 0, 0);                          // bonnet vent
      mb.box(DK, 1.84, 0.17, 0.3, 0, 0.33, 2.2);                                      // front bumper and lip
      mb.box(acc, 1.86, 0.04, 0.34, 0, 0.24, 2.22, 0, 0, 0, { jit: 0 });              // carbon lip
      mb.box(DK2, 1.1, 0.16, 0.05, 0, 0.6, 2.25);                                     // grille
      mb.box(SV, 0.16, 0.06, 0.02, 0, 0.62, 2.28, 0, 0, 0, { jit: 0 });              // badge
      for (const s of [-1, 1]) {
        mb.box(DK, 0.36, 0.1, 0.06, s * 0.36, 0.42, 2.33);                            // bumper intakes
        mb.box(col, 0.1, 0.3, 1.0, s * 0.89, 0.52, 1.33);                              // fender flares
        mb.box(col, 0.1, 0.3, 1.0, s * 0.89, 0.52, -1.33);
        mb.box(DK, 0.06, 0.12, 2.3, s * 0.9, 0.36, 0);                                 // side skirts
        mb.box(col, 0.14, 0.08, 0.16, s * 0.86, 1.0, 0.55); mb.box(GL, 0.02, 0.06, 0.12, s * 0.93, 1.0, 0.55);   // mirrors
        mb.box(CH, 0.02, 0.04, 0.16, s * 0.9, 0.74, -0.1, 0, 0, 0, { jit: 0 });       // door handles
        mb.box(DK, 0.06, 0.26, 0.12, s * 0.55, 0.98, -2.02);                           // wing stands
      }
      mb.box(col, 1.5, 0.46, 1.95, 0, 1.06, -0.25);                                    // cabin block (the glass is set into it)
      mb.box(col, 1.42, 0.06, 1.2, 0, 1.31, -0.3);                                     // roof
      mb.box(col, 1.72, 0.1, 0.95, 0, 0.84, -1.72);                                    // boot lid
      mb.box(col, 1.66, 0.06, 0.34, 0, 1.12, -2.02);                                   // rear wing
      mb.box(acc, 1.66, 0.02, 0.06, 0, 1.15, -1.86, 0, 0, 0, { jit: 0 });
      mb.box(DK, 1.84, 0.24, 0.22, 0, 0.42, -2.26);                                    // rear bumper
      mb.box(DK2, 0.36, 0.16, 0.03, 0, 0.62, -2.37); mb.box(WH, 0.32, 0.1, 0.02, 0, 0.62, -2.385, 0, 0, 0, { jit: 0 });   // plate
      mb.box(WH, 0.36, 0.1, 0.02, 0, 0.42, 2.37, 0, 0, 0, { jit: 0 });
      // glass
      pane(mbg, GL, 1.38, 0.66, 0.9, 0.25, 1.3);                                        // windscreen
      pane(mbg, GL, 1.34, -1.24, 0.9, -0.92, 1.28);                                     // back window
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.34, 1.5, s * 0.755, 1.06, -0.3);     // side windows
      // lamps
      for (const s of [-1, 1]) {
        mbl.box(0xe6efff, 0.42, 0.12, 0.04, s * 0.6, 0.68, 2.25, 0, 0, 0, { mat: "lamp" });
        mbl.box(0xffb347, 0.12, 0.05, 0.04, s * 0.86, 0.58, 2.2, 0, 0, 0, { mat: "lamp" });
        for (const k of [0.45, 0.72]) mbl.box(0xff2a2a, 0.2, 0.2, 0.04, s * k, 0.72, -2.25, 0, 0, 0, { mat: "lamp", tail: true });
      }
    },
  },
  // Ford Mustang GT 5.0 (2021): long bonnet with a power dome, shark-nose grille, fastback roof, tri-bar tail lights, quad exhausts
  mustang: {
    len: 4.8, width: 1.92, wheelZ: [1.38, -1.34], track: 0.81, wheelR: 0.35, wheelW: 0.27, rim: 0x202328,
    exhausts: [[0.62, 0.3, -2.42], [0.5, 0.3, -2.42], [-0.5, 0.3, -2.42], [-0.62, 0.3, -2.42]], eye: [0.38, 1.1, -0.25],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.72, 0.14, 4.5, 0, 0.28, 0);
      mb.box(col, 1.9, 0.52, 4.66, 0, 0.6, 0);
      mb.box(col, 1.84, 0.12, 1.95, 0, 0.9, 1.35, 0.04, 0, 0);                        // long bonnet
      mb.box(col, 0.72, 0.06, 1.5, 0, 0.98, 1.3, 0.04, 0, 0);                         // power dome
      for (const s of [-1, 1]) mb.box(DK, 0.2, 0.03, 0.42, s * 0.5, 0.97, 1.4, 0.04, 0, 0);   // bonnet vents
      mb.box(DK, 1.24, 0.32, 0.08, 0, 0.62, 2.32, -0.12, 0, 0);                         // shark-nose grille
      mb.box(SV, 0.2, 0.08, 0.02, 0, 0.64, 2.37, 0, 0, 0, { jit: 0 });                // the pony badge
      mb.box(DK, 1.86, 0.2, 0.3, 0, 0.34, 2.22);                                        // bumper
      mb.box(DK2, 1.1, 0.08, 0.06, 0, 0.36, 2.37);                                      // lower intake
      for (const s of [-1, 1]) {
        mb.box(col, 0.1, 0.32, 1.05, s * 0.96, 0.56, 1.38); mb.box(col, 0.12, 0.34, 1.1, s * 0.96, 0.58, -1.34);   // haunches
        mb.box(DK, 0.06, 0.14, 2.4, s * 0.97, 0.38, 0);
        mb.box(DK, 0.04, 0.18, 0.5, s * 0.97, 0.66, -0.72);                             // side scoop
        mb.box(SV, 0.02, 0.05, 0.16, s * 0.97, 0.7, 1.05, 0, 0, 0, { jit: 0 });         // 5.0 badge
        mb.box(col, 0.16, 0.09, 0.18, s * 0.92, 1.02, 0.42); mb.box(GL, 0.02, 0.07, 0.14, s * 1.0, 1.02, 0.42);
        mb.box(CH, 0.02, 0.04, 0.18, s * 0.96, 0.8, -0.2, 0, 0, 0, { jit: 0 });
      }
      mb.box(col, 1.56, 0.44, 1.5, 0, 1.08, -0.3);                                      // cabin
      mb.box(col, 1.44, 0.06, 1.0, 0, 1.31, -0.28);                                     // roof
      mb.box(col, 1.78, 0.12, 0.62, 0, 0.92, -1.95);                                    // short boot deck
      mb.box(col, 1.64, 0.06, 0.2, 0, 1.0, -2.25, -0.3, 0, 0);                          // ducktail spoiler
      mb.box(DK, 1.66, 0.28, 0.05, 0, 0.76, -2.36);                                     // black tail panel
      mb.box(SV, 0.26, 0.12, 0.02, 0, 0.77, -2.39, 0, 0, 0, { jit: 0 });              // GT badge on the panel
      mb.box(DK, 1.9, 0.22, 0.24, 0, 0.4, -2.3);                                        // rear bumper / diffuser
      mb.box(WH, 0.36, 0.1, 0.02, 0, 0.5, -2.43, 0, 0, 0, { jit: 0 });
      pane(mbg, GL, 1.44, 0.62, 0.95, 0.2, 1.3);
      pane(mbg, GL, 1.38, -1.66, 0.97, -0.8, 1.29);                                     // long fastback glass
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.32, 1.3, s * 0.785, 1.07, -0.3);
      for (const s of [-1, 1]) {
        mbl.box(0xe6efff, 0.46, 0.07, 0.05, s * 0.64, 0.8, 2.25, 0, s * -0.12, 0, { mat: "lamp" });
        for (let k = 0; k < 3; k++) mbl.box(0xeef4ff, 0.04, 0.1, 0.04, s * (0.5 + k * 0.08), 0.42, 2.37, 0, 0, 0, { mat: "lamp" });   // DRL tri-bars
        for (let k = 0; k < 3; k++) mbl.box(0xff2a2a, 0.07, 0.22, 0.04, s * (0.46 + k * 0.11), 0.76, -2.39, 0, 0, 0, { mat: "lamp", tail: true });   // tri-bar tail lights
      }
    },
  },
  // Subaru Impreza WRX STI, rally spec: big bonnet scoop, roof vent, tall wing, mud flaps, a light pod on the bonnet
  impreza: {
    len: 4.4, width: 1.77, wheelZ: [1.26, -1.26], track: 0.76, wheelR: 0.34, wheelW: 0.24, rim: 0xd4a72c, tyre: 0x1a1a1e,
    exhausts: [[-0.55, 0.32, -2.22]], eye: [0.36, 1.14, -0.1],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.6, 0.16, 4.1, 0, 0.32, 0);
      mb.box(0x6d737b, 1.4, 0.06, 1.2, 0, 0.24, 1.2);                                   // sump guard
      mb.box(col, 1.76, 0.5, 4.3, 0, 0.62, 0);
      mb.box(col, 1.7, 0.12, 1.4, 0, 0.9, 1.4, 0.06, 0, 0);
      mb.box(col, 0.62, 0.12, 0.5, 0, 0.99, 1.2); mb.box(DK, 0.5, 0.08, 0.04, 0, 0.99, 1.46);   // bonnet scoop
      mb.box(DK, 1.8, 0.22, 0.3, 0, 0.4, 2.08); mb.box(DK2, 0.9, 0.14, 0.05, 0, 0.66, 2.16);
      for (const s of [-1, 1]) {
        mb.box(col, 0.1, 0.34, 0.95, s * 0.88, 0.56, 1.26); mb.box(col, 0.1, 0.34, 0.95, s * 0.88, 0.56, -1.26);
        mb.box(DK, 0.04, 0.3, 0.02, s * 0.75, 0.3, -1.68);                              // mud flaps
        mb.box(acc, 0.03, 0.08, 1.9, s * 0.89, 0.72, 0, 0, 0, 0, { jit: 0 });          // livery stripe
        mb.box(WH, 0.02, 0.3, 0.36, s * 0.89, 0.66, 0.05, 0, 0, 0, { jit: 0 });         // door number panel
        mb.box(DK, 0.02, 0.2, 0.08, s * 0.895, 0.66, 0.05 + 0.06, 0, 0, 0, { jit: 0 }); mb.box(DK, 0.02, 0.2, 0.08, s * 0.895, 0.66, 0.05 - 0.06, 0, 0, 0, { jit: 0 });
        mb.box(col, 0.14, 0.08, 0.16, s * 0.86, 1.06, 0.52);
        mb.box(DK, 0.06, 0.3, 0.12, s * 0.58, 1.04, -1.9);
      }
      mb.box(col, 1.48, 0.5, 1.9, 0, 1.12, -0.2);
      mb.box(col, 1.4, 0.06, 1.2, 0, 1.39, -0.25); mb.box(DK, 0.3, 0.08, 0.3, 0, 1.44, -0.05);   // roof and roof vent
      mb.box(col, 1.7, 0.1, 0.75, 0, 0.9, -1.7);
      mb.box(col, 1.7, 0.06, 0.4, 0, 1.2, -1.9); mb.box(acc, 1.7, 0.02, 0.06, 0, 1.24, -1.72, 0, 0, 0, { jit: 0 });   // wing
      mb.box(DK, 1.82, 0.26, 0.22, 0, 0.44, -2.12);
      mb.box(DK, 0.9, 0.2, 0.1, 0, 0.98, 1.95);                                         // light pod
      pane(mbg, GL, 1.36, 0.62, 0.96, 0.25, 1.36);
      pane(mbg, GL, 1.32, -1.18, 0.96, -0.86, 1.34);
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.36, 1.5, s * 0.745, 1.12, -0.25);
      for (const s of [-1, 1]) {
        mbl.box(0xe6efff, 0.38, 0.14, 0.04, s * 0.58, 0.72, 2.16, 0, 0, 0, { mat: "lamp" });
        for (const k of [0.16, 0.38]) mbl.box(0xfff4d6, 0.16, 0.14, 0.03, s * k, 0.98, 2.01, 0, 0, 0, { mat: "lamp" });
        mbl.box(0xff2a2a, 0.36, 0.14, 0.04, s * 0.6, 0.8, -2.16, 0, 0, 0, { mat: "lamp", tail: true });
      }
    },
  },
  // Toyota GR Yaris Rally1: short hatch, huge wing and arches, white with red and black
  yaris: {
    len: 4.1, width: 1.88, wheelZ: [1.28, -1.28], track: 0.8, wheelR: 0.34, wheelW: 0.26, rim: 0xf2f2f4, tyre: 0x1a1a1e,
    exhausts: [[0.0, 0.34, -2.08]], eye: [0.36, 1.12, -0.25],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.66, 0.16, 3.8, 0, 0.32, 0);
      mb.box(0x6d737b, 1.4, 0.06, 1.1, 0, 0.24, 1.15);
      mb.box(col, 1.84, 0.52, 3.96, 0, 0.62, 0);
      mb.box(col, 1.76, 0.12, 1.1, 0, 0.92, 1.42, 0.12, 0, 0);
      mb.box(DK, 1.9, 0.26, 0.34, 0, 0.42, 1.98); mb.box(DK2, 1.2, 0.2, 0.05, 0, 0.62, 2.07);
      mb.box(acc, 1.9, 0.05, 0.36, 0, 0.3, 2.0, 0, 0, 0, { jit: 0 });
      for (const s of [-1, 1]) {
        mb.box(col, 0.14, 0.42, 1.0, s * 0.94, 0.58, 1.28); mb.box(col, 0.16, 0.42, 1.05, s * 0.94, 0.58, -1.28);   // big arches
        mb.box(acc, 0.03, 0.42, 0.6, s * 0.94, 0.62, 0.3, 0, 0, 0, { jit: 0 });         // red side panel
        mb.box(DK, 0.03, 0.12, 2.0, s * 0.95, 0.42, 0);
        mb.box(DK, 0.04, 0.3, 0.02, s * 0.78, 0.3, -1.66);
        mb.box(col, 0.14, 0.08, 0.16, s * 0.86, 1.06, 0.6);
        mb.box(DK, 0.08, 0.36, 0.14, s * 0.7, 1.18, -1.72);
      }
      mb.box(col, 1.5, 0.52, 1.7, 0, 1.12, -0.35);
      mb.box(acc, 1.42, 0.06, 1.1, 0, 1.4, -0.38); mb.box(DK, 0.3, 0.08, 0.26, 0, 1.45, -0.1);
      mb.box(DK, 1.86, 0.06, 0.48, 0, 1.38, -1.78); mb.box(acc, 1.86, 0.02, 0.08, 0, 1.42, -1.58, 0, 0, 0, { jit: 0 });   // the big wing
      for (const s of [-1, 1]) mb.box(DK, 0.04, 0.3, 0.5, s * 0.93, 1.3, -1.78);
      mb.box(DK, 1.86, 0.28, 0.24, 0, 0.46, -1.98);
      pane(mbg, GL, 1.38, 0.86, 0.98, 0.45, 1.37);
      pane(mbg, GL, 1.34, -1.36, 0.98, -1.12, 1.36);
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.36, 1.3, s * 0.755, 1.12, -0.38);
      for (const s of [-1, 1]) {
        mbl.box(0xe6efff, 0.36, 0.1, 0.04, s * 0.62, 0.76, 2.0, 0, 0, 0, { mat: "lamp" });
        mbl.box(0xff2a2a, 0.3, 0.1, 0.04, s * 0.66, 0.9, -2.0, 0, 0, 0, { mat: "lamp", tail: true });
      }
    },
  },
  // generic hatchback (traffic, parked cars)
  hatch: {
    len: 3.9, width: 1.7, wheelZ: [1.2, -1.2], track: 0.72, wheelR: 0.3, wheelW: 0.2, rim: 0xa0a6ae,
    exhausts: [[0.4, 0.28, -1.96]], eye: [0.34, 1.1, -0.2],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.5, 0.14, 3.6, 0, 0.28, 0);
      mb.box(col, 1.68, 0.5, 3.86, 0, 0.58, 0);
      mb.box(col, 1.6, 0.1, 0.9, 0, 0.86, 1.45, 0.1, 0, 0);
      mb.box(col, 1.5, 0.52, 1.9, 0, 1.08, -0.4);
      mb.box(DK, 1.72, 0.2, 0.24, 0, 0.38, 1.88); mb.box(DK, 1.72, 0.2, 0.24, 0, 0.38, -1.88);
      pane(mbg, GL, 1.36, 0.92, 0.94, 0.52, 1.32);
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.34, 1.6, s * 0.755, 1.1, -0.4);
      mbg.box(GL, 1.3, 0.34, 0.03, 0, 1.1, -1.36);
      for (const s of [-1, 1]) { mbl.box(0xe6efff, 0.3, 0.1, 0.04, s * 0.55, 0.72, 1.94, 0, 0, 0, { mat: "lamp" }); mbl.box(0xff2a2a, 0.24, 0.12, 0.04, s * 0.6, 0.78, -1.94, 0, 0, 0, { mat: "lamp", tail: true }); }
    },
  },
  // pickup truck (dock service trucks, rally service park)
  pickup: {
    len: 5.3, width: 1.95, wheelZ: [1.7, -1.6], track: 0.82, wheelR: 0.4, wheelW: 0.28, rim: 0x6d737b,
    exhausts: [[0.6, 0.34, -2.66]], eye: [0.4, 1.5, 0.4],
    build(mb, col, acc, mbl, mbg) {
      mb.box(DK, 1.7, 0.2, 5.0, 0, 0.42, 0);
      mb.box(col, 1.92, 0.62, 2.2, 0, 0.92, 1.45);
      mb.box(col, 1.8, 0.66, 1.6, 0, 1.55, 0.2);
      mb.box(col, 1.92, 0.5, 2.3, 0, 0.88, -1.4); mb.box(DK2, 1.7, 0.06, 2.1, 0, 1.0, -1.4);
      mb.box(DK, 1.95, 0.24, 0.24, 0, 0.56, 2.58); mb.box(DK2, 1.3, 0.3, 0.05, 0, 1.02, 2.56);
      pane(mbg, GL, 1.64, 1.02, 1.28, 0.62, 1.84);
      for (const s of [-1, 1]) mbg.box(GL, 0.03, 0.42, 1.2, s * 0.905, 1.6, 0.15);
      for (const s of [-1, 1]) { mbl.box(0xe6efff, 0.36, 0.16, 0.04, s * 0.66, 1.0, 2.56, 0, 0, 0, { mat: "lamp" }); mbl.box(0xff2a2a, 0.12, 0.3, 0.04, s * 0.9, 0.95, -2.56, 0, 0, 0, { mat: "lamp", tail: true }); }
    },
  },
};

export const CAR_SHAPES = SHAPES;

/** Build a car. `kit` is the shared material kit (makeKit); `col` the paint, `acc` the trim / livery colour. */
export function buildCar(T: any, kit: any, kind: CarKind, col: number, acc: number, opts: { interior?: boolean; lights?: boolean } = {}): CarModel {
  const S = SHAPES[kind];
  const group = new T.Group(), body = new T.Group();
  group.add(body);
  const mb = new MB(T, 300 + kind.length); mb.ao = { y0: 0.2, h: 0.7, k: 0.25 }; mb.jitter = 0.012;
  const mbl = new MB(T, 301); mbl.jitter = 0; mbl.ao = { y0: -9, h: 1, k: 0 };
  const mbg = new MB(T, 302); mbg.jitter = 0; mbg.ao = { y0: -9, h: 1, k: 0 };
  // the lamps are split by colour family: head (white / amber) and tail (red), so braking can brighten only the tail
  const tailMB = new MB(T, 303); tailMB.jitter = 0; tailMB.ao = { y0: -9, h: 1, k: 0 };
  const lampProxy = {
    box(c: number, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, o: any = {}) {
      (o.tail ? tailMB : mbl).box(c, w, h, d, x, y, z, rx, ry, rz, { ...o, mat: "lamp", jit: 0, noAO: true });
    },
  };
  S.build(mb, col, acc, lampProxy as any, mbg);
  const paintRoot = mb.build({ ...kit, lit: kit.paint }, true);
  body.add(paintRoot);
  const glassMat = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.08, envMapIntensity: 1.4, transparent: true, opacity: 0.86 });
  const glassRoot = mbg.build({ ...kit, lit: glassMat }, false);
  body.add(glassRoot);
  const head = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const tail = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: new T.Color(0.55, 0.55, 0.55) });
  const headRoot = mbl.build({ ...kit, lamp: head }, false), tailRoot = tailMB.build({ ...kit, lamp: tail }, false);
  body.add(headRoot); body.add(tailRoot);

  // wheels: tyre, rim with spokes (so the spin shows), brake disc and caliper
  const wheels: Array<{ root: any; spin: any }> = [];
  const wb = new MB(T, 310); wb.jitter = 0.01; wb.ao = { y0: -9, h: 1, k: 0 };
  const r = S.wheelR, ww = S.wheelW;
  wb.cyl(S.tyre ?? 0x121316, r, r, ww, 0, 0, 0, 12, 0, 0, Math.PI / 2);
  wb.cyl(0x1d1f23, r * 0.92, r * 0.92, ww * 1.04, 0, 0, 0, 12, 0, 0, Math.PI / 2);
  const tyreRoot = wb.build({ ...kit, lit: kit.rubber }, true);
  const rb = new MB(T, 311); rb.jitter = 0; rb.ao = { y0: -9, h: 1, k: 0 };
  rb.cyl(S.rim, r * 0.66, r * 0.66, ww * 1.06, 0, 0, 0, 10, 0, 0, Math.PI / 2, { mat: "metal" });
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; rb.box(S.rim, ww * 1.12, r * 0.12, r * 0.6, 0, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, a, 0, 0, { mat: "metal" }); }
  rb.cyl(0x2a2d33, r * 0.14, r * 0.14, ww * 1.16, 0, 0, 0, 6, 0, 0, Math.PI / 2, { mat: "metal" });
  const rimRoot = rb.build(kit, true);
  const brakeMB = new MB(T, 312); brakeMB.jitter = 0; brakeMB.ao = { y0: -9, h: 1, k: 0 };
  brakeMB.cyl(0x8f949b, r * 0.5, r * 0.5, 0.03, 0, 0, 0, 10, 0, 0, Math.PI / 2, { mat: "metal" });
  brakeMB.box(kind === "skyline" || kind === "mustang" ? 0xc8102e : 0xe0a020, 0.08, r * 0.3, r * 0.34, 0, r * 0.32, -r * 0.12);
  const brakeRoot = brakeMB.build(kit, false);
  const pos: Array<[number, number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const front = i < 2, left = i % 2 === 0, x = (left ? 1 : -1) * (S.width / 2 - ww / 2 - 0.02), z = front ? S.wheelZ[0] : S.wheelZ[1];
    const root = new T.Group(); root.position.set(x, r, z);
    const spin = new T.Group();
    spin.add(tyreRoot.clone(true)); spin.add(rimRoot.clone(true));
    const disc = brakeRoot.clone(true); disc.position.x = left ? -0.06 : 0.06;
    root.add(spin); root.add(disc);
    group.add(root);
    wheels.push({ root, spin });
    pos.push([x, 0, z]);
  }
  // wheel arch shadows (dark boxes inside the body above each wheel)
  const archMB = new MB(T, 313); archMB.jitter = 0; archMB.ao = { y0: -9, h: 1, k: 0 };
  for (const p of pos) archMB.box(0x07080a, ww + 0.12, 0.12, r * 2.3, p[0]!, r * 2 + 0.02, p[2]!);
  body.add(archMB.build(kit, false));

  // headlights cast real light at night (one spot for the pair keeps it cheap)
  let spot: any = null;
  if (opts.lights) {
    spot = new T.SpotLight(0xfff1d8, 40, 70, 0.42, 0.55, 1.4);
    spot.position.set(0, 0.7, S.len / 2 - 0.1); spot.target.position.set(0, 0, S.len / 2 + 20);
    spot.castShadow = false;
    group.add(spot); group.add(spot.target);
  }

  let steeringWheel: any = null;
  if (opts.interior) {
    // seats, dash, roll cage and a steering wheel (rally cockpit view)
    const im = new MB(T, 320); im.jitter = 0.02; im.ao = { y0: 0.3, h: 1, k: 0.3 };
    const [ex, ey, ez] = S.eye;
    im.box(0x202227, 1.4, 0.2, 0.5, 0, ey - 0.28, ez + 0.95);                          // dashboard
    im.box(0x2a2d33, 1.4, 0.06, 0.3, 0, ey - 0.16, ez + 1.1, 0.4, 0, 0);
    for (const s of [-1, 1]) { im.box(0x1d1f23, 0.48, 0.5, 0.1, s * 0.36, ey - 0.35, ez - 0.32); im.box(0x1d1f23, 0.48, 0.1, 0.5, s * 0.36, ey - 0.62, ez - 0.05); im.box(0xc8102e, 0.08, 0.5, 0.02, s * 0.36, ey - 0.3, ez - 0.26, 0, 0, 0, { jit: 0 }); }
    // roll cage: hoops and diagonal
    const cage = 0xd8dce2;
    for (const z of [ez + 0.72, ez - 0.45]) { for (const s of [-1, 1]) im.beam(cage, 0.045, s * 0.66, 0.5, z, s * 0.62, ey + 0.2, z - (z > ez ? 0.18 : 0)); im.beam(cage, 0.045, -0.62, ey + 0.2, z - (z > ez ? 0.18 : 0), 0.62, ey + 0.2, z - (z > ez ? 0.18 : 0)); }
    for (const s of [-1, 1]) im.beam(cage, 0.045, s * 0.62, ey + 0.2, ez + 0.54, s * 0.62, ey + 0.2, ez - 0.45);
    im.beam(cage, 0.04, -0.62, ey + 0.2, ez - 0.45, 0.62, 0.55, ez - 0.45);
    // centre console with the gear lever and the handbrake
    im.box(0x202227, 0.24, 0.3, 0.7, 0, ey - 0.55, ez + 0.4); im.box(0x9aa0a8, 0.03, 0.3, 0.03, 0, ey - 0.3, ez + 0.4, 0.3, 0, 0, { mat: "metal" }); im.box(0xc8102e, 0.04, 0.4, 0.04, -0.1, ey - 0.28, ez + 0.1, -0.5, 0, 0);
    // co-driver's notes on the passenger side
    im.box(0xf2f2f4, 0.22, 0.02, 0.3, -ex, ey - 0.42, ez + 0.3, 0.6, 0, 0);
    body.add(im.build({ ...kit, lit: kit.cf }, false));
    // instruments: two dials and a shift light bar
    const dm = new MB(T, 321); dm.jitter = 0; dm.ao = { y0: -9, h: 1, k: 0 };
    for (const k of [-0.09, 0.09]) dm.cyl(0x0a0b0d, 0.07, 0.07, 0.02, ex + k, ey - 0.15, ez + 0.75, 12, Math.PI / 2 - 0.5, 0, 0);
    body.add(dm.build(kit, false));
    steeringWheel = new T.Group();
    const sw = new MB(T, 322); sw.jitter = 0; sw.ao = { y0: -9, h: 1, k: 0 };
    sw.torus(0x16181c, 0.18, 0.024, 0, 0, 0, 0, 0, 0, 6, 16);
    sw.box(0x2a2d33, 0.3, 0.03, 0.03, 0, 0, 0); sw.box(0x2a2d33, 0.03, 0.14, 0.03, 0, -0.08, 0);
    sw.box(0xc8102e, 0.03, 0.04, 0.03, 0, 0.18, 0, 0, 0, 0, { jit: 0 });
    steeringWheel.add(sw.build({ ...kit, lit: kit.rubber }, false));
    steeringWheel.position.set(ex, ey - 0.12, ez + 0.5); steeringWheel.rotation.x = -0.35;
    // the rotation order makes the tilt apply first, then the turn around the column
    steeringWheel.rotation.order = "XYZ";
    body.add(steeringWheel);
  }

  const exhausts = S.exhausts.map((e) => new T.Vector3(e[0], e[1], e[2]));
  for (const e of exhausts) { const ex = new MB(T, 330); ex.jitter = 0; ex.ao = { y0: -9, h: 1, k: 0 }; ex.cyl(0x6d7178, 0.045, 0.05, 0.16, e.x, e.y, e.z, 8, Math.PI / 2, 0, 0, { mat: "metal" }); body.add(ex.build(kit, false)); }

  return {
    kind, group, body, wheels, tail, head, exhausts, wheelPos: pos, steeringWheel, eye: S.eye,
    update(v: Vehicle, dt: number, braking: boolean) {
      group.position.set(v.x, v.y, v.z);
      group.rotation.set(v.slopeX, v.h, v.slopeZ, "YXZ");
      body.rotation.set(v.pitch, 0, v.roll);
      body.position.y = v.heave;
      for (let i = 0; i < 4; i++) {
        const w = wheels[i]!;
        w.spin.rotation.x = v.wheelSpin[i]!;
        w.root.rotation.y = i < 2 ? -v.steer : 0;
        // suspension: wheels drop a little when the body rises, and stretch out in the air
        w.root.position.y = r + (v.airborne ? -0.08 : Math.max(-0.05, Math.min(0.05, -(v.heave * 0.5))));
      }
      if (steeringWheel) steeringWheel.rotation.z = v.steer * 3.2;   // seen from the seat (looking along +z) positive is clockwise
      const k = braking ? 2.6 : 0.55; tail.color.setRGB(k, k, k);
      if (spot) spot.intensity = 40;
    },
    dispose() {
      group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
      glassMat.dispose(); head.dispose(); tail.dispose();
    },
  };
}
