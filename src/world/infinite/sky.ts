// @ts-nocheck
import type { Ctx } from "./types";
import { clamp, lerp, smoothstep } from "./rng";
import { CENTER } from "./terrain";

/**
 * Sky, sun, moon and lighting for the Infinite world.
 * - A sky dome (one shader) paints the gradient, the sun and its glow, the moon and drifting clouds. It is drawn after the scene
 *   and only where nothing else is, so it costs almost nothing.
 * - The sun follows its own eased path, so sunrise and sunset last long enough to enjoy (about 8 seconds of each 100-second day),
 *   with warm light, long shadows and golden fog; the blood moon, rain, fog and storms recolour it all.
 * - Lighting, fog and exposure are recomputed every frame from the day clock, weather and camera distance.
 */
const DOME_VERT = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

/*
 * 5.67.0 "golden hour" sky: on top of the original gradient, square sun and pixel clouds, the dome now has
 * - a deep forward-scattering glow round the sun (three lobes), a square corona ring and a bigger, redder sun low in the sky;
 * - blocky crepuscular rays: the angle round the sun is cut into wedges, each lit or shaded, slowly turning;
 * - a hot orange horizon line under the sun, a rose and violet belt above it, the Earth's blue shadow and pink "belt of Venus" opposite;
 * - two cloud layers in square cells: thick clouds with dark bellies and bright sun-side edges (a second look-up towards the sun fakes
 *   their shading), lit orange-pink from below at sunset and still glowing for a while after the sun has gone (afterglow),
 *   and high streaky cirrus that catches the last light;
 * - pixel stars that twinkle at night.
 * Low graphics keeps the original look (no rays, one cloud layer).
 */
const DOME_FRAG = `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform vec3 uSunCol; uniform vec3 uZenith; uniform vec3 uHorizon;
uniform float uSunAmt; uniform float uTwilight; uniform float uNight; uniform float uCover; uniform float uCloudDark; uniform float uFlash; uniform float uQ;
uniform float uAfter; uniform float uTime;
uniform vec2 uWindOff; uniform sampler2D uNoise;
float sqDist(vec3 rd, vec3 c, out vec2 uv){
  vec3 up = abs(c.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 r = normalize(cross(up, c)); vec3 u = cross(c, r);
  uv = vec2(dot(rd, r), dot(rd, u));
  return max(abs(uv.x), abs(uv.y));
}
void main(){
  vec3 rd = normalize(vDir);
  float e = rd.y;
  float h = clamp(e, 0.0, 1.0);
  float gold = max(uTwilight, uAfter * 0.8);
  // base gradient: a little more saturated and with a tighter horizon band at golden hour
  vec3 col = mix(uHorizon, uZenith, pow(h, mix(0.46, 0.34, uTwilight)));
  col = mix(col, uHorizon * 0.62, smoothstep(0.0, -0.3, e));
  float sd = max(dot(rd, uSunDir), 0.0);
  vec2 suv; float sq = sqDist(rd, uSunDir, suv);
  float front = step(0.0, dot(rd, uSunDir));
  // the sun: a square block, bigger and redder near the horizon, with a square corona ring
  float size = 0.0375 * (1.0 + 0.55 * uTwilight);
  float sunDisc = smoothstep(size, size - 0.003, sq) * front;
  float ring = (smoothstep(size * 1.9, size * 1.75, sq) - smoothstep(size * 1.6, size * 1.45, sq)) * front;
  vec3 discCol = mix(uSunCol, vec3(1.0, 0.45, 0.18), uTwilight * 0.5);
  col += discCol * sunDisc * 2.9 * uSunAmt;
  col += uSunCol * ring * 0.22 * uTwilight * uSunAmt * step(1.5, uQ);
  // forward scattering: wide haze, a hot halo and a tight core
  col += uSunCol * (pow(sd, 5.0) * (0.12 + 0.1 * uTwilight) + pow(sd, 28.0) * (0.24 + 0.22 * uTwilight) + pow(sd, 300.0) * 0.7) * uSunAmt;
  vec2 sxz = normalize(vec2(uSunDir.x, uSunDir.z) + 1e-5), rxz = normalize(rd.xz + 1e-5);
  float side = max(dot(rxz, sxz), 0.0);
  float band = exp(-pow(max(e, 0.0) * 4.2, 2.0));
  // golden hour: the sky low down turns deep orange towards the sun and stays blue-violet higher up (multiplied in, so it saturates
  // instead of washing out to white)
  vec3 warm = mix(vec3(1.0, 0.2, 0.035), vec3(1.0, 0.42, 0.1), pow(sd, 8.0));   // linear light: these show as deep orange
  col = mix(col, col * 0.35 + warm * 0.85, band * pow(side, 2.0) * gold * 0.75);
  col += uSunCol * band * (0.04 + 0.22 * pow(side, 4.0)) * gold * 0.4;
  col = mix(col, col * vec3(0.55, 0.42, 0.9), smoothstep(0.2, 0.75, e) * gold * 0.65);   // deeper zenith
  // a hot thin line right on the horizon under the sun
  col += vec3(1.0, 0.3, 0.05) * exp(-pow(e * 26.0, 2.0)) * pow(side, 6.0) * gold * 0.7;
  // sunset belt: rose and violet bands above the glow; opposite the sun the pink belt of Venus over the blue shadow of the Earth
  float belt = exp(-pow((e - 0.2) * 3.4, 2.0));
  col = mix(col, mix(vec3(0.9, 0.16, 0.2), vec3(0.28, 0.1, 0.55), smoothstep(0.08, 0.5, e)), belt * gold * (0.15 + 0.5 * side));
  float anti = 1.0 - side;
  col = mix(col, vec3(0.75, 0.26, 0.4), exp(-pow((e - 0.14) * 7.0, 2.0)) * gold * 0.45 * anti);
  col = mix(col, vec3(0.07, 0.1, 0.32), exp(-pow(e * 9.0, 2.0)) * gold * 0.45 * anti);
  // blocky light rays fanning out from the sun (golden hour, Medium and High)
  if (uQ > 0.5) {
    float ang = atan(suv.y, suv.x);
    float wedge = floor((ang + 3.14159) / 6.28318 * 36.0);
    float rnd = texture2D(uNoise, vec2(wedge / 36.0 * 0.37 + uTime * 0.0012, 0.61)).r;
    float rays = smoothstep(0.42, 0.62, rnd) * front;
    float fall = pow(sd, 3.0) * (1.0 - smoothstep(0.86, 0.995, sd));
    col += uSunCol * rays * fall * (0.1 + 0.65 * uTwilight) * uSunAmt * smoothstep(-0.05, 0.12, e + 0.05);
    col -= col * (1.0 - rays) * fall * 0.28 * uTwilight;   // the shaded wedges between (behind clouds)
  }
  // moon
  float md = max(dot(rd, uMoonDir), 0.0);
  vec2 muv; float mq = sqDist(rd, uMoonDir, muv);
  float moonDisc = smoothstep(0.035, 0.032, mq) * step(0.0, dot(rd, uMoonDir));
  col += vec3(0.78, 0.85, 1.0) * (moonDisc * 2.2 + pow(md, 28.0) * 0.09 + pow(md, 6.0) * 0.04) * uNight;
  // pixel stars (High), twinkling
  if (uQ > 1.5 && uNight > 0.05 && e > 0.02) {
    vec2 sp = floor(rd.xz / (e + 0.35) * 180.0);
    float s = texture2D(uNoise, sp / 256.0).r;
    float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 60.0);
    col += vec3(0.9, 0.93, 1.0) * step(0.985, s) * tw * uNight * smoothstep(0.02, 0.2, e) * (1.0 - uCover * 0.8) * 0.9;
  }
  // clouds, built from square cells
  if (uQ > 0.5 && e > 0.005) {
    float lightDark = mix(1.0, 0.18, uNight * (1.0 - uAfter));
    // high cirrus: long thin streaks in bigger cells that catch the last light
    if (uQ > 1.5) {
      vec2 hp = floor(rd.xz / (e + 0.12) * 5.0 + 0.5) / 5.0;
      float hn = texture2D(uNoise, vec2(hp.x * 0.05, hp.y * 0.22) + uWindOff * 0.6).g;
      float hc = smoothstep(0.62, 0.72, hn) * smoothstep(0.08, 0.3, e) * (0.25 + 0.75 * (1.0 - uCover * 0.6));
      vec3 hcol = mix(vec3(0.95, 0.96, 1.0), mix(vec3(1.0, 0.3, 0.08), vec3(0.85, 0.2, 0.42), smoothstep(0.1, 0.5, e)), gold * 0.9);
      hcol += uSunCol * pow(sd, 3.0) * 0.4 * gold;
      col = mix(col, hcol * lightDark, hc * 0.55);
    }
    if (uCover > 0.02) {
      vec2 cp = floor(rd.xz / (e + 0.2) * 9.0 + 0.5) / 9.0;
      float n = texture2D(uNoise, cp * 0.1 + uWindOff).r * 0.5 + texture2D(uNoise, cp * 0.23 + uWindOff * 1.7).g * 0.3;
      if (uQ > 1.5) n += texture2D(uNoise, cp * 0.55 + uWindOff * 2.4).b * 0.2; else n += 0.1;
      float thr = 1.0 - uCover * 0.8;
      float c = smoothstep(thr, thr + 0.07, n) * smoothstep(0.0, 0.16, e);
      // self-shadow: look again a few cells towards the sun; thick there means this side is in shade
      vec2 toward = cp + sxz * 0.22;
      float n2 = texture2D(uNoise, toward * 0.1 + uWindOff).r * 0.5 + texture2D(uNoise, toward * 0.23 + uWindOff * 1.7).g * 0.3 + 0.1;
      float shade = smoothstep(thr - 0.05, thr + 0.25, n2);
      float edge = (1.0 - smoothstep(thr + 0.02, thr + 0.2, n));          // thin cloud edges glow
      float lit = pow(sd, 2.6) * 0.65 + 0.35;
      vec3 base = mix(vec3(0.97), vec3(0.4, 0.43, 0.48), uCloudDark);
      vec3 cc = base * mix(0.5, 1.08, lit) * mix(1.0, 0.72, shade * (1.0 - uCloudDark));
      // golden hour: bellies lit orange and pink from below, the sun side hot, the far side violet
      vec3 under = mix(vec3(1.0, 0.22, 0.05), vec3(0.85, 0.16, 0.32), smoothstep(0.05, 0.4, e));
      vec3 sunset = mix(mix(vec3(0.2, 0.09, 0.32), under, 0.35 + 0.65 * pow(side, 1.5)), vec3(1.0, 0.55, 0.2) * 1.4, pow(sd, 6.0));
      cc = mix(cc, sunset * (1.0 - 0.35 * shade), gold * (1.0 - uCloudDark));
      cc += uSunCol * edge * pow(sd, 4.0) * (0.35 + 0.9 * gold) * uSunAmt * (1.0 - uCloudDark);   // silver lining
      cc = mix(cc, uHorizon * 0.9, 0.12);
      cc *= lightDark;
      col = mix(col, cc, c * 0.93);
    }
  }
  // golden hour colour grade: more saturation, so the oranges and violets stay rich after tone mapping
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(L), col, 1.0 + 0.5 * gold), 0.0);
  col += vec3(0.8, 0.86, 1.0) * uFlash * 0.55;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

type K = [number, number, number, number]; // [elevation deg, r, g, b]
function ramp(keys: K[], e: number, out: any) {
  if (e <= keys[0]![0]) return out.setRGB(keys[0]![1], keys[0]![2], keys[0]![3]);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!, b = keys[i]!;
    if (e <= b[0]) { const t = (e - a[0]) / (b[0] - a[0]); return out.setRGB(lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)); }
  }
  const l = keys[keys.length - 1]!; return out.setRGB(l[1], l[2], l[3]);
}
const SUN: K[] = [[-8, 0.35, 0.28, 0.6], [-1, 0.95, 0.3, 0.12], [3, 1.0, 0.4, 0.14], [8, 1.0, 0.58, 0.26], [16, 1.0, 0.78, 0.5], [32, 1.0, 0.92, 0.78], [60, 1.0, 0.97, 0.9]];
const ZEN: K[] = [[-18, 0.008, 0.012, 0.045], [-8, 0.05, 0.07, 0.22], [-2, 0.13, 0.15, 0.42], [4, 0.17, 0.28, 0.6], [12, 0.14, 0.34, 0.78], [30, 0.09, 0.33, 0.86]];
const HOR: K[] = [[-18, 0.03, 0.05, 0.11], [-8, 0.28, 0.16, 0.34], [-2, 0.88, 0.34, 0.26], [4, 0.98, 0.5, 0.26], [12, 0.98, 0.7, 0.44], [20, 0.86, 0.78, 0.7], [30, 0.62, 0.78, 0.96]];

export function installSky(ctx: Ctx) {
  const { env, T, air } = ctx;
  const u = air.u;
  const sunDir = u.uSunDir!.value, moonDir = u.uMoonDir!.value;
  const cSun = u.uSunCol!.value, cZen = u.uZenith!.value, cHor = u.uHorizon!.value, cFog = u.uFogCol!.value;
  const tmp = new T.Color(), tmp2 = new T.Color(), grey = new T.Color(), blood = new T.Color(), v3 = new T.Vector3();
  let dome: any = null, moonLight: any = null, uQ = { value: 2 }, uAfter = { value: 0 };
  let flare: any = null;
  const focus = new T.Vector3();
  const state = { elev: 30, golden: 0, night: 0, light: 1 };
  ctx.x.sky = state;

  function build() {
    const geo = new T.SphereGeometry(1, 28, 18);
    const mat = new T.ShaderMaterial({
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uSunDir: u.uSunDir, uMoonDir: u.uMoonDir, uSunCol: u.uSunCol, uZenith: u.uZenith, uHorizon: u.uHorizon, uSunAmt: u.uSunAmt, uTwilight: u.uTwilight,
        uNight: u.uNight, uCover: u.uCover, uCloudDark: u.uCloudDark, uFlash: u.uFlash, uQ, uWindOff: u.uWindOff, uNoise: u.uNoise,
        uAfter, uTime: u.uTime || { value: 0 },
      },
    });
    dome = new T.Mesh(geo, mat);
    dome.scale.setScalar(330); dome.frustumCulled = false; dome.renderOrder = 10; dome.matrixAutoUpdate = true; dome.userData.noShadowCast = true; dome.castShadow = false;
    env.scene.add(dome);
    moonLight = new T.DirectionalLight(0x8fa8e8, 0);
    moonLight.castShadow = false;
    env.scene.add(moonLight); env.scene.add(moonLight.target);
    // the engine's own sun and moon discs are replaced by the dome's
    env.sunMesh.visible = false; env.moonMesh.visible = false;
    flare = makeFlare();
  }

  /** Square lens flares (blocky, like the sun): a soft glow on the sun and ghosts along the line through the middle of the screen. */
  function makeFlare() {
    const tex = (draw: (g: CanvasRenderingContext2D, s: number) => void) => { const c = document.createElement("canvas"); c.width = c.height = 64; draw(c.getContext("2d")!, 64); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
    const soft = tex((g, s) => { for (let i = 1; i < 16; i++) { const k = i / 16, a = 0.11 * k * k; g.fillStyle = `rgba(255,255,255,${a})`; const w = s * (1 - k * 0.92); g.fillRect((s - w) / 2, (s - w) / 2, w, w); } });   // stepped square glow fading to nothing at the edge
    const block = tex((g, s) => { g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(s * 0.18, s * 0.18, s * 0.64, s * 0.64); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88); });
    const ring = tex((g, s) => { g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = s * 0.09; g.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72); g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = s * 0.2; g.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72); });
    const spec: Array<[number, number, number, number, any]> = [   // [position along the line (0 = sun, 1 = centre), size, colour, opacity, texture]
      [0, 0.3, 0xffb070, 0.35, soft], [0, 0.1, 0xfff0d0, 0.4, soft], [0.32, 0.04, 0xff9a50, 0.26, block], [0.55, 0.08, 0x6ad0ff, 0.16, ring],
      [0.78, 0.028, 0xffd070, 0.24, block], [1.15, 0.13, 0xb070ff, 0.11, ring], [1.42, 0.055, 0x60ffb0, 0.13, block], [1.75, 0.2, 0xff8a40, 0.07, soft],
    ];
    const sprites = spec.map(([t, size, color, op, map]) => {
      const m = new T.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      const sp = new T.Sprite(m); sp.renderOrder = 999; sp.frustumCulled = false; sp.visible = false; env.scene.add(sp);
      return { sp, t, size, op };
    });
    return { sprites, textures: [soft, block, ring], v: new T.Vector3(), w: new T.Vector3() };
  }
  function updateFlare(e: number, dark: number) {
    if (!flare) return;
    const cam = env.camera, f = flare;
    const on = ctx.gfx.f.sky >= 1 && e > -1;
    f.v.copy(cam.position).addScaledVector(sunDir, 200).project(cam);
    const sx = f.v.x, sy = f.v.y, inView = f.v.z < 1 && Math.abs(sx) < 1.25 && Math.abs(sy) < 1.25;
    const edge = 1 - smoothstep(0.75, 1.25, Math.max(Math.abs(sx), Math.abs(sy)));
    const k = on && inView ? edge * clamp((e + 1) / 4, 0, 1) * (1 - air.cover * 0.75) * (1 - dark) * (0.55 + 0.6 * state.golden) : 0;
    for (const s of f.sprites) {
      s.sp.visible = k > 0.01;
      if (!s.sp.visible) continue;
      f.w.set(sx * (1 - s.t), sy * (1 - s.t), 0.2).unproject(cam).sub(cam.position).normalize();
      s.sp.position.copy(cam.position).addScaledVector(f.w, 3);
      const sc = s.size * 3 * Math.tan((cam.fov * Math.PI) / 360) * 2;
      s.sp.scale.set(sc, sc, 1);
      s.sp.material.opacity = s.op * k;
    }
  }

  function update(dt: number) {
    const cam = env.camera, DAY = env.DAY_LENGTH as number;
    const t = (env.wbPhotoTime != null ? env.wbPhotoTime : env.simTime) as number, cyc = (((t % DAY) + DAY) % DAY) / DAY;   // photo mode may hold its own time of day
    const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
    const a = cyc < 0.5 ? Math.PI * ease(cyc * 2) : Math.PI + Math.PI * ease((cyc - 0.5) * 2);
    // the sun's path leans away from east-west so it is never straight overhead; sunrise and sunset land beside the default view, so the low sun lights the island from the side
    const phi = 1.5, lat = 0.38;
    const ex = Math.cos(phi), ez = Math.sin(phi), nx = -Math.sin(phi), nz = Math.cos(phi);
    const ca = Math.cos(a), sa = Math.sin(a);
    sunDir.set(ex * ca + nx * sa * Math.sin(lat), sa * Math.cos(lat), ez * ca + nz * sa * Math.sin(lat)).normalize();
    moonDir.copy(sunDir).multiplyScalar(-1);
    const e = Math.asin(clamp(sunDir.y, -1, 1)) * (180 / Math.PI);
    state.elev = e;

    // palette from the sun's height
    ramp(SUN, e, cSun); ramp(ZEN, e, cZen); ramp(HOR, e, cHor);
    const rain = air.rain, dark = air.dark, fogA = air.fog, bl = air.blood;
    // weather: grey it, and the blood moon reddens the night
    const g = 0.55 + 0.4 * smoothstep(-6, 20, e);
    grey.setRGB(0.36 * g, 0.39 * g, 0.43 * g);
    const wd = clamp(dark * 0.8 + rain * 0.5 + fogA * 0.55, 0, 0.92);
    cZen.lerp(grey, wd * 0.85); cHor.lerp(tmp.copy(grey).multiplyScalar(1.15), wd * 0.9);
    cSun.lerp(grey, clamp(dark * 0.7 + rain * 0.6, 0, 0.85));
    if (bl > 0.01) { blood.setRGB(0.3, 0.035, 0.045); cZen.lerp(blood, bl * 0.8); cHor.lerp(tmp.setRGB(0.6, 0.1, 0.07), bl * 0.75); }

    const night = smoothstep(-1, -11, e), tw = smoothstep(18, 1, e) * smoothstep(-10, -2.5, e);
    u.uNight!.value = night; u.uTwilight!.value = tw * (1 - dark * 0.6);
    u.uSunAmt!.value = smoothstep(-8, -1, e) * (1 - dark * 0.8);
    state.golden = tw; state.night = night;
    const daylight = smoothstep(-6, 22, e);
    state.light = daylight;
    // afterglow: for a while after sunset (and before sunrise) the clouds still glow pink and orange
    uAfter.value = smoothstep(3, -1.5, e) * smoothstep(-12, -3.5, e) * (1 - dark * 0.8);
    state.after = uAfter.value;

    // dome follows the camera
    dome.position.copy(cam.position);
    uQ.value = ctx.gfx.f.sky;
    u.uCover!.value = ctx.gfx.f.sky > 0 ? air.cover : 0;

    // fog and background
    const D = env.camDistance as number;
    let near = D * 0.55 + 16, far = D * 2.7 + 110;
    // a fog day thickens the air with the zoom: the island is twice as wide as the original's, so a fixed limit would hide the whole map from the default view
    near += (10 + D * 0.1 - near) * fogA; far += (55 + D * 0.7 - far) * fogA;
    near *= 1 - rain * 0.25; far *= 1 - rain * 0.35;
    // morning mist: for a short while after sunrise the air is thick and golden, and the far jungle fades into it
    const mist = (cyc < 0.3 ? 1 : 0) * smoothstep(-4, 1, e) * smoothstep(19, 6, e) * (1 - fogA) * (1 - rain) * (1 - smoothstep(30, 70, D));   // only when zoomed in: the map view stays clear
    near *= 1 - 0.4 * mist; far *= 1 - 0.5 * mist;
    state.mist = mist;
    cFog.copy(cHor).lerp(cZen, 0.12).multiplyScalar(0.92);
    cFog.lerp(tmp2.setRGB(0.95, 0.3, 0.12), tw * 0.32 * (1 - wd));   // golden haze on the far land (linear: a rich orange)
    env.worldFog.color.copy(cFog); env.worldFog.near = near; env.worldFog.far = far;
    u.uFogRange!.value.set(near, far);
    env.scene.fog = env.worldFog;
    env.scene.background.copy(cFog);

    // lights
    focus.set(Math.round(env.camTarget.x * 2) / 2, 0, Math.round(env.camTarget.z * 2) / 2);
    const sunI = lerp(0, 1, smoothstep(-3.5, 3, e)) * lerp(0.9, 2.1, smoothstep(0, 26, e)) * (1 - 0.72 * dark) * (1 - 0.5 * rain) * (1 - 0.35 * fogA) * (1 - 0.6 * bl);
    const L = env.sunLight, H = env.hemi;
    L.color.copy(cSun);
    L.intensity = sunI;
    L.position.copy(focus).addScaledVector(sunDir, 180);
    L.target.position.copy(focus); L.target.updateMatrixWorld();
    const sh = L.shadow, ext = clamp(24 + D * 0.5, 38, 85);
    const wantShadow = ctx.gfx.f.shadows && env.shadersOn && e > 2.5 && sunI > 0.05;
    if (L.castShadow !== wantShadow) L.castShadow = wantShadow;
    if (Math.abs(sh.camera.right - ext) > 3) { sh.camera.left = -ext; sh.camera.right = ext; sh.camera.top = ext; sh.camera.bottom = -ext; sh.camera.near = 20; sh.camera.far = 420; sh.camera.updateProjectionMatrix(); }
    // moonlight (cold, soft, no shadows)
    moonLight.position.copy(focus).addScaledVector(moonDir.y > 0 ? moonDir : v3.set(0.3, 1, 0.2).normalize(), 180);
    moonLight.target.position.copy(focus); moonLight.target.updateMatrixWorld();
    moonLight.intensity = 0.85 * smoothstep(0, -9, e) * (1 - 0.5 * dark) * (1 - 0.25 * bl);
    moonLight.color.setRGB(0.55 + 0.35 * bl, 0.66 - 0.4 * bl, 0.95 - 0.7 * bl);
    // sky light: sky colour from above, warm jungle bounce from below; at night a cold blue glow keeps shapes (and zombies) readable
    H.color.copy(cHor).lerp(cZen, 0.5).multiplyScalar(1.05 + 0.3 * (1 - daylight));
    tmp.setRGB(0.2, 0.27, 0.5).lerp(tmp2.setRGB(0.38, 0.1, 0.1), bl);
    H.color.lerp(tmp, night * 0.75 * (1 - 0.5 * dark));
    H.groundColor.setRGB(lerp(0.08, 0.24, daylight), lerp(0.09, 0.27, daylight), lerp(0.12, 0.13, daylight));
    // golden hour: the shaded sides of trees and walls pick up a warm bounce from the glowing horizon
    tmp.setRGB(0.62, 0.34, 0.15); H.groundColor.lerp(tmp, tw * 0.55 * (1 - dark));
    H.intensity = (lerp(0.8, 1.0, Math.sqrt(daylight))) * (1 - 0.2 * dark) * (1 + 0.5 * air.flash) * (1 + 0.5 * tw * (1 - dark));
    env.renderer.toneMappingExposure = env.shadersOn ? 1.02 + 0.22 * tw : 1;
    // engine meshes that follow the sun and moon (the post-effects read the sun's position)
    env.sunMesh.position.copy(focus).addScaledVector(sunDir, 160);
    env.moonMesh.position.copy(focus).addScaledVector(moonDir, 160);
    env.moonMesh.material.color.setRGB(0.8 + 0.2 * bl, 0.84 - 0.5 * bl, 0.93 - 0.7 * bl);
    // stars: follow the camera, only on clear nights
    const st = env.stars;
    st.position.set(cam.position.x - 32, 0, cam.position.z - 32);
    st.material.opacity = clamp(night * (1 - air.cover * 0.85) * (1 - dark), 0, 1);
    st.visible = ctx.gfx.f.sky >= 2 && st.material.opacity > 0.02;
    // the glow overlay of the engine's post effects tracks the sun on its own; keep it gentle
    updateFlare(e, dark);
  }

  build();
  ctx.cleanup.push(() => {
    if (dome) { env.scene.remove(dome); dome.geometry.dispose(); dome.material.dispose(); dome = null; }
    if (flare) { flare.sprites.forEach((s: any) => { env.scene.remove(s.sp); s.sp.material.dispose(); }); flare.textures.forEach((t: any) => t.dispose()); flare = null; }
    if (moonLight) { env.scene.remove(moonLight); env.scene.remove(moonLight.target); moonLight.dispose && moonLight.dispose(); moonLight = null; }
    env.sunMesh.visible = true; env.moonMesh.visible = true;
    env.stars.position.set(0, 0, 0);
    env.sunLight.castShadow = false;
    env.sunLight.shadow.camera.left = -55; env.sunLight.shadow.camera.right = 55; env.sunLight.shadow.camera.top = 55; env.sunLight.shadow.camera.bottom = -55;
    env.sunLight.shadow.camera.updateProjectionMatrix();
    env.hemi.groundColor.setHex(0x3a2f22);
    env.sunLight.target.position.set(32, 0, 32);
    env.moonMesh.material.color.setHex(0xcdd6e8);
    env.scene.fog = env.shadersOn ? env.worldFog : null;
    env.worldFog.near = env.shadersOn ? 30 : 45; env.worldFog.far = env.shadersOn ? 125 : 150;
    env.renderer.toneMappingExposure = env.shadersOn ? 1.22 : 1;
  });
  ctx.frame.push(update);
}
