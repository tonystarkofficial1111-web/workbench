// @ts-nocheck
import { buildF1Car, makeKit, EYE_POS } from "./car";
import { WALL_D, CAR_HALF } from "./consts";

/**
 * The crash scenes. When the player's car touches a barrier the game hands over to one of twenty replay-style scenes (chosen at random, never the
 * same one twice in a row): the car and its torn-off parts are simulated with a small rigid-body model (gravity, bounces on the ground and the
 * barrier, spin, friction), the barrier really breaks, and sparks, smoke, fire, dust and debris fly. A virtual TV director cuts between cameras,
 * the speed drops to slow motion around the impact, and the whole thing lasts about seven seconds. The report with all the numbers follows.
 */
declare const __WB_DBG__: boolean;
type Rig = "chase" | "trackside" | "orbit" | "heli" | "ground" | "under" | "onboard" | "wheel" | "tv" | "zoom" | "whip";

interface SceneDef {
  title: string; sub: string;
  /** share of the forward speed kept */
  vK: number;
  /** speed towards the barrier, m/s */
  wall: number;
  /** nose turned towards the barrier, rad */
  yawIn: number;
  launch: number;
  /** spin about the car's forward / side / vertical axes, rad/s */
  roll: number; pitch: number; yaw: number;
  bounce: number;
  vault?: boolean; tear?: boolean;
  /** seconds the car keeps being pushed against the barrier (a long scrape) */
  scrub?: number;
  lose: string[]; split?: boolean; shatter?: boolean;
  fire: number; smoke: number; sparks: number; dust: number; flash: number;
  /** seconds until the engine blows up */
  boom?: number;
  tyres?: boolean; rival?: boolean;
  rigs: Array<[Rig, number]>;
  /** slow motion from, to (s), speed share */
  slow: [number, number, number];
}

export const CRASH_SCENES: SceneDef[] = [
  { title: "HEAD-ON", sub: "Straight into the barrier, nose first", vK: 0.55, wall: 14, yawIn: 0.9, launch: 1, roll: 0, pitch: 0.6, yaw: 0.8, bounce: 0.35, lose: ["fw", "nose"], fire: 0, smoke: 0.7, sparks: 0.6, dust: 0.2, flash: 0.6, rigs: [["zoom", 2.0], ["trackside", 4.8], ["orbit", 99]], slow: [0.1, 1.3, 0.13] },
  { title: "BARREL ROLL", sub: "Over and over along the barrier", vK: 0.8, wall: 8, yawIn: 0.25, launch: 5, roll: 9, pitch: 0.5, yaw: 0.6, bounce: 0.45, lose: ["mirrors", "halo"], fire: 0, smoke: 0.4, sparks: 0.7, dust: 0.5, flash: 0.35, rigs: [["chase", 2.6], ["under", 4.4], ["orbit", 99]], slow: [0.15, 2.4, 0.22] },
  { title: "POLE VAULT", sub: "Up the wall and over the fence", vK: 0.75, wall: 9, yawIn: 0.2, launch: 9, roll: 1.2, pitch: -3, yaw: 0.5, bounce: 0.1, vault: true, tear: true, lose: ["fw", "mirrors"], fire: 0.1, smoke: 0.5, sparks: 0.4, dust: 0.7, flash: 0.45, rigs: [["trackside", 2.2], ["heli", 5], ["orbit", 99]], slow: [0.1, 2.8, 0.2] },
  { title: "PINBALL", sub: "From wall to wall across the track", vK: 0.85, wall: 13, yawIn: 0.35, launch: 1.5, roll: 0.5, pitch: 0.4, yaw: 3.2, bounce: 0.92, lose: ["fw", "rw", "podL"], fire: 0, smoke: 0.6, sparks: 1, dust: 0.3, flash: 0.5, rigs: [["tv", 7.5]], slow: [0.1, 1.6, 0.3] },
  { title: "WHEELS OFF", sub: "All four wheels torn away", vK: 0.8, wall: 11, yawIn: 0.5, launch: 1.5, roll: 0.4, pitch: 0.2, yaw: 1.4, bounce: 0.3, lose: ["wFL", "wFR", "wRL", "wRR"], fire: 0, smoke: 0.5, sparks: 1, dust: 0.6, flash: 0.45, rigs: [["wheel", 2.4], ["ground", 4.6], ["orbit", 99]], slow: [0.1, 2.0, 0.17] },
  { title: "INFERNO", sub: "The fuel tank goes up", vK: 0.5, wall: 12, yawIn: 0.7, launch: 2, roll: 0.3, pitch: 0.8, yaw: 1.1, bounce: 0.25, lose: ["nose", "fw"], fire: 1, smoke: 1, sparks: 0.5, dust: 0.3, flash: 1, boom: 0.5, rigs: [["zoom", 2.2], ["orbit", 99]], slow: [0.1, 1.8, 0.15] },
  { title: "SPIN AND SLAM", sub: "Backwards into the barrier at full spin", vK: 0.7, wall: 9, yawIn: 3.1, launch: 0.5, roll: 0.2, pitch: 0, yaw: 10, bounce: 0.4, lose: ["rw", "engine"], fire: 0.2, smoke: 0.8, sparks: 0.7, dust: 0.8, flash: 0.5, rigs: [["chase", 2.0], ["trackside", 5], ["tv", 99]], slow: [0.12, 1.8, 0.18] },
  { title: "CARTWHEEL", sub: "End over end through the air", vK: 0.8, wall: 7, yawIn: 0.3, launch: 6.5, roll: 0.5, pitch: 8, yaw: 0.7, bounce: 0.4, lose: ["fw", "nose", "mirrors"], fire: 0, smoke: 0.5, sparks: 0.5, dust: 0.6, flash: 0.4, rigs: [["under", 2.2], ["chase", 4.6], ["heli", 99]], slow: [0.12, 2.6, 0.2] },
  { title: "SPARK SHOWER", sub: "Grinding along the barrier", vK: 0.9, wall: 3, yawIn: 0.12, launch: 0, roll: 0, pitch: 0, yaw: 0.35, bounce: 0.1, scrub: 2.2, lose: ["podL", "mirrors"], fire: 0, smoke: 0.4, sparks: 1.8, dust: 0.2, flash: 0.3, rigs: [["ground", 2.5], ["trackside", 5], ["orbit", 99]], slow: [0.1, 1.2, 0.35] },
  { title: "ROOF SLIDE", sub: "Upside down on the tarmac", vK: 0.85, wall: 6, yawIn: 0.2, launch: 3, roll: 3.4, pitch: 0.3, yaw: 0.9, bounce: 0.3, lose: ["halo", "mirrors"], fire: 0, smoke: 0.9, sparks: 1.2, dust: 0.5, flash: 0.35, rigs: [["onboard", 2.0], ["chase", 5], ["heli", 99]], slow: [0.2, 2.2, 0.28] },
  { title: "TYRE WALL", sub: "Ploughing into a stack of tyres", vK: 0.7, wall: 12, yawIn: 0.6, launch: 1, roll: 0.3, pitch: 0.5, yaw: 0.8, bounce: 0.25, lose: ["fw"], fire: 0, smoke: 0.5, sparks: 0.2, dust: 1, flash: 0.5, tyres: true, rigs: [["zoom", 2.6], ["ground", 4.6], ["tv", 99]], slow: [0.1, 1.8, 0.16] },
  { title: "FENCE RIP", sub: "Tearing through the catch fence", vK: 0.8, wall: 9, yawIn: 0.25, launch: 4, roll: 1.8, pitch: -1.2, yaw: 0.8, bounce: 0.1, vault: true, tear: true, lose: ["fw", "podR"], fire: 0, smoke: 0.5, sparks: 0.6, dust: 0.8, flash: 0.4, rigs: [["whip", 3], ["orbit", 99]], slow: [0.1, 2.0, 0.2] },
  { title: "SPLIT IN TWO", sub: "The car breaks in half", vK: 0.65, wall: 13, yawIn: 0.8, launch: 2, roll: 1.4, pitch: 0.6, yaw: 1.6, bounce: 0.3, lose: ["nose", "fw"], split: true, fire: 0.5, smoke: 0.8, sparks: 0.8, dust: 0.4, flash: 0.7, rigs: [["orbit", 2.6], ["trackside", 5], ["heli", 99]], slow: [0.1, 2.0, 0.15] },
  { title: "T-BONE", sub: "Hit from behind while spinning", vK: 0.7, wall: 10, yawIn: 0.4, launch: 1, roll: 0.6, pitch: 0.3, yaw: 2.4, bounce: 0.45, lose: ["rw", "podR"], rival: true, fire: 0.2, smoke: 0.8, sparks: 0.9, dust: 0.5, flash: 0.6, rigs: [["trackside", 2.6], ["tv", 5], ["orbit", 99]], slow: [0.1, 2.2, 0.17] },
  { title: "AIRBORNE", sub: "Launched off the barrier", vK: 1, wall: 6, yawIn: 0.15, launch: 12, roll: 1.2, pitch: 0.9, yaw: 0.6, bounce: 0.3, lose: ["mirrors"], fire: 0, smoke: 0.5, sparks: 0.4, dust: 0.9, flash: 0.4, rigs: [["chase", 3.6], ["ground", 5], ["orbit", 99]], slow: [0.15, 3.4, 0.25] },
  { title: "DEBRIS FIELD", sub: "The car disintegrates", vK: 0.7, wall: 14, yawIn: 0.7, launch: 3, roll: 1.6, pitch: 1.2, yaw: 1.8, bounce: 0.35, lose: ["fw", "nose", "rw", "engine", "podL", "podR", "halo", "mirrors", "wFL", "wFR"], shatter: true, fire: 0.3, smoke: 0.9, sparks: 1, dust: 0.8, flash: 0.9, rigs: [["zoom", 3.2], ["orbit", 99]], slow: [0.08, 1.8, 0.08] },
  { title: "SMOKE TRAIL", sub: "A long slide into the barrier", vK: 0.9, wall: 4.5, yawIn: 1.2, launch: 0, roll: 0, pitch: 0, yaw: 7, bounce: 0.2, scrub: 0.8, lose: ["rw", "mirrors"], fire: 0, smoke: 1.4, sparks: 0.6, dust: 1.4, flash: 0.3, rigs: [["heli", 3.6], ["chase", 99]], slow: [0.2, 2.0, 0.4] },
  { title: "ENGINE BLOW", sub: "The power unit explodes", vK: 0.6, wall: 11, yawIn: 0.6, launch: 2, roll: 0.5, pitch: 0.4, yaw: 1.0, bounce: 0.3, lose: ["nose", "fw"], boom: 0.9, fire: 0.8, smoke: 1.2, sparks: 0.7, dust: 0.4, flash: 1, rigs: [["ground", 3], ["tv", 5.6], ["orbit", 99]], slow: [0.1, 2.0, 0.2] },
  { title: "SKY HIGH", sub: "Thirteen metres into the air", vK: 0.9, wall: 7, yawIn: 0.1, launch: 17, roll: 3, pitch: 2.4, yaw: 0.6, bounce: 0.3, lose: ["mirrors", "fw"], fire: 0, smoke: 0.5, sparks: 0.4, dust: 1, flash: 0.45, rigs: [["under", 3.2], ["chase", 5.2], ["heli", 99]], slow: [0.12, 4.0, 0.22] },
  { title: "HAMMER BLOW", sub: "Front, then rear into the opposite barrier", vK: 0.85, wall: 15, yawIn: 0.45, launch: 1, roll: 0.7, pitch: 0.4, yaw: 6, bounce: 0.75, lose: ["fw", "rw", "wRR", "mirrors"], fire: 0.1, smoke: 0.8, sparks: 1.3, dust: 0.4, flash: 0.8, rigs: [["whip", 2.3], ["tv", 4.5], ["zoom", 99]], slow: [0.1, 1.9, 0.14] },
];

let lastScene = -1;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (k: number) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** A handful of procedural sounds (no audio files). */
function makeAudio() {
  let ac: any = null;
  try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; }
  let noise: any = null;
  const nb = () => { if (!noise) { noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noise; };
  const src = () => { const s = ac.createBufferSource(); s.buffer = nb(); s.loop = true; return s; };
  const env = (g: any, t0: number, a: number, peak: number, d: number) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); };
  return {
    crunch(vol: number) {
      if (!ac) return; const t = ac.currentTime, s = src(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = "bandpass"; f.Q.value = 0.8; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.55);
      env(g, t, 0.004, 0.9 * vol, 0.6); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + 0.8);
      this.thud(vol);
      for (let i = 0; i < 3; i++) { const o = ac.createOscillator(), og = ac.createGain(); o.type = "triangle"; o.frequency.value = 700 + Math.random() * 1700; env(og, t + i * 0.05, 0.002, 0.18 * vol, 0.35); o.connect(og); og.connect(ac.destination); o.start(t + i * 0.05); o.stop(t + 0.7); }
    },
    thud(vol: number) {
      if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.28); env(g, t, 0.003, 1.0 * vol, 0.32); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.5);
    },
    boom(vol: number) {
      if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), s = src(), f = ac.createBiquadFilter(), g2 = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(26, t + 1.1); env(g, t, 0.01, 1.1 * vol, 1.2);
      f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(90, t + 1.4); env(g2, t, 0.01, 0.9 * vol, 1.4);
      o.connect(g); g.connect(ac.destination); s.connect(f); f.connect(g2); g2.connect(ac.destination); o.start(t); o.stop(t + 1.5); s.start(t); s.stop(t + 1.6);
    },
    scrape(sec: number, vol: number) {
      if (!ac) return; const t = ac.currentTime, s = src(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = "bandpass"; f.Q.value = 5; f.frequency.setValueAtTime(3200, t); f.frequency.linearRampToValueAtTime(1100, t + sec);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35 * vol, t + 0.05); g.gain.setTargetAtTime(0.0001, t + sec * 0.6, sec * 0.25);
      lfo.frequency.value = 38; lg.gain.value = 0.18 * vol; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); lfo.start(t); s.stop(t + sec + 0.3); lfo.stop(t + sec + 0.3);
    },
    close() { try { if (ac) ac.close(); } catch (e) { /* ignore */ } },
  };
}

export function createCrash(ctx: any) {
  const T = ctx.THREE, scene = ctx.scene, path = ctx.path, world = ctx.world, hit = ctx.hit, f = ctx.f, cv = ctx.cv;
  const g2 = cv.getContext("2d");
  let forced = ctx.hooks && ctx.hooks.scene !== undefined ? ctx.hooks.scene : -1;
  if (forced < 0 && typeof __WB_DBG__ !== "undefined" && __WB_DBG__ && (window as any).__f1Scene !== undefined) forced = (window as any).__f1Scene;   // tests pick a scene
  let pick = forced >= 0 ? forced % CRASH_SCENES.length : Math.floor(Math.random() * CRASH_SCENES.length);
  if (forced < 0 && pick === lastScene) pick = (pick + 1 + Math.floor(Math.random() * (CRASH_SCENES.length - 1))) % CRASH_SCENES.length;
  lastScene = pick;
  // a touch at walking pace is a small accident, a hit at 100 mph is a disaster: the scene is the same, scaled by how hard the car hit
  const base = CRASH_SCENES[pick]!, sev = clamp(hit.speed / 75, 0.25, 1.25), kk = 0.35 + 0.65 * Math.min(1, sev);
  const def: SceneDef = {
    ...base, wall: base.wall * (0.4 + 0.6 * sev), launch: base.launch * sev, roll: base.roll * kk, pitch: base.pitch * kk, yaw: base.yaw * kk, sparks: base.sparks * kk, smoke: base.smoke * kk, dust: base.dust * kk,
    fire: sev < 0.4 ? 0 : base.fire * kk, boom: sev < 0.5 ? undefined : base.boom, lose: sev < 0.4 ? base.lose.slice(0, 1) : sev < 0.6 ? base.lose.slice(0, 3) : base.lose,
    shatter: sev < 0.6 ? false : base.shatter, split: sev < 0.6 ? false : base.split, flash: base.flash * kk,
  };
  const R = rng((Date.now() ^ Math.floor((hit.speed || 1) * 1000)) >>> 0);
  const sgn = () => (R() < 0.5 ? -1 : 1), jit = (k: number) => 1 + (R() - 0.5) * 2 * k;
  const pFactor = Math.min(1, (f.particles || 500) / 500);

  const audio = makeAudio();
  const objs: any[] = [], disposables: any[] = [];
  const track = <A>(o: A) => { disposables.push(o); return o; };

  // ---------------------------------------------------------------- where the car is
  const s0 = path.at(hit.u);
  const Tn = new T.Vector3(s0.fx, 0, s0.fz).normalize(), Rn = new T.Vector3(s0.rx, 0, s0.rz).normalize();
  const side = hit.side as number;
  const In = Rn.clone().multiplyScalar(-side);                          // from the barrier towards the middle of the track
  const P0 = new T.Vector3(s0.x, s0.y, s0.z).addScaledVector(Rn, side * (WALL_D - CAR_HALF - 0.2));
  const gFlat = s0.y - 0.02;                                            // the ground around the crash, for the cheap particle bounce
  const UP = new T.Vector3(0, 1, 0), tmp = new T.Vector3(), tmp2 = new T.Vector3(), tmp3 = new T.Vector3();
  const near = { d: 0, h: 0, i: 0, side: 1 };
  const ground = (x: number, z: number) => {
    path.nearest(x, z, near);
    let gy = world.groundY(x, z);
    if (near.d < 13.2) gy = Math.max(gy, path.py[near.i]! - 0.02);
    return gy;
  };

  // ---------------------------------------------------------------- the player's car as a set of loose bodies
  const kit = track(makeKit(T));
  const car = buildF1Car(T, kit, "#c7212b", 0xf2f2f4);
  const pivot = new T.Group(); pivot.add(car.group); car.group.position.set(0, -0.45, 0); scene.add(pivot); objs.push(pivot);
  ctx.ghost.group.visible = false;
  interface Body { obj: any; pos: any; vel: any; q: any; w: any; r: number; e: number; mu: number; mass: number; kind: string; dead: boolean; rest: number; rw: number; spin?: number; rival?: boolean; hitWall: number; }
  const bodies: Body[] = [];
  const mkBody = (obj: any, r: number, kind: string, o: Partial<Body> = {}): Body => {
    const b: Body = { obj, pos: new T.Vector3().copy(obj.getWorldPosition(new T.Vector3())), vel: new T.Vector3(), q: new T.Quaternion().copy(obj.getWorldQuaternion(new T.Quaternion())), w: new T.Vector3(), r, e: 0.3, mu: 0.5, mass: 1, kind, dead: false, rest: 0, rw: r, hitWall: 0, ...o };
    bodies.push(b); return b;
  };
  const heading = Math.atan2(s0.fx, s0.fz) + (hit.slide || 0) * 0.8 + side * def.yawIn;
  pivot.position.copy(P0).add(new T.Vector3(0, 0.62, 0));
  pivot.quaternion.setFromAxisAngle(UP, heading);
  const chassis = mkBody(pivot, 0.62, "chassis", { r: 0.62, rw: CAR_HALF, mass: 8, e: def.bounce, mu: 0.55 });
  const vF = clamp((hit.ms || 40) * 0.5 * def.vK, 6, 44);
  chassis.vel.set(0, 0, 0).addScaledVector(Tn, vF).addScaledVector(Rn, side * def.wall).addScaledVector(UP, def.launch * jit(0.15));
  const sp = (def.roll ? sgn() : 1);
  const fwdW = tmp.set(Math.sin(heading), 0, Math.cos(heading)).clone(), latW = new T.Vector3().crossVectors(UP, fwdW).normalize();
  chassis.w.set(0, 0, 0).addScaledVector(fwdW, def.roll * sp * jit(0.2)).addScaledVector(latW, def.pitch * sgn() * jit(0.2)).addScaledVector(UP, def.yaw * sgn() * jit(0.25));
  let rival: any = null;

  // ---------------------------------------------------------------- pools of particles (square pieces, like the rest of the world)
  const boxGeo = track(new T.BoxGeometry(1, 1, 1));
  const dummy = new T.Object3D(), col = new T.Color();
  function pool(max: number, mat: any, init: (i: number) => void = () => {}) {
    const mesh = new T.InstancedMesh(boxGeo, mat, max);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.setColorAt(0, col.setRGB(1, 1, 1));
    scene.add(mesh); objs.push(mesh);
    const P = new Float32Array(max * 3), V = new Float32Array(max * 3), L = new Float32Array(max), L0 = new Float32Array(max), S = new Float32Array(max), C = new Float32Array(max * 3), Rt = new Float32Array(max * 3), Rv = new Float32Array(max * 3);
    let head = 0; const zero = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < max; i++) mesh.setMatrixAt(i, zero);
    return {
      mesh, max,
      emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number, r: number, g: number, b: number) {
        const i = head; head = (head + 1) % max;
        P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz; S[i] = size; L[i] = L0[i] = life; C[i * 3] = r; C[i * 3 + 1] = g; C[i * 3 + 2] = b;
        Rt[i * 3] = R() * 6; Rt[i * 3 + 1] = R() * 6; Rt[i * 3 + 2] = R() * 6; Rv[i * 3] = (R() - 0.5) * 9; Rv[i * 3 + 1] = (R() - 0.5) * 9; Rv[i * 3 + 2] = (R() - 0.5) * 9;
      },
      update(dt: number, grav: number, drag: number, bounce: boolean, scaleFn: (k: number) => number, colorFn?: (k: number, i: number) => void) {
        for (let i = 0; i < max; i++) {
          if (L[i]! <= 0) continue;
          L[i] -= dt;
          if (L[i]! <= 0) { mesh.setMatrixAt(i, zero); continue; }
          V[i * 3 + 1] += grav * dt; const dr = Math.exp(-drag * dt); V[i * 3] *= dr; V[i * 3 + 1] *= dr; V[i * 3 + 2] *= dr;
          P[i * 3] += V[i * 3]! * dt; P[i * 3 + 1] += V[i * 3 + 1]! * dt; P[i * 3 + 2] += V[i * 3 + 2]! * dt;
          if (bounce) { const gy = Math.max(world.groundY(P[i * 3]!, P[i * 3 + 2]!), gFlat) + S[i]! * 0.5; if (P[i * 3 + 1]! < gy) { P[i * 3 + 1] = gy; if (V[i * 3 + 1]! < 0) V[i * 3 + 1] *= -0.35; V[i * 3] *= 0.7; V[i * 3 + 2] *= 0.7; Rv[i * 3] *= 0.5; Rv[i * 3 + 1] *= 0.5; Rv[i * 3 + 2] *= 0.5; } }
          Rt[i * 3] += Rv[i * 3]! * dt; Rt[i * 3 + 1] += Rv[i * 3 + 1]! * dt; Rt[i * 3 + 2] += Rv[i * 3 + 2]! * dt;
          const k = 1 - L[i]! / L0[i]!, sc = S[i]! * scaleFn(k);
          dummy.position.set(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!); dummy.rotation.set(Rt[i * 3]!, Rt[i * 3 + 1]!, Rt[i * 3 + 2]!); dummy.scale.setScalar(sc); dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          if (colorFn) { colorFn(k, i); col.setRGB(C[i * 3]! * cm[0]!, C[i * 3 + 1]! * cm[1]!, C[i * 3 + 2]! * cm[2]!); } else col.setRGB(C[i * 3]!, C[i * 3 + 1]!, C[i * 3 + 2]!);
          mesh.setColorAt(i, col);
        }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      },
    };
  }
  const cm = [1, 1, 1];     // colour multiplier for the pool being updated
  const N = (k: number) => Math.max(8, Math.round(k * pFactor));
  const sparkMat = track(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  const fireMat = track(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  const smokeMat = track(new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.62, depthWrite: false }));
  const dustMat = track(new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  const debrisMat = track(new T.MeshLambertMaterial({ color: 0xffffff }));
  const sparks = pool(N(520), sparkMat), fire = pool(N(260), fireMat), smoke = pool(N(300), smokeMat), dust = pool(N(260), dustMat), debris = pool(N(520), debrisMat);
  debris.mesh.castShadow = f.shadow > 0;
  track(sparks.mesh); track(fire.mesh);

  // ---------------------------------------------------------------- effects helpers
  let shake = 0, flash = 0, flashColor = "255,255,255", impacts = 0, brokeAt = -9, sceneT = 0, slowNow = 1;
  const fxLight = ctx.fxLight || null;
  const spark = (p: any, dir: any, n: number, spread = 5) => {
    n = Math.round(n * def.sparks * pFactor); for (let i = 0; i < n; i++) sparks.emit(p.x, p.y, p.z, dir.x * (3 + R() * 9) + (R() - 0.5) * spread, 1 + R() * 6, dir.z * (3 + R() * 9) + (R() - 0.5) * spread, 0.05 + R() * 0.08, 0.3 + R() * 0.7, 3.2, 1.7 + R() * 0.9, 0.5);
  };
  const puff = (p: any, n: number, up = 3, size = 1.3, dark = true, spread = 2.5) => {
    n = Math.round(n * def.smoke * pFactor); for (let i = 0; i < n; i++) { const c = dark ? 0.06 + R() * 0.12 : 0.5 + R() * 0.2; smoke.emit(p.x + (R() - 0.5), p.y + R() * 0.5, p.z + (R() - 0.5), (R() - 0.5) * spread, up * (0.5 + R()), (R() - 0.5) * spread, size * (0.6 + R() * 0.9), 1.6 + R() * 2.4, c, c, c * 1.04); }
  };
  const dirt = (p: any, n: number, v = 6) => {
    n = Math.round(n * def.dust * pFactor); for (let i = 0; i < n; i++) { const c = 0.4 + R() * 0.2; dust.emit(p.x + (R() - 0.5), p.y + 0.1, p.z + (R() - 0.5), (R() - 0.5) * v, 1 + R() * v * 0.6, (R() - 0.5) * v, 0.5 + R() * 0.9, 0.8 + R() * 1.2, c * 0.9, c * 0.78, c * 0.55); }
  };
  const blazing = (p: any, n: number) => {
    n = Math.round(n * pFactor); for (let i = 0; i < n; i++) fire.emit(p.x + (R() - 0.5) * 0.8, p.y + R() * 0.4, p.z + (R() - 0.5) * 0.8, (R() - 0.5) * 1.4, 2.5 + R() * 3, (R() - 0.5) * 1.4, 0.4 + R() * 0.7, 0.5 + R() * 0.7, 2.4, 0.9 + R() * 0.6, 0.18);
  };
  const shards = (p: any, v: any, n: number, big = 1) => {
    n = Math.round(n * pFactor); for (let i = 0; i < n; i++) {
      const k = R(), cc = k < 0.4 ? [0.78, 0.07, 0.1] : k < 0.65 ? [0.1, 0.1, 0.12] : k < 0.85 ? [0.9, 0.9, 0.92] : [0.55, 0.57, 0.6];
      debris.emit(p.x + (R() - 0.5), p.y + R() * 0.5, p.z + (R() - 0.5), v.x * (0.3 + R()) + (R() - 0.5) * 9, 2 + R() * 9, v.z * (0.3 + R()) + (R() - 0.5) * 9, (0.08 + R() * 0.3) * big, 3.5 + R() * 3, cc[0]!, cc[1]!, cc[2]!);
    }
  };
  const barrierBlocks = (p: any, n: number) => {
    n = Math.round(n * pFactor); for (let i = 0; i < n; i++) { const c = R() < 0.5 ? [0.94, 0.94, 0.95] : [0.8, 0.12, 0.14]; debris.emit(p.x + (R() - 0.5) * 3, p.y + 0.3 + R() * 0.7, p.z + (R() - 0.5) * 3, In.x * (2 + R() * 6) + Tn.x * (R() * 8), 2 + R() * 6, In.z * (2 + R() * 6) + Tn.z * (R() * 8), 0.35 + R() * 0.5, 4 + R() * 3, c[0]!, c[1]!, c[2]!); }
  };

  // ---------------------------------------------------------------- loose parts
  const partVel = new T.Vector3();
  function detach(name: string, boost = 1) {
    let obj: any = null, r = 0.3;
    if (name.startsWith("w")) {
      const i = { wFL: 0, wFR: 1, wRL: 2, wRR: 3 }[name]!; obj = car.parts.wheelRoots[i]; r = 0.4;
      if (!obj || !obj.parent) return null; car.links[i].forEach((l: any) => { l.mesh.visible = false; });
    } else {
      const key = { fw: "frontWing", rw: "rearWing", nose: "nose", engine: "engine", podL: "pods", podR: "pods", halo: "halo", mirrors: "mirrors" }[name];
      obj = key ? car.parts[key] : null; if (!obj || !obj.parent || obj.userData.gone) return null; obj.userData.gone = true;
      r = name === "engine" || name === "rw" ? 0.45 : 0.3;
    }
    scene.attach(obj); objs.push(obj);
    const b = mkBody(obj, r, "part", { e: 0.45, mu: 0.45, mass: 1 });
    partVel.copy(chassis.vel).multiplyScalar(0.8).addScaledVector(In, 4 * boost * (0.4 + R())).addScaledVector(UP, (3 + R() * 6) * boost).add(tmp.set((R() - 0.5) * 8, 0, (R() - 0.5) * 8));
    b.vel.copy(partVel); b.w.set((R() - 0.5) * 16, (R() - 0.5) * 16, (R() - 0.5) * 16);
    if (name.startsWith("w")) { b.mu = 0.12; b.e = 0.55; b.w.set(0, 0, 0).addScaledVector(latW, 20 * (R() < 0.5 ? -1 : 1)); }
    return b;
  }
  let loseIdx = 0, tImpact = -1;
  const loseNext = () => { while (loseIdx < def.lose.length) { const n = def.lose[loseIdx++]!; const b = detach(n, def.shatter ? 1.6 : 1); if (b) return b; } return null; };

  // ---------------------------------------------------------------- a second car for the T-bone scene, tyres for the tyre wall
  if (def.rival) {
    const k2 = track(makeKit(T)), rc = buildF1Car(T, k2, "#2a5ac8", 0xf2c94c), rp = new T.Group(); rp.add(rc.group); rc.group.position.set(0, -0.45, 0); scene.add(rp); objs.push(rp);
    rp.position.copy(P0).addScaledVector(Tn, -30).addScaledVector(In, 4).add(new T.Vector3(0, 0.62, 0)); rp.quaternion.setFromAxisAngle(UP, Math.atan2(s0.fx, s0.fz) + 0.15 * side);
    rival = mkBody(rp, 0.62, "chassis", { rw: CAR_HALF, mass: 8, e: 0.4, mu: 0.5, rival: true });
    rival.vel.copy(Tn).multiplyScalar(vF * 1.45).addScaledVector(In, -side * 0.5);
  }
  const tyres: Body[] = [];
  if (def.tyres) {
    // a stack of tyres in front of the car, three high, nine long: every one is its own body, so they all fly when hit
    const tg = track(new T.CylinderGeometry(0.42, 0.42, 0.34, 12)), tm = track(new T.MeshLambertMaterial({ color: 0x1b1c20 })), tm2 = track(new T.MeshLambertMaterial({ color: 0xf0f0f2 }));
    for (let row = 0; row < 3; row++) for (let k = 0; k < 9; k++) {
      const t = new T.Mesh(tg, (k + row) % 5 === 0 ? tm2 : tm); t.castShadow = f.shadow > 0;
      t.position.copy(P0).addScaledVector(Rn, side * 0.5).addScaledVector(Tn, 4 + k * 0.9 - 1).add(new T.Vector3(0, 0.2 + row * 0.42, 0));
      t.rotation.x = Math.PI / 2; scene.add(t); objs.push(t);
      const b = mkBody(t, 0.42, "tyre", { e: 0.5, mu: 0.8, rw: 0.42 }); b.rest = 1; tyres.push(b);
    }
  }

  // ---------------------------------------------------------------- the barrier and the ground
  const wallH = (i: number) => path.py[i]! + 1.05;
  const brokeRanges: number[] = [], gapRanges: number[] = [];
  let vaultDone = false;
  /** Knocks a piece out of the barrier. Where the car is meant to go through (vault / tear / shatter) it also becomes a gap the bodies can pass. */
  function breakBarrier(u: number, wide = 0.012, gap = false) {
    if (brokeRanges.some((x) => Math.abs(x - u) < 0.012)) return; brokeRanges.push(u);
    world.breakBarrier(side, u - wide, u + wide * 1.5);
    if (gap) gapRanges.push(u);
  }
  const breaks = !!(def.tear || def.vault || def.shatter || def.split);
  function onWall(b: Body, vn: number, p: any, i: number) {
    b.hitWall++;
    const big = b.kind === "chassis" && vn > 5;
    if (vn > 3) {
      spark(p, tmp3.copy(Tn).multiplyScalar(0.5 + R()).addScaledVector(In, 0.5), big ? 36 : 8);
      if (big) {
        impacts++; shake = Math.min(1.2, shake + 0.35 + vn * 0.03); audio.crunch(clamp(vn / 14, 0.3, 1));
        if (impacts === 1) { flash = def.flash; flashColor = def.boom ? "255,200,140" : "255,255,255"; }
        barrierBlocks(p, 14 + (def.shatter ? 22 : 0)); puff(p, 8, 4, 1.4, true); dirt(p, 8);
        if (vn > 6.5 || b === chassis && impacts === 1) { breakBarrier(i / path.n, breaks ? 0.012 : 0.006, breaks && !def.vault && !def.tear); if (impacts === 1) tImpact = st; }
        if (def.split && impacts === 1) split();
      }
    }
  }
  const wallTmp = { d: 0, h: 0, i: 0, side: 1 };
  function wall(b: Body, dt: number) {
    path.nearest(b.pos.x, b.pos.z, wallTmp);
    const i = wallTmp.i, rx = -path.fz[i]!, rz = path.fx[i]!;
    const s = (b.pos.x - path.px[i]!) * rx + (b.pos.z - path.pz[i]!) * rz;
    const pen = Math.abs(s) + b.rw - WALL_D;
    if (pen <= 0) return;
    const wh = wallH(i), vaulting = (def.vault || def.tear) && b.kind === "chassis" && !rival;
    const over = b.pos.y - b.r > wh || vaulting, broken = gapRanges.some((u) => Math.abs(u - i / path.n) < 0.016 && Math.sign(s) === side);
    if (vaulting && !vaultDone && Math.abs(s) + b.rw > WALL_D - 0.1) { vaultDone = true; tmp.set(b.pos.x, path.py[i]! + 0.6, b.pos.z); onWall(b, 9, tmp, i); gapRanges.push(i / path.n); }
    if (over || broken) {
      // above the barrier, or through the gap: the catch fence is next (soft)
      if (Math.abs(s) + b.rw > WALL_D + 0.25 && b.pos.y < path.py[i]! + 4.6) {
        const fast = b.vel.length();
        b.vel.multiplyScalar(1 - Math.min(0.95, (def.tear || broken ? 1.6 : 6) * dt));
        if (fast > 8 && b.kind === "chassis" && !(brokeRanges.length > 4)) { breakBarrier(i / path.n, 0.016); shards(b.pos, b.vel, 10, 0.5); audio.crunch(0.5); }
      }
      return;
    }
    const sg = s >= 0 ? 1 : -1, nx = -sg * rx, nz = -sg * rz;
    b.pos.x += nx * pen; b.pos.z += nz * pen;
    const vn = -(b.vel.x * nx + b.vel.z * nz);
    if (vn > 0) {
      const e = b.kind === "chassis" ? def.bounce : 0.4;
      b.vel.x += (1 + e) * vn * nx; b.vel.z += (1 + e) * vn * nz;
      const tx = -nz, tz = nx, vt = b.vel.x * tx + b.vel.z * tz; b.vel.x -= vt * 0.12 * tx; b.vel.z -= vt * 0.12 * tz;
      b.w.x += (R() - 0.5) * vn * 0.5; b.w.y += (R() - 0.5) * vn * 0.6; b.w.z += (R() - 0.5) * vn * 0.5;
      tmp.set(b.pos.x - nx * b.rw, b.pos.y, b.pos.z - nz * b.rw);
      onWall(b, vn, tmp, i);
    }
    if (b.kind === "chassis" && Math.abs(b.vel.x * tx_(rx, rz).x + b.vel.z * tx_(rx, rz).z) > 6 && R() < 0.5) spark(tmp.set(b.pos.x - nx * b.rw, b.pos.y - 0.2, b.pos.z - nz * b.rw), tmp3.set(path.fx[i]!, 0, path.fz[i]!).multiplyScalar(Math.sign(b.vel.x * path.fx[i]! + b.vel.z * path.fz[i]!)), 3);
  }
  function tx_(rx: number, rz: number) { return { x: -rz, z: rx }; }

  function split() {
    // the rear half (engine, wings, rear wheels) breaks away from the front half and flies off on its own
    const half = new T.Group(); scene.add(half); objs.push(half);
    half.position.copy(chassis.pos); half.quaternion.copy(chassis.q);
    for (const key of ["engine", "rearWing", "floor"]) { const o = car.parts[key]; if (o && !o.userData.gone) { o.userData.gone = true; half.attach(o); } }
    for (const i of [2, 3]) { const o = car.parts.wheelRoots[i]; if (o) { half.attach(o); car.links[i].forEach((l: any) => { l.mesh.visible = false; }); } }
    const b = mkBody(half, 0.7, "chassis", { rw: 0.9, mass: 5, e: 0.4, mu: 0.5 });
    b.vel.copy(chassis.vel).addScaledVector(In, 5 * (0.5 + R())).addScaledVector(Tn, 5).add(tmp.set(0, 5, 0)); b.w.set((R() - 0.5) * 12, (R() - 0.5) * 12, (R() - 0.5) * 12);
    chassis.vel.addScaledVector(In, -2).addScaledVector(Tn, -4);
    blazing(chassis.pos, 20); shards(chassis.pos, b.vel, 24); flash = Math.max(flash, 0.7);
  }

  // ---------------------------------------------------------------- stepping the bodies
  const ax = new T.Vector3(), dq = new T.Quaternion(), qUp = new T.Quaternion(), upv = new T.Vector3();
  function step(b: Body, dt: number) {
    if (b.dead) return;
    if (b.kind === "tyre" && b.rest) {                   // a stacked tyre waits where it is until something hits it
      for (const o of [chassis, rival]) if (o) {
        tmp.subVectors(b.pos, o.pos); const d = tmp.length();
        if (d < 1.12 && d > 1e-4) {
          b.rest = 0; tmp.multiplyScalar(1 / d);
          b.vel.copy(o.vel).multiplyScalar(0.85).addScaledVector(tmp, 3 + R() * 3).add(tmp3.set((R() - 0.5) * 5, 2 + R() * 6, (R() - 0.5) * 5));
          b.w.set((R() - 0.5) * 14, (R() - 0.5) * 14, (R() - 0.5) * 14);
          o.vel.multiplyScalar(0.93); shake = Math.min(1, shake + 0.06); if (R() < 0.3) audio.thud(0.4);
          dirt(b.pos, 3, 5); puff(b.pos, 1, 2, 1.2, false);
        }
      }
      if (b.rest) return;
    }
    b.vel.y -= 9.81 * dt;
    b.pos.addScaledVector(b.vel, dt);
    const wl = b.w.length(); if (wl > 1e-4) { dq.setFromAxisAngle(ax.copy(b.w).multiplyScalar(1 / wl), wl * dt); b.q.premultiply(dq).normalize(); }
    // the ground
    const gy = ground(b.pos.x, b.pos.z), low = b.pos.y - b.r;
    if (low < gy) {
      b.pos.y = gy + b.r;
      const vn = -b.vel.y;
      if (vn > 0) {
        b.vel.y = vn > 2 ? vn * b.e : 0;
        const hv = Math.hypot(b.vel.x, b.vel.z), cut = Math.min(hv, b.mu * (vn + 2.5)) ;
        if (hv > 1e-3) { b.vel.x -= (b.vel.x / hv) * cut * 0.5; b.vel.z -= (b.vel.z / hv) * cut * 0.5; }
        b.w.multiplyScalar(vn > 3 ? 0.78 : 0.97);
        if (vn > 4 && b.kind === "chassis") { dirt(tmp.set(b.pos.x, gy, b.pos.z), vn * 1.2, vn * 0.7); puff(tmp, 2, 2, 1, false); shake = Math.min(1, shake + vn * 0.03); if (vn > 6) audio.thud(clamp(vn / 12, 0.2, 0.9)); spark(tmp, tmp3.copy(b.vel).normalize(), vn * 2, 3); }
      }
      // sliding along the ground
      const hv2 = Math.hypot(b.vel.x, b.vel.z);
      const fr = b.kind === "chassis" ? 0.55 : 0.8;
      if (hv2 > 0.01) { const k = Math.exp(-fr * dt * (b.kind === "chassis" ? 1 : 1.4)); b.vel.x *= k; b.vel.z *= k; }
      b.w.multiplyScalar(Math.exp(-(b.kind === "chassis" ? 1.8 : 2.4) * dt));
      if (b.kind === "chassis" && hv2 > 4 && R() < 0.8) {
        const upsideDown = upv.set(0, 1, 0).applyQuaternion(b.q).y < 0.2;
        spark(tmp.set(b.pos.x, gy + 0.05, b.pos.z), tmp3.set(b.vel.x, 0, b.vel.z).normalize(), (upsideDown ? 3 : 1.4) * hv2 * 0.1);
        if (R() < 0.4) puff(tmp, 1, 2, 1.1, R() < 0.5);
      }
      // settle into a resting pose: wheels down, or on the roof if it landed that way
      if (b.kind === "chassis" && hv2 < 3 && b.w.length() < 1.4) {
        upv.set(0, 1, 0).applyQuaternion(b.q);
        const inv = upv.y < 0;
        const e = new T.Euler().setFromQuaternion(b.q, "YXZ");
        qUp.setFromEuler(new T.Euler(inv ? Math.PI : 0, e.y, 0, "YXZ"));
        b.q.slerp(qUp, Math.min(1, 3 * dt));
      }
    }
    b.vel.multiplyScalar(1 - 0.02 * dt);
    wall(b, dt);
    b.obj.position.copy(b.pos); b.obj.quaternion.copy(b.q);
  }

  // chassis versus chassis (the T-bone scene)
  function collide(a: Body, c: Body) {
    tmp.subVectors(c.pos, a.pos); const d = tmp.length(), min = 1.9;
    if (d >= min || d < 1e-4) return;
    tmp.multiplyScalar(1 / d); const rel = tmp2.subVectors(c.vel, a.vel).dot(tmp);
    a.pos.addScaledVector(tmp, -(min - d) / 2); c.pos.addScaledVector(tmp, (min - d) / 2);
    if (rel < 0) {
      const j = -(1.5) * rel / 2; a.vel.addScaledVector(tmp, -j); c.vel.addScaledVector(tmp, j);
      a.w.add(tmp3.set((R() - 0.5) * 16, (R() - 0.5) * 14, (R() - 0.5) * 16)); c.w.add(tmp3.set((R() - 0.5) * 16, (R() - 0.5) * 14, (R() - 0.5) * 16));
      const mid = tmp2.addVectors(a.pos, c.pos).multiplyScalar(0.5);
      spark(mid, tmp3.copy(tmp), 40); shards(mid, tmp3.copy(tmp).multiplyScalar(6), 30); blazing(mid, 14); shake = Math.min(1.3, shake + 0.5); flash = Math.max(flash, 0.6); audio.crunch(1);
      loseNext();
    }
  }

  // ---------------------------------------------------------------- camera
  const cam = new T.PerspectiveCamera(50, ctx.camera.aspect, 0.3, 2600);
  const camPos = new T.Vector3(), camTgt = new T.Vector3(); let camInit = -1, rigFov = 50, rigRoll = 0, rigIdx = -1, rigT0 = 0, a0 = 0, wheelBody: Body | null = null;
  const inAng = Math.atan2(In.z, In.x);
  const eyeLocal = new T.Vector3(EYE_POS.x, EYE_POS.y - 0.45 + 0.0, EYE_POS.z);
  const flipQ = new T.Quaternion().setFromAxisAngle(UP, Math.PI);
  const vdir = new T.Vector3().copy(Tn);
  function above(p: any, m = 0.5) { const gy = ground(p.x, p.z); if (p.y < gy + m) p.y = gy + m; return p; }
  function setRig(name: Rig, t: number, st: number, dt: number) {
    const c = chassis.pos, k = ease((t - rigT0) / Math.max(0.5, (def.rigs[rigIdx]![1] > 50 ? 7 : def.rigs[rigIdx]![1]) - rigT0));
    const desired = tmp, hv = Math.hypot(chassis.vel.x, chassis.vel.z);
    if (hv > 3) { vdir.lerp(tmp3.set(chassis.vel.x, 0, chassis.vel.z).normalize(), 1 - Math.exp(-dt / 0.4)); vdir.normalize(); }
    rigRoll = 0; cam.near = 0.3;
    let fov = 50, snap = false;
    switch (name) {
      case "chase": desired.copy(c).addScaledVector(vdir, -13).add(tmp2.set(0, 4.2, 0)); camTgt.copy(c).add(tmp2.set(0, 0.7, 0)); fov = 52; break;
      case "trackside": if (camInit !== rigIdx) { camPos.copy(P0).addScaledVector(Tn, 26).addScaledVector(In, 6).add(tmp2.set(0, 1.7, 0)); snap = true; } desired.copy(camPos); camTgt.copy(c).add(tmp2.set(0, 0.6, 0)); fov = 40 - 18 * k; break;
      case "orbit": { const ang = inAng + (t - rigT0) * 0.5 * (side > 0 ? 1 : -1), r = 11 + 4 * k; desired.set(c.x + Math.cos(ang) * r, c.y + 2.4 + 3.5 * k, c.z + Math.sin(ang) * r); camTgt.copy(c).add(tmp2.set(0, 0.6, 0)); fov = 50; break; }
      case "heli": desired.copy(c).add(tmp2.set(Math.sin(t * 0.3) * 7 - vdir.x * 8, 27, Math.cos(t * 0.3) * 7 - vdir.z * 8)); camTgt.copy(c); fov = 46; break;
      case "ground": if (camInit !== rigIdx) { camPos.copy(P0).addScaledVector(Tn, 12).addScaledVector(In, 3.2).add(tmp2.set(0, 0.45, 0)); snap = true; } desired.copy(camPos); camTgt.copy(c); fov = 76 - 16 * k; rigRoll = Math.sin(t * 17) * 0.012 * shake; break;
      case "under": desired.set(c.x + In.x * 5 + vdir.x * 5, ground(c.x, c.z) + 0.35, c.z + In.z * 5 + vdir.z * 5); camTgt.copy(c); fov = 66; break;
      case "onboard": tmp2.copy(eyeLocal).applyQuaternion(chassis.q); desired.copy(c).add(tmp2); cam.quaternion.copy(chassis.q).multiply(flipQ); cam.near = 0.05; fov = 84; snap = true; break;
      case "wheel": { if (!wheelBody || wheelBody.dead) wheelBody = bodies.find((b) => b.kind === "part" && b.r >= 0.4) || null; if (wheelBody) { desired.copy(wheelBody.pos).addScaledVector(tmp2.copy(wheelBody.vel).setY(0).normalize(), -4.5).add(tmp3.set(0, 1.8, 0)); camTgt.copy(wheelBody.pos); fov = 56; } else { desired.copy(c).addScaledVector(vdir, -13).add(tmp2.set(0, 4.2, 0)); camTgt.copy(c); fov = 52; } break; }
      case "tv": desired.copy(P0).addScaledVector(Tn, -52).addScaledVector(In, 34).add(tmp2.set(0, 12, 0)); camTgt.copy(c); fov = 38 - 20 * k; snap = true; break;
      case "zoom": desired.copy(P0).addScaledVector(Tn, -2.6 - 14 * k).addScaledVector(In, 3.6 + 6 * k).add(tmp2.set(0, 1.3 + 4 * k, 0)); camTgt.copy(c); fov = 76 - 40 * k; snap = true; break;
      case "whip": { const ang = inAng + (1 - Math.exp(-(t - rigT0) * 1.5)) * 2.7 * (side > 0 ? 1 : -1), r = 16; desired.set(c.x + Math.cos(ang) * r, c.y + 2.5, c.z + Math.sin(ang) * r); camTgt.copy(c); fov = 48; break; }
    }
    if (name !== "onboard") {
      if (snap || camInit !== rigIdx) { camPos.copy(desired); camInit = rigIdx; } else camPos.lerp(desired, 1 - Math.exp(-dt / (name === "chase" || name === "heli" || name === "under" || name === "wheel" ? 0.3 : 0.08)));
      cam.position.copy(above(tmp.copy(camPos), 0.4));
    } else { camInit = rigIdx; cam.position.copy(desired); }
    rigFov += (fov - rigFov) * (1 - Math.exp(-dt / 0.15));
    if (name !== "onboard") { cam.up.set(0, 1, 0); cam.lookAt(camTgt); if (rigRoll) cam.rotateZ(rigRoll); }
    // shake from the impacts
    if (shake > 0.01) { cam.position.x += (R() - 0.5) * shake * 0.5; cam.position.y += (R() - 0.5) * shake * 0.4; cam.position.z += (R() - 0.5) * shake * 0.5; cam.rotateZ((R() - 0.5) * shake * 0.04); }
    cam.fov = rigFov; cam.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- 2D overlay: letterbox, flash, title, DISQUALIFIED
  function overlay(t: number, camName: string) {
    if (!g2) return; const W = cv.width, H = cv.height;
    g2.clearRect(0, 0, W, H);
    const bar = Math.round(H * 0.095 * ease(t / 0.35));
    g2.fillStyle = "#000"; g2.fillRect(0, 0, W, bar); g2.fillRect(0, H - bar, W, bar);
    if (flash > 0.01) { g2.fillStyle = `rgba(${flashColor},${Math.min(0.85, flash).toFixed(3)})`; g2.fillRect(0, 0, W, H); }
    g2.save(); g2.textBaseline = "alphabetic";
    // REPLAY tag
    const blink = Math.floor(t * 2) % 2 === 0;
    g2.fillStyle = blink ? "#ff2a2a" : "#7a1010"; g2.beginPath(); g2.arc(24, bar + 18, 5, 0, 7); g2.fill();
    g2.fillStyle = "#fff"; g2.font = "800 11px Inter, Arial, sans-serif"; g2.fillText("REPLAY", 36, bar + 22);
    g2.fillStyle = "rgba(255,255,255,.7)"; g2.font = "700 9px Inter, Arial, sans-serif"; g2.fillText("CAM " + (rigIdx + 1) + " - " + camName.toUpperCase(), 36, bar + 36);
    // title
    const a = ease((t - 0.7) / 0.5) * (1 - ease((t - 4.3) / 0.8));
    if (a > 0.01) {
      g2.globalAlpha = a; g2.textAlign = "center"; g2.fillStyle = "#fff"; g2.shadowColor = "rgba(0,0,0,.8)"; g2.shadowBlur = 14;
      g2.font = "900 38px 'Space Grotesk', Inter, Arial, sans-serif"; g2.fillText(def.title, W / 2, H - bar - 46);
      g2.shadowBlur = 0; g2.fillStyle = "#ffb52e"; g2.font = "700 12px Inter, Arial, sans-serif"; g2.fillText(def.sub.toUpperCase() + "   -   IMPACT " + Math.round(hit.speed) + " MPH   -   " + hit.g.toFixed(0) + " G", W / 2, H - bar - 24);
      g2.globalAlpha = 1;
    }
    const d = ease((t - 2.4) / 0.4);
    if (d > 0.01) {
      g2.translate(0, (1 - d) * -30); g2.globalAlpha = d; g2.textAlign = "right";
      g2.fillStyle = "rgba(190,10,10,.92)"; g2.fillRect(W - 232, bar + 12, 214, 34);
      g2.fillStyle = "#fff"; g2.font = "900 19px Inter, Arial, sans-serif"; g2.fillText("DISQUALIFIED", W - 28, bar + 36);
    }
    g2.restore();
  }

  // ---------------------------------------------------------------- the timeline
  let raf = 0, last = 0, t = 0, st = 0, reported = false, done = false, active = true, fireOn = false, boomed = false, fireT = 0, scrubT = def.scrub || 0;
  function slow(t: number) {
    const [a, b, m] = def.slow;
    if (t < a) return 1; if (t < a + 0.07) return 1 + (m - 1) * ease((t - a) / 0.07);
    if (t < b) return m; return m + (1 - m) * ease((t - b) / 1.3);
  }
  function tick(now: number) {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    if (!last) last = now; const realDt = Math.min(0.05, (now - last) / 1000); last = now;
    t += realDt; slowNow = slow(t);
    const dt = realDt * slowNow; st += dt;
    const sub = Math.max(1, Math.ceil(dt / 0.008));
    for (let s = 0; s < sub; s++) {
      const h = dt / sub;
      if (scrubT > 0 && chassis.pos) { scrubT -= h; chassis.vel.addScaledVector(In, -side * 0); tmp.set(-In.x, 0, -In.z); chassis.vel.addScaledVector(tmp, 9 * h); }
      for (const b of bodies) step(b, h);
      if (rival) collide(chassis, rival);
    }
    // parts come off one after the other after the first impact
    if (tImpact >= 0 && loseIdx < def.lose.length && st >= tImpact + 0.04 + loseIdx * (def.shatter ? 0.05 : 0.16)) { const lb = loseNext(); if (lb) { shards(lb.pos, lb.vel, 6); spark(lb.pos, tmp.copy(lb.vel).normalize(), 12); } }
    // continuing effects
    if (def.fire > 0 && st > 0.25) { fireOn = true; }
    if (fireOn && t < 6.6) { fireT += realDt; const rate = def.fire * 70; while (fireT > 1 / rate) { fireT -= 1 / rate; blazing(chassis.pos, 1); if (R() < 0.5) puff(tmp.copy(chassis.pos).add(tmp2.set(0, 0.6, 0)), 1, 5, 1.5, true); } }
    else if (def.smoke > 0.5 && t < 6.8 && R() < 0.5 * realDt * 60) puff(chassis.pos, 1, 3, 1.3, true, 1.2);
    if (def.boom && !boomed && st > def.boom) {
      boomed = true; audio.boom(1); flash = 1; flashColor = "255,190,110"; shake = 1.3;
      blazing(chassis.pos, 80); puff(chassis.pos, 40, 6, 2.4, true, 6); shards(chassis.pos, tmp.set(0, 3, 0), 40, 1.1); spark(chassis.pos, tmp.set(0, 2, 0), 80, 14);
      const e = detach("engine", 2.2); if (e) e.vel.y += 12;
      const ring = new T.Mesh(track(new T.TorusGeometry(1, 0.12, 4, 24)), track(new T.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, fog: false })));
      ring.position.copy(chassis.pos); ring.rotation.x = Math.PI / 2; ring.userData.ring = true; scene.add(ring); objs.push(ring);
    }
    for (const o of objs) if (o.userData && o.userData.ring) { const k = Math.min(1, (st - (def.boom || 0)) / 0.7); o.scale.setScalar(1 + k * 22); o.material.opacity = 0.7 * (1 - k); if (k >= 1) o.visible = false; }
    if (fxLight) { const e = (def.boom && st > def.boom) ? Math.max(0, 1 - (st - def.boom) / 1.4) : 0, k = Math.max(0, 1 - st / 0.5) * def.flash; fxLight.position.copy(chassis.pos).add(tmp.set(0, 2, 0)); fxLight.intensity = (e * 90 + k * 40) + (fireOn && t < 6.6 ? 6 + R() * 4 : 0); fxLight.color.setHex(fireOn || e > 0 ? 0xff8a30 : 0xffe0b0); }
    flash *= Math.exp(-realDt * 7); shake *= Math.exp(-realDt * 2.6);
    // particles
    cm[0] = cm[1] = cm[2] = 1;
    sparks.update(dt, -9, 0.4, false, (k) => 1 - k * 0.6);
    fire.update(dt, 5, 1.5, false, (k) => Math.max(0.05, 1 - k) * 1.2, (k) => { cm[0] = 1; cm[1] = Math.max(0.2, 1 - k * 0.8); cm[2] = Math.max(0.1, 1 - k * 1.5); });
    smoke.update(dt, 1.4, 0.6, false, (k) => 0.7 + k * 1.8 - Math.max(0, k - 0.75) * 7, (k) => { const m = 1 + k * 0.5; cm[0] = cm[1] = cm[2] = m; });
    dust.update(dt, 1.2, 1.3, false, (k) => 0.6 + k * 1.4 - Math.max(0, k - 0.7) * 3);
    debris.update(dt, -9.8, 0.1, true, (k) => 1 - Math.max(0, k - 0.82) * 5);
    // the director
    let idx = def.rigs.findIndex((r) => t < r[1]); if (idx < 0) idx = def.rigs.length - 1;
    if (idx !== rigIdx) { rigIdx = idx; rigT0 = t; camInit = -1; if (t > 0.1) { flash = Math.max(flash, 0.35); flashColor = "0,0,0"; } }
    const name = def.rigs[rigIdx]![0];
    car.parts.helmet.visible = name !== "onboard";
    setRig(name, t, st, realDt);
    world.update(realDt, cam.position);
    world.sky.mesh.position.copy(cam.position);
    ctx.aimSunAt(chassis.pos);
    ctx.setShadow(true);
    const sc = ctx.drawFrame(cam, false, name === "onboard" ? Math.min(0.8, Math.hypot(chassis.vel.x, chassis.vel.z) / 50) : 0.05 * slowNow, now);
    void sc;
    overlay(t, name);
    if (!reported && t > 5.9) { reported = true; if (ctx.hooks.showReport) ctx.hooks.showReport(def); }
    if (!done && t > 7.0) { done = true; if (ctx.hooks.done) ctx.hooks.done(); }
  }

  const api = {
    scene: def, index: pick,
    start() {
      // the moment of impact
      impacts = 0; flash = def.flash * 0.9; shake = 0.9; audio.crunch(1);
      if (def.scrub) audio.scrape(def.scrub + 0.8, 1);
      if (def.tyres) tyres.forEach((tr, i) => { void i; });
      raf = requestAnimationFrame(tick);
    },
    abort() { active = false; if (raf) cancelAnimationFrame(raf); },
    dispose() {
      active = false; if (raf) cancelAnimationFrame(raf);
      for (const o of objs) { if (o.parent) o.parent.remove(o); o.traverse && o.traverse((m: any) => { if (m.geometry && !disposables.includes(m.geometry)) m.geometry.dispose(); }); if (o.dispose) o.dispose(); }
      for (const d of disposables) if (d && d.dispose) d.dispose();
      kit.list().forEach((m: any) => m.dispose());
      audio.close();
      if (fxLight) fxLight.intensity = 0;
      if (ctx.ghost) ctx.ghost.group.visible = true;
      if (g2) g2.clearRect(0, 0, cv.width, cv.height);
    },
  };
  return api;
}
