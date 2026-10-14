// Small procedural pictures for the circuit: asphalt, the start line, catch fence and sponsor boards (made-up names only).
import type * as THREE_NS from "three";
type T3 = typeof THREE_NS;

const cache = new Map<string, any>();

function canvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

function tex(T: T3, c: HTMLCanvasElement, o: { repeat?: boolean; aniso?: number } = {}) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  if (o.repeat !== false) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = o.aniso ?? 8;
  return t;
}

function rand(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Road surface, 7 m long: speckled asphalt, a rubbered-in line in each lane and solid white edge lines. Across the road = u. */
export function asphaltTexture(T: T3) {
  if (cache.has("asphalt")) return cache.get("asphalt");
  const W = 256, H = 256, c = canvas(W, H), g = c.getContext("2d")!, r = rand(5);
  g.fillStyle = "#6a6d75"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { const v = 80 + r() * 70; g.fillStyle = `rgba(${v},${v},${v + 5},${0.25 + r() * 0.4})`; g.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6); }
  for (const cx of [0.34, 0.66]) { // rubber laid down by the cars
    const gr = g.createLinearGradient((cx - 0.1) * W, 0, (cx + 0.1) * W, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(20,20,24,0.34)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect((cx - 0.1) * W, 0, 0.2 * W, H);
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(150,150,155,${0.08 + r() * 0.12})`; g.fillRect((0.04 + r() * 0.2) * W + (r() < 0.5 ? 0 : 0.72 * W), r() * H, 1.4, 1.4); } // marbles off the line
  g.fillStyle = "#e8e8ea"; g.fillRect(W * 0.018, 0, W * 0.022, H); g.fillRect(W * 0.96, 0, W * 0.022, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(60,60,64,.5)"; g.fillRect(W * 0.018 + r() * W * 0.022, r() * H, 1, 1 + r() * 2); g.fillRect(W * 0.96 + r() * W * 0.022, r() * H, 1, 1 + r() * 2); }
  const t = tex(T, c); cache.set("asphalt", t); return t;
}

/** Blocky grass: a grey-green square pixel pattern that multiplies the ground's own colours (so every circuit keeps its own greens). */
export function grassTexture(T: T3) {
  if (cache.has("grass")) return cache.get("grass");
  const c = canvas(64, 64), g = c.getContext("2d")!, r = rand(21);
  g.fillStyle = "#dcdcdc"; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) {
    const v = 168 + Math.floor(r() * 70), d = r();
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 4);
    if (d < 0.1) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x, y, 4, 4); }
    else if (d > 0.94) { g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x, y, 4, 4); }
  }
  const t = tex(T, c, { aniso: 4 }); t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter;
  cache.set("grass", t); return t;
}

/** Two alternating blocks of colour along v (one repeat = both): kerbs and barrier panels. */
export function stripeTexture(T: T3, a: string, b: string) {
  const key = "stripe" + a + b;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(8, 64), g = c.getContext("2d")!;
  g.fillStyle = a; g.fillRect(0, 0, 8, 32); g.fillStyle = b; g.fillRect(0, 32, 8, 32);
  const t = tex(T, c, { aniso: 4 }); cache.set(key, t); return t;
}

/** Chequered start / finish strip. */
export function checkerTexture(T: T3) {
  if (cache.has("checker")) return cache.get("checker");
  const c = canvas(256, 32), g = c.getContext("2d")!;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#101014" : "#f2f2f4"; g.fillRect(x * 16, y * 16, 16, 16); }
  const t = tex(T, c, { repeat: false }); cache.set("checker", t); return t;
}

/** Painted grid slots before the line. */
export function gridTexture(T: T3) {
  if (cache.has("grid")) return cache.get("grid");
  const c = canvas(128, 256), g = c.getContext("2d")!;
  g.clearRect(0, 0, 128, 256);
  g.fillStyle = "rgba(240,240,244,.92)";
  for (let k = 0; k < 4; k++) { const y = 20 + k * 58, x = k % 2 ? 78 : 14; g.fillRect(x, y, 36, 3); g.fillRect(x, y, 3, 26); g.fillRect(x + 33, y, 3, 26); }
  const t = tex(T, c, { repeat: false }); cache.set("grid", t); return t;
}

/** Catch-fence mesh, drawn as lines on a clear background (used with an alpha test). */
export function fenceTexture(T: T3) {
  if (cache.has("fence")) return cache.get("fence");
  const c = canvas(64, 64), g = c.getContext("2d")!;
  g.clearRect(0, 0, 64, 64); g.strokeStyle = "#cfd4da"; g.lineWidth = 2;
  g.beginPath(); for (let i = -64; i <= 128; i += 16) { g.moveTo(i, 0); g.lineTo(i + 64, 64); g.moveTo(i + 64, 0); g.lineTo(i, 64); } g.stroke();
  const t = tex(T, c); t.minFilter = T.LinearMipmapLinearFilter; cache.set("fence", t); return t;
}

const BOARDS: Array<[string, string, string, string]> = [
  ["APEX", "#d71920", "#ffffff", "RACE CONTROL"], ["VELOCE", "#0a4aa8", "#ffd23a", "MOTORSPORT"], ["TURBOLAB", "#111418", "#37e0c8", "ENGINEERING"], ["WORKBENCH", "#f2f2f4", "#e0a458", "TOOLS FOR EVERYONE"],
  ["NOVA FUEL", "#17a05a", "#ffffff", "POWER"], ["KINETIC", "#6a2bd1", "#ffffff", "TYRES"],
];

/** Sponsor boards (invented names). */
export function boardTextures(T: T3) {
  if (cache.has("boards")) return cache.get("boards");
  const list = BOARDS.map(([a, bg, fg, sub]) => {
    const c = canvas(512, 160), g = c.getContext("2d")!;
    g.fillStyle = bg; g.fillRect(0, 0, 512, 160);
    g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.moveTo(0, 160); g.lineTo(130, 0); g.lineTo(230, 0); g.lineTo(100, 160); g.fill();
    g.fillStyle = fg; g.font = "900 78px 'Space Grotesk', Inter, Arial, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(a, 36, 70);
    g.font = "700 26px Inter, Arial, sans-serif"; g.globalAlpha = 0.85; g.fillText(sub, 40, 130); g.globalAlpha = 1;
    g.fillStyle = fg; g.fillRect(0, 0, 512, 8); g.fillRect(0, 152, 512, 8);
    return tex(T, c, { repeat: false, aniso: 4 });
  });
  cache.set("boards", list); return list;
}

/** Garage doors for the pit building: a row of dark doors with team colour stripes. */
export function garageTexture(T: T3) {
  if (cache.has("garage")) return cache.get("garage");
  const c = canvas(512, 128), g = c.getContext("2d")!;
  g.fillStyle = "#c9ced4"; g.fillRect(0, 0, 512, 128);
  const cols = ["#d71920", "#0a4aa8", "#17a05a", "#e0a458", "#6a2bd1", "#37e0c8", "#f2f2f4", "#111418"];
  for (let i = 0; i < 8; i++) { const x = 8 + i * 62; g.fillStyle = "#1a1e25"; g.fillRect(x, 22, 54, 92); g.fillStyle = cols[i]!; g.fillRect(x, 22, 54, 8); g.fillStyle = "rgba(255,255,255,.1)"; for (let k = 0; k < 6; k++) g.fillRect(x, 34 + k * 13, 54, 2); }
  g.fillStyle = "#2a3038"; g.fillRect(0, 0, 512, 12);
  const t = tex(T, c, { repeat: false, aniso: 4 }); cache.set("garage", t); return t;
}

/** Soft round glow (sun, tail lights). */
export function glowTexture(T: T3) {
  if (cache.has("glow")) return cache.get("glow");
  const c = canvas(64, 64), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = tex(T, c, { repeat: false }); cache.set("glow", t); return t;
}

export function disposeF1Textures() {
  cache.forEach((v) => { if (Array.isArray(v)) v.forEach((t) => t.dispose()); else v.dispose && v.dispose(); });
  cache.clear();
}
