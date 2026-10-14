// Numbers shared by the F1 game rules (sim.ts), the circuit builder (world.ts) and the cockpit view (view.ts).

/** Half the width of the tarmac, metres. */
export const ROAD_HALF = 6.6;
/** Width of the red / white kerb strip at the road's edge in the bends. */
export const KERB_W = 1.5;
/** Edge of the mown / gravel run-off strip. */
export const SHOULDER = 13.0;
/** Distance from the centre line to the face of the barrier. */
export const WALL_D = 14.6;
/** Half the width of the car (the wheels), metres. A car whose side reaches the barrier is out. */
export const CAR_HALF = 0.95;
/** The game's steering "lane" unit in metres (the old 2D feed and the rivals still use lanes). */
export const LANE_W = 4.6;
/** Top speed (mph) of each of the eight gears. */
export const GEAR_MAX = [12, 24, 36, 50, 64, 80, 97, 115];
/** Lap fraction covered per mph per 60th of a second (F1_PROGRESS_PER_MPH_FRAME in the game). */
export const PROGRESS = 0.000025;
