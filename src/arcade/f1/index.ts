// The F1 Cockpit's 3D live feed (5.60.0), its driving rules, HUD and crash scenes (5.61.0). The game itself stays in the generated legacy029 module.
export { createF1View } from "./view";
export { createF1Sim, f1FixPoints } from "./sim";
export { GEAR_MAX as F1_GEAR_MAX } from "./consts";
export { drawF1Hud, drawF1CrashFallback } from "./hud";
export { showF1Report, hideF1Report } from "./report";
export { F1_LEVEL_NAMES, f1FeaturesFor, loadF1Level, saveF1Level, nextF1Level } from "./gfx";
export type { F1Level, F1Features } from "./gfx";
