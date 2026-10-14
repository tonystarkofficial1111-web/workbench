// @ts-nocheck
import type { T3 } from "./types";

/**
 * Plant shapes for the Infinite world. They are built from flat, square-cornered pieces (no smooth curves), so grass, ferns and palm
 * fronds read as stepped, blocky leaves that match the boxy trunks and leaf clumps.
 */

/** A geometry made of separate flat quads (each given by its four corners); every quad keeps its own flat normal. */
function quadsGeo(T: T3, quads: number[][]) {
  const pos: number[] = [], idx: number[] = [];
  quads.forEach((q, i) => { pos.push(...q); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A palm / fern frond lying along +x from the origin: it rises a little, then arches over and droops, in a few straight steps.
 * Each step is two flat halves meeting at a raised rib, and each step has its own width, so the outline is a row of notched blocks.
 */
export function frondGeo(T: T3, len: number, width: number, droop: number, segs = 5, lift = 0.28) {
  const quads: number[][] = [];
  const pt = (i: number) => { const s = i / segs; return [s * len, len * (lift * s - droop * s * s)]; };
  for (let i = 0; i < segs; i++) {
    const [x0, y0] = pt(i)!, [x1, y1] = pt(i + 1)!;
    const w = (width * (0.2 + 0.8 * Math.sin(Math.PI * Math.min(1, ((i + 0.5) / segs) * 0.92 + 0.08)))) / 2, rib = width * 0.09;
    for (const sg of [-1, 1]) quads.push([x0, y0 + rib, 0, x1, y1 + rib, 0, x1, y1, sg * w, x0, y0, sg * w]);
  }
  return quadsGeo(T, quads);
}

/** A tall thin blade (grass / reed) standing on y = 0, leaning along +x: a stack of narrowing rectangles, each shifted a step sideways. */
export function bladeGeo(T: T3, h: number, w: number, lean: number, segs = 3) {
  const quads: number[][] = [];
  const widths = [1, 0.72, 0.42, 0.26];
  for (let i = 0; i < segs; i++) {
    const y0 = (i * h) / segs, y1 = ((i + 1) * h) / segs, ox = lean * h * (i / segs) * (i / segs), hw = (w * widths[Math.min(i, 3)]!) / 2;
    quads.push([ox - hw, y0, 0, ox + hw, y0, 0, ox + hw, y1, 0, ox - hw, y1, 0]);
  }
  return quadsGeo(T, quads);
}

/** A broad blocky leaf on a stem: base at the origin, pointing along +x, drooping at the tip. */
export function leafGeo(T: T3, len: number, width: number, droop = 0.35, segs = 4) {
  return frondGeo(T, len, width, droop, segs, 0.22);
}
