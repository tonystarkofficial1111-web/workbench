// @ts-nocheck
import { DAY_LENGTH } from "./ctx";
import type { FsGame, Villager, Bld } from "./game";
import { RES_INFO, ROLES, BUILD, BUILD_ORDER, TRADES, FOOD_ITEMS, NEEDS, CREWED, canPay, pay, costText, type Res, type Role, type BType } from "./data";
import { WX_INFO } from "./weather";
import { N } from "./land";

/**
 * Free Style's screen: resources and time at the top, every villager's state in the side bar, the food bar to drag food onto people,
 * the tent menu (people and jobs, food, building, equipment, trade, raids, log), building panels and messages.
 */
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
/** a dropdown is open in there: do not redraw under it */
const editing = (box: HTMLElement) => { const a = document.activeElement as HTMLElement | null; return !!a && box.contains(a) && a.tagName === "SELECT"; };
const ROLE_LIST: Role[] = ["idle", "wood", "miner", "farmer", "hunter", "water", "cook", "builder", "smith", "guard"];
const TOP_RES: Res[] = ["wood", "stone", "iron", "bread", "meat", "water", "rawMeat", "rawWater", "hide", "wool", "feather", "spear", "armour"];

export class FsUi {
  host: HTMLElement; g: FsGame; api: any;
  root: HTMLElement; top: HTMLElement; side: HTMLElement; bar: HTMLElement; card: HTMLElement; modal: HTMLElement; panel: HTMLElement; toasts: HTMLElement; hint: HTMLElement; help: HTMLElement;
  tab = "people"; curB: Bld | null = null; acc = 0; skipNight = false;
  /** filled in by the raid module */
  raid: any = null;
  private dragEl: HTMLElement | null = null; private dragItem: Res | null = null;

  constructor(host: HTMLElement, g: FsGame, api: any) {
    this.host = host; this.g = g; this.api = api;
    const root = (this.root = document.createElement("div"));
    root.className = "fs-ui";
    root.innerHTML = `
      <div class="fs-top"></div>
      <aside class="fs-side"><div class="fs-side-h">Villagers <span class="fs-pop"></span></div><div class="fs-side-list"></div></aside>
      <div class="fs-bar"></div>
      <div class="fs-card" style="display:none"></div>
      <div class="fs-panel" style="display:none"></div>
      <div class="fs-hint" style="display:none"></div>
      <div class="fs-toasts"></div>
      <div class="fs-modal" style="display:none"><div class="fs-modal-c"></div></div>
      <div class="fs-help" style="display:none"></div>
      <div class="fs-mm"><canvas width="172" height="172"></canvas></div>
      <div class="fs-report"></div>`;
    host.appendChild(root);
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    this.top = q(".fs-top"); this.side = q(".fs-side-list"); this.bar = q(".fs-bar"); this.card = q(".fs-card"); this.modal = q(".fs-modal"); this.panel = q(".fs-panel");
    this.toasts = q(".fs-toasts"); this.hint = q(".fs-hint"); this.help = q(".fs-help");
    root.addEventListener("click", (e) => this.onClick(e));
    root.addEventListener("change", (e) => this.onChange(e));
    root.addEventListener("pointerdown", (e) => this.onDown(e));
    this.modal.addEventListener("click", (e) => { if (e.target === this.modal) this.closeAll(); });
    g.on((e) => { if (e.type === "toast") this.toast(e.text, e.kind); if (e.type === "collapse" || e.type === "dawn") this.refresh(); if (e.type === "report") this.showReport(e.rep); });
    this.mm = root.querySelector(".fs-mm canvas") as HTMLCanvasElement;
    this.mm.addEventListener("click", (e) => { const r = this.mm.getBoundingClientRect(); this.api.focus(((e.clientX - r.left) / r.width) * N, ((e.clientY - r.top) / r.height) * N); });
    this.report = root.querySelector(".fs-report") as HTMLElement;
    this.report.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-rx]")) this.report.classList.remove("on"); });
    this.refresh();
    if (!g.S.log.length || g.day() === 1) setTimeout(() => this.showHelp(true), 400);
  }

  // ------------------------------------------------------------------------------------------------ small things
  toast(text: string, kind = "info") {
    const d = document.createElement("div"); d.className = "fs-toast " + kind; d.textContent = text;
    this.toasts.appendChild(d);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => d.classList.add("out"), kind === "bad" ? 6500 : 4200);
    setTimeout(() => d.remove(), kind === "bad" ? 7000 : 4700);
  }
  setSpeed(s: number) { this.api.setSpeed(s); this.renderTop(); }
  selIsLeader() { const v = this.selV(); return !v || !!v.leader; }
  selV() { return this.g.S.villagers.find((v) => v.id === this.g.sel) || null; }
  ghostHelp(type: BType | null) {
    if (!type) { this.hint.style.display = "none"; return; }
    this.hint.style.display = "";
    this.hint.innerHTML = `Placing a <b>${BUILD[type].name}</b> (${costText(BUILD[type].cost)}). Click to place · <b>R</b> turns it · right-click or <b>Esc</b> cancels <span class="fs-why"></span>`;
  }
  ghostWhy(why: string) { const s = this.hint.querySelector(".fs-why"); if (s) s.textContent = why ? " — " + why : ""; }

  frame(dt: number) { this.acc += dt; if (this.acc > 0.25) { this.acc = 0; this.refresh(); this.drawMap(); } }

  // ------------------------------------------------------------------------------------------------ minimap (5.67.0)
  mm!: HTMLCanvasElement; report!: HTMLElement; private mmBase: HTMLCanvasElement | null = null;
  private mapBase() {
    const land = this.g.land, S = 172, c = document.createElement("canvas"); c.width = c.height = S; const q = c.getContext("2d")!;
    const img = q.createImageData(S, S), k = N / S;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = Math.floor(y * k) * N + Math.floor(x * k), o = (y * S + x) * 4;
      let col = [28, 74, 110];
      if (land.land[i]) { const z = land.zone[i]; col = land.dWater[i]! < 2 ? [214, 196, 140] : z === 1 ? [52, 108, 46] : z === 2 ? [128, 122, 104] : [94, 152, 68]; }
      img.data[o] = col[0]!; img.data[o + 1] = col[1]!; img.data[o + 2] = col[2]!; img.data[o + 3] = 255;
    }
    q.putImageData(img, 0, 0);
    q.fillStyle = "#8a6a44"; for (const b of land.bridges) { q.save(); q.translate((b.x / N) * S, (b.z / N) * S); q.rotate(-b.a); q.fillRect(-2, -(b.hl / N) * S, 4, (2 * b.hl / N) * S); q.restore(); }
    return c;
  }
  drawMap() {
    if (!this.mm || this.mm.offsetParent === null) return;
    if (!this.mmBase) this.mmBase = this.mapBase();
    const q = this.mm.getContext("2d")!, S = 172, P = (v: number) => (v / N) * S, g = this.g;
    q.drawImage(this.mmBase, 0, 0);
    for (const n of g.land.nodes) { q.fillStyle = n.kind === "iron" ? "#b0602a" : "#9a968c"; q.fillRect(P(n.x) - 1.5, P(n.z) - 1.5, 3, 3); }
    for (const a of g.S.animals) { if (a.st === "dead") continue; q.fillStyle = a.kind === "cow" ? "#6b4428" : a.kind === "sheep" ? "#f0ece2" : "#e8b020"; q.fillRect(P(a.x) - 1, P(a.z) - 1, 2, 2); }
    for (const b of g.S.buildings) { const s = b.type === "tent" ? 7 : 4; q.fillStyle = b.built ? (b.type === "tent" ? "#7a845d" : "#c9b48a") : "rgba(201,180,138,.5)"; q.fillRect(P(b.x) - s / 2, P(b.z) - s / 2, s, s); q.strokeStyle = "#000"; q.lineWidth = 1; q.strokeRect(P(b.x) - s / 2, P(b.z) - s / 2, s, s); }
    for (const v of g.S.villagers) { if (v.asleep) continue; q.fillStyle = v.leader ? "#ffd34d" : v.collapsed > 0 ? "#ff5a4a" : "#5ab0ff"; q.beginPath(); q.arc(P(v.x), P(v.z), v.leader ? 3 : 2, 0, Math.PI * 2); q.fill(); }
    const A = this.raid && this.raid.attack;
    if (A) for (const f of A.them) { if (f.down) continue; q.fillStyle = "#e0302a"; q.fillRect(P(f.x) - 2, P(f.z) - 2, 4, 4); }
    const c = this.api.camTarget && this.api.camTarget(); if (c) { const r = Math.max(4, P(c.d * 0.7)); q.strokeStyle = "rgba(255,255,255,.8)"; q.strokeRect(P(c.x) - r, P(c.z) - r * 0.7, r * 2, r * 1.4); }
  }

  // ------------------------------------------------------------------------------------------------ the dawn report (5.67.0)
  showReport(rep: any) {
    if (localStorage.getItem("wb-fs-report-off") === "1") return;
    const g = this.g, H = (g.S.history || []).slice(-20), w = WX_INFO[rep.weather || "sunny"] || WX_INFO.sunny;
    const rows: Array<[string, string]> = [["🪵 Wood", "+" + rep.wood], ["🪨 Stone", "+" + rep.stone], ["⛓️ Iron", "+" + rep.iron], ["🍞 Food made", "+" + rep.food], ["🫖 Water boiled", "+" + rep.water], ["🏠 Built", String(rep.built)], ["🏹 Hunted", String(rep.hunted)], ["👶 Joined", String(rep.born)], ["🪦 Died", String(rep.died)]];
    this.report.innerHTML = `<div class="fs-rh"><b>🌅 Day ${rep.day} report</b><button type="button" class="fs-x" data-rx="1">✕</button></div>` +
      `<div class="fs-rg">${rows.map(([k, v]) => `<div><em>${k}</em><b>${v}</b></div>`).join("")}</div>` +
      `<p class="fs-small">${rep.pop} people · food in store ${rep.foodStock} · boiled water ${rep.waterStock}. Weather: ${w.icon} ${w.name}.</p>` +
      `<canvas width="300" height="70"></canvas><div class="fs-rk"><i style="background:#5ab0ff"></i>People <i style="background:#e0a23a"></i>Food <i style="background:#4aa4e0"></i>Water <i style="background:#c9a06a"></i>Wood</div>` +
      `<label class="fs-small"><input type="checkbox" data-roff="1"> Don't show these reports</label>`;
    this.report.classList.add("on");
    const cb = this.report.querySelector("[data-roff]") as HTMLInputElement; cb.onchange = () => { localStorage.setItem("wb-fs-report-off", cb.checked ? "1" : "0"); if (cb.checked) this.report.classList.remove("on"); };
    const cv = this.report.querySelector("canvas") as HTMLCanvasElement, q = cv.getContext("2d")!;
    q.fillStyle = "rgba(10,14,22,.6)"; q.fillRect(0, 0, 300, 70);
    const line = (key: string, color: string) => { const max = Math.max(1, ...H.map((h: any) => h[key] || 0)); q.strokeStyle = color; q.lineWidth = 2; q.beginPath(); H.forEach((h: any, i: number) => { const x = 8 + (i / Math.max(1, H.length - 1)) * 284, y = 62 - ((h[key] || 0) / max) * 54; i ? q.lineTo(x, y) : q.moveTo(x, y); }); q.stroke(); };
    if (H.length > 1) { line("wood", "#c9a06a"); line("water", "#4aa4e0"); line("food", "#e0a23a"); line("pop", "#5ab0ff"); }
    else { q.fillStyle = "#9fb0c0"; q.font = "11px system-ui"; q.fillText("The chart fills in over the days", 70, 40); }
    clearTimeout((this as any).repT); (this as any).repT = setTimeout(() => this.report.classList.remove("on"), 16000);
  }
  refresh() {
    this.renderTop(); this.renderSide(); this.renderBar();
    if (this.card.style.display !== "none") this.renderCard();
    if (this.modal.style.display !== "none" && this.tab !== "build" && this.tab !== "raid" && !editing(this.modal)) this.renderModal();
    if (this.panel.style.display !== "none") this.renderPanel();
  }

  // ------------------------------------------------------------------------------------------------ top bar
  renderTop() {
    const g = this.g, S = g.S, sp = this.api.getSpeed(), night = g.isNight();
    const res = TOP_RES.filter((r) => r === "wood" || r === "stone" || r === "iron" || r === "bread" || r === "meat" || r === "water" || (S.stock[r] || 0) > 0)
      .map((r) => `<span class="fs-res${(r === "bread" || r === "meat" || r === "water") && S.stock[r] <= 2 ? " low" : ""}" title="${RES_INFO[r].name}">${RES_INFO[r].icon}<b>${Math.floor(S.stock[r] || 0)}</b></span>`).join("");
    const raid = S.raid && S.raid.pending ? `<span class="fs-raidwarn" title="${esc(S.raid.pending.desc || "")}">⚔️ Raid in ${Math.max(0, S.raid.pending.day - g.day())} d</span>` : "";
    const W = S.weather || { today: "sunny", tomorrow: "sunny" }, wt = WX_INFO[W.today], wn = WX_INFO[W.tomorrow];
    const wxChip = `<span class="fs-wx" title="${esc(wt.note || wt.name)} · Tomorrow: ${wn.name}">${wt.icon} ${wt.name} <small>· tomorrow ${wn.icon}</small></span>`;
    const html = `<div class="fs-time"><b>Day ${g.day()}</b> ${night ? "🌙" : "☀️"} ${g.clock()}</div>${wxChip}<div class="fs-resl">${res}</div>${raid}
      <div class="fs-ctl">
        ${night && !this.skipNight ? `<button class="fs-b" data-a="skip" title="Make the night pass quickly">⏩ Skip night</button>` : ""}
        <button class="fs-b${sp === 0 ? " on" : ""}" data-a="speed" data-s="0" title="Pause (Space)">⏸</button>
        <button class="fs-b${sp === 1 ? " on" : ""}" data-a="speed" data-s="1" title="Normal speed">1×</button>
        <button class="fs-b${sp === 2 ? " on" : ""}" data-a="speed" data-s="2" title="Fast">2×</button>
        <button class="fs-b${sp === 4 ? " on" : ""}" data-a="speed" data-s="4" title="Faster">4×</button>
        <button class="fs-b gold" data-a="tent" title="Tent menu (T)">⛺ Tent</button>
        <button class="fs-b" data-a="save" title="Save now">💾</button>
        <button class="fs-b" data-a="photo" title="Photo mode">📷</button>
        <button class="fs-b" data-a="gfx" title="Graphics detail">🎨 ${this.api.gfxName()}</button>
        <button class="fs-b" data-a="help" title="How to play">❓</button>
        <button class="fs-b red" data-a="exit" title="Save and leave">✕</button>
      </div>`;
    if (this.top.innerHTML !== html) this.top.innerHTML = html;
  }

  // ------------------------------------------------------------------------------------------------ side bar: every villager
  doing(v: Villager): string {
    const t = v.task;
    if (v.collapsed > 0) return `Lying at the tent: ${v.down === "hurt" ? "hurt, feed them" : v.hunger < 20 ? "needs food" : "needs water"} (${Math.ceil((v.collapsed / DAY_LENGTH) * 24)} h left)`;
    if (v.asleep) return "Sleeping";
    if (!t) return "Thinking";
    const B = (b: any) => (b ? BUILD[b.type].name : "");
    switch (t.k) {
      case "chop": return "Chopping a tree";
      case "deliver": return "Carrying " + Object.keys(v.carry || {}).map((r) => (v.carry as any)[r] + " " + RES_INFO[r as Res].name.toLowerCase()).join(", ") + " home";
      case "eat": return t.need === "hunger" ? "Going to eat" : "Going to drink";
      case "dig": return "Mining " + (t.node ? t.node.kind : "");
      case "hunt": return "Hunting a " + (t.animal ? t.animal.kind : "");
      case "fetch": return t.src && t.src.well ? "At the well" : "Fetching lake water";
      case "build": return "Building the " + B(t.b);
      case "work": return ({ farm: "Farming, baking bread", mine: "Digging in the mine", cook: "Cooking and boiling water", spear: "Making a spear", armour: "Making armour" } as any)[t.what] || "Working";
      case "tower": return t.up ? "On watch in the tower" : "Climbing the tower";
      case "patrol": return "Guarding the village";
      case "sleep": return "Going to bed";
      case "goto": return "Walking";
      default: return v.why || (v.leader ? "Waiting for your orders" : "Resting");
    }
  }
  private barH(v: number, cls: string, title: string) { return `<i class="fs-m ${cls}" title="${title}: ${Math.round(v)}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></i>`; }
  renderSide() {
    const S = this.g.S;
    (this.root.querySelector(".fs-pop") as HTMLElement).textContent = `${S.villagers.length} / ${this.g.beds()} beds`;
    const list = S.villagers.slice().sort((a, b) => (b.collapsed > 0 ? 1 : 0) - (a.collapsed > 0 ? 1 : 0) || (b.leader ? 1 : 0) - (a.leader ? 1 : 0));
    const html = list.map((v) => {
      const warn = v.collapsed > 0 ? " down" : v.hunger < 25 || v.thirst < 25 || v.hp < 35 ? " warn" : "";
      return `<div class="fs-v${warn}${this.g.sel === v.id ? " sel" : ""}" data-vid="${v.id}" data-drop="1">
        <div class="fs-v-h"><span class="fs-v-r" title="${ROLES[v.role].name}">${v.leader ? "👑" : ROLES[v.role].icon}</span><b>${esc(v.name)}</b>${v.sick > 0 ? `<span title="Sick">🤢</span>` : ""}${v.spear ? `<span title="Spear">🗡️</span>` : ""}${v.armour ? `<span title="Armour">🛡️</span>` : ""}<span class="fs-v-role">${v.leader ? "Leader" : ROLES[v.role].name}</span></div>
        <div class="fs-v-m">${this.barH(v.hunger, "food", "Food")}${this.barH(v.thirst, "drink", "Water")}${this.barH(v.hp, "hp", "Health")}</div>
        <div class="fs-v-s">${esc(this.doing(v))}</div></div>`;
    }).join("");
    if (this.side.innerHTML !== html) this.side.innerHTML = html;
  }

  // ------------------------------------------------------------------------------------------------ food bar (drag onto a villager)
  renderBar() {
    const S = this.g.S;
    const items = FOOD_ITEMS.map((r) => {
      const f = RES_INFO[r].food!, n = Math.floor(S.stock[r] || 0);
      const tip = `${RES_INFO[r].name}: ${f.hunger ? "+" + f.hunger + " food " : ""}${f.thirst ? "+" + f.thirst + " water " : ""}${f.heal ? "+" + f.heal + " health " : ""}${f.sick ? "(may make them sick)" : ""}. Drag onto a villager.`;
      return `<div class="fs-food${n ? "" : " empty"}${f.sick ? " raw" : ""}" data-food="${r}" title="${tip}"><span>${RES_INFO[r].icon}</span><b>${n}</b></div>`;
    }).join("");
    const html = `<span class="fs-bar-l">Food</span>${items}<button class="fs-b" data-a="feedall" title="Give everyone who is hungry or thirsty the best food in store">🍽️ Feed all</button>
      <label class="fs-auto" title="Villagers walk to the tent and eat by themselves when hungry"><input type="checkbox" data-a="auto" ${S.autoFeed ? "checked" : ""}> Eat by themselves</label>`;
    if (this.bar.innerHTML !== html) this.bar.innerHTML = html;
  }
  private onDown(e: PointerEvent) {
    const f = (e.target as HTMLElement).closest("[data-food]") as HTMLElement | null;
    if (!f) return;
    const item = f.getAttribute("data-food") as Res;
    if ((this.g.S.stock[item] || 0) <= 0) { this.toast("No " + RES_INFO[item].name.toLowerCase() + " in store", "warn"); return; }
    e.preventDefault();
    this.dragItem = item;
    const d = (this.dragEl = document.createElement("div")); d.className = "fs-drag"; d.textContent = RES_INFO[item].icon;
    document.body.appendChild(d);
    const move = (ev: PointerEvent) => {
      d.style.left = ev.clientX + "px"; d.style.top = ev.clientY + "px";
      this.root.querySelectorAll(".fs-v.over").forEach((x) => x.classList.remove("over"));
      const t = this.dropTarget(ev.clientX, ev.clientY);
      if (t && t.row) t.row.classList.add("over");
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      d.remove(); this.dragEl = null;
      this.root.querySelectorAll(".fs-v.over").forEach((x) => x.classList.remove("over"));
      const t = this.dropTarget(ev.clientX, ev.clientY);
      const sel = this.selV();
      const v = t ? t.v : Math.hypot(ev.clientX - (e as any).clientX, ev.clientY - (e as any).clientY) < 6 ? sel : null;   // a click on the food feeds the selected villager
      if (v) this.give(v, item);
      else if (Math.hypot(ev.clientX - (e as any).clientX, ev.clientY - (e as any).clientY) < 6) this.toast("Drag the food onto a villager (in the list or in the world), or select one first", "info");
      this.dragItem = null;
    };
    move(e); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  private dropTarget(x: number, y: number): { v: Villager; row?: HTMLElement } | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const row = el && (el.closest("[data-vid]") as HTMLElement | null);
    if (row) { const v = this.g.S.villagers.find((q) => q.id === +row.getAttribute("data-vid")!); if (v) return { v, row }; }
    if (el && el.classList.contains("fs-canvas")) { const v = this.api.villagerAt(x, y, 46); if (v) return { v }; }
    return null;
  }
  give(v: Villager, item: Res) {
    const why = this.g.feed(v, item);
    if (why) this.toast(why, "warn");
    else this.toast(`${v.name} ${RES_INFO[item].food!.thirst ? "drank" : "ate"} ${RES_INFO[item].name.toLowerCase()}`, "good");
    this.refresh();
  }

  // ------------------------------------------------------------------------------------------------ the selected villager
  select(v: Villager | null) {
    if (!v) { this.card.style.display = "none"; this.refresh(); return; }
    this.card.style.display = ""; this.renderCard(); this.renderSide();
  }
  renderCard() {
    const v = this.selV();
    if (!v) { this.card.style.display = "none"; return; }
    const S = this.g.S;
    const roleSel = v.leader ? `<span class="fs-tag">👑 Leader (you)</span>` : `<select data-a="role" data-vid="${v.id}">${ROLE_LIST.map((r) => `<option value="${r}"${r === v.role ? " selected" : ""}>${ROLES[r].icon} ${ROLES[r].name}</option>`).join("")}</select>`;
    const html = `<div class="fs-card-h"><b>${esc(v.name)}</b> ${roleSel}<button class="fs-x" data-a="unsel">✕</button></div>
      <div class="fs-card-b">
        <div class="fs-stat"><span>🍞 Food</span>${this.barH(v.hunger, "food", "Food")}<span>${Math.round(v.hunger)}</span></div>
        <div class="fs-stat"><span>💧 Water</span>${this.barH(v.thirst, "drink", "Water")}<span>${Math.round(v.thirst)}</span></div>
        <div class="fs-stat"><span>❤️ Health</span>${this.barH(v.hp, "hp", "Health")}<span>${Math.round(v.hp)}</span></div>
        <p class="fs-doing">${esc(this.doing(v))}${v.sick > 0 ? " · 🤢 sick (cooked food and boiled water help)" : ""}</p>
        ${v.leader ? `<p class="fs-small">Click the ground to walk. Click a tree, rock, animal, the water or a building site to work there. F: camera follows you.</p>` : `<p class="fs-small">${esc(ROLES[v.role].desc)}</p>`}
        <div class="fs-row">
          <button class="fs-b" data-a="feedbest" data-vid="${v.id}">🍖 Feed</button>
          <button class="fs-b" data-a="drinkbest" data-vid="${v.id}">🫖 Give water</button>
          ${!v.spear && S.stock.spear > 0 ? `<button class="fs-b" data-a="givespear" data-vid="${v.id}">🗡️ Give spear</button>` : ""}
          ${!v.armour && S.stock.armour > 0 ? `<button class="fs-b" data-a="givearm" data-vid="${v.id}">🛡️ Give armour</button>` : ""}
          <button class="fs-b" data-a="look" data-vid="${v.id}">🎯 Look</button>
        </div>
      </div>`;
    if (this.card.innerHTML !== html && !editing(this.card)) this.card.innerHTML = html;
  }

  // ------------------------------------------------------------------------------------------------ tent menu
  openTent(tab?: string) {
    if (tab) this.tab = tab;
    this.panel.style.display = "none";
    this.modal.style.display = "";
    this.renderModal(true);
  }
  closeAll() { this.modal.style.display = "none"; this.panel.style.display = "none"; this.help.style.display = "none"; }
  renderModal(force = false) {
    const g = this.g, S = g.S;
    const tabs: Array<[string, string]> = [["people", "👥 People & jobs"], ["food", "🍞 Food & water"], ["build", "🔨 Build"], ["gear", "🗡️ Equipment"], ["trade", "⚖️ Trade"], ["raid", "⚔️ Raid"], ["log", "📜 Log"]];
    let body = "";
    if (this.tab === "people") body = this.peopleTab();
    else if (this.tab === "food") body = this.foodTab();
    else if (this.tab === "build") body = this.buildTab();
    else if (this.tab === "gear") body = this.gearTab();
    else if (this.tab === "trade") body = this.tradeTab();
    else if (this.tab === "raid") body = this.raid ? this.raid.render() : `<p>Raids are not ready yet.</p>`;
    else body = `<div class="fs-log">${S.log.map((l) => `<div>${esc(l)}</div>`).join("") || "<p>Nothing yet.</p>"}</div>`;
    const html = `<div class="fs-modal-h"><b>⛺ Tent</b><span class="fs-small">Day ${g.day()} · ${S.villagers.length} people · ${g.beds()} beds</span><button class="fs-x" data-a="close">✕</button></div>
      <div class="fs-tabs">${tabs.map(([k, n]) => `<button class="fs-tab${this.tab === k ? " on" : ""}" data-a="tab" data-t="${k}">${n}</button>`).join("")}</div>
      <div class="fs-modal-b">${body}</div>`;
    const c = this.modal.firstElementChild as HTMLElement;
    if (force || c.innerHTML !== html) { const b = c.querySelector(".fs-modal-b"), st = b ? b.scrollTop : 0; c.innerHTML = html; const nb = c.querySelector(".fs-modal-b"); if (nb && !force) nb.scrollTop = st; }
  }

  /** what the village eats and drinks in a day, against what is in store */
  private budget() {
    const S = this.g.S, n = S.villagers.length, mul = 1.15;
    const foodPts = n * 100 / 1.6 * mul, waterPts = n * 100 / 1.1 * mul;
    const haveFood = S.stock.bread * 35 + S.stock.meat * 45, haveWater = S.stock.water * 45;
    return { needBread: Math.ceil(foodPts / 35), needWater: Math.ceil(waterPts / 45), daysFood: haveFood / Math.max(1, foodPts), daysWater: haveWater / Math.max(1, waterPts) };
  }
  peopleTab() {
    const S = this.g.S, b = this.budget();
    const counts: any = {}; S.villagers.forEach((v) => { if (!v.leader) counts[v.role] = (counts[v.role] || 0) + 1; });
    const sum = ROLE_LIST.filter((r) => counts[r]).map((r) => `${ROLES[r].icon} ${counts[r]} ${ROLES[r].name}${counts[r] > 1 ? "s" : ""}`).join(" · ");
    const rows = S.villagers.filter((v) => !v.leader).map((v) => `<tr data-vid="${v.id}" data-drop="1">
      <td><b>${esc(v.name)}</b>${v.collapsed > 0 ? ' <span class="fs-red">lying down!</span>' : ""}${v.sick > 0 ? " 🤢" : ""}</td>
      <td><select data-a="role" data-vid="${v.id}">${ROLE_LIST.map((r) => `<option value="${r}"${r === v.role ? " selected" : ""}>${ROLES[r].icon} ${ROLES[r].name}</option>`).join("")}</select></td>
      <td>${this.barH(v.hunger, "food", "Food")}${this.barH(v.thirst, "drink", "Water")}${this.barH(v.hp, "hp", "Health")}</td>
      <td class="fs-small">${esc(this.doing(v))}</td></tr>`).join("");
    return `<p class="fs-sum">${sum || "Nobody has a job yet."}</p>
      <p class="fs-small">Your ${S.villagers.length} people need about <b>${b.needBread} bread or meat</b> and <b>${b.needWater} boiled water</b> a day. In store: food for <b>${b.daysFood.toFixed(1)}</b> days, water for <b>${b.daysWater.toFixed(1)}</b> days. Hard work (building, mining, hunting) makes them hungrier.</p>
      <table class="fs-table"><tr><th>Villager</th><th>Job</th><th>Food · Water · Health</th><th>Doing</th></tr>${rows}</table>
      <div class="fs-roles">${ROLE_LIST.filter((r) => r !== "idle").map((r) => `<div><b>${ROLES[r].icon} ${ROLES[r].name}</b> ${esc(ROLES[r].desc)}</div>`).join("")}</div>`;
  }
  foodTab() {
    const S = this.g.S, b = this.budget();
    const items = FOOD_ITEMS.map((r) => { const f = RES_INFO[r].food!; return `<div class="fs-fi${f.sick ? " raw" : ""}"><span class="fs-big">${RES_INFO[r].icon}</span><b>${Math.floor(S.stock[r] || 0)}</b> ${RES_INFO[r].name}<div class="fs-small">${f.hunger ? "+" + f.hunger + " food " : ""}${f.thirst ? "+" + f.thirst + " water " : ""}${f.heal ? "+" + f.heal + " health" : ""}${f.sick ? " · " + Math.round(f.sick * 100) + "% chance of sickness" : ""}</div></div>`; }).join("");
    const down = S.villagers.filter((v) => v.collapsed > 0);
    return `<div class="fs-fis">${items}</div>
      <div class="fs-row"><button class="fs-b gold" data-a="feedall">🍽️ Feed everyone who needs it</button><label class="fs-auto"><input type="checkbox" data-a="auto" ${S.autoFeed ? "checked" : ""}> Villagers eat by themselves</label></div>
      ${down.length ? `<div class="fs-alert">🆘 ${down.map((v) => `<b>${esc(v.name)}</b>`).join(", ")} ${down.length > 1 ? "are" : "is"} lying in front of the tent. Drag food or water onto them, or use the buttons below. If nobody feeds them within a day, they die.</div>` : ""}
      <table class="fs-table"><tr><th>Villager</th><th>Food · Water · Health</th><th>Give</th></tr>${S.villagers.map((v) => `<tr data-vid="${v.id}" data-drop="1"><td><b>${esc(v.name)}</b>${v.collapsed > 0 ? ' <span class="fs-red">lying down</span>' : ""}</td><td>${this.barH(v.hunger, "food", "Food")}${this.barH(v.thirst, "drink", "Water")}${this.barH(v.hp, "hp", "Health")}</td>
        <td>${FOOD_ITEMS.map((r) => `<button class="fs-b sm" data-a="give" data-vid="${v.id}" data-r="${r}" ${S.stock[r] > 0 ? "" : "disabled"} title="${RES_INFO[r].name}">${RES_INFO[r].icon}</button>`).join("")}</td></tr>`).join("")}</table>
      <p class="fs-small">Daily need: about ${b.needBread} bread/meat and ${b.needWater} boiled water. Cooks at the campfire turn raw meat into cooked meat and lake water into boiled water. Raw food and lake water can make people sick.</p>`;
  }
  buildTab() {
    const S = this.g.S;
    const builders = S.villagers.filter((v) => v.role === "builder").length;
    const cards = BUILD_ORDER.map((t) => {
      const d = BUILD[t], ok = canPay(S.stock, d.cost), have = this.g.S.buildings.filter((b) => b.type === t).length;
      const cost = Object.keys(d.cost).map((r) => `<span class="${(S.stock[r as Res] || 0) >= (d.cost as any)[r] ? "" : "fs-red"}">${(d.cost as any)[r]} ${RES_INFO[r as Res].icon}</span>`).join(" ");
      return `<div class="fs-bc${ok ? "" : " no"}"><div class="fs-big">${d.icon}</div><b>${d.name}</b>${have ? `<span class="fs-small"> (${have} built)</span>` : ""}<div class="fs-cost">${cost}</div><p class="fs-small">${esc(d.desc)}</p><button class="fs-b${ok ? " gold" : ""}" data-a="build" data-t="${t}" ${ok ? "" : "disabled"}>Place</button></div>`;
    }).join("");
    return `${builders ? "" : `<div class="fs-alert">Nobody has the <b>Builder</b> job: what you place will wait until someone does (or walk your leader there and click the site).</div>`}<div class="fs-bcs">${cards}</div>`;
  }
  gearTab() {
    const S = this.g.S;
    return `<p>In store: <b>${S.stock.spear}</b> 🗡️ spears and <b>${S.stock.armour}</b> 🛡️ armour. A Smith makes spears at a Workshop and armour at an Armory. Hunters and guards with a spear hit much harder, and armour stops most of the damage animals and raiders do.</p>
      <table class="fs-table"><tr><th>Villager</th><th>Job</th><th>Spear</th><th>Armour</th></tr>${S.villagers.map((v) => `<tr><td><b>${esc(v.name)}</b></td><td>${v.leader ? "Leader" : ROLES[v.role].name}</td>
        <td>${v.spear ? `✓ <button class="fs-b sm" data-a="takespear" data-vid="${v.id}">Take</button>` : `<button class="fs-b sm" data-a="givespear" data-vid="${v.id}" ${S.stock.spear > 0 ? "" : "disabled"}>Give</button>`}</td>
        <td>${v.armour ? `✓ <button class="fs-b sm" data-a="takearm" data-vid="${v.id}">Take</button>` : `<button class="fs-b sm" data-a="givearm" data-vid="${v.id}" ${S.stock.armour > 0 ? "" : "disabled"}>Give</button>`}</td></tr>`).join("")}</table>`;
  }
  tradeTab() {
    const S = this.g.S;
    if (!this.g.built("market").length) return `<p>Build a <b>Market</b> to trade what you have too much of.</p>`;
    return `<div class="fs-trades">${TRADES.map((t, i) => `<div class="fs-tr"><span>${costText(t.give)}</span> → <span>${costText(t.get)}</span><button class="fs-b sm" data-a="trade" data-i="${i}" ${canPay(S.stock, t.give) ? "" : "disabled"}>Trade</button></div>`).join("")}</div>`;
  }

  // ------------------------------------------------------------------------------------------------ building panel
  openBuilding(b: Bld) { this.curB = b; this.panel.style.display = ""; this.renderPanel(true); }
  renderPanel(force = false) {
    const b = this.curB, g = this.g, S = g.S;
    if (!b || !S.buildings.includes(b)) { this.panel.style.display = "none"; return; }
    const d = BUILD[b.type];
    let body = `<p class="fs-small">${esc(d.desc)}</p>`;
    if (!b.built) {
      const k = Math.floor((b.progress / d.work) * 100), builders = S.villagers.filter((v) => v.task && v.task.k === "build" && v.task.b === b && v.task.busy).length;
      body += `<div class="fs-stat"><span>Built</span><i class="fs-m hp"><i style="width:${k}%"></i></i><span>${k}%</span></div><p class="fs-small">${builders ? builders + " building now" : "Waiting for builders"}</p>`;
    } else if (CREWED.includes(b.type)) {
      const gv = S.villagers.find((v) => v.towerId === b.id), tw = b.type === "tower";
      const opts = S.villagers.filter((v) => !v.leader && v.collapsed <= 0).map((v) => `<option value="${v.id}"${gv && gv.id === v.id ? " selected" : ""}>${esc(v.name)} (${ROLES[v.role].name})</option>`).join("");
      body += gv ? `<p>🛡️ <b>${esc(gv.name)}</b> ${tw ? "keeps watch here" + (gv.spear ? " with a spear" : "") : "crews it"}.</p>` : `<p class="fs-red">Empty. ${tw ? "A tower" : "It"} only defends with a guard ${tw ? "on" : "at"} it.</p>`;
      body += `<div class="fs-row"><select data-a="guard"><option value="">— choose a guard —</option>${opts}</select>${gv ? `<button class="fs-b sm" data-a="unguard">${tw ? "Call down" : "Stand down"}</button>` : ""}</div>`;
    } else if (d.slots) {
      const w = [...(b.workers || [])].map((id) => S.villagers.find((v) => v.id === id)).filter(Boolean);
      const role = ({ farm: "Farmer", mine: "Miner", campfire: "Cook", workshop: "Smith", armory: "Smith" } as any)[b.type];
      body += `<p>${w.length ? "Working here: " + w.map((v: any) => `<b>${esc(v.name)}</b>`).join(", ") : "Nobody works here now."} (room for ${d.slots})</p><p class="fs-small">Give villagers the <b>${role}</b> job in the tent.</p>`;
    } else if (b.type === "house") body += `<p>3 beds.</p>`;
    else if (b.type === "market") body += `<div class="fs-row"><button class="fs-b gold" data-a="tradeopen">⚖️ Trade</button></div>`;
    body += b.type === "tent" ? "" : `<div class="fs-row"><button class="fs-b red sm" data-a="demolish">${b.built ? "Pull down" : "Cancel (half back)"}</button></div>`;
    const html = `<div class="fs-card-h"><b>${d.icon} ${d.name}</b><button class="fs-x" data-a="pclose">✕</button></div><div class="fs-card-b">${body}</div>`;
    if ((force || this.panel.innerHTML !== html) && !editing(this.panel)) this.panel.innerHTML = html;
  }

  // ------------------------------------------------------------------------------------------------ help
  showHelp(first = false) {
    this.help.style.display = "";
    this.help.innerHTML = `<div class="fs-help-c"><h2>⛺ Free Style</h2>
      <p>You are the <b>leader</b> (👑). Your people live around the <b>tent</b>. Keep them fed and watered, give them jobs, grow the village, and only raid when you are ready: a raid brings a counter-raid.</p>
      <ul>
        <li><b>Tent</b> (click it or press <b>T</b>): give jobs, feed people, build, hand out spears and armour, trade, raid.</li>
        <li><b>Food</b>: drag bread, meat or water from the bar at the bottom onto a villager (in the list or in the world). Raw meat and lake water can make people sick: put a <b>Cook</b> at the campfire.</li>
        <li>Before a villager dies they <b>lie down in front of the tent for a day</b>: feed them in time.</li>
        <li><b>Hunting</b> without a spear or armour hurts the hunter. Cows kick hard.</li>
        <li><b>Towers</b> cost wood and iron and stay empty until you send a guard up.</li>
        <li>Move: <b>WASD</b> or drag · Turn: <b>Q/E</b> or right-drag · Zoom: wheel · Tilt: <b>Z/X</b> · <b>F</b> follow · <b>Space</b> pause.</li>
        <li>Your leader: click the ground to walk; click a tree, rock, animal or the water to work.</li>
        <li>The game saves at every dawn and when you leave.</li>
      </ul>
      <p style="text-align:right"><button class="fs-b gold" data-a="helpclose">${first ? "Let's go" : "Close"}</button></p></div>`;
  }

  // ------------------------------------------------------------------------------------------------ events
  private vOf(el: HTMLElement) { const id = +(el.getAttribute("data-vid") || -1); return this.g.S.villagers.find((v) => v.id === id) || null; }
  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest("[data-a],[data-vid]") as HTMLElement | null;
    if (!el) return;
    const a = el.getAttribute("data-a"), g = this.g, S = g.S;
    if (!a && el.hasAttribute("data-vid") && el.classList.contains("fs-v")) {
      const v = this.vOf(el); if (!v) return;
      g.sel = v.id; this.select(v); this.api.focus(v.x, v.z); return;
    }
    switch (a) {
      case "speed": this.setSpeed(+el.getAttribute("data-s")!); break;
      case "skip": this.skipNight = true; if (this.api.getSpeed() === 0) this.setSpeed(1); this.renderTop(); break;
      case "tent": this.openTent(); break;
      case "save": this.api.save(); break;
      case "photo": this.api.photo && this.api.photo.toggle(); break;
      case "gfx": this.toast("Graphics: " + this.api.gfx(), "info"); this.renderTop(); break;
      case "help": this.showHelp(); break;
      case "helpclose": this.help.style.display = "none"; break;
      case "exit": this.api.exit(); break;
      case "close": this.closeAll(); break;
      case "tab": this.tab = el.getAttribute("data-t")!; this.renderModal(true); break;
      case "feedall": { const n = g.feedAll(); this.toast(n ? "Handed out " + n + " meals and drinks" : "Nobody needed anything (or the store is empty)", n ? "good" : "info"); this.refresh(); if (this.modal.style.display !== "none") this.renderModal(true); break; }
      case "unsel": g.sel = -1; this.select(null); break;
      case "look": { const v = this.vOf(el); v && this.api.focus(v.x, v.z); break; }
      case "feedbest": { const v = this.vOf(el); if (!v) break; const f = g.bestFood("hunger", true); if (!f) this.toast("No food in store", "warn"); else this.give(v, f); break; }
      case "drinkbest": { const v = this.vOf(el); if (!v) break; const f = g.bestFood("thirst", true); if (!f) this.toast("No water in store", "warn"); else this.give(v, f); break; }
      case "give": { const v = this.vOf(el); v && this.give(v, el.getAttribute("data-r") as Res); this.renderModal(true); break; }
      case "givespear": { const v = this.vOf(el); if (v && S.stock.spear > 0 && !v.spear) { S.stock.spear--; v.spear = true; this.toast(v.name + " takes a spear", "good"); } this.refresh(); this.renderModal(true); break; }
      case "givearm": { const v = this.vOf(el); if (v && S.stock.armour > 0 && !v.armour) { S.stock.armour--; v.armour = true; this.toast(v.name + " puts on armour", "good"); } this.refresh(); this.renderModal(true); break; }
      case "takespear": { const v = this.vOf(el); if (v && v.spear) { v.spear = false; S.stock.spear++; } this.renderModal(true); break; }
      case "takearm": { const v = this.vOf(el); if (v && v.armour) { v.armour = false; S.stock.armour++; } this.renderModal(true); break; }
      case "build": { const t = el.getAttribute("data-t") as BType; this.closeAll(); this.api.build(t); break; }
      case "trade": { const t = TRADES[+el.getAttribute("data-i")!]; if (t && canPay(S.stock, t.give)) { pay(S.stock, t.give); (Object.keys(t.get) as Res[]).forEach((r) => (S.stock[r] += t.get[r] || 0)); this.toast("Traded " + costText(t.give) + " for " + costText(t.get), "good"); } this.renderModal(true); break; }
      case "tradeopen": this.openTent("trade"); break;
      case "pclose": this.panel.style.display = "none"; this.curB = null; break;
      case "unguard": { const b = this.curB; if (!b) break; S.villagers.forEach((v) => { if (v.towerId === b.id) { v.towerId = undefined; v.y = 0; v.task = null; } }); b.guard = undefined; this.renderPanel(true); break; }
      case "demolish": {
        const b = this.curB; if (!b) break;
        if (!el.dataset.armed) { el.dataset.armed = "1"; el.textContent = "Click again to confirm"; break; }
        g.demolish(b); this.panel.style.display = "none"; this.curB = null; break;
      }
      default: if (this.raid && this.raid.onClick && a) this.raid.onClick(a, el);
    }
  }
  private onChange(e: Event) {
    const el = e.target as HTMLElement, a = el.getAttribute("data-a"), g = this.g, S = g.S;
    if (a === "auto") { S.autoFeed = (el as HTMLInputElement).checked; this.toast(S.autoFeed ? "Villagers will eat by themselves when hungry" : "Villagers only eat what you give them", "info"); }
    if (a === "role") {
      const v = this.vOf(el); if (!v) return;
      const r = (el as HTMLSelectElement).value as Role;
      if (v.role !== r) { g.release(v); v.role = r; v.task = null; v.path = null; if (r !== "guard" && v.towerId != null) { v.towerId = undefined; v.y = 0; } this.toast(v.name + " is now a " + ROLES[r].name, "info"); }
      (el as HTMLElement).blur(); this.refresh();
    }
    if (a === "guard") {
      const b = this.curB; if (!b) return;
      const id = +(el as HTMLSelectElement).value; const v = S.villagers.find((q) => q.id === id); if (!v) return;
      S.villagers.forEach((q) => { if (q.towerId === b.id) { q.towerId = undefined; q.y = 0; q.task = null; } });
      g.release(v); v.role = "guard"; v.towerId = b.id; b.guard = v.id; v.task = null; v.path = null; v.y = 0;
      this.toast(v.name + (b.type === "tower" ? " goes up the tower" : " crews the " + BUILD[b.type].name.toLowerCase()), "good");
      (el as HTMLElement).blur(); this.renderPanel(true);
    }
    if (this.raid && this.raid.onChange) this.raid.onChange(a, el);
  }

  dispose() { this.dragEl && this.dragEl.remove(); this.root.remove(); }
}
