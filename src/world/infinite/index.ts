// @ts-nocheck
import type { Ctx, Env } from "./types";
import { Gfx } from "./gfx";
import { Air } from "./air";
import { makeMats } from "./mats";
import { applyTier } from "./mb";
import { Rng, clamp, angDiff } from "./rng";
import { buildIsland, CENTER, GRID } from "./terrain";
import { TreeField, pickKind } from "./trees";
import { Foliage } from "./foliage";
import { Fx } from "./fx";
import { installUnits } from "./units";
import { installAnim } from "./anim";
import { installBuildings } from "./buildings";
import { installCastle } from "./castle";
import { installDefenses } from "./defenses";
import { installSky } from "./sky";
import { installWater } from "./water";
import { installWeather } from "./weather";
import { installSiege } from "../siege";
import { quality } from "../../core/perf";
import { worldBridge } from "../../core/bridge";

declare const __WB_DBG__: boolean;

/**
 * The Infinite world extension: a jungle island twice as wide as the original, with its own trees, plants, caves, water, sky, weather,
 * buildings and people. It is installed once, at the end of the engine's start-up, and only acts while the Infinite world runs;
 * Legacy and the classic sandbox keep the original behaviour (every wrapper passes straight through otherwise).
 */
export function installInfinite(env: Env) {
  const T = env.THREE;
  const gfx = new Gfx();
  const air = new Air(T);
  const mats = makeMats(T, air);
  const ctx: Ctx = {
    env, T, gfx, air, mats, tiered: [], rtime: 0, dt: 0, island: null, trees: null, foliage: null, fx: null,
    frame: [], cleanup: [], started: [], gfxChanged: [], x: {},
    isInf: () => !!(env.wbInf && (env.wbInf.on || env.wbInf.starting)),
  };
  if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) (window as any).__wbInf = ctx;

  // a bigger island: the engine reads these when it starts the Infinite world
  env.WB_ISLAND_R = 56;
  env.WB_GRASS_R = 42;

  const iife = env.iife;
  const units = installUnits(ctx);
  installBuildings(ctx);
  installCastle(ctx);
  installDefenses(ctx);
  try { installSiege(ctx, env); } catch (e) { console.error("siege engines failed to start", e); }   // all modes, not only Infinite
  const worldEl = () => document.getElementById("tab-world");
  const active = () => { const e = worldEl(); return !!(e && e.classList.contains("active")); };
  const attached = (o: any) => { for (let p = o; p; p = p.parent) if (p === env.scene) return true; return false; };
  /** Forget model roots whose building or defense has left the scene. */
  function pruneTiered() {
    for (let i = ctx.tiered.length - 1; i >= 0; i--) {
      const ow = ctx.tiered[i].userData && ctx.tiered[i].userData.owner;
      if (ow && !attached(ow)) ctx.tiered.splice(i, 1);
    }
  }

  // The engine re-stamps shadow flags on every mesh while Shaders are on; the Infinite world's ground, plants, water and sky must not cast
  const origShadowFlags = env.applyShadowFlags;
  env.applyShadowFlags = function () {
    if (!ctx.isInf()) return origShadowFlags();
    const on = env.shadersOn;
    env.scene.traverse((o: any) => { if (o.isMesh) { o.castShadow = on && !o.userData.noShadowCast; o.receiveShadow = on; } });
  };

  // ---------------------------------------------------------------------------------------------------------------- graphics level
  const origSetShaders = env.setShaders;
  let fromGfx = false;
  function applyPixelRatio() {
    try { env.renderer.setPixelRatio(gfx.pixelRatio(window.devicePixelRatio || 1)); } catch { /* ignore */ }
  }
  function applyGfx() {
    if (!ctx.isInf()) return;
    fromGfx = true;
    try { origSetShaders(gfx.level === 2); } finally { fromGfx = false; }
    applyPixelRatio();
    pruneTiered();
    ctx.tiered.forEach((m) => applyTier(m, gfx.f.tier));
    ctx.trees && ctx.trees.applyGfx();
    ctx.foliage && ctx.foliage.applyGfx();
    ctx.gfxChanged.forEach((f) => f());
    const b = document.getElementById("bw-gfx-btn");
    if (b) { b.textContent = "Graphics: " + gfx.name(); b.dataset.level = String(gfx.level); }
  }
  gfx.onChange(applyGfx);
  // The engine's Shaders button and the Developer-options performance monitor change quality too: keep the levels in step.
  env.setShaders = function (on: boolean) {
    origSetShaders(on);
    if (!ctx.isInf()) return;
    if (!fromGfx) {
      gfx.perfCap = null;
      if (on && gfx.level < 2) gfx.set(2, false); else if (!on && gfx.level === 2) gfx.set(1, false);
    }
    applyPixelRatio();
    const b = document.getElementById("bw-gfx-btn");
    if (b) { b.textContent = "Graphics: " + gfx.name(); b.dataset.level = String(gfx.level); }
  };
  const hooks = quality.hooks;
  if (hooks) {
    const origRatio = hooks.setPixelRatio;
    hooks.setPixelRatio = function (r: number) {
      if (!ctx.isInf()) return origRatio(r);
      gfx.perfCap = r; applyPixelRatio();
    };
  }
  env.wbGfxAutoShaders = function () { return !ctx.isInf() || gfx.level === 2; };

  // the Graphics button (Infinite only)
  const rightCol = document.getElementById("bw-right-col");
  const gfxBtn = document.createElement("button");
  gfxBtn.id = "bw-gfx-btn"; gfxBtn.type = "button"; gfxBtn.style.display = "none";
  gfxBtn.title = "Graphics detail: High, Medium or Low. Pick Low on a slow computer or Chromebook.";
  gfxBtn.textContent = "Graphics: " + gfx.name();
  gfxBtn.addEventListener("click", () => { gfx.cycle(); try { env.showWorldWarning("Graphics: " + gfx.name() + (gfx.level === 0 ? " (lowest detail, best for slow computers)" : ""), 2500); } catch { /* ignore */ } });
  const shaderBtn = document.getElementById("shader-toggle");
  if (rightCol) { if (shaderBtn && shaderBtn.parentNode === rightCol) rightCol.insertBefore(gfxBtn, shaderBtn.nextSibling); else rightCol.appendChild(gfxBtn); }

  // camera tilt: Z flattens the view (to see the horizon and the sun), X tilts back down
  const tiltKeys = { KeyZ: false, KeyX: false };
  const typing = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || ({} as any)).tagName || "");
  window.addEventListener("keydown", (e) => { if (e.code in tiltKeys && !typing()) (tiltKeys as any)[e.code] = true; });
  window.addEventListener("keyup", (e) => { if (e.code in tiltKeys) (tiltKeys as any)[e.code] = false; });
  window.addEventListener("blur", () => { tiltKeys.KeyZ = tiltKeys.KeyX = false; });
  function tilt(dt: number) {
    if (!tiltKeys.KeyZ && !tiltKeys.KeyX) return;
    const p = env.camPitch + (tiltKeys.KeyX ? 0.7 : 0) * dt - (tiltKeys.KeyZ ? 0.7 : 0) * dt;
    env.camPitch = clamp(p, 0.17, 1.2);
  }

  // ---------------------------------------------------------------------------------------------------------------- per-frame loop
  const renderer = env.renderer, origRender = renderer.render.bind(renderer);
  let last = performance.now(), lastMode = "";
  // 5.67.0: Legacy and the classic sandbox get the same golden-hour sky (a second copy of the sky module on this ctx's air and graphics level)
  let otherSky: any = null;
  function startOtherSky() {
    // fair weather with some clouds to catch the sunset (the Weather feature sets real weather in these modes)
    air.cover = 0.42; air.dark = air.rain = air.storm = air.fog = air.blood = air.flash = 0;
    const sctx: any = { ...ctx, frame: [], cleanup: [], x: {}, started: [], gfxChanged: [] };
    installSky(sctx);
    otherSky = sctx;
  }
  function stopOtherSky() {
    if (!otherSky) return;
    for (const f of otherSky.cleanup.splice(0)) { try { f(); } catch (e) { console.error(e); } }
    otherSky = null;
  }
  (ctx as any).stopOtherSky = stopOtherSky;
  renderer.render = function (s: any, c: any) {
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    try {
      const mode = !env.legacyMode ? "classic" : env.wbInf.on ? "infinite" : "legacy";
      if (mode !== lastMode) { lastMode = mode; worldBridge.mode.set(mode); }
      gfxBtn.style.display = mode === "infinite" && active() ? "" : "none";
      if (mode === "infinite" && active()) {
        stopOtherSky();
        ctx.dt = dt; ctx.rtime += dt;
        tilt(dt);
        air.update(dt, ctx.rtime);
        for (let i = 0; i < ctx.frame.length; i++) ctx.frame[i]!(dt);
      } else if (mode !== "infinite" && active() && !env.wbInf.starting) {
        if (!otherSky) startOtherSky();
        ctx.rtime += dt;
        air.update(dt, ctx.rtime);
        for (let i = 0; i < otherSky.frame.length; i++) otherSky.frame[i]!(dt);
      }
    } catch (e) { console.error("infinite frame", e); }
    return origRender(s, c);
  };

  // ---------------------------------------------------------------------------------------------------------------- terrain, trees, plants
  function disposeRun() {
    for (const f of ctx.cleanup.splice(0)) { try { f(); } catch (e) { console.error(e); } }
    ctx.foliage && ctx.foliage.dispose(); ctx.foliage = null;
    ctx.trees && ctx.trees.dispose(); ctx.trees = null;
    ctx.fx && ctx.fx.dispose(); ctx.fx = null;
    ctx.island && ctx.island.dispose(); ctx.island = null;
    ctx.frame.length = 0; ctx.tiered.length = 0; ctx.started.length = 0; ctx.gfxChanged.length = 0;
    ctx.x = {};
  }

  env.wbBuildInfiniteTerrain = function () {
    stopOtherSky();
    disposeRun();
    const seed = (Math.random() * 1e9) | 0;
    const island = (ctx.island = buildIsland(ctx, seed));
    const field = (ctx.trees = new TreeField(ctx, seed));
    ctx.fx = new Fx(ctx);
    installAnim(ctx);                    // flags, smoke, vanes and lamps of buildings made from here on
    let prune = 0; ctx.frame.push((dt) => { prune += dt; if (prune > 4) { prune = 0; pruneTiered(); } });
    ctx.foliage = new Foliage(ctx, island, seed);
    populateTrees(ctx, island, field, seed);
    units.startRun();
    installWeather(ctx);                 // before the sky: it sets the cloud / rain amounts the sky reads
    installSky(ctx);
    ctx.started.push(() => installWater(ctx));   // after the engine made (and we replace) its own sea plane
    ctx.frame.push((dt) => { field.update(dt); ctx.fx && ctx.fx.update(dt); units.frame(dt); });
    ctx.gfxChanged.push(() => units.applyGfx());
    ctx.cleanup.push(() => units.stop());
    // new buildings and defenses clear the plants and trees under them
    const seen = new Set<any>();
    let acc = 0;
    ctx.frame.push((dt) => {
      acc += dt; if (acc < 0.4) return; acc = 0;
      const items: Array<{ o: any; r: number }> = [];
      (env.legacyBuildings || []).forEach((b: any) => items.push({ o: b, r: iife.FPB[b.type] || 1.8 }));
      iife.defs.forEach((d: any) => items.push({ o: d, r: d.type === "wall" ? 1.6 : (iife.DEF_R[d.type] || 1) + 0.3 }));
      for (const it of items) {
        if (seen.has(it.o)) continue;
        seen.add(it.o);
        ctx.trees && ctx.trees.clearArea(it.o.x, it.o.z, it.r);
        ctx.foliage && ctx.foliage.clearArea(it.o.x, it.o.z, it.r + 0.2);
      }
    });
  };

  /** Starting jungle: choppable trees thick near the castle's clearing edge, thinning out to palms on the beach, plus giant scenery trees. */
  function populateTrees(c: Ctx, island: any, field: TreeField, seed: number) {
    const rnd = new Rng(seed * 3 + 1), list: any[] = env.trees;
    const okSpot = (x: number, z: number, minD: number) => {
      if (!island.isLand(x, z)) return false;
      if (island.dWater[Math.floor(z) * GRID + Math.floor(x)]! < 1.6) return false;
      if (island.obstacles.some((o: any) => Math.hypot(o.x - x, o.z - z) < o.r + 0.9)) return false;
      if (island.pathDist(x, z) < 0.9) return false;
      return !list.some((o: any) => Math.hypot(o.x - x, o.z - z) < minD);
    };
    const plan = [{ n: 36, r0: 6, r1: 18 }, { n: 76, r0: 18, r1: 36 }, { n: 60, r0: 36, r1: 49 }];
    for (const p of plan) {
      let made = 0;
      for (let tries = 0; made < p.n && tries < p.n * 40; tries++) {
        const a = rnd.range(0, Math.PI * 2), r = rnd.range(p.r0, Math.min(p.r1, island.coastR(a) - 2.5));
        const x = CENTER.x + Math.cos(a) * r, z = CENTER.z + Math.sin(a) * r;
        if (!okSpot(x, z, 2.5)) continue;
        list.push(field.create(x, z, pickKind(island, x, z, rnd), -1000, rnd));
        made++;
      }
    }
    // giants: scenery only, around the outer jungle and the beach
    const giants: Array<[number, number]> = [];
    for (let tries = 0; giants.length < 22 && tries < 600; tries++) {
      const a = rnd.range(0, Math.PI * 2), r = rnd.range(31, island.coastR(a) - 3);
      const x = CENTER.x + Math.cos(a) * r, z = CENTER.z + Math.sin(a) * r;
      if (!island.isLand(x, z) || island.pathDist(x, z) < 3 || island.obstacles.some((o: any) => Math.hypot(o.x - x, o.z - z) < o.r + 2.5)) continue;
      if (giants.some((g) => Math.hypot(g[0] - x, g[1] - z) < 8)) continue;
      if (list.some((o: any) => Math.hypot(o.x - x, o.z - z) < 3)) continue;
      giants.push([x, z]);
      field.addStatic(x, z, "giant", rnd, 1);
      island.obstacles.push({ x, z, r: 1.15, kind: "giant" });
    }
  }

  // saplings the game plants later (and the first trees the original code asks for) get the same jungle look
  const origMakeTree = env.makeTree;
  env.makeTree = function (x: number, z: number, spawnTime: number) {
    const island = ctx.island, field = ctx.trees;
    if (!ctx.isInf() || !island || !field) return origMakeTree(x, z, spawnTime);
    const rnd = new Rng((Math.random() * 1e9) | 0);
    // keep new trees off paths, caves and buildings
    const bad = (px: number, pz: number) => !island.isLand(px, pz) || island.pathDist(px, pz) < 0.8
      || island.obstacles.some((o: any) => Math.hypot(o.x - px, o.z - pz) < o.r + 0.7)
      || (env.legacyBuildings || []).some((b: any) => Math.hypot(b.x - px, b.z - pz) < 2.2);
    for (let i = 0; i < 14 && bad(x, z); i++) { const a = rnd.range(0, 6.28), d = rnd.range(1.2, 4.5); x += Math.cos(a) * d; z += Math.sin(a) * d; }
    return field.create(x, z, pickKind(island, x, z, rnd), spawnTime, rnd);
  };
  const origTreeDown = env.wbTreeDown;
  env.wbTreeDown = function (t: any, by: any) {
    if (ctx.trees && t && t.rec) ctx.trees.chop(t, by);
    else origTreeDown(t, by);
  };

  // ---------------------------------------------------------------------------------------------------------------- ground and movement
  const origGround = env.getGroundHeight;
  env.getGroundHeight = function (x: number, z: number) {
    const isl = ctx.island;
    if (isl && ctx.isInf()) return isl.isLand(x, z) ? 1 : 0;   // the island is one flat layer: no need to search the block map
    return origGround(x, z);
  };
  /** Click-to-move: where does the mouse ray meet the island? (Same shape as the engine's block raycast results.) */
  const origHits = env.wbGroundHits;
  env.wbGroundHits = function (ray: any, list: any[]) {
    const isl = ctx.island;
    if (!isl || !ctx.isInf()) return origHits(ray, list);
    const p = new T.Vector3();
    if (!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -1), p)) return [];
    if (!isl.isLand(p.x, p.z)) return [];
    return [{ point: p, distance: ray.ray.origin.distanceTo(p), object: null }];
  };
  const origMove = env.updateSoldierMovement;
  env.updateSoldierMovement = function (s: any, dt: number) {
    const r = origMove(s, dt);
    const isl = ctx.island;
    if (isl && s && s.alive && s.group && !s.boat && !s.isSiege) pushOffObstacles(isl, s);
    return r;
  };
  function pushOffObstacles(isl: any, s: any) {
    const ob = isl.obstacles;
    for (let i = 0; i < ob.length; i++) {
      const o = ob[i], dx = s.x - o.x, dz = s.z - o.z, lim = o.r + 0.3;
      if (dx > lim || dx < -lim || dz > lim || dz < -lim) continue;
      const d = Math.hypot(dx, dz);
      if (d >= lim) continue;
      const nx = d > 0.001 ? dx / d : 1, nz = d > 0.001 ? dz / d : 0;
      s.dir = s.dir || (Math.random() < 0.5 ? 1 : -1);
      const pu = lim - d + 0.02;
      s.x += (nx - nz * 0.55 * s.dir) * pu; s.z += (nz + nx * 0.55 * s.dir) * pu;   // slide round it instead of sticking
      s.group.position.x = s.x; s.group.position.z = s.z;
    }
  }

  // building and defense placement: keep clear of caves, rocks and the big trees
  {
    const v = iife.getValid();
    const clear = (x: number, z: number, r: number) => {
      const isl = ctx.island; if (!isl || !ctx.isInf()) return true;
      return !isl.obstacles.some((o: any) => Math.hypot(o.x - x, o.z - z) < o.r + r * 0.85);
    };
    iife.setValid(
      (c: any) => {
        if (!v.validDef(c)) return false;
        if (c.type === "wall") { const u = { x: Math.cos(c.rot), z: -Math.sin(c.rot) }, h = iife.WL / 2; return clear(c.x, c.z, 1.0) && clear(c.x + u.x * h, c.z + u.z * h, 0.6) && clear(c.x - u.x * h, c.z - u.z * h, 0.6); }
        return clear(c.x, c.z, iife.DEF_R[c.type] || 1);
      },
      (x: number, z: number, t: string) => v.validBuilding(x, z, t) && clear(x, z, iife.FPB[t] || 2),
    );
  }

  // ---------------------------------------------------------------------------------------------------------------- zombies come up from the real coastline
  env.wbInfSpawn = function (n: number, wave: number, pf: any) {
    const isl = ctx.island;
    const c = pf && pf.castle, cx = c ? c.x : CENTER.x, cz = c ? c.z : CENTER.z;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = isl ? isl.coastR(a) - 1.3 - Math.random() * 1.8 : 22 + Math.random() * 2.5;   // they come up from the shore
      const s = env.makeSoldier(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0x4f7a3a, false, "Zombie", env.wbInf.zf);
      s.health = s.maxHealth = 60 + 6 * wave; s.attackPower = 5 + wave;
      // the island is twice as wide: faster zombies keep the time they need to reach the castle about the same as before
      s.speed = (1.3 + Math.min(0.7, wave * 0.05)) * 1.4 * (s.gait ? s.gait.speedMul : 1);
      s.attackRange = 1.8; s.attackCooldown = 0; s.zombie = true;
      env.updateHealthBar(s); env.wbInf.z.push(s); env.wbInf.zf.units.push(s);
    }
  };

  // ---------------------------------------------------------------------------------------------------------------- start and stop of a run
  const origInit = env.initLegacyMode;
  env.initLegacyMode = function () {
    const r = origInit();
    if (env.wbInf.starting && ctx.island) {
      const w = env.legacyWaterMesh; // the default sea plane stays for now; the water module replaces it
      env.camDistance = 74; env.camPitch = (58 * Math.PI) / 180;
      // nothing is ever closer than ten units to the camera here, so a farther near plane gives the depth buffer five times the precision
      // (stone blocks, flags and plates lie a hair above the surface behind them)
      const oldNear = env.camera.near;
      env.camera.near = 0.5; env.camera.updateProjectionMatrix();
      ctx.cleanup.push(() => { env.camera.near = oldNear; env.camera.updateProjectionMatrix(); });
      applyGfx();
      ctx.started.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    }
    return r;
  };
  const origStop = env.wbInfStop;
  env.wbInfStop = function () {
    (ctx as any).stopping = true;        // leaving the run: nothing should animate any more
    let r: any;
    try { r = origStop(); } finally { (ctx as any).stopping = false; }
    disposeRun();
    return r;
  };

}
