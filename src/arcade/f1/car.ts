// @ts-nocheck
import type * as THREE_NS from "three";
import { MB } from "../../world/infinite/mb";

type T3 = typeof THREE_NS;

/**
 * Materials for the models made with MB. The painted body, the carbon, the metal and the rubber are real PBR materials (they pick up the sky
 * reflections and the sun's highlights); the rest of the world keeps the cheap lit / flat ones.
 */
export function makeKit(T: T3) {
  const lit = new T.MeshLambertMaterial({ vertexColors: true });
  const litFlat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const dsl = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  const basic = new T.MeshBasicMaterial({ vertexColors: true });
  const paint = new T.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.2, specularIntensity: 0.45, envMapIntensity: 0.3 });
  const cf = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.4, envMapIntensity: 0.85 });
  const metal = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.95, roughness: 0.27, envMapIntensity: 1.25 });
  const rubber = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0, roughness: 0.93, envMapIntensity: 0.25 });
  return {
    lit, litDS: dsl, metal, glow: basic, lamp: basic, sway: lit, swayDS: dsl, cloth: dsl, flat: litFlat, paint, cf, rubber,
    list: () => [lit, litFlat, metal, basic, dsl, paint, cf, rubber],
  };
}

const hex = (s: string | number) => (typeof s === "number" ? s : parseInt(String(s).replace("#", ""), 16));

/** A thin bar between two points (a wishbone, a pushrod, an arm): one shared unit box, stretched and turned every time `set` is called. */
let linkGeo: any = null;
export function makeLink(T: T3, mat: any, r: number) {
  if (!linkGeo) linkGeo = new T.BoxGeometry(1, 1, 1);
  const mesh = new T.Mesh(linkGeo, mat);
  const d = new T.Vector3(), q = new T.Quaternion(), z = new T.Vector3(0, 0, 1);
  mesh.castShadow = false; mesh.frustumCulled = false; mesh.userData.noShadowCast = true;
  return {
    mesh,
    set(p1: any, p2: any) {
      d.subVectors(p2, p1); const len = d.length() || 1e-4;
      mesh.position.copy(p1).addScaledVector(d, 0.5);
      q.setFromUnitVectors(z, d.divideScalar(len)); mesh.quaternion.copy(q);
      mesh.scale.set(r, r, len);
    },
  };
}

export const F1_WHEELS = [
  { x: 0.98, y: 0.37, z: 1.55, s: 1.0 }, { x: -0.98, y: 0.37, z: 1.55, s: 1.0 },
  { x: 1.02, y: 0.40, z: -1.4, s: 1.08 }, { x: -1.02, y: 0.40, z: -1.4, s: 1.08 },
];
/** Where the driver's eyes are in the car's own frame (x right, y up, z forward, origin on the ground in the middle of the wheelbase). */
export const EYE_POS = { x: 0, y: 0.8, z: 0.08 };

export interface F1Car {
  group: any;
  parts: Record<string, any>;
  /** the four spinning wheel groups (FL, FR, RL, RR) */
  wheels: any[];
  brake: any;
  length: number;
  /** the wishbone / pushrod bars of each wheel (FL, FR, RL, RR) */
  links: any[][];
  /** pushes the wheels up / down by the spring compression (m, + = compressed) and turns the front ones; moves the wishbones with them */
  setSuspension(comp: number[], steer: number): void;
}

/**
 * A modern single-seater, facing +z, standing on y = 0, about 5.3 m long: carbon floor, monocoque with an open cockpit and a padded rim, long nose,
 * sidepods, engine cover with a shark fin, halo, helmet, front and rear wings with end plates, mirrors, and four wheels that turn, steer and move
 * on their wishbones and pushrods. Every big piece is its own mesh, so a crash can tear it off. The same model is the rivals' car, the player's car
 * in the replays and (seen from the driver's seat) the cockpit.
 */
/** 3 x 5 pixel digits, each pixel a small box: the race number on the nose stays in the blocky style. */
const DIGITS: Record<number, string> = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111",
};
/** Lays a number flat on a surface at height y, centred on z0, reading from the driver's seat (the car faces +z). */
function blockDigit(m: MB, num: number, color: number, y: number, z0: number, px: number) {
  const s = String(num), w = s.length * 4 - 1;
  for (let c = 0; c < s.length; c++) {
    const rows = DIGITS[+s[c]!] || DIGITS[0]!;
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) {
      if (rows[r * 3 + k] !== "1") continue;
      const col = c * 4 + k;
      m.box(color, px * 0.92, 0.008, px * 0.92, -(col - (w - 1) / 2) * px, y, z0 + (2 - r) * px, 0, 0, 0, { jit: 0, noAO: true });
    }
  }
}

export function buildF1Car(T: T3, kit: any, color: string | number, accent = 0xf2f2f4, opts: { helmet?: number; number?: number } = {}): F1Car {
  const col = hex(color), DK = 0x14161a, CF = 0x1d2025, CF2 = 0x2a2e35, SV = 0xbfc4ca, WH = 0xf2f2f4;
  const group = new T.Group(), parts: Record<string, any> = {};
  let seed = 10;
  const mk = () => { const m = new MB(T, ++seed); m.ao = { y0: 0, h: 0.45, k: 0.14 }; m.jitter = 0.015; return m; };
  const part = (name: string, m: MB, mat: string, shadows = true) => { const root = m.build({ ...kit, lit: kit[mat] }, shadows); root.name = name; group.add(root); parts[name] = root; return root; };
  const taper = (m: MB, c: number, r0: number, r1: number, z0: number, z1: number, y: number) => m.cyl(c, r1, r0, z1 - z0, 0, y, (z0 + z1) / 2, 4, Math.PI / 2, Math.PI / 4, 0);

  let m = mk();                                                                                 // floor and diffuser
  m.box(CF, 1.55, 0.07, 4.6, 0, 0.12, 0.05); m.box(DK, 0.9, 0.05, 0.3, 0, 0.08, -2.35);
  for (const s of [-1, 1]) { m.box(CF, 0.1, 0.05, 1.5, s * 0.9, 0.17, -0.1); m.box(CF2, 0.04, 0.12, 0.7, s * 0.8, 0.22, 0.5); }
  part("floor", m, "cf");

  m = mk();                                                                                     // monocoque: scuttle, open cockpit, rear bulkhead
  m.box(col, 0.58, 0.34, 1.05, 0, 0.40, 0.98);
  for (const s of [-1, 1]) m.box(col, 0.07, 0.36, 1.15, s * 0.255, 0.42, 0.0);
  m.box(col, 0.58, 0.3, 0.18, 0, 0.4, -0.62);
  m.box(DK, 0.44, 0.05, 1.1, 0, 0.215, 0.0);
  m.box(col, 0.44, 0.05, 0.5, 0, 0.625, 0.78, -0.1, 0, 0);                        // the cowl in front of the wheel
  blockDigit(m, opts.number ?? 1, WH, 0.575, 1.3, 0.034);                          // 5.63.0: the race number on the scuttle, made of little blocks
  for (const s of [-1, 1]) m.box(accent, 0.035, 0.008, 0.95, s * 0.2, 0.574, 1.0, 0, 0, 0, { jit: 0, noAO: true });
  part("tub", m, "paint");

  m = mk();                                                                                     // padded rim, scuttle top, dash
  for (const s of [-1, 1]) { m.box(CF, 0.1, 0.035, 1.14, s * 0.255, 0.615, 0.0); m.box(accent, 0.022, 0.012, 0.6, s * 0.285, 0.636, 0.12, 0, 0, 0, { jit: 0 }); }
  for (const s of [-1, 1]) m.box(accent, 0.02, 0.012, 0.3, s * 0.2, 0.655, 0.8, -0.1, 0, 0, { jit: 0 });
  part("rim", m, "cf");

  m = mk(); taper(m, col, 0.06, 0.27, 1.05, 2.95, 0.34); m.box(DK, 0.5, 0.2, 0.04, 0, 0.5, 2.96); m.box(CF, 0.16, 0.02, 0.5, 0, 0.5, 2.2);
  // 5.63.0 detail: camera pods either side of the nose and the pitot tube at its tip
  for (const s of [-1, 1]) { m.box(DK, 0.06, 0.06, 0.16, s * 0.15, 0.44, 1.95); m.box(0x101114, 0.03, 0.03, 0.02, s * 0.15, 0.44, 2.035, 0, 0, 0, { jit: 0 }); }
  m.box(SV, 0.012, 0.012, 0.3, 0, 0.36, 3.08, 0, 0, 0, { jit: 0 });
  part("nose", m, "paint");

  m = mk();                                                                                     // front wing (carbon + paint + end plates)
  m.box(CF, 2.0, 0.05, 0.5, 0, 0.12, 2.75); m.box(col, 2.0, 0.04, 0.22, 0, 0.19, 2.72); m.box(CF, 1.5, 0.03, 0.2, 0, 0.26, 2.62);
  for (const s of [-1, 1]) {
    m.box(accent, 0.04, 0.24, 0.55, s * 1.0, 0.2, 2.75);
    // 5.63.0 detail: stepped upper flaps that rise toward the end plates, a canard and the little footplate of each end plate
    for (let k = 0; k < 3; k++) m.box(k % 2 ? col : CF, 0.32, 0.025, 0.14, s * (0.52 + k * 0.16), 0.3 + k * 0.035, 2.56 + k * 0.04, -0.25, 0, 0);
    m.box(CF, 0.12, 0.02, 0.18, s * 1.08, 0.3, 2.7); m.box(DK, 0.06, 0.03, 0.62, s * 0.98, 0.1, 2.75);
  }
  part("frontWing", m, "cf");

  m = mk();                                                                                     // 5.63.0 detail: bargeboards and the floor edge vanes beside the sidepods
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) m.box(k % 2 ? CF2 : CF, 0.02, 0.22 - k * 0.03, 0.34, s * (0.42 + k * 0.05), 0.3, 0.95 - k * 0.1, 0, s * 0.18, 0);
    for (let k = 0; k < 5; k++) m.box(CF2, 0.015, 0.07, 0.22, s * 0.79, 0.19, -0.6 - k * 0.28, 0, s * 0.25, 0);
  }
  part("aero", m, "cf");

  m = mk();                                                                                     // sidepods
  for (const s of [-1, 1]) { m.box(col, 0.46, 0.34, 1.55, s * 0.62, 0.36, -0.15); m.box(DK, 0.4, 0.18, 0.05, s * 0.62, 0.46, 0.62); m.box(accent, 0.02, 0.06, 0.9, s * 0.855, 0.36, -0.2, 0, 0, 0, { jit: 0 }); }
  part("pods", m, "paint");

  m = mk();                                                                                     // engine cover, shark fin, airbox
  m.box(col, 0.42, 0.42, 1.55, 0, 0.62, -1.15); m.box(accent, 0.05, 0.3, 1.25, 0, 0.95, -1.35); m.box(DK, 0.22, 0.2, 0.3, 0, 0.88, -0.2);
  part("engine", m, "paint");

  m = mk();                                                                                     // rear wing
  m.box(DK, 1.28, 0.05, 0.46, 0, 0.98, -2.2); m.box(col, 1.28, 0.04, 0.26, 0, 1.12, -2.28); m.box(DK, 0.07, 0.6, 0.1, 0, 0.72, -2.1);
  for (const s of [-1, 1]) {
    m.box(accent, 0.04, 0.5, 0.62, s * 0.66, 1.0, -2.22);
    for (let k = 0; k < 4; k++) m.box(DK, 0.045, 0.02, 0.5, s * 0.66, 0.8 + k * 0.09, -2.22, 0, 0, 0, { jit: 0 });   // 5.63.0: louvres on the end plates
  }
  m.box(DK, 1.0, 0.04, 0.22, 0, 0.62, -2.3, 0.3, 0, 0);                                        // beam wing under the main plane
  m.box(0xff2a2a, 0.12, 0.05, 0.03, 0, 0.62, -2.42, 0, 0, 0, { mat: "lamp", jit: 0 });          // the rain light on the beam
  part("rearWing", m, "cf");

  m = mk();                                                                                     // halo
  const halo = (a: number[], b: number[]) => m.pole(CF, 0.0175, a[0], a[1], a[2], b[0], b[1], b[2], 8);
  halo([0, 0.63, 1.0], [0, 0.95, 0.72]);
  for (const s of [-1, 1]) { halo([0, 0.95, 0.72], [s * 0.2, 1.02, 0.28]); halo([s * 0.2, 1.02, 0.28], [s * 0.31, 0.64, -0.34]); }
  part("halo", m, "cf");

  m = mk();                                                                                     // helmet (hidden when the camera is the driver's eyes)
  m.box(opts.helmet ?? WH, 0.27, 0.27, 0.27, 0, 0.74, 0.12); m.box(0x10151c, 0.26, 0.09, 0.05, 0, 0.77, 0.26); m.box(accent, 0.28, 0.04, 0.28, 0, 0.8, 0.12);
  m.box(col, 0.36, 0.2, 0.2, 0, 0.55, -0.02);
  part("helmet", m, "paint");

  m = mk();                                                                                     // mirrors
  for (const s of [-1, 1]) { m.box(CF, 0.26, 0.04, 0.05, s * 0.38, 0.62, 0.64); m.box(CF, 0.17, 0.1, 0.04, s * 0.55, 0.66, 0.66); m.box(accent, 0.17, 0.012, 0.045, s * 0.55, 0.715, 0.66); }
  part("mirrors", m, "cf");

  // wheels: rubber tyre with a coloured sidewall band, silver rim, dark centre
  const wheelBuild = () => {
    const tm = new MB(T, 90); tm.ao = { y0: -1, h: 1, k: 0 }; tm.jitter = 0.01;
    tm.cyl(0x101114, 0.37, 0.37, 0.36, 0, 0, 0, 12, 0, 0, Math.PI / 2);
    tm.cyl(accent, 0.31, 0.31, 0.37, 0, 0, 0, 12, 0, 0, Math.PI / 2, { jit: 0 });
    tm.cyl(0x101114, 0.29, 0.29, 0.38, 0, 0, 0, 12, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; tm.box(0xf2f2f4, 0.012, 0.1, 0.05, sx * 0.184, Math.cos(a) * 0.335, Math.sin(a) * 0.335, -a, 0, 0, { jit: 0 }); }   // marks on the sidewall, so the spin can be seen
    const rm = new MB(T, 91); rm.ao = { y0: -1, h: 1, k: 0 }; rm.jitter = 0.01;
    rm.cyl(0xd8dce2, 0.19, 0.19, 0.4, 0, 0, 0, 10, 0, 0, Math.PI / 2, { mat: "metal" });
    rm.cyl(0x202228, 0.07, 0.07, 0.42, 0, 0, 0, 6, 0, 0, Math.PI / 2, { mat: "metal" });
    const g = new T.Group(); g.add(tm.build({ ...kit, lit: kit.rubber }, true)); g.add(rm.build(kit, true));
    return g;
  };
  const proto = wheelBuild();
  const wheelRoots: any[] = [], wheels: any[] = [];
  F1_WHEELS.forEach((w) => {
    const root = new T.Group(); root.position.set(w.x, w.y, w.z); root.scale.setScalar(w.s);
    const spin = proto.clone(true); root.add(spin); group.add(root); wheelRoots.push(root); wheels.push(spin);
  });
  parts.wheelRoots = wheelRoots;

  // wishbones, pushrods and tie rods (visible beside the nose); every end is recomputed from the wheel's position
  const rodMat = kit.metal, linkMat = kit.cf;
  const inb = [
    { upF: [0.22, 0.5, 1.7], upR: [0.22, 0.5, 1.32], loF: [0.24, 0.2, 1.72], loR: [0.24, 0.2, 1.28], rocker: [0.2, 0.62, 1.5], rack: [0.2, 0.3, 1.38] },
    { upF: [0.22, 0.5, -1.2], upR: [0.22, 0.5, -1.62], loF: [0.24, 0.2, -1.18], loR: [0.24, 0.2, -1.64], rocker: [0.2, 0.6, -1.4], rack: [0.2, 0.3, -1.5] },
  ];
  const links: any[] = [];
  F1_WHEELS.forEach((w, i) => {
    const set = [makeLink(T, linkMat, 0.026), makeLink(T, linkMat, 0.026), makeLink(T, linkMat, 0.03), makeLink(T, linkMat, 0.03), makeLink(T, rodMat, 0.034), makeLink(T, rodMat, 0.022)];
    set.forEach((l) => group.add(l.mesh)); links.push(set);
  });
  const v = (a: number[], sx: number) => new T.Vector3(a[0]! * sx, a[1]!, a[2]!);
  const A = new T.Vector3(), B = new T.Vector3();
  function setSuspension(comp: number[], steer: number) {
    for (let i = 0; i < 4; i++) {
      const w = F1_WHEELS[i]!, sx = Math.sign(w.x), front = i < 2, ib = front ? inb[0]! : inb[1]!, root = wheelRoots[i];
      const up = comp[i] || 0;
      root.position.set(w.x, w.y + up, w.z);
      root.rotation.y = front ? -steer * 0.32 : 0;                          // the car faces +z, so its right is -x: steering right turns the wheels toward -x
      const hx = w.x - sx * (w.s * 0.2), hy = w.y + up, hz = w.z;           // the upright, just inside the tyre
      const L = links[i]!;
      L[0].set(v(ib.upF, sx), A.set(hx, hy + 0.2, hz + 0.06));
      L[1].set(v(ib.upR, sx), A.set(hx, hy + 0.2, hz - 0.06));
      L[2].set(v(ib.loF, sx), A.set(hx, hy - 0.17, hz + 0.06));
      L[3].set(v(ib.loR, sx), A.set(hx, hy - 0.17, hz - 0.06));
      L[4].set(v(ib.rocker, sx), B.set(hx, hy + 0.19, hz + 0.03));
      L[5].set(v(ib.rack, sx), A.set(hx, hy - 0.02, hz - 0.1 * w.s));
    }
  }
  setSuspension([0, 0, 0, 0], 0);

  const brake = new T.Mesh(new T.BoxGeometry(0.34, 0.1, 0.05), new T.MeshBasicMaterial({ color: 0x4a0808 }));
  brake.position.set(0, 0.5, -2.52); group.add(brake);
  group.traverse((o: any) => { if (o.isMesh) { o.castShadow = o !== brake && !o.userData.noShadowCast; o.receiveShadow = false; } });
  return { group, parts, wheels, brake, length: 5.3, setSuspension, links };
}

/** The earlier name (rivals). */
export const buildCar = buildF1Car;
