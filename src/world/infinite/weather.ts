// @ts-nocheck
import type { Ctx } from "./types";
import { Rng, clamp, lerp, smoothstep } from "./rng";
import { CENTER, GRID } from "./terrain";
import { leafTexture } from "./tex";

/**
 * Weather as the player sees it. The game decides rain / fog / clear (and blood moons) and what they do to the zombies; this module
 * adds how the day LOOKS: how windy it is, how cloudy, whether a rainy day is a thunderstorm, and draws rain streaks, splashes,
 * wind-blown leaves and lightning on the GPU.
 *
 * Today's flavour is rolled once per game day: sunny, breezy, windy, overcast, rain, thunderstorm or fog. Wind blows the flags,
 * trees, plants, clouds and sea. It never changes how the game plays.
 */
type Flavor = "sunny" | "breezy" | "windy" | "overcast" | "rain" | "storm" | "fog";
const FLAVOR = {
  sunny: { wind: 0.1, cover: 0.2, dark: 0, label: "Clear skies" },
  breezy: { wind: 0.27, cover: 0.32, dark: 0, label: "Breezy" },
  windy: { wind: 0.58, cover: 0.42, dark: 0.08, label: "Windy" },
  overcast: { wind: 0.2, cover: 0.82, dark: 0.45, label: "Overcast" },
  rain: { wind: 0.34, cover: 0.88, dark: 0.7, label: "Raining now" },
  storm: { wind: 0.9, cover: 0.97, dark: 0.95, label: "Thunderstorm" },
  fog: { wind: 0.08, cover: 0.55, dark: 0.3, label: "Foggy" },
} as const;

const RAIN_V = `
attribute vec3 aSeed; attribute float aEnd;
uniform float uTime; uniform vec3 uCenter; uniform vec4 uWind; uniform float uRain; uniform float uAmt; uniform sampler2D uShore; uniform float uGrid;
varying float vA;
void main(){
  float spd = 24.0 + aSeed.z * 10.0;
  float fall = mod(aSeed.y * 38.0 - uTime * spd, 38.0);
  vec2 xz = uCenter.xz + (aSeed.xz - 0.5) * 96.0;
  float land = step(texture2D(uShore, xz / uGrid).r, 0.001);
  float gy = mix(0.36, 1.0, land);
  vec2 slant = uWind.xy * (uWind.z * 9.0 + uRain * 2.0);
  float top = gy + 24.0;
  float h = fall - 14.0;
  vec3 head = vec3(xz.x + slant.x * (h / spd) * -1.0, gy + max(h, 0.0), xz.y + slant.y * (h / spd) * -1.0);
  vec3 dir = normalize(vec3(slant.x, -spd, slant.y));
  vec3 p = head - dir * (aEnd * (0.5 + uRain * 0.7));
  float th = fract(aSeed.x * 7.31 + aSeed.y * 13.7 + aSeed.z * 3.3);
  vA = step(th, uAmt) * smoothstep(-1.0, 1.5, h) * (1.0 - aEnd * 0.6);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const RAIN_F = `
precision highp float;
varying float vA; uniform float uRain; uniform float uLight; uniform float uFlash;
void main(){
  gl_FragColor = vec4(mix(vec3(0.62, 0.7, 0.8), vec3(0.85, 0.9, 1.0), uLight) + uFlash, vA * uRain * 0.5);
}`;
const SPLASH_V = `
attribute vec3 aSeed;
uniform float uTime; uniform vec3 uCenter; uniform float uRain; uniform float uAmt; uniform sampler2D uShore; uniform float uGrid; uniform float uPx;
varying float vA; varying float vK;
void main(){
  float cyc = fract(uTime * (0.9 + aSeed.z * 0.8) + aSeed.y);
  vec2 xz = uCenter.xz + (aSeed.xz - 0.5) * 74.0;
  float land = step(texture2D(uShore, xz / uGrid).r, 0.001);
  vec3 p = vec3(xz.x, mix(0.38, 1.03, land), xz.y);
  vK = cyc;
  vA = (1.0 - cyc) * step(fract(aSeed.x * 5.7 + aSeed.z * 9.1), uAmt);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  gl_PointSize = (4.0 + 20.0 * cyc) * uPx / max(gl_Position.w * 0.045, 0.5);
}`;
const SPLASH_F = `
precision highp float;
varying float vA; varying float vK; uniform float uRain;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = max(abs(c.x), abs(c.y)) * 2.0;   // rain splashes are square ripples
  float ring = smoothstep(0.55, 0.78, d) * (1.0 - smoothstep(0.78, 1.0, d));
  gl_FragColor = vec4(0.9, 0.95, 1.0, ring * vA * 0.5 * uRain);
}`;
const LEAF_V = `
attribute vec4 aSeed;
uniform float uTime; uniform vec3 uCenter; uniform vec4 uWind; uniform float uAmt; uniform float uPx; uniform vec2 uOff;
varying vec3 vC; varying float vA;
void main(){
  float s = uWind.z;
  vec2 dir = uWind.xy;
  float t = uTime * (0.7 + s * 4.0) + aSeed.w * 40.0;
  vec2 base = (aSeed.xy - 0.5) * 100.0;
  vec2 drift = dir * mod(t * 7.0 + aSeed.z * 60.0, 100.0);
  vec2 xz = uCenter.xz + mod(base + drift + 50.0, 100.0) - 50.0;
  float y = 1.2 + fract(aSeed.z * 7.3 + aSeed.w) * 7.0 - mod(t * 0.9, 1.0) * 1.2 + sin(t * 2.3 + aSeed.w * 30.0) * 0.5;
  vec3 p = vec3(xz.x, y, xz.y);
  p.xz += vec2(sin(t * 1.7 + aSeed.w * 20.0), cos(t * 1.3 + aSeed.z * 20.0)) * 0.6;
  vC = mix(vec3(0.35, 0.6, 0.2), vec3(0.75, 0.6, 0.15), step(0.6, fract(aSeed.w * 13.0)));
  vA = step(fract(aSeed.w * 11.7 + aSeed.x * 3.1), uAmt);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  gl_PointSize = 24.0 * uPx / max(gl_Position.w * 0.04, 0.6);
}`;
const LEAF_F = `
precision highp float;
uniform sampler2D uMap; varying vec3 vC; varying float vA;
void main(){
  vec4 t = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vC, t.a * vA * 0.9);
}`;

export function installWeather(ctx: Ctx) {
  const { env, T, air } = ctx;
  const rnd = new Rng((Math.random() * 1e9) | 0);
  const wx = env.iife.wx;
  let flavor: Flavor = "sunny", lastDay = -1, storm = 0, flashT = 8 + Math.random() * 6, bolt: any = null, boltT = 0;
  const target = { cover: 0.2, dark: 0 };
  ctx.x.flavor = () => flavor;

  // ------------------------------------------------------------------ GPU rain, splashes and leaves
  const group = new T.Group(); group.name = "wb-weather";
  const center = { value: new T.Vector3(CENTER.x, 0, CENTER.z) };
  const px = { value: Math.min(window.devicePixelRatio || 1, 2) };
  const common = { uTime: air.u.uTime, uCenter: center, uWind: air.u.uWind, uRain: air.u.uRain, uShore: air.u.uShore, uGrid: { value: GRID } };
  const amt = { rain: { value: 0 }, splash: { value: 0 }, leaf: { value: 0 } };
  const light = { value: 1 };
  const MAXR = 2600;
  const rg = new T.BufferGeometry();
  const seeds = new Float32Array(MAXR * 2 * 3), ends = new Float32Array(MAXR * 2), pos = new Float32Array(MAXR * 2 * 3);
  for (let i = 0; i < MAXR; i++) {
    const a = rnd.next(), b = rnd.next(), c = rnd.next();
    for (let k = 0; k < 2; k++) { const j = (i * 2 + k) * 3; seeds[j] = a; seeds[j + 1] = b; seeds[j + 2] = c; ends[i * 2 + k] = k; }
  }
  rg.setAttribute("position", new T.BufferAttribute(pos, 3)); rg.setAttribute("aSeed", new T.BufferAttribute(seeds, 3)); rg.setAttribute("aEnd", new T.BufferAttribute(ends, 1));
  const rainMat = new T.ShaderMaterial({ vertexShader: RAIN_V, fragmentShader: RAIN_F, transparent: true, depthWrite: false, fog: false,
    uniforms: { ...common, uAmt: amt.rain, uLight: light, uFlash: air.u.uFlash } });
  const rain = new T.LineSegments(rg, rainMat); rain.frustumCulled = false; rain.renderOrder = 6; rain.visible = false;
  const MAXS = 900;
  const sg = new T.BufferGeometry();
  const ss = new Float32Array(MAXS * 3);
  for (let i = 0; i < ss.length; i++) ss[i] = rnd.next();
  sg.setAttribute("position", new T.BufferAttribute(new Float32Array(MAXS * 3), 3)); sg.setAttribute("aSeed", new T.BufferAttribute(ss, 3));
  const splashMat = new T.ShaderMaterial({ vertexShader: SPLASH_V, fragmentShader: SPLASH_F, transparent: true, depthWrite: false, fog: false,
    uniforms: { ...common, uAmt: amt.splash, uPx: px } });
  const splash = new T.Points(sg, splashMat); splash.frustumCulled = false; splash.renderOrder = 6; splash.visible = false;
  const MAXL = 420;
  const lg = new T.BufferGeometry();
  const ls = new Float32Array(MAXL * 4);
  for (let i = 0; i < ls.length; i++) ls[i] = rnd.next();
  lg.setAttribute("position", new T.BufferAttribute(new Float32Array(MAXL * 3), 3)); lg.setAttribute("aSeed", new T.BufferAttribute(ls, 4));
  const leafMat = new T.ShaderMaterial({ vertexShader: LEAF_V, fragmentShader: LEAF_F, transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: air.u.uTime, uCenter: center, uWind: air.u.uWind, uAmt: amt.leaf, uPx: px, uOff: air.u.uWindOff, uMap: { value: leafTexture(T) } } });
  const leaves = new T.Points(lg, leafMat); leaves.frustumCulled = false; leaves.renderOrder = 6; leaves.visible = false;
  group.add(rain, splash, leaves);
  env.scene.add(group);

  // lightning: a jagged bolt in the distance plus a flash of the whole sky
  function strike() {
    const cam = env.camera, a = rnd.range(0, Math.PI * 2), d = rnd.range(70, 130);
    const bx = env.camTarget.x + Math.cos(a) * d, bz = env.camTarget.z + Math.sin(a) * d;
    const pts: number[] = []; let x = bx, y = 60, z = bz;
    while (y > 0.5) { pts.push(x, y, z); y -= rnd.range(3, 7); x += rnd.range(-3, 3); z += rnd.range(-3, 3); }
    pts.push(x, 0.5, z);
    if (bolt) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    bolt = new T.Line(geo, new T.LineBasicMaterial({ color: 0xe8efff, transparent: true, opacity: 1, fog: false, depthWrite: false }));
    bolt.frustumCulled = false; bolt.renderOrder = 7; env.scene.add(bolt);
    boltT = 0.22; air.flash = 1;
  }

  // ------------------------------------------------------------------ the weather box in the corner
  const rd = document.getElementById("rain-days"), rp = document.getElementById("rain-pct"), rb = document.getElementById("rain-box");
  let lastBox = "";
  function updateBox() {
    if (!rd || !rp) return;
    const a = FLAVOR[flavor].label;
    const b = wx.blood && wx.bloodAmt > 0.3 ? "\u{1FA78} Blood moon" : "\u{1F4A8} " + air.kmh + " km/h";
    const key = a + "|" + b;
    if (key === lastBox && rd.textContent === a) return;
    lastBox = key; rd.textContent = a; rp.textContent = b;
    if (rb) rb.classList.toggle("raining", flavor === "rain" || flavor === "storm");
  }

  function rollDay() {
    const k = wx.kind as string;
    if (k === "rain") flavor = rnd.chance(0.38) ? "storm" : "rain";
    else if (k === "fog") flavor = "fog";
    else { const u = rnd.next(); flavor = u < 0.3 ? "sunny" : u < 0.55 ? "breezy" : u < 0.8 ? "windy" : "overcast"; }
    const f = FLAVOR[flavor];
    air.windBase = f.wind * rnd.range(0.85, 1.15);
    air.windDir += rnd.range(-1.1, 1.1);
    target.cover = f.cover; target.dark = f.dark;
    if (flavor === "windy") env.showWorldWarning("\u{1F4A8} A windy day: flags snap, trees sway and the sea runs high.", 4500);
    else if (flavor === "storm") env.showWorldWarning("⛈️ A thunderstorm rolls in. Zombies are slowed by the rain.", 4500);
  }

  /** Test / debug: force today's flavour (and the matching game weather amounts). */
  ctx.x.setFlavor = (name: Flavor, wind?: number) => {
    flavor = name; const f = FLAVOR[name];
    air.windBase = wind != null ? wind : f.wind; target.cover = f.cover; target.dark = f.dark; lastDay = env.legacyDay;
    wx.kind = name === "rain" || name === "storm" ? "rain" : name === "fog" ? "fog" : "clear";
    wx.day = env.legacyDay;
  };
  ctx.frame.push((dt) => {
    if (env.legacyDay !== lastDay) { lastDay = env.legacyDay; rollDay(); }
    // the engine's own smooth weather amounts drive ours
    if (wx.kind === "rain" && (flavor !== "rain" && flavor !== "storm")) rollDay();
    if (wx.kind === "clear" && (flavor === "rain" || flavor === "storm")) { flavor = "sunny"; target.cover = 0.2; target.dark = 0; air.windBase = 0.12; }
    if (wx.kind === "fog" && flavor !== "fog") rollDay();
    const k = Math.min(1, dt * 0.45);
    air.cover += (target.cover - air.cover) * k;
    air.dark += (target.dark - air.dark) * k;
    air.rain = wx.rainAmt || 0; air.fog = wx.fogAmt || 0; air.blood = wx.bloodAmt || 0;
    storm += (((flavor === "storm" ? 1 : 0) * air.rain) - storm) * Math.min(1, dt * 0.6);
    air.storm = storm;
    air.flash = Math.max(0, air.flash - dt * 3.2);
    // hide the engine's plain rain lines; ours replace them
    if (wx.rain) wx.rain.visible = false;
    const f = ctx.gfx.f.particles;
    center.value.set(env.camTarget.x, 0, env.camTarget.z);
    amt.rain.value = clamp(f * (0.4 + 0.6 * air.rain), 0, 1) * (MAXR / MAXR);
    rainMat.uniforms.uAmt.value = clamp(f * (0.35 + 0.65 * air.rain), 0, 1);
    amt.splash.value = clamp(f * air.rain, 0, 1);
    amt.leaf.value = clamp(f * smoothstep(0.18, 0.7, air.strength) * (1 - air.rain * 0.6), 0, 1);
    light.value = 0.25 + 0.75 * ctx.x.sky.light;
    const showRain = air.rain > 0.03 && f > 0;
    rain.visible = showRain; splash.visible = showRain && ctx.gfx.f.water >= 1; leaves.visible = amt.leaf.value > 0.03;
    if (showRain) rg.setDrawRange(0, Math.floor(MAXR * clamp(f * 0.95, 0.12, 1)) * 2);
    sg.setDrawRange(0, Math.floor(MAXS * clamp(f, 0.1, 1)));
    lg.setDrawRange(0, Math.floor(MAXL * clamp(f, 0.1, 1)));
    // lightning
    if (flavor === "storm" && air.rain > 0.6) { flashT -= dt; if (flashT <= 0) { strike(); flashT = rnd.range(5, 13); } }
    if (bolt) { boltT -= dt; bolt.material.opacity = clamp(boltT * 6, 0, 1); if (boltT <= 0) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); bolt = null; } }
    updateBox();
    // wind note in the day banner
    const h = document.getElementById("wb-inf-hud");
    if (h && air.strength > 0.3 && h.textContent.indexOf("\u{1F4A8}") < 0) h.textContent += " · \u{1F4A8} " + air.windWord + " " + air.kmh + " km/h";
  });
  ctx.cleanup.push(() => {
    env.scene.remove(group);
    rg.dispose(); sg.dispose(); lg.dispose(); rainMat.dispose(); splashMat.dispose(); leafMat.dispose();
    if (bolt) { env.scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); bolt = null; }
    air.cover = 0.3; air.dark = 0; air.rain = 0; air.storm = 0; air.fog = 0; air.blood = 0; air.flash = 0;
    if (wx.rain && wx.rainAmt > 0.02) wx.rain.visible = true;
  });
}
