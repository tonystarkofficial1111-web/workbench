// @ts-nocheck
import { Rng, clamp } from "../infinite/rng";
import { MB } from "../infinite/mb";
import { randomLook, humanParts, instantiate, setTier, partsOf, spearParts, armourSet } from "../infinite/humans";
import { PAL } from "../infinite/props";
import type { FsCtx } from "./ctx";
import { DAY_LENGTH } from "./ctx";
import { N, START, type Land, type Node } from "./land";
import { buildingModel, siteModel, animalModel, untrack } from "./models";
import {
  type Res, type Cost, type Role, type BType, type AnimalKind, RES_INFO, NEEDS, ROLES, BUILD, PRODUCE, ANIMALS, START_STOCK, START_VILLAGERS,
  canPay, pay,
} from "./data";

/**
 * Free Style: the village simulation. Villagers with needs (hunger, thirst, health, sickness), jobs, a leader you walk yourself,
 * animals that wander and flee, buildings that builders put up, trees that grow back. Everything that matters is in `S`
 * (plain data, saved as JSON); the 3D objects are rebuilt from it.
 */
export const SAVE_VERSION = 1;
const TUNICS = [0x8a3a2a, 0x3a5a8a, 0x5a7a3a, 0x7a5a2a, 0x6a3a6a, 0x2a6a6a, 0x8a6a2a, 0x4a4a5a];
const NAMES = ["Alden", "Brynn", "Cora", "Dax", "Elin", "Farro", "Gwen", "Hobbs", "Isla", "Jory", "Kest", "Lira", "Marn", "Nessa", "Oren", "Pia", "Quill", "Rowe", "Sable", "Tam", "Uma", "Vesper", "Wren", "Yara", "Zeke", "Bram", "Edda", "Godric", "Hilde", "Ivo", "Maud", "Osric", "Rosa", "Tilda", "Ulric", "Wynn"];
export const DEPOT = { x: START.x, z: START.z + 3.1 };
const ANIMAL_CAP: Record<AnimalKind, number> = { chicken: 34, sheep: 26, cow: 18 };
const ANIMAL_SCALE: Record<AnimalKind, number> = { chicken: 0.62, sheep: 0.72, cow: 0.66 };
const TREE_GROW = 2 * DAY_LENGTH;

export interface Villager {
  id: number; name: string; seed: number; leader?: boolean;
  x: number; z: number; yaw: number;
  hp: number; hunger: number; thirst: number; sick: number;
  role: Role; towerId?: number; spear: boolean; armour: boolean;
  carry: Cost | null;
  collapsed: number;
  /** why they collapsed: "starve" | "sick" | "hurt" */
  down?: string;
  /** runtime only */
  task?: any; path?: Array<[number, number]> | null; r?: any; asleep?: boolean; moved?: number; working?: number; y?: number; why?: string; lastHurt?: number;
}
export interface Bld { id: number; type: BType; x: number; z: number; rot: number; built: boolean; progress: number; seed: number; guard?: number; g?: any; site?: any; workers?: Set<number>; t?: number }
export interface Animal { id: number; kind: AnimalKind; x: number; z: number; yaw: number; hp: number; st: "wander" | "flee" | "dead" | "graze"; tx: number; tz: number; t: number; from?: any; r?: any; ph?: number; amp?: number }

export interface FsState {
  v: number; seed: number; time: number; nextId: number;
  stock: Record<Res, number>;
  villagers: Villager[]; buildings: Bld[]; animals: Animal[];
  trees: Array<[number, number, string, number]>;
  nodes: Record<number, number>;
  autoFeed: boolean;
  stats: { born: number; died: number; raids: number; wins: number };
  raid: any;
  log: string[];
}

export class FsGame {
  ctx: FsCtx; land: Land; field: any; S: FsState;
  T: any; rnd = new Rng((Math.random() * 1e9) | 0);
  root: any; vGroup: any; aGroup: any; bGroup: any;
  trees: any[] = [];
  listeners: Array<(e: any) => void> = [];
  sel = -1;
  leader: Villager | null = null;
  lastCyc = 0;
  private toolCache = new Map<string, any>();
  private iconCache = new Map<string, any>();
  private ringGeo: any; private ringMat: any;

  constructor(ctx: FsCtx, land: Land, field: any, S: FsState) {
    this.ctx = ctx; this.land = land; this.field = field; this.S = S; this.T = ctx.T;
    const T = this.T;
    this.root = new T.Group(); this.vGroup = new T.Group(); this.aGroup = new T.Group(); this.bGroup = new T.Group();
    this.root.add(this.bGroup, this.vGroup, this.aGroup); ctx.scene.add(this.root);
    this.ringGeo = new T.RingGeometry(0.34, 0.44, 24); this.ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, depthWrite: false });
    this.lastCyc = this.cyc();
  }

  // ------------------------------------------------------------------------------------------------ new game / load
  static fresh(seed: number): FsState {
    const stock: any = {}; (Object.keys(RES_INFO) as Res[]).forEach((k) => (stock[k] = START_STOCK[k] || 0));
    return { v: SAVE_VERSION, seed, time: DAY_LENGTH * 0.06, nextId: 1, stock, villagers: [], buildings: [], animals: [], trees: [], nodes: {}, autoFeed: true, stats: { born: 0, died: 0, raids: 0, wins: 0 }, raid: { done: 0, pending: null, history: [] }, log: [] };
  }

  /** First start: tent, campfire, the leader and the first villagers, trees and animals. */
  setupNew() {
    const S = this.S;
    this.addBuilding("tent", START.x, START.z, 0, true);
    this.addBuilding("campfire", START.x + 4.6, START.z + 3.4, 0, true);
    const lead = this.newVillager("You", true); lead.x = START.x; lead.z = START.z + 4.2;
    const roles: Role[] = ["wood", "water", "hunter", "cook", "wood", "builder"];
    for (let i = 0; i < START_VILLAGERS; i++) { const v = this.newVillager(); v.role = roles[i]!; const a = (i / START_VILLAGERS) * Math.PI - Math.PI / 2; v.x = START.x + Math.sin(a) * 3.6; v.z = START.z + 4 + Math.cos(a) * 1.2; }
    this.plantForest();
    for (const k of Object.keys(ANIMAL_CAP) as AnimalKind[]) for (let i = 0; i < Math.round(ANIMAL_CAP[k] * 0.8); i++) this.spawnAnimal(k, true);
    this.log("Day 1. Your people set up camp. Click the tent to give jobs, feed and build.");
  }

  /** Rebuild the 3D world from a loaded state. */
  restore() {
    const S = this.S;
    S.buildings.forEach((b) => this.showBuilding(b));
    S.trees.forEach((t) => this.makeTree(t[0], t[1], t[2] as any, t[3]));
    this.land.nodes.slice().forEach((n) => { if (S.nodes[n.id] != null) { n.amount = S.nodes[n.id]; if (n.amount <= 0) this.land.removeNode(n); } });
    S.buildings.forEach((b) => this.blockFor(b));
    this.land.refreshBlocks();
    S.villagers.forEach((v) => { if (v.leader) this.leader = v; this.makeRig(v); });
    S.animals.forEach((a) => this.makeAnimalRig(a));
  }

  on(fn: (e: any) => void) { this.listeners.push(fn); }
  emit(e: any) { this.listeners.forEach((f) => { try { f(e); } catch (err) { console.error(err); } }); }
  log(text: string, kind = "info") { this.S.log.unshift("Day " + this.day() + ": " + text); this.S.log.length = Math.min(this.S.log.length, 60); this.emit({ type: "toast", text, kind }); }

  // ------------------------------------------------------------------------------------------------ time
  cyc() { return (this.S.time % DAY_LENGTH) / DAY_LENGTH; }
  day() { return Math.floor(this.S.time / DAY_LENGTH) + 1; }
  isNight() { const c = this.cyc(); return c > 0.55 && c < 0.96; }
  clock() { const h = (this.cyc() * 24 + 6) % 24; return String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.floor((h % 1) * 60)).padStart(2, "0"); }

  // ------------------------------------------------------------------------------------------------ trees
  plantForest() {
    const land = this.land, rnd = new Rng(this.S.seed * 5 + 3);
    const spots: Array<[number, number]> = [];
    const ok = (x: number, z: number, minD: number) => {
      if (!land.isLand(x, z) || land.dWater[Math.floor(z) * N + Math.floor(x)]! < 1.8) return false;
      if (Math.hypot(x - START.x, z - START.z) < 11) return false;
      if (land.blockers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 1)) return false;
      if (land.bridges.some((b) => Math.hypot(b.x - x, b.z - z) < b.hl + 2)) return false;
      return !spots.some((s) => Math.abs(s[0] - x) < minD && Math.abs(s[1] - z) < minD && Math.hypot(s[0] - x, s[1] - z) < minD);
    };
    for (let tries = 0; spots.length < 760 && tries < 26000; tries++) {
      const x = rnd.range(8, N - 8), z = rnd.range(8, N - 8);
      const zn = land.zone[Math.floor(z) * N + Math.floor(x)];
      if (zn === 2) continue;
      if (zn === 0 && rnd.next() > 0.07) continue;           // meadows: a tree here and there
      if (!ok(x, z, zn === 1 ? 2.4 : 4)) continue;
      spots.push([x, z]);
    }
    // a ring of trees near home so wood is close at the start
    for (let tries = 0, made = 0; made < 26 && tries < 900; tries++) {
      const a = rnd.range(0, 6.28), d = rnd.range(12, 22), x = START.x + Math.cos(a) * d, z = START.z + Math.sin(a) * d;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.6) continue;   // keep the view in front of the tent open
      if (!ok(x, z, 2.6)) continue; spots.push([x, z]); made++;
    }
    for (const [x, z] of spots) {
      const near = land.dWater[Math.floor(z) * N + Math.floor(x)]! < 4;
      const u = rnd.next(), kind = near ? (u < 0.45 ? "bamboo" : "broadleaf") : u < 0.78 ? "broadleaf" : "jungle";
      this.makeTree(x, z, kind, TREE_GROW);
    }
  }

  makeTree(x: number, z: number, kind: string, age: number) {
    const t = this.field.create(x, z, kind, -1000, new Rng((x * 73 + z * 131) | 0));
    t.age = age; t.grow = age < TREE_GROW;
    if (t.grow) t.group.scale.setScalar(Math.max(0.05, age / TREE_GROW));
    this.trees.push(t); this.ctx.env.trees.push(t);
    return t;
  }

  removeTree(t: any, by: any) {
    const i = this.trees.indexOf(t); if (i >= 0) this.trees.splice(i, 1);
    const j = this.ctx.env.trees.indexOf(t); if (j >= 0) this.ctx.env.trees.splice(j, 1);
    this.field.chop(t, by);
  }

  private treeTimer = 0;
  updateTrees(dt: number) {
    for (const t of this.trees) if (t.grow) { t.age += dt; const s = Math.min(1, 0.05 + t.age / TREE_GROW); t.group.scale.setScalar(s); if (t.age >= TREE_GROW) t.grow = false; }
    this.treeTimer += dt;
    if (this.treeTimer > 14 && this.trees.length < 820) {   // the forest grows back slowly
      this.treeTimer = 0;
      const base = this.trees[Math.floor(this.rnd.next() * this.trees.length)];
      if (!base) return;
      const a = this.rnd.range(0, 6.28), d = this.rnd.range(2.5, 5), x = base.x + Math.cos(a) * d, z = base.z + Math.sin(a) * d;
      if (!this.land.walkable(x, z) || this.land.dWater[Math.floor(z) * N + Math.floor(x)]! < 1.8 || Math.hypot(x - START.x, z - START.z) < 11) return;
      if (this.trees.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.z - z) < 2)) return;
      if (this.S.buildings.some((b) => Math.hypot(b.x - x, b.z - z) < BUILD[b.type].r + 1.5)) return;
      this.makeTree(x, z, base.kind || "broadleaf", 0);
    }
  }

  // ------------------------------------------------------------------------------------------------ buildings
  addBuilding(type: BType, x: number, z: number, rot: number, built: boolean) {
    const b: Bld = { id: this.S.nextId++, type, x, z, rot, built, progress: built ? BUILD[type].work : 0, seed: (this.rnd.next() * 1e6) | 0 };
    this.S.buildings.push(b);
    const r = BUILD[type].r;
    // clear the ground: trees come down (a little wood for the trouble), plants go
    let felled = 0;
    for (const t of this.trees.slice()) if (Math.hypot(t.x - x, t.z - z) < r + 0.9) { this.removeTree(t, { x, z }); felled++; }
    if (felled && !built) this.S.stock.wood += felled * 2;
    this.ctx.foliage && this.ctx.foliage.clearArea(x, z, r + 0.6);
    this.blockFor(b); this.land.refreshBlocks();
    this.showBuilding(b);
    return b;
  }
  blockFor(b: Bld) { if (!this.land.blockers.some((q) => q.o === b)) this.land.blockers.push({ x: b.x, z: b.z, r: BUILD[b.type].r * (b.type === "farm" ? 0.75 : 0.9), o: b }); }

  showBuilding(b: Bld) {
    const T = this.T;
    if (b.g) { this.bGroup.remove(b.g); untrack(this.ctx, b.g); b.g.traverse((o: any) => o.geometry && o.userData.tier != null && o.geometry.dispose()); }
    const g = new T.Group(); g.position.set(b.x, 1, b.z); g.rotation.y = b.rot; g.userData.bld = b;
    this.bGroup.add(g);
    if (b.built) buildingModel(this.ctx, b.type, b.seed, g, 0x2f5fb8);
    else { const s = siteModel(this.ctx, BUILD[b.type].r, g); g.add(s); b.site = s; }
    g.traverse((o: any) => { if (o.isMesh) { o.castShadow = o.castShadow && this.ctx.gfx.level === 2; } });
    b.g = g;
    if (!b.built) this.addScaffold(b);
  }
  /** a half-built frame that rises as the work goes on */
  addScaffold(b: Bld) {
    const T = this.T, r = BUILD[b.type].r, mb = new MB(T, b.seed);
    mb.ao = { y0: 0, h: 1, k: 0.2 };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(PAL.wood[0], 0.14, 2.2, 0.14, sx * r * 0.62, 1.1, sz * r * 0.62);
    for (let y = 0.6; y < 2.2; y += 0.55) for (let s = 0; s < 4; s++) { mb.push(0, 0, 0, s * Math.PI / 2); mb.box(PAL.plank[s % 4], r * 1.24, 0.08, 0.1, 0, y, r * 0.62); mb.pop(); }
    mb.box(PAL.stone[1], r * 1.1, 0.3, r * 1.1, 0, 0.15, 0);
    const g = mb.build(this.ctx.mats, true); g.userData.scaffold = true;
    b.g.add(g); b.site2 = g; this.ctx.tiered.push(g);
    this.updateScaffold(b);
  }
  updateScaffold(b: Bld) { if (b.site2) { const k = clamp(b.progress / BUILD[b.type].work, 0, 1); b.site2.scale.set(1, 0.08 + 0.92 * k, 1); } }

  finishBuilding(b: Bld) {
    b.built = true; b.progress = BUILD[b.type].work; b.site2 = null; b.site = null;
    this.showBuilding(b);
    this.log(BUILD[b.type].name + " finished." + (b.type === "tower" ? " Click it to send a Guard up." : ""), "good");
  }

  canPlace(type: BType, x: number, z: number): string | null {
    const land = this.land, r = BUILD[type].r;
    if (Math.hypot(x - START.x, z - START.z) > 70) return "Too far from the tent";
    for (let a = 0; a < 8; a++) for (const d of [0, r * 0.6, r]) { const px = x + Math.cos(a * 0.785) * d, pz = z + Math.sin(a * 0.785) * d; if (!land.isLand(px, pz) || land.dWater[Math.floor(pz) * N + Math.floor(px)]! < 1.2) return "Needs dry land"; }
    for (const q of land.blockers) if (Math.hypot(q.x - x, q.z - z) < q.r + r + 0.4) return q.o && q.o.kind ? "Rocks in the way" : "Too close to another building";
    if (land.bridges.some((b) => Math.hypot(b.x - x, b.z - z) < b.hl + r + 1)) return "Too close to the bridge";
    return null;
  }

  place(type: BType, x: number, z: number, rot: number): string | null {
    const why = this.canPlace(type, x, z); if (why) return why;
    const def = BUILD[type];
    if (!canPay(this.S.stock, def.cost)) return "Not enough resources";
    pay(this.S.stock, def.cost);
    this.addBuilding(type, x, z, rot, false);
    const builders = this.S.villagers.filter((v) => v.role === "builder" && v.collapsed <= 0).length;
    this.log(def.name + " placed. " + (builders ? builders + " builder" + (builders > 1 ? "s" : "") + " on the way." : "Nobody is a Builder yet: give someone the Builder job at the tent."), builders ? "info" : "warn");
    return null;
  }

  demolish(b: Bld) {
    if (b.type === "tent") return;
    const i = this.S.buildings.indexOf(b); if (i >= 0) this.S.buildings.splice(i, 1);
    const k = this.land.blockers.findIndex((q) => q.o === b); if (k >= 0) this.land.blockers.splice(k, 1);
    this.land.refreshBlocks();
    if (b.g) { this.bGroup.remove(b.g); untrack(this.ctx, b.g); }
    if (!b.built) { // half the materials come back
      const c = BUILD[b.type].cost; (Object.keys(c) as Res[]).forEach((r) => (this.S.stock[r] += Math.floor((c[r] || 0) / 2)));
    }
    this.S.villagers.forEach((v) => { if (v.towerId === b.id) v.towerId = undefined; if (v.task && v.task.b === b) v.task = null; });
  }

  beds() { return this.S.buildings.reduce((n, b) => n + (b.built ? BUILD[b.type].beds || 0 : 0), 0); }
  built(type: BType) { return this.S.buildings.filter((b) => b.type === type && b.built); }
  tent() { return this.S.buildings.find((b) => b.type === "tent")!; }

  // ------------------------------------------------------------------------------------------------ villagers
  newVillager(name?: string, leader = false): Villager {
    const used = new Set(this.S.villagers.map((v) => v.name));
    const nm = name || NAMES.find((n) => !used.has(n) && this.rnd.next() < 0.35) || NAMES.find((n) => !used.has(n)) || "Villager " + this.S.nextId;
    const v: Villager = { id: this.S.nextId++, name: nm, seed: (this.rnd.next() * 1e6) | 0, leader, x: DEPOT.x, z: DEPOT.z + 1, yaw: 0, hp: 100, hunger: 85, thirst: 85, sick: 0, role: leader ? "idle" : "idle", spear: false, armour: false, carry: null, collapsed: 0 };
    this.S.villagers.push(v);
    if (leader) this.leader = v;
    this.makeRig(v);
    return v;
  }

  private tool(kind: string) {
    let p = this.toolCache.get(kind);
    if (p) return p;
    const mb = new MB(this.T, kind.length * 97); mb.ao = { y0: 0, h: 1, k: 0 }; mb.jitter = 0.02;
    const W = 0x7a5a38, S = 0xb8bec8;
    if (kind === "axe") { mb.box(W, 0.03, 0.03, 0.42, 0, 0, 0.16); mb.box(S, 0.02, 0.14, 0.1, 0, 0.05, 0.34, 0, 0, 0, { mat: "metal" }); }
    else if (kind === "pick") { mb.box(W, 0.03, 0.03, 0.44, 0, 0, 0.16); mb.box(S, 0.03, 0.34, 0.04, 0, 0, 0.36, 0, 0, 0, { mat: "metal" }); }
    else if (kind === "hammer") { mb.box(W, 0.03, 0.03, 0.3, 0, 0, 0.1); mb.box(0x55585e, 0.06, 0.12, 0.07, 0, 0, 0.24, 0, 0, 0, { mat: "metal" }); }
    else if (kind === "bucket") { mb.cyl(0x6a5030, 0.07, 0.06, 0.12, 0, -0.08, 0.05, 8); mb.torus(0x3a3f48, 0.07, 0.006, 0, -0.02, 0.05, Math.PI / 2, 0, 0, 3, 8, { mat: "metal" }); mb.box(0x3a3f48, 0.006, 0.08, 0.006, 0, 0.0, 0.05, 0, 0, 0, { mat: "metal" }); }
    else if (kind === "sickle") { mb.box(W, 0.03, 0.03, 0.16, 0, 0, 0.06); for (let k = 0; k < 5; k++) { const a = k * 0.5; mb.box(S, 0.015, 0.03, 0.06, 0, Math.sin(a) * 0.08, 0.14 + Math.cos(a) * 0.04 + k * 0.012, a, 0, 0, { mat: "metal" }); } }
    else if (kind === "ladle") { mb.box(W, 0.02, 0.02, 0.3, 0, 0, 0.12); mb.sphere(0x55585e, 0.045, 0, -0.02, 0.28, 1, 0.6, 1, 6, 4, { mat: "metal" }); }
    else if (kind === "tongs") { mb.box(0x3a3f48, 0.02, 0.02, 0.32, 0.015, 0, 0.12, 0, 0.05, 0, { mat: "metal" }); mb.box(0x3a3f48, 0.02, 0.02, 0.32, -0.015, 0, 0.12, 0, -0.05, 0, { mat: "metal" }); }
    else if (kind === "sack") { mb.sphere(0xb59a6a, 0.1, 0, -0.12, 0.05, 1, 1.2, 0.9, 6, 5); }
    p = partsOf(mb, this.ctx);
    this.toolCache.set(kind, p);
    return p;
  }
  private toolFor(v: Villager) {
    if (v.spear && (v.role === "hunter" || v.role === "guard" || v.leader)) return "spear";
    return ({ wood: "axe", miner: "pick", builder: "hammer", water: "bucket", farmer: "sickle", cook: "ladle", smith: "tongs", hunter: "", guard: "", idle: "" } as any)[v.role] || "";
  }

  icon(txt: string) {
    let m = this.iconCache.get(txt);
    if (!m) {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d")!; g.fillStyle = "rgba(20,22,30,0.72)"; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
      g.font = "36px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 32, 35);
      const tex = new this.T.CanvasTexture(c); tex.colorSpace = this.T.SRGBColorSpace;
      m = new this.T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false });
      this.iconCache.set(txt, m);
    }
    return m;
  }

  makeRig(v: Villager) {
    const T = this.T, ctx = this.ctx;
    if (v.r) { this.vGroup.remove(v.r.g); untrack(ctx, v.r.g); }
    const rnd = new Rng(v.seed);
    const L = randomLook(rnd, v.leader ? 0x2f5fb8 : TUNICS[v.seed % TUNICS.length]!, v.leader ? { crown: true, cape: true } : {});
    const parts = humanParts(ctx, L), tiers: any[] = [];
    const g = new T.Group(), P = (x: number, y: number, z = 0) => { const p = new T.Group(); p.position.set(x, y, z); return p; };
    const body = P(0, 0.4), headP = P(0, 0.4), armLP = P(-0.205 * L.build, 0.33), armRP = P(0.205 * L.build, 0.33), legLP = P(-0.085, 0.4), legRP = P(0.085, 0.4);
    const torso = instantiate(ctx, parts.torso, tiers);
    body.add(torso); headP.add(instantiate(ctx, parts.head, tiers)); body.add(headP);
    armLP.add(instantiate(ctx, parts.armL, tiers)); armRP.add(instantiate(ctx, parts.armR, tiers)); body.add(armLP, armRP);
    legLP.add(instantiate(ctx, parts.legL, tiers)); legRP.add(instantiate(ctx, parts.legR, tiers));
    const inner = new T.Group(); inner.add(body, legLP, legRP); g.add(inner);
    if (v.armour) {
      const set = armourSet(ctx, L, 0xc03030);
      torso.add(instantiate(ctx, set.torso, tiers)); headP.add(instantiate(ctx, set.head, tiers)); armLP.add(instantiate(ctx, set.armL, tiers)); armRP.add(instantiate(ctx, set.armR, tiers)); legLP.add(instantiate(ctx, set.legL, tiers)); legRP.add(instantiate(ctx, set.legR, tiers));
    }
    const tk = this.toolFor(v);
    let tool: any = null;
    if (tk) { tool = instantiate(ctx, tk === "spear" ? spearParts(ctx, 0x2f5fb8) : this.tool(tk), tiers); tool.position.set(0, -0.33, 0.03); tool.rotation.x = tk === "spear" ? 0.15 : 0.6; armRP.add(tool); }
    const load = new T.Group(); load.position.set(0, 0.62, -0.17); body.add(load);   // what they carry (a bundle on the back)
    const ic = new T.Sprite(this.icon("💤")); ic.scale.set(0.42, 0.42, 1); ic.position.y = 1.42; ic.visible = false; g.add(ic);
    const ring = new T.Mesh(this.ringGeo, this.ringMat); ring.position.y = 0.04; ring.visible = false; ring.renderOrder = 3; g.add(ring);
    g.traverse((o: any) => { if (o.isMesh) { o.userData.vill = v; if (o !== ring) { o.castShadow = this.ctx.gfx.level === 2 && o.castShadow !== false; } } });
    g.position.set(v.x, 1, v.z); g.rotation.y = v.yaw;
    this.vGroup.add(g);
    v.r = { g, inner, body, headP, armLP, armRP, legLP, legRP, tool, toolKind: tk, load, loadKey: "", ic, icTxt: "", ring, tiers, key: tk + (v.armour ? "A" : "") , ph: 0, amp: 0 };
    tiers.forEach((t) => setTier(t, ctx.gfx.f.tier));
  }
  refreshGfx() { this.S.villagers.forEach((v) => v.r && v.r.tiers.forEach((t: any) => setTier(t, this.ctx.gfx.f.tier))); }

  private loadModels = new Map<string, any>();
  private setLoad(v: Villager) {
    const key = v.carry ? Object.keys(v.carry).sort().join(",") : "";
    if (v.r.loadKey === key) return;
    v.r.loadKey = key;
    v.r.load.clear();
    if (!key) return;
    const first = key.split(",")[0] as Res;
    const col = ({ wood: 0x7a5636, stone: 0x8a8f98, iron: 0x5a524c, rawMeat: 0xb04a4a, rawWater: 0x3a7ab0, hide: 0x7a5636, wool: 0xf0ece2, feather: 0xf0f0f0 } as any)[first] || 0xb59a6a;
    const m = new this.T.Mesh(this.boxGeo || (this.boxGeo = new this.T.BoxGeometry(0.22, 0.22, 0.16)), this.ctx.mats.lit);
    if (!this.loadMats) this.loadMats = new Map();
    let mat = this.loadMats.get(col); if (!mat) { mat = new this.T.MeshLambertMaterial({ color: col }); this.loadMats.set(col, mat); }
    m.material = mat; m.castShadow = true;
    v.r.load.add(m);
  }

  // ------------------------------------------------------------------------------------------------ food
  /** Give one food item from the store to a villager. Returns a message or null when it worked. */
  feed(v: Villager, item: Res, silent = false): string | null {
    const f = RES_INFO[item].food; if (!f) return "That is not food";
    if ((this.S.stock[item] || 0) <= 0) return "No " + RES_INFO[item].name.toLowerCase() + " left";
    if (f.hunger && !f.thirst && v.hunger > 96 && v.collapsed <= 0) return v.name + " is not hungry";
    if (f.thirst && !f.hunger && v.thirst > 96 && v.collapsed <= 0) return v.name + " is not thirsty";
    this.S.stock[item]--;
    v.hunger = Math.min(100, v.hunger + (f.hunger || 0)); v.thirst = Math.min(100, v.thirst + (f.thirst || 0));
    v.hp = Math.min(100, v.hp + (f.heal || 0));
    if (f.sick && this.rnd.next() < f.sick) { v.sick = NEEDS.sickFor; if (!silent) this.log(v.name + " got sick from " + RES_INFO[item].name.toLowerCase() + ". Cook meat and boil water at the campfire!", "warn"); }
    if (f.heal && v.sick > 0 && (item === "meat" || item === "water")) v.sick = Math.max(0, v.sick - 40);
    if (v.collapsed > 0 && v.hunger >= 20 && v.thirst >= 20) this.revive(v);
    else if (v.collapsed > 0 && !silent) this.log(v.name + " still needs " + (v.hunger < 20 ? "food" : "water") + ".", "warn");
    this.emit({ type: "fed", v, item });
    return null;
  }
  /** The best thing to eat / drink that is in store (cooked first). */
  bestFood(kind: "hunger" | "thirst", allowRaw: boolean): Res | null {
    const list: Res[] = kind === "hunger" ? ["meat", "bread", ...(allowRaw ? ["rawMeat" as Res] : [])] : ["water", ...(allowRaw ? ["rawWater" as Res] : [])];
    return list.find((r) => (this.S.stock[r] || 0) > 0) || null;
  }
  feedAll() {
    let n = 0;
    for (const v of this.S.villagers) {
      for (let k = 0; k < 3 && v.hunger < 70; k++) { const f = this.bestFood("hunger", v.hunger < 15); if (!f || this.feed(v, f, true)) break; n++; }
      for (let k = 0; k < 3 && v.thirst < 70; k++) { const f = this.bestFood("thirst", v.thirst < 15); if (!f || this.feed(v, f, true)) break; n++; }
    }
    return n;
  }
  revive(v: Villager) {
    v.collapsed = 0; v.hp = Math.max(v.hp, 25); v.sick = 0; v.task = null; v.path = null;
    this.log(v.name + " is back on their feet.", "good");
  }

  // ------------------------------------------------------------------------------------------------ jobs: helpers
  speed(v: Villager) { return (v.leader ? 3.3 : 2.7) * (v.sick > 0 ? 0.75 : 1) * (v.hp < 30 ? 0.8 : 1) * (v.carry ? 0.92 : 1); }
  goTo(v: Villager, x: number, z: number) { v.path = this.land.path(v.x, v.z, x, z) || null; return !!v.path; }
  /** move along the path; true when there */
  walk(v: Villager, dt: number) {
    if (!v.path || !v.path.length) return true;
    let step = this.speed(v) * dt;
    while (step > 0 && v.path.length) {
      const [tx, tz] = v.path[0]!, dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
      if (d < 0.001) { v.path.shift(); continue; }
      v.yaw = Math.atan2(dx, dz);
      if (d <= step) { v.x = tx; v.z = tz; v.path.shift(); step -= d; v.moved = (v.moved || 0) + d; }
      else { v.x += (dx / d) * step; v.z += (dz / d) * step; v.moved = (v.moved || 0) + step; step = 0; }
    }
    return !v.path.length;
  }
  face(v: Villager, x: number, z: number) { v.yaw = Math.atan2(x - v.x, z - v.z); }
  near(v: Villager, x: number, z: number, r: number) { return Math.hypot(v.x - x, v.z - z) <= r; }
  addCarry(v: Villager, c: Cost) { v.carry = v.carry || {}; (Object.keys(c) as Res[]).forEach((k) => (v.carry![k] = (v.carry![k] || 0) + (c[k] || 0))); }
  deposit(v: Villager) {
    if (!v.carry) return;
    (Object.keys(v.carry) as Res[]).forEach((k) => (this.S.stock[k] = (this.S.stock[k] || 0) + (v.carry![k] || 0)));
    v.carry = null;
    this.emit({ type: "stock" });
  }
  /** a free spot in a ring around a building for a worker */
  spotAt(b: Bld, i: number) { const r = BUILD[b.type].r + 0.7, a = b.rot + (i * 2.1) + 0.3; return [b.x + Math.sin(a) * r, b.z + Math.cos(a) * r]; }

  nearestTree(x: number, z: number, maxD = 80) {
    let best: any = null, bd = maxD * maxD;
    for (const t of this.trees) { if (t.grow || t.claim) continue; const d = (t.x - x) ** 2 + (t.z - z) ** 2; if (d < bd) { bd = d; best = t; } }
    return best;
  }
  nearestNode(x: number, z: number, kind?: "stone" | "iron") {
    let best: Node | null = null, bd = 1e12;
    for (const n of this.land.nodes) { if (kind && n.kind !== kind) continue; if ((n.claimed || 0) >= 2) continue; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  nearestAnimal(x: number, z: number, maxD = 90) {
    let best: Animal | null = null, bd = maxD * maxD;
    for (const a of this.S.animals) { if (a.st === "dead" || (a as any).claim) continue; const d = (a.x - x) ** 2 + (a.z - z) ** 2; if (d < bd) { bd = d; best = a; } }
    return best;
  }
  waterSource(v: Villager): { x: number; z: number; well?: Bld } | null {
    const wells = this.built("well");
    let best: any = null, bd = 1e12;
    for (const w of wells) { const d = Math.hypot(w.x - v.x, w.z - v.z) * 0.6; if (d < bd) { bd = d; best = { x: w.x, z: w.z, well: w }; } }
    const s = this.land.nearestShore(v.x, v.z);
    if (s) { const d = Math.hypot(s[0] - v.x, s[1] - v.z); if (d < bd) { bd = d; best = { x: s[0], z: s[1] }; } }
    return best;
  }
  /** a free work slot in a building of this type */
  slotIn(type: BType, v: Villager): Bld | null {
    const cap = BUILD[type].slots || 1;
    let best: Bld | null = null, bd = 1e12;
    for (const b of this.built(type)) {
      b.workers = b.workers || new Set();
      if (!b.workers.has(v.id) && b.workers.size >= cap) continue;
      const d = Math.hypot(b.x - v.x, b.z - v.z); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  release(v: Villager) {
    const t = v.task; if (!t) return;
    if (t.tree) t.tree.claim = null;
    if (t.node) t.node.claimed = Math.max(0, (t.node.claimed || 1) - 1);
    if (t.animal) t.animal.claim = null;
    if (t.b && t.b.workers) t.b.workers.delete(v.id);
  }
  setTask(v: Villager, task: any) { this.release(v); v.task = task; v.path = null; v.working = 0; }

  // ------------------------------------------------------------------------------------------------ jobs: choosing what to do
  think(v: Villager) {
    const S = this.S;
    v.why = "";
    // carrying something home first
    if (v.carry) return this.setTask(v, { k: "deliver" });
    // hungry or thirsty: go to the tent and help themselves (when allowed and there is something)
    if (S.autoFeed) {
      if (v.hunger < 38 && this.bestFood("hunger", v.hunger < 12)) return this.setTask(v, { k: "eat", need: "hunger" });
      if (v.thirst < 38 && this.bestFood("thirst", v.thirst < 12)) return this.setTask(v, { k: "eat", need: "thirst" });
    }
    if (v.leader) return this.setTask(v, { k: "idle", t: 999 });
    const role = v.role;
    if (role === "wood") {
      const t = this.nearestTree(v.x, v.z);
      if (!t) { v.why = "No grown trees nearby"; return this.setTask(v, { k: "idle", t: 6 }); }
      t.claim = v.id; return this.setTask(v, { k: "chop", tree: t });
    }
    if (role === "miner") {
      const m = this.slotIn("mine", v);
      if (m) { m.workers!.add(v.id); return this.setTask(v, { k: "work", b: m, what: "mine" }); }
      const iron = S.stock.iron < S.stock.stone / 3;
      const n = (iron && this.nearestNode(v.x, v.z, "iron")) || this.nearestNode(v.x, v.z);
      if (!n) { v.why = "No rocks left: build a Mine"; return this.setTask(v, { k: "idle", t: 6 }); }
      n.claimed = (n.claimed || 0) + 1; return this.setTask(v, { k: "dig", node: n });
    }
    if (role === "farmer") {
      const f = this.slotIn("farm", v);
      if (!f) { v.why = this.built("farm").length ? "Farms are full (2 farmers each)" : "Build a Farm first"; return this.setTask(v, { k: "idle", t: 6 }); }
      f.workers!.add(v.id); return this.setTask(v, { k: "work", b: f, what: "farm" });
    }
    if (role === "hunter") {
      const a = this.nearestAnimal(v.x, v.z);
      if (!a) { v.why = "No animals nearby"; return this.setTask(v, { k: "idle", t: 6 }); }
      (a as any).claim = v.id; return this.setTask(v, { k: "hunt", animal: a, re: 0 });
    }
    if (role === "water") {
      const src = this.waterSource(v);
      if (!src) { v.why = "No water found"; return this.setTask(v, { k: "idle", t: 6 }); }
      return this.setTask(v, { k: "fetch", src });
    }
    if (role === "cook") {
      const c = this.slotIn("campfire", v);
      if (!c) { v.why = this.built("campfire").length ? "Campfire busy" : "Build a Campfire"; return this.setTask(v, { k: "idle", t: 6 }); }
      if (S.stock.rawMeat <= 0 && S.stock.rawWater <= 0) { v.why = "Nothing to cook or boil"; return this.setTask(v, { k: "idle", t: 5 }); }
      c.workers!.add(v.id); return this.setTask(v, { k: "work", b: c, what: "cook" });
    }
    if (role === "builder") {
      const sites = S.buildings.filter((b) => !b.built);
      if (!sites.length) { v.why = "Nothing to build"; return this.setTask(v, { k: "idle", t: 5 }); }
      sites.sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z));
      return this.setTask(v, { k: "build", b: sites[0], i: v.id % 4 });
    }
    if (role === "smith") {
      const needSpear = S.stock.spear < 2 && canPay(S.stock, PRODUCE.spear.cost);
      const needArm = S.stock.armour < 2 && canPay(S.stock, PRODUCE.armour.cost);
      const w = needSpear ? this.slotIn("workshop", v) : null, a = !w && needArm ? this.slotIn("armory", v) : null;
      const b = w || a;
      if (!b) { v.why = !this.built("workshop").length && !this.built("armory").length ? "Build a Workshop or Armory" : "Needs iron, wood or hides"; return this.setTask(v, { k: "idle", t: 6 }); }
      b.workers!.add(v.id); return this.setTask(v, { k: "work", b, what: b.type === "workshop" ? "spear" : "armour" });
    }
    if (role === "guard") {
      const tw = v.towerId != null ? S.buildings.find((b) => b.id === v.towerId && b.built) : null;
      if (tw) return this.setTask(v, { k: "tower", b: tw });
      return this.setTask(v, { k: "patrol", t: 0 });
    }
    return this.setTask(v, { k: "idle", t: 5 + this.rnd.next() * 5 });
  }

  // ------------------------------------------------------------------------------------------------ jobs: doing it
  step(v: Villager, dt: number) {
    const t = v.task, S = this.S;
    if (!t) return this.think(v);
    v.working = 0;
    switch (t.k) {
      case "idle": {
        t.t -= dt;
        if (!t.p && !v.leader) { const a = this.rnd.range(0, 6.28), d = this.rnd.range(2.5, 6); t.p = 1; this.goTo(v, DEPOT.x + Math.cos(a) * d, DEPOT.z + 1.5 + Math.sin(a) * d * 0.6); }
        this.walk(v, dt);
        if (t.t <= 0) v.task = null;
        break;
      }
      case "goto": {   // leader: walk somewhere
        if (!t.p) { t.p = 1; this.goTo(v, t.x, t.z); }
        if (this.walk(v, dt)) v.task = null;
        break;
      }
      case "deliver": {
        if (!t.p) { t.p = 1; this.goTo(v, DEPOT.x + this.rnd.range(-1, 1), DEPOT.z + 0.4); }
        if (this.walk(v, dt)) { this.deposit(v); v.task = v.leader && t.then ? t.then : null; if (v.task) { v.task.p = 0; v.task.t0 = 0; } }
        break;
      }
      case "eat": {
        if (!t.p) { t.p = 1; this.goTo(v, DEPOT.x + this.rnd.range(-1.2, 1.2), DEPOT.z + 0.6); }
        if (this.walk(v, dt)) {
          const f = this.bestFood(t.need, (t.need === "hunger" ? v.hunger : v.thirst) < 12);
          if (f) this.feed(v, f, false);
          v.task = null;
        }
        break;
      }
      case "chop": {
        const tr = t.tree;
        if (!this.trees.includes(tr)) { v.task = null; break; }
        if (!t.p) { t.p = 1; if (!this.goTo(v, tr.x, tr.z)) { tr.claim = null; v.task = null; break; } }
        if (!this.near(v, tr.x, tr.z, 1.3)) { if (this.walk(v, dt)) { t.p = 0; t.fail = (t.fail || 0) + 1; if (t.fail > 2) { tr.claim = null; tr.bad = 1; v.task = null; } } break; }
        v.path = null; this.face(v, tr.x, tr.z); v.working = 1;
        t.w = (t.w || 0) + dt;
        if (t.w >= PRODUCE.chop) {
          this.removeTree(tr, v);
          this.addCarry(v, { wood: PRODUCE.woodPerTree });
          v.task = v.leader ? { k: "deliver", then: null } : null;
        }
        break;
      }
      case "dig": {
        const n: Node = t.node;
        if (!this.land.nodes.includes(n)) { v.task = null; break; }
        if (!t.p) { t.p = 1; if (!this.goTo(v, n.x, n.z)) { v.task = null; break; } }
        if (!this.near(v, n.x, n.z, n.r + 0.9)) { if (this.walk(v, dt)) { t.p = 0; t.fail = (t.fail || 0) + 1; if (t.fail > 2) v.task = null; } break; }
        v.path = null; this.face(v, n.x, n.z); v.working = 1;
        t.w = (t.w || 0) + dt;
        const spec = n.kind === "iron" ? PRODUCE.nodeIron : PRODUCE.nodeStone;
        if (t.w >= spec.every) {
          const got = Math.min(spec.n, n.amount);
          n.amount -= got; S.nodes[n.id] = n.amount;
          this.ctx.env.spawnShards(n.x, 1.6, n.z, n.kind === "iron" ? 0x6a5040 : 0x8a857c);
          this.addCarry(v, { [n.kind]: got } as any);
          if (n.amount <= 0) { this.land.removeNode(n); this.log("A " + n.kind + " deposit is used up.", "info"); }
          v.task = v.leader ? { k: "deliver" } : null;
          n.claimed = Math.max(0, (n.claimed || 1) - 1);
        }
        break;
      }
      case "hunt": {
        const a: Animal = t.animal;
        if (!S.animals.includes(a) || a.st === "dead") { v.task = null; break; }
        const reach = ANIMALS[a.kind].r * ANIMAL_SCALE[a.kind] + 0.85;
        t.re -= dt;
        if (!this.near(v, a.x, a.z, reach)) {
          if (t.re <= 0 || !v.path || !v.path.length) { t.re = 1.2; if (!this.goTo(v, a.x, a.z)) { (a as any).claim = null; v.task = null; break; } }
          this.walk(v, dt);
          t.chase = (t.chase || 0) + dt;
          if (t.chase > 45) { (a as any).claim = null; v.task = null; }   // gave up
          break;
        }
        v.path = null; this.face(v, a.x, a.z); v.working = 2;
        t.cd = (t.cd || 0) - dt;
        if (t.cd <= 0) { t.cd = 1.0; this.strike(v, a); }
        break;
      }
      case "fetch": {
        const src = t.src;
        if (!t.p) { t.p = 1; if (!this.goTo(v, src.x, src.z)) { v.task = null; break; } }
        if (!this.near(v, src.x, src.z, src.well ? BUILD.well.r + 0.9 : 1.6)) { if (this.walk(v, dt)) { t.p = 0; t.fail = (t.fail || 0) + 1; if (t.fail > 2) v.task = null; } break; }
        v.path = null; this.face(v, src.x, src.z); v.working = 1;
        t.w = (t.w || 0) + dt;
        if (t.w >= (src.well ? PRODUCE.wellFill : PRODUCE.fill)) { this.addCarry(v, { rawWater: src.well ? PRODUCE.wellPerTrip : PRODUCE.waterPerTrip }); v.task = v.leader ? { k: "deliver" } : null; }
        break;
      }
      case "build": {
        const b: Bld = t.b;
        if (!S.buildings.includes(b) || b.built) { v.task = null; break; }
        const [sx, sz] = this.spotAt(b, t.i);
        if (!t.p) { t.p = 1; if (!this.goTo(v, sx, sz)) { v.task = null; break; } }
        if (!this.near(v, sx, sz, 0.6) && !this.near(v, b.x, b.z, BUILD[b.type].r + 1.1)) { if (this.walk(v, dt)) { t.p = 0; t.fail = (t.fail || 0) + 1; if (t.fail > 2) v.task = null; } break; }
        v.path = null; this.face(v, b.x, b.z); v.working = 1; t.busy = 1;
        b.progress += PRODUCE.build * dt;
        t.sh = (t.sh || 0) + dt; if (t.sh > 1.2) { t.sh = 0; this.ctx.env.spawnShards(b.x + this.rnd.range(-0.6, 0.6), 1.5, b.z + this.rnd.range(-0.6, 0.6), 0x8a6a40); }
        this.updateScaffold(b);
        if (b.progress >= BUILD[b.type].work) { this.finishBuilding(b); v.task = null; }
        break;
      }
      case "work": {
        const b: Bld = t.b;
        if (!S.buildings.includes(b)) { v.task = null; break; }
        const [sx, sz] = t.what === "mine" ? [b.x + Math.sin(b.rot) * (BUILD.mine.r + 0.4), b.z + Math.cos(b.rot) * (BUILD.mine.r + 0.4)] : this.spotAt(b, [...(b.workers || [])].indexOf(v.id));
        if (!t.p) { t.p = 1; if (!this.goTo(v, sx, sz)) { this.release(v); v.task = null; break; } }
        if (!this.near(v, sx, sz, 0.7)) { if (this.walk(v, dt)) { t.p = 0; t.fail = (t.fail || 0) + 1; if (t.fail > 2) { this.release(v); v.task = null; } } break; }
        v.path = null; this.face(v, b.x, b.z); v.working = 1;
        if (t.what === "mine") v.hidden = true;     // down the shaft
        t.w = (t.w || 0) + dt; t.w2 = (t.w2 || 0) + dt;
        const done = (msg?: string) => { if (msg) this.log(msg); };
        if (t.what === "farm" && t.w >= PRODUCE.breadEvery) { t.w = 0; S.stock.bread++; this.emit({ type: "stock" }); }
        if (t.what === "mine") {
          if (t.w >= PRODUCE.mineStone.every) { t.w = 0; S.stock.stone += PRODUCE.mineStone.n; this.emit({ type: "stock" }); }
          if (t.w2 >= PRODUCE.mineIron.every) { t.w2 = 0; S.stock.iron += PRODUCE.mineIron.n; this.emit({ type: "stock" }); }
        }
        if (t.what === "cook") {
          if (S.stock.rawMeat > 0 && t.w >= PRODUCE.cook) { t.w = 0; S.stock.rawMeat--; S.stock.meat++; this.emit({ type: "stock" }); }
          if (S.stock.rawWater > 0 && t.w2 >= PRODUCE.boilEvery) { t.w2 = 0; const n = Math.min(PRODUCE.boilN, S.stock.rawWater); S.stock.rawWater -= n; S.stock.water += n; this.emit({ type: "stock" }); }
          if (S.stock.rawMeat <= 0 && S.stock.rawWater <= 0) { this.release(v); v.task = null; }
        }
        if (t.what === "spear" || t.what === "armour") {
          const spec = PRODUCE[t.what];
          if (!canPay(S.stock, spec.cost)) { this.release(v); v.task = null; break; }
          if (t.w >= spec.every) { t.w = 0; pay(S.stock, spec.cost); S.stock[t.what]++; done((t.what === "spear" ? "A spear" : "A set of armour") + " is ready. Hand it out in the tent's Equipment tab."); this.release(v); v.task = null; }
        }
        // a short break now and then so needs get a look in
        t.long = (t.long || 0) + dt;
        if (t.long > 70 && v.task) { this.release(v); v.task = null; }
        break;
      }
      case "tower": {
        const b: Bld = t.b;
        if (!S.buildings.includes(b) || v.towerId !== b.id) { v.y = 0; v.task = null; break; }
        const lx = b.x + Math.sin(b.rot) * 1.3, lz = b.z + Math.cos(b.rot) * 1.3;
        if (!t.up) {
          if (!t.p) { t.p = 1; this.goTo(v, lx, lz); }
          if (!this.walk(v, dt)) break;
          t.climb = (t.climb || 0) + dt; v.y = Math.min(3.75, t.climb * 1.6); v.yaw = b.rot + Math.PI;
          v.x = lx; v.z = lz;
          if (v.y >= 3.75) { t.up = 1; v.x = b.x + Math.sin(b.rot) * 0.5; v.z = b.z + Math.cos(b.rot) * 0.5; }
          break;
        }
        v.y = 3.75; t.look = (t.look || 0) + dt; v.yaw = b.rot + Math.sin(t.look * 0.3) * 2.2;
        break;
      }
      case "patrol": {
        if (!t.p) { t.p = 1; const a = this.rnd.range(0, 6.28), d = this.rnd.range(6, 12); this.goTo(v, START.x + Math.cos(a) * d, START.z + Math.sin(a) * d); }
        if (this.walk(v, dt)) { t.t += dt; if (t.t > 4) v.task = null; }
        break;
      }
      case "sleep": {
        if (!t.p) { t.p = 1; const h = t.home; this.goTo(v, h.x + Math.sin(h.rot) * (BUILD[h.type].r + 0.3), h.z + Math.cos(h.rot) * (BUILD[h.type].r + 0.3)); }
        if (this.walk(v, dt)) v.asleep = true;
        break;
      }
    }
  }

  /** a villager hits an animal; animals without a fight in them still kick, peck and butt back */
  strike(v: Villager, a: Animal) {
    const spec = ANIMALS[a.kind];
    const dmg = v.spear ? 16 : 5;
    a.hp -= dmg;
    this.ctx.fx && this.ctx.fx.dust && this.ctx.fx.dust(a.x, 1.2, a.z, 0.4);
    if (a.hp <= 0) return this.killAnimal(a, v);
    a.st = "flee"; a.t = 2.2; a.from = v;
    // the animal fights back
    const chance = a.kind === "cow" ? 0.6 : a.kind === "sheep" ? 0.4 : 0.3;
    if (this.rnd.next() < chance) {
      const k = (v.armour ? 0.2 : 1) * (v.spear ? 0.55 : 1);
      const hurt = Math.round(spec.hit * k);
      if (hurt > 0) {
        v.hp -= hurt; v.lastHurt = this.S.time;
        if (!v.armour && !v.spear && (!(v as any).warned || this.S.time - (v as any).warned > 120)) { (v as any).warned = this.S.time; this.log(v.name + " was hurt by a " + a.kind + " (-" + hurt + "). Hunting bare-handed is dangerous: make spears and armour.", "warn"); }
        if (v.hp <= 0) this.collapse(v, "hurt");
      }
    }
  }
  killAnimal(a: Animal, by: Villager | null) {
    a.st = "dead"; a.t = 6; (a as any).claim = null;
    const spec = ANIMALS[a.kind];
    if (by) { this.addCarry(by, { rawMeat: spec.meat, ...spec.extra }); by.task = { k: "deliver" }; }
  }

  // ------------------------------------------------------------------------------------------------ needs, collapse, death, new people
  collapse(v: Villager, why: string) {
    if (v.collapsed > 0) return;
    this.release(v);
    v.hp = 0; v.collapsed = NEEDS.collapseFor; v.down = why; v.task = null; v.path = null; v.y = 0; v.carry = null; v.asleep = false;
    // they drag themselves to the front of the tent and lie down
    const down = this.S.villagers.filter((q) => q.collapsed > 0).length;
    v.x = START.x - 2.4 + (down % 6) * 0.95; v.z = START.z + 5.2 + Math.floor(down / 6) * 1.1;
    v.yaw = Math.PI / 2;
    this.log(v.name + (why === "hurt" ? " is badly hurt" : why === "sick" ? " is very sick" : " is starving") + " and lies in front of the tent. Feed them within a day or they die!", "bad");
    this.emit({ type: "collapse", v });
  }
  die(v: Villager) {
    const i = this.S.villagers.indexOf(v); if (i >= 0) this.S.villagers.splice(i, 1);
    this.release(v);
    if (v.r) { this.vGroup.remove(v.r.g); untrack(this.ctx, v.r.g); }
    this.S.buildings.forEach((b) => { if (b.guard === v.id) b.guard = undefined; });
    this.S.stats.died++;
    if (v.leader) { this.leader = null; this.log("Your leader has died. The village carries on without you...", "bad"); }
    else this.log(v.name + " has died.", "bad");
    if (this.sel === v.id) this.sel = -1;
  }

  needs(v: Villager, dt: number) {
    const N2 = NEEDS;
    const work = v.task && (v.task.k === "build" ? N2.buildMul : v.working ? N2.workMul : 1) || 1;
    const mul = v.asleep ? N2.sleepMul : work;
    v.hunger = Math.max(0, v.hunger - N2.hunger * mul * dt);
    v.thirst = Math.max(0, v.thirst - N2.thirst * mul * dt);
    if (v.collapsed > 0) {
      v.collapsed -= dt; v.sick = Math.max(0, v.sick - dt);
      if (v.down !== "hurt" && v.hunger >= 20 && v.thirst >= 20) this.revive(v);   // the badly hurt need to be fed by hand
      else if (v.collapsed <= 0) this.die(v);
      return;
    }
    if (v.sick > 0) { v.sick -= dt; v.hp -= N2.sickDrain * dt; }
    if (v.hunger <= 0 || v.thirst <= 0) v.hp -= N2.starve * dt * ((v.hunger <= 0 ? 1 : 0) + (v.thirst <= 0 ? 1 : 0));
    else if (v.hunger > 50 && v.thirst > 50 && v.sick <= 0) v.hp = Math.min(100, v.hp + N2.regen * dt);
    if (v.hp <= 0) this.collapse(v, v.sick > 0 ? "sick" : "starve");
  }

  /** every dawn: people sleep less, someone new may join */
  dawn() {
    const S = this.S, pop = S.villagers.length;
    S.villagers.forEach((v) => { v.asleep = false; if (v.task && v.task.k === "sleep") v.task = null; });
    const food = S.stock.bread + S.stock.meat, avgH = S.villagers.reduce((s, v) => s + v.hunger, 0) / Math.max(1, pop);
    if (pop < this.beds() && food >= Math.ceil(pop / 2) && avgH > 45) {
      const v = this.newVillager();
      const a = this.rnd.range(0, 6.28); v.x = START.x + Math.cos(a) * 24; v.z = START.z + Math.sin(a) * 24;
      if (!this.land.walkable(v.x, v.z)) { v.x = DEPOT.x; v.z = DEPOT.z + 2; }
      v.r.g.position.set(v.x, 1, v.z);
      S.stats.born++;
      this.log(v.name + " has joined your village! Give them a job in the tent.", "good");
    } else if (pop >= this.beds() && this.day() % 2 === 0) this.log("All beds are taken. Build a House so more people can join.", "info");
    this.emit({ type: "dawn", day: this.day() });
  }

  goToBed() {
    const homes = [this.tent(), ...this.built("house")];
    const cap = new Map<any, number>();
    for (const v of this.S.villagers) {
      if (v.leader || v.collapsed > 0 || (v.role === "guard" && v.towerId != null)) continue;
      if (v.task && v.task.k === "sleep") continue;
      if (v.carry) this.deposit(v);
      const h = homes.find((b) => (cap.get(b) || 0) < (BUILD[b.type].beds || 0)) || homes[0];
      cap.set(h, (cap.get(h) || 0) + 1);
      this.setTask(v, { k: "sleep", home: h });
    }
  }

  // ------------------------------------------------------------------------------------------------ leader orders
  order(kind: string, target: any) {
    const v = this.leader; if (!v || v.collapsed > 0) return;
    if (v.carry && kind !== "goto") this.deposit(v);   // hands free first
    if (kind === "goto") this.setTask(v, { k: "goto", x: target.x, z: target.z });
    else if (kind === "chop") { if (target.grow) return this.log("That tree is still growing.", "info"); target.claim = v.id; this.setTask(v, { k: "chop", tree: target }); }
    else if (kind === "dig") { target.claimed = (target.claimed || 0) + 1; this.setTask(v, { k: "dig", node: target }); }
    else if (kind === "hunt") { target.claim = v.id; this.setTask(v, { k: "hunt", animal: target, re: 0 }); }
    else if (kind === "fetch") this.setTask(v, { k: "fetch", src: target });
    else if (kind === "build") this.setTask(v, { k: "build", b: target, i: 3 });
  }

  // ------------------------------------------------------------------------------------------------ animals
  spawnAnimal(kind: AnimalKind, anywhere: boolean) {
    const land = this.land;
    for (let tries = 0; tries < 60; tries++) {
      const x = this.rnd.range(12, N - 12), z = this.rnd.range(12, N - 12);
      const zn = land.zone[Math.floor(z) * N + Math.floor(x)];
      if (zn === 2 || !land.walkable(x, z) || land.dWater[Math.floor(z) * N + Math.floor(x)]! < 2) continue;
      if (zn === 1 && this.rnd.next() < 0.7) continue;           // they like the meadows
      if (Math.hypot(x - START.x, z - START.z) < (anywhere ? 16 : 40)) continue;
      // herds: put it near another of its kind when there is one
      const mate = this.S.animals.find((a) => a.kind === kind && a.st !== "dead" && this.rnd.next() < 0.4);
      let ax = x, az = z;
      if (mate) { ax = mate.x + this.rnd.range(-3, 3); az = mate.z + this.rnd.range(-3, 3); if (!land.walkable(ax, az)) { ax = x; az = z; } }
      const a: Animal = { id: this.S.nextId++, kind, x: ax, z: az, yaw: this.rnd.range(0, 6.28), hp: ANIMALS[kind].hp, st: "graze", tx: ax, tz: az, t: this.rnd.range(1, 6) };
      this.S.animals.push(a);
      this.makeAnimalRig(a);
      return a;
    }
    return null;
  }
  makeAnimalRig(a: Animal) {
    const rig = animalModel(this.ctx, a.kind, a.id % 3);
    rig.group.scale.setScalar(ANIMAL_SCALE[a.kind]);
    rig.group.position.set(a.x, 1, a.z); rig.group.rotation.y = a.yaw;
    rig.group.traverse((o: any) => (o.userData.animal = a));
    this.aGroup.add(rig.group);
    a.r = rig; a.ph = Math.random() * 6; a.amp = 0;
    if (a.st === "dead") rig.group.rotation.z = Math.PI / 2;
  }
  removeAnimal(a: Animal) {
    const i = this.S.animals.indexOf(a); if (i >= 0) this.S.animals.splice(i, 1);
    if (a.r) { this.aGroup.remove(a.r.group); untrack(this.ctx, a.r.group); }
  }
  private animalTimer = 0;
  updateAnimals(dt: number) {
    const land = this.land;
    for (const a of this.S.animals.slice()) {
      if (a.st === "dead") { a.t -= dt; if (a.r) { a.r.group.rotation.z = Math.min(Math.PI / 2, a.r.group.rotation.z + dt * 4); if (a.t < 1) a.r.group.position.y = 1 - (1 - a.t) * 0.6; } if (a.t <= 0) this.removeAnimal(a); continue; }
      const spec = ANIMALS[a.kind];
      let sp = 0;
      a.t -= dt;
      if (a.st === "flee") {
        const f = a.from; let dx = a.x - (f ? f.x : a.x + 1), dz = a.z - (f ? f.z : a.z); const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        a.tx = a.x + dx * 4; a.tz = a.z + dz * 4; sp = spec.speed * 1.15;
        if (a.t <= 0) { a.st = "wander"; a.t = 2; }
      } else if (a.st === "graze") { if (a.t <= 0) { a.st = "wander"; const r = this.rnd.range(3, 9), an = this.rnd.range(0, 6.28); a.tx = a.x + Math.cos(an) * r; a.tz = a.z + Math.sin(an) * r; a.t = 12; } }
      else { sp = spec.speed * 0.32; if (Math.hypot(a.tx - a.x, a.tz - a.z) < 0.4 || a.t <= 0) { a.st = "graze"; a.t = this.rnd.range(3, 10); } }
      // villagers nearby make them nervous (hunters are spotted from farther)
      if (a.st !== "flee") for (const v of this.S.villagers) { if (v.asleep || v.collapsed > 0) continue; const d = Math.hypot(v.x - a.x, v.z - a.z); if (d < (v.task && v.task.animal === a ? 3.2 : 1.6)) { a.st = "flee"; a.from = v; a.t = 1.6; break; } }
      if (sp > 0) {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const nx = a.x + (dx / d) * sp * dt, nz = a.z + (dz / d) * sp * dt;
          if (land.walkable(nx, nz) && land.dWater[Math.floor(nz) * N + Math.floor(nx)]! > 0.8) { a.x = nx; a.z = nz; a.ph! += sp * dt * (a.kind === "chicken" ? 14 : 5); }
          else { const an = this.rnd.range(0, 6.28); a.tx = a.x + Math.cos(an) * 5; a.tz = a.z + Math.sin(an) * 5; if (a.st === "flee") a.from = { x: a.x - Math.cos(an), z: a.z - Math.sin(an) }; }
          const want = Math.atan2(dx, dz); let dy = want - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.yaw += dy * Math.min(1, dt * 6);
        }
      }
      a.amp = a.amp! + ((sp > 0 ? 1 : 0) - a.amp!) * Math.min(1, dt * 6);
    }
    // a few new animals wander in from the wild when numbers are low
    this.animalTimer += dt;
    if (this.animalTimer > 25) {
      this.animalTimer = 0;
      for (const k of Object.keys(ANIMAL_CAP) as AnimalKind[]) if (this.S.animals.filter((a) => a.kind === k && a.st !== "dead").length < ANIMAL_CAP[k]) this.spawnAnimal(k, false);
    }
  }
  drawAnimals(rdt: number, camX: number, camZ: number) {
    const t = this.ctx.rtime;
    for (const a of this.S.animals) {
      const r = a.r; if (!r) continue;
      r.group.position.x = a.x; r.group.position.z = a.z; if (a.st !== "dead") r.group.position.y = 1;
      r.group.rotation.y = a.yaw;
      const far = Math.abs(a.x - camX) > 70 || Math.abs(a.z - camZ) > 70;
      r.group.visible = !far;
      if (far || a.st === "dead") continue;
      const sw = Math.sin(a.ph!) * a.amp!;
      r.legs.forEach((l: any, i: number) => (l.rotation.x = sw * (i % 2 === (i < 2 ? 0 : 1) ? 0.7 : -0.7)));
      if (a.kind === "chicken") { r.legs[0].rotation.x = sw * 0.9; r.legs[1].rotation.x = -sw * 0.9; }
      const graze = a.st === "graze" ? 1 : 0;
      r.head.rotation.x = graze * (0.7 + 0.15 * Math.sin(t * 3 + a.id)) * (a.kind === "chicken" ? 1.2 : 1) - (a.kind === "chicken" ? Math.abs(sw) * 0.3 : 0);
      r.body.position.y = r.body.userData.y0 ?? (r.body.userData.y0 = r.body.position.y);
      r.body.position.y = r.body.userData.y0 + Math.abs(Math.cos(a.ph!)) * 0.03 * a.amp!;
      if (r.tail) r.tail.rotation.z = Math.sin(t * 2.2 + a.id) * 0.35;
    }
  }

  // ------------------------------------------------------------------------------------------------ the main tick
  update(dt: number) {
    const S = this.S;
    S.time += dt;
    const c = this.cyc();
    if (c < this.lastCyc) this.dawn();
    if (this.lastCyc <= 0.55 && c > 0.55) { this.goToBed(); this.log("Night falls. Your people go to sleep (⏩ to skip the night).", "info"); this.emit({ type: "night" }); }
    this.lastCyc = c;
    const night = this.isNight();
    for (const v of S.villagers.slice()) {
      if (!S.villagers.includes(v)) continue;
      v.hidden = false;
      this.needs(v, dt);
      if (!S.villagers.includes(v) || v.collapsed > 0) continue;
      if (v.asleep) continue;
      if (night && !v.leader && !(v.task && v.task.k === "sleep") && !(v.role === "guard" && v.towerId != null)) { this.goToBed(); }
      this.step(v, dt);
      if (v.task && v.task.k !== "tower" && v.y) v.y = 0;
    }
    this.updateAnimals(dt);
    this.updateTrees(dt);
  }

  /** visuals: once per rendered frame */
  draw(rdt: number, camX: number, camZ: number) {
    const t = this.ctx.rtime;
    for (const v of this.S.villagers) {
      const R = v.r; if (!R) continue;
      const key = this.toolFor(v) + (v.armour ? "A" : "");
      if (key !== R.key) { this.makeRig(v); continue; }
      const g = R.g;
      g.visible = !v.asleep && !v.hidden;
      // smooth position and turn
      g.position.x += (v.x - g.position.x) * Math.min(1, rdt * 14);
      g.position.z += (v.z - g.position.z) * Math.min(1, rdt * 14);
      if (Math.hypot(v.x - g.position.x, v.z - g.position.z) > 3) { g.position.x = v.x; g.position.z = v.z; }
      g.position.y = 1 + (v.y || 0);
      let dy = v.yaw - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, rdt * 10);
      R.ring.visible = this.sel === v.id || (v.leader && this.sel === -1);
      R.ring.material = this.ringMat;
      // icon over the head: what matters most
      const ic = v.collapsed > 0 ? "🆘" : v.sick > 0 ? "🤢" : v.hunger < 25 ? "🍞" : v.thirst < 25 ? "💧" : v.why ? "❔" : "";
      if (ic !== R.icTxt) { R.icTxt = ic; R.ic.visible = !!ic; if (ic) R.ic.material = this.icon(ic); }
      R.ic.position.y = v.collapsed > 0 ? 0.7 : 1.42;
      this.setLoad(v);
      // lying down
      if (v.collapsed > 0) { R.inner.rotation.x = -Math.PI / 2; R.inner.position.set(0, 0.16, -0.45); R.legLP.rotation.x = R.legRP.rotation.x = 0; R.armLP.rotation.x = R.armRP.rotation.x = 0.2; R.headP.rotation.y = Math.sin(t * 0.7 + v.id) * 0.2; continue; }
      R.inner.rotation.x = 0; R.inner.position.set(0, 0, 0);
      const moved = v.moved || 0; v.moved = 0;
      const sp = moved / Math.max(rdt, 0.001);
      R.amp += ((sp > 0.2 ? 1 : 0) - R.amp) * Math.min(1, rdt * 10);
      R.ph += moved * 5.5;
      const sw = Math.sin(R.ph) * R.amp;
      R.legLP.rotation.x = sw * 0.85; R.legRP.rotation.x = -sw * 0.85;
      R.armLP.rotation.x = -sw * 0.6; R.armRP.rotation.x = sw * 0.6;
      R.armLP.rotation.z = 0.06; R.armRP.rotation.z = -0.06;
      R.body.rotation.x = 0.07 * R.amp; R.body.rotation.y = 0;
      R.headP.rotation.y = Math.sin(t * 0.55 + v.id) * 0.28 * (1 - R.amp);
      if (v.working && R.amp < 0.3) {
        const k = v.working === 2 ? 4.5 : v.role === "farmer" ? 2.4 : 3.4;
        const s = Math.sin(t * k + v.id);
        if (v.role === "water" || (v.task && v.task.k === "fetch")) { R.body.rotation.x = 0.5 + 0.1 * s; R.armRP.rotation.x = -0.9 + 0.3 * s; R.armLP.rotation.x = -0.6; }
        else if (v.task && v.task.what === "cook") { R.armRP.rotation.x = -0.9 + 0.25 * s; R.armRP.rotation.z = -0.3 + 0.2 * Math.cos(t * k); R.body.rotation.x = 0.2; }
        else { R.armRP.rotation.x = -1.6 - 0.9 * s; R.armLP.rotation.x = -0.9 - 0.5 * s; R.body.rotation.x = 0.12 + 0.14 * s; }
      }
      if (v.task && v.task.k === "tower" && !v.task.up && v.y) { R.armLP.rotation.x = -2.6 + Math.sin(t * 8) * 0.4; R.armRP.rotation.x = -2.6 - Math.sin(t * 8) * 0.4; R.legLP.rotation.x = Math.sin(t * 8) * 0.5; R.legRP.rotation.x = -Math.sin(t * 8) * 0.5; }
    }
    this.drawAnimals(rdt, camX, camZ);
  }

  // ------------------------------------------------------------------------------------------------ save
  serialize(): string {
    const S = this.S;
    S.trees = this.trees.map((t) => [Math.round(t.x * 100) / 100, Math.round(t.z * 100) / 100, t.kind, Math.round(t.age)] as any);
    const clean = (v: Villager) => { const o: any = {}; for (const k of ["id", "name", "seed", "leader", "x", "z", "yaw", "hp", "hunger", "thirst", "sick", "role", "towerId", "spear", "armour", "carry", "collapsed", "down"]) o[k] = (v as any)[k]; return o; };
    const out = {
      ...S,
      villagers: S.villagers.map(clean),
      buildings: S.buildings.map((b) => ({ id: b.id, type: b.type, x: b.x, z: b.z, rot: b.rot, built: b.built, progress: b.progress, seed: b.seed, guard: b.guard })),
      animals: S.animals.filter((a) => a.st !== "dead").map((a) => ({ id: a.id, kind: a.kind, x: a.x, z: a.z, yaw: a.yaw, hp: a.hp, st: "graze", tx: a.x, tz: a.z, t: 3 })),
    };
    return JSON.stringify(out);
  }

  dispose() {
    this.ctx.scene.remove(this.root);
    this.ringGeo.dispose(); this.ringMat.dispose();
    this.iconCache.forEach((m) => { m.map.dispose(); m.dispose(); });
    this.toolCache.forEach((p) => p.forEach((x: any) => x.geo.dispose()));
    this.loadMats && this.loadMats.forEach((m: any) => m.dispose());
    this.boxGeo && this.boxGeo.dispose();
  }
}
