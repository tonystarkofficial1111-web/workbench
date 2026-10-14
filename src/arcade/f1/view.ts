// @ts-nocheck
import * as THREE from "three";
import { TrackPath } from "./path";
import { f1EnvFor, f1HeightFn } from "./env";
import { f1FeaturesFor, loadF1Level, saveF1Level, nextF1Level, F1_LEVEL_NAMES } from "./gfx";
import { buildWorld } from "./world";
import { buildF1Car, makeKit, EYE_POS } from "./car";
import { createCockpit } from "./cockpit";
import { createSky } from "./sky";
import { createCrash } from "./crash";
import { makePost } from "./post";
import { disposeF1Textures } from "./tex";
import { LANE_W, ROAD_HALF } from "./consts";

declare const __WB_DBG__: boolean;

const RIVAL_LANES = [-0.55, 0.85, 0.55, -0.85];
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export interface F1SunScreen { x: number; y: number; glare: number; post: boolean }

/**
 * The cockpit's live feed as a real 3D scene. It sits as a WebGL canvas right under the game's own 2D canvas, which keeps drawing the HUD on top of it,
 * so every telemetry value and corner prompt still comes from the same game state. The cockpit itself (nose, tyres on their wishbones, wheel, halo,
 * mirrors, arms) is part of the 3D scene. A crash takes over the picture with a replay-style scene (crash.ts).
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
  renderer.autoClear = false;                      // every pass below clears what it needs
  renderer.shadowMap.autoUpdate = false;           // the shadow map is drawn once per frame, then shared by the mirrors and the main picture

  const savedCv = { position: cv.style.position, zIndex: cv.style.zIndex, background: cv.style.background };
  glc.style.cssText = "position:absolute;z-index:0;pointer-events:none;border-radius:4px;display:block;background:#0b1018;";
  frame.insertBefore(glc, cv);
  cv.style.position = "relative"; cv.style.zIndex = "1"; cv.style.background = "transparent";

  let level = loadF1Level();
  let f = f1FeaturesFor(level);
  let mapId = "", sig = "", pts: Array<{ x: number; y: number }> = [];
  let givenPath: any = null;
  let env: any = null, path: any = null, world: any = null, scene: any = null, post: any = null, sun: any = null, hemi: any = null, envTex: any = null;
  let fxLight: any = null;
  let rivals: any[] = [], rivalKit: any = null, ghost: any = null, ghostKit: any = null, cockpit: any = null, cockpitKit: any = null, crash: any = null;
  let mirrorRT: any[] = [null, null], mirrorCam: any = null, mirrorTick = 0;
  const camera = new THREE.PerspectiveCamera(64, cv.width / cv.height, 0.4, 2600);
  const sunDir = new THREE.Vector3(), tgt = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), xAxis = new THREE.Vector3(), yAxis = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
  const qc = new THREE.Quaternion(), flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), eyeL = new THREE.Vector3(EYE_POS.x, EYE_POS.y, EYE_POS.z);
  let fov = 64, lastW = 0, lastH = 0, btn: HTMLElement | null = null, ro: ResizeObserver | null = null, built = false, dirty = true;
  const markDirty = () => { dirty = true; };
  const view: any = { ok: true, last: null as any, crashing: false };

  // ---------------------------------------------------------------------------------------------------- size
  function syncCockpitCam() {
    if (!cockpit) return;
    const cc = cockpit.camera, fh = 1000 / camera.aspect;
    cc.fov = camera.fov; cc.aspect = camera.aspect; cc.setViewOffset(1000, fh, 0, fh * 0.1, 1000, fh); cc.updateProjectionMatrix();
  }
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
    // horizon at 40% of the picture height (a real onboard camera looks slightly down at the road)
    const fh = 1000 / camera.aspect;
    camera.setViewOffset(1000, fh, 0, fh * 0.1, 1000, fh);
    camera.updateProjectionMatrix();
    syncCockpitCam();
  }

  // ---------------------------------------------------------------------------------------------------- build
  function disposeCar(c: any) { c.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); }
  function clearScene() {
    if (crash) { crash.dispose(); crash = null; view.crashing = false; }
    for (const r of rivals) disposeCar(r);
    rivals = [];
    if (rivalKit) { rivalKit.list().forEach((m: any) => m.dispose()); rivalKit = null; }
    if (ghost) { disposeCar(ghost); ghost = null; }
    if (ghostKit) { ghostKit.list().forEach((m: any) => m.dispose()); ghostKit = null; }
    if (cockpit) { cockpit.dispose(); cockpit = null; }
    if (cockpitKit) { cockpitKit.list().forEach((m: any) => m.dispose()); cockpitKit = null; }
    for (let i = 0; i < 2; i++) if (mirrorRT[i]) { mirrorRT[i].dispose(); mirrorRT[i] = null; }
    if (sun) { sun.shadow.dispose(); sun = null; }
    if (world) { world.dispose(); world = null; }
    if (post) { post.dispose(); post = null; }
    if (envTex) { envTex.dispose(); envTex = null; }
    scene = null; built = false;
  }

  function rebuild() {
    const t0 = performance.now();
    clearScene();
    f = f1FeaturesFor(level);
    env = f1EnvFor(mapId);
    path = givenPath || new TrackPath(pts, f1HeightFn(env));
    world = buildWorld(THREE, path, env, f);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(env.fog, env.fogNear, env.fogFar);
    scene.add(world.group); scene.add(world.sky.mesh);
    sunDir.copy(world.sunDir);
    // sky reflections for the paint, the tarmac and the cockpit: the sky dome is drawn once into a small environment map
    if (f.reflect) {
      try {
        const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), sk = createSky(THREE, env);
        es.add(sk.mesh); envTex = pm.fromScene(es, 0, 0.1, 4000).texture; pm.dispose(); sk.dispose();
        scene.environment = envTex;
      } catch (e) { envTex = null; }
    }
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
    fxLight = new THREE.PointLight(0xffa040, 0, 90, 1.6); scene.add(fxLight);       // flashes and fire in a crash (here from the start, so no shader is rebuilt when it is needed)
    renderer.shadowMap.enabled = f.shadow > 0;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = env.exposure;
    if (f.post) post = makePost(THREE, renderer, f, [env.sat, env.contrast, env.warm]);
    // an invisible copy of the player's car: it draws nothing in the main picture, but throws the car's shadow and shows up in the mirrors
    ghostKit = makeKit(THREE);
    ghost = buildF1Car(THREE, ghostKit, "#c7212b");
    ghost.group.traverse((o: any) => { if (o.isMesh) { o.castShadow = f.shadow > 0; o.receiveShadow = false; } });
    ghost.group.frustumCulled = false; scene.add(ghost.group);
    setGhostVisible(false);
    // the cockpit
    cockpitKit = makeKit(THREE);
    cockpit = createCockpit(THREE, cockpitKit, env, f);
    if (envTex) cockpit.scene.environment = envTex;
    // rear-view mirrors
    mirrorCam = new THREE.PerspectiveCamera(34, 15 / 8.2, 0.5, 1100);
    if (f.mirrors > 0) {
      const w = f.mirrors === 2 ? 320 : 192, h = Math.round(w / 1.83);
      for (let i = 0; i < 2; i++) {
        const rt = new THREE.WebGLRenderTarget(w, h, { type: post && post.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1;     // a mirror shows the picture the other way round
        mirrorRT[i] = rt; cockpit.setMirrorTexture(i, rt.texture);
      }
    } else { const t = cockpit.staticMirror(); cockpit.setMirrorTexture(0, t); cockpit.setMirrorTexture(1, t); }
    lastW = 0; layout(); dirty = false;
    built = true;
    view.buildMs = Math.round(performance.now() - t0);
    if (btn) btn.textContent = "◐ Graphics: " + F1_LEVEL_NAMES[level];
  }

  function setGhostVisible(show: boolean) {
    ghost.group.traverse((o: any) => { if (o.isMesh) { o.material.colorWrite = show; o.material.depthWrite = show; } });
    ghost.parts.helmet.visible = true;
  }

  function ensureRivals(ai: any[]) {
    if (!scene) return;
    if (rivals.length === ai.length && rivals.every((r, i) => r.color === ai[i].color)) return;
    for (const r of rivals) { scene.remove(r.group); disposeCar(r); }
    rivals = [];
    if (!rivalKit) rivalKit = makeKit(THREE);
    ai.forEach((a, i) => {
      const car = buildF1Car(THREE, rivalKit, a.color, [0xf2f2f4, 0x14161a, 0xf2c94c][i % 3]);
      car.group.frustumCulled = false;
      scene.add(car.group);
      rivals.push({ ...car, color: a.color, spin: 0, lastDist: a.dist, lat: 0, latInit: false });
    });
  }

  // ---------------------------------------------------------------------------------------------------- per frame
  const cs = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0, d: 0, h: 0, i: 0, side: 1 };
  const as = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0 };
  const rs = { x: 0, y: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0, slope: 0, kap: 0, arc: 0 };

  /** Moves the sun's shadow window so it covers the area in front of `cam`, snapped to the shadow map's texels so it does not shimmer. */
  function aimSunAt(p: any) {
    if (f.shadow > 0) {
      const R = f.shadowReach, texel = (2 * R) / f.shadow;
      tgt.copy(p);
      xAxis.crossVectors(upV, sunDir).normalize(); yAxis.crossVectors(sunDir, xAxis).normalize();
      const tx = Math.round(tgt.dot(xAxis) / texel) * texel, ty = Math.round(tgt.dot(yAxis) / texel) * texel, tz = tgt.dot(sunDir);
      tgt.copy(xAxis).multiplyScalar(tx).addScaledVector(yAxis, ty).addScaledVector(sunDir, tz);
      sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sunDir, 200);
    } else { sun.position.copy(p).addScaledVector(sunDir, 200); sun.target.position.copy(p); }
    sun.target.updateMatrixWorld();
  }
  function aimSun(cam: any) {
    const R = f.shadowReach || 0;
    cam.getWorldDirection(tmpV);
    aimSunAt(tmpV2.set(cam.position.x + tmpV.x * R * 0.45, cam.position.y - EYE_POS.y, cam.position.z + tmpV.z * R * 0.45));
  }

  /** Where the sun is on the picture, for the glare drawn over it and for the light shafts. */
  function sunOnScreen(cam: any) {
    cam.getWorldDirection(tmpV);
    const dot = tmpV.dot(sunDir);
    tmpV.copy(cam.position).addScaledVector(sunDir, 1000).project(cam);
    return { x: tmpV.x * 0.5 + 0.5, y: tmpV.y * 0.5 + 0.5, glare: smooth(0.55, 0.97, dot) * smooth(-0.04, 0.12, sunDir.y), front: dot > 0 };
  }

  /** One picture: world pass (+ cockpit pass) through the finishing pass, or straight to the canvas on Low. */
  function drawFrame(cam: any, withCockpit: boolean, sp01: number, now: number): F1SunScreen {
    const sc = sunOnScreen(cam);
    if (post) {
      const rays = sc.front && sunDir.y > -0.02 ? [sc.x, sc.y, sc.glare] : null;
      post.render(scene, cam, withCockpit ? cockpit.scene : null, withCockpit ? cockpit.camera : null, sp01, now, rays, sun.color);
    } else {
      renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, cam);
      if (withCockpit) { renderer.clearDepth(); renderer.render(cockpit.scene, cockpit.camera); }
    }
    return { x: sc.x * cv.width, y: (1 - sc.y) * cv.height, glare: sc.glare, post: !!post };
  }

  function renderMirrors(player: any, base: any) {
    if (!f.mirrors || !mirrorRT[0]) return;
    setGhostVisible(true);
    const which = f.mirrors === 1 ? [mirrorTick++ & 1] : [0, 1];
    for (const i of which) {
      const s = i === 0 ? -1 : 1;
      tmpV.set(s * 0.55, 0.66, 0.6).sub(eyeL).applyQuaternion(qc).add(camera.position);
      mirrorCam.position.copy(tmpV);
      tmpV2.set(s * 0.2, -0.05, -1).applyQuaternion(qc).add(tmpV);
      mirrorCam.up.copy(upV); mirrorCam.lookAt(tmpV2);
      mirrorRT[i].texture.needsUpdate = false;
      renderer.setRenderTarget(mirrorRT[i]); renderer.clear(); renderer.render(scene, mirrorCam);
    }
    setGhostVisible(false);
  }

  view.render = function (player: any, aiCars: any[], now: number, dt: number, gLat: number, extra: any): F1SunScreen | null {
    if (!view.ok || !built || view.crashing) return null;
    view.last = { player, aiCars };
    if (dirty) { dirty = false; layout(); }
    ensureRivals(aiCars);
    const spd = Math.max(0, player.speed || 0), sp01 = Math.min(1, spd / 115), shk = Math.min(1.6, spd / 90);
    const u = player.lapDist || 0, lat = player.lat !== undefined ? player.lat : (player.lane || 0) * LANE_W;
    path.at(u, cs); path.at(u + 0.0065, as);
    const rum = (player.rumble || 0);
    // the camera is the driver's head, on the chassis: it carries the road, the slide, the roll, the dive and the bumps
    camera.position.set(cs.x + cs.rx * lat, cs.y + EYE_POS.y + (player.heave || 0) + Math.sin(now * 0.09) * shk * 0.004 + Math.sin(now * 0.31) * rum * 0.012, cs.z + cs.rz * lat);
    tgt.set(as.x + as.rx * lat, as.y + EYE_POS.y * 0.9 + Math.sin(now * 0.13) * shk * 0.01, as.z + as.rz * lat);
    camera.up.copy(upV);
    camera.lookAt(tgt);
    camera.rotateY(-(player.slide || 0));
    camera.rotateX((player.pitch || 0) + Math.sin(now * 0.37) * rum * 0.004);
    camera.rotateZ((player.roll || 0) + Math.sin(now * 0.23) * rum * 0.006);
    const wantFov = 62 + 9 * sp01;
    fov += (wantFov - fov) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); syncCockpitCam(); }
    camera.updateMatrixWorld();
    qc.copy(camera.quaternion).multiply(flip);
    tmpV.copy(eyeL).applyQuaternion(qc);
    const base = tmpV2.copy(camera.position).sub(tmpV);                      // where the car's origin is in the world

    aimSun(camera);
    renderer.shadowMap.needsUpdate = f.shadow > 0;

    // the player's own car, invisible: shadow on the road, and its rear in the mirrors
    ghost.group.position.copy(base); ghost.group.quaternion.copy(qc);
    ghost.setSuspension(player.wheel || [0, 0, 0, 0], player.steer || 0);

    // rivals: the game's own lap position, in the same lanes as the old feed, and they make room when you come alongside
    rivals.forEach((r, idx) => {
      const a = aiCars[idx]; if (!a) return;
      let ln = RIVAL_LANES[idx % RIVAL_LANES.length]! * (1 + Math.sin(now * 0.0007 + idx * 2) * 0.08) * LANE_W * 0.9;
      let gap = a.dist - u; if (gap > 0.5) gap -= 1; if (gap < -0.5) gap += 1;
      const along = gap * path.total;
      if (Math.abs(along) < 16 && Math.abs(ln - lat) < 2.8) ln = lat + (ln >= lat ? 1 : -1) * 2.8;
      ln = Math.max(-(ROAD_HALF - 1.3), Math.min(ROAD_HALF - 1.3, ln));
      if (!r.latInit) { r.lat = ln; r.latInit = true; }
      r.lat += (ln - r.lat) * (1 - Math.exp(-dt / 0.25));
      path.at(a.dist, rs);
      let dd = a.dist - r.lastDist; if (dd < -0.5) dd += 1; if (dd > 0.5) dd -= 1; r.lastDist = a.dist;
      r.group.position.set(rs.x + rs.rx * r.lat, rs.y, rs.z + rs.rz * r.lat);
      r.group.rotation.set(0, Math.atan2(rs.fx, rs.fz), 0);
      r.group.rotateZ(Math.max(-0.05, Math.min(0.05, rs.kap * 0.35)));
      r.spin += dd * path.total / 0.37;
      for (const w of r.wheels) w.rotation.x = r.spin;
      r.setSuspension([rs.kap * 0.25, -rs.kap * 0.25, rs.kap * 0.25, -rs.kap * 0.25], rs.kap * 0.5);
      const braking = Math.sin(now * 0.002 + idx) > 0.6 || env.dusk;
      r.brake.material.color.setHex(braking ? 0xff2a2a : 0x4a0808);
    });

    world.update(dt, camera.position);
    world.sky.mesh.position.copy(camera.position);

    // cockpit: the driver's seat, wheel, tyres and mirrors follow the game's state
    cockpit.update(player, now, dt, camera.quaternion, sunDir, extra || {});
    renderMirrors(player, base);
    const res = drawFrame(camera, true, sp01, now);
    renderer.shadowMap.needsUpdate = false;
    return res;
  };

  // ---------------------------------------------------------------------------------------------------- crash
  /** Called by the game the moment the car touches the barrier: plays one of the crash scenes, then calls hooks.done(). */
  view.crash = function (hit: any, specs: any, hooks: any) {
    if (!view.ok || !built) { if (hooks && hooks.done) hooks.done(); return false; }
    if (crash) crash.dispose();
    const last = view.last && view.last.player;
    crash = createCrash({
      THREE, renderer, scene, camera, cv, path, world, env, f, sunDir, sun, hit, specs, player: last, aiCars: view.last && view.last.aiCars, rivals, ghost, post,
      drawFrame, aimSun, aimSunAt, fxLight, setShadow: (v: boolean) => { renderer.shadowMap.needsUpdate = v && f.shadow > 0; }, cockpit, hooks: hooks || {},
    });
    view.crashing = true;
    crash.start();
    return true;
  };
  view.endCrash = function () {
    if (crash) { crash.dispose(); crash = null; }
    view.crashing = false;
    if (scene) { scene.traverse((o: any) => { if (o.userData && o.userData.crashHidden) { o.visible = true; o.userData.crashHidden = false; } }); }
    if (world && world.repair) world.repair();
  };

  // ---------------------------------------------------------------------------------------------------- public
  /** `p` are the game's own (already adjusted) track points and `tp` the path made from them by the driving rules, so both share one road. */
  view.setTrack = function (id: string, p: Array<{ x: number; y: number }>, tp: any) {
    const s = id + ":" + level + ":" + p.length + ":" + p[1].x.toFixed(2) + ":" + p[1].y.toFixed(2) + ":" + p[Math.floor(p.length / 2)].x.toFixed(2);
    if (s === sig && built) { view.endCrash(); return; }
    sig = s; mapId = id; pts = p.map((q) => ({ x: q.x, y: q.y })); givenPath = tp;
    rebuild();
  };
  view.sunAz = function () { return env ? env.sunAz : -0.9; };
  view.dbg = function () { return { THREE, renderer, scene, camera, sun, hemi, world, path, post, sunDir, env, rivals, ghost, cockpit, crash, f }; };
  view.level = function () { return level; };
  view.setLevel = function (l: 0 | 1 | 2) {
    level = l; saveF1Level(l);
    if (mapId) { const was = view.crashing; sig = ""; rebuild(); if (was) view.crashing = false; } else if (btn) btn.textContent = "◐ Graphics: " + F1_LEVEL_NAMES[level];
  };
  view.fail = function () {
    if (!view.ok) return;
    view.ok = false;
    if (crash) { try { crash.abort(); } catch (e) {} }
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

  function onBtn(e: Event) { e.preventDefault(); if (view.crashing) return; view.setLevel(nextF1Level(level)); try { cv.focus(); } catch (err) {} }
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
