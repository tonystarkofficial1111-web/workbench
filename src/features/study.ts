import { Emitter, lsGet, lsSet } from "../core/store";

/* Study data shared by Educational, Start (due cards), Assistant (/note) and badges. */

export interface Note {
  title: string;
  tags: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
}
export interface Card {
  front: string;
  back: string;
}

export const studyEvents = new Emitter();

const NOTES_KEY = "wb-study-notes";
const CARDS_KEY = "wb-flashcards";
const SRS_KEY = "wb-srs-v1";
const DASH_KEY = "wb-student-dashboard";

/** Notes live in module memory (as in the original) and persist on every commit. */
let notes: Note[] = lsGet<Note[]>(NOTES_KEY, []);
let cards: Card[] = lsGet<Card[]>(CARDS_KEY, []);

export const getNotes = () => notes;
export const getCards = () => cards;
export const getDashboard = () => lsGet<{ assignments?: number; minutes?: number }>(DASH_KEY, {});

export function saveNotes() {
  lsSet(NOTES_KEY, notes);
  studyEvents.emit();
}
export function saveCards() {
  lsSet(CARDS_KEY, cards);
  studyEvents.emit();
}
export function setNotes(next: Note[]) {
  notes = next;
  saveNotes();
}
export function addNote(title: string, body: string) {
  notes.push({ title, tags: "assistant", body, pinned: false, updatedAt: Date.now() });
  saveNotes();
}
export function addCard(front: string, back: string) {
  cards.push({ front, back });
  saveCards();
}
export function deleteCard(i: number) {
  cards.splice(i, 1);
  saveCards();
}
export function clearCards() {
  cards = [];
  lsSet(CARDS_KEY, []);
  studyEvents.emit();
}

/* ------------------------- spaced repetition ------------------------- */

const DAY = 864e5;
interface Srs {
  ivl: number;
  ease: number;
  reps: number;
  lapses: number;
  due?: number;
}
export const cardId = (c: Card) => c.front + "\u0001" + c.back;
const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};
export const srsState = () => lsGet<Record<string, Srs>>(SRS_KEY, {});
export function srsReps(): number {
  const o = srsState();
  let n = 0;
  Object.keys(o).forEach((k) => (n += o[k]!.reps || 0));
  return n;
}
export function dueList(): Card[] {
  const s = srsState();
  const e = endOfDay();
  return cards
    .filter((c) => {
      const r = s[cardId(c)];
      return !r || (r.due ?? 0) <= e;
    })
    .sort((a, b) => (s[cardId(a)]?.due ?? 0) - (s[cardId(b)]?.due ?? 0));
}
export function rate(c: Card, q: "again" | "good" | "easy", weak: { log: (...a: any[]) => void; ok: (...a: any[]) => void }) {
  const s = srsState();
  const k = cardId(c);
  const r: Srs = s[k] || { ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  if (q === "again") {
    try { weak.log("Flashcards", c.front, c.back); } catch { /* ignore */ }
    r.lapses++;
    r.ease = Math.max(1.3, r.ease - 0.2);
    r.ivl = 0;
    r.reps = 0;
    r.due = Date.now() + 6e5;
  } else {
    try { weak.ok("Flashcards", c.front); } catch { /* ignore */ }
    r.reps++;
    if (q === "easy") {
      r.ivl = Math.max(4, Math.round(Math.max(r.ivl, 1) * r.ease * 1.5));
      r.ease += 0.1;
    } else {
      r.ivl = r.ivl < 1 ? 1 : Math.max(r.ivl + 1, Math.round(r.ivl * r.ease));
    }
    r.due = Date.now() + r.ivl * DAY;
  }
  s[k] = r;
  lsSet(SRS_KEY, s);
  studyEvents.emit();
}
