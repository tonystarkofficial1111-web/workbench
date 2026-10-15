// @ts-nocheck
import { MB } from "../../world/infinite/mb";

/**
 * What the driver sees from the seat, built from boxes like the rest of the car:
 *   street - Skyline and Mustang: dashboard with a hooded instrument binnacle, centre stack with vents, a screen and climate knobs,
 *            manual gear lever and handbrake, door cards with armrests and handles, two seats with headrests, rear-view mirror, sun visors.
 *   rally  - Impreza and GR Yaris: roll cage, bucket seats with harnesses, sequential lever and hydraulic handbrake, switch panel,
 *            co-driver's trip computer and notes, fire extinguisher, intercom.
 * Both get a live instrument cluster (a canvas texture): tachometer with red line, speedometer, odometer and trip, gear, fuel and
 * temperature, shift lights.
 */
export interface Gauges { update(d: { mph: number; rpm: number; redline: number; gear: number; odo: number; trip: number; fuel: number; temp: number; units?: "mph" | "kmh" }): void; tex: any }

export function clusterCanvas(T: any, style: "street" | "rally") {
  const c = document.createElement("canvas"); c.width = 512; c.height = 200;
  const g = c.getContext("2d")!;
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  let last = 0;
  const dial = (cx: number, cy: number, r: number, max: number, step: number, val: number, label: string, red?: number, accent = "#38b6ff") => {
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.fillStyle = "#06080b"; g.beginPath(); g.arc(cx, cy, r + 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#1c2430"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r + 5, 0, Math.PI * 2); g.stroke();
    if (red !== undefined) { g.strokeStyle = "#e5484d"; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, r - 4, a0 + (a1 - a0) * (red / max), a1); g.stroke(); }
    g.strokeStyle = accent; g.globalAlpha = 0.35; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, r - 4, a0, a0 + (a1 - a0) * Math.min(1, val / max)); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = "#e9eef5"; g.font = "600 14px Inter, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let v = 0; v <= max + 1e-6; v += step) {
      const a = a0 + (a1 - a0) * (v / max), co = Math.cos(a), si = Math.sin(a);
      g.strokeStyle = red !== undefined && v >= red ? "#ff6b6b" : "#c9d3de"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(cx + co * (r - 12), cy + si * (r - 12)); g.lineTo(cx + co * (r - 2), cy + si * (r - 2)); g.stroke();
      g.fillText(String(Math.round(v / (max > 100 ? 1 : 1))), cx + co * (r - 26), cy + si * (r - 26));
      const h = a + ((a1 - a0) * (step / max)) / 2;
      if (v + step <= max) { g.strokeStyle = "#5d6b7a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + Math.cos(h) * (r - 8), cy + Math.sin(h) * (r - 8)); g.lineTo(cx + Math.cos(h) * (r - 2), cy + Math.sin(h) * (r - 2)); g.stroke(); }
    }
    g.fillStyle = "#7f93a7"; g.font = "600 10px Inter, Arial, sans-serif"; g.fillText(label, cx, cy + r * 0.42);
    const an = a0 + (a1 - a0) * Math.min(1.02, Math.max(0, val / max));
    g.strokeStyle = "#ff7a1a"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - Math.cos(an) * 10, cy - Math.sin(an) * 10); g.lineTo(cx + Math.cos(an) * (r - 14), cy + Math.sin(an) * (r - 14)); g.stroke();
    g.fillStyle = "#2a323d"; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
  };
  const update: Gauges["update"] = (d) => {
    const now = performance.now(); if (now - last < 45) return; last = now;
    g.fillStyle = "#020305"; g.fillRect(0, 0, 512, 200);
    const units = d.units || "mph", spd = units === "kmh" ? d.mph * 1.609 : d.mph, maxS = style === "rally" ? (units === "kmh" ? 220 : 140) : (units === "kmh" ? 260 : 160);
    dial(108, 104, 84, Math.ceil(d.redline / 1000) + 1, 1, d.rpm / 1000, "RPM ×1000", d.redline / 1000);
    dial(404, 104, 84, maxS, maxS > 200 ? 40 : 20, spd, units === "kmh" ? "KM/H" : "MPH");
    // centre: gear, digital speed, odometer and trip, fuel and temperature
    g.fillStyle = "#0b1016"; g.fillRect(206, 18, 100, 166); g.strokeStyle = "#1c2430"; g.lineWidth = 2; g.strokeRect(206, 18, 100, 166);
    const shift = d.rpm >= d.redline * 0.9;
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillStyle = shift ? (Math.floor(now / 90) % 2 ? "#ff4b3b" : "#ffd34d") : "#ffffff"; g.font = "800 58px 'Space Grotesk', Inter, Arial, sans-serif"; g.fillText(d.gear <= 0 ? "N" : String(d.gear), 256, 78);
    g.fillStyle = "#38b6ff"; g.font = "700 18px 'Space Grotesk', Inter, Arial, sans-serif"; g.fillText(String(Math.round(spd)), 256, 102);
    g.fillStyle = "#c9d3de"; g.font = "600 13px Consolas, 'Courier New', monospace";
    g.fillStyle = "#151c25"; g.fillRect(214, 112, 84, 20); g.fillStyle = "#e9eef5"; g.fillText(String(Math.floor(d.odo)).padStart(6, "0"), 256, 127);
    g.fillStyle = "#7f93a7"; g.font = "600 10px Inter, Arial, sans-serif"; g.fillText("TRIP " + d.trip.toFixed(1), 256, 146);
    // fuel and temperature bars
    const bar = (x: number, v: number, col: string, lab: string) => { g.fillStyle = "#151c25"; g.fillRect(x, 152, 34, 8); g.fillStyle = col; g.fillRect(x, 152, 34 * Math.max(0, Math.min(1, v)), 8); g.fillStyle = "#7f93a7"; g.font = "600 9px Inter, Arial, sans-serif"; g.fillText(lab, x + 17, 174); };
    bar(216, d.fuel, "#2fe27a", "FUEL"); bar(262, d.temp, d.temp > 0.85 ? "#ff5f63" : "#38b6ff", "TEMP");
    // shift lights across the top
    const lit = Math.max(0, Math.min(10, Math.round(((d.rpm / d.redline) - 0.6) / 0.4 * 10)));
    for (let k = 0; k < 10; k++) { g.fillStyle = k < lit ? (k < 4 ? "#2fe27a" : k < 7 ? "#ffd34d" : "#ff4b3b") : "#141a22"; g.fillRect(212 + k * 9, 6, 7, 7); }
    tex.needsUpdate = true;
  };
  update({ mph: 0, rpm: 900, redline: 7500, gear: 1, odo: 0, trip: 0, fuel: 0.8, temp: 0.5 });
  return { tex, update };
}

export function buildInterior(T: any, kit: any, body: any, eye: [number, number, number], style: "street" | "rally", col: number) {
  const [ex, ey, ez] = eye, sd = Math.sign(ex) || 1;   // the driver's side (+x = left-hand drive)
  const im = new MB(T, 320); im.jitter = 0.02; im.ao = { y0: 0.3, h: 1, k: 0.3 };
  const DASH = style === "rally" ? 0x202227 : 0x17191d, TRIM = 0x2a2d33, SEAT = style === "rally" ? 0x1d1f23 : 0x24262b;
  // dashboard: top, face, and a hood over the instruments in front of the driver
  im.box(DASH, 1.42, 0.2, 0.5, 0, ey - 0.36, ez + 0.98);
  im.box(TRIM, 1.42, 0.06, 0.3, 0, ey - 0.24, ez + 1.12, 0.4, 0, 0);
  im.box(DASH, 0.48, 0.05, 0.13, ex, ey - 0.06, ez + 0.93, -0.12, 0, 0);                   // binnacle hood, high enough to see the dials under it
  for (const s of [-1, 1]) im.box(DASH, 0.03, 0.14, 0.14, ex + s * 0.23, ey - 0.14, ez + 0.92);
  im.box(0x07080a, 0.46, 0.2, 0.02, ex, ey - 0.16, ez + 0.925);                                  // the dark face behind the dials
  // seats with headrests and bolsters
  for (const s of [-1, 1]) {
    const x = s * 0.36;
    im.box(SEAT, 0.48, 0.55, 0.1, x, ey - 0.33, ez - 0.34, -0.12, 0, 0); im.box(SEAT, 0.48, 0.1, 0.52, x, ey - 0.62, ez - 0.05);
    for (const b of [-1, 1]) { im.box(SEAT, 0.07, 0.42, 0.14, x + b * 0.22, ey - 0.38, ez - 0.3); im.box(SEAT, 0.07, 0.1, 0.48, x + b * 0.22, ey - 0.56, ez - 0.05); }
    im.box(SEAT, 0.26, 0.2, 0.09, x, ey + 0.02, ez - 0.4);                                  // headrest
    if (style === "rally") for (const b of [-1, 1]) im.box(0xc8102e, 0.06, 0.52, 0.015, x + b * 0.1, ey - 0.3, ez - 0.28, -0.12, 0, 0, { jit: 0 });   // harness straps
    else im.box(new T.Color(col).multiplyScalar(0.6).getHex(), 0.2, 0.42, 0.012, x, ey - 0.33, ez - 0.285, -0.12, 0, 0, { jit: 0 });    // stitched panel in body colour
  }
  // A-pillars, roof lining, door cards with an armrest, a handle and a speaker
  for (const s of [-1, 1]) {
    im.beam(DASH, 0.07, s * 0.7, ey - 0.3, ez + 0.98, s * 0.64, ey + 0.21, ez + 0.36);
    im.box(0x24262b, 0.06, 0.5, 1.3, s * 0.74, ey - 0.46, ez + 0.2);
    im.box(0x1b1d22, 0.04, 0.05, 1.2, s * 0.72, ey - 0.2, ez + 0.2);
    im.box(0x2f3238, 0.1, 0.06, 0.5, s * 0.69, ey - 0.42, ez + 0.1);                        // armrest
    im.box(0x9aa0a8, 0.02, 0.03, 0.1, s * 0.705, ey - 0.27, ez + 0.36, 0, 0, 0, { mat: "metal" });   // door handle
    im.box(0x101114, 0.02, 0.12, 0.12, s * 0.715, ey - 0.6, ez + 0.5);                       // speaker grille
    for (let k = 0; k < 3; k++) im.box(0x2a2d33, 0.021, 0.008, 0.1, s * 0.716, ey - 0.64 + k * 0.03, ez + 0.5, 0, 0, 0, { jit: 0 });
  }
  im.box(0x5c6068, 1.46, 0.04, 1.3, 0, ey + 0.2, ez - 0.25);                                 // roof lining
  im.box(0x16181c, 1.36, 0.06, 0.08, 0, ey + 0.2, ez + 0.32);
  // pedals (just visible) and the footwell
  for (let k = 0; k < 3; k++) im.box(0x3a3e45, 0.07, 0.1, 0.02, ex + (k - 1) * 0.11 * sd, ey - 0.78, ez + 0.95, 0.4, 0, 0, { mat: "metal" });
  if (style === "street") {
    // centre stack: two vents, a screen, climate knobs (square), hazard switch; console with a six-speed lever and handbrake
    im.box(DASH, 0.34, 0.36, 0.08, 0, ey - 0.42, ez + 0.88);
    for (const s of [-1, 1]) { im.box(0x0e1014, 0.12, 0.06, 0.02, s * 0.08, ey - 0.27, ez + 0.84); for (let k = 0; k < 3; k++) im.box(0x3a3e45, 0.11, 0.008, 0.021, s * 0.08, ey - 0.29 + k * 0.02, ez + 0.835, 0, 0, 0, { jit: 0 }); }
    for (const s of [-1, 1]) { im.box(0x0e1014, 0.08, 0.05, 0.02, s * 0.52, ey - 0.27, ez + 0.9); }                 // outer vents
    for (const k of [-0.08, 0, 0.08]) im.box(0x2a2d33, 0.04, 0.04, 0.03, k, ey - 0.52, ez + 0.83);                      // climate knobs
    im.box(0xd2262d, 0.03, 0.02, 0.02, 0, ey - 0.46, ez + 0.83, 0, 0, 0, { jit: 0 });                                    // hazard switch
    im.box(DASH, 0.22, 0.24, 0.62, 0, ey - 0.62, ez + 0.42);
    im.box(0x9aa0a8, 0.02, 0.18, 0.02, 0, ey - 0.44, ez + 0.46, 0.25, 0, 0, { mat: "metal" }); im.box(0x101114, 0.05, 0.05, 0.05, 0, ey - 0.35, ez + 0.48);   // gear lever and knob
    im.box(0x101114, 0.04, 0.03, 0.26, -sd * 0.07, ey - 0.47, ez + 0.18, -0.25, 0, 0);                                  // handbrake
    im.box(0x101114, 0.1, 0.05, 0.04, 0, ey + 0.13, ez + 0.5);                                                            // rear-view mirror
    im.box(0x8aa0b8, 0.09, 0.035, 0.005, 0, ey + 0.13, ez + 0.477, 0, 0, 0, { jit: 0, noAO: true });
    for (const s of [-1, 1]) im.box(0x5c6068, 0.4, 0.02, 0.18, s * 0.34, ey + 0.17, ez + 0.36, 0.2, 0, 0);               // sun visors
    im.box(DASH, 0.5, 0.012, 0.012, -sd * 0.38, ey - 0.42, ez + 0.75, 0, 0, 0, { jit: 0 });                               // glovebox seam
  } else {
    // roll cage: hoops, door bars and a diagonal
    const cage = 0xd8dce2;
    for (const z of [ez + 0.72, ez - 0.45]) { for (const s of [-1, 1]) im.beam(cage, 0.045, s * 0.66, 0.5, z, s * 0.62, ey + 0.17, z - (z > ez ? 0.18 : 0)); im.beam(cage, 0.045, -0.62, ey + 0.17, z - (z > ez ? 0.18 : 0), 0.62, ey + 0.17, z - (z > ez ? 0.18 : 0)); }
    for (const s of [-1, 1]) { im.beam(cage, 0.045, s * 0.62, ey + 0.17, ez + 0.54, s * 0.62, ey + 0.17, ez - 0.45); im.beam(cage, 0.04, s * 0.66, ey - 0.5, ez + 0.6, s * 0.66, ey - 0.35, ez - 0.4); }
    im.beam(cage, 0.04, -0.62, ey + 0.17, ez - 0.45, 0.62, 0.55, ez - 0.45);
    // centre: sequential lever, hydraulic handbrake, switch panel
    im.box(0x202227, 0.24, 0.3, 0.7, 0, ey - 0.55, ez + 0.4);
    im.box(0x9aa0a8, 0.03, 0.34, 0.03, 0, ey - 0.28, ez + 0.42, 0.3, 0, 0, { mat: "metal" }); im.box(0x101114, 0.06, 0.06, 0.06, 0, ey - 0.12, ez + 0.37);
    im.box(0xc8102e, 0.04, 0.44, 0.04, -sd * 0.1, ey - 0.26, ez + 0.12, -0.5, 0, 0);
    im.box(0x0e1014, 0.3, 0.14, 0.04, 0, ey - 0.36, ez + 0.86, -0.5, 0, 0);
    for (let k = 0; k < 8; k++) im.box(k % 3 === 0 ? 0xd2262d : k % 3 === 1 ? 0xe9e9ee : 0xe0b020, 0.025, 0.035, 0.025, -0.1 + k * 0.03, ey - 0.35, ez + 0.83, 0, 0, 0, { jit: 0 });
    // co-driver: trip computer, notes, intercom; fire extinguisher by the seat
    im.box(0x0e1014, 0.2, 0.08, 0.06, -ex, ey - 0.3, ez + 0.8, -0.3, 0, 0); im.box(0x2fe27a, 0.16, 0.04, 0.005, -ex, ey - 0.3, ez + 0.77, -0.3, 0, 0, { jit: 0, mat: "lamp" });
    im.box(0xf2f2f4, 0.22, 0.02, 0.3, -ex, ey - 0.42, ez + 0.3, 0.6, 0, 0);
    im.box(0x2a2d33, 0.08, 0.06, 0.06, 0, ey - 0.28, ez + 0.75);
    im.box(0xd2262d, 0.1, 0.32, 0.1, -sd * 0.14, ey - 0.62, ez - 0.05);
  }
  const root = im.build(kit, false); body.add(root);
  // instrument cluster: a live canvas under the binnacle hood, facing the driver
  const cl = clusterCanvas(T, style);
  const panel = new T.Mesh(new T.PlaneGeometry(0.44, 0.172), new T.MeshBasicMaterial({ map: cl.tex, toneMapped: false }));
  panel.position.set(ex, ey - 0.16, ez + 0.912); panel.rotation.set(0.08, Math.PI, 0); body.add(panel);
  // steering wheel: rally = deep three-spoke with a top marker; street = round rim and an airbag hub with a badge
  const steeringWheel = new T.Group();
  const sw = new MB(T, 322); sw.jitter = 0; sw.ao = { y0: -9, h: 1, k: 0 };
  sw.torus(0x16181c, style === "rally" ? 0.18 : 0.19, 0.024, 0, 0, 0, 0, 0, 0, 6, 18);
  if (style === "rally") { sw.box(0x2a2d33, 0.3, 0.03, 0.03, 0, 0, 0); sw.box(0x2a2d33, 0.03, 0.14, 0.03, 0, -0.08, 0); sw.box(0xc8102e, 0.03, 0.04, 0.03, 0, 0.18, 0, 0, 0, 0, { jit: 0 }); }
  else { sw.box(0x23262c, 0.36, 0.035, 0.03, 0, -0.01, 0); sw.box(0x23262c, 0.12, 0.1, 0.05, 0, -0.01, 0.01); sw.box(0x9aa0a8, 0.04, 0.025, 0.01, 0, 0.0, -0.02, 0, 0, 0, { jit: 0, mat: "metal" }); sw.box(0x23262c, 0.035, 0.12, 0.03, 0, -0.1, 0); }
  steeringWheel.add(sw.build({ ...kit, lit: kit.rubber }, false));
  steeringWheel.position.set(ex, ey - 0.31, ez + 0.58); steeringWheel.rotation.x = -0.35; steeringWheel.rotation.order = "XYZ";
  body.add(steeringWheel);
  return {
    steeringWheel, gauges: { tex: cl.tex, update: cl.update } as Gauges,
    dispose() { root.traverse((o: any) => o.geometry && o.geometry.dispose()); panel.geometry.dispose(); panel.material.dispose(); cl.tex.dispose(); },
  };
}
