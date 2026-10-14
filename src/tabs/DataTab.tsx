import { useEffect, useRef, useState } from "react";
import { activeTab, accentHex, layoutMode, toggleLayout, setAccent, resetAccent, chooseTheme } from "../core/nav";
import { useEmitter, useValue } from "../core/store";
import {
  getProfile, profileEvents, tickEvents, achievements, getAchievementState, formatTime, koRatioText,
  totalHighScorePoints, bannerTiers, calcWeightedScore, LB_NAMES,
  resetProfile, commitProfile, checkAchievements,
} from "../core/profile";
import { worldBridge } from "../core/bridge";
import { BADGES, getBadgeState, getStreak, badgeEvents, evalBadges } from "../features/badges";
import { ITEMS, buy, equip, getShop, resetShopColors, shopEvents, lastBackup } from "../features/shop";
import { importSave, openSaveChooser } from "../features/saves";
import { generateShareCard, ShareCardModal } from "../components/ShareCard";

const THEMES: { id: string; bg: string; title: string; lockSecs?: number }[] = [
  { id: "default", bg: "linear-gradient(135deg,#1a1a24,#5fd4c7)", title: "Default" },
  { id: "ember", bg: "linear-gradient(135deg,#1a1210,#ff6b3d)", title: "Ember" },
  { id: "forest", bg: "linear-gradient(135deg,#0e1410,#5fd4a0)", title: "Forest" },
  { id: "violet", bg: "linear-gradient(135deg,#14101a,#b070ff)", title: "Violet" },
  { id: "rose", bg: "linear-gradient(135deg,#1a1014,#ff6b9d)", title: "Rose" },
  { id: "ocean", bg: "linear-gradient(135deg,#0a1929,#1e90ff)", title: "Ocean (1hr+)", lockSecs: 3600 },
  { id: "sunset", bg: "linear-gradient(135deg,#2d1b00,#ff8c00)", title: "Sunset (1hr+)", lockSecs: 3600 },
  { id: "midnight", bg: "linear-gradient(135deg,#000033,#6a0dad)", title: "Midnight (1hr+)", lockSecs: 3600 },
  { id: "aurora", bg: "linear-gradient(135deg,#001a1a,#00ff7f)", title: "Aurora (1hr+)", lockSecs: 3600 },
];

const SCORE_ROWS = [
  { key: "rooftopRumble", name: "Rooftop Rumble", sub: "wins/losses" },
  { key: "circuitRacer", name: "Neon Sprint", sub: "wins/losses" },
  { key: "neonBreaker", name: "Neon Breaker", sub: "bricks" },
  { key: "starfallDefender", name: "Starfall Defender", sub: "score" },
  { key: "circuitSnake", name: "Circuit Snake", sub: "tiles" },
  { key: "neonPong", name: "Neon Pong", sub: "wins" },
  { key: "meteorCommand", name: "Meteor Command", sub: "score" },
  { key: "stackSurge", name: "Stack Surge", sub: "height" },
];

/** Names shown in the arcade sidebar "Top Scores" (the original listed a subset). */
export const SIDEBAR_NAMES: Record<string, string> = {
  neonBreaker: "Neon Breaker", starfallDefender: "Starfall Defender", circuitSnake: "Circuit Snake",
  neonPong: "Neon Pong", meteorCommand: "Meteor Command", stackSurge: "Stack Surge",
  botDefense: "Bot Defense", rooftopRumble: "Rooftop Rumble", circuitRacer: "Neon Sprint",
  crystalGarden: "Crystal Garden", memoryMatch: "Memory Match", colorMixer: "Color Mixer",
  fishingHole: "Fishing Hole", dotConnect: "Dot Connect", slidingPuzzle: "Slide Puzzle",
  patternMemory: "Pattern Memory", towerBuilder: "Tower Builder", bubbleSort: "Bubble Sort",
  idleFarm: "Idle Farm", laserDodge: "Laser Dodge", ninjaDash: "Ninja Dash",
  orbCatcher: "Orb Catcher", bladeSlice: "Blade Slice", gravityFlip: "Gravity Flip",
  bulletStorm: "Bullet Storm", platformJumper: "Platform Jumper", pixelRunner: "Pixel Runner",
  chainReactor: "Chain Reactor", rocketDash: "Rocket Dash",
};

/** Derived arcade statistics shared by the Arcade side panel and the Quick Stats card. */
export function arcadeStats() {
  const p = getProfile();
  const cabinetsTried = p.gamesPlayedByType ? Object.keys(p.gamesPlayedByType).length : 0;
  let achCount = 0;
  if (p.achievements) for (const k in p.achievements) if (p.achievements[k]) achCount++;
  if (p.specialAchievements) for (const k in p.specialAchievements) if (p.specialAchievements[k]) achCount++;
  const all: { game: string; score: number }[] = [];
  if (p.highScores) {
    for (const gk in p.highScores)
      for (const mk in p.highScores[gk]!) {
        const sc = p.highScores[gk]![mk]!;
        if (sc && sc > 0) all.push({ game: SIDEBAR_NAMES[gk] || gk, score: sc });
      }
  }
  all.sort((a, b) => b.score - a.score);
  return { total: p.gamesPlayed || 0, cabinetsTried, arcadeTime: p.secondsOnPage || 0, achCount, top3: all.slice(0, 3) };
}

function ProfilePicture() {
  const p = getProfile();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="profile-pic-section">
      <div className="profile-pic-wrap" id="profile-pic-wrap">
        {p.avatar ? <img src={p.avatar} alt="Profile" /> : <div className="pp-placeholder">👤</div>}
      </div>
      <div className="profile-pic-actions">
        <label htmlFor="profile-pic-input">📷 Upload picture</label>
        <input
          id="profile-pic-input"
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            e.target.value = "";
            if (!file || !file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                const size = 256;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d")!;
                const min = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
                p.avatar = canvas.toDataURL("image/jpeg", 0.85);
                checkAchievements();
                commitProfile();
              };
              img.src = String(reader.result);
            };
            reader.readAsDataURL(file);
          }}
        />
        <button
          type="button"
          className="pp-remove"
          id="profile-pic-remove"
          style={{ display: p.avatar ? "block" : "none" }}
          onClick={() => { p.avatar = ""; checkAchievements(); commitProfile(); }}
        >
          Remove picture
        </button>
      </div>
    </div>
  );
}

export function DataTab() {
  const tab = useValue(activeTab);
  useEmitter(profileEvents);
  useEmitter(tickEvents);
  useEmitter(badgeEvents);
  useEmitter(shopEvents);
  const layout = useValue(layoutMode);
  const accent = useValue(accentHex);
  const day = useValue(worldBridge.day);
  const p = getProfile();
  const [loginStatus, setLoginStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [worldStatus, setWorldStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [shopMsg, setShopMsg] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [themeHint, setThemeHint] = useState<Record<string, string>>({});

  // Quick stats
  const st = arcadeStats();
  const gsState = getAchievementState();
  const ach = achievements;
  const totalPts = totalHighScorePoints();

  // Leaderboard
  const entries: { game: string; mode: string; weighted: number }[] = [];
  const hs = p.highScores || {};
  for (const gk of Object.keys(hs)) {
    for (const mode of Object.keys(hs[gk]!)) {
      const raw = hs[gk]![mode]!;
      if (raw <= 0) continue;
      entries.push({ game: LB_NAMES[gk] || gk, mode, weighted: calcWeightedScore(gk, mode, raw) });
    }
  }
  const rr = p.arcade.rooftopRumble;
  if (rr && rr.wins > 0) entries.push({ game: "Rooftop Rumble", mode: "default", weighted: rr.wins * 100 });
  const cr = p.arcade.circuitRacer;
  if (cr && cr.wins > 0) entries.push({ game: "Neon Sprint", mode: "default", weighted: cr.wins * 100 });
  entries.sort((a, b) => b.weighted - a.weighted);

  // login summary
  const rec = p.arcade.rooftopRumble!;
  const rc = p.arcade.circuitRacer || { wins: 0, losses: 0, fights: 0 };
  const F = (k: string) => (p.arcade[k] || { fights: 0 }).fights;
  const summary =
    "Rooftop: " + (rec.fights === 0 ? "no fights" : rec.wins + "W – " + rec.losses + "L – " + rec.draws + "D · KO " + koRatioText(rec)) +
    " · Sprint: " + (rc.fights === 0 ? "no races" : rc.wins + "W – " + rc.losses + "L") +
    " · Breaker: " + F("neonBreaker") + " · Defender: " + F("starfallDefender") + " · Snake: " + F("circuitSnake") +
    " · Pong: " + F("neonPong") + " · Meteor: " + F("meteorCommand") + " · Stack: " + F("stackSurge") + " · Zombies: " + F("botDefense");

  const bs = getBadgeState();
  const stk = getStreak();
  const unlockedBadges = BADGES.filter((b) => bs.u[b.id]).length;
  const shop = getShop();
  const lb = lastBackup();
  const importRef = useRef<HTMLInputElement>(null);
  const backupFile = useRef<HTMLInputElement>(null);

  useEffect(() => { evalBadges(); }, []);

  return (
    <section id="tab-data" className={"tab" + (tab === "tab-data" ? " active" : "")}>
      <div className="data-wrap">
        <h2>User / Saves</h2>
        <p className="data-intro">Your progress, scores, themes, and leaderboard — all in one place.</p>
        <div className="user-layout">
          <div className="user-left">
            <div className="data-card" style={{ borderLeft: "3px solid var(--cyan)", maxWidth: "none" }}>
              <h3>Quick Stats</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)" }} id="qs-games-played">{st.total}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Games</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)" }} id="qs-cabinets">{st.cabinetsTried}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Cabinets</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-violet)" }} id="qs-achievements">{st.achCount}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Achievements</div>
                </div>
              </div>
            </div>

            <div className="data-card" id="wb-badges-card" style={{ maxWidth: "none" }}>
              <h3>🏅 Badges</h3>
              <p className="wb44-mu">
                {unlockedBadges} / {BADGES.length} unlocked · 🪙 {bs.paid || 0} earned from badges · 🔥 streak {stk.n || 0} day{(stk.n || 0) === 1 ? "" : "s"} (best {stk.best || 0})
              </p>
              <div id="wb-badge-grid">
                {BADGES.map((b) => {
                  const on = !!bs.u[b.id];
                  let pr: [number, number] = [0, 1];
                  try { pr = b.p(); } catch { /* ignore */ }
                  return (
                    <div key={b.id} className={"wb53-badge" + (on ? "" : " off")} title={b.desc + (on ? " — unlocked " + new Date(bs.u[b.id]!).toLocaleDateString() : "")}>
                      <div className="i">{b.icon}</div>
                      <b>{b.name}</b>
                      <span>{b.desc}</span>
                      <div><em>{on ? "✓ +" + b.coins + " 🪙 paid" : "Reward 🪙" + b.coins}</em></div>
                      {!on && (
                        <>
                          <div className="wb53-bar"><i style={{ width: Math.round(100 * Math.min(1, pr[0] / pr[1])) + "%" }}></i></div>
                          <small className="wb44-mu">{Math.min(pr[0], pr[1])} / {pr[1]}</small>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="data-card">
              <h3>🌍 Block World</h3>
              <p>Terrain, buildings, villagers, and inventory.</p>
              <div className="data-actions">
                <button type="button" id="data-world-export-btn" onClick={() => worldBridge.exportBundle()}>Export world</button>
                <label className="login-file-btn" htmlFor="data-world-import-input">Import world…</label>
                <input
                  id="data-world-import-input"
                  type="file"
                  accept="application/json,.json,.wbsave"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    const input = e.target;
                    if (!file) return;
                    importSave(file).then((r) => {
                      setWorldStatus(r.msg);
                      if (r.ok && r.msg === "World loaded.") setTimeout(() => setWorldStatus((s) => (s === "World loaded." ? "" : s)), 2500);
                      input.value = "";
                    });
                  }}
                />
              </div>
              <div className="data-status" id="data-world-status">{worldStatus}</div>
            </div>

            <div className="data-card">
              <h3>🕹️ User Saves</h3>
              <p>Progress for all 60 cabinets, your profile, shop, notes, AI memory and everything else except the Block World.</p>
              <ProfilePicture />
              <div className="login-name-field">
                <label htmlFor="login-name-input">Display name</label>
                <input
                  id="login-name-input"
                  type="text"
                  placeholder="Guest"
                  maxLength={24}
                  autoComplete="off"
                  value={nameFocused ? nameDraft : p.name === "Guest" ? "" : p.name}
                  onFocus={() => { setNameFocused(true); setNameDraft(p.name === "Guest" ? "" : p.name); }}
                  onBlur={() => setNameFocused(false)}
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    p.name = e.target.value.trim() || "Guest";
                    checkAchievements();
                    commitProfile();
                  }}
                />
              </div>
              <div id="login-current">
                Playing as <strong id="login-current-name">{p.name || "Guest"}</strong>
                <br />
                <span id="login-current-summary">{summary}</span>
              </div>
              <div className="time-tracker" style={{ marginBottom: 12 }}>
                <span className="tt-icon">⏱️</span>
                <div>
                  <div className="tt-label">Time in Arcade</div>
                  <div className="tt-value" id="time-tracker-value">{formatTime(p.secondsOnPage || 0)}</div>
                </div>
              </div>
              <div className="time-tracker" style={{ marginBottom: 12 }}>
                <span className="tt-icon">📅</span>
                <div>
                  <div className="tt-label">Game Day (Legacy)</div>
                  <div className="tt-value" id="day-tracker-value">Day {day || 1}</div>
                </div>
              </div>
              <div className="data-card" style={{ marginBottom: 12, padding: 12 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>🎯 Point Unlocks</h3>
                <div id="banner-unlocks" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  {bannerTiers(totalPts).map((b, i) => (
                    <span key={b.name}>
                      {i > 0 && <br />}
                      {(b.unlocked ? "✅" : "🔒") + " " + b.name + " (" + b.threshold + " pts)"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="data-actions">
                <button type="button" id="login-export-btn" onClick={() => openSaveChooser()}>
                  Export progress
                </button>
                <label className="login-file-btn" htmlFor="login-file-input">Import progress…</label>
                <input
                  id="login-file-input"
                  type="file"
                  accept="application/json,.json,.wbsave"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    const input = e.target;
                    if (!file) return;
                    setLoginStatus({ msg: "Reading " + file.name + "…", ok: true });
                    importSave(file).then((r) => {
                      setLoginStatus({ msg: r.msg, ok: r.ok });
                      input.value = "";
                    });
                  }}
                />
              </div>
              <div className={"login-status" + (loginStatus ? " " + (loginStatus.ok ? "ok" : "err") : "")} id="login-status">{loginStatus?.msg || ""}</div>
              <button
                type="button"
                className="ghost"
                id="login-reset-btn"
                style={{ marginTop: 10 }}
                onClick={() => { resetProfile(); setLoginStatus({ msg: "Starting fresh as Guest.", ok: true }); }}
              >
                Reset arcade progress
              </button>
            </div>

            <div className="data-card">
              <h3>📊 Scores</h3>
              <div className="user-scores" id="user-scores-list">
                {SCORE_ROWS.map((g) => {
                  const r = p.arcade[g.key];
                  return (
                    <div className="user-score-row" key={g.key}>
                      <div>
                        <div className="us-label">{g.name}</div>
                        <div className="us-sub">{g.sub}</div>
                      </div>
                      <div className="us-val">{(r ? r.wins : 0) + "W / " + (r ? r.losses : 0) + "L"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="user-right">
            <div className="data-card layout-toggle-card">
              <h3>📐 Tab Layout</h3>
              <p>Switch between horizontal (top) and vertical (left-side) tab navigation.</p>
              <div className="layout-toggle-row">
                <div>
                  <div className="layout-preview layout-preview-horizontal" id="lp-horizontal" style={{ borderColor: layout === "horizontal" ? "var(--amber)" : "var(--line)" }}>
                    <div className="lp-bar lp-top"><span></span><span></span><span></span><span></span></div>
                    <div className="lp-body"></div>
                  </div>
                  <div className="layout-preview-label">Horizontal</div>
                </div>
                <div>
                  <div className="layout-preview layout-preview-vertical" id="lp-vertical" style={{ borderColor: layout === "vertical" ? "var(--amber)" : "var(--line)" }}>
                    <div className="lp-bar lp-side"><span></span><span></span><span></span><span></span></div>
                    <div className="lp-body"></div>
                  </div>
                  <div className="layout-preview-label">Vertical</div>
                </div>
                <button
                  type="button"
                  className={"layout-toggle-btn" + (layout === "vertical" ? " active" : "")}
                  id="layout-toggle-btn"
                  aria-pressed={layout === "vertical"}
                  onClick={() => toggleLayout()}
                >
                  {layout === "vertical" ? "Switch to Horizontal" : "Switch to Vertical"}
                </button>
              </div>
            </div>

            <div className="data-card">
              <h3>🎨 Themes</h3>
              <p>Pick a color scheme.</p>
              <div className="theme-picker" id="theme-picker">
                {THEMES.map((t) => (
                  <div
                    key={t.id}
                    className={"theme-chip" + ((p.theme || "default") === t.id ? " active" : "") + (t.lockSecs ? " locked" : "")}
                    data-theme={t.id}
                    {...(t.lockSecs ? { "data-required-time": String(t.lockSecs) } : {})}
                    style={{ background: t.bg, ...(t.lockSecs ? { opacity: 0.4 } : {}) }}
                    title={themeHint[t.id] || t.title}
                    onClick={() => {
                      const r = chooseTheme(t.id, t.lockSecs || 0);
                      if (!r.ok) setThemeHint((h) => ({ ...h, [t.id]: r.hint! }));
                    }}
                  >
                    {t.lockSecs ? (
                      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 16 }}>🔒</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="data-card">
              <h3>🎨 Accent Color</h3>
              <p>Pick a custom accent color applied across the whole UI.</p>
              <div className="accent-picker" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                <input
                  type="color"
                  id="wb-accent-color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{ width: 46, height: 46, border: "2px solid var(--line)", borderRadius: 8, background: "none", cursor: "pointer", padding: 2 }}
                />
                <button type="button" className="layout-toggle-btn" id="wb-accent-reset" onClick={() => resetAccent()}>Reset to Theme Default</button>
                <span id="wb-accent-hex" style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{accent}</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>Overrides the amber accent used for highlights, active tabs, and borders. Saved automatically.</p>
            </div>

            <div className="data-card">
              <h3>🏆 Leaderboard</h3>
              <p>Difficulty-weighted scores across all games.</p>
              <div id="leaderboard-container">
                {entries.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>No scores yet. Play some games!</p>
                ) : (
                  <table className="lb-table">
                    <thead><tr><th>#</th><th>Game</th><th>Mode</th><th>Score</th></tr></thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={i}><td className="lb-rank">{i + 1}</td><td className="lb-game">{e.game}</td><td className="lb-mode">{e.mode}</td><td className="lb-score">{e.weighted}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="data-card">
              <h3>🏅 Achievements</h3>
              <p id="ach-summary">{ach.filter((a) => p.achievements[a.id]).length} / {ach.length} unlocked</p>
              <div className="ach-grid" id="achievements-grid">
                {ach.map((a) => {
                  const unlocked = !!p.achievements[a.id];
                  const pct = Math.round((a.progress ? a.progress(gsState) : unlocked ? 1 : 0) * 100);
                  const d = unlocked ? new Date(p.achievements[a.id]!) : null;
                  return (
                    <div key={a.id} className={"ach-card " + (unlocked ? "unlocked" : "locked")}>
                      <div className="ach-icon">{a.icon}</div>
                      <div className="ach-name">{a.name}</div>
                      <div className="ach-desc">{a.desc}</div>
                      {d ? (
                        <div className="ach-date">{d.getMonth() + 1 + "/" + d.getDate() + "/" + String(d.getFullYear()).slice(2)}</div>
                      ) : pct > 0 && pct < 100 ? (
                        <div className="ach-progress"><div className="ach-progress-fill" style={{ width: pct + "%" }}></div></div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="data-card share-card-section">
              <h3>🎴 Share Card</h3>
              <p>Generate a shareable card with your stats.</p>
              <button type="button" className="share-card-btn" id="share-card-btn" onClick={() => generateShareCard()}>Generate Share Card</button>
            </div>

            <div className="data-card">
              <h3>📐 How Scoring Works</h3>
              <div className="score-explain" id="score-explainer">
                <h4>Formula</h4>
                <div className="formula">General Score = Raw Score × Difficulty Multiplier × Game Balance</div>
                <h4>Difficulty Multipliers</h4>
                <div>easy/simple: 0.5x &middot; normal: 1x &middot; wrap: 1.5x &middot; speed: 1.5x &middot; hard: 2x &middot; survival: 2x &middot; extreme: 3x &middot; zen: 0.5x</div>
                <h4>Game Balance</h4>
                <div>Most games: 1x &middot; Meteor Command: 0.5x (less skill-based)</div>
                <h4>Examples</h4>
                <span className="example"><strong>Snake on Hard:</strong> 50 tiles × 2.0 (hard) × 1.0 (balance) = <strong>100 points</strong></span>
                <span className="example"><strong>Meteor on Normal:</strong> 100 score × 1.0 (normal) × 0.5 (balance) = <strong>50 points</strong></span>
                <span className="example"><strong>Breaker on Extreme:</strong> 80 bricks × 3.0 (extreme) × 1.0 (balance) = <strong>240 points</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wb44-sec">
        <h3>💾 Back up &amp; restore</h3>
        <p className="wb44-mu">Everything lives in this browser. One cleared cache loses it, so back up often (you will be reminded every 10 minutes). You choose what to save: the Block World, or User saves (everything except the Block World).</p>
        <button className="wb44-btn" type="button" id="backup-open-btn" onClick={() => openSaveChooser()}>Back up…</button>
        <button className="wb44-btn ghost" type="button" id="backup-restore-btn" onClick={() => backupFile.current?.click()}>Restore from a file…</button>
        <input
          type="file"
          accept="application/json,.json,.wbsave"
          style={{ display: "none" }}
          ref={backupFile}
          id="backup-restore-input"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            const input = e.target;
            if (!file) return;
            setBackupStatus("Reading " + file.name + "…");
            importSave(file).then((r) => { setBackupStatus(r.msg); input.value = ""; });
          }}
        />
        <br />
        <span className="wb44-mu">{lb ? "Last User saves backup: " + new Date(lb).toLocaleString() : "No User saves backup yet"}</span>
        <p className="wb44-mu" id="backup-status">{backupStatus}</p>
      </div>

      <div className="wb44-sec">
        <h3>🪙 Coin shop</h3>
        <p className="wb44-mu">Spend the coins you earn in the Arcade. Livery and cover-art frame unlocks are coming in a later update.</p>
        <div>
          {ITEMS.map((it) => {
            const own = shop.owned.indexOf(it.id) >= 0;
            const on = it.kind === "theme" ? shop.theme === it.val : shop.accent === it.val;
            return (
              <div className="wb44-row" style={{ alignItems: "center" }} key={it.id}>
                <span>{it.name} </span>
                {own ? (
                  <button className="wb44-btn" type="button" onClick={() => equip(it)}>{on ? "Equipped ✓" : "Equip"}</button>
                ) : (
                  <button className="wb44-btn" type="button" onClick={() => setShopMsg(buy(it))}>Buy · 🪙{it.price}</button>
                )}
              </div>
            );
          })}
          <button className="wb44-btn ghost" type="button" onClick={() => resetShopColors()}>Reset shop colors</button>
        </div>
        <p className="wb44-mu">{shopMsg}</p>
      </div>
      <ShareCardModal />
    </section>
  );
}
