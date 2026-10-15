// @ts-nocheck
import type { Ctx } from "./types";
import { WATER_Y, CENTER, GRID } from "./terrain";

/**
 * The sea. High: a wave shader (swells that grow with the wind, rippled normals, sky reflection, the sun's glitter path, foam
 * that washes up the beach and fades with depth). Medium: the same waves without foam and ripples. Low: a gently scrolling picture
 * on a flat plane (almost free). The shore picture (distance to the coast) comes from the terrain.
 */
export const VERT = `
uniform float uTime; uniform float uAmp;
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 q = wp.xz;
  float h = sin(dot(q, vec2(0.8, 0.6)) * 0.42 + uTime * 0.95) * 0.55
          + sin(dot(q, vec2(-0.6, 0.8)) * 0.71 + uTime * 1.35) * 0.3
          + sin(dot(q, vec2(0.3, -0.95)) * 1.3 + uTime * 1.9) * 0.12;
  wp.y += h * uAmp;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const FRAG = `
precision highp float;
varying vec3 vWorld;
uniform float uTime; uniform float uAmp; uniform float uQ; uniform float uLight; uniform float uRain; uniform float uSkyQ;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunAmt; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uFogCol; uniform vec2 uFogRange;
uniform vec4 uWind; uniform sampler2D uNoise; uniform sampler2D uShore; uniform float uGrid;
vec3 skyAt(vec3 r){
  float h = clamp(r.y, 0.0, 1.0);
  vec3 c = mix(uHorizon, uZenith, pow(h, 0.55));
  float sd = max(dot(r, uSunDir), 0.0);
  c += uSunCol * (pow(sd, 6.0) * 0.3 + pow(sd, 48.0) * 0.55) * uSunAmt;
  return c;
}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 q = vWorld.xz;
  vec2 g = vec2(0.8, 0.6) * cos(dot(q, vec2(0.8, 0.6)) * 0.42 + uTime * 0.95) * 0.55 * 0.42
         + vec2(-0.6, 0.8) * cos(dot(q, vec2(-0.6, 0.8)) * 0.71 + uTime * 1.35) * 0.3 * 0.71
         + vec2(0.3, -0.95) * cos(dot(q, vec2(0.3, -0.95)) * 1.3 + uTime * 1.9) * 0.12 * 1.3;
  g *= uAmp * 1.4;
  vec2 rip = vec2(0.0);
  if (uQ > 1.5) {
    vec3 n1 = texture2D(uNoise, q * 0.31 + vec2(uTime * 0.045, uTime * 0.03)).rgb;
    vec3 n2 = texture2D(uNoise, q * 0.83 + vec2(-uTime * 0.06, uTime * 0.075)).rgb;
    rip = (n1.rg + n2.gb - 1.0) * (0.05 + 0.22 * uWind.z + 0.2 * uRain);
  }
  vec3 N = normalize(vec3(-g.x - rip.x, 1.0, -g.y - rip.y));
  float depth = texture2D(uShore, q / uGrid).r;
  vec3 shallow = vec3(0.13, 0.62, 0.58), deep = vec3(0.02, 0.15, 0.30);
  vec3 body = mix(shallow, deep, smoothstep(0.0, 0.5, depth)) * (0.16 + 0.84 * uLight);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0) * 0.92 + 0.035;
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 col = mix(body, skyAt(R), fr);
  vec3 H = normalize(uSunDir + V);
  float nh = max(dot(N, H), 0.0);
  col += uSunCol * (pow(nh, 260.0) * 2.4 + pow(nh, 28.0) * 0.16) * uSunAmt;
  float foam = 0.0;
  if (uQ > 1.5) {
    float nz = texture2D(uNoise, q * 0.5 + vec2(uTime * 0.02, 0.0)).a;
    float edge = smoothstep(0.17, 0.0, depth + (nz - 0.5) * 0.06);
    float wave = 0.5 + 0.5 * sin(depth * 70.0 - uTime * 1.7 + nz * 5.0);
    foam = edge * (0.35 + 0.65 * smoothstep(0.55, 0.95, wave)) + smoothstep(0.045, 0.0, depth) * 0.6;
    foam += smoothstep(0.78, 0.98, texture2D(uNoise, q * 0.9 + vec2(uTime * 0.03, uTime * 0.02)).g) * uWind.z * 0.5 * smoothstep(0.15, 0.4, depth);
    col = mix(col, vec3(1.0) * (0.35 + 0.65 * uLight), clamp(foam, 0.0, 1.0) * 0.9);
  }
  float alpha = mix(0.5, 0.97, smoothstep(0.0, 0.42, depth)) + foam * 0.3;
  float d = length(cameraPosition - vWorld);
  float ff = smoothstep(uFogRange.x * 1.1, uFogRange.y, d);
  col = mix(col, uFogCol, ff); alpha = mix(alpha, 1.0, ff);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function waterPicture(T: any) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f7f9a"; g.fillRect(0, 0, 256, 256);
  g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = (i * 97) % 256, y = (i * 53) % 256, len = 18 + (i * 7) % 34;
    g.strokeStyle = i % 3 ? "rgba(255,255,255,0.18)" : "rgba(10,60,90,0.22)"; g.lineWidth = 2 + (i % 3);
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + len / 2, y + oy - 6, x + ox + len, y + oy); g.stroke(); }
  }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.repeat.set(36, 36);
  return t;
}

export function installWater(ctx: Ctx) {
  const { env, T, air } = ctx;
  let mesh: any = null, mat: any = null, basic: any = null, pic: any = null, mode = -1;
  const geo = new T.PlaneGeometry(460, 460, 150, 150); geo.rotateX(-Math.PI / 2);
  const lowGeo = new T.PlaneGeometry(460, 460, 1, 1); lowGeo.rotateX(-Math.PI / 2);
  const u = air.u;
  const uni = {
    uTime: u.uTime, uAmp: { value: 0.1 }, uQ: { value: 2 }, uLight: { value: 1 }, uRain: u.uRain, uSkyQ: { value: 2 },
    uSunDir: u.uSunDir, uSunCol: u.uSunCol, uSunAmt: u.uSunAmt, uZenith: u.uZenith, uHorizon: u.uHorizon, uFogCol: u.uFogCol, uFogRange: u.uFogRange,
    uWind: u.uWind, uNoise: u.uNoise, uShore: u.uShore, uGrid: { value: GRID },
  };

  // the engine keeps a sea plane of its own (and re-skins it when Shaders flip): leave it a harmless stand-in
  const old = env.legacyWaterMesh;
  if (old && old.parent) env.scene.remove(old);
  env.legacyWaterMesh = { material: {}, geometry: null, position: { set() {} }, isStandIn: true };

  function pick() {
    const m = ctx.gfx.f.water;
    if (m === mode && mesh) return;
    mode = m;
    if (mesh) env.scene.remove(mesh);
    if (m === 0) {
      if (!basic) { pic = waterPicture(T); basic = new T.MeshBasicMaterial({ map: pic, transparent: true, opacity: 0.88, color: 0xffffff }); }
      mesh = new T.Mesh(lowGeo, basic);
    } else {
      if (!mat) mat = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uni, transparent: true, depthWrite: false, fog: false });
      mesh = new T.Mesh(geo, mat);
    }
    mesh.position.set(CENTER.x, WATER_Y, CENTER.z);
    mesh.renderOrder = 2; mesh.frustumCulled = false; mesh.userData.noShadowCast = true;
    mesh.receiveShadow = false; mesh.castShadow = false;
    env.scene.add(mesh);
  }
  pick();
  ctx.gfxChanged.push(pick);

  ctx.frame.push((dt) => {
    pick();
    const w = air.strength;
    uni.uAmp.value = 0.05 + w * 0.34 + air.storm * 0.2;
    uni.uQ.value = ctx.gfx.f.water;
    uni.uLight.value = 0.2 + 0.8 * ctx.x.sky.light;
    if (mode === 0 && pic) {
      const wx = u.uWind!.value;
      pic.offset.x += wx.x * dt * 0.012 * (0.5 + w); pic.offset.y += wx.y * dt * 0.012 * (0.5 + w);
      basic.color.copy(u.uHorizon!.value).lerp(new T.Color(0x3f8fb0), 0.55).multiplyScalar(0.35 + 0.9 * ctx.x.sky.light);
    }
  });
  ctx.cleanup.push(() => {
    if (mesh) env.scene.remove(mesh);
    geo.dispose(); lowGeo.dispose(); mat && mat.dispose(); basic && basic.dispose(); pic && pic.dispose();
    env.legacyWaterMesh = null;
  });
}
