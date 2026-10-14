// @ts-nocheck
import type * as THREE_NS from "three";
import type { F1Features } from "./gfx";

type T3 = typeof THREE_NS;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/**
 * One full-screen pass: a gentle radial speed blur that grows with speed, a little glow on very bright parts (High only), colour grade,
 * vignette, ACES tone mapping and a touch of dither so the sky gradient does not band.
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uBlur; uniform float uSpeed; uniform float uGlow; uniform float uTime;
uniform vec3 uGrade;
uniform vec2 uCenter;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 d = vUv - uCenter;
  vec2 dn = d * vec2(uRes.x / uRes.y, 1.0);
  float r = length(dn);
  float k = uBlur * uSpeed * smoothstep(0.18, 0.95, r);
  vec3 c = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 7; i++) {
    float t = float(i) / 6.0;
    float w = 1.0 - 0.5 * t;
    c += texture2D(tScene, vUv - d * k * 0.1 * t).rgb * w;
    wsum += w;
  }
  c /= wsum;
  if (uGlow > 0.0) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.3;
      vec2 o = vec2(cos(a), sin(a)) * (0.006 + 0.004 * float(i & 1)) * vec2(uRes.y / uRes.x, 1.0) * 2.0;
      vec3 s = texture2D(tScene, vUv + o).rgb + texture2D(tScene, vUv + o * 2.4).rgb;
      g += max(s * 0.5 - 1.15, 0.0);
    }
    c += g * (uGlow / 8.0);
  }
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

export function makePost(T: T3, renderer: any, f: F1Features, grade: [number, number, number]) {
  const ext = renderer.extensions;
  const hdr = !!(ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float"));
  const rt = new T.WebGLRenderTarget(4, 4, { type: hdr ? T.HalfFloatType : T.UnsignedByteType, samples: f.msaa, depthBuffer: true, stencilBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  const mat = new T.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: rt.texture }, uRes: { value: new T.Vector2(1, 1) }, uBlur: { value: f.blur }, uSpeed: { value: 0 }, uGlow: { value: f.glow },
      uTime: { value: 0 }, uGrade: { value: new T.Vector3(grade[0], grade[1], grade[2]) }, uCenter: { value: new T.Vector2(0.5, 0.6) },
    },
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new T.Scene(); scene.add(quad);
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    hdr,
    setSize(w: number, h: number) { rt.setSize(w, h); mat.uniforms.uRes.value.set(w, h); },
    render(sceneMain: any, camera: any, speed01: number, time: number) {
      mat.uniforms.uSpeed.value = speed01; mat.uniforms.uTime.value = (time * 0.001) % 100;
      renderer.setRenderTarget(rt);
      renderer.render(sceneMain, camera);
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
    dispose() { rt.dispose(); mat.dispose(); quad.geometry.dispose(); },
  };
}
