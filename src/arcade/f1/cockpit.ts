// @ts-nocheck
import type * as THREE_NS from "three";
import { MB } from "../../world/infinite/mb";
import { buildF1Car, makeLink, EYE_POS } from "./car";
import type { F1Env } from "./env";
import { GEAR_MAX } from "./consts";

type T3 = typeof THREE_NS;

const LED_COLORS = [0x2fe27a, 0x2fe27a, 0x2fe27a, 0x2fe27a, 0x2fe27a, 0xff3b3b, 0xff3b3b, 0xff3b3b, 0xff3b3b, 0xff3b3b, 0x4a7bff, 0x4a7bff, 0x4a7bff, 0x4a7bff, 0x4a7bff];

/**
 * The driver's seat. A second, small scene that is drawn after the world with its own near plane: the car itself seen from the helmet (nose, front wing,
 * front tyres on their wishbones, sidepods, halo, mirrors), plus the steering wheel with a live screen and shift lights, and the driver's arms.
 * It is lit like the world (same sun, same sky reflections) and everything in it moves for real: the tyres steer and spin, the wheels rise and fall on
 * the suspension as the body rolls and dives, the wheel turns with the steering, and the mirrors show the road behind.
 */
export function createCockpit(T: T3, kit: any, env: F1Env, f: { level: number }) {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(64, 16 / 9, 0.04, 40);
  const hemi = new T.HemisphereLight(env.hemiSky, env.hemiGround, env.hemiI * 0.9);
  const sun = new T.DirectionalLight(env.sunColor, env.sunI * 0.9);
  scene.add(hemi); scene.add(sun); scene.add(sun.target);

  const car = buildF1Car(T, kit, "#c7212b", 0xf2f2f4);
  car.parts.helmet.visible = false;               // the camera is inside it
  car.parts.engine.visible = false; car.parts.rearWing.visible = false;
  scene.add(car.group);

  // ---------------------------------------------------------------- steering wheel
  const wheelRoot = new T.Group(), wheelRot = new T.Group();
  wheelRoot.position.set(0, 0.575, 0.5); wheelRoot.rotation.x = 0.5; wheelRoot.add(wheelRot);
  {
    const mb = new MB(T, 70); mb.ao = { y0: -1, h: 1, k: 0 }; mb.jitter = 0.01;
    mb.box(0x15171b, 0.2, 0.125, 0.03, 0, 0, 0);                                  // body
    mb.box(0x23272e, 0.215, 0.012, 0.034, 0, 0.065, 0); mb.box(0x23272e, 0.215, 0.012, 0.034, 0, -0.065, 0);
    for (const s of [-1, 1]) {
      mb.box(0x101114, 0.062, 0.17, 0.05, s * 0.135, -0.01, -0.012);                 // grips
      mb.box(0x2a2e35, 0.064, 0.012, 0.052, s * 0.135, 0.07, -0.012, 0, 0, 0, { jit: 0 });
      mb.box(0x23272e, 0.03, 0.1, 0.03, s * 0.095, 0.035, 0);                        // connecting bars
    }
    wheelRot.add(mb.build({ ...kit, lit: kit.cf }, false));
    const bm = new MB(T, 71); bm.ao = { y0: -1, h: 1, k: 0 }; bm.jitter = 0;
    const cols = [0xd63a3a, 0x2fbf7a, 0xe0a458, 0x4a7bff, 0xe9e9ee, 0xc24fd1];
    for (let i = 0; i < 3; i++) bm.cyl(cols[i + 3]!, 0.0085, 0.0085, 0.014, (i - 1) * 0.05, -0.048, -0.022, 10, Math.PI / 2, 0, 0, { jit: 0, mat: "lamp" });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) bm.cyl(cols[(k * 2 + (s > 0 ? 1 : 0)) % 6]!, 0.0085, 0.0085, 0.016, s * 0.135, 0.04 - k * 0.034, -0.04, 8, Math.PI / 2, 0, 0, { jit: 0, mat: "lamp" });
    wheelRot.add(bm.build(kit, false));
    // 5.63.0 detail: two rotary dials with their pointer, small thumb switches and a carbon trim plate
    const dm = new MB(T, 72); dm.ao = { y0: -1, h: 1, k: 0 }; dm.jitter = 0;
    for (const s of [-1, 1]) {
      dm.cyl(0x2a2e35, 0.014, 0.014, 0.018, s * 0.072, -0.052, -0.022, 8, Math.PI / 2, 0, 0, { jit: 0, mat: "metal" });
      dm.box(0xe9e9ee, 0.003, 0.012, 0.004, s * 0.072, -0.046, -0.032, 0, 0, s * 0.6, { jit: 0, noAO: true });
      dm.box(0x0e0f12, 0.012, 0.02, 0.012, s * 0.1, 0.052, -0.024, 0, 0, 0, { jit: 0 });
    }
    dm.box(0x23272e, 0.13, 0.012, 0.006, 0, -0.068, -0.018, 0, 0, 0, { jit: 0 });
    wheelRot.add(dm.build({ ...kit, lit: kit.cf }, false));
  }
  // shift paddles behind the grips: they flick when you change gear (right = up with Y, left = down with U)
  const paddles = [-1, 1].map((s) => {
    const pm = new T.Mesh(new T.BoxGeometry(0.05, 0.075, 0.008), new T.MeshStandardMaterial({ color: 0x1d2025, roughness: 0.45, metalness: 0.2 }));
    pm.position.set(s * 0.108, 0.01, 0.022); pm.rotation.y = s * 0.25; wheelRot.add(pm);
    return { mesh: pm, s, kick: 0 };
  });
  let lastGear = 1;
  // screen: its own canvas, redrawn about 30 times a second
  const sc = document.createElement("canvas"); sc.width = 256; sc.height = 128;
  const sg = sc.getContext("2d")!;
  const screenTex = new T.CanvasTexture(sc); screenTex.colorSpace = T.SRGBColorSpace; screenTex.anisotropy = 4;
  const screen = new T.Mesh(new T.PlaneGeometry(0.118, 0.06), new T.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.rotation.y = Math.PI; screen.position.set(0, 0.004, -0.0165); wheelRot.add(screen);
  // shift lights
  const leds = LED_COLORS.map((c, i) => {
    const mat = new T.MeshBasicMaterial({ color: 0x1b1f26 });
    const m = new T.Mesh(new T.BoxGeometry(0.0072, 0.0072, 0.006), mat); m.position.set((i - 7) * 0.0112, 0.0705, -0.019); wheelRot.add(m);
    return { mat, on: new T.Color(c).multiplyScalar(2.6), off: new T.Color(0x1b1f26) };
  });
  car.group.add(wheelRoot);

  // ---------------------------------------------------------------- arms: fixed shoulders, wrists on the turning grips
  const suit = new T.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.7, metalness: 0.1 });
  const suit2 = new T.MeshStandardMaterial({ color: 0xc7212b, roughness: 0.7, metalness: 0.1 });
  const glove = new T.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.1 });
  const arms = [-1, 1].map((s) => {
    const upper = makeLink(T, suit, 0.09), fore = makeLink(T, suit2, 0.075);
    const hand = new T.Mesh(new T.BoxGeometry(0.08, 0.075, 0.1), glove); hand.castShadow = false; hand.frustumCulled = false;
    const knuckle = new T.Mesh(new T.BoxGeometry(0.083, 0.014, 0.05), new T.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.5 })); knuckle.frustumCulled = false; hand.add(knuckle); knuckle.position.set(0, 0.04, -0.02);
    car.group.add(upper.mesh, fore.mesh, hand);
    return { s, upper, fore, hand };
  });

  // ---------------------------------------------------------------- mirrors: pictures rendered by the view from behind the car
  const mirrorTex: any[] = [null, null];
  const mirrors = [-1, 1].map((s) => {
    const mat = new T.MeshBasicMaterial({ color: 0x8aa0b8, toneMapped: false });
    const m = new T.Mesh(new T.PlaneGeometry(0.15, 0.082), mat);
    m.rotation.y = Math.PI + s * 0.5; m.position.set(s * 0.55, 0.66, 0.635); car.group.add(m);
    return { mat, mesh: m, s };
  });
  function setMirrorTexture(i: number, tex: any) { mirrors[i]!.mat.map = tex; mirrors[i]!.mat.color.setHex(0xffffff); mirrors[i]!.mat.needsUpdate = true; mirrorTex[i] = tex; }
  /** Without live mirrors (Low): a soft picture of the sky and the road. */
  function staticMirror() {
    const c = document.createElement("canvas"); c.width = 64; c.height = 32; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, "#" + new T.Color(env.skyMid).getHexString()); gr.addColorStop(0.45, "#" + new T.Color(env.skyHorizon).getHexString()); gr.addColorStop(0.5, "#3a3d44"); gr.addColorStop(1, "#23252a");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  // ---------------------------------------------------------------- per-frame
  const qc = new T.Quaternion(), flip = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI);
  const eyeV = new T.Vector3(), tmp = new T.Vector3(), tmp2 = new T.Vector3(), shoulder = new T.Vector3(), elbow = new T.Vector3(), wrist = new T.Vector3(), grip = new T.Vector3();
  const wq = new T.Quaternion(), wm = new T.Matrix4();
  let spin = 0, lastScreen = 0, lastDist = -1;
  const labelFont = "700 12px 'Space Grotesk', Inter, Arial, sans-serif";

  function drawScreen(p: any, now: number, extra: any) {
    if (now - lastScreen < 33) return; lastScreen = now;
    const g = sg; g.fillStyle = "#02060a"; g.fillRect(0, 0, 256, 128);
    const rpm = p.rpm || 0, hot = rpm >= 0.9 && p.gear < GEAR_MAX.length;
    g.fillStyle = "rgba(95,212,199,.07)"; for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 256, 1);
    g.textBaseline = "alphabetic";
    g.fillStyle = "#7f8b99"; g.font = labelFont; g.textAlign = "left"; g.fillText("MPH", 10, 22);
    g.fillStyle = "#e6edf3"; g.font = "800 30px 'Space Grotesk', Inter, Arial, sans-serif"; g.fillText(String(Math.round(p.speed)), 10, 54);
    g.textAlign = "center"; g.fillStyle = hot ? ((Math.floor(now / 120) % 2) ? "#ffb000" : "#ff5a00") : "#ffffff"; g.font = (p.gear >= 10 ? "900 70px" : "900 92px") + " 'Space Grotesk', Inter, Arial, sans-serif"; g.fillText(String(p.gear), 132, 90);
    g.textAlign = "right"; g.fillStyle = "#39ff88"; g.font = labelFont; g.fillText("ERS " + (extra.ers ?? 100) + "%", 246, 22);
    g.fillStyle = "#9fb0c0"; g.fillText(extra.lap || "", 246, 44);
    g.fillStyle = extra.deltaNeg ? "#37e0c8" : "#ff6b6b"; g.fillText(extra.delta || "", 246, 66);
    g.textAlign = "left"; g.fillStyle = "#7f8b99"; g.font = "700 10px Inter, Arial, sans-serif"; g.fillText(extra.comp || "", 10, 76);
    for (let i = 0; i < 24; i++) { g.fillStyle = rpm >= (i + 1) / 24 ? (i < 15 ? "#e8d63a" : "#ff4b3b") : "#15202a"; g.fillRect(10 + i * 9.7, 108, 8, 12); }
    screenTex.needsUpdate = true;
  }

  /**
   * Put everything where the game says it is. `worldQuat` is the world camera's orientation (it already carries the road, the slide, the roll and
   * dive), so the cockpit's own camera simply copies it and sits at the driver's eyes; the car is turned to match so the sky reflects correctly.
   */
  function update(p: any, now: number, dt: number, worldQuat: any, sunDir: any, extra: any) {
    // orientation: the car faces +z, the camera looks along -z
    qc.copy(worldQuat).multiply(flip); car.group.quaternion.copy(qc); car.group.position.set(0, 0, 0);
    // head sway: the driver's head moves with the g-forces, so near parts (wheel, halo) shift more than far ones
    const hx = -(p.gLat || 0) * 0.011 - (p.roll || 0) * 0.15, hy = (p.heave || 0) * -0.3 + Math.sin(now * 0.021) * (p.rumble || 0) * 0.004, hz = (p.gLong || 0) * 0.0012;
    eyeV.set(EYE_POS.x + hx, EYE_POS.y + hy, EYE_POS.z + hz).applyQuaternion(qc);
    camera.position.copy(eyeV); camera.quaternion.copy(worldQuat);
    // lights follow the sun, in world space
    sun.position.copy(sunDir).multiplyScalar(10); sun.target.position.set(0, 0, 0);
    // suspension, steering and wheel spin
    const steer = p.steer || 0;
    spin += (p.speed || 0) * dt * 0.7;
    car.setSuspension(p.wheel || [0, 0, 0, 0], steer);
    for (const w of car.wheels) w.rotation.x = spin;
    wheelRot.rotation.z = steer * 1.15;                 // seen from the seat (looking along +z) a positive turn about z is clockwise: right is right
    if (p.gear !== lastGear) { const up = p.gear > lastGear; paddles.forEach((q) => { if ((q.s < 0) === up) q.kick = 1; }); lastGear = p.gear; }
    paddles.forEach((q) => { q.kick = Math.max(0, q.kick - dt * 7); q.mesh.position.z = 0.022 - q.kick * 0.012; });
    // arms: wrists follow the grips as the wheel turns
    wheelRoot.updateMatrix(); wm.copy(wheelRoot.matrix);
    wheelRot.updateMatrix();
    for (const a of arms) {
      grip.set(a.s * 0.135, -0.03, -0.045).applyAxisAngle(tmp.set(0, 0, 1), wheelRot.rotation.z).applyMatrix4(wm);
      wrist.copy(grip);
      shoulder.set(a.s * 0.24, 0.50, -0.3);
      elbow.set(a.s * 0.36, 0.40, 0.14).lerp(tmp2.copy(shoulder).lerp(wrist, 0.5), 0.35); elbow.x += a.s * 0.02;
      a.upper.set(shoulder, elbow); a.fore.set(elbow, wrist);
      a.hand.position.copy(wrist); a.hand.rotation.set(0.36, 0, wheelRot.rotation.z * 0.5);
    }
    // shift lights follow the revs
    const lit = Math.round(Math.max(0, Math.min(1, ((p.rpm || 0) - 0.55) / 0.45)) * 15), blink = (p.rpm || 0) >= 0.98 && Math.floor(now / 90) % 2 === 0;   // shift lights: the last part of the rev range
    leds.forEach((l, i) => l.mat.color.copy(i < lit && !(blink && i > 4) ? l.on : l.off));
    drawScreen(p, now, extra);
    // the brake light stays off in the cockpit
    car.brake.visible = false;
  }

  return {
    scene, camera, car, sun, hemi, update, setMirrorTexture, staticMirror, mirrors,
    setEnv(e: F1Env) { hemi.color.setHex(e.hemiSky); hemi.groundColor.setHex(e.hemiGround); hemi.intensity = e.hemiI * 0.9; sun.color.setHex(e.sunColor); sun.intensity = e.sunI * 0.9; },
    dispose() {
      scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== kit.paint && !Object.values(kit).includes(o.material)) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      screenTex.dispose();
    },
  };
}
