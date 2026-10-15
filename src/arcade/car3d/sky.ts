// @ts-nocheck
/**
 * A Forza-style sky dome for the car games (Rally, Drift King): one shader, drawn behind everything.
 * - colour gradient from three colours (linear light), a round sun with a three-lobe glow and a hot core;
 * - golden hour: an orange horizon band under the sun, rose / violet belts above it, the blue shadow of the Earth opposite;
 * - procedural clouds (value-noise fbm on the sky plane) with dark bellies, bright sun-facing edges, lit orange-pink from below at sunset;
 * - crepuscular rays fanning out of the sun, a thin hot line on the horizon, and a saturation grade so it stays rich after tone mapping;
 * - lens flares (soft discs and rings along the line through the screen centre).
 * `gold` 0..1 picks how much golden hour there is; the colours come from the caller (each stage keeps its own palette).
 */
const VERT = `
varying vec3 vDir;
void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const FRAG = `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform float uGold; uniform float uCloud; uniform float uTime; uniform float uQ; uniform float uDim;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += vn(p) * a; p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  vec3 rd = normalize(vDir);
  float e = rd.y, h = clamp(e, 0.0, 1.0);
  vec3 col = mix(uMid, uTop, pow(h, 0.55));
  col = mix(col, uLow, smoothstep(0.02, -0.15, e));
  float sd = max(dot(rd, uSunDir), 0.0);
  vec2 sxz = normalize(uSunDir.xz + 1e-5), rxz = normalize(rd.xz + 1e-5);
  float side = max(dot(rxz, sxz), 0.0), anti = 1.0 - side;
  float g = uGold;
  // golden hour gradient: deep orange low towards the sun, violet higher, the Earth's shadow and the pink belt of Venus opposite
  float band = exp(-pow(max(e, 0.0) * 4.0, 2.0));
  col = mix(col, col * 0.3 + mix(vec3(1.0, 0.2, 0.03), vec3(1.0, 0.45, 0.1), pow(sd, 8.0)) * 0.9, band * pow(side, 1.6) * g * 0.8);
  float belt = exp(-pow((e - 0.22) * 3.2, 2.0));
  col = mix(col, mix(vec3(0.9, 0.16, 0.22), vec3(0.3, 0.1, 0.55), smoothstep(0.1, 0.5, e)), belt * g * (0.15 + 0.45 * side));
  col = mix(col, vec3(0.75, 0.26, 0.4), exp(-pow((e - 0.13) * 7.0, 2.0)) * g * 0.42 * anti);
  col = mix(col, vec3(0.06, 0.09, 0.3), exp(-pow(e * 9.0, 2.0)) * g * 0.45 * anti);
  col = mix(col, col * vec3(0.5, 0.42, 0.9), smoothstep(0.25, 0.85, e) * g * 0.6);
  col += vec3(1.0, 0.3, 0.05) * exp(-pow(e * 30.0, 2.0)) * pow(side, 6.0) * g * 0.8;
  // the sun: round disc, hot core and three glow lobes
  float disc = smoothstep(0.99955 - 0.0002 * g, 0.99972 - 0.0002 * g, sd);
  col += mix(uSunCol, vec3(1.0, 0.5, 0.2), g * 0.4) * disc * 4.0 * uDim;
  col += uSunCol * (pow(sd, 6.0) * (0.1 + 0.12 * g) + pow(sd, 40.0) * (0.25 + 0.3 * g) + pow(sd, 600.0) * 1.2) * uDim;
  // rays: wedges round the sun lit or shaded
  if (uQ > 0.5) {
    vec3 up = abs(uSunDir.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 r = normalize(cross(up, uSunDir)), u = cross(uSunDir, r);
    float ang = atan(dot(rd, u), dot(rd, r));
    float rays = smoothstep(0.35, 0.75, vn(vec2(ang * 9.0, uTime * 0.05))) * step(0.0, dot(rd, uSunDir));
    float fall = pow(sd, 3.0) * (1.0 - smoothstep(0.9, 0.998, sd));
    col += uSunCol * rays * fall * (0.06 + 0.5 * g) * uDim;
    col -= col * (1.0 - rays) * fall * 0.22 * g;
  }
  // clouds on a plane above the camera
  if (uCloud > 0.01 && e > 0.0) {
    vec2 cp = rd.xz / (e + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
    float n = fbm(cp);
    float thr = 0.72 - uCloud * 0.32;
    float c = smoothstep(thr, thr + 0.16, n) * smoothstep(0.0, 0.18, e);
    float n2 = fbm(cp + sxz * 0.25);                                   // towards the sun: thick there means this side is shaded
    float shade = smoothstep(thr - 0.05, thr + 0.25, n2);
    float edge = 1.0 - smoothstep(thr + 0.02, thr + 0.22, n);
    vec3 day = mix(vec3(1.0), vec3(0.55, 0.58, 0.66), shade * 0.8);
    vec3 under = mix(vec3(1.0, 0.24, 0.05), vec3(0.85, 0.16, 0.34), smoothstep(0.05, 0.45, e));
    vec3 gold = mix(mix(vec3(0.2, 0.09, 0.3), under, 0.3 + 0.7 * pow(side, 1.4)), vec3(1.0, 0.55, 0.2) * 1.3, pow(sd, 5.0)) * (1.0 - 0.35 * shade);
    vec3 cc = mix(day * mix(uMid, vec3(1.0), 0.6), gold, g);
    cc += uSunCol * edge * pow(sd, 3.0) * (0.3 + g) * uDim;
    col = mix(col, cc, c * 0.94);
  }
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(L), col, 1.0 + 0.45 * g), 0.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface CarSkyOpts { top: number; mid: number; low: number; sunDir: any; sunColor: number; gold: number; clouds: number; quality: number; radius?: number }

export function createCarSky(T: any, scene: any, o: CarSkyOpts) {
  const lin = (hex: number) => new T.Color(hex);   // three.js colours set from hex are converted to linear already
  const uni = {
    uSunDir: { value: o.sunDir.clone().normalize() }, uSunCol: { value: lin(o.sunColor) }, uTop: { value: lin(o.top) }, uMid: { value: lin(o.mid) }, uLow: { value: lin(o.low) },
    uGold: { value: o.gold }, uCloud: { value: o.clouds }, uTime: { value: 0 }, uQ: { value: o.quality }, uDim: { value: 1 },
  };
  const mat = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uni, side: T.BackSide, depthWrite: false, fog: false });
  const geo = new T.SphereGeometry(1, 32, 16);
  const dome = new T.Mesh(geo, mat); dome.scale.setScalar(o.radius || 1400); dome.renderOrder = -10; dome.frustumCulled = false;
  scene.add(dome);

  // lens flares: round, soft
  const tex = (draw: (g: CanvasRenderingContext2D, s: number) => void) => { const c = document.createElement("canvas"); c.width = c.height = 128; draw(c.getContext("2d")!, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const soft = tex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(0.25, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  const disc = tex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,0.5)"); r.addColorStop(0.85, "rgba(255,255,255,0.3)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill(); });
  const ring = tex((g, s) => { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = s * 0.05; g.beginPath(); g.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2); g.stroke(); });
  const spec: Array<[number, number, number, number, any]> = [
    [0, 0.45, 0xffc890, 0.3, soft], [0.3, 0.05, 0xff9a50, 0.25, disc], [0.5, 0.12, 0x6ad0ff, 0.12, ring], [0.72, 0.04, 0xffd070, 0.22, disc],
    [1.1, 0.16, 0xb070ff, 0.1, disc], [1.35, 0.07, 0x60ffb0, 0.13, disc], [1.7, 0.3, 0xff8a40, 0.06, ring],
  ];
  const sprites = spec.map(([t, size, color, op, map]) => {
    const m = new T.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    const sp = new T.Sprite(m); sp.renderOrder = 999; sp.frustumCulled = false; sp.visible = false; scene.add(sp);
    return { sp, t, size, op };
  });
  const v = new T.Vector3(), w = new T.Vector3();
  let t = 0;
  return {
    dome, uni,
    update(dt: number, cam: any) {
      t += dt; uni.uTime.value = t;
      dome.position.copy(cam.position);
      // flares
      v.copy(cam.position).addScaledVector(uni.uSunDir.value, 500).project(cam);
      const inView = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      const edge = 1 - Math.min(1, Math.max(0, (Math.max(Math.abs(v.x), Math.abs(v.y)) - 0.7) / 0.5));
      const k = inView && o.quality > 0 ? edge * uni.uDim.value * (0.45 + 0.7 * uni.uGold.value) * (1 - uni.uCloud.value * 0.5) : 0;
      for (const s of sprites) {
        s.sp.visible = k > 0.01; if (!s.sp.visible) continue;
        w.set(v.x * (1 - s.t), v.y * (1 - s.t), 0.2).unproject(cam).sub(cam.position).normalize();
        s.sp.position.copy(cam.position).addScaledVector(w, 3);
        const sc = s.size * 6 * Math.tan((cam.fov * Math.PI) / 360);
        s.sp.scale.set(sc, sc, 1); s.sp.material.opacity = s.op * k;
      }
    },
    dispose() {
      scene.remove(dome); geo.dispose(); mat.dispose();
      sprites.forEach((s) => { scene.remove(s.sp); s.sp.material.dispose(); });
      [soft, disc, ring].forEach((x) => x.dispose());
    },
  };
}

/** Golden-hour palettes: mixes a stage's own sky towards a sunset (top deep blue-violet, horizon orange). */
export const SUNSET = { top: 0x1c2456, mid: 0xd8643a, low: 0x3a2228, sun: 0xffa258, hemiSky: 0xffb07a, hemiGround: 0x2a1e24, fog: 0xb86a48 };
