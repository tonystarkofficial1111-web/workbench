// @ts-nocheck
import { buildRallyWorld } from "../rally/world";
import { rallyPath, type RallyMap } from "../rally/maps";
import { buildCar } from "../car3d/models";
import { Vehicle } from "../car3d/vehicle";
import { createParticles } from "../car3d/fx";

/**
 * The hill for stages 2 and 3 of Take Your Time: a tarmac mountain road with switchbacks. Stage 2 climbs from the bottom to the top,
 * stage 3 races back down against the AI. The cars run along the road; every shift changes your pace (a clean shift surges forward with a
 * pop from the exhaust, a missed one bogs down in smoke) while the AI keeps a steady pace, so the gap on screen is the gap in the game.
 */
const HILL: RallyMap = {
  id: "hill", name: "Hill Climb", stars: 1, blurb: "",
  pts: [[0, 0], [70, -20], [120, 20], [70, 50], [20, 70], [70, 110], [130, 120], [160, 170], [100, 200], [30, 190], [-20, 150], [-40, 90], [-50, 30]],
  width: 8.5, surface: "tarmac", laps: 1, mu: 1.0, muVerge: 0.6,
  height: (u) => 34 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2)),
  jumps: [], water: [],
  sky: ["#3f78c8", "#8fbde8", "#e4eef6"], sun: [0.5, 0.55, -0.6], sunColor: 0xfff1d8, sunI: 2.5, hemiSky: 0xbcd6f4, hemiGround: 0x4a5a32, hemiI: 1.0,
  fog: 0xbcd0e2, fogDensity: 0.0035, ground: [0x4f7a34, 0x3e6a2c, 0x56703c], scenery: "forest", weather: "clear", hills: 40, seed: 61,
};

export function createHill(T: any, scene: any, f: any) {
  const path = rallyPath(HILL);
  const world = buildRallyWorld(T, scene, HILL, path, f);
  const me = buildCar(T, world.kit, "hatch", 0x2e8a4e, 0xf2f2f4, {}), ai = buildCar(T, world.kit, "hatch", 0x9aa0a8, 0xd2262d, {});
  scene.add(me.group); scene.add(ai.group);
  const smoke = createParticles(T, scene, 300, { lit: true, opacity: 0.4 }), flame = createParticles(T, scene, 120, { additive: true, opacity: 0.95 });
  const vm = new Vehicle({ wheelR: 0.3 } as any), va = new Vehicle({ wheelR: 0.3 } as any);
  const st = { down: false, u: 0.02, ua: 0.03, sp: 0, spA: 0, target: 14, gear: 1, rpm: 0.3, shiftFx: 0, bog: 0, finish: false, t: 0, camCut: 0 };
  const place = (veh: Vehicle, model: any, u: number, lat: number, sp: number, dt: number) => {
    const s = path.at(u), s2 = path.at(u + 3 / path.total);
    veh.x = s.x + s.rx * lat; veh.z = s.z + s.rz * lat; veh.y = s.y; veh.h = Math.atan2(s.fx, s.fz);
    veh.slopeX = -Math.atan2(s2.y - s.y, 3); veh.slopeZ = 0; veh.u = sp; veh.steer = Math.max(-0.4, Math.min(0.4, -s.kap * 5));
    veh.roll = Math.max(-0.06, Math.min(0.06, -s.kap * sp * sp * 0.0007)); veh.pitch = 0;
    for (let w = 0; w < 4; w++) veh.wheelSpin[w] = (veh.wheelSpin[w]! + (sp / 0.3) * dt) % 6283;
    model.update(veh, dt, false);
  };
  return {
    path,
    start(down: boolean) {
      st.down = down; st.u = down ? 0.505 : 0.005; st.ua = st.u + 0.006; st.sp = 0; st.spA = 0; st.gear = 1; st.target = 12; st.finish = false; st.t = 0;
    },
    /** gear for the current shift window; `lead` 0..1 is how the score stands against the AI (0.5 = level) */
    gear(g: number) { st.gear = g; },
    shift(ok: boolean) {
      if (ok) { st.target = Math.min(st.down ? 34 : 26, st.target + 3.2); st.sp += 1.5; st.shiftFx = 0.5; }
      else { st.target = Math.max(8, st.target - 2.5); st.sp *= 0.8; st.bog = 1.2; }
      st.camCut = 1.4;
    },
    finish() { st.finish = true; },
    update(dt: number, camera: any) {
      st.t += dt;
      const end = st.down ? 0.995 : 0.495;
      // your car: chases its target speed; the AI holds a steady pace a little under a clean run
      const aiTarget = st.down ? 26 : 20;
      st.sp += Math.max(-8 * dt, Math.min(6 * dt, st.target - st.sp)); st.spA += Math.max(-8 * dt, Math.min(5 * dt, aiTarget - st.spA));
      if (st.u < end) st.u = Math.min(end, st.u + (st.sp * dt) / path.total); else st.sp = Math.max(0, st.sp - 10 * dt);
      if (st.ua < end) st.ua = Math.min(end, st.ua + (st.spA * dt) / path.total); else st.spA = Math.max(0, st.spA - 10 * dt);
      place(vm, me, st.u, -1.8, st.sp, dt); place(va, ai, st.ua, 1.8, st.spA, dt);
      // exhaust: pops on a clean shift, smoke when bogged
      const bx = vm.x - Math.sin(vm.h) * 2, bz = vm.z - Math.cos(vm.h) * 2;
      if (st.shiftFx > 0) { st.shiftFx -= dt; for (let k = 0; k < 2; k++) flame.spawn(bx, vm.y + 0.35, bz, -Math.sin(vm.h) * 2, 0.2, -Math.cos(vm.h) * 2, 0.08, 0.25, Math.random() < 0.5 ? 0xff8a20 : 0x40a0ff, { grow: 0.3, drag: 2 }); }
      if (st.bog > 0) { st.bog -= dt; if (Math.random() < 0.5) smoke.spawn(bx, vm.y + 0.4, bz, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 0.3, 1.6, 0x6a6e76, { grow: 1.4, drag: 1.2 }); }
      smoke.camera(camera.position.x, camera.position.y, camera.position.z); smoke.update(dt); flame.update(dt);
      world.update(dt, camera, { x: vm.x, z: vm.z });
      // camera: chase most of the time, a low side shot for a moment after each shift
      st.camCut = Math.max(0, st.camCut - dt);
      const fx = Math.sin(vm.h), fz = Math.cos(vm.h), rx = -Math.cos(vm.h), rz = Math.sin(vm.h);
      if (st.camCut > 0) { camera.position.set(vm.x + rx * 5 + fx * 3, vm.y + 1.0, vm.z + rz * 5 + fz * 3); camera.lookAt(vm.x, vm.y + 0.7, vm.z); }
      else if (st.finish) { const a = st.t * 0.3; camera.position.set(vm.x + Math.sin(a) * 7, vm.y + 2.6, vm.z + Math.cos(a) * 7); camera.lookAt(vm.x, vm.y + 0.6, vm.z); }
      else { camera.position.set(vm.x - fx * 7, vm.y + 2.8, vm.z - fz * 7); camera.lookAt(vm.x + fx * 4, vm.y + 0.8, vm.z + fz * 4); }
      if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
      return { lead: (st.u - st.ua) * path.total, speed: st.sp };
    },
    dispose() { scene.remove(me.group); scene.remove(ai.group); me.dispose(); ai.dispose(); smoke.dispose(); flame.dispose(); world.dispose(); },
  };
}
