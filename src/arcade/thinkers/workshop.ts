// @ts-nocheck
import { MB } from "../../world/infinite/mb";
import { makeKit } from "../f1/car";
import { concreteTexture } from "../car3d/tex";
import { createParticles } from "../car3d/fx";
import { createMechanic } from "./rig";
import * as P from "./props";

/**
 * The workshop and its four fast-forward clips (about ten seconds each, shown at a "▶▶ 6x" time-lapse pace):
 *   rings  - the mechanic opens the ring-expander pliers and fits the oil ring, the second ring and the top ring into their grooves,
 *            turns the gaps 120 degrees apart and tightens the ring compressor round the piston.
 *   piston - oils the bore, sets the piston in bore 1 and taps it down with the hammer handle, fits the rod cap on the crank and
 *            torques it (click), then turns the crank to watch the piston move.
 *   cam    - head gasket on the dowels, cylinder head lowered on, head bolts torqued in a spiral, camshaft into its journals, caps,
 *            timing chain on the sprockets (the crank turns it), valve cover.
 *   engine - hoist chained to the engine, pumped up off the stand, rolled to the project car, lowered into the bay onto its mounts,
 *            bonnet shut.
 * A missed timing check plays the same job with a fumble (a ring springs off, the piston catches on the deck, a bolt out of sequence,
 * the engine swings into the wing) and the fix.
 */
export type Step = "rings" | "piston" | "cam" | "engine";
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t); };
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const mix = (a: number[], b: number[], k: number) => [a[0]! + (b[0]! - a[0]!) * k, a[1]! + (b[1]! - a[1]!) * k, a[2]! + (b[2]! - a[2]!) * k] as [number, number, number];
/** piecewise path through keyframes [[t, [x,y,z]], ...] with easing between them */
function track(keys: Array<[number, number[]]>, t: number): [number, number, number] {
  if (t <= keys[0]![0]) return [...keys[0]![1]] as any;
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i]!, [b, vb] = keys[i + 1]!; if (t <= b) return mix(va, vb, ease((t - a) / (b - a))); }
  return [...keys[keys.length - 1]![1]] as any;
}
function num(keys: Array<[number, number]>, t: number) { const v = track(keys.map(([a, b]) => [a, [b, 0, 0]]), t); return v[0]; }

export function createWorkshop(T: any, scene: any, f: { shadow: number; amount: number }) {
  const kit = makeKit(T), own: any[] = [];
  const mine = <A>(a: A): A => { own.push(a); return a; };
  const group = new T.Group(); scene.add(group);
  scene.background = new T.Color(0x1a1d22);
  scene.fog = new T.Fog(0x1a1d22, 14, 30);

  // ------------------------------------------------------------------ room: floor, walls, roller door, windows, lights
  const ct = mine(concreteTexture(T, 8, [96, 98, 102])); ct.repeat.set(4, 3);
  const floor = new T.Mesh(mine(new T.PlaneGeometry(16, 12)), mine(new T.MeshStandardMaterial({ map: ct, roughness: 0.55, metalness: 0.05 })));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);
  const room = new MB(T, 600); room.jitter = 0.03; room.ao = { y0: 0, h: 1.2, k: 0.25 };
  room.box(0xcfd2d6, 16, 4.2, 0.2, 0, 2.1, -5.1); room.box(0x2a5ac8, 16, 1.1, 0.22, 0, 0.55, -5.08);             // back wall, painted dado
  room.box(0xcfd2d6, 0.2, 4.2, 12, -8, 2.1, 0); room.box(0x2a5ac8, 0.22, 1.1, 12, -7.98, 0.55, 0);
  room.box(0xb8bcc2, 0.2, 4.2, 12, 8, 2.1, 0);
  for (let k = 0; k < 14; k++) room.box(0x9aa0a8, 0.22, 0.06, 4.4, 7.92, 0.3 + k * 0.28, 1.0);                         // roller door slats
  room.box(0x30343a, 16, 0.2, 12, 0, 4.3, 0);                                                                              // ceiling
  for (const x of [-4, 0, 4]) for (const z of [-3, 1]) room.box(0x8d9299, 0.08, 0.08, 2.6, x, 3.9, z);                  // light rails
  // pegboard with tool shapes over the bench
  room.box(0x8a6a48, 2.8, 1.4, 0.04, -3, 1.85, -4.98);
  for (let k = 0; k < 9; k++) room.box(k % 3 === 0 ? 0xd2262d : 0x6a7078, 0.05, 0.3 + (k % 3) * 0.08, 0.03, -4.1 + k * 0.28, 1.9 + (k % 2) * 0.1, -4.94);
  for (let k = 0; k < 5; k++) room.box(0x9aa0a8, 0.24, 0.04, 0.03, -2.4 + k * 0.1, 2.3 - k * 0.06, -4.94, 0, 0, 0.5);
  // the workbench with a vice, a parts tray, rags; shelves, drums, tyres, a tool chest
  room.box(0x5a4a3a, 2.4, 0.08, 0.85, -3, 0.88, -3.55); room.box(0x3a2e24, 2.3, 0.82, 0.05, -3, 0.42, -3.92);
  for (const x of [-4.1, -1.9]) for (const z of [-3.9, -3.2]) room.box(0x2a2d33, 0.06, 0.86, 0.06, x, 0.43, z);
  room.box(0x1e2a24, 1.1, 0.01, 0.5, -3.2, 0.925, -3.5);                                                                   // rubber mat
  room.box(0x2a2d33, 0.16, 0.12, 0.16, -2.4, 0.98, -3.55); room.box(0x2a5ac8, 0.06, 0.08, 0.14, -2.47, 1.04, -3.55); room.box(0x2a5ac8, 0.06, 0.08, 0.14, -2.33, 1.04, -3.55);   // vice
  room.box(0xd2262d, 0.8, 1.0, 0.5, -5.4, 0.5, -4.6); for (let k = 0; k < 5; k++) room.box(0x1b1d22, 0.7, 0.03, 0.02, -5.4, 0.15 + k * 0.2, -4.34);   // tool chest
  for (let k = 0; k < 3; k++) room.box(0x6a7078, 2.2, 0.04, 0.5, 5.2, 0.6 + k * 0.7, -4.7);                                // shelves
  for (let k = 0; k < 7; k++) room.box([0xd2262d, 0x2a5ac8, 0xe0b020, 0x2e8a4e][k % 4]!, 0.3, 0.26, 0.3, 4.3 + k * 0.3, 0.75 + (k % 3) * 0.7, -4.7);
  for (const [x, z] of [[-6.8, 3.6], [-6.2, 3.9]]) room.cyl(0x2a5a8a, 0.3, 0.3, 0.9, x, 0.45, z, 12);                    // oil drums
  for (let k = 0; k < 4; k++) room.cyl(0x141417, 0.32, 0.32, 0.22, 6.6, 0.11 + k * 0.23, -2.8, 14);                        // tyre stack
  room.box(0xf2f2f4, 0.9, 1.2, 0.02, 2.4, 2.4, -4.98); room.box(0xd2262d, 0.8, 0.3, 0.025, 2.4, 2.75, -4.97);             // a poster
  group.add(room.build(kit, f.shadow > 0));
  // windows (daylight) and the fluorescent tubes
  const winMat = mine(new T.MeshBasicMaterial({ color: 0xcfe6ff, toneMapped: false }));
  for (const x of [-5.5, -1.5, 2.5]) { const w = new T.Mesh(mine(new T.PlaneGeometry(1.6, 0.7)), winMat); w.position.set(x, 3.4, -4.98); group.add(w); }
  const tube = mine(new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  for (const x of [-4, 0, 4]) for (const z of [-3, 1]) { const m = new T.Mesh(mine(new T.BoxGeometry(0.1, 0.05, 2.2)), tube); m.position.set(x, 3.84, z); group.add(m); }
  scene.add(new T.HemisphereLight(0xe6eef8, 0x4a4844, 1.1));
  const key = new T.DirectionalLight(0xfff4e6, 1.6); key.position.set(-3, 7, 4);
  if (f.shadow) { key.castShadow = true; key.shadow.mapSize.set(f.shadow, f.shadow); const c = key.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8; c.near = 1; c.far = 20; key.shadow.bias = -0.0004; }
  scene.add(key);
  const lamps = [new T.PointLight(0xf0f6ff, 14, 9, 1.6), new T.PointLight(0xf0f6ff, 14, 9, 1.6)];
  lamps[0]!.position.set(-3, 3.6, -3); lamps[1]!.position.set(1.5, 3.6, 0); lamps.forEach((l) => scene.add(l));

  // ------------------------------------------------------------------ the cast
  const mech = createMechanic(T, kit); group.add(mech.group);
  const pist = P.piston(T, kit); group.add(pist.group);
  const rings = [P.ring(T, kit, 0x3a3e45), P.ring(T, kit, 0x6a7078), P.ring(T, kit, 0xc9ced6)];   // oil, second, top
  rings.forEach((r) => group.add(r));
  const plier = P.pliers(T, kit); const comp = P.compressor(T, kit); group.add(comp);
  const blk = P.block(T, kit); blk.group.position.set(0, 0.74, -1.6); group.add(blk.group);
  const hd = P.head(T, kit), cam = P.camshaft(T, kit), gas = P.gasket(T, kit), vc = P.valveCover(T, kit);
  const caps = [0, 1, 2, 3, 4].map(() => P.camCap(T, kit));
  group.add(hd, cam, gas, vc); caps.forEach((c) => group.add(c));
  const chainA = P.chain(T, kit, [-0.04, 0], [0.4, 0.03]); chainA.mesh.position.set(0.27, 0.74, -1.6); group.add(chainA.mesh);
  const tw = P.torqueWrench(T, kit), ham = P.hammer(T, kit), can = P.oilCan(T, kit);
  const eng = P.engineAssembly(T, kit); group.add(eng);
  const hoist = P.hoist(T, kit); group.add(hoist.group);
  const car = P.projectCar(T, kit); car.group.position.set(3.4, 0, 1.4); car.group.rotation.y = -Math.PI / 2; group.add(car.group);
  // spare parts on the bench for a lived-in look
  const spare = new MB(T, 610); spare.jitter = 0.03; spare.ao = { y0: -9, h: 1, k: 0 };
  for (let k = 0; k < 3; k++) spare.cyl(0xc9ced6, 0.043, 0.043, 0.07, -3.9 + k * 0.12, 0.96, -3.7, 14);
  spare.box(0x2a2d33, 0.3, 0.06, 0.2, -3.75, 0.95, -3.3); spare.box(0xf2f2f4, 0.25, 0.01, 0.3, -2.0, 0.93, -3.35, 0, 0.3, 0);
  group.add(spare.build({ ...kit, lit: kit.metal }, true));
  const fx = createParticles(T, scene, 220, { additive: true, opacity: 0.95 });
  const oil = createParticles(T, scene, 80, { lit: true, opacity: 0.9 });
  // a sparkle / flash marker for "torqued" moments
  const flash = new T.Mesh(mine(new T.SphereGeometry(0.025, 8, 6)), mine(new T.MeshBasicMaterial({ color: 0x2fe27a, toneMapped: false, transparent: true })));
  group.add(flash);

  // ------------------------------------------------------------------ helpers
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const pose = mech.pose;
  const setPose = (x: number, z: number, yaw: number, crouch: number, lean: number, hl: number[], hr: number[], look: number[]) => {
    pose.x = x; pose.z = z; pose.yaw = yaw; pose.crouch = crouch; pose.lean = lean; pose.hl = hl as any; pose.hr = hr as any; pose.look = look as any; mech.apply();
  };
  const holdR = (obj: any, px = 0, py = 0, pz = 0.06, rx = 0, ry = 0, rz = 0) => { if (obj.parent !== mech.toolR) { mech.toolR.add(obj); } obj.position.set(px, py, pz); obj.rotation.set(rx, ry, rz); obj.visible = true; };
  const holdL = (obj: any, px = 0, py = 0, pz = 0.06, rx = 0, ry = 0, rz = 0) => { if (obj.parent !== mech.toolL) { mech.toolL.add(obj); } obj.position.set(px, py, pz); obj.rotation.set(rx, ry, rz); obj.visible = true; };
  const putDown = (obj: any, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { if (obj.parent !== group) group.add(obj); obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); obj.visible = true; };
  const hide = (...objs: any[]) => objs.forEach((o) => { o.visible = false; });
  const show = (...objs: any[]) => objs.forEach((o) => { o.visible = true; });
  const blkPos = blk.group.position, bore1 = V(blkPos.x - 0.135, blkPos.y + 0.32, blkPos.z);
  let flashT = 0;
  const pop = (x: number, y: number, z: number, color = 0x2fe27a) => { flash.position.set(x, y, z); flash.material.color.setHex(color); flashT = 0.35; };
  const sparks = (x: number, y: number, z: number, n = 14, color = 0xffc040) => { for (let k = 0; k < n; k++) fx.spawn(x, y, z, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.012, 0.4, color, { g: 6, drag: 1, grow: 0 }); };

  // the scene before any job: parts where they live
  function resetScene(step: Step) {
    [pist.group, comp, plier.group, tw, ham, can, hd, cam, gas, vc, eng, hoist.group, ...rings, ...caps].forEach((o) => { if (o.parent !== group) group.add(o); o.visible = false; o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); });
    chainA.mesh.visible = false; blk.group.visible = true; blk.crank.rotation.x = 0; car.bonnet.rotation.x = -1.2; car.strut.visible = true;
    blk.group.position.set(0, 0.74, -1.6); blk.stand.visible = true;
    hoist.group.position.set(-1.2, 0, 0.6); hoist.group.rotation.y = 0; hoist.set(0.4); hoist.group.visible = step === "engine";
    if (step === "rings") {
      putDown(pist.group, -2.4, 1.12, -3.55); pist.rod.visible = true;
      rings.forEach((r, k) => putDown(r, -3.35 + k * 0.13, 0.93, -3.42));
      putDown(plier.group, -3.6, 0.94, -3.5, 0, 0.4, 0);
    }
    if (step === "piston") {
      putDown(pist.group, -2.4, 1.12, -3.55); putDown(comp, -2.4, 1.165, -3.55); rings.forEach((r, k) => putDown(r, -2.4, 1.154 + [0, 0.011, 0.021][k]!, -3.55, 0, k * 2.1, 0));
      putDown(can, -2.0, 0.96, -3.4); putDown(ham, -2.0, 0.95, -3.2, 0, 1.2, Math.PI / 2); putDown(tw, -1.8, 0.95, -3.1, 0, 0.8, Math.PI / 2);
    }
    if (step === "cam") {
      putDown(gas, -3.2, 0.93, -3.5); putDown(hd, -2.7, 0.93, -3.5); putDown(cam, -3.4, 0.95, -3.2); caps.forEach((c, k) => putDown(c, -2.1 + k * 0.06, 0.94, -3.25));
      putDown(tw, -1.8, 0.95, -3.1, 0, 0.8, Math.PI / 2); putDown(vc, -3.9, 0.93, -3.45);
    }
    if (step === "engine") {
      blk.group.visible = false; putDown(eng, 0, 0.78, -1.6); blk.stand.visible = false;
      // the stand stays visible under the engine (a copy of the block's stand)
      blk.group.visible = true; blk.group.children.forEach((c: any) => { c.visible = c === blk.stand; });
      show(hoist.group); car.bonnet.rotation.x = -1.2;
    }
    if (step !== "engine") blk.group.children.forEach((c: any) => { c.visible = true; });
    mech.toolR.clear(); mech.toolL.clear();
  }

  // ------------------------------------------------------------------ the clips: each returns the camera shots and an update(t)
  type Shot = [number, number[], number[], number];   // start time, camera position, look-at, fov
  const CLIPS: Record<Step, (ok: boolean) => { dur: number; shots: Shot[]; caption: (t: number) => string; update: (t: number) => void }> = {
    rings: (ok) => {
      const groove = [1.154, 1.165, 1.175], pc = [-2.4, 1.12, -3.55];
      const startR = (k: number) => [-3.35 + k * 0.13, 0.93, -3.42];
      const fumbleT = 6.6;
      return {
        dur: ok ? 10 : 11.5,
        shots: [[0, [-0.6, 2.0, -1.2], [-2.6, 1.0, -3.4], 50], [1.4, [-2.1, 1.36, -4.3], [-2.45, 1.13, -3.5], 30], [8.2, [-2.35, 1.62, -3.82], [-2.4, 1.15, -3.55], 26], [9.0, [-1.95, 1.32, -4.15], [-2.4, 1.14, -3.55], 32]],
        caption: (t) => t < 1.4 ? "Ring-expander pliers, rings laid out: oil ring, second ring, top ring" : t < 3.8 ? "Oil ring: open the pliers, slide it over the crown, down into the bottom groove" : t < 6 ? "Second compression ring (marking up) into the middle groove" : (!ok && t > fumbleT && t < fumbleT + 1.6) ? "MISSED: the top ring springs off the pliers and skids across the bench" : t < (ok ? 8.2 : 9.7) ? "Top compression ring into the top groove" : t < (ok ? 9 : 10.5) ? "Turn the ring gaps 120° apart so the gas cannot blow straight past" : "Ring compressor band round the piston: ready for the bore",
        update(t) {
          const off = ok ? 0 : 1.5;
          // the mechanic: walks in, then works at the vice
          const walk = seg(t, 0, 1.2), x = -1.6 + (-2.6 + 1.6) * walk;
          let hr: number[] = [x + 0.2, 0.95, -2.9], hl: number[] = [x - 0.2, 0.95, -2.9], look = pc;
          // which ring is moving (0..2) and how far along its journey it is
          const jobs = [[1.2, 3.8], [3.8, 6.0], [6.0, 8.2 + off]];
          rings.forEach((r, k) => {
            const [a, b] = jobs[k]!, u = (t - a) / (b - a);
            const pliersAt = (uu: number) => track([[0, startR(k)], [0.25, [startR(k)[0]!, 1.06, startR(k)[2]!]], [0.55, [pc[0]!, 1.24, pc[2]!]], [0.8, [pc[0]!, groove[k]! + 0.004, pc[2]!]], [1, [pc[0]!, groove[k]!, pc[2]!]]], uu);
            if (t < a) { r.position.set(...(startR(k) as [number, number, number])); r.scale.setScalar(1); r.rotation.set(0, 0, 0); return; }
            if (k === 2 && !ok && t > fumbleT && t < fumbleT + 1.6) {
              // the ring flies off, bounces and stops near the edge of the bench
              const ft = (t - fumbleT) / 1.6;
              const p = track([[0, [pc[0]!, 1.25, pc[2]!]], [0.25, [pc[0]! - 0.25, 1.1, pc[2]! + 0.12]], [0.45, [pc[0]! - 0.45, 0.94, pc[2]! + 0.18]], [0.7, [pc[0]! - 0.55, 0.97, pc[2]! + 0.2]], [1, [pc[0]! - 0.62, 0.935, pc[2]! + 0.22]]], ft);
              r.position.set(...p); r.rotation.set(ft * 9, ft * 4, 0); r.scale.setScalar(1);
              if (Math.abs(ft - 0.45) < 0.02) sparks(p[0], p[1], p[2], 8, 0xe9eef5);
              hr = [pc[0]! - 0.05, 1.27, pc[2]! + 0.2]; look = p;
              return;
            }
            if (k === 2 && !ok && t >= fumbleT + 1.6 && t < fumbleT + 2.3) { const p = [pc[0]! - 0.62, 0.935, pc[2]! + 0.22]; r.position.set(...(p as [number, number, number])); r.rotation.set(0, 0, 0); hr = [p[0]!, 1.0, p[2]! + 0.06]; look = p; return; }
            const uu = k === 2 && !ok ? (t < fumbleT ? (t - a) / (fumbleT - a) * 0.5 : 0.5 + (t - fumbleT - 2.3) / (b - fumbleT - 2.3) * 0.5) : u;
            const p = pliersAt(clamp(uu));
            r.position.set(p[0], p[1], p[2]);
            const spread = uu > 0.2 && uu < 0.92 ? 1.16 : 1; r.scale.set(spread, 1, spread);
            r.rotation.set(0, uu >= 1 ? [0, 2.09, 4.19][k]! * seg(t, 8.2 + off, 9 + off) : 0, 0);
            if (uu > 0 && uu < 1) { hr = [p[0], p[1] + 0.04, p[2] + 0.13]; look = p; }
            if (Math.abs(uu - 0.93) < 0.012) sparks(p[0], p[1], p[2], 5, 0xe9eef5);
          });
          // pliers in the right hand while working, open while a ring is being carried
          if (t > 1.0 && t < 8.2 + off) {
            holdR(plier.group, 0, -0.01, 0.07);
            const k = t < 3.8 ? 0 : t < 6 ? 1 : 2, [a, b] = jobs[k]!, uu = (t - a) / (b - a);
            plier.open(uu > 0.2 && uu < 0.92 ? 1 : 0.2);
          } else if (t >= 8.2 + off) putDown(plier.group, -2.8, 0.94, -3.35, 0, 0.6, 0);
          // gaps turned with the thumbs, then the compressor band goes on
          if (t > 8.2 + off && t < 9 + off) { hr = [pc[0]! - 0.05, 1.18, pc[2]! + 0.06]; hl = [pc[0]! + 0.05, 1.18, pc[2]! + 0.06]; }
          if (t > 9 + off) {
            const k = seg(t, 9 + off, 9.8 + off); show(comp); comp.position.set(pc[0]!, 1.32 - k * 0.155, pc[2]!); comp.scale.set(1.15 - k * 0.15, 1, 1.15 - k * 0.15);
            hr = [pc[0]! + 0.08, 1.24 - k * 0.07, pc[2]! + 0.04]; hl = [pc[0]! - 0.08, 1.24 - k * 0.07, pc[2]! + 0.04];
            if (Math.abs(t - 9.85 - off) < 0.02) pop(pc[0]!, 1.18, pc[2]!);
          } else comp.visible = false;
          if (t < 1.2) { hr = [x + 0.25, 0.92, -2.95]; hl = [x - 0.25, 0.92, -2.95]; look = [-3, 1, -3.5]; }
          setPose(t < 1.2 ? x : -2.55, -2.9, Math.PI, 0.05, 0.25, hl, hr, look);
        },
      };
    },
    piston: (ok) => {
      const pcB = [-2.4, 1.12, -3.55], top = bore1.toArray();
      const fT = 5.0;
      return {
        dur: ok ? 10.2 : 11.6,
        shots: [[0, [1.4, 2.0, 0.6], [-1, 1.0, -2.6], 50], [2.0, [-0.5, 1.58, -2.4], [top[0]!, top[1]!, top[2]!], 32], [4.4, [-0.55, 1.3, -2.25], [top[0]!, top[1]! - 0.02, top[2]!], 28], [ok ? 6.6 : 8.0, [-0.6, 1.45, -2.45], [-0.1, 0.8, -1.62], 36], [ok ? 9.0 : 10.4, [0.95, 1.25, -2.3], [0, 0.85, -1.6], 40]],
        caption: (t) => t < 2 ? "Carry the piston, rings squeezed in the compressor, to the block" : t < 4.4 ? "A little oil in bore 1, the arrow on the crown points to the front" : (!ok && t > fT && t < fT + 1.4) ? "MISSED: a ring catches on the deck — stop, back it out, start again" : t < (ok ? 6.6 : 8.0) ? "Tap it down with the hammer handle until the crown is in the bore" : t < (ok ? 9 : 10.4) ? "Rod cap onto the crank journal, bolts torqued to 45 Nm (click)" : "Turn the crank by hand: the piston rides up and down",
        update(t) {
          const off = ok ? 0 : 1.4;
          let hr: number[] = [-1.6, 0.9, -2.7], hl: number[] = [-1.9, 0.9, -2.7], look: number[] = top, mx = -0.25, mz = -0.95, yaw = Math.PI, crouch = 0.05, lean = 0.2;
          // 0-2: carry from the bench to the block
          const carry = seg(t, 0, 2);
          if (t < 2) {
            const p = track([[0, pcB], [0.3, [pcB[0]!, 1.25, pcB[2]! + 0.2]], [1, [top[0]!, top[1]! + 0.25, top[2]!]]], carry);
            pist.group.position.set(...p); comp.position.set(p[0], p[1] + 0.045, p[2]); rings.forEach((r, k) => r.position.set(p[0], p[1] + [0.034, 0.045, 0.055][k]!, p[2]));
            hr = [p[0] + 0.06, p[1] + 0.03, p[2] + 0.04]; hl = [p[0] - 0.06, p[1] + 0.03, p[2] + 0.04];
            mx = -2.4 + (2.15) * carry; mz = -2.9 + 1.95 * carry; yaw = Math.PI - carry * 0.2; look = p;
          }
          // 2-4.4: oil the bore, line the piston up
          if (t >= 2 && t < 4.4) {
            const o = seg(t, 2, 3);
            if (t < 3) { holdR(can, 0, 0, 0.05, -0.6, 0, 0); hr = [top[0]! + 0.04, top[1]! + 0.18, top[2]! + 0.08]; if (Math.random() < 0.3) oil.spawn(top[0]!, top[1]! + 0.1, top[2]!, 0, -0.5, 0, 0.008, 0.6, 0xc8a040, { g: 3, drag: 0, grow: 0 }); }
            else { putDown(can, -0.4, 0.06, -1.2); }
            const p = [top[0]!, top[1]! + 0.25 - seg(t, 3, 4.4) * 0.2, top[2]!];
            pist.group.position.set(p[0]!, p[1]!, p[2]!); comp.position.set(p[0]!, Math.max(top[1]! + 0.03, p[1]! + 0.045), p[2]!); rings.forEach((r, k) => r.position.set(p[0]!, p[1]! + [0.034, 0.045, 0.055][k]!, p[2]!));
            if (t >= 3) { hr = [p[0]! + 0.06, p[1]! + 0.04, p[2]! + 0.03]; hl = [p[0]! - 0.06, p[1]! + 0.04, p[2]! + 0.03]; }
            mx = -0.25; mz = -0.95; look = top;
            hl = t < 3 ? [top[0]! - 0.1, top[1]! + 0.1, top[2]! + 0.1] : hl;
          }
          // 4.4-6.6: hammer taps; the piston goes in a step per tap (a fumble backs it out and starts again)
          if (t >= 4.4 && t < 6.6 + off) {
            holdR(ham, 0, 0, 0.05, 0, Math.PI, 0);
            const taps = (t - 4.4) / 0.36, phase = taps % 1;
            let depth = Math.min(1, Math.floor(taps) / 6);
            if (!ok) { if (t > fT && t < fT + 1.4) depth = 0.25 - seg(t, fT, fT + 0.7) * 0.25 + seg(t, fT + 0.7, fT + 1.4) * 0.0; else if (t >= fT + 1.4) depth = Math.min(1, Math.floor((t - fT - 1.4) / 0.36) / 6); }
            const y = top[1]! + 0.05 - depth * 0.1;
            pist.group.position.set(top[0]!, y, top[2]!); rings.forEach((r, k) => r.position.set(top[0]!, y + [0.034, 0.045, 0.055][k]!, top[2]!));
            comp.position.set(top[0]!, top[1]! + 0.03, top[2]!); comp.visible = depth < 0.95;
            const lift = phase < 0.5 ? phase * 2 : 2 - phase * 2;
            hr = [top[0]! + 0.02, y + 0.16 + lift * 0.18, top[2]! + 0.05]; hl = [top[0]! - 0.07, top[1]! + 0.05, top[2]! + 0.02];
            if (phase < 0.05 && depth < 1 && !(!ok && t > fT && t < fT + 1.4)) sparks(top[0]!, y + 0.08, top[2]!, 3, 0xd8dce2);
            if (!ok && Math.abs(t - fT) < 0.02) pop(top[0]!, top[1]!, top[2]!, 0xff4a3a);
            look = top;
          }
          // 6.6-9: the rod cap and the torque wrench underneath (the camera is low, looking up through the open bottom)
          const t2 = t - off;
          if (t2 >= 6.6) { putDown(ham, -0.3, 0.06, -1.1, 0, 1, Math.PI / 2); comp.visible = false; pist.group.position.set(top[0]!, top[1]! - 0.05 - 0.04 * Math.cos(blk.crank.rotation.x), top[2]!); rings.forEach((r, k) => r.position.set(top[0]!, pist.group.position.y + [0.034, 0.045, 0.055][k]!, top[2]!)); }
          if (t2 >= 6.6 && t2 < 9) {
            holdR(tw, 0, 0, 0.04, 0, 0, 0);
            const swing = ((t2 - 6.6) / 0.8) % 1, bolt = t2 < 7.8 ? -1 : 1;
            hr = [top[0]! + bolt * 0.03 + 0.25 * Math.cos(swing * 1.2), 0.62 + 0.05 * Math.sin(swing * 6), top[2]! + 0.3]; hl = [top[0]! - 0.05, 0.65, top[2]! + 0.15];
            mx = -0.2; mz = -0.8; crouch = 0.42; lean = 0.45; look = [top[0]!, 0.62, top[2]!];
            if (Math.abs(t2 - 7.7) < 0.02 || Math.abs(t2 - 8.9) < 0.02) pop(top[0]! + bolt * 0.03, 0.64, top[2]!);
          }
          // 9-10.2: turn the crank pulley by hand
          if (t2 >= 9) {
            putDown(tw, -0.3, 0.06, -1.3, 0, 0.6, Math.PI / 2);
            blk.crank.rotation.x = (t2 - 9) * 7;
            hr = [0.27, 0.72 + 0.05 * Math.sin((t2 - 9) * 7), -1.55 + 0.05 * Math.cos((t2 - 9) * 7)]; hl = [0.15, 0.95, -1.4]; mx = 0.6; mz = -1.0; yaw = -2.2; crouch = 0.15; lean = 0.3; look = top;
          }
          setPose(mx, mz, yaw, crouch, lean, hl, hr, look);
        },
      };
    },
    cam: (ok) => {
      const deck = blkPos.y + 0.32, bx = blkPos.x, bz = blkPos.z;
      const bolts: number[][] = []; for (const [x, z] of [[0, 0.075], [0, -0.075], [0.09, 0.075], [-0.09, -0.075], [0.09, -0.075], [-0.09, 0.075], [0.18, 0.075], [-0.18, -0.075], [0.18, -0.075], [-0.18, 0.075]]) bolts.push([bx + x!, deck + 0.1, bz + z!]);
      const fT = 5.2;
      return {
        dur: ok ? 10.4 : 11.6,
        shots: [[0, [1.3, 1.8, 0.4], [-1, 1.0, -2.4], 48], [2.0, [0.5, 1.62, -2.5], [bx, deck, bz], 38], [3.8, [0.12, 1.95, -2.05], [bx, deck + 0.1, bz], 34], [ok ? 6.2 : 7.4, [-0.45, 1.5, -2.3], [bx, deck + 0.18, bz], 32], [ok ? 8.2 : 9.4, [0.95, 1.15, -2.1], [bx + 0.24, deck - 0.1, bz], 36]],
        caption: (t) => t < 2 ? "New head gasket over the dowels on the block deck" : t < 3.8 ? "Lift the cylinder head over and lower it straight down" : (!ok && t > fT && t < fT + 1.2) ? "MISSED: a bolt tightened out of order — back them all off and start the spiral again" : t < (ok ? 6.2 : 7.4) ? "Head bolts torqued in a spiral from the middle out" : t < (ok ? 8.2 : 9.4) ? "Camshaft into its journals, caps on, lobes oiled" : "Timing chain over the sprockets; turn the crank and the cam follows. Valve cover on",
        update(t) {
          const off = ok ? 0 : 1.2;
          let hr: number[] = [-1.6, 0.95, -2.7], hl: number[] = [-1.9, 0.95, -2.7], look: number[] = [bx, deck, bz], mx = 0.0, mz = -0.95, yaw = Math.PI, crouch = 0.05, lean = 0.25;
          // gasket
          if (t < 2) {
            const p = track([[0, [-3.2, 0.93, -3.5]], [0.35, [-3.2, 1.2, -3.3]], [0.85, [bx, deck + 0.15, bz]], [1, [bx, deck + 0.002, bz]]], seg(t, 0, 2));
            gas.position.set(...p); show(gas); hr = [p[0] + 0.18, p[1] + 0.02, p[2] + 0.06]; hl = [p[0] - 0.18, p[1] + 0.02, p[2] + 0.06]; mx = -3 + 3 * seg(t, 0, 1.6); mz = -2.9 + 1.95 * seg(t, 0, 1.6); look = p;
          } else gas.position.set(bx, deck + 0.002, bz);
          // head
          if (t >= 2 && t < 3.8) {
            const p = track([[0, [-2.7, 0.93, -3.5]], [0.3, [-2.7, 1.25, -3.2]], [0.75, [bx, deck + 0.35, bz]], [1, [bx, deck + 0.004, bz]]], seg(t, 2, 3.8));
            hd.position.set(...p); show(hd); hr = [p[0] + 0.22, p[1] + 0.06, p[2] + 0.1]; hl = [p[0] - 0.22, p[1] + 0.06, p[2] + 0.1]; crouch = 0.12; lean = 0.35; look = p;
            mx = -2.4 + 2.4 * seg(t, 2, 3.2); mz = -2.9 + 1.95 * seg(t, 2, 3.2);
          } else if (t >= 3.8) hd.position.set(bx, deck + 0.004, bz);
          else hd.position.set(-2.7, 0.93, -3.5);
          // bolts in a spiral: the wrench visits each, a click flash on each; the fumble backs them off
          if (t >= 3.8 && t < 6.2 + off) {
            holdR(tw, 0, 0, 0.04);
            let k = Math.floor((t - 3.8) / 0.24);
            if (!ok) { if (t > fT && t < fT + 1.2) k = Math.max(0, 5 - Math.floor((t - fT) / 0.2)); else if (t >= fT + 1.2) k = Math.floor((t - fT - 1.2) / 0.24); }
            k = Math.min(9, k);
            const b = bolts[k]!, w = ((t - 3.8) / 0.24) % 1;
            hr = [b[0]! + 0.18 * Math.cos(w * 1.4), b[1]! + 0.03, b[2]! + 0.18 * Math.sin(w * 1.4) + 0.05]; hl = [bx - 0.15, deck + 0.12, bz + 0.18];
            if (w < 0.06) pop(b[0]!, b[1]!, b[2]!, !ok && t > fT && t < fT + 1.2 ? 0xff4a3a : 0x2fe27a);
            look = b; lean = 0.4;
          }
          // camshaft and caps
          const t2 = t - off;
          if (t2 >= 6.2) putDown(tw, -0.3, 0.06, -1.3, 0, 0.6, Math.PI / 2);
          if (t2 >= 6.2 && t2 < 8.2) {
            const p = track([[0, [-3.4, 0.95, -3.2]], [0.4, [bx, deck + 0.4, bz + 0.03]], [0.75, [bx, deck + 0.21, bz + 0.03]], [1, [bx, deck + 0.205, bz + 0.03]]], seg(t2, 6.2, 7.4));
            cam.position.set(...p); show(cam); hr = [p[0] + 0.15, p[1] + 0.03, p[2] + 0.08]; hl = [p[0] - 0.15, p[1] + 0.03, p[2] + 0.08]; look = p;
            caps.forEach((c, k) => { const ck = seg(t2, 7.4 + k * 0.14, 7.55 + k * 0.14); c.position.set(...mix([-2.1 + k * 0.06, 0.94, -3.25], [bx - 0.17 + k * 0.085, deck + 0.225, bz + 0.03], ck)); show(c); });
            if (t2 > 7.4) { const k = Math.min(4, Math.floor((t2 - 7.4) / 0.14)); hr = [bx - 0.17 + k * 0.085, deck + 0.26, bz + 0.1]; }
          }
          if (t2 >= 8.2) { cam.position.set(bx, deck + 0.205, bz + 0.03); caps.forEach((c, k) => c.position.set(bx - 0.17 + k * 0.085, deck + 0.225, bz + 0.03)); }
          // chain, crank turning, cam turning, valve cover
          if (t2 >= 8.2) {
            chainA.mesh.visible = true; chainA.mesh.position.set(bx + 0.24, blkPos.y - 0.04, bz); chainA.mesh.scale.set(1, (deck + 0.205 - (blkPos.y - 0.04)) / 0.4, 1);
            const turn = Math.max(0, t2 - 8.6); blk.crank.rotation.x = turn * 6; cam.rotation.x = turn * 3; chainA.advance(0.012);
            hr = [bx + 0.26, blkPos.y - 0.04 + 0.05 * Math.sin(turn * 6), bz + 0.06]; hl = [bx + 0.2, deck + 0.1, bz + 0.1]; mx = 0.55; mz = -1.15; yaw = -2.0; look = [bx + 0.25, deck - 0.1, bz];
            if (t2 > 9.6) { const k = seg(t2, 9.6, 10.2); vc.position.set(...mix([-3.9, 0.93, -3.45], [bx, deck + 0.24, bz], k)); show(vc); }
          }
          setPose(mx, mz, yaw, crouch, lean, hl, hr, look);
        },
      };
    },
    engine: (ok) => {
      const bay = new T.Vector3(...car.mount); car.group.localToWorld(bay);
      const fT = 6.4;
      return {
        dur: ok ? 10.6 : 12,
        shots: [[0, [0.9, 1.8, -3.2], [0, 1.2, -1.6], 44], [2.0, [-1.8, 1.5, 0.4], [0, 1.2, -1.2], 46], [4.4, [0.4, 3.2, 3.8], [1.3, 0.9, 0.4], 52], [ok ? 7.0 : 8.4, [2.1, 2.1, -0.4], [bay.x, bay.y + 0.25, bay.z], 40], [ok ? 9.4 : 10.8, [0.2, 1.6, 3.4], [3.0, 0.8, 1.4], 46]],
        caption: (t) => t < 2 ? "Chain from the hoist to the lifting eyes on the head" : t < 4.4 ? "Pump the hoist: the engine comes up off the stand" : (!ok && t > fT && t < fT + 1.4) ? "MISSED: the engine swings and knocks the wing — steady it, line it up again" : t < (ok ? 7 : 8.4) ? "Roll the hoist over to the car and swing the engine over the bay" : t < (ok ? 9.4 : 10.8) ? "Lower it onto the mounts, bolts in, chain off" : "Bonnet down. The engine is in the car",
        update(t) {
          const off = ok ? 0 : 1.4;
          let hr: number[] = [-0.6, 1.2, -1.2], hl: number[] = [-0.9, 1.2, -1.2], look: number[] = [0, 1, -1.6], mx = -0.9, mz = -0.6, yaw = Math.PI * 0.8, crouch = 0.05, lean = 0.15;
          // hoist base: beside the stand with the boom over the engine (facing -z), then rolled round to the car's nose (facing +x: the car
          // faces -x, so its bay opens toward the hoist and the legs go under the front)
          const roll = seg(t, 4.4, (ok ? 7 : 8.4) - 0.6);
          const rot = Math.PI - roll * Math.PI / 2, reach = 1.17;
          const hb = mix([0, 0, -1.6 + reach], [bay.x - reach, 0, bay.z], roll);
          hoist.group.position.set(hb[0], 0, hb[2]); hoist.group.rotation.y = rot;
          const bdx = Math.sin(rot), bdz = Math.cos(rot), back = [hb[0] - bdx * 0.75, hb[2] - bdz * 0.75];
          const lift = t < 2 ? 0 : seg(t, 2, 4.2) - (t > (ok ? 7 : 8.4) ? seg(t, ok ? 7 : 8.4, ok ? 8.8 : 10.2) * 0.62 : 0);
          hoist.set(0.2 + lift * 0.62);
          hoist.group.updateMatrixWorld(true);
          const hookW = new T.Vector3(); hoist.hook.getWorldPosition(hookW);
          // engine hangs under the hook (with a swing; the fumble swings it into the wing)
          let swing = Math.sin(t * 3.2) * 0.02 * (1 - seg(t, 7, 9));
          if (!ok && t > fT && t < fT + 1.4) { const k = (t - fT) / 1.4; swing = Math.sin(k * Math.PI) * 0.35; if (Math.abs(k - 0.5) < 0.02) { sparks(hookW.x + 0.3, hookW.y - 0.6, hookW.z, 18); pop(hookW.x + 0.3, hookW.y - 0.6, hookW.z, 0xff4a3a); } }
          const hang = [hookW.x + swing * bdz, Math.max(0.58, hookW.y - 0.88), hookW.z - swing * bdx];
          const p = t < 2 ? [0, 0.78, -1.6] : mix([0, 0.78, -1.6], hang, seg(t, 2, 2.5));
          eng.position.set(p[0]!, p[1]!, p[2]!); eng.rotation.y = 0;
          // mechanic: chains up (0-2), pumps the handle (2-4.4), pushes the hoist (4.4-7), guides the engine down (7-9.4), shuts the bonnet
          if (t < 2) { hr = [0.18, 1.32, -1.55]; hl = [-0.18, 1.32, -1.55]; mx = 0; mz = -0.95; yaw = Math.PI; look = [0, 1.3, -1.6]; lean = 0.2; }
          else if (t < 4.4) { const pump = Math.sin((t - 2) * 9); hr = [back[0]! + bdx * 0.45, 0.75 + pump * 0.18, back[1]! + bdz * 0.45]; hl = [back[0]! + bdx * 0.5 + 0.1, 0.95, back[1]! + bdz * 0.5]; mx = back[0]!; mz = back[1]!; yaw = rot; crouch = 0.2; lean = 0.35; look = [eng.position.x, eng.position.y, eng.position.z]; }
          else if (t < (ok ? 7 : 8.4)) { hr = [back[0]! + bdx * 0.5 + bdz * 0.15, 1.05, back[1]! + bdz * 0.5 - bdx * 0.15]; hl = [back[0]! + bdx * 0.5 - bdz * 0.15, 1.05, back[1]! + bdz * 0.5 + bdx * 0.15]; mx = back[0]!; mz = back[1]!; yaw = rot; lean = 0.45; look = [eng.position.x, eng.position.y, eng.position.z]; }
          else if (t < (ok ? 9.4 : 10.8)) { const e = eng.position; hr = [e.x + 0.25, e.y + 0.3, e.z + 0.25]; hl = [e.x - 0.1, e.y + 0.4, e.z + 0.3]; mx = e.x + 0.4; mz = e.z + 0.9; yaw = Math.PI + 0.3; lean = 0.35; look = [e.x, e.y, e.z]; if (Math.abs(t - (ok ? 9.2 : 10.6)) < 0.02) pop(e.x, e.y, e.z); }
          else { const k = seg(t, ok ? 9.4 : 10.8, ok ? 10.2 : 11.6); car.bonnet.rotation.x = -1.2 * (1 - k); car.strut.visible = k < 0.1; hr = [bay.x + 0.3, 1.0 + 0.4 * (1 - k), bay.z + 0.5]; hl = [bay.x - 0.3, 1.0 + 0.4 * (1 - k), bay.z + 0.5]; mx = bay.x + 0.1; mz = bay.z + 1.2; yaw = Math.PI; look = [bay.x, 0.9, bay.z]; }
          setPose(mx, mz, yaw, crouch, lean, hl, hr, look);
        },
      };
    },
  };

  let clip: ReturnType<(typeof CLIPS)["rings"]> | null = null, clipT = 0, done: (() => void) | null = null;
  let idle: Step = "rings";
  return {
    kit, mech,
    get playing() { return !!clip; },
    get clipTime() { return clipT; },
    get clipDur() { return clip ? clip.dur : 0; },
    caption() { return clip ? clip.caption(clipT) : ""; },
    /** set the scene for a step and put the camera on it (before the timing check) */
    ready(step: Step) { idle = step; clip = null; resetScene(step); CLIPS[step](true).update(0); },
    play(step: Step, ok: boolean, onDone: () => void) { resetScene(step); clip = CLIPS[step](ok); clipT = 0; done = onDone; },
    skip() { if (clip) { clipT = clip.dur; } },
    update(dt: number, camera: any) {
      flashT = Math.max(0, flashT - dt); flash.visible = flashT > 0; flash.scale.setScalar(1 + (0.35 - flashT) * 6); flash.material.opacity = flashT / 0.35;
      fx.camera(camera.position.x, camera.position.y, camera.position.z); fx.update(dt); oil.update(dt);
      let shot: any = null;
      if (clip) {
        clipT += dt;
        clip.update(Math.min(clipT, clip.dur));
        for (const s of clip.shots) if (clipT >= s[0]) shot = s;
        if (clipT >= clip.dur) { const d = done; clip = null; done = null; d && d(); }
      } else {
        // idle: the mechanic waits beside the job, the camera drifts slowly round it
        shot = idle === "rings" ? [0, [-1.6, 1.7, -1.6], [-2.6, 1.0, -3.4], 44] : idle === "engine" ? [0, [-1.8, 2.1, 2.2], [0.8, 0.9, -0.6], 50] : [0, [1.2, 1.7, 0.4], [-0.6, 0.9, -1.8], 46];
      }
      if (shot) {
        const now = performance.now() / 1000, d = Math.sin(now * 0.25) * 0.08;
        camera.position.set(shot[1][0] + d, shot[1][1], shot[1][2] - d); camera.lookAt(shot[2][0], shot[2][1], shot[2][2]);
        if (camera.fov !== shot[3]) { camera.fov = shot[3]; camera.updateProjectionMatrix(); }
      }
    },
    dispose() {
      scene.remove(group); fx.dispose(); oil.dispose(); chainA.dispose(); mech.dispose();
      group.traverse((o: any) => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); });
      own.forEach((o) => o && o.dispose && o.dispose()); kit.list().forEach((m: any) => m.dispose());
      scene.fog = null;
    },
  };
}
