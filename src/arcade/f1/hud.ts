import { GEAR_MAX, ROAD_HALF, WALL_D, CAR_HALF, PROGRESS } from "./consts";

/**
 * What is drawn on the game's 2D canvas on top of the live feed: the controls (top left), the track map (top right), the corner warning with its
 * countdown in bright red (top centre), the shift light and the barrier warning. Everything is drawn from the game's own state, in canvas pixels
 * (the canvas is 800 x 450 and is scaled by the page).
 */
export interface HudData {
  player: any;
  aiCars: any[];
  points: Array<{ x: number; y: number }>;
  turn: { at: number; dir: string } | null;
  turnState: { active: boolean; completed: boolean; successUntil: number; missedUntil?: number };
  seconds: number | null;
  sim: { lat: number; zone: number; stats: { cleared: number; missed: number } } | null;
  now: number;
  lap: number;
  lapText: string;
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawInstructions(g: CanvasRenderingContext2D, d: HudData) {
  const x = 10, y = 26, w = 190, rows: Array<[string, string, boolean?]> = [
    ["W", "Throttle"], ["S", "Brake"], ["A / D", "Steer"], ["Y", "Shift up"], ["U", "Shift down"], ["T", "Tyre"], ["P", "Pit stop"],
  ];
  g.save();
  g.fillStyle = "rgba(6,10,16,.62)"; rr(g, x, y, w, 12 + rows.length * 14 + 28, 7); g.fill();
  g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 1; g.stroke();
  g.font = "700 8px Inter, Arial, sans-serif"; g.fillStyle = "#8fa3b8"; g.textBaseline = "alphabetic"; g.fillText("CONTROLS", x + 9, y + 12);
  rows.forEach((r, i) => {
    const yy = y + 28 + i * 14;
    g.fillStyle = "rgba(255,255,255,.12)"; rr(g, x + 9, yy - 9, 36, 12, 3); g.fill();
    g.fillStyle = "#ffffff"; g.font = "700 9px monospace"; g.textAlign = "center"; g.fillText(r[0], x + 27, yy); g.textAlign = "left";
    g.fillStyle = "#dbe4ee"; g.font = "600 9px Inter, Arial, sans-serif"; g.fillText(r[1], x + 52, yy);
  });
  g.fillStyle = "#ff8d7a"; g.font = "700 8px Inter, Arial, sans-serif"; g.fillText("Touch a barrier = disqualified", x + 9, y + 12 + rows.length * 14 + 22);
  g.restore();
}

function drawMap(g: CanvasRenderingContext2D, W: number, d: HudData) {
  const pts = d.points; if (!pts || pts.length < 3) return;
  const S = 150, h = 106, x = W - S - 10, y = 10;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const pad = 14, sc = Math.min((S - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = x + (S - (maxX - minX) * sc) / 2 - minX * sc, oy = y + (h - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (p: { x: number; y: number }) => [ox + p.x * sc, oy + p.y * sc] as const;
  g.save();
  g.fillStyle = "rgba(6,10,16,.72)"; rr(g, x, y, S, h, 8); g.fill(); g.strokeStyle = "rgba(95,212,199,.35)"; g.lineWidth = 1; g.stroke();
  g.font = "700 7px Inter, Arial, sans-serif"; g.fillStyle = "#6f8aa0"; g.textBaseline = "alphabetic"; g.fillText("TRACK MAP", x + 8, y + 11);
  g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); pts.forEach((p, i) => { const q = P(p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
  g.strokeStyle = "#1c2733"; g.lineWidth = 7; g.stroke(); g.strokeStyle = "#5fd4c7"; g.lineWidth = 2; g.stroke();
  // start / finish
  const s0 = P(pts[0]!); g.fillStyle = "#fff"; g.fillRect(s0[0] - 3, s0[1] - 1, 6, 2);
  const at = (u: number) => { const n = pts.length, k = ((Math.floor(u * n) % n) + n) % n; return P(pts[k]!); };
  if (d.turn) { const q = at(d.turn.at); g.fillStyle = d.turn.dir === "left" ? "#ffcf4d" : "#ff6b5e"; g.beginPath(); g.arc(q[0], q[1], 3.6, 0, 7); g.fill(); g.fillStyle = "#0b0f14"; g.font = "800 6px Inter, Arial"; g.textAlign = "center"; g.fillText(d.turn.dir === "left" ? "L" : "R", q[0], q[1] + 2.2); g.textAlign = "left"; }
  const dot = (u: number, c: string, r: number) => { const q = at(u); g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 7; g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill(); g.shadowBlur = 0; };
  d.aiCars.forEach((a) => dot(a.dist, a.color, 2.4));
  dot(d.player.lapDist, "#ffb52e", 3.6);
  g.fillStyle = "#ffb52e"; g.font = "700 7px Inter, Arial, sans-serif"; g.fillText("YOU", x + S - 22, y + h - 6);
  g.restore();
}

function drawWarning(g: CanvasRenderingContext2D, W: number, d: HudData) {
  const t = d.turn, ts = d.turnState;
  const cx = W / 2;
  g.save(); g.textAlign = "center"; g.textBaseline = "alphabetic";
  if (t && ts.active && d.seconds !== null) {
    const s = d.seconds, urgent = s < 1.2, blink = urgent ? (Math.floor(d.now / 140) % 2 === 0) : true;
    const w = 230, h = 62, y = 16, right = t.dir === "right";
    g.shadowColor = "rgba(255,30,30,.9)"; g.shadowBlur = urgent ? 26 : 14;
    g.fillStyle = "rgba(40,0,0,.78)"; rr(g, cx - w / 2, y, w, h, 10); g.fill();
    g.shadowBlur = 0; g.strokeStyle = blink ? "#ff2a2a" : "#7a1010"; g.lineWidth = 2.5; g.stroke();
    // arrow
    g.fillStyle = blink ? "#ff3030" : "#a02020";
    const ax = cx + (right ? 1 : -1) * 82; g.beginPath();
    if (right) { g.moveTo(ax - 18, y + 22); g.lineTo(ax + 2, y + 22); g.lineTo(ax + 2, y + 12); g.lineTo(ax + 20, y + 31); g.lineTo(ax + 2, y + 50); g.lineTo(ax + 2, y + 40); g.lineTo(ax - 18, y + 40); }
    else { g.moveTo(ax + 18, y + 22); g.lineTo(ax - 2, y + 22); g.lineTo(ax - 2, y + 12); g.lineTo(ax - 20, y + 31); g.lineTo(ax - 2, y + 50); g.lineTo(ax - 2, y + 40); g.lineTo(ax + 18, y + 40); }
    g.closePath(); g.fill();
    g.fillStyle = "#ffd9d9"; g.font = "800 10px Inter, Arial, sans-serif"; g.fillText("TURN " + t.dir.toUpperCase(), cx - (right ? 20 : -20), y + 17);
    g.fillStyle = blink ? "#ff2b2b" : "#c01818"; g.font = "900 34px 'Space Grotesk', Inter, Arial, sans-serif";
    g.shadowColor = "#ff0000"; g.shadowBlur = 10;
    g.fillText(s < 0.15 ? "NOW" : s.toFixed(1) + "s", cx - (right ? 20 : -20), y + 52);
  } else if (ts.successUntil > d.now) {
    g.fillStyle = "rgba(0,40,28,.78)"; rr(g, cx - 90, 16, 180, 30, 8); g.fill();
    g.fillStyle = "#5ff0b0"; g.font = "800 13px Inter, Arial, sans-serif"; g.fillText("CORNER CLEARED", cx, 36);
  } else if (ts.missedUntil && ts.missedUntil > d.now) {
    const blink = Math.floor(d.now / 200) % 2 === 0;
    g.fillStyle = "rgba(60,0,0,.82)"; rr(g, cx - 150, 16, 300, 44, 8); g.fill();
    g.strokeStyle = blink ? "#ff3030" : "#802020"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#ff4a4a"; g.font = "800 13px Inter, Arial, sans-serif"; g.fillText("CORNER MISSED - STAY OFF THE BARRIER", cx, 35);
    g.fillStyle = "#ffb0b0"; g.font = "600 9px Inter, Arial, sans-serif"; g.fillText("brake, steer back to the road, carry on", cx, 51);
  }
  g.restore();
}

function drawShift(g: CanvasRenderingContext2D, W: number, H: number, d: HudData) {
  const p = d.player;
  if ((p.rpm || 0) >= 0.9 && p.gear < GEAR_MAX.length && p.speed > 1) {
    const on = Math.floor(d.now / 120) % 2 === 0;
    g.save(); g.textAlign = "center";
    g.fillStyle = on ? "rgba(255,140,0,.92)" : "rgba(120,60,0,.7)"; rr(g, W / 2 - 78, H - 118, 156, 26, 7); g.fill();
    g.fillStyle = "#1a0c00"; g.font = "900 13px Inter, Arial, sans-serif"; g.fillText("SHIFT UP  [ Y ]", W / 2, H - 100);
    g.restore();
  } else if (p.gear === 1 && p.speed < 2 && (d.now % 4000) < 2400 && d.player.lapDist < 0.02) {
    g.save(); g.textAlign = "center"; g.fillStyle = "rgba(6,10,16,.7)"; rr(g, W / 2 - 150, H - 118, 300, 24, 7); g.fill();
    g.fillStyle = "#dbe4ee"; g.font = "700 10px Inter, Arial, sans-serif"; g.fillText("Hold W, then press Y to shift up at the red lights", W / 2, H - 102);
    g.restore();
  }
}

function drawDanger(g: CanvasRenderingContext2D, W: number, H: number, d: HudData) {
  if (!d.sim) return;
  const gap = WALL_D - CAR_HALF - Math.abs(d.sim.lat);       // metres between the car's side and the barrier
  if (gap < 4.5) {
    const k = Math.min(1, (4.5 - gap) / 4.5), blink = 0.6 + 0.4 * Math.sin(d.now / 70);
    const side = d.sim.lat >= 0 ? 1 : -1;
    g.save();
    const gr = g.createLinearGradient(side > 0 ? W : 0, 0, side > 0 ? W - 160 : 160, 0);
    gr.addColorStop(0, `rgba(255,20,20,${(0.55 * k * blink).toFixed(3)})`); gr.addColorStop(1, "rgba(255,20,20,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.textAlign = "center"; g.fillStyle = `rgba(255,70,70,${(0.55 + 0.45 * blink).toFixed(2)})`; g.font = "900 15px Inter, Arial, sans-serif";
    g.fillText("BARRIER - STEER AWAY", W / 2, H - 150);
    g.restore();
  } else if (d.sim.zone === 2) {
    g.save(); g.textAlign = "center"; g.fillStyle = "rgba(255,190,60,.95)"; g.font = "800 11px Inter, Arial, sans-serif"; g.fillText("OFF THE TRACK - SLOW AND GET BACK ON", W / 2, H - 150); g.restore();
  }
  void ROAD_HALF;
}

/** The short crash screen of the classic 2D feed (no 3D, so no replay scenes): a red flash, a shake and the stamp. `snap` is the last picture. */
export function drawF1CrashFallback(g: CanvasRenderingContext2D, W: number, H: number, t: number, snap: ImageData | null) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (snap) g.putImageData(snap, 0, 0);
  const sh = Math.max(0, 1 - t / 0.8) * 10;
  g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  g.fillStyle = `rgba(255,${Math.round(40 + 200 * Math.max(0, 1 - t * 3))},30,${(0.45 * Math.max(0, 1 - t / 1.1) + 0.12).toFixed(3)})`; g.fillRect(-20, -20, W + 40, H + 40);
  const a = Math.min(1, t / 0.5);
  g.globalAlpha = a; g.textAlign = "center"; g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, H / 2 - 44, W, 88);
  g.fillStyle = "#ff3b30"; g.font = "900 44px 'Space Grotesk', Inter, Arial, sans-serif"; g.fillText("DISQUALIFIED", W / 2, H / 2 + 8);
  g.fillStyle = "#fff"; g.font = "700 13px Inter, Arial, sans-serif"; g.fillText("YOU TOUCHED THE BARRIER", W / 2, H / 2 + 32);
  g.restore();
}

export function drawF1Hud(g: CanvasRenderingContext2D, W: number, H: number, d: HudData) {
  drawInstructions(g, d);
  drawMap(g, W, d);
  drawWarning(g, W, d);
  drawShift(g, W, H, d);
  drawDanger(g, W, H, d);
  void PROGRESS;
}
