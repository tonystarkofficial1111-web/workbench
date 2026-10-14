import type * as THREE_NS from "three";
import type { Gfx } from "./gfx";
import type { Air } from "./air";
import type { MatKit } from "./mats";

export type T3 = typeof THREE_NS;

/**
 * Engine internals handed over by the generated engine (see tools/convert-world.ts, ENV_* lists).
 * Function bindings can be wrapped by assigning to them; read-only names are live getters.
 */
export type Env = Record<string, any>;

/** Shared state for one Infinite-world extension instance. */
export interface Ctx {
  env: Env;
  T: T3;
  gfx: Gfx;
  air: Air;
  mats: MatKit;
  /** Model roots whose detail tiers follow the Graphics level. */
  tiered: any[];
  /** The Infinite world is running (or is being started right now). */
  isInf(): boolean;
  /** Animation clock in real seconds (advances while the Infinite world is drawn). */
  rtime: number;
  /** Seconds since the previous frame (clamped). */
  dt: number;
  /** Per-run pieces; all null outside the Infinite world. */
  island: import("./terrain").Island | null;
  trees: import("./trees").TreeField | null;
  foliage: import("./foliage").Foliage | null;
  fx: import("./fx").Fx | null;
  /** Called once per drawn frame while the Infinite world runs. */
  frame: Array<(dt: number) => void>;
  /** Called when the Infinite world stops (restart / exit): free what the run created. */
  cleanup: Array<() => void>;
  /** Called after the new island, castle and king exist. */
  started: Array<() => void>;
  /** Called when the Graphics level changes. */
  gfxChanged: Array<() => void>;
  /** Anything else a module wants to share. */
  x: Record<string, any>;
}
