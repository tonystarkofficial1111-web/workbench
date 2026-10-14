// @ts-nocheck
import type * as THREE_NS from "three";
import type { F1Features } from "./gfx";

type T3 = typeof THREE_NS;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/**
 * The full-screen pass. The world and the cockpit are drawn into two separate pictures, so the speed blur only smears the world (the cockpit stays
 * sharp, like a real fixed camera). Then: a gentle radial speed blur, a soft glow on very bright parts (High), colour grade, vignette, ACES tone mapping
 * and a touch of dither so the sky gradient does not band.
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tCock;
uniform sampler2D tBloom;
uniform vec2 uRes;
uniform float uBlur; uniform float uSpeed; uniform float uGlow; uniform float uTime; uniform float uBloom; uniform float uShake;
uniform vec3 uGrade;
uniform vec2 uCenter;
uniform vec3 uRays;   // sun position on screen (xy, 0..1) and how strongly the rays show
uniform vec3 uRayCol;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 d = uv - uCenter;
  vec2 dn = d * vec2(uRes.x / uRes.y, 1.0);
  float r = length(dn);
  // tiny colour fringing towards the edges (a lens, not a filter)
  vec2 ca = d * (0.0014 + 0.0016 * uSpeed) * r;
  float k = uBlur * uSpeed * smoothstep(0.18, 0.95, r);
  vec3 c = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 7; i++) {
    float t = float(i) / 6.0;
    float w = 1.0 - 0.5 * t;
    vec2 o = d * k * 0.1 * t;
    vec3 s;
    s.r = texture2D(tScene, uv - o + ca).r;
    s.g = texture2D(tScene, uv - o).g;
    s.b = texture2D(tScene, uv - o - ca).b;
    c += s * w;
    wsum += w;
  }
  c /= wsum;
  if (uGlow > 0.0) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.3;
      vec2 o = vec2(cos(a), sin(a)) * (0.006 + 0.004 * float(i & 1)) * vec2(uRes.y / uRes.x, 1.0) * 2.0;
      vec3 s = texture2D(tScene, uv + o).rgb + texture2D(tScene, uv + o * 2.4).rgb;
      g += max(s * 0.5 - 1.15, 0.0);
    }
    c += g * (uGlow / 8.0);
  }
  if (uBloom > 0.0) c += texture2D(tBloom, uv).rgb * uBloom;
  // light shafts: march from this pixel towards the sun and collect the bright sky (trees and stands in between block it)
  if (uRays.z > 0.001) {
    vec2 sd = (uRays.xy - uv) / 14.0;
    vec2 p = uv; float acc = 0.0; float wgt = 1.0;
    for (int i = 0; i < 14; i++) {
      p += sd;
      vec3 s = texture2D(tScene, clamp(p, 0.0, 1.0)).rgb;
      float lum = dot(s, vec3(0.3, 0.55, 0.15));
      acc += smoothstep(1.3, 2.6, lum) * wgt;
      wgt *= 0.93;
    }
    c += uRayCol * acc * (uRays.z / 14.0) * (1.0 - smoothstep(0.0, 0.9, length((uv - uRays.xy) * vec2(1.0, 0.6))));
  }
  vec4 cp = texture2D(tCock, uv);
  c = c * (1.0 - cp.a) + cp.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uGrade.x);
  c = (c - 0.18) * uGrade.y + 0.18;
  c *= vec3(1.0 + uGrade.z, 1.0 + uGrade.z * 0.15, 1.0 - uGrade.z);
  c = max(c, 0.0);
  float v = smoothstep(1.02, 0.28, length(dn * vec2(0.92, 1.12)));
  c *= mix(0.58, 1.0, v);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
}`;

/** Bright-pass and blur for the bloom (High): a quarter-size copy of everything over the threshold, blurred twice. */
const BRIGHT = `
precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform sampler2D tTop; uniform float uMix;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c *= smoothstep(0.9, 2.2, l);
  gl_FragColor = vec4(c, 1.0);
}`;
const BLUR = `
precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.2270;
  c += (texture2D(tSrc, vUv + uDir * 1.3846).rgb + texture2D(tSrc, vUv - uDir * 1.3846).rgb) * 0.3162;
  c += (texture2D(tSrc, vUv + uDir * 3.2308).rgb + texture2D(tSrc, vUv - uDir * 3.2308).rgb) * 0.0703;
  gl_FragColor = vec4(c, 1.0);
}`;

export function makePost(T: T3, renderer: any, f: F1Features, grade: [number, number, number]) {
  const ext = renderer.extensions;
  const hdr = !!(ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float"));
  const type = hdr ? T.HalfFloatType : T.UnsignedByteType;
  const mkRT = (samples: number) => new T.WebGLRenderTarget(4, 4, { type, samples, depthBuffer: true, stencilBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  const rt = mkRT(f.msaa), rtC = mkRT(f.msaa);
  const bloom = f.bloom > 0, rtB1 = bloom ? new T.WebGLRenderTarget(4, 4, { type, depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter }) : null, rtB2 = bloom ? new T.WebGLRenderTarget(4, 4, { type, depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter }) : null;
  const mat = new T.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: rt.texture }, tCock: { value: rtC.texture }, tBloom: { value: bloom ? rtB2!.texture : rt.texture }, uRes: { value: new T.Vector2(1, 1) },
      uBlur: { value: f.blur }, uSpeed: { value: 0 }, uGlow: { value: f.glow }, uBloom: { value: bloom ? f.bloom : 0 }, uShake: { value: 0 }, uTime: { value: 0 },
      uGrade: { value: new T.Vector3(grade[0], grade[1], grade[2]) }, uCenter: { value: new T.Vector2(0.5, 0.6) },
      uRays: { value: new T.Vector3(0.5, 0.5, 0) }, uRayCol: { value: new T.Color(1, 0.85, 0.6) },
    },
  });
  const bright = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: BRIGHT, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: rt.texture }, tTop: { value: null }, uMix: { value: 0 } } });
  const blur = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, uDir: { value: new T.Vector2() } } });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new T.Scene(); scene.add(quad);
  const empty = new T.Scene();
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let bw = 2, bh = 2;
  const run = (m: any, target: any) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(scene, cam); };
  return {
    hdr,
    setSize(w: number, h: number) {
      rt.setSize(w, h); rtC.setSize(w, h); mat.uniforms.uRes.value.set(w, h);
      if (bloom) { bw = Math.max(2, Math.floor(w / 4)); bh = Math.max(2, Math.floor(h / 4)); rtB1!.setSize(bw, bh); rtB2!.setSize(bw, bh); }
    },
    /** world picture, cockpit picture on top of it, then the finishing pass. `sunScr` = [x, y, strength] of the sun in 0..1 screen units. */
    render(world: any, wcam: any, cockScene: any, cockCam: any, speed01: number, time: number, sunScr?: number[], rayCol?: any) {
      mat.uniforms.uSpeed.value = speed01; mat.uniforms.uTime.value = (time * 0.001) % 100;
      if (sunScr && f.rays > 0) { mat.uniforms.uRays.value.set(sunScr[0], sunScr[1], sunScr[2] * f.rays); if (rayCol) mat.uniforms.uRayCol.value.copy(rayCol); } else mat.uniforms.uRays.value.z = 0;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(world, wcam);
      if (cockScene) {
        const a = renderer.getClearAlpha(); renderer.setClearAlpha(0);
        renderer.setRenderTarget(rtC); renderer.clear(); renderer.render(cockScene, cockCam);
        renderer.setClearAlpha(a);
      } else {
        // nothing to draw on top: clear it and "render" an empty scene, because a multisampled target only copies its picture out when something is rendered into it
        const a = renderer.getClearAlpha(); renderer.setClearAlpha(0); renderer.setRenderTarget(rtC); renderer.clear(); renderer.render(empty, cam); renderer.setClearAlpha(a);
      }
      if (bloom) {
        bright.uniforms.tSrc.value = rt.texture; run(bright, rtB1);
        blur.uniforms.tSrc.value = rtB1!.texture; blur.uniforms.uDir.value.set(1 / bw, 0); run(blur, rtB2);
        blur.uniforms.tSrc.value = rtB2!.texture; blur.uniforms.uDir.value.set(0, 1 / bh); run(blur, rtB1);
        blur.uniforms.tSrc.value = rtB1!.texture; blur.uniforms.uDir.value.set(2 / bw, 0); run(blur, rtB2);
        blur.uniforms.tSrc.value = rtB2!.texture; blur.uniforms.uDir.value.set(0, 2 / bh); run(blur, rtB1);
        mat.uniforms.tBloom.value = rtB1!.texture;
      }
      run(mat, null);
    },
    dispose() { rt.dispose(); rtC.dispose(); if (rtB1) { rtB1.dispose(); rtB2!.dispose(); } mat.dispose(); bright.dispose(); blur.dispose(); quad.geometry.dispose(); },
  };
}
