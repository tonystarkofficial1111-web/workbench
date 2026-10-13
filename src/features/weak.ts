import { Emitter, lsGet, lsSet } from "../core/store";

/** Weekly-focus hub (original window.wbWeak): wrong answers collected for 7 days. localStorage 'wb-weak-v1'. */
const WK = "wb-weak-v1";
const WEEK = 7 * 864e5;

interface WeakItem {
  src: string;
  q: string;
  a?: string;
  miss: number[];
  streak?: number;
  done?: number;
  last?: number;
}
interface WeakStore {
  items: Record<string, WeakItem>;
  mastered: number;
}

export const weakEvents = new Emitter();

const load = (): WeakStore => {
  const o = lsGet<WeakStore>(WK, { items: {}, mastered: 0 });
  if (!o.items) o.items = {};
  return o;
};
const save = (o: WeakStore) => {
  const ks = Object.keys(o.items);
  if (ks.length > 300) {
    ks.sort((a, b) => (o.items[a]!.last || 0) - (o.items[b]!.last || 0))
      .slice(0, ks.length - 300)
      .forEach((k) => delete o.items[k]);
  }
  lsSet(WK, o);
  weakEvents.emit();
};
const key = (src: string, q: string) => src + "|" + String(q).slice(0, 200);

export const wbWeak = {
  log(src: string, q: string, a?: string) {
    if (!q) return;
    const o = load();
    const k = key(src, q);
    const it: WeakItem = o.items[k] || { src, q: String(q).slice(0, 200), miss: [] };
    it.a = String(a == null ? "" : a).slice(0, 300);
    it.miss.push(Date.now());
    it.miss = it.miss.slice(-20);
    it.streak = 0;
    it.done = 0;
    it.last = Date.now();
    o.items[k] = it;
    save(o);
  },
  ok(src: string, q: string) {
    const o = load();
    const it = o.items[key(src, q)];
    if (!it || it.done) return;
    it.streak = (it.streak || 0) + 1;
    if (it.streak >= 2) {
      it.done = Date.now();
      o.mastered = (o.mastered || 0) + 1;
    }
    it.last = Date.now();
    save(o);
  },
  focus() {
    const o = load();
    const cut = Date.now() - WEEK;
    const a: { k: string; src: string; q: string; a?: string; n: number; streak: number; last: number }[] = [];
    Object.keys(o.items).forEach((k) => {
      const it = o.items[k]!;
      if (it.done) return;
      const m = it.miss.filter((t) => t >= cut).length;
      if (m) a.push({ k, src: it.src, q: it.q, a: it.a, n: m, streak: it.streak || 0, last: it.last || 0 });
    });
    a.sort((x, y) => y.n - x.n || y.last - x.last);
    return a;
  },
  mastered: () => load().mastered || 0,
  /** "Clear list" button: zero the miss history and mark done. */
  clearAll() {
    const o = load();
    Object.keys(o.items).forEach((k) => {
      o.items[k]!.miss = [];
      o.items[k]!.done = o.items[k]!.done || Date.now();
    });
    lsSet(WK, o);
    weakEvents.emit();
  },
};
