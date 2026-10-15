/**
 * Car physics for the 3D car games: a two-axle ("bicycle") model with real slip angles, a tyre curve that peaks and then falls off (so a car
 * can slide and be held in a drift), weight transfer, a traction circle on the driven wheels (too much throttle breaks the rear loose), a
 * handbrake, an automatic gearbox with revs for the sound, and a simple vertical motion with springs, crests and jumps for the rally stages.
 *
 * Frame: the car faces +z when heading h = 0 and its model's rotation.y is h. Forward f = (sin h, cos h); the car's right is r = (-cos h, sin h).
 * Turning right makes h smaller. Speeds are m/s, forces N, angles radians.
 */
export interface CarSpec {
  name: string;
  mass: number;
  /** axle distances from the centre of mass, front (a) and rear (b) */
  a: number; b: number;
  /** half the track width (for the wheel positions and the body roll) */
  halfTrack: number;
  cgH: number;
  /** engine power, W, and the most force the drive can give at low speed, N */
  power: number; maxForce: number;
  /** share of the drive going to the front wheels (0 = rear-wheel drive) */
  front: number;
  /** cornering stiffness factor (B in the tyre curve) and grip factor */
  tyreB: number; grip: number;
  /** grip balance: < 1 makes the rear let go sooner */
  rearGrip: number;
  steerMax: number;
  brake: number;
  /** top speed of each gear, m/s */
  gears: number[];
  idle: number; redline: number;
  /** moment of inertia scale (1 = a box of this mass and wheelbase) */
  inertia: number;
  /** suspension: natural frequency (Hz) and how much the body leans */
  spring: number; lean: number;
  /** wheel radius, m */
  wheelR: number;
  /** where the four wheels are in the model (x right in model space is -x in the car frame; see the models) */
  wheelZ: [number, number];
  /** drift / spin assist, 0 (none) .. 1 (forgiving) */
  assist: number;
}

export interface Surface { mu: number; drag: number; rough: number; kind: string }
export interface Ground { h: number; s: Surface }
export type GroundFn = (x: number, z: number) => Ground;

export interface Input { throttle: number; brake: number; steer: number; handbrake: boolean }

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const G = 9.81;
/** tyre force share for a slip angle: rises, peaks near 12 degrees, then settles at about 80% (a sliding tyre still grips) */
const curve = (alpha: number, B: number) => Math.sin(1.4 * Math.atan(B * alpha));

export class Vehicle {
  spec: CarSpec;
  x = 0; z = 0; y = 0; h = 0;
  /** forward and rightward speed in the car's frame, yaw rate (positive = turning right), vertical speed */
  u = 0; w = 0; om = 0; vy = 0;
  /** the ground's smoothed climb rate under the car (m/s) */
  vyS = 0;
  steer = 0;
  gear = 1; rpm = 800; shiftT = 0;
  airborne = false; airT = 0;
  /** what the driver feels and the models show */
  roll = 0; rollV = 0; pitch = 0; pitchV = 0; heave = 0; heaveV = 0;
  /** ground slope under the car (radians), for the body on hills */
  slopeX = 0; slopeZ = 0;
  wheelSpin = [0, 0, 0, 0];
  /** 0..1 how hard each tyre is sliding (FL, FR, RL, RR): smoke and skid marks */
  slide = [0, 0, 0, 0];
  /** rear wheelspin 0..1 */
  spin = 0;
  slipAngle = 0;
  ax = 0; ay = 0;
  surface: Surface = { mu: 1, drag: 0, rough: 0, kind: "tarmac" };
  /** set when the car lands: vertical speed at touchdown (m/s) */
  landed = 0;
  private seed = 7;

  constructor(spec: CarSpec) { this.spec = spec; }

  get speed() { return Math.hypot(this.u, this.w); }
  get vx() { return Math.sin(this.h) * this.u - Math.cos(this.h) * this.w; }
  get vz() { return Math.cos(this.h) * this.u + Math.sin(this.h) * this.w; }
  /** the car's travel direction against where it points, degrees (0 when gripping) */
  get driftDeg() { return this.speed < 1.5 ? 0 : Math.abs(Math.atan2(this.w, Math.abs(this.u))) * 180 / Math.PI; }

  place(x: number, z: number, h: number, y = 0) {
    this.x = x; this.z = z; this.h = h; this.y = y; this.u = this.w = this.om = this.vy = this.vyS = 0; this.steer = 0; this.gear = 1; this.rpm = this.spec.idle;
    this.roll = this.rollV = this.pitch = this.pitchV = this.heave = this.heaveV = 0; this.airborne = false; this.slide = [0, 0, 0, 0]; this.spin = 0;
  }

  /** Set the world velocity (after a wall hit, say). */
  setWorldVel(vx: number, vz: number) {
    const fx = Math.sin(this.h), fz = Math.cos(this.h), rx = -Math.cos(this.h), rz = Math.sin(this.h);
    this.u = vx * fx + vz * fz; this.w = vx * rx + vz * rz;
  }

  /**
   * Bounce off a wall whose normal (pointing back into the course) is (nx, nz). `rest` keeps that share of the speed into the wall,
   * `fric` keeps that share of the speed along it. Returns the speed the car hit the wall with (m/s).
   */
  bounce(nx: number, nz: number, rest = 0.3, fric = 0.7) {
    const vx = this.vx, vz = this.vz, vn = vx * nx + vz * nz;
    if (vn >= 0) return 0;
    const tx = vx - vn * nx, tz = vz - vn * nz;
    this.setWorldVel(tx * fric - vn * rest * nx, tz * fric - vn * rest * nz);
    this.om *= 0.5;
    return -vn;
  }

  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647 - 0.5; }

  step(dt: number, inp: Input, ground: GroundFn) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let k = 0; k < n; k++) this.sub(h, inp, ground);
  }

  private sub(dt: number, inp: Input, ground: GroundFn) {
    const S = this.spec, m = S.mass, L = S.a + S.b, I = m * (L * L) * 0.28 * S.inertia;
    const gr = ground(this.x, this.z), surf = gr.s;
    this.surface = surf;
    // ---- steering: quicker at low speed, gentler at high speed
    const sp = this.speed;
    // keyboard steering is all-or-nothing, so the wheel is turned smoothly: slower (and less far) the faster the car goes, quicker back to centre
    const lim = S.steerMax * (1 - 0.62 * clamp(sp / 40, 0, 1));
    const want = clamp(inp.steer, -1, 1) * lim;
    const back = Math.abs(want) < Math.abs(this.steer) || Math.sign(want) !== Math.sign(this.steer);
    const rate = (back ? 4.2 : 1.9 + 1.6 * (1 - clamp(sp / 30, 0, 1))) * S.steerMax;
    this.steer += clamp(want - this.steer, -rate * dt, rate * dt);

    // ---- vertical: follow the ground, fly off crests, land with a thump.
    // The ground's climb rate is smoothed (a single bumpy sample must not launch the car), and the car only takes off when the ground drops
    // clearly below where a falling car would be: that is a real crest, not noise.
    const groundY = gr.h;
    if (this.airborne) {
      this.vy -= G * dt; this.y += this.vy * dt; this.airT += dt;
      if (this.y <= groundY + 0.01 || this.airT > 3.5) { this.landed = Math.max(0, -this.vy); this.y = groundY; this.airborne = false; this.vy = 0; this.vyS = 0; this.heaveV -= this.landed * 0.5; this.pitchV += this.landed * 0.12; }
    } else {
      const vyG = clamp((groundY - this.y) / dt, -40, 40);
      this.vyS += (vyG - this.vyS) * (1 - Math.exp(-dt / 0.04));
      const ballistic = this.y + this.vy * dt - 0.5 * G * dt * dt;
      if (sp > 9 && this.vy > -2 && groundY < ballistic - 0.012) { this.airborne = true; this.airT = 0; this.vy -= G * dt; this.y = ballistic; }
      else { this.vy = clamp(this.vyS, -20, 20); this.y = groundY; }
    }
    const onGround = !this.airborne;

    // ---- engine and gearbox (automatic; the revs drive the sound)
    const gears = S.gears, top = gears[this.gear - 1]!, lo = this.gear > 1 ? gears[this.gear - 2]! : 0;
    const uAbs = Math.abs(this.u);
    this.shiftT = Math.max(0, this.shiftT - dt);
    if (this.shiftT <= 0) {
      if (uAbs > top * 0.97 && this.gear < gears.length && inp.throttle > 0.3) { this.gear++; this.shiftT = 0.18; }
      else if (this.gear > 1 && uAbs < lo * 0.72) { this.gear--; this.shiftT = 0.12; }
    }
    const span = top - lo * 0.62;
    let revs = clamp((uAbs - lo * 0.62) / Math.max(1, span), 0, 1);
    if (this.spin > 0.2 && inp.throttle > 0.5) revs = Math.min(1, revs + this.spin * 0.6);   // wheelspin lets the engine rev
    const targetRpm = S.idle + (S.redline - S.idle) * Math.max(revs, inp.throttle * (onGround ? 0.08 : 0.5));
    this.rpm += (targetRpm - this.rpm) * (1 - Math.exp(-dt * 14));

    // ---- loads with weight transfer
    const ax = this.ax;
    let Nf = m * G * S.b / L - m * ax * S.cgH / L, Nr = m * G * S.a / L + m * ax * S.cgH / L;
    Nf = Math.max(Nf, m * G * 0.15); Nr = Math.max(Nr, m * G * 0.15);
    const mu = surf.mu * S.grip;

    // ---- longitudinal forces
    const shifting = this.shiftT > 0.08;
    let drive = 0;
    if (inp.throttle > 0 && !shifting && onGround) {
      const reverse = inp.brake > 0.5 && this.u < 0.5;
      if (!reverse) drive = inp.throttle * Math.min(S.maxForce, S.power / Math.max(4, uAbs)) * (uAbs > gears[gears.length - 1]! ? 0 : 1);
    }
    let braking = 0;
    if (inp.brake > 0) {
      if (this.u > 0.8) braking = inp.brake * S.brake;
      else if (inp.throttle < 0.1) drive = -inp.brake * S.maxForce * 0.35;        // reverse
      else braking = inp.brake * S.brake * 0.5;
    }
    const FxDriveR = drive * (1 - S.front), FxDriveF = drive * S.front;
    // traction: how much of the rear tyres' grip the drive and the handbrake use up
    const hb = inp.handbrake && onGround;
    const muR = mu * S.rearGrip * (hb ? 0.5 : 1);
    const capR = muR * Nr, capF = mu * Nf;
    const useR = Math.abs(FxDriveR) / Math.max(1, capR), useF = Math.abs(FxDriveF) / Math.max(1, capF);
    this.spin += ((useR > 0.92 ? clamp((useR - 0.92) * 3, 0, 1) : 0) - this.spin) * (1 - Math.exp(-dt * 8));
    const fxR = clamp(FxDriveR, -capR, capR) * (1 - this.spin * 0.25), fxF = clamp(FxDriveF, -capF, capF);
    const roll = (Math.abs(this.u) > 0.1 ? Math.sign(this.u) : 0) * (m * G * (0.012 + surf.drag) + 0.42 * this.u * this.u);
    let Fx = fxR + fxF - roll;
    if (braking > 0) Fx -= Math.sign(this.u) * Math.min(braking, (Nf + Nr) * mu * 1.0);
    if (hb && Math.abs(this.u) > 0.5) Fx -= Math.sign(this.u) * Nr * muR * 0.6;
    if (!onGround) Fx = -(0.42 * this.u * Math.abs(this.u));

    // ---- lateral forces from the slip angles
    let Fyf = 0, Fyr = 0;
    const uS = Math.max(Math.abs(this.u), 2.5);
    const af = Math.atan2(this.w + S.a * this.om, uS) - this.steer * (this.u >= -0.5 ? 1 : -1);
    const ar = Math.atan2(this.w - S.b * this.om, uS);
    if (onGround) {
      // the driven tyres keep at least ~half their side grip while spinning (a game, not a skid pan: full throttle in first gear breaks the tail
      // loose, it does not turn the car into a top)
      const latF = Math.sqrt(Math.max(0.2, 1 - useF * useF)), latR = Math.sqrt(Math.max(hb ? 0.08 : 0.25, 1 - Math.min(1, useR) ** 2)) * (1 - this.spin * 0.2);
      Fyf = -capF * curve(af, S.tyreB) * latF;
      Fyr = -capR * curve(ar, S.tyreB) * latR;
    }
    this.slipAngle = ar;

    // ---- integrate in the car's frame (u forward, w right, om right-turn yaw rate)
    const cs = Math.cos(this.steer), sn = Math.sin(this.steer);
    const FxT = Fx - Fyf * sn;
    const FyT = Fyr + Fyf * cs;
    let du = FxT / m + this.w * this.om;
    let dw = FyT / m - this.u * this.om;
    let dom = (S.a * Fyf * cs - S.b * Fyr) / I;
    // drift assist: past about 45 degrees of body slip the car is helped back toward the slide instead of spinning round; the yaw rate is
    // also damped a little so a held slide is steady. 0 = none (a real car), 1 = a forgiving arcade car.
    if (onGround && sp > 4 && S.assist > 0) {
      const beta = Math.atan2(this.w, Math.max(0.5, Math.abs(this.u)));
      const ex = Math.abs(beta) - 0.78;
      if (ex > 0) dom += Math.sign(beta) * ex * 40 * S.assist - this.om * ex * 6 * S.assist;
      dom -= this.om * 0.6 * S.assist * clamp(1 - Math.abs(inp.steer), 0, 1);
      // once the car is sliding, its rotation follows the steering: steer into the slide for more angle, counter-steer to catch it
      if (Math.abs(beta) > 0.12) {
        const omSteer = (this.u * Math.tan(this.steer)) / L * 1.6;
        dom += (omSteer - this.om) * 2.4 * S.assist * clamp((Math.abs(beta) - 0.12) / 0.25, 0, 1);
      }
    }
    // slow speeds: blend toward rolling without slip so the car does not shimmy when parking
    if (sp < 3 && onGround) {
      const k = 1 - sp / 3;
      const omKin = (this.u * Math.tan(this.steer)) / L;
      dom = dom * (1 - k) + ((omKin - this.om) / 0.08) * k;
      dw = dw * (1 - k) + (-this.w / 0.08) * k;
      if (Math.abs(this.u) < 0.05 && Fx * Math.sign(this.u || 1) <= 0 && Math.abs(drive) < 1) { du = -this.u / 0.1; }
    }
    if (!onGround) { dw = -this.w * 0.2; dom = -this.om * 0.3; }
    // braking never makes the car reverse
    const uBefore = this.u;
    this.u += du * dt; this.w += dw * dt; this.om += dom * dt;
    if (braking > 0 && uBefore > 0 && this.u < 0) this.u = 0;
    this.ax = this.ax + (du - this.ax) * (1 - Math.exp(-dt * 10));
    this.ay = this.ay + (dw + this.u * this.om - this.ay) * (1 - Math.exp(-dt * 10));
    this.h -= this.om * dt;
    this.x += this.vx * dt; this.z += this.vz * dt;

    // ---- body: roll in turns, pitch under braking and power, bumps on rough ground (springs)
    const wn = 2 * Math.PI * S.spring, zeta = 0.45;
    const rollT = clamp(-this.ay * S.lean * 0.012, -0.12, 0.12);
    const pitchT = clamp(-this.ax * S.lean * 0.008, -0.08, 0.08);
    const bump = onGround ? surf.rough * clamp(sp / 20, 0, 1) : 0;
    this.rollV += (-wn * wn * (this.roll - rollT) - 2 * zeta * wn * this.rollV + this.rnd() * bump * 24) * dt; this.roll += this.rollV * dt;
    this.pitchV += (-wn * wn * (this.pitch - pitchT) - 2 * zeta * wn * this.pitchV + this.rnd() * bump * 16) * dt; this.pitch += this.pitchV * dt;
    this.heaveV += (-wn * wn * 1.3 * this.heave - 2 * zeta * wn * this.heaveV + this.rnd() * bump * 12) * dt; this.heave += this.heaveV * dt;
    this.heave = clamp(this.heave, -0.12, 0.12);

    // ---- what the wheels show
    const cap = (v: number) => clamp(v, 0, 1);
    const sF = onGround ? cap((Math.abs(af) - 0.16) * 3) : 0, sR = onGround ? cap((Math.abs(ar) - 0.14) * 3.2 + this.spin + (hb && sp > 3 ? 0.6 : 0)) : 0;
    const lockF = braking > 0 && (Nf + Nr) * mu < braking * 1.05 ? 0.6 : 0;
    this.slide = [Math.max(sF, lockF), Math.max(sF, lockF), sR, sR];
    const wr = S.wheelR;
    for (let i = 0; i < 4; i++) {
      const rear = i >= 2, extra = rear && this.spin > 0.05 ? this.spin * 25 : 0;
      this.wheelSpin[i] = (this.wheelSpin[i]! + ((this.u + (hb && rear ? -this.u : 0)) / wr + extra) * dt) % (Math.PI * 2000);
    }
  }
}
