import { Emitter, lsGet, lsGetRaw, lsSet, lsSetRaw } from "../core/store";
import { getProfile, commitProfile } from "../core/profile";
import { WB_SOUND } from "../core/sound";
import { getCards, getNotes, srsReps } from "./study";
import { wbWeak } from "./weak";

/** Cross-area badges (original wb53): localStorage 'wb-badges-v1', streak 'wb-streak-v1'. */
const BK = "wb-badges-v1";
const STK = "wb-streak-v1";

export const badgeEvents = new Emitter();
export const toastText = { value: "" };
export const badgeToastEvents = new Emitter();

/** World/F1 modules register live readers so badges see current values, not just saved ones. */
export const liveWorld = {
  infDay: null as null | (() => number | null),
  defCount: null as null | (() => number),
};

const maxv = (k: string, v: number) => {
  const o = +(lsGetRaw(k) || 0) || 0;
  if (v > o) {
    lsSetRaw(k, String(v));
    return v;
  }
  return o;
};
const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const dayDiff = (a: string, b: string) => {
  const p = (s: string) => {
    const x = s.split("-");
    return new Date(+x[0]!, +x[1]! - 1, +x[2]!, 12);
  };
  return Math.round((p(b).getTime() - p(a).getTime()) / 864e5);
};

interface Streak { last: string; n: number; best: number }
export const getStreak = () => lsGet<Streak>(STK, { last: "", n: 0, best: 0 });
export function streakTick(): Streak {
  const s = getStreak();
  const t = today();
  if (s.last !== t) {
    const g = s.last ? dayDiff(s.last, t) : 0;
    s.n = g === 1 ? (s.n || 0) + 1 : 1;
    s.last = t;
    s.best = Math.max(s.best || 0, s.n);
    lsSet(STK, s);
  }
  return s;
}

const infDay = () => {
  let m = +(lsGetRaw("wb-inf-day") || 0) || 0;
  try {
    const live = liveWorld.infDay && liveWorld.infDay();
    if (live != null) m = maxv("wb-inf-day", live);
  } catch { /* ignore */ }
  return m;
};
const defMax = () => {
  let m = +(lsGetRaw("wb-bw-maxdefs") || 0) || 0;
  try {
    if (liveWorld.defCount) m = maxv("wb-bw-maxdefs", liveWorld.defCount());
  } catch { /* ignore */ }
  return m;
};
const f1h = () => {
  const h = lsGet<number[]>("wb-f1-coach", []);
  return Array.isArray(h) ? h : [];
};

export interface Badge {
  id: string;
  area: string;
  icon: string;
  name: string;
  desc: string;
  coins: number;
  p: () => [number, number];
}

const state = () => {
  const o = lsGet<{ u: Record<string, number>; paid: number }>(BK, { u: {}, paid: 0 });
  if (!o.u) o.u = {};
  return o;
};
export const getBadgeState = state;

export const BADGES: Badge[] = [
  { id: "day10", area: "Block World", icon: "🌄", name: "Day 10 Survivor", desc: "Survive Day 10 in Infinite (the first zombie night)", coins: 20, p: () => [infDay(), 10] },
  { id: "day15", area: "Block World", icon: "🏰", name: "Day 15 Survivor", desc: "Survive Day 15 in Infinite", coins: 30, p: () => [infDay(), 15] },
  { id: "day25", area: "Block World", icon: "👑", name: "Day 25 Survivor", desc: "Survive Day 25 in Infinite", coins: 60, p: () => [infDay(), 25] },
  { id: "wave5", area: "Block World", icon: "⚔️", name: "Night Shift", desc: "Survive wave 5 (best wave on your report card)", coins: 15, p: () => [+(lsGetRaw("wb-inf-best") || 0) || 0, 5] },
  { id: "defs5", area: "Block World", icon: "🧱", name: "Fortifier", desc: "Have 5 walls, towers or torches standing at once", coins: 10, p: () => [defMax(), 5] },
  { id: "cards10", area: "Study", icon: "🗂️", name: "Deck Builder", desc: "Have 10 flashcards", coins: 10, p: () => [getCards().length, 10] },
  { id: "notes5", area: "Study", icon: "📝", name: "Note Taker", desc: "Save 5 study notes", coins: 10, p: () => [getNotes().length, 5] },
  { id: "srs50", area: "Study", icon: "🔁", name: "Spaced Scholar", desc: "Pass 50 spaced-review answers in total", coins: 20, p: () => [srsReps(), 50] },
  { id: "weak5", area: "Study", icon: "🎯", name: "Fixer-Upper", desc: "Clear 5 items from your Weekly focus list", coins: 25, p: () => [wbWeak.mastered(), 5] },
  { id: "file1", area: "Assistant", icon: "📁", name: "Bookworm", desc: "Add your first file to the Assistant", coins: 5, p: () => [lsGet("wb-myfiles-stat", { added: 0 }).added || 0, 1] },
  { id: "sum1", area: "Assistant", icon: "📌", name: "Long Memory", desc: "Let the Assistant summarize a long chat", coins: 10, p: () => [lsGet("wb-summary-count", 0) || 0, 1] },
  { id: "arc10", area: "Arcade", icon: "🏅", name: "Cabinet Champion", desc: "Unlock 10 Arcade achievements", coins: 20, p: () => [Object.keys(getProfile().achievements || {}).length, 10] },
  { id: "play25", area: "Arcade", icon: "🎮", name: "Regular", desc: "Play 25 arcade games", coins: 15, p: () => [getProfile().gamesPlayed || 0, 25] },
  { id: "f1lap5", area: "F1", icon: "🏎️", name: "Coachable", desc: "Finish 5 laps with the corner coach", coins: 15, p: () => [f1h().length, 5] },
  { id: "f1calm", area: "F1", icon: "🧘", name: "Calm Hands", desc: "Steer within the first third of the warning for a whole lap", coins: 25, p: () => [f1h().some((x) => x <= 0.34) ? 1 : 0, 1] },
  { id: "str3", area: "General", icon: "🔥", name: "3-Day Streak", desc: "Open Workbench 3 days in a row", coins: 10, p: () => [getStreak().best || 0, 3] },
  { id: "str7", area: "General", icon: "📆", name: "Week Warrior", desc: "Open Workbench 7 days in a row", coins: 30, p: () => [getStreak().best || 0, 7] },
  { id: "str30", area: "General", icon: "🌟", name: "Month of Mastery", desc: "Open Workbench 30 days in a row", coins: 150, p: () => [getStreak().best || 0, 30] },
  { id: "shop1", area: "General", icon: "🛍️", name: "First Purchase", desc: "Buy something in the coin shop", coins: 5, p: () => [(lsGet<{ owned: string[] }>("wb-shop-v1", { owned: [] }).owned || []).length, 1] },
  {
    id: "round", area: "General", icon: "🌐", name: "All-Rounder", desc: "Earn a badge in 4 different areas", coins: 40,
    p: () => {
      const u = state().u || {};
      const a: Record<string, 1> = {};
      BADGES.forEach((b) => {
        if (u[b.id] && b.id !== "round") a[b.area] = 1;
      });
      return [Object.keys(a).length, 4];
    },
  },
];

let toastQueue: string[] = [];
let toastBusy = false;
function nextToast() {
  const h = toastQueue.shift();
  if (!h) {
    toastBusy = false;
    toastText.value = "";
    badgeToastEvents.emit();
    return;
  }
  toastBusy = true;
  toastText.value = h;
  badgeToastEvents.emit();
  setTimeout(nextToast, 3600);
}
const showToast = (h: string) => {
  toastQueue.push(h);
  if (!toastBusy) nextToast();
};

export function evalBadges() {
  const o = state();
  const fresh: Badge[] = [];
  BADGES.forEach((b) => {
    if (o.u[b.id]) return;
    let p: [number, number];
    try { p = b.p(); } catch { return; }
    if (p && p[0] >= p[1]) {
      o.u[b.id] = Date.now();
      o.paid = (o.paid || 0) + b.coins;
      fresh.push(b);
    }
  });
  if (fresh.length) {
    lsSet(BK, o);
    const prof = getProfile();
    prof.coins = (prof.coins || 0) + fresh.reduce((a, b) => a + b.coins, 0);
    commitProfile();
    try { WB_SOUND.win(); } catch { /* ignore */ }
    if (fresh.length <= 3) fresh.forEach((b) => showToast("🏆 Badge unlocked: " + b.icon + " " + b.name + " · +" + b.coins + " 🪙"));
    else showToast("🏆 " + fresh.length + " badges unlocked · +" + fresh.reduce((a, b) => a + b.coins, 0) + " 🪙");
    evalBadges();
  }
  badgeEvents.emit();
}

let started = false;
export function startBadges() {
  if (started) return;
  started = true;
  streakTick();
  evalBadges();
  setInterval(() => {
    streakTick();
    evalBadges();
  }, 4000);
}
