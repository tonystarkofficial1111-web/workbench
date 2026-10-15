// @ts-nocheck
import { createFsCtx, DAY_LENGTH, type FsCtx } from "./ctx";
import { buildLand, N, START } from "./land";
import { FsGame, SAVE_VERSION, type FsState } from "./game";
import { TreeField } from "../infinite/trees";
import { Foliage } from "../infinite/foliage";
import { Fx } from "../infinite/fx";
import { installAnim } from "../infinite/anim";
import { installSky } from "../infinite/sky";
import { disposeHumanCache } from "../infinite/humans";
import { disposeAnimalCache } from "./models";
import { clamp } from "../infinite/rng";
import { BUILD, type BType } from "./data";
import { FsUi } from "./ui";
import { FsRaid } from "./raid";

declare const __WB_DBG__: boolean;

/**
 * Free Style: the third Block World mode. It runs on its own canvas over the Block World tab (the Block World engine sleeps meanwhile):
 * a wide land, a tent, villagers with needs and jobs, animals, buildings, raids. Saved to localStorage as you play.
 */
export const SAVE_KEY = "wb-freestyle-v1";

export function readSave(): FsState | null {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const o = JSON.parse(s); return o && o.v === SAVE_VERSION ? o : null; } catch { return null; }
}

let current: any = null;

/** Open Free Style over the Block World tab. `onExit` runs after it closes. */
export function openFreeStyle(onExit: () => void) {
  if (current) return current;
  const tab = document.getElementById("tab-world")!;
  const host = document.createElement("div");
  host.className = "fs-host";
  tab.appendChild(host); tab.classList.add("fs-on");
  const save = readSave();
  const ui0 = document.createElement("div"); ui0.className = "fs-start"; host.appendChild(ui0);
  const close = () => { host.remove(); tab.classList.remove("fs-on"); current = null; onExit(); };
  const startWith = (state: FsState | null) => { ui0.remove(); current = runGame(host, state, close); };
  // continue or start over
  if (save) {
    const days = Math.floor(save.time / DAY_LENGTH) + 1, pop = save.villagers.length;
    ui0.innerHTML = `<div class="fs-card"><h2>⛺ Free Style</h2><p>You have a village saved: <b>Day ${days}</b>, ${pop} villager${pop === 1 ? "" : "s"}, ${save.buildings.length} buildings.</p>
      <div class="fs-row"><button class="fs-btn primary" data-a="cont">Continue</button><button class="fs-btn" data-a="new">New land</button><button class="fs-btn ghost" data-a="back">Back</button></div>
      <p class="fs-small" data-a="warn" style="display:none">Starting a new land replaces the saved village. Click <b>New land</b> again to confirm.</p></div>`;
    let armed = false;
    ui0.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest("[data-a]")?.getAttribute("data-a");
      if (a === "cont") startWith(save);
      else if (a === "new") { if (!armed) { armed = true; (ui0.querySelector('[data-a="warn"]') as HTMLElement).style.display = ""; } else startWith(null); }
      else if (a === "back") close();
    });
  } else startWith(null);
  current = current || { close };
  return current;
}

function runGame(host: HTMLElement, saved: FsState | null, close: () => void) {
  disposeHumanCache();   // people are built with this renderer's materials, not the Infinite world's
  const ctx: FsCtx = createFsCtx(host);
  const env = ctx.env, T = ctx.T;
  const S: FsState = saved || FsGame.fresh((Math.random() * 1e9) | 0);
  ctx.time = S.time;
  const loading = document.createElement("div"); loading.className = "fs-loading"; loading.textContent = "Building the land…"; host.appendChild(loading);

  const land = buildLand(ctx, S.seed);
  env.getGroundHeight = () => 1;
  ctx.island = land.island;
  const field = (ctx.trees = new TreeField(ctx, S.seed));
  ctx.fx = new Fx(ctx);
  installAnim(ctx);
  ctx.foliage = new Foliage(ctx, land.island, S.seed);
  installSky(ctx);
  ctx.frame.push((dt) => { field.update(dt); ctx.fx && ctx.fx.update(dt); });

  const game = new FsGame(ctx, land, field, S);
  if (saved) game.restore(); else game.setupNew();
  ctx.gfxChanged.push(() => game.refreshGfx());
  (ctx as any).applyGfx();
  if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) (window as any).__fs = { ctx, game, land };

  // ------------------------------------------------------------------------------------------------ camera
  const cam = { tx: START.x, tz: START.z + 3, yaw: 0, pitch: 0.82, dist: 30, follow: false };
  const keys: Record<string, boolean> = {};
  const typing = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || ({} as any)).tagName || "");
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (!host.isConnected || typing()) return;
    keys[e.code] = down;
    if (!down) return;
    if (e.code === "KeyF") { cam.follow = !cam.follow; ui.toast(cam.follow ? "Camera follows your leader" : "Camera free", "info"); }
    if (e.code === "Escape") { if (ghost) cancelGhost(); else ui.closeAll(); }
    if (e.code === "KeyR" && ghost) { ghost.rot = (ghost.rot + Math.PI / 2) % (Math.PI * 2); ghost.mesh.rotation.y = ghost.rot; }
    if (e.code === "Space") { speed = speed === 0 ? 1 : 0; ui.setSpeed(speed); e.preventDefault(); }
    if (e.code === "KeyT") ui.openTent();
  };
  const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false), blur = () => { for (const k in keys) keys[k] = false; };
  window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", blur);

  function updateCamera(dt: number) {
    const pan = (cam.dist * 0.9 + 8) * dt;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let mx = 0, mz = 0;
    if (keys.KeyW || keys.ArrowUp) { mx += fx; mz += fz; }
    if (keys.KeyS || keys.ArrowDown) { mx -= fx; mz -= fz; }
    if (keys.KeyD || keys.ArrowRight) { mx += rx; mz += rz; }
    if (keys.KeyA || keys.ArrowLeft) { mx -= rx; mz -= rz; }
    if (mx || mz) { cam.follow = false; cam.tx += mx * pan; cam.tz += mz * pan; }
    if (keys.KeyQ) cam.yaw += 1.6 * dt;
    if (keys.KeyE) cam.yaw -= 1.6 * dt;
    if (keys.KeyZ) cam.pitch = clamp(cam.pitch - 0.8 * dt, 0.22, 1.35);
    if (keys.KeyX) cam.pitch = clamp(cam.pitch + 0.8 * dt, 0.22, 1.35);
    if (keys.Equal || keys.NumpadAdd) cam.dist = clamp(cam.dist - 30 * dt, 9, 110);
    if (keys.Minus || keys.NumpadSubtract) cam.dist = clamp(cam.dist + 30 * dt, 9, 110);
    if (cam.follow && game.leader) { cam.tx += (game.leader.x - cam.tx) * Math.min(1, dt * 4); cam.tz += (game.leader.z - cam.tz) * Math.min(1, dt * 4); }
    cam.tx = clamp(cam.tx, 4, N - 4); cam.tz = clamp(cam.tz, 4, N - 4);
    const c = ctx.camera, cp = Math.cos(cam.pitch);
    c.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, 1 + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
    c.lookAt(cam.tx, 1, cam.tz);
    env.camTarget.set(cam.tx, 0, cam.tz);
    env.camDistance = cam.dist;
  }
  const focus = (x: number, z: number) => { cam.tx = x; cam.tz = z; cam.follow = false; };

  // ------------------------------------------------------------------------------------------------ pointer: click, drag to pan, right-drag to turn, wheel to zoom
  const canvas = ctx.canvas;
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), -1), hit = new T.Vector3(), tmpV = new T.Vector3();
  function groundAt(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }
  function screenOf(x: number, y: number, z: number) {
    const r = canvas.getBoundingClientRect();
    tmpV.set(x, y, z).project(ctx.camera);
    return { x: r.left + (tmpV.x + 1) / 2 * r.width, y: r.top + (1 - tmpV.y) / 2 * r.height, behind: tmpV.z > 1 };
  }
  /** the villager under a screen point (within a few pixels) */
  function villagerAt(cx: number, cy: number, maxPx = 30) {
    let best: any = null, bd = maxPx;
    for (const v of S.villagers) {
      if (v.asleep || v.hidden) continue;
      const s = screenOf(v.x, 1 + (v.y || 0) + (v.collapsed > 0 ? 0.2 : 0.6), v.z); if (s.behind) continue;
      const d = Math.hypot(s.x - cx, s.y - cy) * (cam.dist / 30) ** 0.3; if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  function animalAt(cx: number, cy: number) {
    let best: any = null, bd = 34;
    for (const a of S.animals) { if (a.st === "dead") continue; const s = screenOf(a.x, 1.35, a.z); if (s.behind) continue; const d = Math.hypot(s.x - cx, s.y - cy); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  (ctx as any).villagerAt = villagerAt;

  let drag: any = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    canvas.focus();
    drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: 0, tx: cam.tx, tz: cam.tz, yaw: cam.yaw, pitch: cam.pitch, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (ghost) moveGhost(e.clientX, e.clientY);
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved < 6) return;
    if (drag.btn === 2 || drag.btn === 1 || e.shiftKey) { cam.yaw = drag.yaw - dx * 0.006; cam.pitch = clamp(drag.pitch + dy * 0.004, 0.22, 1.35); }
    else {   // pan: the ground follows the pointer
      const k = cam.dist / Math.max(300, canvas.clientHeight) * 1.6;
      const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      cam.tx = drag.tx - (dx * rx - dy * fx / Math.max(0.4, Math.sin(cam.pitch))) * k;
      cam.tz = drag.tz - (dx * rz - dy * fz / Math.max(0.4, Math.sin(cam.pitch))) * k;
      cam.follow = false;
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    const d = drag; drag = null;
    if (!d || d.moved >= 6) return;
    if (d.btn === 2) { if (ghost) cancelGhost(); return; }
    click(e.clientX, e.clientY);
  });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.89), 9, 110); }, { passive: false });

  function click(cx: number, cy: number) {
    if (ghost) { tryPlace(); return; }
    if (raid.battle) { const q = groundAt(cx, cy); q && raid.battleClick(q.x, q.z); return; }
    const v = villagerAt(cx, cy);
    if (v && !(v.leader && game.sel === -1 && false)) { game.sel = v.id; ui.select(v); return; }
    const L = game.leader && game.leader.collapsed <= 0 ? game.leader : null;
    const a = animalAt(cx, cy);
    if (a && L) { game.order("hunt", a); ui.toast("Your leader goes hunting a " + a.kind + (L.spear ? "" : " (bare hands: careful!)"), "info"); return; }
    const p = groundAt(cx, cy); if (!p) return;
    // buildings
    for (const b of S.buildings) {
      if (Math.hypot(b.x - p.x, b.z - p.z) < BUILD[b.type].r + 0.3) {
        if (b.type === "tent") { ui.openTent(); return; }
        if (!b.built && L && ui.selIsLeader()) { game.order("build", b); ui.toast("Your leader lends a hand on the " + BUILD[b.type].name, "info"); return; }
        ui.openBuilding(b); return;
      }
    }
    if (!L) { game.sel = -1; ui.select(null); return; }
    for (const n of land.nodes) if (Math.hypot(n.x - p.x, n.z - p.z) < n.r + 0.4) { game.order("dig", n); ui.toast("Your leader mines " + n.kind, "info"); return; }
    let tr: any = null, td = 1.5;
    for (const t of game.trees) { const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < td) { td = d; tr = t; } }
    if (tr) { game.order("chop", tr); ui.toast(tr.grow ? "That tree is still growing" : "Your leader chops the tree", "info"); return; }
    if (!land.isLand(p.x, p.z)) {
      const s = land.nearestShore(p.x, p.z);
      if (s && Math.hypot(s[0] - p.x, s[1] - p.z) < 4) { game.order("fetch", { x: s[0], z: s[1] }); ui.toast("Your leader fetches water", "info"); }
      return;
    }
    for (const w of game.built("well")) if (Math.hypot(w.x - p.x, w.z - p.z) < 1.4) { game.order("fetch", { x: w.x, z: w.z, well: w }); return; }
    game.order("goto", { x: p.x, z: p.z });
    marker(p.x, p.z);
    game.sel = -1; ui.select(null);
  }

  // a little ring where the leader is sent
  const mk = new T.Mesh(new T.RingGeometry(0.25, 0.4, 20), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  mk.rotation.x = -Math.PI / 2; mk.renderOrder = 4; ctx.scene.add(mk);
  let mkT = 0;
  const marker = (x: number, z: number) => { mk.position.set(x, 1.03, z); mkT = 1; };

  // ------------------------------------------------------------------------------------------------ placing a building
  let ghost: any = null;
  function startGhost(type: BType) {
    cancelGhost();
    const r = BUILD[type].r;
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.28, depthWrite: false });
    const cyl = new T.Mesh(new T.CylinderGeometry(r, r, 1.6, 24, 1, true), mat); cyl.position.y = 0.8;
    const disc = new T.Mesh(new T.CircleGeometry(r, 24), mat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04;
    const arrow = new T.Mesh(new T.ConeGeometry(0.3, 0.6, 4), mat); arrow.rotation.x = Math.PI / 2; arrow.position.set(0, 0.2, r + 0.4);
    g.add(cyl, disc, arrow); g.position.set(cam.tx, 1, cam.tz); ctx.scene.add(g);
    ghost = { type, mesh: g, mat, rot: 0, ok: false, why: "" };
    ui.ghostHelp(type);
  }
  function moveGhost(cx: number, cy: number) {
    const p = groundAt(cx, cy); if (!p || !ghost) return;
    ghost.mesh.position.set(p.x, 1, p.z);
    ghost.why = game.canPlace(ghost.type, p.x, p.z) || "";
    ghost.ok = !ghost.why;
    ghost.mat.color.setHex(ghost.ok ? 0x44ff66 : 0xff4444);
    ui.ghostWhy(ghost.why);
  }
  function tryPlace() {
    const p = ghost.mesh.position;
    const why = game.place(ghost.type, p.x, p.z, ghost.rot);
    if (why) { ui.toast(why, "warn"); return; }
    cancelGhost();
  }
  function cancelGhost() { if (!ghost) return; ctx.scene.remove(ghost.mesh); ghost.mesh.traverse((o: any) => o.geometry && o.geometry.dispose()); ghost.mat.dispose(); ghost = null; ui.ghostHelp(null); }

  // ------------------------------------------------------------------------------------------------ saving
  let saveErr = false;
  function writeSave(manual = false) {
    try { localStorage.setItem(SAVE_KEY, game.serialize()); if (manual) ui.toast("Village saved", "good"); saveErr = false; }
    catch (e) { if (!saveErr || manual) ui.toast("Could not save (browser storage is full or blocked)", "bad"); saveErr = true; }
  }
  game.on((e) => { if (e.type === "dawn") writeSave(false); });
  const onHide = () => { if (document.visibilityState === "hidden") writeSave(false); };
  const onUnload = () => writeSave(false);
  document.addEventListener("visibilitychange", onHide); window.addEventListener("beforeunload", onUnload);

  // ------------------------------------------------------------------------------------------------ UI
  let speed = 1;
  const ui = new FsUi(host, game, {
    setSpeed: (s: number) => { speed = s; },
    getSpeed: () => speed,
    save: () => writeSave(true),
    exit: () => stop(),
    build: (t: BType) => startGhost(t),
    focus: (x: number, z: number) => focus(x, z),
    gfx: () => { ctx.gfx.cycle(); return ctx.gfx.name(); },
    gfxName: () => ctx.gfx.name(),
    screenOf, villagerAt,
  });
  const raid = new FsRaid(game, land, field, ui, { focus: (x: number, z: number) => focus(x, z), save: () => writeSave(false) });
  if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) (window as any).__fs.raid = raid;

  // ------------------------------------------------------------------------------------------------ the loop
  let raf = 0, last = performance.now(), saveT = 0, stopped = false;
  function frame() {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now(), rdt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    const tab = document.getElementById("tab-world");
    if (!tab || !tab.classList.contains("active") || document.hidden) return;
    try {
      ctx.rtime += rdt; ctx.dt = rdt;
      // the night goes by faster when everyone is asleep and you asked for it
      const sim = rdt * speed * (ui.skipNight && game.isNight() ? 6 : 1);
      if (ui.skipNight && !game.isNight()) ui.skipNight = false;
      let left = sim;
      while (left > 1e-6) { const st = Math.min(0.1, left); if (raid.battle) raid.battleUpdate(st); else { game.update(st); raid.homeUpdate(st); } left -= st; }
      ctx.time = S.time;
      ctx.air.update(rdt, ctx.rtime);
      for (let i = 0; i < ctx.frame.length; i++) ctx.frame[i]!(rdt);
      updateCamera(rdt);
      if (raid.battle) raid.battleDraw(rdt); else { game.draw(rdt, cam.tx, cam.tz); raid.attackDraw(rdt); }
      if (mkT > 0) { mkT = Math.max(0, mkT - rdt * 1.4); mk.material.opacity = mkT; mk.scale.setScalar(1 + (1 - mkT) * 0.8); }
      ui.frame(rdt);
      ctx.renderer.render(ctx.scene, ctx.camera);
      saveT += rdt; if (saveT > 60) { saveT = 0; writeSave(false); }
    } catch (e) { console.error("free style frame", e); }
  }
  loading.remove();
  raf = requestAnimationFrame(frame);

  function stop() {
    if (stopped) return;
    writeSave(false);
    stopped = true; cancelAnimationFrame(raf);
    window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onUnload);
    cancelGhost();
    raid.dispose();
    ui.dispose();
    for (const f of ctx.cleanup.splice(0)) { try { f(); } catch (e) { console.error(e); } }
    game.dispose();
    ctx.foliage && ctx.foliage.dispose(); ctx.trees && ctx.trees.dispose(); ctx.fx && ctx.fx.dispose();
    land.dispose();
    mk.geometry.dispose(); mk.material.dispose();
    disposeAnimalCache(); disposeHumanCache();
    ctx.onDispose.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) delete (window as any).__fs;
    close();
  }
  return { close: stop, game, ctx };
}
