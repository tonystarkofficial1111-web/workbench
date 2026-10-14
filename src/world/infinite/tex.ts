// @ts-nocheck
import type { T3 } from "./types";
import { Rng } from "./rng";

/** Procedural pictures for the island: painted once on a canvas, tinted per vertex by the terrain. */
const cache = new Map<string, any>();

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}
const g8 = (v: number) => {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return "rgb(" + c + "," + c + "," + c + ")";
};

/** Draw `fn(x, y)` at (x, y) and at every wrapped copy that touches the tile border, so the picture tiles without seams. */
function wrapDraw(size: number, margin: number, x: number, y: number, fn: (x: number, y: number) => void) {
  const xs = [x], ys = [y];
  if (x < margin) xs.push(x + size); else if (x > size - margin) xs.push(x - size);
  if (y < margin) ys.push(y + size); else if (y > size - margin) ys.push(y - size);
  for (const a of xs) for (const b of ys) fn(a, b);
}

function toTexture(T: T3, c: HTMLCanvasElement, srgb = true) {
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  return t;
}

/** Neutral leaf litter, grass strokes and pebbles; the terrain colours it green / brown per vertex. */
export function jungleFloorTexture(T: T3) {
  if (cache.has("floor")) return cache.get("floor");
  const S = 512, c = canvas(S), g = c.getContext("2d")!, r = new Rng(901);
  g.fillStyle = g8(205); g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = g8(r.range(150, 245)); g.globalAlpha = r.range(0.25, 0.6);
    const x = r.range(0, S), y = r.range(0, S), w = r.range(1, 3);
    wrapDraw(S, 4, x, y, (a, b) => g.fillRect(a, b, w, w));
  }
  g.lineCap = "butt";
  for (let i = 0; i < 520; i++) {
    const x = r.range(0, S), y = r.range(0, S), len = r.range(8, 24), ang = r.range(0, Math.PI * 2);
    g.strokeStyle = g8(r.range(140, 255)); g.globalAlpha = r.range(0.35, 0.7); g.lineWidth = r.range(1.2, 2.6);
    wrapDraw(S, 26, x, y, (a, b) => { g.beginPath(); g.moveTo(a, b); g.lineTo(a + Math.cos(ang) * len, b + Math.sin(ang) * len); g.stroke(); });
  }
  for (let i = 0; i < 120; i++) { // fallen leaves: square-cornered patches with a straight vein
    const x = r.range(0, S), y = r.range(0, S), lw = r.range(9, 20), lh = lw * r.range(0.36, 0.5), ang = Math.round(r.range(0, Math.PI) / (Math.PI / 2)) * (Math.PI / 2);
    const tone = r.range(150, 240);
    wrapDraw(S, 24, x, y, (a, b) => {
      g.save(); g.translate(a, b); g.rotate(ang);
      g.globalAlpha = 0.7; g.fillStyle = g8(tone); g.fillRect(-lw, -lh, lw * 2, lh * 2);
      g.globalAlpha = 0.5; g.strokeStyle = g8(tone - 55); g.lineWidth = 1; g.beginPath(); g.moveTo(-lw, 0); g.lineTo(lw, 0); g.stroke();
      g.restore();
    });
  }
  for (let i = 0; i < 26; i++) { // twigs
    const x = r.range(0, S), y = r.range(0, S), len = r.range(16, 40), ang = r.range(0, Math.PI);
    g.strokeStyle = g8(105); g.globalAlpha = 0.55; g.lineWidth = r.range(1.2, 2.2);
    wrapDraw(S, 44, x, y, (a, b) => { g.beginPath(); g.moveTo(a, b); g.lineTo(a + Math.cos(ang) * len, b + Math.sin(ang) * len); g.stroke(); });
  }
  g.globalAlpha = 1;
  const t = toTexture(T, c);
  cache.set("floor", t);
  return t;
}

export function sandTexture(T: T3) {
  if (cache.has("sand")) return cache.get("sand");
  const S = 256, c = canvas(S), g = c.getContext("2d")!, r = new Rng(77);
  g.fillStyle = g8(236); g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4200; i++) {
    g.fillStyle = g8(r.range(190, 255)); g.globalAlpha = r.range(0.3, 0.7);
    const x = r.range(0, S), y = r.range(0, S);
    wrapDraw(S, 3, x, y, (a, b) => g.fillRect(a, b, 1.3, 1.3));
  }
  for (let k = 0; k < 14; k++) { // wind ripples: rows of small steps, not smooth waves
    const y0 = (k + r.next()) * (S / 14);
    g.fillStyle = g8(k % 2 ? 205 : 252); g.globalAlpha = 0.28;
    for (let x = 0; x < S; x += 8) { const y = y0 + Math.round(Math.sin(x * 0.07 + k * 1.7) * 2.2 + Math.sin(x * 0.19 + k) * 0.9); g.fillRect(x, y, 8, 1.4); }
  }
  for (let i = 0; i < 24; i++) { // shells and pebbles: little squares
    const x = r.range(0, S), y = r.range(0, S), rad = r.range(1.2, 2.8);
    g.globalAlpha = 0.6; g.fillStyle = g8(r.range(150, 250));
    wrapDraw(S, 6, x, y, (a, b) => { g.fillRect(a - rad, b - rad * 0.7, rad * 2, rad * 1.4); });
  }
  g.globalAlpha = 1;
  const t = toTexture(T, c);
  cache.set("sand", t);
  return t;
}

export function pathTexture(T: T3) {
  if (cache.has("path")) return cache.get("path");
  const S = 256, c = canvas(S), g = c.getContext("2d")!, r = new Rng(311);
  g.fillStyle = g8(208); g.fillRect(0, 0, S, S);
  for (let i = 0; i < 3600; i++) {
    g.fillStyle = g8(r.range(150, 250)); g.globalAlpha = r.range(0.25, 0.6);
    const x = r.range(0, S), y = r.range(0, S);
    wrapDraw(S, 3, x, y, (a, b) => g.fillRect(a, b, 1.5, 1.5));
  }
  for (let i = 0; i < 90; i++) { // pressed pebbles
    const x = r.range(0, S), y = r.range(0, S), rw = r.range(2, 6.5), rh = rw * r.range(0.6, 0.9), tone = r.range(170, 255);
    wrapDraw(S, 8, x, y, (a, b) => {
      g.globalAlpha = 0.85; g.fillStyle = g8(tone - 40); g.fillRect(a - rw + 0.8, b - rh + 0.8, rw * 2, rh * 2);
      g.globalAlpha = 0.9; g.fillStyle = g8(tone); g.fillRect(a - rw, b - rh, rw * 2, rh * 2);
    });
  }
  g.globalAlpha = 1;
  const t = toTexture(T, c);
  cache.set("path", t);
  return t;
}

/** Soft round glow (lantern halos, sun glints, firefly dots). */
export function glowTexture(T: T3) {
  if (cache.has("glow")) return cache.get("glow");
  const c = canvas(64), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c);
  cache.set("glow", t);
  return t;
}

/** A small leaf shape for falling-leaf particles. */
export function leafTexture(T: T3) {
  if (cache.has("leaf")) return cache.get("leaf");
  const c = canvas(32), g = c.getContext("2d")!;
  g.translate(16, 16); g.rotate(-0.6);
  g.fillStyle = "#fff"; g.fillRect(-13, -6, 26, 12);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.stroke();
  const t = new T.CanvasTexture(c);
  cache.set("leaf", t);
  return t;
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose && t.dispose());
  cache.clear();
}
