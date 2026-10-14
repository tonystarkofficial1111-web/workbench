// The F1 Cockpit's 3D live feed (added in 5.60.0). The game itself stays in the generated legacy029 module; this folder only draws.
export { createF1View } from "./view";
export { F1_LEVEL_NAMES, f1FeaturesFor, loadF1Level, saveF1Level, nextF1Level } from "./gfx";
export type { F1Level, F1Features } from "./gfx";
