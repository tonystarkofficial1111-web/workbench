// @ts-nocheck
import type * as THREE_NS from "three";
import { MB } from "../../world/infinite/mb";
import { Rng } from "../../world/infinite/rng";
import type { F1Env } from "./env";

type T3 = typeof THREE_NS;

const VERT = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol;
void main(){
  vec3 rd = normalize(vDir);
  float h = clamp(rd.y, 0.0, 1.0);
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uTop, smoothstep(0.16, 0.85, h));
  col = mix(col, uHor * 0.85, smoothstep(0.0, -0.25, rd.y));
  float sd = max(dot(rd, uSunDir), 0.0);
  float haze = exp(-pow(max(rd.y, 0.0) * 5.0, 2.0));
  col += uSunCol * (pow(sd, 6.0) * 0.18 + pow(sd, 36.0) * 0.4 + pow(sd, 900.0) * 3.0) + uSunCol * haze * pow(sd, 3.0) * 0.28;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** A dome that follows the camera: gradient sky, haze at the horizon and the sun. */
export function createSky(T: T3, env: F1Env) {
  const sunDir = new T.Vector3(Math.cos(env.sunAz) * Math.cos(env.sunEl), Math.sin(env.sunEl), Math.sin(env.sunAz) * Math.cos(env.sunEl)).normalize();
  const uniforms = {
    uTop: { value: new T.Color(env.skyTop) }, uMid: { value: new T.Color(env.skyMid) }, uHor: { value: new T.Color(env.skyHorizon) },
    uSunDir: { value: sunDir }, uSunCol: { value: new T.Color(env.sunColor) },
  };
  const mat = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, side: T.BackSide, depthWrite: false, fog: false });
  const mesh = new T.Mesh(new T.SphereGeometry(1, 28, 16), mat);
  mesh.scale.setScalar(1500); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, sunDir, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}

/** Boxy clouds: a few flat slabs piled into a cluster, drifting slowly across the sky. */
export function createClouds(T: T3, kit: any, env: F1Env, count: number) {
  const group = new T.Group();
  if (count <= 0) return { group, update() {}, dispose() {} };
  const rnd = new Rng(env.seed * 7 + 3);
  const items: any[] = [];
  for (let i = 0; i < count; i++) {
    const mb = new MB(T, 300 + i); mb.ao = { y0: -9, h: 1, k: 0 }; mb.jitter = 0.02;
    const w = rnd.range(90, 190), parts = rnd.int(4, 7);
    for (let k = 0; k < parts; k++) {
      const pw = w * rnd.range(0.3, 0.6), pd = w * rnd.range(0.25, 0.45), ph = rnd.range(8, 18);
      mb.box(0xffffff, pw, ph, pd, rnd.range(-w * 0.4, w * 0.4), rnd.range(0, 12), rnd.range(-w * 0.25, w * 0.25), 0, rnd.int(0, 3) * Math.PI / 2, 0, { mat: "lit", noAO: true });
    }
    const m = mb.build({ ...kit, lit: cloudMat(T, env) }, false);
    m.position.set(rnd.range(-1200, 1200), rnd.range(230, 380), rnd.range(-1200, 1200));
    m.traverse((o: any) => { o.castShadow = false; o.receiveShadow = false; });
    group.add(m); items.push(m);
  }
  const wind = new T.Vector3(Math.cos(env.sunAz + 1.2), 0, Math.sin(env.sunAz + 1.2));
  return {
    group,
    update(dt: number, cam: any) {
      for (const m of items) {
        m.position.addScaledVector(wind, dt * 3.2);
        const dx = m.position.x - cam.x, dz = m.position.z - cam.z;
        if (dx * dx + dz * dz > 1400 * 1400) { m.position.x = cam.x - dx * 0.95; m.position.z = cam.z - dz * 0.95; }
      }
    },
    dispose() { group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}

let cmat: any = null;
function cloudMat(T: T3, env: F1Env) {
  if (cmat) cmat.dispose();
  cmat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: env.cloud, emissive: env.cloud, emissiveIntensity: 0.32 });
  return cmat;
}
