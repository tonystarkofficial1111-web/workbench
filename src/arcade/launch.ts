import { ENGINES } from "./games";
import { wbLaunchProto } from "./protos";
import { launchPixelDuel } from "./pixelDuel";
import { CAR_LAUNCHERS } from "./legacy029";
import { openEngine } from "../core/overlay";
import { WB_SOUND } from "../core/sound";
import { addCoins } from "../core/profile";

const PROTOS = new Set(["protoReaction", "protoTapRush", "protoAimTrainer"]);
const sessionCoins: Record<string, boolean> = {};

/** True when a game key has a working launcher in this build. */
export const isLaunchable = (key: string) =>
  !!ENGINES[key] || PROTOS.has(key) || key === "pixelDuel" || !!(CAR_LAUNCHERS as Record<string, unknown>)[key];

/**
 * Launch a game by key. Matches the original cabinet click behavior:
 * the 29 original cabinets give 1 coin on first launch each session; prototype/car cabinets play a launch sound instead.
 */
export function launchGame(key: string) {
  if (ENGINES[key]) {
    if (!sessionCoins[key]) { sessionCoins[key] = true; addCoins(1); }
    openEngine(ENGINES[key]!);
    return;
  }
  WB_SOUND.launch();
  if (PROTOS.has(key)) { wbLaunchProto(key); return; }
  if (key === "pixelDuel") { launchPixelDuel(); return; }
  const car = (CAR_LAUNCHERS as Record<string, () => void>)[key];
  if (car) car();
}

export const launchCarHub = () => (CAR_LAUNCHERS as Record<string, () => void>).carHub!();
