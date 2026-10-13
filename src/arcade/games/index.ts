import { launch as rooftopRumble } from "./rooftopRumble";
import { launch as circuitRacer } from "./circuitRacer";
import { launch as neonBreaker } from "./neonBreaker";
import { launch as starfallDefender } from "./starfallDefender";
import { launch as circuitSnake } from "./circuitSnake";
import { launch as neonPong } from "./neonPong";
import { launch as meteorCommand } from "./meteorCommand";
import { launch as stackSurge } from "./stackSurge";
import { launch as botDefense } from "./botDefense";
import { launch as crystalGarden } from "./crystalGarden";
import { launch as memoryMatch } from "./memoryMatch";
import { launch as colorMixer } from "./colorMixer";
import { launch as fishingHole } from "./fishingHole";
import { launch as dotConnect } from "./dotConnect";
import { launch as slidingPuzzle } from "./slidingPuzzle";
import { launch as patternMemory } from "./patternMemory";
import { launch as towerBuilder } from "./towerBuilder";
import { launch as bubbleSort } from "./bubbleSort";
import { launch as idleFarm } from "./idleFarm";
import { launch as laserDodge } from "./laserDodge";
import { launch as ninjaDash } from "./ninjaDash";
import { launch as orbCatcher } from "./orbCatcher";
import { launch as bladeSlice } from "./bladeSlice";
import { launch as gravityFlip } from "./gravityFlip";
import { launch as bulletStorm } from "./bulletStorm";
import { launch as platformJumper } from "./platformJumper";
import { launch as pixelRunner } from "./pixelRunner";
import { launch as chainReactor } from "./chainReactor";
import { launch as rocketDash } from "./rocketDash";

/** Engine launchers keyed by game key. */
export const ENGINES: Record<string, () => void> = {
  rooftopRumble,
  circuitRacer,
  neonBreaker,
  starfallDefender,
  circuitSnake,
  neonPong,
  meteorCommand,
  stackSurge,
  botDefense,
  crystalGarden,
  memoryMatch,
  colorMixer,
  fishingHole,
  dotConnect,
  slidingPuzzle,
  patternMemory,
  towerBuilder,
  bubbleSort,
  idleFarm,
  laserDodge,
  ninjaDash,
  orbCatcher,
  bladeSlice,
  gravityFlip,
  bulletStorm,
  platformJumper,
  pixelRunner,
  chainReactor,
  rocketDash,
};
