// @ts-nocheck
import type * as THREE_NS from "three";
import { MB } from "../../world/infinite/mb";

type T3 = typeof THREE_NS;

/** Materials for models made with MB (no wind here: every kind is a plain lit or unlit surface). */
export function makeKit(T: T3) {
  const lit = new T.MeshLambertMaterial({ vertexColors: true });
  const litFlat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const metal = new T.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: 0x666a70 });
  const basic = new T.MeshBasicMaterial({ vertexColors: true });
  const dsl = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  return { lit, litDS: dsl, metal, glow: basic, lamp: basic, sway: lit, swayDS: dsl, cloth: dsl, flat: litFlat, list: () => [lit, litFlat, metal, basic, dsl] };
}

const hex = (s: string | number) => (typeof s === "number" ? s : parseInt(String(s).replace("#", ""), 16));

/**
 * A rival's car, seen from behind and the side: carbon floor, monocoque with a long nose, sidepods, engine cover with a shark fin, halo,
 * helmet, front and rear wings with end plates, and four wheels that turn. Facing +z, standing on y = 0, about 5.3 m long.
 */
export function buildCar(T: T3, kit: any, color: string | number, accent = 0xf2f2f4) {
  const col = hex(color), DK = 0x14161a, CF = 0x1d2025, SV = 0xbfc4ca;
  const mb = new MB(T, 77);
  mb.ao = { y0: 0, h: 0.4, k: 0.15 }; mb.jitter = 0.02;
  mb.box(CF, 1.55, 0.07, 4.6, 0, 0.12, 0.05);                                                         // floor
  mb.box(DK, 0.9, 0.05, 0.3, 0, 0.08, -2.35);                                                          // diffuser
  mb.box(col, 0.58, 0.36, 2.1, 0, 0.42, 0.35);                                                         // monocoque
  mb.cyl(col, 0.06, 0.27, 1.9, 0, 0.34, 2.0, 4, Math.PI / 2, Math.PI / 4, 0);                           // nose cone
  mb.box(DK, 0.5, 0.2, 0.04, 0, 0.5, 2.96);
  for (const s of [-1, 1]) {
    mb.box(col, 0.46, 0.34, 1.55, s * 0.62, 0.36, -0.15);                                              // sidepod
    mb.box(DK, 0.4, 0.18, 0.05, s * 0.62, 0.46, 0.62);                                                 // inlet
    mb.box(CF, 0.1, 0.05, 1.5, s * 0.9, 0.17, -0.1);                                                   // floor edge
    mb.box(SV, 0.05, 0.05, 0.55, s * 0.55, 0.3, 1.1, 0, 0, 0, { mat: "metal" });                        // wishbone
    mb.box(SV, 0.05, 0.05, 0.9, s * 0.62, 0.3, -1.0, 0, 0, 0, { mat: "metal" });
  }
  mb.box(col, 0.42, 0.42, 1.55, 0, 0.62, -1.15);                                                       // engine cover
  mb.box(accent, 0.05, 0.3, 1.25, 0, 0.95, -1.35);                                                     // shark fin
  mb.box(DK, 0.22, 0.2, 0.3, 0, 0.88, -0.2);                                                           // airbox
  mb.box(0xf2f2f4, 0.27, 0.27, 0.27, 0, 0.74, 0.12);                                                   // helmet
  mb.box(0x10151c, 0.26, 0.09, 0.05, 0, 0.77, 0.26);                                                   // visor
  mb.beam(DK, 0.045, -0.2, 0.62, 0.55, 0, 0.9, 0.4); mb.beam(DK, 0.045, 0.2, 0.62, 0.55, 0, 0.9, 0.4);   // halo
  mb.beam(DK, 0.045, -0.2, 0.62, -0.1, 0, 0.9, 0.38); mb.beam(DK, 0.045, 0.2, 0.62, -0.1, 0, 0.9, 0.38);
  mb.box(CF, 2.0, 0.05, 0.5, 0, 0.12, 2.75);                                                           // front wing
  mb.box(col, 2.0, 0.04, 0.22, 0, 0.19, 2.72);
  for (const s of [-1, 1]) mb.box(accent, 0.04, 0.24, 0.55, s * 1.0, 0.2, 2.75);
  mb.box(DK, 1.28, 0.05, 0.46, 0, 0.98, -2.2);                                                         // rear wing
  mb.box(col, 1.28, 0.04, 0.26, 0, 1.12, -2.28);
  for (const s of [-1, 1]) mb.box(accent, 0.04, 0.5, 0.62, s * 0.66, 1.0, -2.22);
  mb.box(DK, 0.07, 0.6, 0.1, 0, 0.72, -2.1);
  const root = mb.build(kit, true);
  const group = new T.Group(); group.add(root);

  const wb = new MB(T, 78); wb.ao = { y0: -1, h: 1, k: 0 }; wb.jitter = 0.02;
  wb.cyl(0x101114, 0.37, 0.37, 0.36, 0, 0, 0, 10, 0, 0, Math.PI / 2);
  wb.cyl(col, 0.22, 0.22, 0.38, 0, 0, 0, 8, 0, 0, Math.PI / 2);
  wb.cyl(0xd8dce2, 0.12, 0.12, 0.4, 0, 0, 0, 6, 0, 0, Math.PI / 2, { mat: "metal" });
  const wheelProto = wb.build(kit, true);
  const wheels = [];
  for (const [x, y, z, s] of [[0.98, 0.37, 1.55, 1], [-0.98, 0.37, 1.55, 1], [1.02, 0.4, -1.4, 1.08], [-1.02, 0.4, -1.4, 1.08]]) {
    const w = new T.Group(); w.add(wheelProto.clone()); w.position.set(x, y, z); w.scale.setScalar(s); group.add(w); wheels.push(w);
  }
  const brake = new T.Mesh(new T.BoxGeometry(0.34, 0.1, 0.05), new T.MeshBasicMaterial({ color: 0x4a0808 }));
  brake.position.set(0, 0.5, -2.52); group.add(brake);
  group.traverse((o: any) => { if (o.isMesh) { o.castShadow = o !== brake; o.receiveShadow = false; } });
  return { group, wheels, brake, length: 5.3 };
}
