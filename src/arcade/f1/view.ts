// @ts-nocheck
import * as THREE from "three";
import { TrackPath } from "./path";
import { f1EnvFor, f1HeightFn } from "./env";
import { f1FeaturesFor, loadF1Level, saveF1Level, nextF1Level, F1_LEVEL_NAMES } from "./gfx";
import { buildWorld } from "./world";
import { buildCar, makeKit } from "./car";
import { makePost } from "./post";
import { disposeF1Textures } from "./tex";

declare const __WB_DBG__: boolean;

const EYE = 0.92;                              // the driver's eye above the road, metres
const LANE_W = 4.6;                            // the game's lane value (about -1.15 .. 1.15) in metres across the road
const RIVAL_LANES = [-0.55, 0.85, 0.55, -0.85];
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export interface F1SunScreen { x: number; y: number; glare: number; post: boolean }

/**
 * The cockpit's live feed as a real 3D scene. It sits as a WebGL canvas right under the game's own 2D canvas, which keeps drawing the
 * cockpit, the minimap and the HUD on top of it, so every telemetry value and corner prompt still comes from the same game state.
 * Anything that goes wrong (no WebGL, a lost context) makes `ok` false and the game switches back to its classic 2D feed.
 */
export function createF1View(cv: HTMLCanvasElement) {
  const frame = cv.parentElement as HTMLElement;
  if (!frame) return null;
  const glc = document.createElement("canvas");
  glc.setAttribute("aria-hidden", "true");
  let renderer: any;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
  } catch (e) { return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const savedCv = { position: cv.style.position, zIndex: cv.style.zIndex, background: cv.style.background };
  glc.style.cssText = "position:absolute;z-index:0;pointer-events:none;border-radius:4px;display:block;background:#0b1018;";
  frame.insertBefore(glc, cv);
  cv.style.position = "relative"; cv.style.zIndex = "1"; cv.style.background = "transparent";

  let level = loadF1Level();
  let f = f1FeaturesFor(level);
  let mapId = "", sig = "", pts: Array<{ x: number; y: number }> = [];
  let env: any = null, path: any = null, world: any = null, scene: any = null, post: any = null, sun: any = null, hemi: any = null;
  let rivals: any[] = [], rivalKit: any = null, ghost: any = null, ghostKit: any = null;
  const camera = new THREE.PerspectiveCamera(64, cv.width / cv.height, 0.25, 2600);
  const sunDir = new THREE.Vector3(), tgt = new THREE.Vector3(), tmpV = new THREE.Vector3(), xAxis = new THREE.Vector3(), yAxis = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
  let fov = 64, lastW = 0, lastH = 0, btn: HTMLElement | null = null, ro: ResizeObserver | null = null, built = false, dirty = true;
  const markDirty = () => { dirty = true; };
  const view: any = { ok: true, last: null as any };

  // ---------------------------------------------------------------------------------------------------- size
  function layout() {
    const w = cv.offsetWidth, h = cv.offsetHeight;
    if (!w || !h) return;
    glc.style.left = cv.offsetLeft + "px"; glc.style.top = cv.offsetTop + "px"; glc.style.width = w + "px"; glc.style.height = h + "px";
    let pr = Math.min(window.devicePixelRatio || 1, f.dprCap) * f.scale;
    const maxPx = level === 2 ? 2.7e6 : level === 1 ? 1.9e6 : 1.0e6;
    if (w * h * pr * pr > maxPx) pr = Math.sqrt(maxPx / (w * h));
    if (w === lastW && h === lastH && Math.abs(renderer.getPixelRatio() - pr) < 1e-3) return;
    lastW = w; lastH = h;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    if (post) post.setSize(Math.max(2, Math.floor(w * pr)), Math.max(2, Math.floor(h * pr)));
    camera.aspect = cv.width / cv.height;
    // the cockpit overlay was drawn for a horizon at 40% of the picture height: lift the view so the horizon sits there
    const fh = 1000 / camera.aspect;
    camera.setViewOffset(1000, fh, 0, fh * 0.1, 1000, fh);
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------------------------------- build
  function clearScene() {
    for (const r of rivals) r.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
    rivals = [];
    if (rivalKit) { rivalKit.list().forEach((m: any) => m.dispose()); rivalKit = null; }
    if (ghost) { ghost.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o === ghost.brake) o.material.dispose(); }); ghost = null; }
    if (ghostKit) { ghostKit.list().forEach((m: any) => m.dispose()); ghostKit = null; }
    if (sun) { sun.shadow.dispose(); sun = null; }
    if (world) { world.dispose(); world = null; }
    if (post) { post.dispose(); post = null; }
    scene = null; built = false;
  }

  function rebuild() {
    const t0 = performance.now();
    clearScene();
    f = f1FeaturesFor(level);
    env = f1EnvFor(mapId);
    path = new TrackPath(pts, f1HeightFn(env));
    world = buildWorld(THREE, path, env, f);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(env.fog, env.fogNear, env.fogFar);
    scene.add(world.group); scene.add(world.sky.mesh);
    sunDir.copy(world.sunDir);
    hemi = new THREE.HemisphereLight(env.hemiSky, env.hemiGround, env.hemiI);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(env.sunColor, env.sunI);
    if (f.shadow > 0) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(f.shadow, f.shadow);
      const R = f.shadowReach, c = sun.shadow.camera;
      c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = 420; c.updateProjectionMatrix();
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.3;
    }
    scene.add(sun); scene.add(sun.target);
    renderer.shadowMap.enabled = f.shadow > 0;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = env.exposure;
    if (f.post) post = makePost(THREE, renderer, f, [env.sat, env.contrast, env.warm]);
    // an invisible copy of the player's own car: it draws nothing, but throws the car's shadow on the road ahead
    if (f.shadow > 0) {
      ghostKit = makeKit(THREE);
      ghost = buildCar(THREE, ghostKit, "#cc2222");
      ghost.group.traverse((o: any) => { if (o.isMesh) { o.material.colorWrite = false; o.material.depthWrite = false; o.castShadow = true; o.receiveShadow = false; } });
      ghost.group.frustumCulled = false; scene.add(ghost.group);
    }
    lastW = 0; layout(); dirty = false;
    built = true;
    view.buildMs = Math.round(performance.now() - t0);
    if (btn) btn.textContent = "◐ Graphics: " + F1_LEVEL_NAMES[level];
  }

  function ensureRivals(ai: any[]) {
    if (!scene) return;
    if (rivals.length === ai.length && rivals.every((r, i) => r.color === ai[i].color)) return;
    for (const r of rivals) { scene.remove(r.group); r.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); }
    rivals = [];
    if (!rivalKit) rivalKit = makeKit(THREE);
    ai.forEach((a, i) => {
      const car = buildCar(THREE, rivalKit, a.color, [0xf2f2f4, 0x14161a, 0xf2c94c][i % 3]);
      car.group.frustumCulled = false;
      scene.add(car.group);
      rivals.push({ ...car, color: a.color, spin: 0, lastDist: a.dist });
    });
  }

  // ---------------------------------------------------------------------------------------------------- per frame
  const cs = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0, d: 0, h: 0, i: 0, side: 1 };
  const as = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0 };
  const rs = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0 };

  view.render = function (player: any, aiCars: any[], now: number, dt: number, gLat: number): F1SunScreen | null {
    if (!view.ok || !built) return null;
    view.last = { player, aiCars };
    if (dirty) { dirty = false; layout(); }
    ensureRivals(aiCars);
    const spd = Math.max(0, player.speed || 0), sp01 = Math.min(1, spd / 115), shk = Math.min(1.6, spd / 90);
    const u = player.lapDist || 0, lat = (player.lane || 0) * LANE_W;
    path.at(u, cs); path.at(u + 0.0065, as);
    camera.position.set(cs.x + cs.rx * lat, cs.y + EYE + Math.sin(now * 0.09) * shk * 0.006, cs.z + cs.rz * lat);
    tgt.set(as.x + as.rx * lat, as.y + EYE * 0.8 + Math.sin(now * 0.13) * shk * 0.01, as.z + as.rz * lat);
    camera.up.copy(upV);
    camera.lookAt(tgt);
    camera.rotateY(-(player.steer || 0) * 0.045);
    camera.rotateX(-(player.brake || 0) * 0.018 + (player.throttle || 0) * 0.004);
    camera.rotateZ(-gLat * 0.03 - (player.steer || 0) * sp01 * 0.012);
    const wantFov = 62 + 9 * sp01;
    fov += (wantFov - fov) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // the sun's shadow follows the camera, snapped to the shadow map's texels so it does not shimmer
    if (f.shadow > 0) {
      const R = f.shadowReach, texel = (2 * R) / f.shadow;
      camera.getWorldDirection(tmpV);
      tgt.set(camera.position.x + tmpV.x * R * 0.45, camera.position.y - EYE, camera.position.z + tmpV.z * R * 0.45);
      xAxis.crossVectors(upV, sunDir).normalize(); yAxis.crossVectors(sunDir, xAxis).normalize();
      const tx = Math.round(tgt.dot(xAxis) / texel) * texel, ty = Math.round(tgt.dot(yAxis) / texel) * texel, tz = tgt.dot(sunDir);
      tgt.copy(xAxis).multiplyScalar(tx).addScaledVector(yAxis, ty).addScaledVector(sunDir, tz);
      sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sunDir, 200);
      sun.target.updateMatrixWorld();
    } else {
      sun.position.copy(camera.position).addScaledVector(sunDir, 200); sun.target.position.copy(camera.position); sun.target.updateMatrixWorld();
    }

    // the player's invisible car (shadow only)
    if (ghost) {
      ghost.group.position.set(cs.x + cs.rx * lat - cs.fx * 0.14, cs.y, cs.z + cs.rz * lat - cs.fz * 0.14);
      ghost.group.rotation.set(0, Math.atan2(as.x + as.rx * lat - (cs.x + cs.rx * lat), as.z + as.rz * lat - (cs.z + cs.rz * lat)), 0);
    }

    // rivals: the game's own lap position, spread over the road in the same lanes as the old feed
    rivals.forEach((r, idx) => {
      const a = aiCars[idx]; if (!a) return;
      const ln = RIVAL_LANES[idx % RIVAL_LANES.length]! * (1 + Math.sin(now * 0.0007 + idx * 2) * 0.08) * LANE_W * 0.9;
      path.at(a.dist, rs);
      let dd = a.dist - r.lastDist; if (dd < -0.5) dd += 1; if (dd > 0.5) dd -= 1; r.lastDist = a.dist;
      const wx = rs.x + rs.rx * ln, wz = rs.z + rs.rz * ln;
      r.group.position.set(wx, rs.y, wz);
      r.group.rotation.set(0, Math.atan2(rs.fx, rs.fz), 0);
      const roll = rs.kap * 0.35;
      r.group.rotateZ(Math.max(-0.05, Math.min(0.05, roll)));
      r.spin += dd * path.total / 0.37;
      for (const w of r.wheels) w.rotation.x = r.spin;
      const braking = Math.sin(now * 0.002 + idx) > 0.6 || env.dusk;
      r.brake.material.color.setHex(braking ? 0xff2a2a : 0x4a0808);
    });

    world.update(dt, camera.position);
    world.sky.mesh.position.copy(camera.position);
    if (post) post.render(scene, camera, sp01, now); else renderer.render(scene, camera);

    // where the sun is on the 2D picture, for the lens glare drawn over it
    camera.getWorldDirection(tmpV);
    const dot = tmpV.dot(sunDir);
    tmpV.copy(camera.position).addScaledVector(sunDir, 1000).project(camera);
    const glare = smooth(0.55, 0.97, dot) * smooth(-0.04, 0.12, sunDir.y);
    return { x: (tmpV.x * 0.5 + 0.5) * cv.width, y: (-tmpV.y * 0.5 + 0.5) * cv.height, glare, post: !!post };
  };

  // ---------------------------------------------------------------------------------------------------- public
  view.fixPoints = function (id: string, p: Array<{ x: number; y: number }>) {
    // the figure-eight's own crossing is at its first point: start the lap on a straight instead of under the bridge
    if (id === "technical" && p.length >= 8) { const k = Math.floor(p.length / 4); return p.slice(k).concat(p.slice(0, k)); }
    return p;
  };
  view.setTrack = function (id: string, p: Array<{ x: number; y: number }>) {
    const s = id + ":" + level + ":" + p.length + ":" + p[1].x.toFixed(2) + ":" + p[1].y.toFixed(2) + ":" + p[Math.floor(p.length / 2)].x.toFixed(2);
    if (s === sig && built) return;
    sig = s; mapId = id; pts = p.map((q) => ({ x: q.x, y: q.y }));
    rebuild();
  };
  view.sunAz = function () { return env ? env.sunAz : -0.9; };
  view.dbg = function () { return { THREE, renderer, scene, camera, sun, hemi, world, path, post, sunDir, env, rivals, ghost }; };
  view.level = function () { return level; };
  view.setLevel = function (l: 0 | 1 | 2) {
    level = l; saveF1Level(l);
    if (mapId) { sig = ""; rebuild(); } else if (btn) btn.textContent = "◐ Graphics: " + F1_LEVEL_NAMES[level];
  };
  view.fail = function () {
    if (!view.ok) return;
    view.ok = false;
    cv.style.background = savedCv.background || "";
    glc.style.display = "none";
    if (btn) { btn.textContent = "Graphics: 2D"; (btn as any).disabled = true; btn.title = "The 3D feed stopped, so the classic 2D feed is used"; }
  };
  view.dispose = function () {
    if (ro) { ro.disconnect(); ro = null; }
    window.removeEventListener("resize", markDirty);
    document.removeEventListener("fullscreenchange", markDirty);
    if (btn) btn.removeEventListener("click", onBtn);
    glc.removeEventListener("webglcontextlost", onLost);
    clearScene();
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
    disposeF1Textures();
    if (glc.parentNode) glc.parentNode.removeChild(glc);
    cv.style.position = savedCv.position; cv.style.zIndex = savedCv.zIndex; cv.style.background = savedCv.background;
    view.ok = false;
    if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__ && (window as any).__f1View === view) (window as any).__f1View = null;
  };

  function onBtn(e: Event) { e.preventDefault(); view.setLevel(nextF1Level(level)); try { cv.focus(); } catch (err) {} }
  function onLost(e: Event) { e.preventDefault(); view.fail(); }
  glc.addEventListener("webglcontextlost", onLost);
  btn = document.getElementById("f1-gfx-btn");
  if (btn) { btn.textContent = "◐ Graphics: " + F1_LEVEL_NAMES[level]; btn.addEventListener("click", onBtn); }
  // the size is only read when something may have changed (reading it every frame would force the page to re-layout every frame)
  if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(markDirty); ro.observe(cv); ro.observe(frame); }
  window.addEventListener("resize", markDirty);
  document.addEventListener("fullscreenchange", markDirty);
  if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) (window as any).__f1View = view;
  return view;
}
