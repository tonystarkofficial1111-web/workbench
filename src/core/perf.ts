import { Emitter, lsGetRaw, lsSetRaw } from "./store";

/** Hooks Block World registers so the monitor can lower render quality (original window.__wbQuality). */
export interface QualityHooks {
  setShaders(on: boolean): void;
  shaders(): boolean;
  setPixelRatio(r: number): void;
  speed?(): number;
}
export const quality: { hooks: QualityHooks | null } = { hooks: null };

const KEY = "wb-perf-v1";
export const perfEvents = new Emitter();
const cfg = { on: false, auto: true, overlay: true };
try {
  const sv = JSON.parse(lsGetRaw(KEY) || "{}");
  (Object.keys(cfg) as (keyof typeof cfg)[]).forEach((k) => {
    if (typeof sv[k] === "boolean") cfg[k] = sv[k];
  });
} catch { /* ignore */ }
const saveCfg = () => lsSetRaw(KEY, JSON.stringify(cfg));

export const NAMES = ["Full", "Reduced", "Lite"];
let level = 0, userShaders = false, drops = 0, lastChange = 0, lastRaise = 0, needGood = 20;
let low = 0, memHi = 0, good = 0, warm = 0, raf = 0, running = false;
let frames = 0, sum = 0, worst = 0, winStart = 0, last = 0, fps = 0, avgMs = 0, worstMs = 0;
let note = "";
let noteTimer: ReturnType<typeof setTimeout> | null = null;

export const perfState = () => ({
  cfg: { ...cfg }, level, drops, running, fps, avgMs, worstMs, note,
  heap: heap(), speed: speed(),
});

function heap() {
  const m = (performance as any).memory;
  return m && m.jsHeapSizeLimit ? { used: m.usedJSHeapSize / 1048576, limit: m.jsHeapSizeLimit / 1048576 } : null;
}
function speed(): number {
  try {
    return quality.hooks?.speed ? quality.hooks.speed() : 1;
  } catch {
    return 1;
  }
}
function setNote(msg: string) {
  note = msg;
  perfEvents.emit();
  if (noteTimer) clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    note = "";
    perfEvents.emit();
  }, 5000);
}
function applyLevel() {
  const q = quality.hooks;
  document.documentElement.classList.toggle("wb-lite", level > 0);
  if (!q) return;
  try {
    if (level === 0) q.setShaders(userShaders);
    else {
      q.setShaders(false);
      if (level === 2) q.setPixelRatio(0.75);
    }
  } catch (e) {
    console.error(e);
  }
}
export function setLevel(n: number, auto: boolean) {
  n = Math.max(0, Math.min(2, n));
  if (n === level) return;
  const q = quality.hooks;
  if (level === 0 && n > 0 && q) {
    try { userShaders = q.shaders(); } catch { /* ignore */ }
  }
  const up = n > level;
  level = n;
  lastChange = Date.now();
  applyLevel();
  if (auto) {
    if (up) {
      drops++;
      if (Date.now() - lastRaise < 60000) needGood = Math.min(needGood * 2, 160);
      setNote("⚡ Quality lowered to " + NAMES[level] + " to keep things smooth");
    } else {
      lastRaise = Date.now();
      setNote("⚡ Quality back to " + NAMES[level]);
    }
  }
  perfEvents.emit();
}
/** Called by the Block World shader button so a manual choice survives a quality drop. */
export function noteUserShaders() {
  setTimeout(() => {
    if (level > 0 && quality.hooks) {
      try { userShaders = quality.hooks.shaders(); } catch { /* ignore */ }
    }
  }, 0);
}

function evaluate() {
  if (warm > 0) { warm--; return; }
  if (!cfg.auto) { low = good = memHi = 0; return; }
  const h = heap();
  const hr = h ? h.used / h.limit : 0;
  const now = Date.now();
  low = fps < 24 ? low + 1 : 0;
  memHi = hr > 0.85 ? memHi + 1 : 0;
  good = fps >= 50 && hr < 0.7 ? good + 1 : 0;
  if ((low >= 3 || memHi >= 2) && level < 2 && now - lastChange > 8000) {
    setLevel(level + 1, true);
    low = memHi = good = 0;
  } else if (good >= needGood && level > 0 && now - lastChange > 8000) {
    setLevel(level - 1, true);
    good = 0;
  }
}
function frame(t: number) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) { last = 0; frames = 0; sum = 0; worst = 0; winStart = 0; return; }
  if (last) {
    const d = t - last;
    sum += d;
    if (d > worst) worst = d;
    frames++;
  }
  last = t;
  if (!winStart) winStart = t;
  if (t - winStart >= 1000 && frames > 0) {
    fps = Math.round((frames * 1000) / (t - winStart));
    avgMs = sum / frames;
    worstMs = worst;
    frames = 0; sum = 0; worst = 0; winStart = t;
    evaluate();
    perfEvents.emit();
  }
}
function start() {
  if (running) return;
  running = true; warm = 3; low = good = memHi = 0; last = 0; winStart = 0; frames = 0;
  raf = requestAnimationFrame(frame);
  perfEvents.emit();
}
function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
  setLevel(0, false);
  perfEvents.emit();
}
export const perfActions = {
  toggleMonitor() { cfg.on = !cfg.on; saveCfg(); if (cfg.on) start(); else stop(); perfEvents.emit(); },
  toggleAuto() { cfg.auto = !cfg.auto; saveCfg(); low = good = memHi = 0; perfEvents.emit(); },
  toggleOverlay() { cfg.overlay = !cfg.overlay; saveCfg(); perfEvents.emit(); },
  setLevel: (n: number) => setLevel(n, false),
  init() { if (cfg.on) start(); perfEvents.emit(); },
};
export const wbPerf = { level: () => level, fps: () => fps };
