import { Emitter, lsGet, lsSet } from "../core/store";
import { onGameScore } from "../core/profile";
import { DAILY_POOL, POOL_INFO } from "./catalog";

/** Daily challenge (original 5.45.0): one rotating game per day, best score, streak. localStorage 'wb-daily-v1'. */
const DK = "wb-daily-v1";
export const dailyEvents = new Emitter();
type Db = Record<string, { game: string; best: number }>;

export const dayString = (d = new Date()) => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
export const loadDaily = () => lsGet<Db>(DK, {});

export function pickDaily(day: string): string | null {
  if (!DAILY_POOL.length) return null;
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return DAILY_POOL[h % DAILY_POOL.length]!;
}
export function dailyStreak(db: Db): number {
  let n = 0;
  const d = new Date();
  if (!(db[dayString(d)] && db[dayString(d)]!.best > 0)) d.setDate(d.getDate() - 1);
  while (db[dayString(d)] && db[dayString(d)]!.best > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function dailyView() {
  const day = dayString();
  const key = pickDaily(day);
  if (!key) return null;
  const db = loadDaily();
  const today = db[day] || { game: key, best: 0 };
  const past = Object.keys(db).filter((k) => k !== day && db[k]!.best > 0).sort().reverse().slice(0, 5);
  const all = Object.keys(db).reduce((m, k) => Math.max(m, db[k]!.best || 0), 0);
  return {
    key, name: POOL_INFO[key]!.name, best: today.best, streak: dailyStreak(db), all,
    recent: past.map((k) => k.slice(5) + " " + (POOL_INFO[db[k]!.game]?.name || db[k]!.game) + " " + db[k]!.best),
  };
}

let wired = false;
export function wireDaily() {
  if (wired) return;
  wired = true;
  onGameScore((k, _m, s) => {
    const key = pickDaily(dayString());
    if (key && k === key && s > 0) {
      const db = loadDaily();
      const day = dayString();
      const t = db[day] || { game: k, best: 0 };
      if (s > t.best) t.best = s;
      db[day] = t;
      lsSet(DK, db);
      dailyEvents.emit();
    }
  });
}
