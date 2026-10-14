// @ts-nocheck
/** Small canvas-made pictures for the car games (no image files). Each returns a three.js texture; callers dispose them with the scene. */
import { Rng } from "../../world/infinite/rng";

function canvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d")! }; }
function tex(T: any, c: HTMLCanvasElement, repeat = true, srgb = true) {
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

/** Quay concrete: big slabs with seams, a fine grain, cracks, oil stains and tyre-rubber smudges. One tile = 8 m. */
export function concreteTexture(T: any, seed = 3, base = [70, 72, 76]) {
  const { c, g } = canvas(512, 512), r = new Rng(seed);
  g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = r.range(-14, 14); g.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v},0.55)`; g.fillRect(r.range(0, 512), r.range(0, 512), r.range(1, 3), r.range(1, 3)); }
  for (let i = 0; i < 6; i++) { const x = r.range(0, 512), y = r.range(0, 512), rr = r.range(20, 60); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(20,20,24,.35)"); gr.addColorStop(1, "rgba(20,20,24,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.strokeStyle = "rgba(25,25,28,.6)"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 1); g.lineTo(512, 1); g.moveTo(1, 0); g.lineTo(1, 512); g.stroke();
  g.strokeStyle = "rgba(30,30,34,.5)"; g.lineWidth = 1;
  for (let i = 0; i < 7; i++) { let x = r.range(0, 512), y = r.range(0, 512); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += r.range(-22, 22); y += r.range(-22, 22); g.lineTo(x, y); } g.stroke(); }
  return tex(T, c);
}

/** Tarmac for the course and the rally stages' sealed sections. */
export function asphaltTexture(T: any, seed = 5) {
  const { c, g } = canvas(512, 512), r = new Rng(seed);
  g.fillStyle = "#2b2d31"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) { const v = r.range(-18, 22); const b = 43 + v; g.fillStyle = `rgba(${b},${b + 1},${b + 4},0.6)`; g.fillRect(r.range(0, 512), r.range(0, 512), 1.5, 1.5); }
  for (let i = 0; i < 5; i++) { const x = r.range(0, 512), y = r.range(0, 512), rr = r.range(30, 90); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(10,10,12,.25)"); gr.addColorStop(1, "rgba(10,10,12,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return tex(T, c);
}

/** A soft round pool of light for the ground under a lamp (drawn additively). */
export function lightPoolTexture(T: any, color = "255,180,90") {
  const { c, g } = canvas(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${color},0.85)`); gr.addColorStop(0.35, `rgba(${color},0.42)`); gr.addColorStop(0.7, `rgba(${color},0.12)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return tex(T, c, false);
}

/** A vertical streak (a lamp's reflection on the water, a headlight beam). */
export function streakTexture(T: any, color = "255,190,110") {
  const { c, g } = canvas(64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, `rgba(${color},0.9)`); gr.addColorStop(0.3, `rgba(${color},0.35)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 6) { g.clearRect(0, y, 64, 2); }
  return tex(T, c, false);
}

/** Corrugated container side with a made-up shipping line's name. */
const LINES = ["MAERA", "COSTEL", "HAPAG-NORD", "EVERLINE", "ORIENTA", "ZIMBRA", "YANGMARE", "TRITONIC"];
export function containerTexture(T: any, color: string, name: number) {
  const { c, g } = canvas(256, 64);
  g.fillStyle = color; g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 6) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x, 0, 2, 64); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x + 3, 0, 1, 64); }
  g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 61, 256, 3); g.fillRect(0, 0, 3, 64); g.fillRect(253, 0, 3, 64);
  g.fillStyle = "rgba(255,255,255,.85)"; g.font = "bold 15px Arial, sans-serif"; g.textAlign = "center"; g.fillText(LINES[name % LINES.length]!, 128, 38);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(90,50,20,.18)"; g.fillRect(Math.random() * 256, Math.random() * 64, 2 + Math.random() * 5, 1 + Math.random() * 4); }
  return tex(T, c, false);
}

/** Office / warehouse / tower windows at night: a grid, some lit warm or cold, most dark. */
export function windowsTexture(T: any, seed = 9, lit = 0.35) {
  const { c, g } = canvas(128, 256), r = new Rng(seed);
  g.fillStyle = "#0b0e14"; g.fillRect(0, 0, 128, 256);
  for (let y = 4; y < 256; y += 12) for (let x = 4; x < 128; x += 10) {
    const on = r.chance(lit);
    g.fillStyle = on ? r.pick(["#ffd58a", "#ffe7b5", "#bfe3ff", "#fff3d6"]) : r.pick(["#141a24", "#10141c", "#18202c"]);
    g.fillRect(x, y, 6, 7);
  }
  return tex(T, c);
}

/** Painted ground markings (a dashed edge line). */
export function dashTexture(T: any, color = "#e9e9ee") {
  const { c, g } = canvas(16, 128);
  g.clearRect(0, 0, 16, 128); g.fillStyle = color; g.fillRect(0, 0, 16, 80);
  for (let i = 0; i < 60; i++) { g.clearRect(Math.random() * 16, Math.random() * 80, 2, 2); }
  return tex(T, c);
}

/** Night sky: deep blue at the top to a sodium-orange glow on the horizon over the city. */
export function nightSkyTexture(T: any) {
  const { c, g } = canvas(4, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#03050c"); gr.addColorStop(0.55, "#0a1224"); gr.addColorStop(0.82, "#1a1c2c"); gr.addColorStop(0.92, "#3a2a2a"); gr.addColorStop(1, "#4a3426");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = tex(T, c, false); t.wrapS = T.ClampToEdgeWrapping; return t;
}

/** Chequered strip for start / finish lines. */
export function checkerTexture(T: any) {
  const { c, g } = canvas(64, 16);
  for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#eee"; g.fillRect(x * 8, y * 8, 8, 8); }
  const t = tex(T, c); t.magFilter = T.NearestFilter; return t;
}

/** Gravel, dirt, snow and mud for the rally stages: speckled ground; `kind` picks the palette. */
export function groundTexture(T: any, kind: "gravel" | "dirt" | "snow" | "mud" | "grass" | "sand", seed = 4) {
  const pal: Record<string, [string, string[]]> = {
    gravel: ["#8a8070", ["#a29884", "#6e665a", "#9a8f7c", "#5d564c", "#b8ae9a"]],
    dirt: ["#7a5a3c", ["#8c6a48", "#664a30", "#9a7650", "#5a4028"]],
    snow: ["#e6edf4", ["#ffffff", "#d4dde8", "#c6d2e0", "#f2f6fa"]],
    mud: ["#4e3c2a", ["#5c4632", "#3e2e20", "#6a5038", "#33261a"]],
    grass: ["#4a7a34", ["#5a8c3e", "#3e6a2c", "#6a9a48", "#355e26"]],
    sand: ["#c8b080", ["#d6c090", "#b8a070", "#e0cc9c"]],
  };
  const [base, cols] = pal[kind]!;
  const { c, g } = canvas(256, 256), r = new Rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { g.fillStyle = r.pick(cols); const s = r.range(1, kind === "gravel" ? 4 : 3); g.fillRect(r.range(0, 256), r.range(0, 256), s, s); }
  return tex(T, c);
}
