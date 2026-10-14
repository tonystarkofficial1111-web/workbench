import { TrackPath, type MapPt } from "./path";
import { f1EnvFor, f1HeightFn } from "./env";
import { LANE_W, ROAD_HALF, KERB_W, WALL_D, CAR_HALF, GEAR_MAX, PROGRESS } from "./consts";

/**
 * The F1 Cockpit's driving rules. The game's own loop (the generated legacy029.ts) keeps the race, the HUD and the telemetry; this module owns
 * what happens on the road: a real position across the track, grip, sliding wide in fast bends, the kerbs, the gravel, the barrier, the manual
 * gearbox with its rev limiter, and the suspension (roll, dive, squat, bumps) that the cockpit shows.
 */
export interface Hit {
  /** +1 right barrier, -1 left barrier */
  side: 1 | -1;
  /** mph */
  speed: number;
  /** estimated impact in g */
  g: number;
  /** angle between the car and the barrier, degrees */
  angle: number;
  lat: number;
  vy: number;
  slide: number;
  u: number;
  gear: number;
  rpm: number;
  throttle: number;
  brake: number;
  steer: number;
  /** metres per second along the road in the game's world */
  ms: number;
}

export interface PhysicsIn { ac: boolean; br: boolean; pit: boolean; lf: boolean; rt: boolean; grip: number; wear: number; dk: number; now: number }
export interface PhysicsOut { rpm: number; steerTarget: number; hit: Hit | null }

export interface TurnLike { at: number; dir: string }
export interface TurnStateLike { index: number; active: boolean; completed: boolean; flashOn: boolean; successUntil: number; missedUntil?: number; t0?: number; w0?: number }

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** The figure-eight starts at the point where it crosses itself: start the lap on a straight instead (same circuit, a quarter lap later). */
export function f1FixPoints(id: string, p: MapPt[]): MapPt[] {
  if (id === "technical" && p.length >= 8) { const k = Math.floor(p.length / 4); return p.slice(k).concat(p.slice(0, k)); }
  return p;
}

const paths = new Map<string, TrackPath>();
export function f1PathFor(id: string, pts: MapPt[]): TrackPath {
  const key = id + ":" + pts.length + ":" + pts.map((q, i) => (i % 7 === 1 ? q.x.toFixed(2) + "," + q.y.toFixed(2) : "")).join("");
  let pa = paths.get(key);
  if (!pa) { pa = new TrackPath(pts, f1HeightFn(f1EnvFor(id))); paths.clear(); paths.set(key, pa); }
  return pa;
}

export class F1Sim {
  readonly path: TrackPath;
  readonly mapId: string;
  /** distance from the centre line, metres (+ = right of the road) */
  lat = 0;
  /** sideways speed, m/s */
  vy = 0;
  /** how far the car points away from the road direction, radians (+ = pointing right) */
  slide = 0;
  roll = 0; rollV = 0;
  pitch = 0; pitchV = 0;
  heave = 0; heaveV = 0;
  /** spring compression of FL, FR, RL, RR in metres (+ = pushed up into the car) */
  wheel = [0, 0, 0, 0];
  gLat = 0; gLong = 0;
  /** frames left of the engine's torque cut while a gear is changing */
  shiftCut = 0;
  /** 0 on the road, 1 on the kerb, 2 on the gravel / grass */
  zone = 0;
  rumble = 0;
  hit: Hit | null = null;
  stats = this.freshStats();
  private lastZone = 0;
  private lastSpeed = 0;
  private seed = 1;

  constructor(mapId: string, pts: MapPt[]) {
    this.mapId = mapId;
    this.path = f1PathFor(mapId, pts);
  }

  private freshStats() {
    return { topSpeed: 0, shifts: 0, kerbHits: 0, offRoad: 0, maxGLat: 0, maxGBrake: 0, cleared: 0, missed: 0, warnings: 0 };
  }

  reset() {
    this.lat = 0; this.vy = 0; this.slide = 0;
    this.roll = this.rollV = this.pitch = this.pitchV = this.heave = this.heaveV = 0;
    this.wheel = [0, 0, 0, 0]; this.gLat = this.gLong = 0; this.shiftCut = 0; this.zone = 0; this.rumble = 0; this.hit = null;
    this.stats = this.freshStats(); this.lastZone = 0; this.lastSpeed = 0;
  }

  onShift() { this.shiftCut = 7; this.stats.shifts++; }

  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647 - 0.5; }

  /** Metres per second along the road for a speed in mph (the game's own scale: a lap is `path.total` metres). */
  worldSpeed(mph: number) { return mph * PROGRESS * 60 * this.path.total; }

  /** One frame of driving: gearbox and speed, where the car is across the road, suspension, and whether it touched the barrier. */
  physics(p: any, i: PhysicsIn): PhysicsOut {
    const dk = i.dk, dt = Math.min(0.1, dk / 60);
    const gm = GEAR_MAX[p.gear - 1]!;
    // ---- manual gearbox: the engine stops pulling at the top of each gear and stays on the limiter until you press Y
    if (this.shiftCut > 0) this.shiftCut -= dk;
    const cut = this.shiftCut > 0;
    const prevSpeed = p.speed;
    if (i.pit) p.speed = 0;
    else {
      if (i.ac && !cut) {
        const acc = (0.62 - 0.045 * p.gear) * i.grip * (this.zone === 2 ? 0.55 : 1);
        if (p.speed < gm) p.speed = Math.min(gm, p.speed + acc * dk);
      } else if (i.br) p.speed -= 1.0 * (1 - 0.25 * i.wear) * dk;
      else p.speed -= (cut ? 0.2 : 0.15) * dk;
      // engine braking: after a downshift the car is above the gear's top speed and the engine pulls it back
      if (p.speed > gm + 0.3) p.speed = Math.max(gm, p.speed - (0.8 + (p.speed - gm) * 0.04) * dk);
      if (this.zone === 2) p.speed -= (0.04 + 0.006 * p.speed) * dk;   // gravel and grass slow you down (but a crawl out is always possible)
      else if (this.zone === 1) p.speed -= 0.06 * dk;
      p.speed = Math.max(0, p.speed);
    }
    let rpm = 0.2 + 0.8 * (p.speed / gm);
    if (i.ac && !cut && p.speed >= gm - 0.4) rpm = 1;     // on the limiter
    rpm = clamp(rpm, 0.2, 1);
    p.rpm = rpm;
    p.wingActive = p.speed > 15 && (i.br || !i.ac);
    if (p.speed > this.stats.topSpeed) this.stats.topSpeed = p.speed;

    // ---- steering and where the car is across the road
    const steerTarget = (i.lf ? -1 : 0) + (i.rt ? 1 : 0);
    p.steer += (steerTarget - p.steer) * (1 - Math.pow(0.85, dk));
    const s = this.path.at(p.lapDist || 0);
    const kap = s.kap, vW = this.worldSpeed(p.speed), a = Math.abs(this.lat);
    const zone = a < ROAD_HALF - 0.6 ? 0 : a < ROAD_HALF + KERB_W - 0.2 ? 1 : 2;
    if (zone >= 1 && this.lastZone === 0) this.stats.kerbHits++;
    if (zone === 2) this.stats.offRoad += dt;
    this.zone = zone; this.lastZone = zone;
    // grip: what the tyres can hold; the bend asks kappa * v^2. Beyond the limit the car slides to the outside of the bend
    const G = 120 * i.grip * (zone === 2 ? 0.55 : 1);
    const D = Math.abs(kap) * vW * vW;
    // beyond the grip limit the car is pushed to the outside of the bend, harder the more it is over the limit
    const aOut = -Math.sign(kap) * Math.min(120, Math.max(0, D - G) * 0.6);
    const sf = clamp(p.speed / 35, 0.15, 1);
    const targetV = steerTarget * 4.6 * sf * (zone === 2 ? 0.7 : 1);
    const ay = (targetV - this.vy) / 0.28 + aOut;
    this.vy += ay * dt;
    this.lat += this.vy * dt;
    // where the nose points: along the sideways drift, plus (when the tyres give up in a bend) turned in towards the bend
    const slideT = clamp(Math.atan2(this.vy, Math.max(10, vW)) * 2.4 + Math.sign(kap) * Math.max(0, D - G) * 0.0016, -0.6, 0.6);
    this.slide += (slideT - this.slide) * (1 - Math.exp(-dt / 0.12));
    p.lat = this.lat; p.lane = this.lat / LANE_W;

    // ---- suspension: body roll in the bends, dive under braking, squat under power, bumps on the kerbs and the gravel
    const aLatBend = Math.sign(kap) * Math.min(D, G);       // sideways pull towards the outside, m/s^2 (outside is left in a right bend)
    const aLat = aLatBend + ay * 0.6;
    const aLong = ((p.speed - prevSpeed) * 0.44704 * 60) / dk;
    this.gLat = aLat / 9.81; this.gLong = aLong / 9.81;
    this.stats.maxGLat = Math.max(this.stats.maxGLat, Math.abs(this.gLat));
    this.stats.maxGBrake = Math.max(this.stats.maxGBrake, -this.gLong);
    const bump = zone === 2 ? 0.045 : zone === 1 ? 0.022 : p.speed > 5 ? 0.0035 : 0;
    this.rumble += ((zone === 2 ? 1 : zone === 1 ? 0.55 : p.speed > 5 ? 0.06 : 0) - this.rumble) * 0.2;
    const rollT = clamp(aLat * 0.0009, -0.085, 0.085);
    const pitchT = clamp(aLong * 0.0016, -0.06, 0.04);
    const heaveT = -Math.min(0.03, (D / Math.max(40, G)) * 0.02) + this.rnd() * bump;
    const w = 15, z = 0.5, n = 2, h = dt / n;
    for (let k = 0; k < n; k++) {
      this.rollV += (-w * w * (this.roll - rollT) - 2 * z * w * this.rollV) * h; this.roll += this.rollV * h;
      this.pitchV += (-w * w * (this.pitch - pitchT) - 2 * z * w * this.pitchV) * h; this.pitch += this.pitchV * h;
      this.heaveV += (-w * w * 1.4 * (this.heave - heaveT) - 2 * 0.4 * w * this.heaveV) * h; this.heave += this.heaveV * h;
    }
    const f = -this.pitch * 1.45, r = this.pitch * 1.45;
    const nz = () => this.rnd() * bump * 1.4;
    this.wheel = [
      this.roll * 0.95 + f - this.heave + nz(), -this.roll * 0.95 + f - this.heave + nz(),
      this.roll * 1.0 + r - this.heave + nz(), -this.roll * 1.0 + r - this.heave + nz(),
    ];
    this.lastSpeed = p.speed;
    p.slide = this.slide; p.roll = this.roll; p.pitch = this.pitch; p.heave = this.heave; p.wheel = this.wheel; p.rumble = this.rumble;
    p.zone = zone; p.gLat = this.gLat; p.gLong = this.gLong; p.vy = this.vy;

    // ---- the barrier: touching it ends the race
    let hit: Hit | null = null;
    if (a + CAR_HALF >= WALL_D - 0.1 && !this.hit) {
      const side: 1 | -1 = this.lat >= 0 ? 1 : -1;
      const ms = this.worldSpeed(p.speed), real = p.speed * 0.44704;
      hit = {
        side, speed: p.speed, g: clamp(real / (0.12 * 9.81), 1, 80), lat: this.lat, vy: this.vy, slide: this.slide, u: p.lapDist || 0,
        angle: Math.abs(((Math.atan2(Math.abs(this.vy), Math.max(5, ms)) + Math.abs(this.slide) * 0.5) * 180) / Math.PI),
        gear: p.gear, rpm, throttle: p.throttle || 0, brake: p.brake || 0, steer: p.steer, ms,
      };
      this.hit = hit;
    }
    return { rpm, steerTarget, hit };
  }

  /**
   * The corner warning. It is only a warning now: the countdown shows how long until the bend, steering the right way near the bend clears it,
   * and missing it costs nothing by itself (the bend will push a car that is too fast out towards the barrier).
   */
  corner(p: any, turn: TurnLike | null, ts: TurnStateLike, now: number, steerTarget: number, warnSeconds: (v: number) => number): "cleared" | "missed" | null {
    if (!turn) return null;
    const pps = Math.max(1e-6, p.speed * PROGRESS * 60);
    const start = Math.max(0, turn.at - pps * warnSeconds(p.speed));
    const was = ts.active;
    ts.active = p.lapDist >= start && p.lapDist < turn.at + 0.012;
    if (ts.active && !was) { ts.t0 = now; ts.w0 = warnSeconds(p.speed); this.stats.warnings++; }
    let ev: "cleared" | "missed" | null = null;
    if (ts.active && !ts.completed && p.lapDist >= turn.at - 0.02) {
      if ((turn.dir === "left" && steerTarget < 0) || (turn.dir === "right" && steerTarget > 0)) { ts.completed = true; ts.successUntil = now + 900; ev = "cleared"; this.stats.cleared++; }
    }
    if (p.lapDist >= turn.at + 0.012) {
      if (!ts.completed) { ev = "missed"; ts.missedUntil = now + 2200; this.stats.missed++; }
      ts.index++; ts.active = false; ts.completed = false; ts.flashOn = false;
    }
    return ev;
  }

  /** Seconds until the corner point at the current speed (for the countdown), or null when there is no warning on screen. */
  secondsToTurn(p: any, turn: TurnLike | null, ts: TurnStateLike): number | null {
    if (!turn || !ts.active) return null;
    const pps = Math.max(1e-6, p.speed * PROGRESS * 60);
    return Math.max(0, (turn.at - p.lapDist) / pps);
  }
}

export function createF1Sim(mapId: string, pts: MapPt[]) { return new F1Sim(mapId, pts); }
