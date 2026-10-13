import { useEffect, useMemo, useRef, useState } from "react";
import { activeTab, arcadeSub, goto } from "../core/nav";
import { Value, useEmitter, useValue } from "../core/store";
import { WB_SOUND } from "../core/sound";
import { bestScoreFor, commitProfile, getFavs, getProfile, getRecents, profileEvents, tickEvents } from "../core/profile";
import { BY_ID, CATALOG, CATS, coverFor, type Cat, type CatalogItem } from "../arcade/catalog";
import { launchCarHub, launchGame, isLaunchable } from "../arcade/launch";
import { dailyEvents, dailyView, wireDaily } from "../arcade/daily";
import { WifiModal, wifiOpen } from "../arcade/WifiModal";
import { arcadeStats } from "./DataTab";
import { getStreak } from "../features/badges";
import { overlayOpen } from "../core/overlay";
import rogLogo from "../assets/logo-rog.png";
import xboxLogo from "../assets/logo-xbox.png";
import nintendoLogo from "../assets/logo-nintendo.png";

export const openWifi = () => wifiOpen.set(true);
/** Lets the Block World tab tell the Arcade what the World mode picker is doing. */
export const worldUi = { modeSelect: new Value(false) };

const LOGO_ROT = { rog: "13.68deg", xbox: "-13.19deg", nintendo: "-9.22deg", retro: "-12.01deg" };
const difficultyOptions: [string, string][] = [["Casual", "1.0x"], ["Normal", "1.25x"], ["Hardcore", "1.6x"]];

type View = "home" | "all" | "fav" | "recent" | "soon" | Cat;

function Tile({ it, sel, onSelect, onFav }: { it: CatalogItem; sel: boolean; onSelect: (id: string, open: boolean) => void; onFav: (id: string) => void }) {
  const c = CATS[it.cat];
  const fav = getFavs().indexOf(it.id) >= 0;
  const sc = bestScoreFor(it.key);
  return (
    <div
      className={"wb-tile" + (sel ? " sel" : "") + (it.soon ? " soon" : "")}
      data-id={it.id}
      style={{ ["--c" as any]: c.color }}
      tabIndex={0}
      role="button"
      aria-label={it.name}
      onClick={() => onSelect(it.id, true)}
      onDoubleClick={() => { onSelect(it.id, false); play(it); }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (sel) play(it); else onSelect(it.id, true);
      }}
    >
      <div className="wb-tile-art" dangerouslySetInnerHTML={{ __html: coverFor(it.name) }} />
      {it.soon ? <span className="wb-tile-badge">SOON</span> : sc > 0 ? <span className="wb-tile-badge score">{"★ " + sc}</span> : null}
      {!it.soon && (
        <span className={"wb-tile-fav" + (fav ? " on" : "")} data-fav={it.id} role="button" aria-label={"Favorite " + it.name}
          onClick={(e) => { e.stopPropagation(); onFav(it.id); }}>{fav ? "★" : "☆"}</span>
      )}
      <div className="wb-tile-meta"><div className="wb-tile-name">{it.name}</div><div className="wb-tile-sub">{it.sub}</div></div>
    </div>
  );
}

function pushRecent(id: string) {
  const p = getProfile();
  const r = p.recents || (p.recents = []);
  const i = r.indexOf(id);
  if (i >= 0) r.splice(i, 1);
  r.unshift(id);
  p.recents = r.slice(0, 12);
  commitProfile();
}
function play(it: CatalogItem) {
  if (it.soon) return;
  pushRecent(it.id);
  launchGame(it.key);
}
function toggleFav(id: string) {
  const f = getFavs();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1);
  else { f.push(id); WB_SOUND.win(); }
  getProfile().favorites = f;
  commitProfile();
}

function Library() {
  useEmitter(profileEvents);
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const playable = useMemo(() => CATALOG.filter((i) => !i.soon), []);
  const first = () => { const r = getRecents().map((id) => BY_ID[id]).filter((i) => i && !i.soon); return r.length ? r[0]!.id : playable[0]?.id || null; };
  const [selId, setSelId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const sel = selId || first();
  const diff = getProfile().difficulty || "Casual";
  const [diffState, setDiffState] = useState(diff);

  const list = (v: View | string): CatalogItem[] => {
    if (v === "all") return playable;
    if (v === "fav") return playable.filter((i) => getFavs().indexOf(i.id) >= 0);
    if (v === "recent") return getRecents().map((id) => BY_ID[id]).filter((i): i is CatalogItem => !!i && !i.soon);
    if (v === "soon") return CATALOG.filter((i) => i.soon);
    if (v in CATS) return playable.filter((i) => i.cat === v);
    return playable;
  };
  const select = (id: string, open: boolean) => { setSelId(id); if (open) setSheet(true); };
  const q = query.trim();

  const tile = (it: CatalogItem) => <Tile key={it.id} it={it} sel={it.id === sel} onSelect={select} onFav={toggleFav} />;
  const shelf = (title: string, sub: string, arr: CatalogItem[], viewKey: string) =>
    arr.length ? (
      <section className="wb-shelf" key={title}>
        <div className="wb-shelf-head"><h3>{title}</h3><span>{sub}</span>{viewKey ? <button type="button" data-view={viewKey} onClick={() => { setView(viewKey as View); setQuery(""); }}>{"View all (" + arr.length + ") →"}</button> : null}</div>
        <div className="wb-row">{arr.slice(0, 8).map(tile)}</div>
      </section>
    ) : null;
  const grid = (title: string, sub: string, arr: CatalogItem[], empty?: string) => (
    <>
      <div className="wb-view-head"><h3>{title}</h3><span>{sub}</span></div>
      {arr.length ? <div className="wb-grid">{arr.map(tile)}</div> : <div className="wb-empty">{empty || "Nothing here yet."}</div>}
    </>
  );

  let body: React.ReactNode;
  if (q) {
    const ql = q.toLowerCase();
    const res = CATALOG.filter((i) => i.name.toLowerCase().indexOf(ql) >= 0 || i.cat.indexOf(ql) >= 0 || i.sub.toLowerCase().indexOf(ql) >= 0);
    body = grid("Search results", res.length + " found for “" + q + "”", res, "No games match that search.");
  } else if (view === "home") {
    body = (
      <>
        {shelf("Continue playing", "Pick up where you left off", list("recent"), "recent")}
        {shelf("Favorites", "Your starred games", list("fav"), "fav")}
        {shelf("Patience", CATS.patience.blurb, list("patience"), "patience")}
        {shelf("Fast", CATS.fast.blurb, list("fast"), "fast")}
        {shelf("Skill", CATS.skill.blurb, list("skill"), "skill")}
      </>
    );
  } else if (view === "all") body = grid("All games", playable.length + " games to play", playable);
  else if (view === "fav") body = grid("Favorites", "Tap the star on any game to add it", list("fav"), "No favorites yet. Tap the star on a game to add it here.");
  else if (view === "recent") body = grid("Recently played", "Your latest games", list("recent"), "You have not played anything yet. Pick a game and press Play.");
  else if (view === "soon") body = grid("Coming soon", "Cabinets still being built", list("soon"));
  else body = grid(CATS[view as Cat].label + " games", CATS[view as Cat].blurb, list(view));

  const navBtn = (v: View, label: string, n?: number, dot?: string) => (
    <button type="button" key={v} className={"wb-nav-btn" + (view === v && !q ? " on" : "")} data-view={v} onClick={() => { setView(v); setQuery(""); }}>
      {dot ? <span className="wb-dot" style={{ ["--c" as any]: dot }}></span> : null}
      <span>{label}</span>
      {n != null ? <span className="n">{n}</span> : null}
    </button>
  );

  const it = sel ? BY_ID[sel] : undefined;
  const c = it ? CATS[it.cat] : null;
  const best = it ? bestScoreFor(it.key) : 0;
  return (
    <section id="wb-lib" className="wb-lib" aria-label="Arcade game library">
      <nav className="wb-lib-nav" id="wb-lib-nav" aria-label="Collections">
        {navBtn("home", "Library")}
        {navBtn("all", "All games", playable.length)}
        {navBtn("fav", "★ Favorites", list("fav").length)}
        {navBtn("recent", "Recently played", list("recent").length)}
        <div className="wb-nav-sep"></div>
        {navBtn("patience", "Patience", list("patience").length, CATS.patience.color)}
        {navBtn("fast", "Fast", list("fast").length, CATS.fast.color)}
        {navBtn("skill", "Skill", list("skill").length, CATS.skill.color)}
        <div className="wb-nav-sep"></div>
        {navBtn("soon", "Coming soon", list("soon").length)}
      </nav>
      <div className="wb-lib-main">
        <div className="wb-lib-bar" id="wb-lib-toolbar">
          <label className="wb-lib-search"><span aria-hidden="true">{"🔍"}</span>
            <input type="search" id="wb-lib-search" placeholder="Search games" aria-label="Search games" value={query} onChange={(e) => setQuery(e.target.value.trim() === e.target.value ? e.target.value : e.target.value)} />
          </label>
          <label className="wb-lib-diff"><span>Difficulty</span>
            <span id="wb-lib-diff-slot">
              <select id="wb-difficulty" value={diffState} style={{ padding: "7px 10px", borderRadius: 20, border: "2px solid var(--line)", background: "var(--panel-2)", color: "var(--text)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
                onChange={(e) => { setDiffState(e.target.value); getProfile().difficulty = e.target.value; commitProfile(); WB_SOUND.click(); }}>
                {difficultyOptions.map(([d, m]) => <option key={d} value={d}>{"⚡ " + d + " (" + m + ")"}</option>)}
              </select>
            </span>
          </label>
          <span className="wb-lib-diff" id="wb-lib-count">{playable.length + " games"}</span>
        </div>
        <div id="wb-lib-view">{body}</div>
      </div>
      <aside className={"wb-lib-detail" + (sheet ? " open" : "")} id="wb-lib-detail" aria-live="polite" style={c ? { ["--c" as any]: c.color } : undefined}>
        {!it ? <div className="wb-detail-empty">Select a game to see what it is.</div> : (
          <>
            <div className="wb-detail-art"><div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: coverFor(it.name) }} />
              <button type="button" className="wb-detail-close" aria-label="Close details" onClick={() => setSheet(false)}>{"✕"}</button></div>
            <div className="wb-detail-body">
              <div className="wb-detail-chips"><span className="wb-chip cat">{c!.label}</span>{it.sub ? <span className="wb-chip">{it.sub}</span> : null}</div>
              <h3>{it.name}</h3>
              <p>{it.soon ? "This cabinet is still being built. Check back soon!" : it.desc || "Press Play to start."}</p>
              <div className="wb-detail-stats"><div><b>{best > 0 ? best : "—"}</b><small>Best score</small></div><div><b>{diffState}</b><small>Difficulty</small></div></div>
              <button type="button" className="wb-play" disabled={it.soon} onClick={() => { setSheet(false); play(it); }}>{it.soon ? "Coming soon" : "▶ Play"}</button>
              {!it.soon && <button type="button" className="wb-favbtn" onClick={() => toggleFav(it.id)}>{getFavs().indexOf(it.id) >= 0 ? "★ Remove from favorites" : "☆ Add to favorites"}</button>}
            </div>
          </>
        )}
      </aside>
    </section>
  );
}

function DailyCard() {
  useEmitter(dailyEvents);
  const d = dailyView();
  if (!d) return null;
  return (
    <div className="wb44-card wb45-daily">
      <div style={{ flex: 1 }}>
        <strong>⭐ Daily challenge: </strong>
        {d.name + " — best today " + (d.best || "—") + " · streak " + d.streak + " 🔥 · best daily ever " + (d.all || "—")}
        {d.recent.length ? <div className="wb44-mu">{"Recent: " + d.recent.join(" · ")}</div> : null}
      </div>
      <button type="button" className="wb44-btn" onClick={() => launchGame(d.key)}>Play</button>
    </div>
  );
}

const WEEKLY = ["Win 3 different skill games", "Earn 30 coins today", "Play 1 game from each category", "Beat your high score twice", "Try all 3 prototype games"];
function Sidebars({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function CarsLayout() {
  useEmitter(profileEvents);
  useEmitter(tickEvents);
  const st = arcadeStats();
  const streak = getStreak().n || 0;
  const seed = new Date().getFullYear() * 100 + Math.floor(new Date().getMonth() / 1);
  const medals = ["as-top", "as-top2", "as-top3"];
  const icons = ["🥇", "🥈", "🥉"];
  return (
    <div className="arcade-layout car-guys-mode">
      <div className="arcade-side arcade-side-left">
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--cyan)" }}>
          <h3>🎮 Arcade Guide</h3>
          <div className="as-item"><span className="as-icon">🟣</span><span>Purple = Patience games</span></div>
          <div className="as-item"><span className="as-icon">🟡</span><span>Yellow = Fast-paced games</span></div>
          <div className="as-item"><span className="as-icon">🔵</span><span>Cyan = Skill games</span></div>
          <div className="as-item"><span className="as-icon">🖱️</span><span>Hover any tile for description</span></div>
          <div className="as-item"><span className="as-icon">📱</span><span>Tap any cabinet to play</span></div>
          <div className="as-item"><span className="as-icon">📊</span><span>Scores in User / Saves tab</span></div>
        </div>
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--accent-violet)", background: "linear-gradient(180deg, rgba(176,112,255,.05), transparent)" }}>
          <h3 style={{ color: "var(--accent-violet)" }}>🟣 Patience Spotlight</h3>
          <div className="as-spotlight"><div className="as-spotlight-title">Crystal Garden</div><div className="as-spotlight-desc">Plant, grow, and harvest crystals before they crack. A relaxing idle game.</div></div>
          <div className="as-spotlight"><div className="as-spotlight-title">Pattern Memory</div><div className="as-spotlight-desc">Watch and repeat glowing tile patterns. Great for memory training.</div></div>
        </div>
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--accent-yellow)", background: "linear-gradient(180deg, rgba(255,213,74,.05), transparent)" }}>
          <h3 style={{ color: "var(--accent-yellow)" }}>🟡 Fast-Paced Spotlight</h3>
          <div className="as-spotlight"><div className="as-spotlight-title">Bullet Storm</div><div className="as-spotlight-desc">Dodge bullets from all sides. Pure reflex test.</div></div>
          <div className="as-spotlight"><div className="as-spotlight-title">Rocket Dash</div><div className="as-spotlight-desc">Pilot through narrowing gaps. One crash ends it all.</div></div>
        </div>
      </div>
      <div className="arcade-categories">
        <section className="arcade-category category-skill has-car">
          <div className="arcade-category-head">
            <h3>🚗 CAR</h3>
            <p>Skill or Thinking — choose how you want to approach the car.</p>
          </div>
          <div className="arcade-category-slots">
            <div className="ac-slot car-hub-slot is-car" id="car-hub-slot" style={{ display: "block" }} onClick={() => launchCarHub()}>
              <div className="car-hub-card" id="car-hub-open">
                <div className="car-hub-icon">🏎️</div>
                <div className="car-hub-title">CAR</div>
                <div className="car-hub-sub">A dedicated automotive arcade. Choose <b>Course</b> for driving experiences or <b>Thinking</b> for realistic car-behavior and troubleshooting challenges.</div>
                <div className="car-hub-cta">ENTER CAR GARAGE →</div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="arcade-side arcade-side-right">
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--amber)" }}>
          <h3>🏆 Your Stats</h3>
          <div className="as-item"><span className="as-icon">🎮</span><span>Games Played</span><span className="as-val" id="as-total-played">{st.total}</span></div>
          <div className="as-item"><span className="as-icon">🎯</span><span>Cabinets Tried</span><span className="as-val" id="as-cabinets-tried">{st.cabinetsTried + "/59"}</span></div>
          <div className="as-item"><span className="as-icon">⏱️</span><span>Arcade Time</span><span className="as-val" id="as-arcade-time">{Math.floor(st.arcadeTime) + "s"}</span></div>
          <div className="as-item"><span className="as-icon">🏅</span><span>Achievements</span><span className="as-val" id="as-ach-count">{st.achCount}</span></div>
        </div>
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--accent-rose)" }}>
          <h3>💎 Top Scores</h3>
          {medals.map((m, i) => (
            <div className="as-item" key={m}><span className="as-icon">{icons[i]}</span><span id={m + "-game"}>{st.top3[i] ? st.top3[i]!.game : "—"}</span><span className="as-val" id={m + "-score"}>{st.top3[i] ? st.top3[i]!.score : 0}</span></div>
          ))}
        </div>
        <div className="arcade-side-card" style={{ borderLeft: "3px solid var(--accent-green)" }}>
          <h3>🎯 Daily Challenge</h3>
          <div className="as-challenge"><b>Today:</b> Play 1 slow-paced game and 1 fast-paced game. Mix it up!</div>
          <div className="as-challenge" style={{ marginTop: 8 }}><b>Streak:</b> <span id="as-streak">{streak}</span> days. Come back tomorrow!</div>
          <div className="as-challenge" style={{ marginTop: 8 }}><b>📊 Weekly:</b> {WEEKLY[seed % WEEKLY.length]}</div>
        </div>
      </div>
    </div>
  );
}

export function ArcadeTab() {
  const tab = useValue(activeTab);
  const sub = useValue(arcadeSub);
  const [subBtn, setSubBtn] = useState<"games" | "world" | "cars">("games");
  const [, force] = useState(0);
  useEffect(() => { wireDaily(); }, []);
  // refresh when the overlay closes (scores/recents)
  useEffect(() => {
    const iv = setInterval(() => { /* overlayOpen is read at render time by children */ force((n) => n + 1); }, 4000);
    return () => clearInterval(iv);
  }, []);
  void overlayOpen;

  const cars = sub === "cars";
  const click = (k: "games" | "world" | "cars") => {
    WB_SOUND.click();
    if (k === "world") {
      // the Arcade "Block World" sub-tab opens the World screen with its mode picker
      worldUi.modeSelect.set(true);
      goto("tab-world");
      return;
    }
    setSubBtn(k);
    arcadeSub.set(k === "cars" ? "cars" : "games");
  };
  return (
    <section id="tab-arcade" className={"tab" + (tab === "tab-arcade" ? " active" : "")}>
      <div className={"arcade-wrap wb-lib-on" + (cars ? " car-guys-mode" : "")}>
        <div className="arcade-platform-wall" aria-hidden="true">
          <img className="arcade-logo logo-rog" alt="Republic of Gamers" src={rogLogo} style={{ ["--logo-rot" as any]: LOGO_ROT.rog }} />
          <img className="arcade-logo logo-xbox" alt="Xbox" src={xboxLogo} style={{ ["--logo-rot" as any]: LOGO_ROT.xbox }} />
          <img className="arcade-logo logo-nintendo" alt="Nintendo" src={nintendoLogo} style={{ ["--logo-rot" as any]: LOGO_ROT.nintendo }} />
          <div className="arcade-logo logo-retro" aria-label="Retro Future" style={{ ["--logo-rot" as any]: LOGO_ROT.retro }}><span>RETRO<br /><b>FUTURE</b></span></div>
        </div>
        <div className="arcade-race-sweep" aria-hidden="true"><span className="race-trail"></span><span className="race-car race-car-1">🏎️</span><span className="race-car race-car-2">🏎️</span><span className="race-car race-car-3">🏎️</span></div>
        <div className="arcade-head">
          <h2>🕹️ Arcade</h2>
          <p>Your game library. Pick a game, read what it is, and press Play. Scores and the leaderboard live in the User / Saves tab.</p>
          <div className="arcade-subtabs">
            <button className={"subtab" + (subBtn === "games" ? " active" : "")} data-sub="games" type="button" onClick={() => click("games")}>🎮 Games</button>
            <button className={"subtab" + (subBtn === "world" ? " active" : "")} data-sub="world" type="button" onClick={() => click("world")}>🌍 Block World</button>
            <button className={"subtab cursive" + (subBtn === "cars" ? " active" : "")} id="cars-subtab" type="button" data-sub="cars" onClick={() => click("cars")}>🚗 Specially made for car guys</button>
          </div>
        </div>
        <DailyCard />
        <Library />
        {cars && <CarsLayout />}
      </div>
      <WifiModal />
    </section>
  );
}
