import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Value, lsGetRaw, lsSetRaw, useValue } from "../core/store";

/** Guided tour (original 5.40.22 ten-step walkthrough). Targets are found by the same CSS selectors. */
const TOUR_KEY = "wb_tour_done";
interface Step { click?: string; target: string; title: string; caption: string; tip: string }
const STEPS: Step[] = [
  { click: '.tabbtn[data-target="tab-start"]', target: ".start-hero", title: "Welcome to Workbench! 👋", caption: "We are really glad you are here. Workbench is one friendly place for school tools, media, and arcade games. This quick tour shows what each area does and how to use it. It takes about a minute, and you can skip any time.", tip: "Use Next, or the left and right arrow keys." },
  { target: ".tabs", title: "Your tabs", caption: "These tabs along the top are how you get around. Click or tap one to open that area, and come back to Start whenever you like.", tip: "Tap any tab to jump straight there." },
  { target: ".start-grid", title: "Start cards", caption: "Each card is a shortcut to part of Workbench. Hover over a card to flip it and read more, then click or tap it to jump right in.", tip: "Try it: hover over a card." },
  { click: '.tabbtn[data-target="tab-edu"]', target: ".edu-cabinet-wall", title: "Educational", caption: "Your study corner: Study Notes, Coding Studio, Math Lab, Memory Deck, Engineering, Student Desk, Python Lab, Spanish, and Algebra. Click a cabinet to select it, and a bright blue ring circles your pick while its workspace opens right below. Everything saves privately in your browser.", tip: "Try it: click any cabinet." },
  { target: '.edu-cab[data-lab="type"]', title: "Type Rush", caption: "Build typing speed and accuracy. Press Start, type each phrase as it appears, and watch your WPM and accuracy update live. Switch on the Finger Guide to see which finger presses each key.", tip: "Try it: click Type Rush, then press Start." },
  { click: '.tabbtn[data-target="tab-videos"]', target: "#media-select-screen", title: "Media", caption: "Pick a card to open it. Video lets you import your own videos and watch them in a built-in player, Studio has image tools, and Utility Bay has handy everyday tools like a QR generator and unit converter. The Music player is coming soon.", tip: "Use the Back button inside a section to return to this menu." },
  { click: '.tabbtn[data-target="tab-arcade"]', target: ".arcade-head", title: "Arcade", caption: "This is your game library. Browse shelves of games, click a tile to see what it is, then press Play. Winning earns you points.", tip: "Try it: click any game tile." },
  { target: "#wb-lib-nav", title: "Find your game", caption: "Switch between collections like Favorites, Recently played, and the Patience, Fast, and Skill games. Use the search bar to find a game by name, tap a tile star to save a favorite, and pick Casual, Normal, or Hardcore before you play. Block World, a build-and-mine sandbox, lives in the Arcade too.", tip: "Try it: click a collection, then press Play." },
  { click: '.tabbtn[data-target="tab-data"]', target: ".data-intro", title: "User / Saves", caption: "Your personal corner. Set a display name and picture, check your scores and the leaderboard, unlock banners with points, and export or import your progress to back it up or move to another device.", tip: "Try it: type a display name." },
  { click: '.tabbtn[data-target="tab-start"]', target: "#wb-tour-launch", title: "You are all set! 🎉", caption: "That is the tour. Explore at your own pace and have fun. If you ever want a refresher, press Take the tour here on the Start tab.", tip: "" },
];

const tourActive = new Value(false);
export const startTour = () => {
  tourIndex.set(0);
  tourActive.set(true);
};
const tourIndex = new Value(0);

const find = (s: Step) => {
  try { return document.querySelector<HTMLElement>(s.target); } catch { return null; }
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Tour() {
  const active = useValue(tourActive);
  const index = useValue(tourIndex);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [card, setCard] = useState({ left: 12, top: 12 });
  const [shown, setShown] = useState(0);
  const moving = useRef(false);
  const cardRef = useRef<HTMLElement>(null);

  const position = useCallback(() => {
    const target = find(STEPS[tourIndex.get()]!);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const pad = 5;
    setRect({ left: Math.max(4, r.left - pad), top: Math.max(4, r.top - pad), width: Math.max(20, r.width + pad * 2), height: Math.max(20, r.height + pad * 2) });
    const cw = Math.min(340, window.innerWidth - 32);
    const ch = cardRef.current?.offsetHeight || 150;
    const gap = 16;
    let left = r.left + (r.width - cw) / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - cw - 12));
    let top = r.top + r.height / 2 < window.innerHeight / 2 ? r.bottom + gap : r.top - ch - gap;
    top = Math.max(12, Math.min(top, window.innerHeight - ch - 12));
    setCard({ left, top });
  }, []);

  const render = useCallback(async (i: number) => {
    if (!tourActive.get() || moving.current) return;
    moving.current = true;
    const idx = Math.max(0, Math.min(i, STEPS.length - 1));
    tourIndex.set(idx);
    const step = STEPS[idx]!;
    if (!find(step)) {
      moving.current = false;
      return;
    }
    if (step.click) document.querySelector<HTMLElement>(step.click)?.click();
    await wait(250);
    const t = find(step);
    if (!t) { moving.current = false; return; }
    t.scrollIntoView({ block: "nearest", inline: "nearest" });
    await wait(20);
    setShown(idx);
    position();
    moving.current = false;
  }, [position]);

  const finish = useCallback((markDone: boolean) => {
    tourActive.set(false);
    if (markDone) lsSetRaw(TOUR_KEY, "1");
  }, []);

  // First-load trigger (350ms after boot) and relaunch.
  useEffect(() => {
    if (lsGetRaw(TOUR_KEY) !== "1") {
      const t = setTimeout(() => startTour(), 350);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    if (active) render(0);
  }, [active, render]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "Escape") { e.preventDefault(); finish(true); }
    };
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  });

  useLayoutEffect(() => { if (active) position(); }, [shown]);

  function next() {
    if (!tourActive.get() || moving.current) return;
    if (tourIndex.get() >= STEPS.length - 1) { finish(true); return; }
    render(tourIndex.get() + 1);
  }
  function back() {
    if (!tourActive.get() || moving.current || tourIndex.get() <= 0) return;
    render(tourIndex.get() - 1);
  }

  const step = STEPS[shown]!;
  return (
    <div id="wb-tour-root" hidden={!active} aria-hidden={!active}>
      <div className="wb-tour-overlay" aria-hidden="true"></div>
      <div className="wb-tour-spotlight" aria-hidden="true" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}></div>
      <section className="wb-tour-card" ref={cardRef} role="dialog" aria-modal="true" aria-live="polite" style={{ left: card.left, top: card.top }}>
        <div className="wb-tour-step">{shown + 1} / {STEPS.length}</div>
        <div className="wb-tour-title">{step.title}</div>
        <p className="wb-tour-caption">{step.caption}</p>
        <p className="wb-tour-tip">{step.tip}</p>
        <div className="wb-tour-controls">
          <button type="button" className="wb-tour-skip" onClick={() => finish(true)}>Skip</button>
          <button type="button" className="wb-tour-back" disabled={shown === 0} style={{ opacity: shown === 0 ? 0.45 : 1, cursor: shown === 0 ? "default" : "pointer" }} onClick={back}>Back</button>
          <button type="button" className="wb-tour-next" onClick={next}>{shown === STEPS.length - 1 ? "Let’s go" : "Next"}</button>
        </div>
      </section>
    </div>
  );
}
