// @ts-nocheck
import * as THREE from "three";
import { Gfx } from "../infinite/gfx";
import { Air } from "../infinite/air";
import { makeMats } from "../infinite/mats";
import { applyTier } from "../infinite/mb";
import type { Ctx } from "../infinite/types";

/**
 * Free Style runs on its own renderer, scene and camera, but it reuses the Infinite world's look: its sky, water, trees, plants, people,
 * buildings, flags and smoke. Those modules expect an "env" of engine internals (scene, sun, hemisphere light, fog, stars, ground height...)
 * and a shared "ctx"; this file builds both, with the same renderer settings the Block World engine uses.
 */
export const DAY_LENGTH = 300;     // seconds of game time per day and night (at 1x speed)

export interface FsCtx extends Ctx {
  canvas: HTMLCanvasElement;
  renderer: any;
  scene: any;
  camera: any;
  /** game clock in seconds (drives the sky) */
  time: number;
  /** extra per-frame jobs that are not world modules */
  onDispose: Array<() => void>;
}

export function createFsCtx(host: HTMLElement): FsCtx {
  const T = THREE;
  const gfx = new Gfx();
  const air = new Air(T);
  const mats = makeMats(T, air);
  const canvas = document.createElement("canvas");
  canvas.className = "fs-canvas"; canvas.tabIndex = 0;
  host.appendChild(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color(0x8fc7e8);
  const camera = new T.PerspectiveCamera(50, 1, 0.5, 900);
  const worldFog = new T.Fog(0x8fc7e8, 45, 150);
  const hemi = new T.HemisphereLight(0xbfe0ff, 0x3a2f22, 0.9);
  const sunLight = new T.DirectionalLight(0xfff3d6, 0.9);
  sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.04;
  scene.add(hemi, sunLight, sunLight.target);
  const sunMesh = new T.Mesh(new T.SphereGeometry(5, 12, 10), new T.MeshBasicMaterial({ color: 0xfff3c4 }));
  const moonMesh = new T.Mesh(new T.SphereGeometry(3.3, 12, 10), new T.MeshBasicMaterial({ color: 0xcdd6e8 }));
  sunMesh.visible = false; moonMesh.visible = false; scene.add(sunMesh, moonMesh);
  // stars: the sky module moves them with the camera and fades them in on clear nights
  const sp = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.35, R = 300; sp[i * 3] = Math.cos(a) * Math.cos(e) * R + 32; sp[i * 3 + 1] = Math.sin(e) * R; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R + 32; }
  const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0, fog: false }));
  scene.add(stars);
  const camTarget = new T.Vector3(128, 0, 128);
  const trees: any[] = [];

  // shards: little wood / stone chips when something is chopped or mined
  const shards: any[] = [], shardGeo = new T.BoxGeometry(0.14, 0.14, 0.14);
  function spawnShards(x: number, y: number, z: number, color: number) {
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(shardGeo, new T.MeshLambertMaterial({ color, transparent: true }));
      m.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
      scene.add(m);
      shards.push({ m, vx: (Math.random() - 0.5) * 2.2, vy: 2 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2.2, life: 0, max: 0.7 + Math.random() * 0.3 });
    }
  }

  const env: any = {
    THREE: T, scene, camera, renderer, canvas, worldFog, hemi, sunLight, sunMesh, moonMesh, stars, camTarget, trees,
    DAY_LENGTH, TREE_GROW_TIME: 3, camDistance: 34, legacyWaterMesh: null,
    VILLAGER_NAMES: ["Alden", "Brynn", "Cora", "Dax", "Elin", "Farro", "Gwen", "Hobbs", "Isla", "Jory", "Kest", "Lira", "Marn", "Nessa", "Oren", "Pia", "Quill", "Rowe", "Sable", "Tam", "Uma", "Vesper", "Wren", "Yara", "Zeke"],
    getGroundHeight: () => 1,
    spawnShards,
    showWorldWarning: () => {},
    get shadersOn() { return gfx.level === 2; },
    get simTime() { return ctx.time; },
  };

  const ctx: FsCtx = {
    env, T, gfx, air, mats, tiered: [], rtime: 0, dt: 0, island: null, trees: null, foliage: null, fx: null,
    frame: [], cleanup: [], started: [], gfxChanged: [], x: {}, isInf: () => true,
    canvas, renderer, scene, camera, time: DAY_LENGTH * 0.08, onDispose: [],
  };

  // graphics level: same rules as the Infinite world (High = shadows + tone mapping, Low = fewer pixels)
  function applyGfx() {
    const hi = gfx.level === 2;
    renderer.shadowMap.enabled = hi;
    renderer.shadowMap.type = hi ? T.PCFSoftShadowMap : T.BasicShadowMap;
    renderer.toneMapping = hi ? T.ACESFilmicToneMapping : T.NoToneMapping;
    renderer.setPixelRatio(gfx.pixelRatio(window.devicePixelRatio || 1));
    sunLight.castShadow = hi;
    stars.visible = hi;
    scene.traverse((o: any) => { if (o.isMesh) { o.castShadow = hi && !o.userData.noShadowCast; o.receiveShadow = true; } });
    ctx.tiered.forEach((m) => applyTier(m, gfx.f.tier));
    ctx.trees && ctx.trees.applyGfx();
    ctx.foliage && ctx.foliage.applyGfx();
    ctx.gfxChanged.forEach((f) => f());
    resize();
  }
  gfx.onChange(applyGfx);
  (ctx as any).applyGfx = applyGfx;

  function resize() {
    const r = host.getBoundingClientRect(), w = Math.max(2, Math.floor(r.width)), h = Math.max(2, Math.floor(r.height));
    renderer.setSize(w, h, false); canvas.style.width = w + "px"; canvas.style.height = h + "px";
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  resize();

  ctx.frame.push((dt) => {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i]; s.life += dt; s.vy -= 9 * dt;
      s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
      s.m.material.opacity = Math.max(0, 1 - s.life / s.max);
      if (s.life >= s.max) { scene.remove(s.m); s.m.material.dispose(); shards.splice(i, 1); }
    }
  });
  ctx.onDispose.push(() => {
    ro.disconnect();
    shards.forEach((s) => s.m.material.dispose()); shardGeo.dispose();
    scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
    mats.list().forEach((m: any) => m.dispose());
    renderer.dispose(); try { renderer.forceContextLoss(); } catch { /* ignore */ }
    canvas.remove();
  });
  return ctx;
}
