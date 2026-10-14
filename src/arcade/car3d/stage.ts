// @ts-nocheck
import * as THREE from "three";
import { lsGetRaw, lsSetRaw } from "../../core/store";

/**
 * The 3D stage shared by the car games (Drift King, Rally, the Take Your Time clips): one WebGL canvas that fills its host element,
 * a scene, a camera, a frame loop with a clamped time step, a resize observer, and a saved graphics level (Low / Balanced / High).
 * Nothing here knows about a particular game.
 */
export type Level = 0 | 1 | 2;
export const LEVEL_NAMES = ["Low", "Balanced", "High"] as const;
const KEY = "wb-car3d-gfx";

export interface Features {
  level: Level;
  /** share of the on-screen pixels actually drawn */
  scale: number;
  dprCap: number;
  /** shadow map size, 0 = no shadows */
  shadow: number;
  antialias: boolean;
  /** how many of everything decorative (props, trees, particles): 0.35 / 0.7 / 1 */
  amount: number;
  /** real lights besides the sun / moon (lamps, headlights) */
  lights: number;
}

export function featuresFor(level: Level): Features {
  if (level === 0) return { level, scale: 0.7, dprCap: 1, shadow: 0, antialias: false, amount: 0.4, lights: 2 };
  if (level === 1) return { level, scale: 1, dprCap: 1.5, shadow: 1024, antialias: true, amount: 0.75, lights: 6 };
  return { level, scale: 1, dprCap: 2, shadow: 2048, antialias: true, amount: 1, lights: 10 };
}

/** Balanced, or Low the first time on a Chromebook / slow-looking machine (same rule as the F1 Cockpit). */
export function loadLevel(): Level {
  const raw = lsGetRaw(KEY), n = raw == null ? NaN : Number(raw);
  if (n === 0 || n === 1 || n === 2) return n;
  try {
    const nav = navigator as any;
    if (/CrOS/.test(nav.userAgent || "") || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4) return 0;
  } catch { /* ignore */ }
  return 1;
}
export function saveLevel(l: Level) { lsSetRaw(KEY, String(l)); }

export function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export interface Stage {
  THREE: typeof THREE;
  renderer: any;
  scene: any;
  camera: any;
  canvas: HTMLCanvasElement;
  f: Features;
  /** called every frame with the time step in seconds (clamped to 1/20 s) and the time in ms */
  onFrame(fn: (dt: number, now: number) => void): void;
  render(): void;
  /** pause the loop (the game keeps its state); resume() restarts it */
  pause(): void;
  resume(): void;
  /** run when the stage goes away (also when its canvas is taken out of the page by someone else) */
  onDispose(fn: () => void): void;
  dispose(): void;
  fps: number;
  /** width / height of the picture in CSS pixels */
  size: { w: number; h: number };
}

export function createStage(host: HTMLElement, level: Level = loadLevel()): Stage {
  const f = featuresFor(level);
  const renderer = new THREE.WebGLRenderer({ antialias: f.antialias, powerPreference: "high-performance", alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = f.shadow > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement as HTMLCanvasElement;
  canvas.className = "c3d-canvas";
  canvas.tabIndex = 0;
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  const size = { w: 1, h: 1 };
  const resize = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(2, Math.floor(r.width)), h = Math.max(2, Math.floor(r.height));
    size.w = w; size.h = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, f.dprCap) * f.scale);
    renderer.setSize(w, h, false);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  const frames: Array<(dt: number, now: number) => void> = [];
  const disposers: Array<() => void> = [];
  let raf = 0, last = 0, running = true, dead = false, fpsAcc = 0, fpsN = 0;
  const stage: Stage = {
    THREE, renderer, scene, camera, canvas, f, size, fps: 60,
    onFrame(fn) { frames.push(fn); },
    render() { renderer.render(scene, camera); },
    pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (dead || running) return; running = true; last = 0; raf = requestAnimationFrame(loop); },
    onDispose(fn) { disposers.push(fn); },
    dispose() {
      if (dead) return;
      dead = true; running = false; if (raf) cancelAnimationFrame(raf); ro.disconnect();
      disposers.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      scene.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m: any) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); });
      });
      renderer.dispose();
      try { (renderer as any).forceContextLoss(); } catch { /* ignore */ }
      canvas.remove();
    },
  };
  function loop(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!canvas.isConnected) { stage.dispose(); return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { stage.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    for (const fn of frames) fn(dt, now);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);
  return stage;
}

/** Shared keyboard state for the car games (W A S D, arrows, Space, Shift, C, R, Y, U, Escape). Listens on window, capture phase. */
export function createKeys() {
  const down: Record<string, boolean> = {};
  const taps: string[] = [];
  const GAME = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyC", "KeyR", "KeyY", "KeyU", "ShiftLeft", "ShiftRight", "KeyH", "KeyE"];
  const kd = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && /input|textarea|select/i.test(t.tagName)) return;
    if (GAME.indexOf(e.code) < 0) return;
    e.preventDefault();
    if (!down[e.code]) taps.push(e.code);
    down[e.code] = true;
  };
  const ku = (e: KeyboardEvent) => { down[e.code] = false; };
  const blur = () => { for (const k in down) down[k] = false; };
  window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true); window.addEventListener("blur", blur);
  return {
    down,
    /** codes pressed since the last call */
    taps() { return taps.splice(0, taps.length); },
    set(code: string, on: boolean) { if (on && !down[code]) taps.push(code); down[code] = on; },
    throttle() { return !!(down.KeyW || down.ArrowUp); },
    brake() { return !!(down.KeyS || down.ArrowDown); },
    steer() { return (down.KeyA || down.ArrowLeft ? -1 : 0) + (down.KeyD || down.ArrowRight ? 1 : 0); },
    handbrake() { return !!down.Space; },
    dispose() { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true); window.removeEventListener("blur", blur); },
  };
}
export type Keys = ReturnType<typeof createKeys>;

/** On-screen buttons for touch screens: each button holds a key while pressed. */
export function touchPad(host: HTMLElement, keys: Keys, buttons: Array<[string, string]>) {
  const pad = document.createElement("div"); pad.className = "c3d-touch";
  const cleanup: Array<() => void> = [];
  for (const [label, code] of buttons) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.dataset.code = code;
    const on = (e: Event) => { e.preventDefault(); keys.set(code, true); b.classList.add("on"); };
    const off = (e: Event) => { e.preventDefault(); keys.set(code, false); b.classList.remove("on"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
    pad.appendChild(b);
    cleanup.push(() => { b.removeEventListener("pointerdown", on); b.removeEventListener("pointerup", off); b.removeEventListener("pointerleave", off); b.removeEventListener("pointercancel", off); });
  }
  host.appendChild(pad);
  return { el: pad, dispose() { cleanup.forEach((f) => f()); pad.remove(); } };
}
