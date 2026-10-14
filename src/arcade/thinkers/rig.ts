// @ts-nocheck
import { MB } from "../../world/infinite/mb";
import { makeLink } from "../f1/car";

/**
 * A blocky mechanic for the workshop clips. Arms and legs are solved with two-bone IK every frame, so a clip only says where the hands,
 * feet and hips should be and where the head looks; the elbows and knees bend by themselves. Tools hang from the hands.
 * Rig space: +z is where the mechanic faces, y up, feet on y = 0.
 */
export interface RigPose {
  x: number; z: number; yaw: number;
  /** how far the hips drop (0 standing, 0.5 deep crouch) */
  crouch: number;
  /** forward lean of the torso, radians */
  lean: number;
  /** hands in world space */
  hl: [number, number, number]; hr: [number, number, number];
  /** where the head looks (world) */
  look: [number, number, number];
}

const U_ARM = 0.31, F_ARM = 0.3, THIGH = 0.46, SHIN = 0.46;

export function createMechanic(T: any, kit: any, colors = { suit: 0x2a5ac8, trim: 0xff7a1a, skin: 0xd8a888, cap: 0xd2262d }) {
  const group = new T.Group();
  const suit = new T.MeshLambertMaterial({ color: colors.suit }), suitDk = new T.MeshLambertMaterial({ color: new T.Color(colors.suit).multiplyScalar(0.75) });
  const glove = new T.MeshLambertMaterial({ color: 0x1b1d22 }), boot = new T.MeshLambertMaterial({ color: 0x2a2018 });
  // torso, hips and head are built with MB (a little detail: pockets, reflective stripes, a name patch, a cap with a peak)
  const torso = new T.Group(), hips = new T.Group(), head = new T.Group();
  {
    const mb = new MB(T, 501); mb.jitter = 0.02; mb.ao = { y0: -9, h: 1, k: 0 };
    mb.box(colors.suit, 0.44, 0.56, 0.26, 0, 0.28, 0);                // chest
    mb.box(colors.trim, 0.45, 0.05, 0.27, 0, 0.18, 0, 0, 0, 0, { jit: 0 }); mb.box(0xe9e9ee, 0.45, 0.02, 0.27, 0, 0.18, 0, 0, 0, 0, { jit: 0 });
    mb.box(0xf2f2f4, 0.1, 0.05, 0.01, 0.1, 0.42, 0.135, 0, 0, 0, { jit: 0 });          // name patch
    for (const s of [-1, 1]) mb.box(new T.Color(colors.suit).multiplyScalar(0.8).getHex(), 0.1, 0.1, 0.02, s * 0.12, 0.3, 0.135);   // chest pockets
    mb.box(colors.suit, 0.5, 0.14, 0.28, 0, 0.5, 0);                  // shoulders
    mb.box(0xd8a888, 0.12, 0.1, 0.12, 0, 0.6, 0);                     // neck
    torso.add(mb.build({ ...kit, lit: new T.MeshLambertMaterial({ vertexColors: true }) }, true));
    const hb = new MB(T, 502); hb.jitter = 0.02; hb.ao = { y0: -9, h: 1, k: 0 };
    hb.box(colors.suit, 0.4, 0.2, 0.25, 0, -0.04, 0); hb.box(0x1b1d22, 0.42, 0.05, 0.26, 0, 0.06, 0, 0, 0, 0, { jit: 0 });   // belt
    hb.box(0xc9ced6, 0.06, 0.04, 0.02, 0, 0.06, 0.135, 0, 0, 0, { jit: 0 });
    hips.add(hb.build({ ...kit, lit: new T.MeshLambertMaterial({ vertexColors: true }) }, true));
    const hd = new MB(T, 503); hd.jitter = 0.01; hd.ao = { y0: -9, h: 1, k: 0 };
    hd.box(colors.skin, 0.22, 0.24, 0.22, 0, 0.12, 0);
    hd.box(0x1b1d22, 0.04, 0.03, 0.01, -0.05, 0.15, 0.111); hd.box(0x1b1d22, 0.04, 0.03, 0.01, 0.05, 0.15, 0.111);   // eyes
    hd.box(0x8a5a3c, 0.06, 0.02, 0.01, 0, 0.06, 0.111);              // mouth
    hd.box(0x6a4a30, 0.23, 0.07, 0.23, 0, 0.0, -0.01);                // beard line
    hd.box(colors.cap, 0.24, 0.08, 0.24, 0, 0.27, 0); hd.box(colors.cap, 0.2, 0.02, 0.12, 0, 0.24, 0.16);   // cap and peak
    hd.box(0xf2f2f4, 0.06, 0.04, 0.01, 0, 0.28, 0.121, 0, 0, 0, { jit: 0 });
    head.add(hd.build({ ...kit, lit: new T.MeshLambertMaterial({ vertexColors: true }) }, true));
  }
  group.add(torso, hips, head);
  const L = (m: any, r: number) => { const l = makeLink(T, m, r); l.mesh.castShadow = true; group.add(l.mesh); return l; };
  const arm = [-1, 1].map((s) => ({ s, up: L(suit, 0.11), fo: L(suitDk, 0.095), hand: new T.Mesh(new T.BoxGeometry(0.09, 0.1, 0.12), glove), tool: new T.Group() }));
  arm.forEach((a) => { a.hand.castShadow = true; group.add(a.hand); a.hand.add(a.tool); });
  const leg = [-1, 1].map((s) => ({ s, th: L(suit, 0.15), sh: L(suitDk, 0.13), foot: new T.Mesh(new T.BoxGeometry(0.13, 0.1, 0.28), boot) }));
  leg.forEach((l) => { l.foot.castShadow = true; group.add(l.foot); });

  const V = () => new T.Vector3();
  const sh = V(), el = V(), hand = V(), hipJ = V(), knee = V(), ankle = V(), tmp = V(), dir = V(), pole = V(), up = new T.Vector3(0, 1, 0), m4 = new T.Matrix4();
  const toWorld = new T.Matrix4(), fromWorld = new T.Matrix4();
  /** two-bone IK: from a towards target with segment lengths la, lb; the bend goes toward `poleDir` */
  function ik(a: any, target: any, la: number, lb: number, poleDir: any, outMid: any, outEnd: any) {
    dir.subVectors(target, a); let d = dir.length();
    const maxD = la + lb - 1e-3; if (d > maxD) { dir.multiplyScalar(maxD / d); d = maxD; }
    outEnd.copy(a).add(dir);
    dir.normalize();
    const cosA = Math.max(-1, Math.min(1, (la * la + d * d - lb * lb) / (2 * la * d))), sinA = Math.sqrt(1 - cosA * cosA);
    pole.copy(poleDir).addScaledVector(dir, -poleDir.dot(dir)); if (pole.lengthSq() < 1e-6) pole.set(0, 0, 1); pole.normalize();
    outMid.copy(a).addScaledVector(dir, la * cosA).addScaledVector(pole, la * sinA);
  }

  const pose: RigPose = { x: 0, z: 0, yaw: 0, crouch: 0, lean: 0, hl: [0.3, 0.9, 0.3], hr: [-0.3, 0.9, 0.3], look: [0, 1.6, 2] };
  function apply(p: RigPose = pose) {
    group.position.set(p.x, 0, p.z); group.rotation.set(0, p.yaw, 0); group.updateMatrixWorld(true);
    fromWorld.copy(group.matrixWorld).invert();
    const hipY = 0.98 - p.crouch * 0.95;
    hips.position.set(0, hipY, -p.crouch * 0.12); hips.rotation.set(0, 0, 0);
    torso.position.set(0, hipY + 0.06, -p.crouch * 0.12); torso.rotation.set(p.lean, 0, 0);
    // head: on the neck, turned toward the look point
    tmp.set(0, 0.64, 0).applyEuler(torso.rotation).add(torso.position);
    head.position.copy(tmp);
    const lk = V().set(p.look[0], p.look[1], p.look[2]).applyMatrix4(fromWorld).sub(tmp);
    head.rotation.set(Math.max(-0.6, Math.min(0.7, -Math.atan2(lk.y, Math.hypot(lk.x, lk.z)))), Math.max(-1.1, Math.min(1.1, Math.atan2(lk.x, lk.z))), 0, "YXZ");
    // arms
    for (const a of arm) {
      sh.set(a.s * 0.27, 0.5, 0).applyEuler(torso.rotation).add(torso.position);
      const tw = a.s < 0 ? p.hr : p.hl;
      hand.set(tw[0], tw[1], tw[2]).applyMatrix4(fromWorld);
      ik(sh, hand, U_ARM, F_ARM, tmp.set(a.s * 0.6, -0.5, -0.6), el, hand);
      a.up.set(sh, el); a.fo.set(el, hand);
      a.hand.position.copy(hand);
      m4.lookAt(hand, el, up); a.hand.quaternion.setFromRotationMatrix(m4);
    }
    // legs: feet stay under the hips, knees bend forward
    for (const l of leg) {
      hipJ.set(l.s * 0.11, hipY - 0.06, -p.crouch * 0.12);
      ankle.set(l.s * 0.13, 0.08, 0.05 + (l.s > 0 ? 0.05 : -0.05) * p.crouch);
      ik(hipJ, ankle, THIGH, SHIN, tmp.set(0, 0, 1), knee, ankle);
      l.th.set(hipJ, knee); l.sh.set(knee, ankle);
      l.foot.position.set(ankle.x, 0.05, ankle.z + 0.06);
    }
  }
  apply();
  return {
    group, pose, apply,
    /** tool groups that follow each hand: [right, left]; children are positioned in the hand's frame (+z along the fingers) */
    toolR: arm[0]!.tool, toolL: arm[1]!.tool,
    handR: arm[0]!.hand, handL: arm[1]!.hand,
    dispose() { group.traverse((o: any) => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); [suit, suitDk, glove, boot].forEach((m) => m.dispose()); },
  };
}
export type Mechanic = ReturnType<typeof createMechanic>;
