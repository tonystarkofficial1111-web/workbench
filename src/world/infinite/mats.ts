// @ts-nocheck
import type { T3 } from "./types";
import type { Air } from "./air";

/**
 * Shared materials for every model of the Infinite world. All models are merged, vertex-coloured meshes, so a building is a handful of
 * draw calls instead of dozens. Wind (sway) is a vertex-shader patch driven by the shared Air uniforms, so plants cost nothing per frame.
 */
export interface MatKit {
  lit: any;       // flat-ish lit surfaces
  litDS: any;     // double-sided (cloth, leaves)
  metal: any;     // shiny metal and glass
  glow: any;      // unlit bright parts that always shine (crystals, eyes)
  lamp: any;      // unlit lamp light: windows, lanterns and forge fire; the Infinite world dims it by day and brightens it at night and in storms
  sway: any;      // vegetation: lit + wind
  swayDS: any;    // vegetation, double-sided (leaves, fronds)
  cloth: any;     // flags and awnings: double-sided + flutter
  list(): any[];
}

const SWAY_VERT_HEAD = `
attribute float aSway;
uniform float uWT;
uniform vec4 uWindV;
`;

/** Vertex code run after the normal projection: pushes the vertex along the wind by its sway weight. */
const SWAY_VERT_BODY = `
#include <project_vertex>
{
  vec3 org = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
  #ifdef USE_INSTANCING
    org = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  #endif
  float ph = org.x * 0.31 + org.z * 0.23;
  float str = uWindV.z;
  float w1 = sin(uWT * 1.7 + ph) * 0.5 + sin(uWT * 2.9 + ph * 1.7) * 0.25;
  float sw = aSway * aSway;
  float amp = (0.025 + str * 0.2) * aSway;
  vec3 wo = vec3(uWindV.x, 0.0, uWindV.y) * (str * 0.5 + 0.12 * w1) * sw + vec3(w1 * amp * 0.5, 0.0, sin(uWT * 2.3 + ph * 1.3) * amp * 0.5);
  mvPosition.xyz += (viewMatrix * vec4(wo, 0.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/** Flag / awning cloth: a hanging cloth that streams out along the wind. The cloth runs along local +x from the pole at x = 0. */
const CLOTH_VERT_BODY = `
#include <begin_vertex>
{
  float cx = clamp(position.x / uClothW, 0.0, 1.0);
  float org = modelMatrix[3][0] * 0.7 + modelMatrix[3][2] * 0.5;
  float str = uWindV.z;
  float wave = sin(position.x * 5.5 - uWT * (2.6 + str * 9.0) + org) ;
  float amp = cx * (0.035 + str * 0.34) * uClothH;
  transformed.z += wave * amp * (0.6 + 0.4 * cx);
  transformed.y += sin(position.x * 3.1 - uWT * (2.0 + str * 6.0) + org * 1.3) * amp * 0.28;
  transformed.y -= (1.0 - smoothstep(0.0, 0.5, str)) * cx * cx * uClothH * 0.55;
  transformed.x -= (1.0 - cos(wave * amp / max(uClothH, 0.05) * 0.8)) * position.x * 0.5;
}
`;

/** The light on a waving flag follows the folds: the normal leans with the slope of the wave (same wave as above). */
const CLOTH_NORMAL_BODY = `
vec3 objectNormal = vec3(normal);
{
  float cxn = clamp(position.x / uClothW, 0.0, 1.0);
  float orgn = modelMatrix[3][0] * 0.7 + modelMatrix[3][2] * 0.5;
  float strn = uWindV.z;
  float phn = position.x * 5.5 - uWT * (2.6 + strn * 9.0) + orgn;
  float ampn = cxn * (0.035 + strn * 0.34) * uClothH * (0.6 + 0.4 * cxn);
  objectNormal = normalize(vec3(-cos(phn) * 5.5 * ampn, 0.0, 1.0));
}
#ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
#endif
`;

function patchSway(mat: any, air: Air, key: string) {
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uWT = air.u.uTime;
    shader.uniforms.uWindV = air.u.uWind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + SWAY_VERT_HEAD)
      .replace("#include <project_vertex>", SWAY_VERT_BODY);
  };
}

export function makeClothMaterial(T: T3, air: Air, w: number, h: number, color = 0xffffff, key = "") {
  const m = new T.MeshLambertMaterial({ color, side: T.DoubleSide, vertexColors: true });
  m.userData.shared = true;   // one material per cloth size, shared by every flag of that size (the engine's disposeObj skips shared materials)
  m.customProgramCacheKey = () => "wbcloth" + key;
  m.onBeforeCompile = (shader: any) => {
    shader.uniforms.uWT = air.u.uTime;
    shader.uniforms.uWindV = air.u.uWind;
    shader.uniforms.uClothW = { value: w };
    shader.uniforms.uClothH = { value: h };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWT; uniform vec4 uWindV; uniform float uClothW; uniform float uClothH;")
      .replace("#include <beginnormal_vertex>", CLOTH_NORMAL_BODY)
      .replace("#include <begin_vertex>", CLOTH_VERT_BODY);
  };
  return m;
}

export function makeMats(T: T3, air: Air): MatKit {
  const mk = (m: any) => { m.userData.shared = true; return m; };
  const lit = mk(new T.MeshLambertMaterial({ vertexColors: true }));
  const litDS = mk(new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  const metal = mk(new T.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x555a60 }));
  const glow = mk(new T.MeshBasicMaterial({ vertexColors: true }));
  const lamp = mk(new T.MeshBasicMaterial({ vertexColors: true }));
  const sway = mk(new T.MeshLambertMaterial({ vertexColors: true }));
  const swayDS = mk(new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  patchSway(sway, air, "wbsway1");
  patchSway(swayDS, air, "wbsway2");
  const cloth = mk(new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  patchSway(cloth, air, "wbsway3"); // a gentler version of the same push; real flags use makeClothMaterial
  return { lit, litDS, metal, glow, lamp, sway, swayDS, cloth, list: () => [lit, litDS, metal, glow, lamp, sway, swayDS, cloth] };
}
