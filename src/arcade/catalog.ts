import catalogJson from "../data/catalog.json";
import covers from "../data/covers.json";

export type Cat = "patience" | "fast" | "skill";
export interface CatalogItem {
  id: string; // cabinet slot id (also what favorites/recents store)
  key: string;
  name: string;
  cat: Cat;
  sub: string;
  desc: string;
  soon: boolean;
}

/** The 58 tiles the Arcade library shows: 31 playable + 27 "coming soon" (the original flags those cabinets as soon). */
export const CATALOG = catalogJson as CatalogItem[];
export const BY_ID: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((i) => [i.id, i]));
export const coverFor = (name: string): string => (covers as Record<string, string>)[name.toLowerCase()] || "";

export const CATS: Record<Cat, { label: string; color: string; blurb: string }> = {
  patience: { label: "Patience", color: "#a770ff", blurb: "Relaxed puzzles and growing games" },
  fast: { label: "Fast", color: "#ffb020", blurb: "Reflexes, dodging, and quick timing" },
  skill: { label: "Skill", color: "#1fb6ff", blurb: "Action, racing, shooting, and strategy" },
};

/**
 * Pool the Daily Challenge draws from, in the original registry order (duplicates are intentional:
 * the original registry listed the three prototype games twice, which weights them double).
 */
export const DAILY_POOL: string[] = [
  "neonBreaker", "starfallDefender", "circuitSnake", "neonPong", "meteorCommand", "stackSurge", "crystalGarden", "memoryMatch",
  "colorMixer", "fishingHole", "dotConnect", "slidingPuzzle", "patternMemory", "towerBuilder", "bubbleSort", "idleFarm",
  "laserDodge", "ninjaDash", "orbCatcher", "bladeSlice", "gravityFlip", "bulletStorm", "platformJumper", "pixelRunner",
  "chainReactor", "rocketDash", "protoReaction", "protoTapRush", "protoAimTrainer", "protoReaction", "protoTapRush", "pixelDuel",
  "protoAimTrainer",
];

/** Display names + slot ids for pool entries (some live in hidden/"soon" slots). */
export const POOL_INFO: Record<string, { name: string; slot: string }> = {
  neonBreaker: { name: "Neon Breaker", slot: "bb-slot-3" }, starfallDefender: { name: "Starfall Defender", slot: "sf-slot-4" },
  circuitSnake: { name: "Circuit Snake", slot: "sn-slot-5" }, neonPong: { name: "Neon Pong", slot: "pg-slot-6" },
  meteorCommand: { name: "Meteor Command", slot: "mc-slot-7" }, stackSurge: { name: "Stack Surge", slot: "ss-slot-8" },
  crystalGarden: { name: "Crystal Garden", slot: "cg-slot-10" }, memoryMatch: { name: "Memory Match", slot: "mm-slot-11" },
  colorMixer: { name: "Color Mixer", slot: "cm-slot-12" }, fishingHole: { name: "Fishing Hole", slot: "fh-slot-13" },
  dotConnect: { name: "Dot Connect", slot: "dc-slot-14" }, slidingPuzzle: { name: "Slide Puzzle", slot: "sp-slot-15" },
  patternMemory: { name: "Pattern Memory", slot: "pm-slot-16" }, towerBuilder: { name: "Tower Builder", slot: "tb-slot-17" },
  bubbleSort: { name: "Bubble Sort", slot: "bs-slot-18" }, idleFarm: { name: "Idle Farm", slot: "if-slot-19" },
  laserDodge: { name: "Laser Dodge", slot: "ld-slot-20" }, ninjaDash: { name: "Ninja Dash", slot: "nd-slot-21" },
  orbCatcher: { name: "Orb Catcher", slot: "oc-slot-22" }, bladeSlice: { name: "Blade Slice", slot: "bs2-slot-23" },
  gravityFlip: { name: "Gravity Flip", slot: "gf-slot-24" }, bulletStorm: { name: "Bullet Storm", slot: "bt-slot-25" },
  platformJumper: { name: "Platform Jumper", slot: "pj-slot-26" }, pixelRunner: { name: "Pixel Runner", slot: "pr-slot-27" },
  chainReactor: { name: "Chain Reactor", slot: "cr-slot-28" }, rocketDash: { name: "Rocket Dash", slot: "rd-slot-29" },
  protoReaction: { name: "REACTION TEST", slot: "plp-30-slot" }, protoTapRush: { name: "TAP RUSH", slot: "plf-40-slot" },
  protoAimTrainer: { name: "AIM TRAINER", slot: "pls-50-slot" }, pixelDuel: { name: "PIXEL DUEL", slot: "plf-49-slot" },
};
