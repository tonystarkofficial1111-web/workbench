// @ts-nocheck
import { MB } from "../../world/infinite/mb";

/**
 * Engine parts and tools for the Take Your Time clips, blocky but with the real pieces: a piston with three ring grooves, wrist pin and
 * connecting rod; three piston rings; ring-expander pliers that open; a ring compressor band; an inline-four block with liners, a crankshaft
 * that turns and a rod cap; a cylinder head with cam journals, a camshaft with lobes, cam caps, a head gasket; a timing chain on its sprockets;
 * a torque wrench, a hammer, an oil can; an engine hoist; and a project car with an open engine bay and a bonnet on struts.
 * Every builder returns a group (and the sub-parts the clips move). Units: metres.
 */
const ALU = 0xc9ced6, STEEL = 0x8f959d, DARK = 0x2a2d33, IRON = 0x5a5f66, BLACK = 0x15171b;

function build(T: any, kit: any, fn: (m: MB) => void, metal = true, seed = 1) {
  const mb = new MB(T, seed); mb.jitter = 0.015; mb.ao = { y0: -9, h: 1, k: 0 };
  fn(mb);
  return mb.build(metal ? { ...kit, lit: kit.metal } : kit, true);
}

export function piston(T: any, kit: any) {
  const g = new T.Group();
  const crown = build(T, kit, (m) => {
    m.cyl(ALU, 0.043, 0.043, 0.07, 0, 0.035, 0, 16);                      // body
    m.cyl(0xb8bec6, 0.0435, 0.0435, 0.006, 0, 0.068, 0, 16);              // crown edge
    m.cyl(0x9aa0a8, 0.03, 0.03, 0.004, 0, 0.0715, 0, 14);                  // dish
    for (const y of [0.055, 0.045, 0.034]) m.cyl(0x3a3e45, 0.0438, 0.0438, 0.004, 0, y, 0, 16);   // ring grooves
    m.cyl(STEEL, 0.011, 0.011, 0.088, 0, 0.012, 0, 10, 0, 0, Math.PI / 2);  // wrist pin
  }, true, 11);
  const rod = build(T, kit, (m) => {
    m.box(STEEL, 0.02, 0.12, 0.012, 0, -0.05, 0);                          // I-beam
    m.box(STEEL, 0.008, 0.12, 0.022, 0, -0.05, 0);
    m.cyl(STEEL, 0.016, 0.016, 0.024, 0, 0.012, 0, 10, 0, 0, Math.PI / 2);    // small end
    m.cyl(STEEL, 0.028, 0.028, 0.024, 0, -0.12, 0, 12, 0, 0, Math.PI / 2);    // big end
  }, true, 12);
  g.add(crown); g.add(rod);
  return { group: g, crown, rod };
}

/** a piston ring (open at one point so its gap can be seen and turned): radius r, coloured */
export function ring(T: any, kit: any, color: number) {
  const g = build(T, kit, (m) => {
    const N = 22;
    for (let k = 0; k < N - 1; k++) { const a = (k / N) * Math.PI * 2 + 0.12; m.box(color, 0.0055, 0.003, 0.0135, Math.cos(a) * 0.0435, 0, Math.sin(a) * 0.0435, 0, -a, 0, { jit: 0 }); }
  }, true, 13);
  return g;
}

/** ring-expander pliers: two handles that open their jaws */
export function pliers(T: any, kit: any) {
  const g = new T.Group(), a = new T.Group(), b = new T.Group();
  a.add(build(T, kit, (m) => { m.box(0xd2262d, 0.016, 0.012, 0.16, 0.006, 0, -0.08); m.box(STEEL, 0.01, 0.01, 0.06, 0.004, 0, 0.03); m.box(STEEL, 0.006, 0.014, 0.01, 0.006, -0.006, 0.06); }, false, 14));
  b.add(build(T, kit, (m) => { m.box(0xd2262d, 0.016, 0.012, 0.16, -0.006, 0, -0.08); m.box(STEEL, 0.01, 0.01, 0.06, -0.004, 0, 0.03); m.box(STEEL, 0.006, 0.014, 0.01, -0.006, -0.006, 0.06); }, false, 15));
  g.add(a, b);
  return { group: g, open(k: number) { a.rotation.y = -k * 0.25; b.rotation.y = k * 0.25; } };
}

/** ring compressor: a band that tightens round the piston */
export function compressor(T: any, kit: any) {
  return build(T, kit, (m) => {
    m.cyl(0xc9a227, 0.05, 0.05, 0.06, 0, 0, 0, 16);
    m.box(DARK, 0.03, 0.05, 0.03, 0.055, 0, 0); m.box(STEEL, 0.01, 0.01, 0.07, 0.07, 0.01, 0.03);
  }, true, 16);
}

/** inline-four block on its stand: four bores along x, crankshaft underneath, the front of bore 1 cut away so the piston can be seen going in */
export function block(T: any, kit: any) {
  const g = new T.Group();
  const body = build(T, kit, (m) => {
    // cast iron block; deck at y = 0.32, bores at x = -0.135, -0.045, 0.045, 0.135
    m.box(IRON, 0.42, 0.06, 0.24, 0, 0.29, 0);                               // deck
    // side walls: the back one whole, the front one cut away (red cut edges, like a show engine) so the crank and the rods can be seen
    m.box(IRON, 0.42, 0.3, 0.04, 0, 0.14, 0.1);
    m.box(IRON, 0.42, 0.06, 0.04, 0, 0.02, -0.1); m.box(0xd2262d, 0.42, 0.01, 0.042, 0, 0.055, -0.1, 0, 0, 0, { jit: 0 }); m.box(0xd2262d, 0.42, 0.01, 0.042, 0, 0.255, -0.1, 0, 0, 0, { jit: 0 });
    m.box(IRON, 0.42, 0.04, 0.04, 0, 0.275, -0.1);
    m.box(IRON, 0.04, 0.3, 0.24, -0.23, 0.14, 0); m.box(IRON, 0.04, 0.3, 0.24, 0.23, 0.14, 0);
    for (const x of [-0.135, -0.045, 0.045, 0.135]) { m.cyl(0x9aa0a8, 0.0445, 0.0445, 0.062, x, 0.29, 0, 18); m.cyl(0x1a1c20, 0.042, 0.042, 0.064, x, 0.29, 0, 18); }
    for (const x of [-0.18, -0.09, 0, 0.09, 0.18]) for (const z of [-0.075, 0.075]) m.cyl(0x2a2c30, 0.006, 0.006, 0.065, x, 0.29, z, 6);   // head bolt holes
    for (const x of [-0.18, -0.09, 0, 0.09, 0.18]) m.box(IRON, 0.03, 0.06, 0.2, x, -0.02, 0);   // main bearing webs
    for (const s of [-1, 1]) m.box(0xb8423a, 0.42, 0.012, 0.012, 0, 0.318, s * 0.114, 0, 0, 0, { jit: 0 });   // red engine paint along the deck edges
  }, true, 17);
  g.add(body);
  // the crankshaft: main journals, throws and counterweights; it turns
  const crank = new T.Group(); crank.position.set(0, -0.04, 0);
  crank.add(build(T, kit, (m) => {
    m.cyl(STEEL, 0.022, 0.022, 0.5, 0, 0, 0, 10, 0, 0, Math.PI / 2);
    for (const [x, ph] of [[-0.135, 0], [-0.045, Math.PI], [0.045, Math.PI], [0.135, 0]] as Array<[number, number]>) {
      const cy = Math.cos(ph) * 0.04, cz = Math.sin(ph) * 0.04;
      m.box(IRON, 0.012, 0.11, 0.05, x - 0.022, 0, 0, ph, 0, 0); m.box(IRON, 0.012, 0.11, 0.05, x + 0.022, 0, 0, ph, 0, 0);
      m.cyl(0xb8bec6, 0.02, 0.02, 0.034, x, cy, cz, 10, 0, 0, Math.PI / 2);
    }
    m.cyl(DARK, 0.06, 0.06, 0.02, 0.26, 0, 0, 16, 0, 0, Math.PI / 2);         // pulley
  }, true, 18));
  g.add(crank);
  // engine stand: post and arm on castors
  const stand = build(T, kit, (m) => {
    m.box(0xd2262d, 0.06, 0.6, 0.06, -0.42, -0.36, 0); m.box(0xd2262d, 0.18, 0.04, 0.06, -0.33, 0.0, 0);
    m.box(0xd2262d, 0.7, 0.05, 0.06, -0.42, -0.66, 0); m.box(0xd2262d, 0.06, 0.05, 0.6, -0.42, -0.66, 0);
    for (const [x, z] of [[-0.75, 0], [-0.1, 0], [-0.42, 0.28], [-0.42, -0.28]]) m.cyl(BLACK, 0.035, 0.035, 0.03, x, -0.7, z, 8, 0, 0, Math.PI / 2);
    m.box(DARK, 0.04, 0.22, 0.22, -0.25, 0.1, 0);
  }, false, 19);
  g.add(stand);
  return { group: g, crank, stand, bore: (k: number) => [[-0.135, -0.045, 0.045, 0.135][k]!, 0.32, 0] };
}

/** cylinder head with cam journals (open saddles), the camshaft and caps are separate */
export function head(T: any, kit: any) {
  const g = build(T, kit, (m) => {
    m.box(ALU, 0.42, 0.09, 0.24, 0, 0.045, 0);
    for (const x of [-0.18, -0.09, 0, 0.09, 0.18]) for (const z of [-0.075, 0.075]) m.cyl(STEEL, 0.009, 0.009, 0.02, x, 0.1, z, 6);   // bolt heads
    for (const x of [-0.17, -0.085, 0, 0.085, 0.17]) { m.box(ALU, 0.03, 0.03, 0.05, x, 0.1, 0.03); m.cyl(0x9aa0a8, 0.012, 0.012, 0.032, x, 0.115, 0.03, 8, 0, 0, Math.PI / 2); }   // journals
    for (let k = 0; k < 8; k++) m.box(0x9aa0a8, 0.012, 0.03, 0.012, -0.16 + k * 0.045, 0.1, -0.05);   // valve springs (exhaust side)
    for (let k = 0; k < 4; k++) m.box(DARK, 0.05, 0.04, 0.03, -0.135 + k * 0.09, 0.03, -0.13);   // exhaust ports
  }, true, 20);
  return g;
}
export function camshaft(T: any, kit: any) {
  return build(T, kit, (m) => {
    m.cyl(STEEL, 0.011, 0.011, 0.44, 0, 0, 0, 8, 0, 0, Math.PI / 2);
    for (let k = 0; k < 8; k++) m.box(0xb8bec6, 0.012, 0.03, 0.022, -0.16 + k * 0.045, 0.006, 0, (k * 1.3) % 6.28, 0, 0);   // lobes
    m.cyl(DARK, 0.04, 0.04, 0.012, 0.23, 0, 0, 14, 0, 0, Math.PI / 2);            // sprocket
  }, true, 21);
}
export function camCap(T: any, kit: any) { return build(T, kit, (m) => { m.box(ALU, 0.03, 0.022, 0.05, 0, 0, 0); m.cyl(STEEL, 0.005, 0.005, 0.03, 0, 0.012, 0.016, 6); m.cyl(STEEL, 0.005, 0.005, 0.03, 0, 0.012, -0.016, 6); }, true, 22); }
export function gasket(T: any, kit: any) {
  return build(T, kit, (m) => { m.box(0x8a8f96, 0.42, 0.003, 0.24, 0, 0, 0); for (const x of [-0.135, -0.045, 0.045, 0.135]) m.cyl(0x1a1c20, 0.042, 0.042, 0.004, x, 0, 0, 16); }, true, 23);
}
export function valveCover(T: any, kit: any) {
  return build(T, kit, (m) => { m.box(0xd2262d, 0.42, 0.05, 0.22, 0, 0.025, 0); m.box(0xf2f2f4, 0.18, 0.006, 0.05, 0, 0.052, 0, 0, 0, 0, { jit: 0 }); for (let k = 0; k < 4; k++) m.box(BLACK, 0.02, 0.02, 0.03, -0.135 + k * 0.09, 0.055, -0.04); }, false, 24);
}
/** timing chain: links on a loop between the crank and cam sprockets; `advance(d)` moves the links along */
export function chain(T: any, kit: any, a: [number, number], b: [number, number], ra = 0.06, rb = 0.04) {
  const N = 46, geo = new T.BoxGeometry(0.012, 0.008, 0.016), mat = new T.MeshStandardMaterial({ color: 0x6a7078, metalness: 0.9, roughness: 0.35 });
  const im = new T.InstancedMesh(geo, mat, N); im.frustumCulled = false;
  const pts: number[][] = [];
  // a belt path: arc round a, straight to b, arc round b, straight back (in the y-z plane at x = 0)
  const dy = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dy, dz), ux = dy / L, uz = dz / L, nx = -uz, nz = ux;
  const seg = (p: number[], q: number[], k: number) => { for (let i = 0; i < k; i++) pts.push([p[0]! + (q[0]! - p[0]!) * i / k, p[1]! + (q[1]! - p[1]!) * i / k]); };
  const arc = (c: [number, number], r: number, a0: number, a1: number, k: number) => { for (let i = 0; i < k; i++) { const t = a0 + (a1 - a0) * i / k; pts.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); } };
  const base = Math.atan2(nz, nx);
  arc(a, ra, base, base + Math.PI, 14); seg([a[0] - nx * ra, a[1] - nz * ra], [b[0] - nx * rb, b[1] - nz * rb], 10); arc(b, rb, base + Math.PI, base + Math.PI * 2, 10); seg([b[0] + nx * rb, b[1] + nz * rb], [a[0] + nx * ra, a[1] + nz * ra], 10);
  const dummy = new T.Object3D();
  let off = 0;
  const place = () => {
    for (let i = 0; i < N; i++) {
      const f = ((i / N) * pts.length + off) % pts.length, k = Math.floor(f), p = pts[k]!, q = pts[(k + 1) % pts.length]!, t = f - k;
      dummy.position.set(0, p[0]! + (q[0]! - p[0]!) * t, p[1]! + (q[1]! - p[1]!) * t); dummy.rotation.set(Math.atan2(q[1]! - p[1]!, q[0]! - p[0]!), 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  place();
  return { mesh: im, advance(d: number) { off = (off + d * pts.length + pts.length * 100) % pts.length; place(); }, dispose() { geo.dispose(); mat.dispose(); } };
}

export function torqueWrench(T: any, kit: any) {
  return build(T, kit, (m) => { m.box(STEEL, 0.018, 0.018, 0.34, 0, 0, -0.17); m.box(0xd2262d, 0.026, 0.026, 0.1, 0, 0, -0.3); m.cyl(DARK, 0.012, 0.012, 0.04, 0, -0.02, 0, 8); m.box(0xe0b020, 0.02, 0.004, 0.04, 0, 0.012, -0.12, 0, 0, 0, { jit: 0 }); }, true, 25);
}
export function hammer(T: any, kit: any) {
  return build(T, kit, (m) => { m.box(0x8a5a2c, 0.02, 0.02, 0.26, 0, 0, -0.1); m.box(0x2a2d33, 0.03, 0.035, 0.1, 0, 0, 0.04, 0, Math.PI / 2, 0); }, false, 26);
}
export function oilCan(T: any, kit: any) {
  return build(T, kit, (m) => { m.cyl(0x2a7a3a, 0.035, 0.035, 0.06, 0, 0, 0, 10); m.cyl(0xc9ced6, 0.004, 0.012, 0.12, 0, 0.06, 0.05, 6, 0.9, 0, 0); }, false, 27);
}

/** a whole engine for the hoist: block + head + valve cover + intake + exhaust manifold + alternator + pulleys */
export function engineAssembly(T: any, kit: any) {
  return build(T, kit, (m) => {
    m.box(IRON, 0.44, 0.34, 0.26, 0, 0.17, 0); m.box(ALU, 0.44, 0.1, 0.26, 0, 0.39, 0); m.box(0xd2262d, 0.42, 0.06, 0.22, 0, 0.47, 0);
    m.box(DARK, 0.4, 0.06, 0.08, 0, 0.36, 0.17); for (let k = 0; k < 4; k++) m.box(DARK, 0.04, 0.12, 0.04, -0.135 + k * 0.09, 0.4, 0.2, 0.4, 0, 0);   // intake runners
    for (let k = 0; k < 4; k++) m.box(0x8a5a3a, 0.04, 0.05, 0.12, -0.135 + k * 0.09, 0.3, -0.18, 0.3, 0, 0);                                       // exhaust manifold
    m.cyl(DARK, 0.06, 0.06, 0.02, 0.24, 0.1, 0.03, 14, 0, 0, Math.PI / 2); m.cyl(0x9aa0a8, 0.04, 0.04, 0.06, 0.2, 0.3, 0.12, 10, 0, 0, Math.PI / 2);
    m.box(BLACK, 0.3, 0.08, 0.22, -0.1, -0.03, 0);   // oil pan
    m.box(0x3a3e45, 0.24, 0.2, 0.06, -0.31, 0.15, 0); // bell housing
    for (const x of [-0.18, 0.18]) m.box(0xe0b020, 0.03, 0.03, 0.03, x, 0.5, 0, 0, 0, 0, { jit: 0 });   // lifting eyes
  }, true, 28);
}

/** workshop engine hoist: base legs on castors, mast, boom with a hydraulic ram, chain and hook. `set(boom 0..1, swing)` */
export function hoist(T: any, kit: any) {
  const g = new T.Group(), boom = new T.Group(), hook = new T.Group();
  g.add(build(T, kit, (m) => {
    for (const s of [-1, 1]) { m.box(0xd2262d, 0.08, 0.08, 1.3, s * 0.35, 0.08, 0.45); m.cyl(BLACK, 0.05, 0.05, 0.04, s * 0.35, 0.05, 1.05, 8, 0, 0, Math.PI / 2); }
    m.box(0xd2262d, 0.8, 0.08, 0.08, 0, 0.08, -0.2); m.box(0xd2262d, 0.1, 1.4, 0.1, 0, 0.75, -0.15); m.box(0xd2262d, 0.14, 0.1, 0.14, 0, 1.45, -0.15);
    m.cyl(STEEL, 0.03, 0.03, 0.6, 0, 0.9, 0.05, 8, 0.35, 0, 0); m.box(DARK, 0.1, 0.12, 0.1, 0, 0.6, 0.0);   // ram and pump
    m.box(DARK, 0.03, 0.4, 0.03, 0.07, 0.75, 0.08, 0.6, 0, 0);
  }, false, 29));
  boom.position.set(0, 1.45, -0.15);
  boom.add(build(T, kit, (m) => { m.box(0xd2262d, 0.1, 0.1, 1.3, 0, 0, 0.6); m.box(DARK, 0.06, 0.12, 0.06, 0, -0.08, 1.22); }, false, 30));
  hook.position.set(0, -0.12, 1.22); boom.add(hook);
  hook.add(build(T, kit, (m) => { for (let k = 0; k < 6; k++) m.box(0x9aa0a8, 0.02, 0.05, 0.03, 0, -0.03 - k * 0.05, 0, 0, k % 2 ? Math.PI / 2 : 0, 0); m.box(DARK, 0.06, 0.06, 0.03, 0, -0.33, 0); }, true, 31));
  g.add(boom);
  return { group: g, boom, hook, set(k: number) { boom.rotation.x = -0.15 - k * 0.35; } };
}

/** the project car: a hatchback shell on axle stands with the engine bay open and the bonnet up on its strut. Faces +z. */
export function projectCar(T: any, kit: any, color = 0x2e8a4e) {
  const g = new T.Group();
  const shell = build(T, kit, (m) => {
    m.box(DARK, 1.6, 0.12, 3.8, 0, 0.36, 0);                                   // floor pan
    for (const s of [-1, 1]) { m.box(color, 0.06, 0.5, 1.9, s * 0.84, 0.66, -0.55); m.box(color, 0.06, 0.32, 1.2, s * 0.84, 0.58, 1.35); m.box(color, 0.1, 0.2, 1.0, s * 0.84, 0.82, 1.35); }   // sides and front wings
    m.box(color, 1.62, 0.5, 0.3, 0, 0.66, -1.75); m.box(color, 1.5, 0.5, 1.6, 0, 1.15, -0.6); m.box(color, 1.42, 0.06, 1.3, 0, 1.42, -0.6);   // rear, cabin, roof
    m.box(DARK, 1.5, 0.45, 0.08, 0, 0.65, 0.2);                               // firewall
    m.box(DARK, 1.5, 0.12, 0.12, 0, 0.84, 1.95); m.box(0x6a7078, 1.0, 0.36, 0.06, 0, 0.66, 1.92); m.box(DARK, 1.68, 0.2, 0.2, 0, 0.42, 1.98);   // radiator support, radiator, bumper
    for (const s of [-1, 1]) { m.box(DARK, 0.1, 0.1, 1.6, s * 0.55, 0.4, 1.15); m.box(0x6a7078, 0.12, 0.08, 0.12, s * 0.3, 0.5, 1.1); }   // chassis rails and engine mounts
    for (const s of [-1, 1]) m.box(0xe6efff, 0.32, 0.12, 0.04, s * 0.55, 0.78, 1.97, 0, 0, 0, { mat: "lamp" });
    for (const s of [-1, 1]) for (const z of [1.25, -1.25]) { m.box(0xd2262d, 0.1, 0.3, 0.1, s * 0.6, 0.15, z); }   // axle stands
  }, false, 32);
  g.add(shell);
  const glass = build(T, kit, (m) => { m.box(0x1b2836, 1.4, 0.04, 0.6, 0, 1.18, 0.35, -0.9, 0, 0); for (const s of [-1, 1]) m.box(0x1b2836, 0.03, 0.34, 1.3, s * 0.755, 1.15, -0.6); }, true, 33);
  g.add(glass);
  // wheels off the ground on the stands
  const wheels: any[] = [];
  for (const s of [-1, 1]) for (const z of [1.25, -1.25]) {
    const w = build(T, kit, (m) => { m.cyl(0x121316, 0.31, 0.31, 0.2, 0, 0, 0, 12, 0, 0, Math.PI / 2); m.cyl(0xa0a6ae, 0.2, 0.2, 0.21, 0, 0, 0, 10, 0, 0, Math.PI / 2); }, false, 34);
    w.position.set(s * 0.74, 0.34, z); g.add(w); wheels.push(w);
  }
  // bonnet on a hinge at the windscreen end: up 1.2 rad
  const bonnet = new T.Group(); bonnet.position.set(0, 0.88, 0.25);
  bonnet.add(build(T, kit, (m) => { m.box(color, 1.56, 0.04, 1.62, 0, 0, 0.81); }, false, 35));
  g.add(bonnet);
  const strut = build(T, kit, (m) => { m.box(0x9aa0a8, 0.015, 0.7, 0.015, 0, 0.35, 0); }, true, 36);
  strut.position.set(0.6, 0.86, 1.6); g.add(strut);
  return { group: g, bonnet, strut, wheels, mount: [0, 0.56, 1.1] as [number, number, number] };
}
