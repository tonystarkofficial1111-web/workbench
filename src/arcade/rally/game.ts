// @ts-nocheck
import { createStage, createKeys, touchPad, loadLevel, saveLevel, setEnvironment, LEVEL_NAMES, type Level } from "../car3d/stage";
import { Vehicle, type CarSpec } from "../car3d/vehicle";
import { buildCar, type CarModel } from "../car3d/models";
import { createParticles, createMarks } from "../car3d/fx";
import { createCarAudio } from "../car3d/audio";
import { el, createMinimap, createBanner, fmtTime } from "../car3d/ui";
import { lsGet, lsSet } from "../../core/store";
import { WB_SOUND } from "../../core/sound";
import { RALLY_MAPS, rallyPath, type RallyMap } from "./maps";
import { buildRallyWorld, type RallyWorld } from "./world";

declare const __WB_DBG__: boolean;

/**
 * Rally 3D: like the F1 Cockpit, but off-road. Pick one of two rally cars and a stage, line up on the grid with three rival crews and race
 * two laps from the driver's seat (or a chase camera). The co-driver's pace notes warn of every bend, crest, jump and water crossing with a
 * countdown. Leave the road and you are on rough ground; go further and you hit the trees and rocks, which damages the car.
 */
export const RALLY_CARS: Array<{ id: "impreza" | "yaris"; name: string; sub: string; col: number; acc: number; stats: [number, number, number]; spec: CarSpec }> = [
  {
    id: "impreza", name: "Subaru Impreza WRX STI (rally)", sub: "2.0 L turbo flat four · 380 hp · all-wheel drive · soft and forgiving", col: 0x1d3f9e, acc: 0xe0b020,
    stats: [7, 9, 8],
    spec: { name: "Impreza", mass: 1250, a: 1.2, b: 1.32, halfTrack: 0.76, cgH: 0.5, power: 283000, maxForce: 10500, front: 0.45, tyreB: 7, grip: 1.0, rearGrip: 0.97, steerMax: 0.6, brake: 13500, gears: [11, 18, 25, 32, 40, 49], idle: 1000, redline: 7500, inertia: 0.95, spring: 1.45, lean: 1.3, wheelR: 0.34, wheelZ: [1.26, -1.26], assist: 0.55 },
  },
  {
    id: "yaris", name: "Toyota GR Yaris Rally1", sub: "1.6 L turbo + hybrid boost · 500 hp · all-wheel drive · sharp and fast", col: 0xf2f2f4, acc: 0xc8102e,
    stats: [9, 7, 9],
    spec: { name: "Yaris", mass: 1260, a: 1.24, b: 1.32, halfTrack: 0.8, cgH: 0.48, power: 368000, maxForce: 11800, front: 0.5, tyreB: 7.5, grip: 1.05, rearGrip: 0.95, steerMax: 0.62, brake: 14500, gears: [12, 20, 28, 36, 45, 55], idle: 1100, redline: 8500, inertia: 0.9, spring: 1.6, lean: 1.2, wheelR: 0.34, wheelZ: [1.28, -1.28], assist: 0.5 },
  },
];
const RIVALS = [
  { name: "K. Rovanperä-ish", kind: "yaris", col: 0x1b1d22, acc: 0xc8102e, skill: 0.92 },
  { name: "S. Loeb-ish", kind: "impreza", col: 0xd2262d, acc: 0xf2f2f4, skill: 0.88 },
  { name: "C. McRae-ish", kind: "impreza", col: 0x2a5ac8, acc: 0xffd34d, skill: 0.84 },
];

const SAVE = "wb-rally-v1";
interface Save { car: string; map: string; best: Record<string, Record<string, number>>; wins: Record<string, number> }
const load = (): Save => { const s = lsGet<Save>(SAVE, null as any) || ({} as Save); return { car: s.car || "impreza", map: s.map || "forest", best: s.best || {}, wins: s.wins || {} }; };
const store = (s: Save) => lsSet(SAVE, s);
const G = 9.81;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export interface RallyGameOpts { done?: (score: number, mapId: string, carId: string, pos: number, time: number) => void }

export function createRallyGame(host: HTMLElement, opts: RallyGameOpts = {}) {
  let inner: any = null;
  const save = load();
  const start = (level: Level) => { inner = run(host, level, save, opts, (l: Level) => { inner.dispose(); saveLevel(l); start(l); }); };
  start(loadLevel());
  return { dispose() { inner && inner.dispose(); } };
}

interface Note { u: number; len: number; text: string; say: string; icon: string; kind: "corner" | "jump" | "water" }

function buildNotes(m: RallyMap, P: any): Note[] {
  const n = P.n, notes: Note[] = [];
  let i = 0;
  while (i < n) {
    if (Math.abs(P.kap[i]) < 0.014) { i++; continue; }
    const sign = Math.sign(P.kap[i]); let j = i, peak = 0, peakAt = i;
    while (j < i + n && Math.abs(P.kap[j % n]) >= 0.01 && Math.sign(P.kap[j % n]) === sign) { const a = Math.abs(P.kap[j % n]); if (a > peak) { peak = a; peakAt = j; } j++; }
    const len = (j - i) / n;
    if (len * P.total > 6) {
      const r = 1 / peak, grade = r > 60 ? 6 : r > 42 ? 5 : r > 30 ? 4 : r > 20 ? 3 : r > 13 ? 2 : 1;
      const dir = sign > 0 ? "RIGHT" : "LEFT", arrow = sign > 0 ? "➜" : "⬅";
      const tight = (peakAt - i) / Math.max(1, j - i) > 0.62;
      const word = grade === 1 ? "HAIRPIN " + dir : dir + " " + grade;
      const say = (grade === 1 ? "hairpin " + dir.toLowerCase() : dir.toLowerCase() + " " + ["", "one", "two", "three", "four", "five", "six"][grade]) + (tight ? ", tightens" : "");
      notes.push({ u: i / n, len, text: word + (tight ? " TIGHTENS" : ""), say, icon: arrow, kind: "corner" });
    }
    i = j;
  }
  for (const [u, h] of m.jumps) notes.push({ u: u - 0.02, len: 0.02, text: h >= 2 ? "JUMP!" : "CREST", say: h >= 2 ? "jump, jump" : "over crest", icon: "▲", kind: "jump" });
  for (const u of m.water) notes.push({ u: u - 0.012, len: 0.02, text: "WATER", say: "into water", icon: "≈", kind: "water" });
  notes.sort((a, b) => a.u - b.u);
  return notes;
}

function run(host: HTMLElement, level: Level, save: Save, opts: RallyGameOpts, relaunch: (l: Level) => void) {
  host.innerHTML = "";
  const root = el("div", "c3d-root rl3", host);
  const view = el("div", "c3d-view", root);
  const stage = createStage(view, level);
  const T = stage.THREE, scene = stage.scene, camera = stage.camera, f = stage.f;
  const keys = createKeys();
  const banner = createBanner(root);

  let map: RallyMap = RALLY_MAPS.find((m) => m.id === save.map) || RALLY_MAPS[0]!;
  let carDef = RALLY_CARS.find((c) => c.id === save.car) || RALLY_CARS[0]!;
  let path = rallyPath(map);
  let world: RallyWorld = buildRallyWorld(T, scene, map, path, f);
  let notes = buildNotes(map, path);
  const skyEnv = () => setEnvironment(stage, "sky", [map.sky[0], map.sky[1], "#" + map.ground[0].toString(16).padStart(6, "0")]);
  let envTex = skyEnv();
  let car: CarModel = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { interior: true });
  scene.add(car.group);
  // a soft light inside the cabin so the dash, the cage and the roof lining are not black from the seat
  const cabin = new T.PointLight(0xfff2e0, 3, 2.2, 1.5); cabin.castShadow = false;
  const fitCabin = () => { car.body.add(cabin); cabin.position.set(car.eye[0] * 0.5, car.eye[1] + 0.05, car.eye[2] + 0.35); };
  fitCabin();
  let v = new Vehicle(carDef.spec);
  let audio: any = null;
  const dust = createParticles(T, scene, Math.round(1100 * f.amount + 200), { lit: true, opacity: 0.26 });
  const bits = createParticles(T, scene, 400, { lit: true, opacity: 1, spin: true });
  const marks = createMarks(T, scene, Math.round(2400 * f.amount + 400));

  // rivals: the same models, driven along the stage by a speed profile (their own lines, slides in the bends, jumps)
  let rivals: any[] = [];
  let vProf = new Float32Array(1);
  function speedProfile() {
    const n = path.n, vc = new Float32Array(n), mu = map.mu * 1.0;
    for (let i = 0; i < n; i++) vc[i] = Math.min(48, Math.sqrt((mu * G * 0.95) / Math.max(1e-4, Math.abs(path.kap[i]!))));
    const step = path.total / n;
    for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n; vc[i] = Math.min(vc[i]!, Math.sqrt(vc[j]! * vc[j]! + 2 * 6.5 * mu * step)); }
    vProf = vc;
  }
  function makeRivals() {
    rivals.forEach((r) => { scene.remove(r.model.group); r.model.dispose(); }); rivals = [];
    RIVALS.forEach((d, k) => {
      const m = buildCar(T, world.kit, d.kind as any, d.col, d.acc, {}); scene.add(m.group);
      const st = world.start(k + 1);
      const r = { def: d, model: m, u: 0, prog: 0, sp: 0, lat: 0, latT: 0, y: st.y, vy: 0, air: false, x: st.x, z: st.z, h: st.h, slide: 0, wheel: 0, finishT: 0, laps: 0, v: new Vehicle(carDef.spec) };
      path.nearest(st.x, st.z, near); r.u = near.i / path.n; r.prog = r.u - 1; r.lat = (st.x - path.px[near.i]!) * -path.fz[near.i]! + (st.z - path.pz[near.i]!) * path.fx[near.i]!; r.latT = r.lat;
      rivals.push(r);
    });
  }
  speedProfile();

  // ---------------------------------------------------------------- HUD
  const tower = el("div", "c3d-split", root);
  const lapBox = el("div", "c3d-lap", root);
  const pace = el("div", "c3d-pace", root), paceIcon = el("i", "", pace), paceTxt = el("span", "", pace), paceT = el("b", "", pace);
  const gauge = el("div", "c3d-gauge", root), gSpeed = el("b", "", gauge), gUnit = el("span", "", gauge, "MPH"), gGear = el("em", "", gauge);
  const dmg = el("div", "c3d-damage", root, "CAR DAMAGE"), dmgBar = el("i", "", dmg);
  const posBox = el("div", "c3d-hud", root), posBig = el("div", "c3d-big", posBox), posSub = el("div", "c3d-mult", posBox);
  let mini = createMinimap(root, path, { width: map.width * 1.6, color: "rgba(224,164,88,.95)" });
  el("div", "c3d-help", root, "<b>W</b> gas · <b>S</b> brake · <b>A / D</b> steer · <b>Space</b> handbrake · <b>C</b> camera · <b>R</b> back on the road · <b>V</b> co-driver voice");
  const pad = matchMedia("(pointer: coarse)").matches ? touchPad(root, keys, [["◀", "KeyA"], ["▶", "KeyD"], ["E-BRAKE", "Space"], ["BRAKE", "KeyS"], ["GAS", "KeyW"], ["CAM", "KeyC"]]) : null;
  const menu = el("div", "c3d-menu", root), result = el("div", "c3d-result", root), countdown = el("div", "c3d-count", root);
  let state: "menu" | "count" | "run" | "result" = "menu";
  let voice = true;

  function renderMenu() {
    const stars = (k: number) => "★".repeat(k) + "☆".repeat(4 - k);
    menu.innerHTML =
      `<div class="c3d-menu-card"><div class="c3d-title"><span>RALLY</span> · OFF-ROAD RACE</div>` +
      `<div class="c3d-sec">Car</div><div class="c3d-cars">` +
      RALLY_CARS.map((c) => `<button type="button" class="c3d-pick${c.id === carDef.id ? " on" : ""}" data-car="${c.id}"><b>${c.name}</b><small>${c.sub}</small>` +
        `<span class="c3d-stat"><em>Power</em><i style="width:${c.stats[0] * 10}%"></i></span><span class="c3d-stat"><em>Stability</em><i style="width:${c.stats[1] * 10}%"></i></span><span class="c3d-stat"><em>Grip</em><i style="width:${c.stats[2] * 10}%"></i></span></button>`).join("") +
      `</div><div class="c3d-sec">Stage <small>each one is harder than the last</small></div><div class="c3d-maps">` +
      RALLY_MAPS.map((m, i) => {
        const best = (save.best[m.id] || {})[carDef.id] || 0;
        return `<button type="button" class="c3d-pick${m.id === map.id ? " on" : ""}" data-map="${m.id}"><b>${i + 1}. ${m.name}</b><span class="c3d-stars">${stars(m.stars)}</span><small>${m.blurb}</small>` +
          `<small class="c3d-best">Best ${best ? fmtTime(best) : "—"}${save.wins[m.id] ? " · 🏆 won" : ""}</small></button>`;
      }).join("") +
      `</div><div class="c3d-row"><button type="button" class="c3d-go" data-act="go">▶ Race · ${map.laps} laps vs 3 crews</button><button type="button" class="c3d-gfx" data-act="gfx">◐ Graphics: ${LEVEL_NAMES[level]}</button></div>` +
      `<p class="c3d-note">You start from the driver's seat (C changes the camera). The co-driver reads the pace notes: the bend's direction and how tight it is (6 = flat out, 1 = hairpin), crests, jumps and water, with a countdown. Off the road the ground is rough and slippery; further out the trees and rocks damage the car.</p></div>`;
  }
  menu.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button") as HTMLElement; if (!t) return;
    WB_SOUND.click();
    if (t.dataset.car && t.dataset.car !== carDef.id) { carDef = RALLY_CARS.find((c) => c.id === t.dataset.car)!; save.car = carDef.id; store(save); swapCar(); renderMenu(); }
    else if (t.dataset.map && t.dataset.map !== map.id) { map = RALLY_MAPS.find((m) => m.id === t.dataset.map)!; save.map = map.id; store(save); swapMap(); renderMenu(); }
    else if (t.dataset.act === "go") begin();
    else if (t.dataset.act === "gfx") relaunch(((level + 1) % 3) as Level);
  });
  result.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button") as HTMLElement; if (!t) return;
    WB_SOUND.click();
    if (t.dataset.act === "again") begin();
    else if (t.dataset.act === "next") { const i = RALLY_MAPS.indexOf(map); map = RALLY_MAPS[(i + 1) % RALLY_MAPS.length]!; save.map = map.id; store(save); swapMap(); begin(); }
    else if (t.dataset.act === "menu") toMenu();
  });
  function swapCar() {
    scene.remove(car.group); car.dispose();
    car = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { interior: true }); scene.add(car.group); fitCabin();
    v = new Vehicle(carDef.spec); placeAtStart();
    if (audio) { audio.dispose(); audio = null; }
  }
  function swapMap() {
    scene.remove(car.group); car.dispose(); rivals.forEach((r) => { scene.remove(r.model.group); r.model.dispose(); }); rivals = [];
    world.dispose(); mini.el.remove(); marks.clear(); dust.clear(); bits.clear();
    path = rallyPath(map); world = buildRallyWorld(T, scene, map, path, f); notes = buildNotes(map, path); speedProfile(); envTex.dispose(); envTex = skyEnv();
    car = buildCar(T, world.kit, carDef.id, carDef.col, carDef.acc, { interior: true }); scene.add(car.group); fitCabin();
    mini = createMinimap(root, path, { width: map.width * 1.6, color: "rgba(224,164,88,.95)" });
    v = new Vehicle(carDef.spec); placeAtStart(); makeRivals();
  }
  function placeAtStart() { const s = world.start(0); v.place(s.x, s.z, s.h, s.y); car.update(v, 0, false); }

  // ---------------------------------------------------------------- race state
  const near = { d: 0, h: 0, i: 0, side: 1 };
  const race = { time: 0, lapStart: 0, laps: 0, prog: 0, lastI: 0, best: Infinity, damage: 0, air: 0, maxAir: 0, hits: 0, finishT: 0, noteIdx: -1, said: -1 };
  let countT = 0;
  function begin() {
    Object.assign(race, { time: 0, lapStart: 0, laps: 0, prog: 0, lastI: 0, best: Infinity, damage: 0, air: 0, maxAir: 0, hits: 0, finishT: 0, noteIdx: -1, said: -1 });
    marks.clear(); dust.clear(); bits.clear();
    placeAtStart(); makeRivals();
    path.nearest(v.x, v.z, near); race.lastI = near.i; race.prog = near.i - path.n;   // the grid is behind the line: the first crossing starts lap 1
    menu.classList.remove("on"); result.classList.remove("on");
    state = "count"; countT = 4.2;
    if (!audio) audio = createCarAudio("rally"); audio.resume();
    stage.canvas.focus();
  }
  function toMenu() { state = "menu"; renderMenu(); menu.classList.add("on"); result.classList.remove("on"); countdown.classList.remove("on"); pace.classList.remove("on"); placeAtStart(); makeRivals(); }
  function standings() {
    const me = { name: "YOU", prog: race.prog / path.n, you: true, t: race.finishT };
    const list = [me, ...rivals.map((r) => ({ name: r.def.name, prog: r.prog, you: false, t: r.finishT }))];
    list.sort((a, b) => (a.t && b.t ? a.t - b.t : a.t ? -1 : b.t ? 1 : b.prog - a.prog));
    return list;
  }
  function finish() {
    state = "result"; race.finishT = race.time; pace.classList.remove("on"); countdown.classList.remove("on");
    // rivals still running: estimate their time from their average pace
    for (const r of rivals) if (!r.finishT) { const done = Math.max(0.05, r.prog); r.finishT = race.time * (map.laps / done); }
    const list = standings(), pos = list.findIndex((e) => e.you) + 1, t = race.time;
    const prev = (save.best[map.id] || {})[carDef.id] || 0;
    if (!prev || t < prev) save.best[map.id] = { ...(save.best[map.id] || {}), [carDef.id]: t };
    if (pos === 1) save.wins[map.id] = (save.wins[map.id] || 0) + 1;
    store(save);
    if (pos === 1) WB_SOUND.win();
    const score = Math.round(100000 / Math.max(10, t) * (1 + (4 - pos) * 0.15) * (1 - race.damage / 300));
    result.innerHTML = `<div class="c3d-menu-card"><div class="c3d-title"><span>${map.name.toUpperCase()}</span> · RESULT</div>` +
      `<div class="c3d-score">P${pos}</div><div class="c3d-medal">${pos === 1 ? "🏆 Stage win!" : pos === 2 ? "🥈 Second" : pos === 3 ? "🥉 Third" : "Fourth"} · ${fmtTime(t)}${!prev || t < prev ? " · new best!" : ""}</div>` +
      `<div class="c3d-grid">${list.map((e, i) => `<div style="${e.you ? "border-color:#ffd34d" : ""}"><em>P${i + 1} · ${e.name}</em><b>${fmtTime(e.t || 0)}</b></div>`).join("")}` +
      `<div><em>Best lap</em><b>${isFinite(race.best) ? fmtTime(race.best) : "—"}</b></div><div><em>Longest jump</em><b>${race.maxAir.toFixed(2)} s</b></div></div>` +
      `<p class="c3d-note">Car damage ${Math.round(race.damage)}% · hits ${race.hits} · score ${score.toLocaleString()}</p>` +
      `<div class="c3d-row"><button type="button" class="c3d-go" data-act="again">↻ Again</button><button type="button" data-act="next">Next stage ▶</button><button type="button" data-act="menu">☰ Cars & stages</button></div></div>`;
    result.classList.add("on");
    try { opts.done && opts.done(score, map.id, carDef.id, pos, t); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- camera
  const CAMS = ["Cockpit", "Bonnet", "Chase", "Far chase"];
  let camMode = 0, camYaw = 0, camInit = false, orbit = 0;
  const camPos = new T.Vector3(), look = new T.Vector3(), tmpV = new T.Vector3(), eyeV = new T.Vector3(), q = new T.Quaternion(), flip = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI);
  function updateCamera(dt: number) {
    if (state === "menu" || state === "result") {
      orbit += dt * 0.16; const r = 7.5;
      camera.position.set(v.x + Math.sin(orbit) * r, v.y + 2.4, v.z + Math.cos(orbit) * r); camera.lookAt(v.x, v.y + 0.8, v.z);
      if (camera.near !== 0.1) { camera.near = 0.1; camera.updateProjectionMatrix(); }
      car.body.visible = true; camInit = false; return;
    }
    const sp = v.speed;
    if (camMode <= 1) {
      // from inside: the camera rides on the body (roll, pitch, bumps) at the driver's eyes; the head sways with the g-forces
      car.group.updateMatrixWorld(true);
      const e = car.eye, sway = clamp(-v.ay * 0.006, -0.06, 0.06);
      if (camMode === 0) eyeV.set(e[0] + sway, e[1] + 0.02, e[2] + 0.12 + clamp(-v.ax * 0.004, -0.05, 0.05));
      else eyeV.set(0, 1.45, 1.1);
      car.body.localToWorld(eyeV);
      camera.position.copy(eyeV);
      car.body.getWorldQuaternion(q); camera.quaternion.copy(q).multiply(flip);
      if (camMode === 0) camera.rotateX(0.02);
      const n0 = camMode === 0 ? 0.04 : 0.1; if (camera.near !== n0) { camera.near = n0; camera.updateProjectionMatrix(); }
    } else {
      const velYaw = sp > 3 ? Math.atan2(v.vx, v.vz) : v.h, target = v.h + wrap(velYaw - v.h) * 0.4;
      if (!camInit) { camYaw = target; camInit = true; }
      camYaw += wrap(target - camYaw) * (1 - Math.exp(-dt * 4));
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw), dist = camMode === 3 ? 10 : 6.2, hgt = camMode === 3 ? 3.8 : 2.3;
      tmpV.set(v.x - fx * dist, 0, v.z - fz * dist);
      // stay inside the stage's edge (behind the car on a bend the camera would be in the trees or the canyon wall)
      {
        const cg = world.ground(tmpV.x, tmpV.z), lim = world.edge - 1.5;
        if (Math.abs(cg.lat) > lim) { const i = cg.i, sd = cg.lat >= 0 ? 1 : -1, pull = Math.abs(cg.lat) - lim; tmpV.x -= -path.fz[i]! * sd * pull; tmpV.z -= path.fx[i]! * sd * pull; }
      }
      const gy = world.ground(tmpV.x, tmpV.z).h;
      tmpV.y = Math.max(v.y + hgt, gy + 1.2);
      camPos.lerp(tmpV, 1 - Math.exp(-dt * 8)); if (camPos.distanceTo(tmpV) > 25) camPos.copy(tmpV);
      camera.position.copy(camPos); look.set(v.x + fx * 3, v.y + 0.9, v.z + fz * 3); camera.lookAt(look);
      if (camera.near !== 0.1) { camera.near = 0.1; camera.updateProjectionMatrix(); }
    }
    const fov = (camMode === 0 ? 68 : 62) + Math.min(12, sp * 0.22);
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------- the player's car on the stage
  const groundFn = (x: number, z: number) => world.ground(x, z);
  function rules(dt: number) {
    const g = world.ground(v.x, v.z), i = g.i, lat = g.lat;
    // the car's tilt follows the ground under it (front-back and side to side)
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -Math.cos(v.h), rz = Math.sin(v.h);
    if (!v.airborne) {
      const hf = world.ground(v.x + fx * 1.3, v.z + fz * 1.3).h, hb = world.ground(v.x - fx * 1.3, v.z - fz * 1.3).h;
      const hr = world.ground(v.x + rx * 0.8, v.z + rz * 0.8).h, hl = world.ground(v.x - rx * 0.8, v.z - rz * 0.8).h;
      const px = -Math.atan2(hf - hb, 2.6), pz = Math.atan2(hl - hr, 1.6);       // + about z lifts the car's left side (+x in the model)
      v.slopeX += (px - v.slopeX) * (1 - Math.exp(-dt * 12)); v.slopeZ += (pz - v.slopeZ) * (1 - Math.exp(-dt * 12));
      // gravity along the slope: uphill slows, downhill speeds up
      v.u -= Math.sin(-v.slopeX) * G * dt * 0.9;
    }
    // the edge of the stage: trees and rocks
    const P = path, E = world.edge, HALF = 1.0;
    if (Math.abs(lat) + HALF > E) {
      const sd = lat >= 0 ? 1 : -1, prx = -P.fz[i]!, prz = P.fx[i]!, over = Math.abs(lat) + HALF - E;
      v.x -= prx * sd * over; v.z -= prz * sd * over;
      const hit = v.bounce(-prx * sd, -prz * sd, 0.2, 0.55);
      if (hit > 1.5) {
        race.hits++; race.damage = Math.min(100, race.damage + hit * 2.2);
        audio && audio.impact(Math.min(1, hit / 14));
        if (hit > 6 && state === "run") banner.show(`<b>CRASH!</b><small>damage ${Math.round(race.damage)}%</small>`, 1200, "bad");
        const leafy = map.scenery === "forest" || map.scenery === "jungle";
        for (let k = 0; k < Math.min(30, hit * 2.5); k++) bits.spawn(v.x + prx * sd, v.y + 1 + Math.random(), v.z + prz * sd, (Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5, 0.12 + Math.random() * 0.12, 1.4, leafy ? (Math.random() < 0.5 ? 0x3a6a2a : 0x5a3e28) : 0x8a7a68, { g: 9, drag: 0.8, grow: 0 });
      }
    }
    // rivals: no passing through each other
    for (const r of rivals) {
      const dx = v.x - r.x, dz = v.z - r.z, d = Math.hypot(dx, dz);
      if (d < 2.3 && d > 0.01) {
        const nx = dx / d, nz = dz / d, push = 2.3 - d;
        v.x += nx * push * 0.7; v.z += nz * push * 0.7; r.lat -= (nx * -P.fz[i]! + nz * P.fx[i]!) * push * 0.3;
        const hit = v.bounce(nx, nz, 0.3, 0.92); if (hit > 2) { race.damage = Math.min(100, race.damage + hit); audio && audio.impact(Math.min(1, hit / 12)); r.sp *= 0.92; }
      }
    }
    // laps
    let di = i - race.lastI; if (di > path.n / 2) di -= path.n; if (di < -path.n / 2) di += path.n;
    if (Math.abs(di) < path.n / 6) race.prog += di;
    race.lastI = i;
    if (state === "run" && race.prog >= path.n * (race.laps + 1)) {
      race.laps++;
      const lt = race.time - race.lapStart; race.lapStart = race.time; race.best = Math.min(race.best, lt);
      if (race.laps >= map.laps) finish();
      else banner.show(`<b>LAP ${race.laps + 1} / ${map.laps}</b><small>${fmtTime(lt)}</small>`, 1500);
    }
    return g;
  }
  function backOnRoad() {
    world.ground(v.x, v.z); const i = world.ground(v.x, v.z).i, s = path.at(i / path.n);
    v.place(s.x, s.z, Math.atan2(s.fx, s.fz), s.y + 0.3); camInit = false; marks.lift();
  }

  // ---------------------------------------------------------------- rivals
  function rivalStep(dt: number, racing: boolean) {
    const P = path, n = P.n;
    rivals.forEach((r, k) => {
      if (racing && !r.finishT) {
        const i = Math.floor(((r.u % 1) + 1) % 1 * n);
        const target = vProf[i]! * r.def.skill * (0.9 + 0.025 * map.stars) * (1 - 0.04 * Math.sin(race.time * 0.3 + k * 2));
        r.sp += clamp(target - r.sp, -9 * dt, (r.sp < 20 ? 7 : 4) * dt);
        r.u += (r.sp * dt) / P.total; r.prog += (r.sp * dt) / P.total;
        if (r.prog >= map.laps) r.finishT = race.time;
        // racing line: inside of the bends, a little wide on exit
        const ahead = P.at(r.u + 0.01);
        r.latT = clamp(-Math.sign(ahead.kap) * Math.min(1, Math.abs(ahead.kap) * 30) * map.width * 0.28 + Math.sin(k * 3 + r.u * 20) * 0.6, -map.width * 0.38, map.width * 0.38);
      } else if (r.finishT) { r.sp = Math.max(0, r.sp - 6 * dt); r.u += (r.sp * dt) / P.total; }
      r.lat += (r.latT - r.lat) * (1 - Math.exp(-dt * 1.2));
      const s = P.at(r.u), x = s.x + s.rx * r.lat, z = s.z + s.rz * r.lat;
      // ballistic over crests
      const gy = s.y;
      if (r.air) { r.vy -= G * dt; r.y += r.vy * dt; if (r.y <= gy) { r.y = gy; r.air = false; } }
      else { const vyG = (gy - r.y) / Math.max(1e-3, dt); if (vyG < r.vy - G * dt - 0.15 && r.sp > 8) { r.air = true; r.vy -= G * dt; r.y += r.vy * dt; } else { r.vy = vyG; r.y = gy; } }
      const slideT = clamp(s.kap * r.sp * r.sp * 0.0035, -0.4, 0.4);
      r.slide += (slideT - r.slide) * (1 - Math.exp(-dt * 3));
      r.x = x; r.z = z; r.h = Math.atan2(s.fx, s.fz) - r.slide;
      const rv = r.v; rv.x = x; rv.z = z; rv.y = r.y; rv.h = r.h; rv.u = r.sp; rv.steer = clamp(-s.kap * 6, -0.5, 0.5); rv.airborne = r.air;
      rv.roll = clamp(-s.kap * r.sp * r.sp * 0.0006, -0.08, 0.08); rv.pitch = 0;
      for (let w = 0; w < 4; w++) rv.wheelSpin[w] = (rv.wheelSpin[w]! + (r.sp / 0.34) * dt) % 6283;
      r.model.update(rv, dt, false);
      // dust behind them
      if (r.sp > 6 && !r.air && Math.random() < 0.5 * f.amount) {
        const bx = x - Math.sin(r.h) * 2, bz = z - Math.cos(r.h) * 2;
        dust.spawn(bx + (Math.random() - 0.5), r.y + 0.3, bz + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2, 0.35 + Math.random() * 0.3, 1.0 + Math.random() * 0.8, dustColor(), { grow: 1.2, drag: 1.3 });
      }
    });
  }
  const dustColor = () => {
    const s = map.surface;
    return s === "snow" ? (Math.random() < 0.5 ? 0xf4f8fc : 0xdfe8f2) : s === "mud" ? (Math.random() < 0.5 ? 0x5a4632 : 0x6a5640) : s === "sand" ? (Math.random() < 0.5 ? 0xe0b880 : 0xcaa070) : (Math.random() < 0.5 ? 0xc0b098 : 0xa89880);
  };

  // ---------------------------------------------------------------- effects
  const wp = new T.Vector3();
  function wheelWorld(k: number) { const p = car.wheelPos[k]!, c = Math.cos(v.h), s = Math.sin(v.h); return wp.set(v.x + p[0] * c + p[2] * s, 0, v.z - p[0] * s + p[2] * c); }
  function effects(dt: number, g: any) {
    const sp = v.speed, dirx = sp > 0.5 ? v.vx / sp : 0, dirz = sp > 0.5 ? v.vz / sp : 0;
    const markCol = map.surface === "snow" ? 0x9aa6b4 : map.surface === "mud" ? 0x2a2018 : map.surface === "sand" ? 0x9a7a52 : 0x6a5e50;
    for (let k = 0; k < 4; k++) {
      const w = wheelWorld(k), gy = world.ground(w.x, w.z).h;
      marks.add(k, w.x, gy + 0.05, w.z, dirx, dirz, 0.14, v.airborne ? 0 : Math.min(1, 0.35 + v.slide[k]! + sp / 60), markCol);
      if (k >= 2 && !v.airborne && sp > 5 && Math.random() < (0.25 + v.slide[k]! + sp / 50) * f.amount * 0.7) {
        dust.spawn(w.x + (Math.random() - 0.5) * 0.4, gy + 0.3, w.z + (Math.random() - 0.5) * 0.4, -dirx * sp * 0.15 + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.2, -dirz * sp * 0.15 + (Math.random() - 0.5) * 2, 0.3 + Math.random() * 0.3, 1.0 + Math.random() * 1.0, dustColor(), { grow: 1.3, drag: 1.4 });
        if (Math.random() < 0.4) bits.spawn(w.x, gy + 0.2, w.z, -dirx * sp * 0.3 + (Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, -dirz * sp * 0.3 + (Math.random() - 0.5) * 3, 0.06 + Math.random() * 0.06, 0.8, map.surface === "snow" ? 0xffffff : 0x7a6a58, { g: 9, drag: 0.5, grow: 0 });
      }
    }
    if (g.water && sp > 3) for (let k = 0; k < 6; k++) dust.spawn(v.x + (Math.random() - 0.5) * 2, v.y + 0.4, v.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 0.3 + Math.random() * 0.3, 1.0, 0xd8e8ea, { g: 8, drag: 0.6, grow: 0.8 });
    if (v.landed > 4) { for (let k = 0; k < 24; k++) dust.spawn(v.x + (Math.random() - 0.5) * 3, v.y + 0.2, v.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6, Math.random() * 2, (Math.random() - 0.5) * 6, 0.6, 1.5, dustColor(), { grow: 2, drag: 1.5 }); audio && audio.impact(Math.min(1, v.landed / 10)); race.damage = Math.min(100, race.damage + Math.max(0, v.landed - 7) * 2); }
    v.landed = 0;
    dust.camera(camera.position.x, camera.position.y, camera.position.z); bits.camera(camera.position.x, camera.position.y, camera.position.z);
    dust.update(dt); bits.update(dt);
  }

  // ---------------------------------------------------------------- pace notes
  function paceNotes() {
    const u = ((race.prog / path.n) % 1 + 1) % 1, sp = Math.max(8, v.speed);
    let best: Note | null = null, bestD = 1e9, bestIdx = -1;
    notes.forEach((nt, k) => { let d = (nt.u - u) * path.total; if (d < -nt.len * path.total) d += path.total; if (d > -nt.len * path.total * 0.6 && d < bestD) { bestD = d; best = nt; bestIdx = k; } });
    if (!best) { pace.classList.remove("on"); return; }
    const secs = bestD / sp;
    if (secs < 3.6) {
      pace.classList.add("on"); paceIcon.textContent = best.icon; paceTxt.textContent = best.text; paceT.textContent = secs > 0 ? secs.toFixed(1) + "s" : "NOW";
      pace.style.borderColor = best.kind === "jump" ? "#ff5a4a" : best.kind === "water" ? "#1fb6ff" : "rgba(255,211,77,.6)";
      if (race.said !== bestIdx + race.laps * 1000) {
        race.said = bestIdx + race.laps * 1000;
        if (voice && !WB_SOUND.isMuted() && "speechSynthesis" in window) { try { speechSynthesis.cancel(); const s = new SpeechSynthesisUtterance(best.say); s.rate = 1.35; s.pitch = 0.9; s.volume = 0.8; speechSynthesis.speak(s); } catch { /* no voice */ } }
      }
    } else pace.classList.remove("on");
  }

  // ---------------------------------------------------------------- frame
  let hudT = 0;
  stage.onFrame((dt, now) => {
    for (const k of keys.taps()) {
      if (k === "KeyC" && state !== "menu") { camMode = (camMode + 1) % CAMS.length; banner.show(`<b>${CAMS[camMode]}</b>`, 700); camInit = false; }
      if (k === "KeyR" && state === "run") { backOnRoad(); race.time += 3; banner.show("<b>BACK ON THE ROAD</b><small>+3 s</small>", 1200, "warn"); }
      if (k === "KeyE" || k === "KeyV") { voice = !voice; banner.show(`<b>Co-driver voice ${voice ? "on" : "off"}</b>`, 900); }
    }
    let inp = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    if (state === "run") inp = { throttle: keys.throttle() ? 1 - race.damage * 0.003 : 0, brake: keys.brake() ? 1 : 0, steer: keys.steer() + race.damage * 0.0012, handbrake: keys.handbrake() };
    if (state === "count") {
      const before = Math.ceil(countT); countT -= dt; const c = Math.ceil(countT);
      if (c !== before && c > 0 && c <= 3) WB_SOUND.click();
      countdown.innerHTML = c > 3 ? "" : c > 0 ? `<b>${c}</b>` : "<b class=go>GO!</b>"; countdown.classList.add("on");
      if (countT <= 0) { state = "run"; WB_SOUND.launch(); setTimeout(() => countdown.classList.remove("on"), 600); }
      inp.throttle = keys.throttle() ? 0.3 : 0;
    }
    if (state !== "menu" && state !== "result") {
      v.step(dt, inp, groundFn);
      if (state === "count") { v.u = 0; v.w = 0; v.om = 0; }
    }
    if (v.airborne) { race.air += dt; race.maxAir = Math.max(race.maxAir, race.air); } else race.air = 0;
    const g = rules(dt);
    rivalStep(dt, state === "run");
    if (state === "run") { race.time += dt; paceNotes(); }
    car.update(v, dt, inp.brake > 0 || inp.handbrake);
    // from the seat the paint and glass would sit in front of the eyes: hide the shell, keep the bonnet visible
    car.body.children.forEach((c: any, k: number) => { if (k === 1) c.visible = !(camMode === 0 && state === "run" || camMode === 0 && state === "count"); });
    effects(dt, g);
    world.update(dt, camera, { x: v.x, z: v.z });
    updateCamera(dt);
    if (audio) audio.update(v.rpm, inp.throttle, Math.max(v.slide[2]!, v.slide[0]!), v.airborne ? 0 : (g.s.rough || 0));
    banner.tick(now);
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.06;
      const list = standings(), pos = list.findIndex((e) => e.you) + 1;
      posBig.textContent = state === "menu" ? "" : "P" + pos + " / 4";
      posSub.textContent = state === "run" && isFinite(race.best) ? "best lap " + fmtTime(race.best) : "";
      tower.innerHTML = list.map((e, i) => `<div class="${e.you ? "you" : ""}"><span>${i + 1}. ${e.name}</span><span>${e.you ? "" : (() => { const d = (e.prog - race.prog / path.n) * path.total / Math.max(10, v.speed || 20); return (d >= 0 ? "+" : "") + d.toFixed(1) + "s"; })()}</span></div>`).join("");
      gSpeed.textContent = String(Math.round(v.speed * 2.237)); gGear.textContent = String(v.gear);
      dmgBar.style.width = Math.max(3, 100 - race.damage) + "%";
      lapBox.innerHTML = `<span>LAP</span><b>${Math.min(map.laps, race.laps + 1)}/${map.laps}</b><span>TIME</span><b>${fmtTime(race.time)}</b>`;
      mini.draw([...rivals.map((r) => ({ x: r.x, z: r.z, color: "#" + new T.Color(r.def.col).getHexString(), r: 3 })), { x: v.x, z: v.z, color: "#ffd34d", h: v.h }]);
    }
  });

  makeRivals(); renderMenu(); menu.classList.add("on"); placeAtStart();
  const dbg = typeof __WB_DBG__ !== "undefined" && __WB_DBG__;
  let disposed = false;
  const api = {
    get v() { return v; }, get race() { return race; }, get state() { return state; }, get world() { return world; }, get path() { return path; }, get rivals() { return rivals; }, get notes() { return notes; },
    stage, keys, begin, toMenu, finish, setCam(k: number) { camMode = k; camInit = false; },
    pick(carId: string, mapId: string) { carDef = RALLY_CARS.find((c) => c.id === carId) || carDef; map = RALLY_MAPS.find((m) => m.id === mapId) || map; save.car = carDef.id; save.map = map.id; swapMap(); renderMenu(); },
    dispose() {
      if (disposed) return; disposed = true;
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
      stage.dispose(); keys.dispose(); pad && pad.dispose(); audio && audio.dispose(); world.dispose(); car.dispose(); rivals.forEach((r) => r.model.dispose()); dust.dispose(); bits.dispose(); marks.dispose();
      host.innerHTML = "";
      if (dbg && (window as any).__rl3 === api) (window as any).__rl3 = null;
    },
  };
  stage.onDispose(() => api.dispose());
  if (dbg) (window as any).__rl3 = api;
  return api;
}
