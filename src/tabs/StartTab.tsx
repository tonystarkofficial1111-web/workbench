import { useEffect, useRef, useState } from "react";
import { activeTab, goto, type TabId } from "../core/nav";
import { useEmitter, useValue } from "../core/store";
import { startTour } from "../components/Tour";
import { WB_SOUND } from "../core/sound";
import { studyEvents, dueList } from "../features/study";
import { wbWeak, weakEvents } from "../features/weak";
import { openWifi } from "./ArcadeTab";
import { TrailBackground } from "../components/TrailBackground";
import { eduRequest } from "./EduTab";

const CARDS: { goto: TabId; icon: string; title: string; text: string }[] = [
  { goto: "tab-edu", icon: "📚", title: "Educational", text: "Study notes, coding, math, flashcards, engineering tools, and a student dashboard." },
  { goto: "tab-videos", icon: "🎬", title: "Media", text: "Watch and manage your video collection. A built-in media player for your entertainment." },
  { goto: "tab-arcade", icon: "🕹️", title: "Arcade", text: "60 cabinets including Rooftop Rumble, Neon Sprint, Circuit Snake, Bot Defense, and more. Win to earn points and climb the leaderboard." },
  { goto: "tab-world", icon: "🌍", title: "Block World", text: "Build, mine, and manage your voxel world. Block World is now accessible from Arcade → Block World." },
  { goto: "tab-ai", icon: "🤖", title: "Assistant", text: "Your AI helper. Ask questions, get tips for games, or chat about anything. Powered by a built-in language model." },
  { goto: "tab-data", icon: "👤", title: "User / Saves", text: "Manage your profile, track progress, view high scores, unlock themes, and export/import your saves. Also toggle the tab layout here." },
  { goto: "tab-dev", icon: "⚙️", title: "Developer Options", text: "Behind-the-scenes stats, live controls, changelog, and build rules. Password-protected for developers only." },
];

const TUTORIAL = [
  ["Pick a tab", " up top — Start, Educational, Media, Arcade, Assistant, User / Saves, or Developer options."],
  ["Block World", " drops you into a 3D voxel world. Use the hotbar to place blocks and tools."],
  ["Arcade", " lists every cabinet. Use the search bar to filter, click ★ to favorite a game, and press Enter to launch the focused cabinet."],
  ["Earn coins", " by playing games — check your balance in the top-right corner."],
  ["User / Saves", " holds your themes, custom accent color, scores, and export/import backups."],
  ["Keyboard tips:", " Arrow keys move between tabs and cabinets; Enter launches; Esc closes a game."],
] as const;

function WeeklyFocus() {
  useEmitter(weakEvents);
  const [practice, setPractice] = useState<ReturnType<typeof wbWeak.focus> | null>(null);
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [got, setGot] = useState(0);
  const [keep, setKeep] = useState(0);
  const f = wbWeak.focus();

  function finishLater() {
    setTimeout(() => setPractice(null), 4500);
  }
  function advance(ok: boolean) {
    const it = practice![idx]!;
    if (ok) { setGot((g) => g + 1); wbWeak.ok(it.src, it.q); }
    else { setKeep((k) => k + 1); wbWeak.log(it.src, it.q, it.a); }
    setReveal(false);
    const n = idx + 1;
    setIdx(n);
    if (n >= practice!.length) finishLater();
  }

  let area: React.ReactNode = null;
  if (practice) {
    if (idx >= practice.length) {
      area = <p className="wb44-q">Practiced {practice.length} · got {got} · {keep} still to work on</p>;
    } else {
      const it = practice[idx]!;
      area = (
        <>
          <small className="wb44-mu">Item {idx + 1} of {practice.length} · {it.src}</small>
          <div className="wb44-q">{it.q}</div>
          <div className="wb44-a" style={{ display: reveal ? "block" : "none" }}>{it.a || "(no stored answer)"}</div>
          <div className="wb44-row">
            {!reveal ? (
              <button type="button" className="wb44-btn" onClick={() => setReveal(true)}>Show answer</button>
            ) : (
              <>
                <button type="button" className="wb44-btn" onClick={() => advance(true)}>Got it ✓</button>
                <button type="button" className="wb44-btn bad" onClick={() => advance(false)}>Missed ✗</button>
              </>
            )}
          </div>
        </>
      );
    }
  }

  return (
    <div id="wb-weekly-focus">
      <h3>🎯 Weekly focus{f.length ? " — " + f.length + " to review" : ""}</h3>
      {!f.length ? (
        <p className="wb44-mu">Nothing missed this week. Wrong answers from flashcards, the notes quiz, Spanish, Algebra and Type Rush will collect here.</p>
      ) : (
        <>
          <p className="wb44-mu">Your most-missed items from the last 7 days. Get one right twice in a row (here or in its game) and it leaves the list.</p>
          {f.slice(0, 5).map((i) => (
            <div className="wb53-wrow" key={i.k}>
              <span className="wb53-chip">{i.src}</span>
              <b title={i.q}>{i.q}</b>
              <small className="wb44-mu">×{i.n}{i.streak ? " · ✓1/2" : ""}</small>
            </div>
          ))}
          {f.length > 5 && <small className="wb44-mu">+ {f.length - 5} more</small>}
          <div className="wb44-row">
            <button type="button" className="wb44-btn" onClick={() => { setPractice(f.slice(0, 5)); setIdx(0); setGot(0); setKeep(0); setReveal(false); }}>Practice now</button>
            <button type="button" className="wb44-btn ghost" onClick={() => { if (!confirm("Clear this week's focus list?")) return; wbWeak.clearAll(); }}>Clear list</button>
          </div>
        </>
      )}
      <div>{area}</div>
    </div>
  );
}

export function StartTab() {
  const tab = useValue(activeTab);
  useEmitter(studyEvents);
  const [tutOpen, setTutOpen] = useState(false);
  const due = dueList().length;
  const ref = useRef<HTMLElement>(null);

  return (
    <section id="tab-start" className={"tab" + (tab === "tab-start" ? " active" : "")} ref={ref}>
      <TrailBackground tabRef={ref} />
      <div className="start-wrap">
        <div className="start-hero">
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>Stark Enterprises</div>
          <h2>Welcome to Workbench</h2>
          <p>Your all-in-one workspace for school, coding, engineering, media, AI, arcade games, and more. Pick a tab from above to get started.</p>
          <button id="wb-tour-launch" type="button" onClick={() => startTour()}>Take the tour</button>
        </div>
        <div className="wb44-card">
          <span>📚 Flashcards due today: {due}</span>
          <button
            className="wb44-btn"
            type="button"
            onClick={() => {
              goto("tab-edu");
              setTimeout(() => eduRequest.set({ open: "memory", startReview: true, n: Date.now() }), 120);
            }}
          >
            Review now
          </button>
        </div>
        <WeeklyFocus />
        <div className="wb-notice" role="note" aria-label="Workbench notice">
          <p>Workbench does not associate with anyone and/or anything. Workbench as a whole is a tool, and shall not be treated and/or categorized as a game nor as an AI. Workbench was made with the intention of studying, helping those without resources such as wifi and/or internet access.</p>
          <p className="wb-notice-warn"><strong>DO NOT, under any circumstances SHARE THIS FILE for other abilities, versioning and tracking will be used to enforce such statements.</strong></p>
        </div>
        <div className="tutorial-card">
          <p className="tut-q">Need help? New here?</p>
          <p className="tut-label">Tutorial</p>
          <button
            className="tut-toggle"
            id="tut-toggle"
            type="button"
            onClick={() => { setTutOpen((o) => !o); WB_SOUND.click(); }}
          >
            {tutOpen ? "▼ Hide the quick-start guide" : "▶ Show the quick-start guide"}
          </button>
          <div className={"tutorial-steps" + (tutOpen ? " open" : "")} id="tutorial-steps">
            <ol>
              {TUTORIAL.map(([b, t]) => (
                <li key={b}><strong>{b}</strong>{t}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="wifi-card">
          <p className="wifi-q">📡 Play with friends?</p>
          <p className="wifi-sub">Connect over your school or home Wi-Fi to share scores and see a live leaderboard with other players on the same network. No internet required — it works on a local network.</p>
          <button className="wifi-btn" id="wifi-open" type="button" onClick={() => openWifi()}>Connect to the Wi-Fi</button>
        </div>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>What's inside?</h3>
        <div className="start-grid">
          {CARDS.map((c) => (
            <div
              className="start-card"
              data-goto={c.goto}
              key={c.goto}
              // The original looked up a matching tab BUTTON; Block World has none, so that card does nothing.
              onClick={() => { if (c.goto !== "tab-world") goto(c.goto); }}
            >
              <div className="sc-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--panel)", border: "2px solid var(--line)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>💾 Progress &amp; Saves</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>Your complete Workbench save can include Block World, arcade progress, Assistant memory and conversation, study notes, flashcards, and dashboard data in one file. Everything stays on your device.</p>
        </div>
        <div style={{ background: "var(--panel)", border: "2px solid var(--line)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>🎯 Getting Started</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
            1. Click <strong>Block World</strong> to enter the 3D world. Choose Creative or Legacy Mode.<br />
            2. Use the <strong>Hotbar</strong> at the bottom to select blocks and tools.<br />
            3. In <strong>Arcade</strong>, tap any cabinet to play a mini-game.<br />
            4. Visit <strong>User / Saves</strong> to change themes, view scores, and toggle the tab layout.<br />
            5. Check <strong>Developer Options</strong> for live stats and controls.
          </p>
        </div>
      </div>
    </section>
  );
}
