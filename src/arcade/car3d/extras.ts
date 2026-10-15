// @ts-nocheck
import { buildCar } from "./models";
import { el, fmtTime } from "./ui";
import { lsGet, lsSet } from "../../core/store";

/**
 * Extras shared by the 3D car games (Drift King, Rally), 5.67.0:
 * - Paint shop: body colour and livery / trim colour for each car, kept per game.
 * - Ghost car: your best run is recorded and replays as a see-through car next time you race that course with that car.
 * - Telemetry: speed, RPM, gear, throttle and brake through the run, drawn as a chart on the result screen, with sector times
 *   (each lap cut in three) against your best sectors.
 * - Photo mode (P or the camera button): the game pauses, you orbit the car freely, pick a filter and a frame, and save a picture.
 * - Time of day: a second light for each game (Rally: Day / Sunset, Drift King: Night / Sunset), kept per game.
 */
export const PAINTS = [0xc81e1e, 0xe8601c, 0xf2c21a, 0x1f8f3a, 0x1f4fbf, 0x2bb3d9, 0x6a2fb0, 0xd94a9a, 0xf2f2f4, 0x8d939b, 0x2a2c31, 0x0d0e10, 0x6b4a2c, 0xb8964a];
export const LIVERIES = [0x1a1c20, 0xf2f2f4, 0xe8c04a, 0xc81e1e, 0x1f4fbf, 0x2bb3d9, 0xe8601c, 0x1f8f3a];
const hexs = (c: number) => "#" + c.toString(16).padStart(6, "0");

interface PaintSave { [carId: string]: { col: number; acc: number } }
interface GhostSave { metric: number; dt: number; d: number[] }

export function createExtras(o: { game: "drift" | "rally"; T: any; scene: any; stage: any; root: HTMLElement; better: "high" | "low" }) {
  const T = o.T, PAINT_KEY = "wb-paint-" + o.game, TIME_KEY = "wb-time-" + o.game, SECT_KEY = "wb-sectors-" + o.game;

  // ------------------------------------------------------------------------------------------------ paint shop
  const paint = {
    get(carId: string, def: { col: number; acc: number }) { const p = (lsGet<PaintSave>(PAINT_KEY, {}) || {})[carId]; return p ? p : { col: def.col, acc: def.acc }; },
    set(carId: string, col: number | null, acc: number | null, def: { col: number; acc: number }) {
      const all = lsGet<PaintSave>(PAINT_KEY, {}) || {}, cur = all[carId] || { col: def.col, acc: def.acc };
      all[carId] = { col: col ?? cur.col, acc: acc ?? cur.acc }; lsSet(PAINT_KEY, all);
    },
    reset(carId: string) { const all = lsGet<PaintSave>(PAINT_KEY, {}) || {}; delete all[carId]; lsSet(PAINT_KEY, all); },
    /** the paint shop section for the menu */
    html(carId: string, def: { col: number; acc: number }) {
      const p = paint.get(carId, def);
      return `<div class="c3d-sec">Paint shop <small>body and livery colour for this car</small></div><div class="c3d-paint">` +
        `<div class="c3d-sw-row"><em>Body</em>${PAINTS.map((c) => `<button type="button" class="c3d-sw${c === p.col ? " on" : ""}" data-paint="${c}" style="background:${hexs(c)} !important" title="${hexs(c)}"></button>`).join("")}</div>` +
        `<div class="c3d-sw-row"><em>Livery</em>${LIVERIES.map((c) => `<button type="button" class="c3d-sw${c === p.acc ? " on" : ""}" data-livery="${c}" style="background:${hexs(c)} !important" title="${hexs(c)}"></button>`).join("")}` +
        `<button type="button" class="c3d-sw-reset" data-paintreset="1">Factory</button></div></div>`;
    },
  };

  // ------------------------------------------------------------------------------------------------ time of day
  const time = {
    get(def: string) { return lsGet<string>(TIME_KEY, def) || def; },
    set(t: string) { lsSet(TIME_KEY, t); },
    html(cur: string, opts: Array<[string, string]>) {
      return `<div class="c3d-sec">Light</div><div class="c3d-time">${opts.map(([k, n]) => `<button type="button" class="c3d-tb${k === cur ? " on" : ""}" data-time="${k}">${n}</button>`).join("")}</div>`;
    },
  };

  // ------------------------------------------------------------------------------------------------ ghost car
  const ghostMat = new T.MeshBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0.28, depthWrite: false });
  let ghostCar: any = null, ghostData: GhostSave | null = null, rec: number[] = [], recT = 0, ghostOn = lsGet<boolean>("wb-ghost-on", true) !== false;
  const ghostKey = (mapId: string, carId: string, extra = "") => "wb-ghost-" + o.game + "-" + mapId + "-" + carId + extra;
  const ghost = {
    get on() { return ghostOn; },
    toggle() { ghostOn = !ghostOn; lsSet("wb-ghost-on", ghostOn); if (ghostCar) ghostCar.group.visible = false; return ghostOn; },
    has(mapId: string, carId: string) { return !!lsGet<GhostSave>(ghostKey(mapId, carId), null as any); },
    /** start of a run: load the best run to race against and start recording this one */
    start(kit: any, mapId: string, carId: string, col: number, acc: number) {
      ghost.clear();
      rec = []; recT = 0;
      ghostData = lsGet<GhostSave>(ghostKey(mapId, carId), null as any);
      if (ghostData && ghostOn) {
        ghostCar = buildCar(T, kit, carId as any, col, acc, {});
        ghostCar.group.traverse((m: any) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; } if (m.isLight) m.visible = false; });
        o.scene.add(ghostCar.group);
      }
    },
    /** call every frame while racing (t = race clock) */
    frame(t: number, v: any) {
      // record every 0.1 s
      if (t >= recT) { rec.push(Math.round(v.x * 10) / 10, Math.round(v.y * 100) / 100, Math.round(v.z * 10) / 10, Math.round(v.h * 100) / 100); recT += 0.1; }
      if (!ghostCar || !ghostData) return;
      const d = ghostData.d, n = d.length / 4, f = t / ghostData.dt, i = Math.floor(f);
      if (i >= n - 1) { ghostCar.group.visible = false; return; }
      const k = f - i, a = i * 4, b = a + 4;
      let dh = d[b + 3]! - d[a + 3]!; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      ghostCar.group.visible = true;
      ghostCar.group.position.set(d[a]! + (d[b]! - d[a]!) * k, d[a + 1]! + (d[b + 1]! - d[a + 1]!) * k, d[a + 2]! + (d[b + 2]! - d[a + 2]!) * k);
      ghostCar.group.rotation.set(0, d[a + 3]! + dh * k, 0);
    },
    /** end of a run: keep it if it beat the stored one. Returns true for a new ghost. */
    finish(mapId: string, carId: string, metric: number) {
      const old = lsGet<GhostSave>(ghostKey(mapId, carId), null as any);
      const better = !old || (o.better === "high" ? metric > old.metric : metric < old.metric);
      if (better && rec.length > 40) { try { lsSet(ghostKey(mapId, carId), { metric, dt: 0.1, d: rec }); } catch { /* storage full */ } }
      if (ghostCar) ghostCar.group.visible = false;
      return better;
    },
    clear() { if (ghostCar) { o.scene.remove(ghostCar.group); ghostCar.dispose(); ghostCar = null; } ghostData = null; },
  };

  // ------------------------------------------------------------------------------------------------ telemetry
  const tel = { s: [] as number[], next: 0, laps: [] as Array<{ t0: number; sec: number[] }> , cur: { t0: 0, sec: [] as number[] }, lastFrac: 0 };
  const telemetry = {
    start() { tel.s = []; tel.next = 0; tel.laps = []; tel.cur = { t0: 0, sec: [] }; tel.lastFrac = 0; },
    /** t race clock, frac 0..1 progress round the lap, lap number */
    frame(t: number, v: any, inp: any, frac: number, lap: number) {
      if (t >= tel.next) { tel.next += 0.1; tel.s.push(t, v.speed * 2.237, v.rpm || 0, v.gear || 0, inp.throttle || 0, inp.brake || 0); }
      // sectors: a third of the lap each
      const sec = tel.cur.sec;
      if (sec.length < 2 && frac >= (sec.length + 1) / 3 && frac < 0.98) sec.push(t);
    },
    lapDone(t: number) { tel.laps.push({ t0: tel.cur.t0, sec: tel.cur.sec.slice(0, 2), t1: t }); tel.cur = { t0: t, sec: [] }; },
    /** the result-screen block: chart + sector table (call draw() after it is in the page) */
    html(mapId: string, carId: string) {
      const best = (lsGet<Record<string, number[]>>(SECT_KEY, {}) || {})[mapId + "-" + carId] || [];
      const rows = tel.laps.filter((l: any) => l.sec.length === 2).map((l: any, i) => {
        const s = [l.sec[0] - l.t0, l.sec[1] - l.sec[0], l.t1 - l.sec[1]];
        return `<tr><td>Lap ${i + 1}</td>${s.map((x, k) => `<td class="${best[k] && x <= best[k] + 0.005 ? "pb" : ""}">${x.toFixed(2)}${best[k] ? `<small>${x - best[k] >= 0 ? "+" : ""}${(x - best[k]).toFixed(2)}</small>` : ""}</td>`).join("")}<td><b>${fmtTime(l.t1 - l.t0)}</b></td></tr>`;
      }).join("");
      return `<div class="c3d-tele"><div class="c3d-sec">Telemetry</div><canvas class="c3d-tele-cv" width="640" height="190"></canvas>` +
        `<div class="c3d-tele-key"><i style="background:#ffd34d"></i>Speed (mph) <i style="background:#ff5a5a"></i>RPM <i style="background:#7ad0ff"></i>Gear <i style="background:#3ad07a"></i>Throttle <i style="background:#e0503a"></i>Brake</div>` +
        (rows ? `<table class="c3d-sectors"><tr><th></th><th>Sector 1</th><th>Sector 2</th><th>Sector 3</th><th>Lap</th></tr>${rows}</table>` : "") + `</div>`;
    },
    /** store best sectors, draw the chart */
    draw(host: HTMLElement, mapId: string, carId: string) {
      const all = lsGet<Record<string, number[]>>(SECT_KEY, {}) || {}, key = mapId + "-" + carId, best = all[key] || [];
      for (const l of tel.laps as any[]) { if (l.sec.length !== 2) continue; const s = [l.sec[0] - l.t0, l.sec[1] - l.sec[0], l.t1 - l.sec[1]]; s.forEach((x, k) => { if (x > 0.5 && (!best[k] || x < best[k])) best[k] = x; }); }
      all[key] = best; lsSet(SECT_KEY, all);
      const cv = host.querySelector(".c3d-tele-cv") as HTMLCanvasElement; if (!cv) return;
      const g = cv.getContext("2d")!, W = cv.width, H = cv.height, s = tel.s, n = s.length / 6;
      g.fillStyle = "rgba(10,14,22,.85)"; g.fillRect(0, 0, W, H);
      if (n < 2) return;
      const tMax = s[(n - 1) * 6]!, maxSp = Math.max(60, ...Array.from({ length: n }, (_, i) => s[i * 6 + 1]!)), maxR = Math.max(5000, ...Array.from({ length: n }, (_, i) => s[i * 6 + 2]!)), maxG = Math.max(1, ...Array.from({ length: n }, (_, i) => s[i * 6 + 3]!));
      const X = (t: number) => 34 + (t / tMax) * (W - 44), top = 10, ch = H - 50;
      g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1;
      for (let k = 0; k <= 4; k++) { const y = top + (ch * k) / 4; g.beginPath(); g.moveTo(34, y); g.lineTo(W - 10, y); g.stroke(); }
      g.fillStyle = "rgba(255,255,255,.5)"; g.font = "10px system-ui"; g.fillText(Math.round(maxSp) + "", 4, top + 8); g.fillText("0", 20, top + ch);
      // lap marks
      for (const l of tel.laps as any[]) { g.strokeStyle = "rgba(255,255,255,.25)"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(l.t1), top); g.lineTo(X(l.t1), top + ch); g.stroke(); g.setLineDash([]); }
      const line = (idx: number, max: number, color: string, step = false) => {
        g.strokeStyle = color; g.lineWidth = 1.6; g.beginPath();
        for (let i = 0; i < n; i++) { const x = X(s[i * 6]!), y = top + ch - (s[i * 6 + idx]! / max) * ch; if (!i) g.moveTo(x, y); else if (step) { g.lineTo(x, top + ch - (s[(i - 1) * 6 + idx]! / max) * ch); g.lineTo(x, y); } else g.lineTo(x, y); }
        g.stroke();
      };
      line(2, maxR, "rgba(255,90,90,.75)"); line(3, maxG * 1.15, "rgba(122,208,255,.8)", true); line(1, maxSp, "#ffd34d");
      // throttle / brake strip
      const sy = H - 30;
      for (let i = 0; i < n; i++) { const x = X(s[i * 6]!), w = Math.max(1, (W - 44) / n + 0.5); if (s[i * 6 + 4]! > 0.05) { g.fillStyle = `rgba(58,208,122,${0.3 + 0.7 * s[i * 6 + 4]!})`; g.fillRect(x, sy, w, 8); } if (s[i * 6 + 5]! > 0.05) { g.fillStyle = `rgba(224,80,58,${0.3 + 0.7 * s[i * 6 + 5]!})`; g.fillRect(x, sy + 10, w, 8); } }
      g.fillStyle = "rgba(255,255,255,.5)"; g.fillText("0:00", 34, H - 4); g.fillText(fmtTime(tMax), W - 50, H - 4);
    },
  };

  // ------------------------------------------------------------------------------------------------ photo mode
  const FILTERS: Array<[string, string]> = [["Natural", ""], ["Vivid", "saturate(1.45) contrast(1.08)"], ["Golden", "sepia(.32) saturate(1.35) brightness(1.04)"], ["Cinematic", "contrast(1.18) saturate(.85) brightness(.96)"], ["Cool", "hue-rotate(-12deg) saturate(1.15)"], ["B & W", "grayscale(1) contrast(1.25)"]];
  const ui = el("div", "c3d-photo", o.root);
  const btn = el("button", "c3d-photo-btn", o.root, "📷 Photo"); (btn as any).type = "button"; btn.title = "Photo mode (P)";
  let open = false, filter = 0, frame = false, yaw = 0, pitch = 0.25, dist = 7, tx = 0, ty = 0.8, tz = 0, drag: any = null, getTarget: any = null;
  function renderUi() {
    ui.innerHTML = `<div class="c3d-photo-bar"><b>📷 Photo mode</b><span>Drag to turn · wheel to zoom · right-drag to raise</span>` +
      FILTERS.map(([n], i) => `<button type="button" data-f="${i}" class="${i === filter ? "on" : ""}">${n}</button>`).join("") +
      `<button type="button" data-frame="1" class="${frame ? "on" : ""}">▭ Frame</button><button type="button" class="save" data-save="1">💾 Save picture</button><button type="button" data-close="1">✕ Back</button></div>` +
      `<div class="c3d-letter top"></div><div class="c3d-letter bot"></div>`;
    ui.classList.toggle("framed", frame);
  }
  const canvas = o.stage.canvas as HTMLCanvasElement;
  function applyFilter() { canvas.style.filter = open ? FILTERS[filter]![1] : ""; }
  const photo = {
    get open() { return open; },
    /** target(): {x, y, z, h} of the car to frame */
    attach(target: () => { x: number; y: number; z: number; h: number }) { getTarget = target; },
    enter() {
      if (open || !getTarget) return;
      open = true; const t = getTarget(); tx = t.x; ty = t.y + 0.8; tz = t.z; yaw = t.h + Math.PI + 0.6; pitch = 0.22; dist = 6.5;
      o.root.classList.add("c3d-photo-on"); renderUi(); ui.classList.add("on"); applyFilter();
    },
    exit() { open = false; o.root.classList.remove("c3d-photo-on"); ui.classList.remove("on"); applyFilter(); },
    /** place the camera (call instead of the game's camera while open) */
    camera(cam: any) {
      const cp = Math.cos(pitch);
      cam.position.set(tx + Math.sin(yaw) * cp * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * cp * dist);
      cam.lookAt(tx, ty, tz);
      if (cam.fov !== 45) { cam.fov = 45; cam.updateProjectionMatrix(); }
    },
    save() {
      try {
        o.stage.render && o.stage.render();
        const src = canvas, W = src.width, H = src.height, out = document.createElement("canvas"); out.width = W; out.height = H;
        const g = out.getContext("2d")!; (g as any).filter = FILTERS[filter]![1] || "none"; g.drawImage(src, 0, 0); (g as any).filter = "none";
        if (frame) { const bar = Math.round(H * 0.11); g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar); }
        g.font = `600 ${Math.round(H * 0.022)}px system-ui`; g.fillStyle = "rgba(255,255,255,.75)"; g.fillText("Workbench · " + (o.game === "drift" ? "Drift King" : "Rally"), Math.round(W * 0.02), H - Math.round(H * (frame ? 0.13 : 0.03)));
        const a = document.createElement("a"); a.download = (o.game === "drift" ? "drift-king" : "rally") + "-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".png";
        a.href = out.toDataURL("image/png"); a.click();
      } catch (e) { console.error("photo", e); }
    },
  };
  btn.addEventListener("click", () => (open ? photo.exit() : photo.enter()));
  ui.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLElement; if (!b) return;
    if (b.dataset.f) { filter = +b.dataset.f; applyFilter(); renderUi(); }
    else if (b.dataset.frame) { frame = !frame; renderUi(); }
    else if (b.dataset.save) photo.save();
    else if (b.dataset.close) photo.exit();
  });
  canvas.addEventListener("contextmenu", (e) => { if (open) e.preventDefault(); });
  canvas.addEventListener("pointerdown", (e) => { if (!open) return; drag = { x: e.clientX, y: e.clientY, b: e.button, yaw, pitch, ty }; try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
  canvas.addEventListener("pointermove", (e) => {
    if (!open || !drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.b === 2) ty = Math.max(0.2, Math.min(4, drag.ty - dy * 0.01));
    else { yaw = drag.yaw - dx * 0.008; pitch = Math.max(-0.05, Math.min(1.3, drag.pitch + dy * 0.005)); }
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (e) => { if (!open) return; e.preventDefault(); dist = Math.max(2.5, Math.min(25, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  const onKey = (e: KeyboardEvent) => { if (e.code === "KeyP" && !/INPUT|TEXTAREA/.test((document.activeElement as any)?.tagName || "")) { open ? photo.exit() : photo.enter(); } else if (e.code === "Escape" && open) photo.exit(); };
  window.addEventListener("keydown", onKey);

  return {
    paint, time, ghost, telemetry, photo,
    dispose() { ghost.clear(); ghostMat.dispose(); window.removeEventListener("keydown", onKey); canvas.style.filter = ""; },
  };
}
