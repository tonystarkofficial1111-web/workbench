// @ts-nocheck
import { createStage, createKeys, touchPad, loadLevel, saveLevel, setEnvironment, LEVEL_NAMES, type Level } from "../car3d/stage";
import { Vehicle, type CarSpec } from "../car3d/vehicle";
import { buildCar } from "../car3d/models";
import { createParticles, createMarks } from "../car3d/fx";
import { createCarAudio } from "../car3d/audio";
import { el, createMinimap, createBanner, fmtTime } from "../car3d/ui";
import { lsGet, lsSet } from "../../core/store";
import { WB_SOUND } from "../../core/sound";
import { DRIFT_MAPS, type DriftMap } from "./maps";
import { buildDriftWorld, type DriftWorld } from "./world";

declare const __WB_DBG__: boolean;

/**
 * Drift King 3D: night docks, a Nissan Skyline GT-R (R34) or a 2021 Ford Mustang GT 5.0, four courses of rising difficulty.
 * Drift (keep the car sliding at an angle) to build a chain of points; the multiplier grows the longer the slide lasts and with every
 * clipping zone you slide through. Hitting a wall or spinning loses the chain; on the pier, falling in the sea costs points too.
 */
export const DRIFT_CARS: Array<{ id: "skyline" | "mustang"; name: string; sub: string; col: number; acc: number; sound: "i6" | "v8"; stats: [number, number, number]; spec: CarSpec }> = [
  {
    id: "skyline", name: "Nissan Skyline GT-R (R34)", sub: "2.6 L twin-turbo straight six · 480 hp · rear-biased all-wheel drive", col: 0x1f4fbf, acc: 0x1a1c20, sound: "i6",
    stats: [7, 9, 8],
    spec: { name: "Skyline", mass: 1480, a: 1.28, b: 1.39, halfTrack: 0.76, cgH: 0.5, power: 358000, maxForce: 11500, front: 0.18, tyreB: 9, grip: 1.05, rearGrip: 0.97, steerMax: 0.66, brake: 15500, gears: [13, 22, 31, 40, 50, 62], idle: 950, redline: 8000, inertia: 1.0, spring: 1.8, lean: 0.9, wheelR: 0.33, wheelZ: [1.33, -1.33], assist: 0.95 },
  },
  {
    id: "mustang", name: "Ford Mustang GT 5.0 (2021)", sub: "5.0 L Coyote V8 · 460 hp · rear-wheel drive", col: 0xb3131a, acc: 0x111214, sound: "v8",
    stats: [9, 6, 7],
    spec: { name: "Mustang", mass: 1720, a: 1.32, b: 1.4, halfTrack: 0.81, cgH: 0.52, power: 343000, maxForce: 12200, front: 0, tyreB: 8.5, grip: 1.02, rearGrip: 0.93, steerMax: 0.64, brake: 16500, gears: [14, 24, 34, 44, 55, 68], idle: 750, redline: 7500, inertia: 1.08, spring: 1.6, lean: 1.1, wheelR: 0.35, wheelZ: [1.38, -1.34], assist: 0.85 },
  },
];

const SAVE = "wb-drift-v1";
interface Save { car: string; map: string; best: Record<string, Record<string, number>>; medals: Record<string, number> }
const load = (): Save => { const s = lsGet<Save>(SAVE, null as any) || ({} as Save); return { car: s.car || "skyline", map: s.map || "lot", best: s.best || {}, medals: s.medals || {} }; };
const store = (s: Save) => lsSet(SAVE, s);
const MEDAL = ["", "🥉 Bronze", "🥈 Silver", "🥇 Gold"];

export interface DriftGameOpts { done?: (score: number, mapId: string, carId: string) => void }

export function createDriftGame(host: HTMLElement, opts: DriftGameOpts = {}) {
  let inner: any = null;
  const save = load();
  const start = (level: Level) => { inner = run(host, level, save, opts, (l: Level) => { inner.dispose(); saveLevel(l); start(l); }); };
  start(loadLevel());
  return { dispose() { inner && inner.dispose(); } };
}

function run(host: HTMLElement, level: Level, save: Save, opts: DriftGameOpts, relaunch: (l: Level) => void) {
  host.innerHTML = "";
  const root = el("div", "c3d-root dk3", host);
  const view = el("div", "c3d-view", root);
  const stage = createStage(view, level);
  const T = stage.THREE, scene = stage.scene, camera = stage.camera, f = stage.f;
  stage.renderer.toneMappingExposure = 1.35;     // a night scene: lift the picture a little so the cars read against the dark
  setEnvironment(stage, "night");               // warm lamps in the paint and the glass
  // a showroom light over the car while the menu or the result is up
  const show = new T.SpotLight(0xffffff, 260, 30, 0.55, 0.6, 1.6);
  scene.add(show); scene.add(show.target);
  const keys = createKeys();
  const banner = createBanner(root);

  let map: DriftMap = DRIFT_MAPS.find((m) => m.id === save.map) || DRIFT_MAPS[0]!;
  let carDef = DRIFT_CARS.find((c) => c.id === save.car) || DRIFT_CARS[0]!;
  let world: DriftWorld = buildDriftWorld(T, scene, map, f);
  let car = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { lights: true, interior: "street" });
  scene.add(car.group);
  let v = new Vehicle(carDef.spec);
  let audio: any = null;
  const smoke = createParticles(T, scene, Math.round(900 * f.amount + 200), { lit: true, opacity: 0.3 });
  const sparks = createParticles(T, scene, 260, { additive: true, opacity: 0.95 });
  const marks = createMarks(T, scene, Math.round(2600 * f.amount + 600));

  // ---------------------------------------------------------------- HUD
  const hud = el("div", "c3d-hud", root);
  const hTotal = el("div", "c3d-big", hud), hChain = el("div", "c3d-chain", hud), hMult = el("div", "c3d-mult", hud);
  const angle = el("div", "c3d-angle", root), angleFill = el("i", "", angle), angleTxt = el("b", "", angle);
  const gauge = el("div", "c3d-gauge", root), gSpeed = el("b", "", gauge), gUnit = el("span", "", gauge, "MPH"), gGear = el("em", "", gauge);
  const lapBox = el("div", "c3d-lap", root);
  let mini = createMinimap(root, world.path, { width: map.width });
  const help = el("div", "c3d-help", root, "<b>W</b> gas · <b>S</b> brake · <b>A / D</b> steer · <b>Space</b> handbrake · <b>C</b> camera · <b>R</b> back on the course");
  const pad = matchMedia("(pointer: coarse)").matches ? touchPad(root, keys, [["◀", "KeyA"], ["▶", "KeyD"], ["E-BRAKE", "Space"], ["BRAKE", "KeyS"], ["GAS", "KeyW"], ["CAM", "KeyC"]]) : null;

  // ---------------------------------------------------------------- menu
  const menu = el("div", "c3d-menu", root);
  const result = el("div", "c3d-result", root);
  const countdown = el("div", "c3d-count", root);
  let state: "menu" | "count" | "run" | "result" = "menu";

  function medalFor(m: DriftMap, s: number) { return s >= m.medals[2] ? 3 : s >= m.medals[1] ? 2 : s >= m.medals[0] ? 1 : 0; }
  function renderMenu() {
    const stars = (k: number) => "★".repeat(k) + "☆".repeat(4 - k);
    menu.innerHTML =
      `<div class="c3d-menu-card"><div class="c3d-title"><span>DRIFT KING</span> · NIGHT DOCKS</div>` +
      `<div class="c3d-sec">Car</div><div class="c3d-cars">` +
      DRIFT_CARS.map((c) => `<button type="button" class="c3d-pick${c.id === carDef.id ? " on" : ""}" data-car="${c.id}"><b>${c.name}</b><small>${c.sub}</small>` +
        `<span class="c3d-stat"><em>Power</em><i style="width:${c.stats[0] * 10}%"></i></span><span class="c3d-stat"><em>Balance</em><i style="width:${c.stats[1] * 10}%"></i></span><span class="c3d-stat"><em>Grip</em><i style="width:${c.stats[2] * 10}%"></i></span></button>`).join("") +
      `</div><div class="c3d-sec">Course <small>each one is harder than the last</small></div><div class="c3d-maps">` +
      DRIFT_MAPS.map((m, i) => {
        const best = (save.best[m.id] || {})[carDef.id] || 0, md = save.medals[m.id] || 0;
        return `<button type="button" class="c3d-pick${m.id === map.id ? " on" : ""}" data-map="${m.id}"><b>${i + 1}. ${m.name}</b><span class="c3d-stars">${stars(m.stars)}</span><small>${m.blurb}</small>` +
          `<small class="c3d-best">Best ${best ? best.toLocaleString() : "—"}${md ? " · " + MEDAL[md] : ""} · Gold ${m.medals[2].toLocaleString()}</small></button>`;
      }).join("") +
      `</div><div class="c3d-row"><button type="button" class="c3d-go" data-act="go">▶ Start · ${map.laps} laps</button><button type="button" class="c3d-gfx" data-act="gfx">◐ Graphics: ${LEVEL_NAMES[level]}</button></div>` +
      `<p class="c3d-note">Slide the car sideways and hold it there: points build while you drift, faster and at a bigger angle is worth more. Keep the slide going to raise the multiplier, and slide through the blue clipping zones for a bonus. Touching a wall or spinning out loses the points you have not banked.</p></div>`;
  }
  menu.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button") as HTMLElement; if (!t) return;
    WB_SOUND.click();
    if (t.dataset.car && t.dataset.car !== carDef.id) { carDef = DRIFT_CARS.find((c) => c.id === t.dataset.car)!; save.car = carDef.id; store(save); swapCar(); renderMenu(); }
    else if (t.dataset.map && t.dataset.map !== map.id) { map = DRIFT_MAPS.find((m) => m.id === t.dataset.map)!; save.map = map.id; store(save); swapMap(); renderMenu(); }
    else if (t.dataset.act === "go") begin();
    else if (t.dataset.act === "gfx") relaunch(((level + 1) % 3) as Level);
  });
  result.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button") as HTMLElement; if (!t) return;
    WB_SOUND.click();
    if (t.dataset.act === "again") begin();
    else if (t.dataset.act === "next") { const i = DRIFT_MAPS.indexOf(map); map = DRIFT_MAPS[(i + 1) % DRIFT_MAPS.length]!; save.map = map.id; store(save); swapMap(); begin(); }
    else if (t.dataset.act === "menu") toMenu();
  });

  function swapCar() {
    scene.remove(car.group); car.dispose();
    car = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { lights: true, interior: "street" }); scene.add(car.group); fitCabin();
    v = new Vehicle(carDef.spec); placeAtStart();
    if (audio) { audio.dispose(); audio = null; }
  }
  function swapMap() {
    scene.remove(car.group); car.dispose(); world.dispose(); mini.el.remove(); marks.clear(); smoke.clear();
    world = buildDriftWorld(T, scene, map, f);
    car = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { lights: true, interior: "street" }); scene.add(car.group); fitCabin();
    mini = createMinimap(root, world.path, { width: map.width });
    v = new Vehicle(carDef.spec); placeAtStart();
  }
  function placeAtStart() { v.place(world.start.x, world.start.z, world.start.h); car.update(v, 0, false); }

  // ---------------------------------------------------------------- run state
  const run = { total: 0, chain: 0, mult: 1, driftT: 0, idleT: 0, laps: 0, prog: 0, lastI: 0, time: 0, maxAngle: 0, longest: 0, clips: 0, hits: 0, freeze: 0, clipped: new Set<number>(), best: 0 };
  function resetRun() {
    Object.assign(run, { total: 0, chain: 0, mult: 1, driftT: 0, idleT: 0, laps: 0, prog: 0, lastI: 0, time: 0, maxAngle: 0, longest: 0, clips: 0, hits: 0, freeze: 0, best: 0 });
    run.clipped = new Set(); marks.clear(); smoke.clear();
  }
  let countT = 0;
  function begin() {
    resetRun(); placeAtStart();
    menu.classList.remove("on"); result.classList.remove("on");
    state = "count"; countT = 3.2;
    if (!audio) audio = createCarAudio(carDef.sound); audio.resume();
    stage.canvas.focus();
  }
  function toMenu() {
    state = "menu"; renderMenu(); menu.classList.add("on"); result.classList.remove("on"); countdown.classList.remove("on"); placeAtStart();
  }
  function bank(reason?: string) {
    if (run.chain > 0) {
      const c = Math.round(run.chain);
      run.total += c; run.best = Math.max(run.best, c);
      banner.show(`<b>+${c.toLocaleString()}</b><small>${reason || "banked"}</small>`, 1100, "good");
    }
    run.chain = 0; run.mult = 1; run.driftT = 0;
  }
  function lose(why: string, penalty: number) {
    run.chain = 0; run.mult = 1; run.driftT = 0;
    run.total = Math.max(0, run.total - penalty);
    banner.show(`<b>${why}</b>${penalty ? `<small>−${penalty}</small>` : ""}`, 1200, "bad");
  }
  function finish() {
    bank("final chain");
    state = "result"; countdown.classList.remove("on");
    const score = Math.round(run.total), md = medalFor(map, score);
    const prev = (save.best[map.id] || {})[carDef.id] || 0;
    save.best[map.id] = { ...(save.best[map.id] || {}), [carDef.id]: Math.max(prev, score) };
    save.medals[map.id] = Math.max(save.medals[map.id] || 0, md); store(save);
    if (md) WB_SOUND.win();
    result.innerHTML = `<div class="c3d-menu-card"><div class="c3d-title"><span>${map.name.toUpperCase()}</span> · RESULT</div>` +
      `<div class="c3d-score">${score.toLocaleString()}</div><div class="c3d-medal">${MEDAL[md] || "No medal yet"}${score > prev ? " · new best!" : ""}</div>` +
      `<div class="c3d-grid"><div><em>Time</em><b>${fmtTime(run.time)}</b></div><div><em>Biggest chain</em><b>${Math.round(run.best).toLocaleString()}</b></div><div><em>Max angle</em><b>${Math.round(run.maxAngle)}°</b></div>` +
      `<div><em>Longest drift</em><b>${run.longest.toFixed(1)} s</b></div><div><em>Clipping zones</em><b>${run.clips}</b></div><div><em>Wall hits</em><b>${run.hits}</b></div></div>` +
      `<p class="c3d-note">Bronze ${map.medals[0].toLocaleString()} · Silver ${map.medals[1].toLocaleString()} · Gold ${map.medals[2].toLocaleString()}</p>` +
      `<div class="c3d-row"><button type="button" class="c3d-go" data-act="again">↻ Again</button><button type="button" data-act="next">Next course ▶</button><button type="button" data-act="menu">☰ Cars & courses</button></div></div>`;
    result.classList.add("on");
    try { opts.done && opts.done(score, map.id, carDef.id); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- camera
  const CAMS = ["Chase", "Far chase", "Bonnet", "High", "Cockpit"];
  let camMode = 0, camYaw = 0, camInit = false, orbit = 0;
  const camPos = new T.Vector3(), look = new T.Vector3(), tmpV = new T.Vector3(), camNear = { d: 0, h: 0, i: 0, side: 1 };
  const eyeV = new T.Vector3(), qBody = new T.Quaternion(), flipY = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI);
  // a soft light inside the cabin so the dash and the seats read at night
  const cabin = new T.PointLight(0xffe2c0, 0.9, 1.8, 1.5);
  const fitCabin = () => { car.body.add(cabin); cabin.position.set(car.eye[0] * 0.3, car.eye[1] - 0.22, car.eye[2] + 0.45); };
  fitCabin();
  let odo = carDef.id === "skyline" ? 48213 : 12087, trip = 0;
  function updateCamera(dt: number) {
    if (state === "menu" || state === "result") {
      orbit += dt * 0.18;
      const r = 8.5;
      camera.position.set(v.x + Math.sin(orbit) * r, 2.6, v.z + Math.cos(orbit) * r);
      camera.lookAt(v.x, 0.8, v.z); camera.fov = 50; camera.updateProjectionMatrix(); camInit = false;
      return;
    }
    const sp = v.speed, velYaw = sp > 3 ? Math.atan2(v.vx, v.vz) : v.h;
    let target = v.h + wrap(velYaw - v.h) * 0.62;
    if (!camInit) { camYaw = target; camInit = true; }
    camYaw += wrap(target - camYaw) * (1 - Math.exp(-dt * 5));
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    if (camMode === 4) {
      // from the driver's seat: rides on the body (roll, dive, bumps); the head sways with the g-forces
      car.group.updateMatrixWorld(true);
      const e = car.eye; eyeV.set(e[0] + Math.max(-0.05, Math.min(0.05, -v.ay * 0.005)), e[1] + 0.03, e[2] + 0.1);
      car.body.localToWorld(eyeV); camera.position.copy(eyeV);
      car.body.getWorldQuaternion(qBody); camera.quaternion.copy(qBody).multiply(flipY); camera.rotateX(0.02);
    } else if (camMode === 2) {
      // on the bonnet, looking where the car points
      const hx = Math.sin(v.h), hz = Math.cos(v.h);
      camera.position.set(v.x + hx * 0.6, v.y + 1.28 + v.heave, v.z + hz * 0.6);
      look.set(v.x + hx * 20, v.y + 1.0, v.z + hz * 20);
      camera.lookAt(look);
    } else {
      const dist = camMode === 1 ? 10 : camMode === 3 ? 13 : 6.4, hgt = camMode === 1 ? 3.6 : camMode === 3 ? 11 : 2.35;
      tmpV.set(v.x - fx * dist, v.y + hgt, v.z - fz * dist);
      // keep the camera on the course side of the walls (it would look out from inside a container otherwise)
      if (camMode !== 3) {
        const P = world.path; P.nearest(tmpV.x, tmpV.z, camNear);
        const i = camNear.i, rx = -P.fz[i]!, rz = P.fx[i]!, lat = (tmpV.x - P.px[i]!) * rx + (tmpV.z - P.pz[i]!) * rz;
        const wall = lat >= 0 ? world.wallR[i]! : world.wallL[i]!;
        if (wall !== Infinity && Math.abs(lat) > wall - 0.7) { const pull = Math.abs(lat) - (wall - 0.7), sd = lat >= 0 ? 1 : -1; tmpV.x -= rx * sd * pull; tmpV.z -= rz * sd * pull; tmpV.y += Math.min(2, pull * 0.4); }
      }
      camPos.lerp(tmpV, 1 - Math.exp(-dt * 9)); if (camPos.lengthSq() === 0 || camPos.distanceTo(tmpV) > 30) camPos.copy(tmpV);
      camera.position.copy(camPos);
      look.set(v.x + fx * 2.5, v.y + 0.9, v.z + fz * 2.5);
      camera.lookAt(look);
    }
    const fov = 64 + Math.min(14, sp * 0.3);
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); }
  }
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------------------------------------------------------------- course rules: walls, the sea, laps
  const near = { d: 0, h: 0, i: 0, side: 1 };
  const ground = () => ({ h: 0, s: { mu: 1, drag: 0, rough: 0.02, kind: "concrete" } });
  const groundFn = (x: number, z: number) => ground();
  function rules(dt: number) {
    const P = world.path;
    P.nearest(v.x, v.z, near);
    const i = near.i, rx = -P.fz[i]!, rz = P.fx[i]!;
    const lat = (v.x - P.px[i]!) * rx + (v.z - P.pz[i]!) * rz;
    const sd = lat >= 0 ? 1 : -1, wall = sd > 0 ? world.wallR[i]! : world.wallL[i]!;
    const HALF = 0.95;
    if (wall !== Infinity && Math.abs(lat) + HALF > wall) {
      const over = Math.abs(lat) + HALF - wall;
      v.x -= rx * sd * over; v.z -= rz * sd * over;
      const hit = v.bounce(-rx * sd, -rz * sd, 0.28, 0.82);
      if (hit > 2.2) {
        run.hits++;
        if (state === "run") lose("WALL", Math.round(Math.min(600, hit * 25)));
        audio && audio.impact(Math.min(1, hit / 15));
        const wx = v.x + rx * sd * HALF, wz = v.z + rz * sd * HALF;
        for (let k = 0; k < Math.min(40, hit * 3); k++) sparks.spawn(wx, 0.5, wz, (Math.random() - 0.5) * 6 + v.vx * 0.3, Math.random() * 4, (Math.random() - 0.5) * 6 + v.vz * 0.3, 0.07, 0.5, Math.random() < 0.5 ? 0xffc040 : 0xff7a20, { g: 9, drag: 1.5, grow: 0 });
      }
    }
    // the sea
    const q = world.quay;
    if (!(v.x > q.x0 && v.x < q.x1 && v.z > q.z0 && v.z < q.z1)) {
      for (let k = 0; k < 40; k++) smoke.spawn(v.x + (Math.random() - 0.5) * 3, -1.4, v.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4, 3 + Math.random() * 5, (Math.random() - 0.5) * 4, 0.4, 1.4, 0xdfeaf2, { g: 7, drag: 0.6, grow: 0.6 });
      audio && audio.impact(0.6);
      if (state === "run") lose("SPLASH!", 1000);
      backOnCourse(i);
    }
    // laps: count progress along the course (only forward progress counts)
    let di = i - run.lastI; if (di > P.n / 2) di -= P.n; if (di < -P.n / 2) di += P.n;
    if (Math.abs(di) < P.n / 4) run.prog += di;
    run.lastI = i;
    if (state === "run" && run.prog >= P.n * (run.laps + 1)) {
      run.laps++;
      run.clipped.clear();
      if (run.laps >= map.laps) finish();
      else banner.show(`<b>LAP ${run.laps + 1} / ${map.laps}</b>`, 1200);
    }
    return lat;
  }
  function backOnCourse(i?: number) {
    const P = world.path; if (i === undefined) { P.nearest(v.x, v.z, near); i = near.i; }
    const s = P.at(i / P.n);
    v.place(s.x, s.z, Math.atan2(s.fx, s.fz)); run.freeze = 1.2; marks.lift(); camInit = false;
  }

  // ---------------------------------------------------------------- scoring
  function scoring(dt: number, lat: number) {
    const deg = v.driftDeg, sp = v.speed;
    const backwards = v.u < -2;
    if ((deg > 105 || backwards) && sp > 4 && run.chain > 0) { lose("SPIN OUT", 0); return; }
    const drifting = deg > 12 && sp > 7 && !v.airborne;
    if (drifting) {
      run.driftT += dt; run.idleT = 0;
      run.longest = Math.max(run.longest, run.driftT);
      run.maxAngle = Math.max(run.maxAngle, deg);
      run.mult = Math.min(6, Math.max(run.mult, 1 + Math.floor(run.driftT / 2)));
      const af = Math.min(1.4, (deg - 10) / 30), spf = 0.5 + sp / 20;
      run.chain += 230 * af * spf * run.mult * dt;
      // clipping zones: slide through the marked strip by the wall
      world.clips.forEach((c, k) => {
        if (run.clipped.has(k)) return;
        if (Math.hypot(v.x - c.x, v.z - c.z) < 4.6) {
          run.clipped.add(k); run.clips++; c.lit = 1;
          const bonus = 500 * run.mult; run.chain += bonus; run.mult = Math.min(6, run.mult + 1);
          banner.show(`<b>CLIP! +${bonus}</b><small>×${run.mult}</small>`, 900, "clip");
          WB_SOUND.coin();
        }
      });
    } else if (run.chain > 0) {
      run.idleT += dt;
      if (run.idleT > 0.9) bank();
    }
  }

  // ---------------------------------------------------------------- effects
  const wp = new T.Vector3();
  function wheelWorld(k: number) {
    const p = car.wheelPos[k]!, c = Math.cos(v.h), s = Math.sin(v.h);
    return wp.set(v.x + p[0] * c + p[2] * s, 0.02, v.z - p[0] * s + p[2] * c);
  }
  function effects(dt: number) {
    const sp = v.speed, dirx = sp > 0.5 ? v.vx / sp : 0, dirz = sp > 0.5 ? v.vz / sp : 0;
    for (let k = 0; k < 4; k++) {
      const sl = v.slide[k]!, w = wheelWorld(k);
      marks.add(k, w.x, 0.021 + k * 0.0004, w.z, dirx, dirz, 0.13, sp > 2 ? sl : 0, 0x0c0c0e);
      if (k >= 2 && sl > 0.25 && sp > 3) {
        const n = Math.random() < sl * 1.1 * f.amount ? 1 : 0;
        for (let j = 0; j < n; j++) smoke.spawn(w.x + (Math.random() - 0.5) * 0.4, 0.3, w.z + (Math.random() - 0.5) * 0.4, v.vx * 0.25 + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.9, v.vz * 0.25 + (Math.random() - 0.5) * 1.5, 0.3 + Math.random() * 0.25, 1.3 + Math.random() * 1.0, Math.random() < 0.5 ? 0xe9ecf0 : 0xd8dbe0, { grow: 1.1, drag: 1.5 });
      }
    }
    smoke.camera(camera.position.x, camera.position.y, camera.position.z); sparks.camera(camera.position.x, camera.position.y, camera.position.z);
    smoke.update(dt); sparks.update(dt);
  }

  // ---------------------------------------------------------------- frame
  let hudT = 0;
  stage.onFrame((dt, now) => {
    for (const k of keys.taps()) {
      if (k === "KeyC" && state !== "menu") { camMode = (camMode + 1) % CAMS.length; banner.show(`<b>${CAMS[camMode]}</b>`, 700); camInit = false; }
      if (k === "KeyR" && state === "run") { lose("RESET", 0); backOnCourse(); }
    }
    let inp = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    if (state === "run" && run.freeze <= 0) inp = { throttle: keys.throttle() ? 1 : 0, brake: keys.brake() ? 1 : 0, steer: keys.steer(), handbrake: keys.handbrake() };
    if (state === "count") {
      const before = Math.ceil(countT); countT -= dt;
      const c = Math.ceil(countT);
      if (c !== before && c > 0) WB_SOUND.click();
      countdown.innerHTML = c > 0 ? `<b>${c}</b>` : "<b class=go>GO!</b>"; countdown.classList.add("on");
      if (countT <= 0) { state = "run"; WB_SOUND.launch(); setTimeout(() => countdown.classList.remove("on"), 600); }
      inp.throttle = keys.throttle() ? 0.25 : 0;   // rev it on the line
    }
    run.freeze = Math.max(0, run.freeze - dt);
    if (state !== "menu" && state !== "result") v.step(dt, inp, groundFn);
    if (state === "count") { v.u = 0; v.w = 0; v.om = 0; }
    const lat = rules(dt);
    if (state === "run") { run.time += dt; scoring(dt, lat); }
    car.update(v, dt, inp.brake > 0 || (state === "run" && inp.handbrake));
    // from the seat the glass would sit in front of the eyes; the dashboard instruments run while you can see them
    const inCab = camMode === 4 && (state === "run" || state === "count");
    car.body.children[1].visible = !inCab; cabin.visible = inCab;
    if (camera.near !== (inCab ? 0.04 : 0.1)) { camera.near = inCab ? 0.04 : 0.1; camera.updateProjectionMatrix(); }
    if (state === "run") { odo += (v.speed * dt) / 1609; trip += (v.speed * dt) / 1609; }
    if (inCab && car.gauges) car.gauges.update({ mph: v.speed * 2.237, rpm: v.rpm, redline: carDef.spec.redline, gear: v.gear, odo, trip, fuel: 0.82 - trip * 0.05, temp: 0.45 + (v.rpm / carDef.spec.redline) * 0.3 });
    effects(dt);
    world.update(dt, now / 1000, camera, { x: v.x, z: v.z });
    show.visible = state === "menu" || state === "result";
    if (show.visible) { show.position.set(v.x + 3, 9, v.z + 3); show.target.position.set(v.x, 0.5, v.z); show.target.updateMatrixWorld(); }
    updateCamera(dt);
    if (audio) audio.update(v.rpm, inp.throttle, Math.max(v.slide[2]!, v.slide[0]!), 0);
    banner.tick(now);
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.05;
      hTotal.textContent = Math.round(run.total).toLocaleString();
      hChain.textContent = run.chain > 0 ? "+" + Math.round(run.chain).toLocaleString() : "";
      hMult.textContent = run.chain > 0 ? "×" + run.mult : "";
      const deg = Math.min(90, v.driftDeg);
      angleFill.style.width = (deg / 90) * 100 + "%"; angleFill.className = deg > 12 && v.speed > 7 ? "on" : "";
      angleTxt.textContent = Math.round(deg) + "°";
      gSpeed.textContent = String(Math.round(v.speed * 2.237)); gGear.textContent = String(v.gear);
      lapBox.innerHTML = `<span>LAP</span><b>${Math.min(map.laps, run.laps + 1)}/${map.laps}</b><span>TIME</span><b>${fmtTime(run.time)}</b>`;
      mini.draw([{ x: v.x, z: v.z, color: "#ffd34d", h: v.h }], world.clips.map((c, k) => ({ x: c.x, z: c.z, color: run.clipped.has(k) ? "#2fe27a" : "#1fb6ff" })));
    }
  });

  renderMenu(); menu.classList.add("on"); placeAtStart();
  const dbg = typeof __WB_DBG__ !== "undefined" && __WB_DBG__;
  const api = {
    get v() { return v; }, get run() { return run; }, get state() { return state; }, get world() { return world; }, stage, keys, begin, toMenu, finish,
    pick(carId: string, mapId: string) { carDef = DRIFT_CARS.find((c) => c.id === carId) || carDef; map = DRIFT_MAPS.find((m) => m.id === mapId) || map; save.car = carDef.id; save.map = map.id; swapMap(); renderMenu(); },
    dispose() {
      if (disposed) return; disposed = true;
      stage.dispose(); keys.dispose(); pad && pad.dispose(); audio && audio.dispose(); world.dispose(); car.dispose(); smoke.dispose(); sparks.dispose(); marks.dispose();
      host.innerHTML = "";
      if (dbg && (window as any).__dk3 === api) (window as any).__dk3 = null;
    },
  };
  let disposed = false;
  stage.onDispose(() => api.dispose());          // the overlay was closed (its markup removed): stop the sound and the keys too
  if (dbg) (window as any).__dk3 = api;
  return api;
}
