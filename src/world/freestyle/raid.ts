// @ts-nocheck
import { Rng, clamp, fbm } from "../infinite/rng";
import { MB, applyTier } from "../infinite/mb";
import { PAL } from "../infinite/props";
import { jungleFloorTexture } from "../infinite/tex";
import { untrack } from "./models";
import { buildingModel } from "./models";
import { FsGame, DEPOT, type Villager } from "./game";
import { START, N } from "./land";
import { RES_INFO, BUILD, costText, type Cost, type Res, type BType } from "./data";
import { DAY_LENGTH } from "./ctx";

/**
 * Raids. Fifteen villages to raid (five easy, five medium, five hard), each described with what it has and a faded picture of it.
 * A raid is fought on its own map: your raiders against the defenders and the manned towers; win and you carry the loot home.
 * A raid always brings one counter-raid: a warning names the day (7 to 12 days later) and who is coming. Until you raid, nobody attacks.
 */
type Diff = "easy" | "medium" | "hard";
export interface Scenario {
  id: number; diff: Diff; name: string; theme: "meadow" | "lake" | "forest" | "hill" | "river";
  buildings: Partial<Record<BType, number>>; towers: number; def: number; spears: number; armour: number; hp: number;
  loot: Cost; blurb: string; color: number;
}
const S_ = (id: number, diff: Diff, name: string, theme: any, buildings: any, towers: number, def: number, spears: number, armour: number, loot: Cost, blurb: string, color: number): Scenario =>
  ({ id, diff, name, theme, buildings, towers, def, spears, armour, hp: diff === "easy" ? 60 : diff === "medium" ? 80 : 100, loot, blurb, color });
export const SCENARIOS: Scenario[] = [
  S_(1, "easy", "Shepherds' Hamlet", "meadow", { house: 2 }, 0, 3, 0, 0, { wool: 6, bread: 8, meat: 4 }, "A few shepherds in the open meadow. No towers, no weapons.", 0x8a6a3a),
  S_(2, "easy", "Fishers by the Lake", "lake", { house: 2, well: 1 }, 0, 3, 1, 0, { water: 10, meat: 6, wood: 20 }, "Fishermen on a lake shore. One of them keeps a spear.", 0x3a6a8a),
  S_(3, "easy", "Woodcutters' Camp", "forest", { house: 1, workshop: 1 }, 0, 4, 1, 0, { wood: 40, spear: 1 }, "A camp deep in the forest, piled with timber.", 0x5a7a3a),
  S_(4, "easy", "Little Farm", "meadow", { house: 1, farm: 1 }, 1, 3, 0, 0, { bread: 15, wool: 2 }, "One family farm with a single watchtower.", 0xa08a3a),
  S_(5, "easy", "Hill Miners", "hill", { house: 1, mine: 1 }, 1, 4, 2, 0, { stone: 30, iron: 6 }, "Miners on a rocky hill. They have picks and two spears.", 0x6a6a6a),
  S_(6, "medium", "River Crossing", "river", { house: 3, market: 1 }, 1, 6, 3, 1, { iron: 8, bread: 12, wool: 4 }, "A toll village at a bridge, rich from trade.", 0x2a5a9a),
  S_(7, "medium", "Millers' Village", "meadow", { house: 3, farm: 2 }, 2, 6, 2, 1, { bread: 25, wood: 20 }, "Two big farms and full granaries, watched from two towers.", 0xb08a2a),
  S_(8, "medium", "Forest Stockade", "forest", { house: 2, workshop: 1, armory: 1 }, 2, 7, 4, 2, { spear: 2, armour: 1, iron: 6 }, "Hunters who make their own weapons. Well armed.", 0x3a5a2a),
  S_(9, "medium", "Market Town", "lake", { house: 4, market: 1, well: 1 }, 1, 8, 3, 1, { iron: 10, water: 10, bread: 10, hide: 4 }, "A busy lakeside market. Many people, few soldiers.", 0x8a3a6a),
  S_(10, "medium", "Quarry Folk", "hill", { house: 3, mine: 2 }, 2, 7, 3, 2, { stone: 50, iron: 14 }, "Two mines cut into the hill, and stubborn miners.", 0x5a5a62),
  S_(11, "hard", "Lakeside Stronghold", "lake", { house: 5, armory: 1 }, 3, 10, 6, 4, { iron: 18, armour: 2, meat: 12 }, "A fortified town on the water with an armory.", 0x2a3a7a),
  S_(12, "hard", "Ironworks", "hill", { house: 4, mine: 2, workshop: 1, armory: 1 }, 4, 11, 7, 5, { iron: 30, spear: 3 }, "The iron of the whole region comes from here. Heavily guarded.", 0x4a4a52),
  S_(13, "hard", "Grain Lords", "meadow", { house: 6, farm: 3, market: 1 }, 3, 12, 6, 4, { bread: 40, wool: 10, hide: 6 }, "Wealthy landowners with many servants under arms.", 0xc0902a),
  S_(14, "hard", "Watchers of the Ridge", "hill", { house: 4 }, 5, 10, 8, 6, { iron: 20, stone: 40, armour: 2 }, "Five towers on a ridge. Archers see you coming from far.", 0x6a2a2a),
  S_(15, "hard", "The Old Capital", "river", { house: 7, market: 1, armory: 1, workshop: 1 }, 4, 14, 10, 8, { iron: 35, bread: 30, spear: 4, armour: 3, wood: 60 }, "The richest town of all. Its army is the best armed.", 0x7a1a2a),
];
const DIFF_NAME: Record<Diff, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const BC = { x: 128, z: 128 };      // the battle map is built where the home land is (the home land is hidden meanwhile)
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);

interface Fighter { id: number; side: "us" | "them"; x: number; z: number; yaw: number; hp: number; max: number; spear: boolean; armour: boolean; cd: number; swing: number; target?: any; v?: Villager; R?: any; moved: number; tx?: number; tz?: number; down?: boolean; tower?: any; guard?: boolean; seed: number }

export class FsRaid {
  g: FsGame; ctx: any; land: any; field: any; ui: any; api: any;
  diff: Diff = "easy"; pick: number | null = null; chosen = new Set<number>();
  previews = new Map<number, string>();
  battle: any = null;        // the battle in progress (raid on another village)
  attack: any = null;        // a counter-raid on your village in progress
  private arrowGeo: any; private arrowMat: any; arrows: any[] = [];
  private fid = 1;

  constructor(g: FsGame, land: any, field: any, ui: any, api: any) {
    this.g = g; this.ctx = g.ctx; this.land = land; this.field = field; this.ui = ui; this.api = api;
    const T = g.T;
    this.arrowGeo = new T.BoxGeometry(0.04, 0.04, 0.6); this.arrowMat = new T.MeshLambertMaterial({ color: 0x5a3d24 });
    const R = g.S.raid || (g.S.raid = { done: 0, pending: null, history: [] });
    if (!R.history) R.history = [];
    ui.raid = this;
  }

  // ------------------------------------------------------------------------------------------------ the Raid tab
  render() {
    const g = this.g, S = g.S, R = S.raid;
    if (this.battle) return `<p>A raid is under way.</p>`;
    const list = SCENARIOS.filter((s) => s.diff === this.diff);
    this.makePreviews(list);
    const tabs = (["easy", "medium", "hard"] as Diff[]).map((d) => `<button class="fs-tab${this.diff === d ? " on" : ""}" data-a="rdiff" data-d="${d}">${DIFF_NAME[d]}</button>`).join("");
    const warn = R.pending ? `<div class="fs-alert">⚔️ <b>${esc(R.pending.from)}</b> will raid you on <b>day ${R.pending.day}</b> (in ${Math.max(0, R.pending.day - g.day())} days): ${esc(R.pending.desc)}. Build towers, put guards on them, make spears and armour.</div>`
      : R.done ? `<p class="fs-small">Nobody is coming for you right now. Raid again and they will answer.</p>` : `<p class="fs-small">Nobody will attack you unless you raid first. Every raid brings one counter-raid 7 to 12 days later.</p>`;
    const cards = list.map((s) => {
      const done = (R.history || []).filter((h: any) => h.id === s.id && h.won).length;
      const b = Object.keys(s.buildings).map((k) => `${s.buildings[k as BType]} ${BUILD[k as BType].name.toLowerCase()}${s.buildings[k as BType]! > 1 ? "s" : ""}`).join(", ");
      return `<div class="fs-rc${this.pick === s.id ? " on" : ""}" data-a="rpick" data-id="${s.id}">
        <div class="fs-rc-t"><b>${esc(s.name)}</b>${done ? ` <span class="fs-small">· raided ${done}×</span>` : ""}
          <p class="fs-small">${esc(s.blurb)}</p>
          <ul><li>🏠 ${b}</li><li>🗼 ${s.towers} tower${s.towers === 1 ? "" : "s"}${s.towers ? " (manned)" : ""}</li><li>⚔️ ${s.def} defenders: ${s.spears} with spears, ${s.armour} in armour</li><li>💰 Loot: ${costText(s.loot)}</li></ul></div>
        <div class="fs-rc-p" style="background-image:url(${this.previews.get(s.id) || ""})"></div></div>`;
    }).join("");
    let go = "";
    if (this.pick != null) {
      const s = SCENARIOS.find((q) => q.id === this.pick)!;
      const able = S.villagers.filter((v) => v.collapsed <= 0 && !(v.towerId != null));
      const n = [...this.chosen].filter((id) => able.some((v) => v.id === id)).length;
      const need = { bread: n, water: n };
      go = `<div class="fs-rgo"><b>Raiding party for ${esc(s.name)}</b>
        <div class="fs-rlist">${able.map((v) => `<label class="fs-rv"><input type="checkbox" data-a="rsel" data-vid="${v.id}" ${this.chosen.has(v.id) ? "checked" : ""}> ${v.leader ? "👑 " : ""}${esc(v.name)} <span class="fs-small">${v.spear ? "🗡️" : ""}${v.armour ? "🛡️" : ""} ❤️${Math.round(v.hp)}</span></label>`).join("")}</div>
        <p class="fs-small">Each raider takes 1 bread and 1 boiled water for the road (${n} + ${n}). Raiders without spears hit weakly; armour keeps them standing. Anyone knocked down comes home hurt and lies in front of the tent.</p>
        <div class="fs-row"><button class="fs-b red" data-a="rgo" ${n && S.stock.bread >= n && S.stock.water >= n ? "" : "disabled"}>⚔️ Raid with ${n}</button><button class="fs-b sm" data-a="rall">Pick the strongest</button>${n && (S.stock.bread < n || S.stock.water < n) ? `<span class="fs-red">Not enough bread or water</span>` : ""}</div></div>`;
    }
    return `${warn}<div class="fs-tabs fs-rtabs">${tabs}</div><div class="fs-rcs">${cards}</div>${go}`;
  }
  onClick(a: string, el: HTMLElement) {
    const S = this.g.S;
    if (a === "rdiff") { this.diff = el.getAttribute("data-d") as Diff; this.pick = null; this.ui.renderModal(true); }
    else if (a === "rpick") { this.pick = +el.getAttribute("data-id")!; this.ui.renderModal(true); }
    else if (a === "rall") {
      this.chosen.clear();
      S.villagers.filter((v) => v.collapsed <= 0 && v.towerId == null).sort((p, q) => (+q.spear + +q.armour) * 50 + q.hp - ((+p.spear + +p.armour) * 50 + p.hp)).slice(0, Math.min(8, Math.max(1, S.villagers.length - 2))).forEach((v) => this.chosen.add(v.id));
      this.ui.renderModal(true);
    } else if (a === "rgo") this.start();
  }
  onChange(a: string, el: HTMLElement) {
    if (a === "rsel") { const id = +el.getAttribute("data-vid")!; if ((el as HTMLInputElement).checked) this.chosen.add(id); else this.chosen.delete(id); this.ui.renderModal(true); }
  }

  // ------------------------------------------------------------------------------------------------ the enemy village (also drawn small for the pictures)
  /** Lay out a village: buildings in a ring, towers outside them, a ground patch in the theme. Returns positions so the battle can use them. */
  layout(s: Scenario) {
    const rnd = new Rng(s.id * 977 + 13), out: any[] = [];
    const types: BType[] = [];
    Object.keys(s.buildings).forEach((k) => { for (let i = 0; i < s.buildings[k as BType]!; i++) types.push(k as BType); });
    types.forEach((t, i) => {
      const a = (i / Math.max(1, types.length)) * Math.PI * 2 + rnd.range(-0.2, 0.2), r = types.length <= 2 ? 5 : 6 + types.length * 0.55;
      out.push({ type: t, x: BC.x + Math.cos(a) * r, z: BC.z + Math.sin(a) * r, rot: -a + Math.PI / 2 + Math.PI });
    });
    for (let i = 0; i < s.towers; i++) {
      const a = (i / s.towers) * Math.PI * 2 + 0.6, r = (types.length <= 2 ? 5 : 6 + types.length * 0.55) + 6;
      out.push({ type: "tower", x: BC.x + Math.cos(a) * r, z: BC.z + Math.sin(a) * r, rot: rnd.range(0, 6) });
    }
    out.push({ type: "campfire", x: BC.x, z: BC.z, rot: 0 });
    return out;
  }
  /** ground, water, rocks and trees of a battle map */
  ground(s: Scenario, parent: any, big: boolean) {
    const T = this.g.T, rnd = new Rng(s.id * 31 + 7), size = big ? 110 : 60;
    const base = { meadow: 0x5e9a3e, lake: 0x5a9440, forest: 0x3e7d31, hill: 0x7d7a5e, river: 0x5a943e }[s.theme];
    const geo = new T.PlaneGeometry(size, size, 44, 44); geo.rotateX(-Math.PI / 2);
    const col: number[] = [], c = new T.Color(), c2 = new T.Color(0x86b552), c3 = new T.Color(0x6b5232);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); c.setHex(base).lerp(c2, fbm(x * 0.05, z * 0.05, s.id, 3) * 0.5).lerp(c3, Math.max(0, fbm(x * 0.1 + 9, z * 0.1, s.id + 2, 2) - 0.55)); col.push(c.r, c.g, c.b); }
    geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const tex = jungleFloorTexture(T); tex.repeat.set(size / 6, size / 6);
    const gm = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: tex, color: 0xe8f4d8 })); gm.position.set(BC.x, 1, BC.z); gm.receiveShadow = true; gm.userData.noShadowCast = true;
    gm.userData.tex = tex;
    parent.add(gm);
    const mb = new MB(T, s.id * 7 + 3); mb.ao = { y0: 1, h: 1, k: 0.25 };
    const blocked: Array<[number, number, number]> = [];
    if (s.theme === "lake") { mb.box(0x2f6f9a, 22, 0.05, 14, BC.x - 4, 1.02, BC.z - 22, 0, 0, 0, { noAO: true }); mb.box(0xd5c08a, 24, 0.03, 16, BC.x - 4, 1.01, BC.z - 22, 0, 0, 0, { noAO: true }); blocked.push([BC.x - 4, BC.z - 22, 11]); }
    if (s.theme === "river") { mb.box(0x2f6f9a, 4, 0.05, size, BC.x + 20, 1.02, BC.z, 0, 0, 0, { noAO: true }); for (let k = 0; k < 12; k++) mb.box(PAL.plank[k % 4], 0.36, 0.1, 3, BC.x + 18.2 + k * 0.33, 1.08, BC.z - 26, 0, 0, 0); blocked.push([BC.x + 20, BC.z, 0]); }
    const nTrees = s.theme === "forest" ? 90 : s.theme === "meadow" ? 22 : 40, nRocks = s.theme === "hill" ? 40 : 8;
    const free = (x: number, z: number, r: number) => Math.hypot(x - BC.x, z - BC.z) > r && !(s.theme === "lake" && Math.abs(x - BC.x + 4) < 13 && Math.abs(z - BC.z + 22) < 9) && !(s.theme === "river" && Math.abs(x - BC.x - 20) < 4);
    for (let i = 0; i < nTrees; i++) {
      const x = BC.x + rnd.range(-size / 2 + 3, size / 2 - 3), z = BC.z + rnd.range(-size / 2 + 3, size / 2 - 3);
      if (!free(x, z, 19) || Math.hypot(x - BC.x, z - (BC.z + 34)) < 9) continue;
      const h = rnd.range(1.6, 2.8), w = rnd.range(1.3, 2.1);
      mb.box(PAL.wood[i % 3], 0.32, h, 0.32, x, 1 + h / 2, z);
      mb.box(rnd.pick([0x2f6a2a, 0x3a7a30, 0x2a5a26]), w, w * 0.8, w, x, 1 + h + w * 0.3, z, 0, rnd.range(0, 1.5), 0, { jit: 0.08 });
      mb.box(rnd.pick([0x3f7a32, 0x4a8a3a]), w * 0.6, w * 0.5, w * 0.6, x, 1 + h + w * 0.8, z, 0, rnd.range(0, 1.5), 0, { tier: 1 });
      blocked.push([x, z, 0.6]);
    }
    // grass tufts and flowers, like the home meadows
    for (let i = 0; i < (big ? 1100 : 160); i++) {
      const x = BC.x + rnd.range(-size / 2 + 1, size / 2 - 1), z = BC.z + rnd.range(-size / 2 + 1, size / 2 - 1);
      if (!free(x, z, 3)) continue;
      const h = rnd.range(0.25, 0.55);
      for (let k = 0; k < 3; k++) mb.box(rnd.pick([0x4f8a34, 0x5e9a3e, 0x6fa54a, 0x3e7d31]), 0.11, h * (1 - k * 0.2), 0.11, x + (k - 1) * 0.1, 1 + h * (1 - k * 0.2) / 2, z + (k % 2) * 0.08, 0, rnd.range(0, 3), (k - 1) * 0.3, { tier: k ? 1 : 0, noAO: true, mat: "sway", sway: 0.6, swayY0: 1, swayH: 0.5 });
      if (rnd.next() < 0.18) mb.box(rnd.pick([0xf0c040, 0xe86aa8, 0xffffff, 0xd8283a]), 0.08, 0.08, 0.08, x, 1 + h + 0.03, z, 0, 0, 0, { tier: 2, noAO: true });
    }
    for (let i = 0; i < nRocks; i++) {
      const x = BC.x + rnd.range(-size / 2 + 3, size / 2 - 3), z = BC.z + rnd.range(-size / 2 + 3, size / 2 - 3);
      if (!free(x, z, 17)) continue;
      const k = rnd.range(0.6, 1.5); mb.box(rnd.pick(PAL.stone), k * 1.4, k, k * 1.2, x, 1 + k / 2, z, 0, rnd.range(0, 3), 0); blocked.push([x, z, k * 0.8]);
    }
    const g = mb.build(this.ctx.mats, true); parent.add(g); applyTier(g, this.ctx.gfx.f.tier);
    return blocked;
  }

  /** a picture of each village (rendered once, shown faded to the right of its description) */
  makePreviews(list: Scenario[]) {
    const todo = list.filter((s) => !this.previews.has(s.id));
    if (!todo.length) return;
    const T = this.g.T, ctx = this.ctx, r = ctx.renderer, W = 360, H = 220;
    const rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
    const cam = new T.PerspectiveCamera(42, W / H, 1, 300);
    const buf = new Uint8Array(W * H * 4), cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c2 = cv.getContext("2d")!, img = c2.createImageData(W, H);
    const oldTarget = r.getRenderTarget(), oldShadow = r.shadowMap.enabled;
    for (const s of todo) {
      const sc = new T.Scene(); sc.background = new T.Color(0x9cc8e0);
      const hemi = new T.HemisphereLight(0xdfefff, 0x4a3a2a, 1.3), sun = new T.DirectionalLight(0xfff0d0, 1.6); sun.position.set(BC.x + 30, 60, BC.z + 20); sun.target.position.set(BC.x, 0, BC.z);
      sc.add(hemi, sun, sun.target);
      const holder = new T.Group(); sc.add(holder);
      this.ground(s, holder, false);
      for (const b of this.layout(s)) { const o = new T.Group(); o.position.set(b.x, 1, b.z); o.rotation.y = b.rot; holder.add(o); buildingModel(ctx, b.type, s.id * 100 + b.x | 0, o, s.color); }
      cam.position.set(BC.x + 16, 26, BC.z + 26); cam.lookAt(BC.x, 1, BC.z + 1);
      r.shadowMap.enabled = false;
      r.setRenderTarget(rt); r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(oldTarget);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      c2.putImageData(img, 0, 0);
      this.previews.set(s.id, cv.toDataURL("image/jpeg", 0.82));
      holder.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.userData.tex) o.userData.tex.dispose(); if (o.material && !o.material.userData?.shared && o.material.vertexColors && !o.material.isShaderMaterial && o.parent === holder) o.material.dispose(); });
      untrack(ctx, holder);
    }
    r.shadowMap.enabled = oldShadow;
    rt.dispose();
  }

  // ------------------------------------------------------------------------------------------------ fighters
  private fighter(side: "us" | "them", x: number, z: number, o: { spear: boolean; armour: boolean; hp: number; v?: Villager; color?: number; seed?: number }): Fighter {
    const seed = o.seed ?? (Math.random() * 1e6) | 0;
    const f: Fighter = { id: this.fid++, side, x, z, yaw: 0, hp: o.hp, max: o.hp, spear: o.spear, armour: o.armour, cd: Math.random(), swing: 0, v: o.v, moved: 0, seed };
    const R = this.g.person({ seed: o.v ? o.v.seed : seed, tunic: o.color ?? 0x8a2a2a, crown: !!(o.v && o.v.leader), armour: o.armour, tool: o.spear ? "spear" : side === "them" ? "axe" : "", plume: side === "them" ? 0x202020 : 0xc03030, pennant: side === "them" ? 0x8a1a1a : 0x2f5fb8 });
    R.g.position.set(x, 1, z);
    // health bar over the head
    const T = this.g.T;
    const bar = new T.Mesh(new T.PlaneGeometry(0.6, 0.07), new T.MeshBasicMaterial({ color: side === "us" ? 0x5cc45a : 0xe0503a, depthTest: false, transparent: true }));
    bar.position.y = 1.35; bar.renderOrder = 6; R.g.add(bar); R.bar = bar;
    f.R = R;
    return f;
  }
  private dmg(a: Fighter) { return (a.spear ? 15 : 6) * (a.v && a.v.leader ? 1.25 : 1); }
  private hit(target: Fighter, amount: number) {
    const d = amount * (target.armour ? 0.4 : 1);
    target.hp -= d;
    if (target.hp <= 0 && !target.down) { target.down = true; target.hp = 0; }
  }
  private moveTo(f: Fighter, x: number, z: number, dt: number, sp: number, blocked: Array<[number, number, number]>) {
    const dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz); if (d < 0.05) return;
    const st = Math.min(d, sp * dt);
    f.x += (dx / d) * st; f.z += (dz / d) * st; f.moved += st; f.yaw = Math.atan2(dx, dz);
    for (const b of blocked) { if (!b[2]) continue; const ex = f.x - b[0], ez = f.z - b[1], e = Math.hypot(ex, ez), lim = b[2] + 0.35; if (e < lim && e > 0.001) { f.x = b[0] + (ex / e) * lim; f.z = b[1] + (ez / e) * lim; } }
  }
  /** one fighter's turn: pick the nearest enemy (within `sight`), walk to it, strike */
  private fight(f: Fighter, foes: Fighter[], dt: number, sight: number, blocked: any[], hold?: { x: number; z: number }) {
    if (f.down) return;
    f.cd -= dt; f.swing = Math.max(0, f.swing - dt * 2.6);
    if (!f.target || f.target.down || Math.random() < dt * 0.4) {
      let best: any = null, bd = sight;
      // archers up on towers count too (attackers climb the ladder and fight them at the foot of the tower), but come last
      for (const e of foes) { if (e.down) continue; const d = Math.hypot(e.x - f.x, e.z - f.z) + (e.tower ? 25 : 0); if (d < bd) { bd = d; best = e; } }
      f.target = best;
    }
    const t = f.target;
    if (!t) { if (hold) this.moveTo(f, hold.x, hold.z, dt, 2.6, blocked); return; }
    const d = Math.hypot(t.x - f.x, t.z - f.z);
    if (d > (t.tower ? 2.6 : 1.05)) this.moveTo(f, t.x, t.z, dt, f.side === "us" ? 2.9 : 2.6, blocked);
    else { f.yaw = Math.atan2(t.x - f.x, t.z - f.z); if (f.cd <= 0) { f.cd = 1.05; f.swing = 1; this.hit(t, this.dmg(f)); } }
  }
  /** a manned tower shoots at the nearest foe in range */
  private shoot(from: { x: number; z: number; cd: number; y: number }, foes: Fighter[], dt: number, range: number, dmgAmt: number) {
    from.cd -= dt; if (from.cd > 0) return;
    let best: any = null, bd = range;
    for (const e of foes) { if (e.down) continue; const d = Math.hypot(e.x - from.x, e.z - from.z); if (d < bd) { bd = d; best = e; } }
    if (!best) return;
    from.cd = 1.7;
    const m = new this.g.T.Mesh(this.arrowGeo, this.arrowMat); this.ctx.scene.add(m);
    this.arrows.push({ m, x0: from.x, y0: from.y, z0: from.z, t: 0, dur: 0.25 + bd * 0.04, target: best, dmg: dmgAmt });
  }
  private updateArrows(dt: number) {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i]; a.t += dt; const k = Math.min(1, a.t / a.dur), tg = a.target;
      const x = a.x0 + (tg.x - a.x0) * k, z = a.z0 + (tg.z - a.z0) * k, y = a.y0 + (1.7 - a.y0) * k + Math.sin(k * Math.PI) * 1.5;
      a.m.position.set(x, y, z); a.m.lookAt(tg.x, 1.6, tg.z);
      if (k >= 1) { if (!tg.down) this.hit(tg, a.dmg); this.ctx.scene.remove(a.m); this.arrows.splice(i, 1); }
    }
  }
  private drawFighters(list: Fighter[], rdt: number) {
    const t = this.ctx.rtime;
    for (const f of list) {
      const R = f.R; if (!R) continue;
      const g = R.g;
      g.position.x += (f.x - g.position.x) * Math.min(1, rdt * 14); g.position.z += (f.z - g.position.z) * Math.min(1, rdt * 14);
      g.position.y = 1 + (f.tower ? 3.75 : 0);
      let dy = f.yaw - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, rdt * 10);
      R.bar.scale.x = Math.max(0.001, f.hp / f.max); R.bar.visible = !f.down && f.hp < f.max; R.bar.quaternion.copy(this.ctx.camera.quaternion);
      if (f.down) { R.inner.rotation.x = -Math.PI / 2; R.inner.position.set(0, 0.16, -0.45); f.moved = 0; continue; }
      FsGame.anim(R, f.moved, rdt, t, f.seed % 100, f.swing);
      f.moved = 0;
    }
  }

  // ------------------------------------------------------------------------------------------------ raiding another village
  start() {
    const g = this.g, S = g.S, s = SCENARIOS.find((q) => q.id === this.pick);
    if (!s) return;
    const party = S.villagers.filter((v) => this.chosen.has(v.id) && v.collapsed <= 0 && v.towerId == null);
    if (!party.length || S.stock.bread < party.length || S.stock.water < party.length) return;
    S.stock.bread -= party.length; S.stock.water -= party.length;
    party.forEach((v) => { g.release(v); v.task = null; v.path = null; v.carry = null; v.hunger = Math.min(100, v.hunger + 35); v.thirst = Math.min(100, v.thirst + 45); });
    this.ui.closeAll();
    const T = g.T, root = new T.Group(); this.ctx.scene.add(root);
    // the home world goes away for the battle
    this.hideHome(true);
    const blocked = this.ground(s, root, true);
    const lay = this.layout(s), towers: any[] = [];
    for (const b of lay) {
      const o = new T.Group(); o.position.set(b.x, 1, b.z); o.rotation.y = b.rot; root.add(o);
      buildingModel(this.ctx, b.type, s.id * 100 + (b.x | 0), o, s.color);
      blocked.push([b.x, b.z, (BUILD[b.type as BType] || { r: 1.5 }).r * 0.9]);
      if (b.type === "tower") towers.push({ x: b.x, z: b.z, y: 4.6, cd: 1 + Math.random(), o });
    }
    const them: Fighter[] = [];
    for (let i = 0; i < s.def; i++) {
      const a = (i / s.def) * Math.PI * 2, r = 3 + (i % 3) * 1.4;
      const f = this.fighter("them", BC.x + Math.cos(a) * r, BC.z + Math.sin(a) * r, { spear: i < s.spears, armour: i < s.armour, hp: s.hp, color: s.color, seed: s.id * 1000 + i });
      root.add(f.R.g); them.push(f);
    }
    // an archer on every tower
    towers.forEach((tw, i) => { const f = this.fighter("them", tw.x, tw.z, { spear: true, armour: false, hp: s.hp, color: s.color, seed: s.id * 1000 + 500 + i }); f.tower = tw; tw.archer = f; root.add(f.R.g); them.push(f); });
    const us: Fighter[] = party.map((v, i) => { const f = this.fighter("us", BC.x - 4 + (i % 4) * 2.2, BC.z + 34 + Math.floor(i / 4) * 2, { spear: v.spear, armour: v.armour, hp: v.hp, v, seed: v.seed }); f.yaw = Math.PI; root.add(f.R.g); return f; });
    this.battle = { s, root, us, them, towers, blocked, order: "charge", rally: { x: BC.x, z: BC.z + 30 }, t: 0, over: null };
    this.api.focus(BC.x, BC.z + 16);
    this.battleHud();
    this.ui.toast("You arrive at " + s.name + ". Click the ground to move your raiders, or let them charge.", "info");
  }
  hideHome(hide: boolean) {
    const vis = !hide;
    this.land.group.visible = vis; this.g.root.visible = vis;
    this.field.group && (this.field.group.visible = vis);
    this.ctx.foliage && this.ctx.foliage.group && (this.ctx.foliage.group.visible = vis);
    (this.ctx.env.trees || []).forEach((t: any) => t.group && (t.group.visible = vis));
  }
  battleClick(x: number, z: number) {
    const B = this.battle; if (!B || B.over) return;
    B.order = "move"; B.rally = { x, z }; B.us.forEach((f: Fighter) => (f.target = null));
    this.battleHud();
  }
  battleUpdate(dt: number) {
    const B = this.battle; if (!B) return;
    B.t += dt;
    if (!B.over) {
      for (const f of B.them) {
        if (f.tower) continue;
        // defenders guard their village: they come out when raiders are close
        const near = B.us.some((u: Fighter) => !u.down && Math.hypot(u.x - BC.x, u.z - BC.z) < 22);
        this.fight(f, B.us, dt, near ? 40 : 9, B.blocked, { x: BC.x + (f.id % 5) - 2, z: BC.z + ((f.id * 7) % 5) - 2 });
      }
      for (const tw of B.towers) if (tw.archer && !tw.archer.down) this.shoot(tw, B.us, dt, 11, 9);
      for (const f of B.us) {
        if (B.order === "move") {
          const d = Math.hypot(B.rally.x - f.x, B.rally.z - f.z);
          const foeNear = B.them.some((e: Fighter) => !e.down && !e.tower && Math.hypot(e.x - f.x, e.z - f.z) < 3.2);
          if (d > 1.5 && !foeNear) { if (!f.down) this.moveTo(f, B.rally.x + ((f.id % 3) - 1) * 1.2, B.rally.z + (Math.floor(f.id / 3) % 3 - 1) * 1.2, dt, 3, B.blocked); f.cd -= dt; continue; }
        }
        this.fight(f, B.them, dt, B.order === "charge" ? 200 : 7, B.blocked);
      }
      this.updateArrows(dt);
      const usLeft = B.us.filter((f: Fighter) => !f.down).length, themLeft = B.them.filter((f: Fighter) => !f.down).length;
      if (!themLeft) this.endBattle(true);
      else if (!usLeft) this.endBattle(false);
    }
    if (Math.floor(B.t * 4) !== Math.floor((B.t - dt) * 4)) this.battleHud();
  }
  battleDraw(rdt: number) { const B = this.battle; if (!B) return; this.drawFighters(B.us, rdt); this.drawFighters(B.them, rdt); }
  retreat() { const B = this.battle; if (!B || B.over) return; this.endBattle(false, true); }
  endBattle(won: boolean, fled = false) {
    const B = this.battle, g = this.g, S = g.S, s = B.s;
    B.over = { won, fled };
    const lines: string[] = [];
    if (won) { (Object.keys(s.loot) as Res[]).forEach((k) => (S.stock[k] = (S.stock[k] || 0) + (s.loot[k] || 0))); lines.push("Loot: " + costText(s.loot)); S.stats.wins++; }
    S.stats.raids++;
    S.raid.done++;
    (S.raid.history || (S.raid.history = [])).push({ id: s.id, day: g.day(), won });
    // the raiders come home: hurt ones lie in front of the tent
    let hurt = 0;
    for (const f of B.us) {
      const v = f.v!; if (!S.villagers.includes(v)) continue;
      v.hunger = Math.max(5, v.hunger - 20); v.thirst = Math.max(5, v.thirst - 25);
      v.x = DEPOT.x + (Math.random() - 0.5) * 3; v.z = DEPOT.z + 2 + Math.random() * 2; v.task = null; v.path = null;
      if (f.down) { hurt++; v.hp = 1; g.collapse(v, "hurt"); } else v.hp = Math.max(1, Math.min(100, f.hp));
    }
    if (hurt) lines.push(hurt + " came home hurt and lie in front of the tent: feed them.");
    // the answer: one counter-raid, 7 to 12 days from now (a new raid only replaces it if it comes sooner)
    const days = 7 + Math.floor(Math.random() * 6);
    const k = s.diff === "easy" ? 0 : s.diff === "medium" ? 1 : 2;
    const n = [3 + Math.floor(Math.random() * 2), 5 + Math.floor(Math.random() * 3), 8 + Math.floor(Math.random() * 4)][k]!;
    const spears = Math.round(n * [0.3, 0.5, 0.7][k]!), arm = Math.round(n * [0, 0.25, 0.5][k]!);
    const pending = { day: g.day() + days, from: s.name, diff: s.diff, n, spears, armour: arm, hp: s.hp, color: s.color, desc: `${n} raiders (${spears} with spears, ${arm} in armour)` };
    if (!S.raid.pending || S.raid.pending.day > pending.day) S.raid.pending = pending;
    lines.push(`⚠️ ${s.name} will answer: in ${days} days (day ${pending.day}) ${pending.desc} will raid your village.`);
    S.time += DAY_LENGTH * 0.08;     // the raid took a good part of the day
    B.result = { won, fled, lines };
    this.battleHud();
    g.log((won ? "Raid on " + s.name + " won! " : fled ? "You fled from " + s.name + ". " : "The raid on " + s.name + " failed. ") + lines.join(" "), won ? "good" : "bad");
  }
  goHome() {
    const B = this.battle; if (!B) return;
    for (const a of this.arrows) this.ctx.scene.remove(a.m); this.arrows = [];
    this.ctx.scene.remove(B.root);
    B.root.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.isMeshBasicMaterial) o.material.dispose(); if (o.userData.tex) { o.userData.tex.dispose(); o.material.dispose(); } });
    untrack(this.ctx, B.root);
    this.battle = null;
    this.hideHome(false);
    this.api.focus(DEPOT.x, DEPOT.z);
    const h = this.ui.root.querySelector(".fs-battle"); h && h.remove();
    this.chosen.clear(); this.pick = null;
    this.api.save();
  }
  battleHud() {
    const B = this.battle; if (!B) return;
    let h = this.ui.root.querySelector(".fs-battle") as HTMLElement;
    if (!h) { h = document.createElement("div"); h.className = "fs-battle"; this.ui.root.appendChild(h); h.addEventListener("click", (e) => { const a = (e.target as HTMLElement).closest("[data-b]")?.getAttribute("data-b"); if (a === "charge") { B.order = "charge"; this.battleHud(); } if (a === "retreat") this.retreat(); if (a === "home") this.goHome(); }); }
    const usL = B.us.filter((f: Fighter) => !f.down).length, thL = B.them.filter((f: Fighter) => !f.down && !f.tower).length, twL = B.towers.filter((t: any) => t.archer && !t.archer.down).length;
    const html = B.result
      ? `<div class="fs-bres ${B.result.won ? "won" : "lost"}"><h2>${B.result.won ? "🏆 Victory!" : B.result.fled ? "🏃 You fled" : "💀 Defeat"}</h2>${B.result.lines.map((l: string) => `<p>${esc(l)}</p>`).join("")}<button class="fs-b gold" data-b="home">⛺ Go home</button></div>`
      : `<div class="fs-bbar"><b>⚔️ ${esc(B.s.name)}</b><span>Your raiders: <b>${usL}</b>/${B.us.length}</span><span>Defenders: <b>${thL}</b></span><span>Towers manned: <b>${twL}</b></span>
          <button class="fs-b${B.order === "charge" ? " on" : ""}" data-b="charge">⚔️ Charge</button><button class="fs-b red" data-b="retreat">🏃 Retreat</button>
          <span class="fs-small">Click the ground to move your raiders</span></div>
        <div class="fs-bus">${B.us.map((f: Fighter) => `<span class="${f.down ? "dn" : ""}">${f.v && f.v.leader ? "👑" : ""}${esc(f.v ? f.v.name : "")} <i class="fs-m hp"><i style="width:${(f.hp / f.max) * 100}%"></i></i></span>`).join("")}</div>`;
    if (h.innerHTML !== html) h.innerHTML = html;
  }

  // ------------------------------------------------------------------------------------------------ the counter-raid on your village
  homeUpdate(dt: number) {
    const g = this.g, S = g.S, P = S.raid.pending;
    if (!this.attack && P && g.day() >= P.day && !g.isNight() && g.cyc() > 0.15 && g.cyc() < 0.4) this.startAttack(P);
    if (this.attack) this.attackUpdate(dt);
  }
  startAttack(P: any) {
    const g = this.g, land = this.land;
    let sx = 0, sz = 0;
    for (let tries = 0; tries < 80; tries++) { const a = Math.random() * Math.PI * 2, r = 36 + Math.random() * 8; sx = START.x + Math.cos(a) * r; sz = START.z + Math.sin(a) * r; if (land.walkable(sx, sz) && land.path(sx, sz, DEPOT.x, DEPOT.z)) break; }
    const them: Fighter[] = [];
    for (let i = 0; i < P.n; i++) {
      const f = this.fighter("them", sx + (i % 4) * 1.1, sz + Math.floor(i / 4) * 1.1, { spear: i < P.spears, armour: i < P.armour, hp: P.hp, color: P.color, seed: 9000 + i * 17 + g.day() });
      g.root.add(f.R.g); (f as any).path = land.path(f.x, f.z, DEPOT.x, DEPOT.z) || [[DEPOT.x, DEPOT.z]]; them.push(f);
    }
    this.attack = { P, them, us: new Map<number, Fighter>(), t: 0, stealT: 0, towers: new Map() };
    g.S.villagers.forEach((v) => { if (v.asleep) { v.asleep = false; v.task = null; } });
    g.log(`⚔️ ${P.from} is raiding your village! ${P.desc}. Your guards and towers fight back.`, "bad");
    this.api.focus((sx + START.x) / 2, (sz + START.z) / 2);
  }
  /** the villagers taking part are wrapped as fighters that share their health */
  private usOf(v: Villager): Fighter {
    let f = this.attack.us.get(v.id);
    if (!f) { f = { id: this.fid++, side: "us", x: v.x, z: v.z, yaw: v.yaw, hp: v.hp, max: 100, spear: v.spear, armour: v.armour, cd: 0, swing: 0, v, moved: 0, seed: v.seed }; this.attack.us.set(v.id, f); }
    f.x = v.x; f.z = v.z; f.hp = v.hp; f.spear = v.spear; f.armour = v.armour; f.down = v.collapsed > 0;
    return f;
  }
  attackUpdate(dt: number) {
    const A = this.attack, g = this.g, S = g.S, land = this.land;
    A.t += dt;
    const alive = A.them.filter((f: Fighter) => !f.down);
    const defenders = S.villagers.filter((v) => v.collapsed <= 0 && !(v.task && v.task.k === "tower"));
    const usF = defenders.map((v) => this.usOf(v));
    // the raiders: march on the tent, fight whoever stands in the way
    for (const f of alive) {
      let best: any = null, bd = 6;
      for (const u of usF) { const d = Math.hypot(u.x - f.x, u.z - f.z); if (d < bd) { bd = d; best = u; } }
      if (best) { f.target = best; this.fight(f, [best], dt, 8, []); }
      else {
        const p = (f as any).path; if (p && p.length) { const [tx, tz] = p[0]; this.moveTo(f, tx, tz, dt, 2.5, []); if (Math.hypot(tx - f.x, tz - f.z) < 0.3) p.shift(); }
        f.cd -= dt;
      }
    }
    // your people: guards and anyone with a spear go out to meet them; everyone fights back when attacked
    for (const u of usF) {
      const v = u.v!;
      const near = alive.filter((e: Fighter) => Math.hypot(e.x - v.x, e.z - v.z) < (v.role === "guard" || v.spear || v.leader ? 30 : 4));
      if (!near.length) { if (v.task && v.task.k === "fight") v.task = null; continue; }
      if (v.leader && !(v.task && v.task.k === "fight") && v.task && v.task.k !== "idle") continue;   // the leader only fights when you send them
      if (!v.task || v.task.k !== "fight") { g.release(v); v.task = { k: "fight" }; v.path = null; }
      const before = { x: u.x, z: u.z };
      this.fight(u, near, dt, 30, []);
      if (Math.hypot(u.x - before.x, u.z - before.z) > 0) { v.x = u.x; v.z = u.z; v.moved = (v.moved || 0) + Math.hypot(u.x - before.x, u.z - before.z); v.yaw = u.yaw; }
      else v.yaw = u.yaw;
      v.working = u.swing > 0 ? 2 : 0;
    }
    // damage done to the fighter copies goes back to the villagers
    for (const u of A.us.values()) { const v = u.v!; if (!S.villagers.includes(v) || v.collapsed > 0) continue; if (u.hp < v.hp) { v.hp = u.hp; if (v.hp <= 0) g.collapse(v, "hurt"); } }
    // towers with a guard on them shoot
    for (const b of g.built("tower")) {
      const guard = S.villagers.find((v) => v.towerId === b.id && v.task && v.task.k === "tower" && v.task.up);
      if (!guard) continue;
      let tw = A.towers.get(b.id); if (!tw) { tw = { x: b.x, z: b.z, y: 5.2, cd: 0.5 }; A.towers.set(b.id, tw); }
      this.shoot(tw, A.them, dt, 12, guard.spear ? 14 : 10);
    }
    this.updateArrows(dt);
    // raiders at the tent with nobody to stop them carry off part of the store
    const atTent = alive.filter((f: Fighter) => Math.hypot(f.x - DEPOT.x, f.z - DEPOT.z) < 3.5);
    if (atTent.length && !usF.some((u) => !u.down && Math.hypot(u.x - DEPOT.x, u.z - DEPOT.z) < 6)) {
      A.stealT += dt;
      if (A.stealT > 6) {
        const lost: Cost = {};
        (["wood", "stone", "iron", "bread", "meat", "water", "spear", "armour"] as Res[]).forEach((r) => { const n = Math.floor((S.stock[r] || 0) * 0.3); if (n > 0) { lost[r] = n; S.stock[r] -= n; } });
        return this.endAttack(false, lost);
      }
    }
    if (!alive.length || (alive.length <= Math.floor(A.them.length * 0.25) && A.t > 20)) this.endAttack(true, {});
  }
  attackDraw(rdt: number) { if (this.attack) this.drawFighters(this.attack.them, rdt); }
  endAttack(won: boolean, lost: Cost) {
    const A = this.attack, g = this.g, S = g.S;
    for (const f of A.them) { g.root.remove(f.R.g); untrack(this.ctx, f.R.g); f.R.bar.geometry.dispose(); f.R.bar.material.dispose(); }
    for (const a of this.arrows) this.ctx.scene.remove(a.m); this.arrows = [];
    S.villagers.forEach((v) => { if (v.task && v.task.k === "fight") v.task = null; });
    (S.raid.history || (S.raid.history = [])).push({ counter: A.P.from, day: g.day(), won });
    S.raid.pending = null;
    this.attack = null;
    if (won) { S.stock.spear += Math.floor(A.them.filter((f: Fighter) => f.spear).length / 2); g.log(`🏆 You drove off the raiders from ${A.P.from}! They dropped some spears. Nobody will attack again unless you raid.`, "good"); }
    else g.log(`💀 The raiders from ${A.P.from} plundered your tent and left with ${costText(lost) || "nothing"}. They will not come back unless you raid again.`, "bad");
    this.api.save();
  }

  dispose() {
    if (this.battle) { this.ctx.scene.remove(this.battle.root); }
    for (const a of this.arrows) this.ctx.scene.remove(a.m);
    this.arrowGeo.dispose(); this.arrowMat.dispose();
  }
}
