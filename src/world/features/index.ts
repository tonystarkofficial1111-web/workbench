// @ts-nocheck
import { createBlockPhoto } from "./photo";
import { lsGet, lsSet } from "../../core/store";

/**
 * Block World features for the engine's modes (Legacy, Infinite; Free Style has its own copies in src/world/freestyle), 5.67.0:
 * - Minimap: the land, territories, castles, buildings, troops, siege engines, zombies and fights; click it to look there.
 * - Daily report: at each dawn a card with what you gathered, built, won and lost, and a chart over the days.
 * - Photo mode: the HUD steps aside, the sun can be moved for the picture, filters, a frame, Save picture.
 * - Weather for Legacy: the engine's rain now comes with thunderstorms, and dry days are sunny, breezy, windy, overcast or foggy
 *   (Infinite already has its own weather).
 */
export function installWorldFeatures(ctx: any, env: any) {
  const T = env.THREE;
  const tab = () => document.getElementById("tab-world");
  const active = () => { const t = tab(); return !!(t && t.classList.contains("active") && !t.classList.contains("fs-on")); };
  const inGame = () => !!env.legacyMode;
  const player = () => (env.legacyFactions || []).find((f: any) => f.isPlayer);

  // ------------------------------------------------------------------------------------------------ photo mode
  const photo = createBlockPhoto({
    host: tab()!, canvas: env.renderer.domElement, name: "Block World",
    render: () => env.renderer.render(env.scene, env.camera),
    dayLength: env.DAY_LENGTH, now: () => env.simTime,
    setSky: (t) => { env.wbPhotoTime = t; },
  });
  const col = document.getElementById("bw-right-col");
  const pbtn = document.createElement("button"); pbtn.type = "button"; pbtn.id = "bw-photo-btn"; pbtn.textContent = "📷 Photo";
  pbtn.title = "Photo mode: hide the screen, move the sun, add a filter and save a picture";
  pbtn.addEventListener("click", () => photo.toggle());
  if (col) col.appendChild(pbtn);
  window.addEventListener("keydown", (e) => { if (e.code === "Escape" && photo.open) photo.exit(); });

  // ------------------------------------------------------------------------------------------------ minimap
  const S = 180;
  const wrap = document.createElement("div"); wrap.id = "bw-minimap"; wrap.title = "Click to look there";
  const cv = document.createElement("canvas"); cv.width = S; cv.height = S; wrap.appendChild(cv);
  const lbl = document.createElement("div"); lbl.className = "bw-mm-lbl"; wrap.appendChild(lbl);
  const hide = document.createElement("button"); hide.type = "button"; hide.className = "bw-mm-x"; hide.textContent = "–"; hide.title = "Hide / show the map"; wrap.appendChild(hide);
  tab()?.appendChild(wrap);
  let small = lsGet<boolean>("wb-minimap-small", false) === true;
  hide.addEventListener("click", (e) => { e.stopPropagation(); small = !small; lsSet("wb-minimap-small", small); wrap.classList.toggle("small", small); });
  wrap.classList.toggle("small", small);
  const g = cv.getContext("2d")!;
  let land: HTMLCanvasElement | null = null, landKey = "", bx0 = 0, bz0 = 0, bsz = 160;
  function bounds() {
    if (env.wbInf && env.wbInf.on) return [80 - 64, 80 - 64, 128];
    const n = env.LEGACY_MAP_SIZE || 160; return [0, 0, n];
  }
  function buildLand() {
    const [x0, z0, sz] = bounds(); bx0 = x0; bz0 = z0; bsz = sz;
    const c = document.createElement("canvas"); c.width = S; c.height = S; const q = c.getContext("2d")!;
    q.fillStyle = "#1c4a6e"; q.fillRect(0, 0, S, S);
    const R = 90, step = sz / R, px = S / R;
    for (let i = 0; i < R; i++) for (let j = 0; j < R; j++) {
      const x = x0 + (i + 0.5) * step, z = z0 + (j + 0.5) * step;
      let h = 0; try { h = env.getGroundHeight(x, z); } catch { /* ignore */ }
      if (h > 0) { q.fillStyle = h > 1.5 ? "#6f8a4a" : "#5c9a44"; q.fillRect(i * px, j * px, px + 0.6, px + 0.6); }
    }
    // territories: a tint of the owner's colour
    if (!(env.wbInf && env.wbInf.on)) (env.legacyFactions || []).forEach((f: any) => {
      const t = (env.LEGACY_TERRITORIES || []).find((tt: any) => tt.id === f.territoryId); if (!t || f.defeated) return;
      q.fillStyle = "#" + new T.Color(f.color).getHexString() + "40";
      q.beginPath(); q.arc(((t.center.x - x0) / sz) * S, ((t.center.z - z0) / sz) * S, (t.radius / sz) * S, 0, Math.PI * 2); q.fill();
    });
    land = c;
  }
  const P = (x: number, z: number) => [((x - bx0) / bsz) * S, ((z - bz0) / bsz) * S];
  const hex = (c: number) => "#" + new T.Color(c).getHexString();
  let flash = 0;
  function draw() {
    const on = active() && inGame() && !photo.open;
    wrap.style.display = on ? "" : "none";
    if (!on) return;
    const key = (env.wbInf && env.wbInf.on ? "inf" : "leg") + ":" + (env.legacyFactions || []).filter((f: any) => !f.defeated).length;
    if (key !== landKey || !land) { landKey = key; buildLand(); }
    g.drawImage(land!, 0, 0);
    flash += 0.35;
    const F = env.legacyFactions || [];
    // buildings
    (env.legacyBuildings || []).forEach((b: any) => { if (b.dead) return; const [x, y] = P(b.x, b.z); g.fillStyle = b.faction ? hex(b.faction.color) : "#c9b48a"; g.fillRect(x - 1.5, y - 1.5, 3, 3); });
    // castles
    F.forEach((f: any) => { const c = f.castle; if (!c || !c.alive) return; const [x, y] = P(c.x, c.z); g.fillStyle = hex(f.color); g.fillRect(x - 4, y - 4, 8, 8); g.strokeStyle = "#fff"; g.lineWidth = 1; g.strokeRect(x - 4, y - 4, 8, 8); });
    // troops and siege engines; fights where enemies are close
    const all: any[] = [];
    F.forEach((f: any) => { if (f.defeated) return; f.units.forEach((u: any) => u.alive && all.push(u)); f.siegeUnits.forEach((u: any) => u.alive && all.push(u)); });
    if (env.wbInf && env.wbInf.on) env.wbInf.z.forEach((z: any) => z.alive && all.push(z));
    for (const u of all) {
      const [x, y] = P(u.x, u.z);
      if (u.zombie) { g.fillStyle = "#7ad04a"; g.fillRect(x - 1.5, y - 1.5, 3, 3); continue; }
      g.fillStyle = u.faction ? hex(u.faction.color) : "#ddd";
      if (u.isSiege) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-2.5, -2.5, 5, 5); g.restore(); }
      else { g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
    }
    const fights: Array<[number, number]> = [];
    for (let i = 0; i < all.length && fights.length < 12; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j]; if (a.faction === b.faction) continue;
      if (Math.abs(a.x - b.x) < 2.6 && Math.abs(a.z - b.z) < 2.6) { fights.push([(a.x + b.x) / 2, (a.z + b.z) / 2]); break; }
    }
    for (const [fx, fz] of fights) { const [x, y] = P(fx, fz); g.strokeStyle = `rgba(255,70,50,${0.5 + 0.5 * Math.sin(flash)})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5 + 2 * Math.sin(flash), 0, Math.PI * 2); g.stroke(); }
    // you
    const k = env.legacyPlayer;
    if (k && k.alive) { const [x, y] = P(k.x, k.z); g.save(); g.translate(x, y); g.rotate(-(k.group ? k.group.rotation.y : 0)); g.fillStyle = "#ffd34d"; g.beginPath(); g.moveTo(0, 6); g.lineTo(4, -4); g.lineTo(-4, -4); g.closePath(); g.fill(); g.strokeStyle = "#000"; g.stroke(); g.restore(); }
    // the camera's view
    const ct = env.camTarget, cd = Math.max(8, (env.camDistance || 30) * 0.6); const [cx, cy] = P(ct.x, ct.z), r = (cd / bsz) * S;
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1; g.strokeRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
    lbl.textContent = env.wbInf && env.wbInf.on ? "Island" : "Kingdoms";
  }
  cv.addEventListener("click", (e) => {
    const r = cv.getBoundingClientRect(), x = bx0 + ((e.clientX - r.left) / r.width) * bsz, z = bz0 + ((e.clientY - r.top) / r.height) * bsz;
    env.camTarget.set(x, env.camTarget.y, z);
  });

  // ------------------------------------------------------------------------------------------------ daily report
  const card = document.createElement("div"); card.id = "bw-daily"; tab()?.appendChild(card);
  let lastDay = -1, snap: any = null, hist: any[] = [], gathered = { wood: 0, iron: 0 }, prev = { wood: 0, iron: 0 }, hideT: any = 0, runKey = "";
  const enemyAlive = () => { let n = 0; (env.legacyFactions || []).forEach((f: any) => { if (!f.isPlayer && !f.defeated) n += f.units.filter((u: any) => u.alive).length + f.siegeUnits.filter((u: any) => u.alive).length; }); return n; };
  function snapshot(pf: any) {
    const iS = env.iife && env.iife.getS ? env.iife.getS() : null;
    return {
      units: pf.units.filter((u: any) => u.alive).length, siege: pf.siegeUnits.filter((u: any) => u.alive).length,
      buildings: (env.legacyBuildings || []).filter((b: any) => b.faction === pf && !b.dead).length,
      kingdoms: (env.legacyFactions || []).filter((f: any) => !f.isPlayer && !f.defeated).length, enemies: enemyAlive(),
      kills: iS ? iS.kills || 0 : 0, wood: pf.wood, iron: pf.iron || 0, castle: pf.castle ? Math.round(pf.castle.health) : 0,
    };
  }
  function report(day: number, a: any, b: any) {
    if (lsGet<boolean>("wb-daily-off", false) === true) return;
    const inf = env.wbInf && env.wbInf.on;
    const d = (k: string) => b[k] - a[k];
    const sign = (n: number) => (n > 0 ? "+" + n : String(n));
    const rows: Array<[string, string]> = [
      ["🪵 Wood gathered", "+" + Math.round(gathered.wood)], ["⛓️ Iron gathered", "+" + Math.round(gathered.iron)],
      ["🏠 Buildings", b.buildings + " (" + sign(d("buildings")) + ")"], ["⚔️ Soldiers", b.units + " (" + sign(d("units")) + ")"],
      ["🏹 Siege engines", String(b.siege)], inf ? ["🧟 Zombies killed", "+" + d("kills")] : ["👑 Kingdoms left", b.kingdoms + (d("kingdoms") < 0 ? " (" + -d("kingdoms") + " fell!)" : "")],
      ["🏰 Castle", b.castle + " HP"],
    ];
    hist.push({ day, units: b.units, wood: b.wood, buildings: b.buildings });
    card.innerHTML = `<div class="bw-dh"><b>🌅 Day ${day} report</b><button type="button" data-x="1">✕</button></div>` +
      `<div class="bw-dg">${rows.map(([k, v]) => `<div><em>${k}</em><b>${v}</b></div>`).join("")}</div>` +
      `<canvas width="300" height="70"></canvas><div class="bw-dk"><i style="background:#ffd34d"></i>Soldiers <i style="background:#c9a06a"></i>Wood <i style="background:#7ad0ff"></i>Buildings</div>` +
      `<label class="bw-doff"><input type="checkbox" data-off="1"> Don't show these reports</label>`;
    card.classList.add("on");
    const c2 = card.querySelector("canvas") as HTMLCanvasElement, q = c2.getContext("2d")!;
    q.fillStyle = "rgba(10,14,22,.6)"; q.fillRect(0, 0, 300, 70);
    const H = hist.slice(-20), line = (key: string, color: string) => {
      const max = Math.max(1, ...H.map((h) => h[key])); q.strokeStyle = color; q.lineWidth = 2; q.beginPath();
      H.forEach((h, i) => { const x = 8 + (i / Math.max(1, H.length - 1)) * 284, y = 62 - (h[key] / max) * 54; i ? q.lineTo(x, y) : q.moveTo(x, y); }); q.stroke();
    };
    if (H.length > 1) { line("wood", "#c9a06a"); line("buildings", "#7ad0ff"); line("units", "#ffd34d"); }
    else { q.fillStyle = "#9fb0c0"; q.font = "11px system-ui"; q.fillText("The chart fills in over the days", 70, 40); }
    gathered = { wood: 0, iron: 0 };
    clearTimeout(hideT); hideT = setTimeout(() => card.classList.remove("on"), 15000);
  }
  card.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-x]")) card.classList.remove("on"); });
  card.addEventListener("change", (e) => { const el = e.target as HTMLInputElement; if (el.dataset.off) { lsSet("wb-daily-off", el.checked); if (el.checked) card.classList.remove("on"); } });
  function dailyTick() {
    const pf = player();
    if (!inGame() || !pf) { lastDay = -1; snap = null; hist = []; card.classList.remove("on"); return; }
    const key = (env.wbInf && env.wbInf.on ? "inf" : "leg") + (pf.territoryId || "");
    if (key !== runKey) { runKey = key; lastDay = -1; hist = []; }
    // what was gathered: every rise in the store counts
    if (pf.wood > prev.wood) gathered.wood += pf.wood - prev.wood;
    if ((pf.iron || 0) > prev.iron) gathered.iron += (pf.iron || 0) - prev.iron;
    prev = { wood: pf.wood, iron: pf.iron || 0 };
    const day = env.legacyDay || 1;
    if (lastDay < 0 || !snap) { lastDay = day; snap = snapshot(pf); return; }
    if (day > lastDay) { const now = snapshot(pf); if (active()) report(day, snap, now); snap = now; lastDay = day; }
  }

  // ------------------------------------------------------------------------------------------------ ticks
  setInterval(() => { try { draw(); dailyTick(); if (!active() && photo.open) photo.exit(); photo.tick(); } catch (e) { console.error("world features", e); } }, 200);

  return { photo };
}

/**
 * Weather for Legacy (and the classic sandbox), driven into the shared sky: the engine decides when it rains (and its rain still makes
 * trees grow faster); this adds what kind of day it is. Returns a frame function for the sky's copy of the context.
 */
export function legacyWeather(sctx: any, env: any) {
  const T = env.THREE, air = sctx.air;
  const LABEL: Record<string, string> = { sunny: "☀️ Sunny", breezy: "🍃 Breezy", windy: "💨 Windy", overcast: "☁️ Overcast", fog: "🌫️ Foggy", rain: "🌧️ Rain", storm: "⛈️ Thunderstorm" };
  const KIND: Record<string, { wind: number; cover: number; dark: number; fog: number }> = {
    sunny: { wind: 0.1, cover: 0.25, dark: 0, fog: 0 }, breezy: { wind: 0.27, cover: 0.38, dark: 0, fog: 0 }, windy: { wind: 0.6, cover: 0.48, dark: 0.08, fog: 0 },
    overcast: { wind: 0.2, cover: 0.85, dark: 0.45, fog: 0 }, fog: { wind: 0.06, cover: 0.55, dark: 0.3, fog: 0.85 },
    rain: { wind: 0.34, cover: 0.9, dark: 0.7, fog: 0 }, storm: { wind: 0.9, cover: 0.97, dark: 0.95, fog: 0 },
  };
  let day = -1, kind = "sunny", wasRain = false, flashT = 6, bolt: any = null, boltT = 0, rain = 0;
  const roll = () => { const u = Math.random(); kind = u < 0.3 ? "sunny" : u < 0.55 ? "breezy" : u < 0.73 ? "windy" : u < 0.9 ? "overcast" : "fog"; };
  function strike() {
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 60, x0 = env.camTarget.x + Math.cos(a) * d, z0 = env.camTarget.z + Math.sin(a) * d;
    const pts: number[] = []; let x = x0, y = 60, z = z0;
    while (y > 0.5) { pts.push(x, y, z); y -= 3 + Math.random() * 4; x += (Math.random() - 0.5) * 6; z += (Math.random() - 0.5) * 6; }
    pts.push(x, 0.5, z);
    if (bolt) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    bolt = new T.Line(geo, new T.LineBasicMaterial({ color: 0xe8efff, transparent: true, opacity: 1, fog: false, depthWrite: false })); bolt.frustumCulled = false; env.scene.add(bolt);
    boltT = 0.22; air.flash = 1;
  }
  sctx.cleanup.push(() => { if (bolt) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); bolt = null; } air.flash = 0; air.rain = 0; air.fog = 0; air.storm = 0; });
  sctx.x.weatherLabel = () => LABEL[kind];
  return function frame(dt: number) {
    const d = Math.floor((env.simTime || 0) / (env.DAY_LENGTH || 100));
    const raining = !!env.isRaining;
    if (d !== day) { day = d; if (!raining) roll(); }
    if (raining && !wasRain) kind = Math.random() < 0.35 ? "storm" : "rain";
    if (!raining && wasRain) roll();
    wasRain = raining;
    const k = KIND[kind]!, s = Math.min(1, dt * 0.4);
    rain += ((raining ? 1 : 0) - rain) * Math.min(1, dt * 0.6);
    air.windBase += (k.wind - air.windBase) * s; air.cover += (k.cover - air.cover) * s; air.dark += (k.dark - air.dark) * s;
    air.fog += (k.fog - air.fog) * s; air.rain = rain; air.storm = kind === "storm" ? rain : 0;
    air.flash = Math.max(0, air.flash - dt * 3.2);
    if (kind === "storm" && rain > 0.6) { flashT -= dt; if (flashT <= 0) { strike(); flashT = 5 + Math.random() * 8; } }
    if (bolt) { boltT -= dt; bolt.material.opacity = Math.max(0, Math.min(1, boltT * 6)); if (boltT <= 0) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); bolt = null; } }
    // the weather box: the engine writes the rain countdown; the kind of day goes underneath while it is dry
    const rp = document.getElementById("rain-pct");
    if (rp && !raining && rp.textContent !== LABEL[kind]) rp.textContent = LABEL[kind]!;
    const rd = document.getElementById("rain-days");
    if (rd && raining && kind === "storm" && rd.textContent !== "Thunderstorm") rd.textContent = "Thunderstorm";
  };
}
