import { useEffect, useMemo, useRef, useState } from "react";
import { G519Shell } from "../core/overlay";
import { getProfile, trackGamePlayed, saveProfile, ensureProfileShape, checkAchievements } from "../core/profile";
import { wbWeak } from "../features/weak";
import { lsGetRaw, lsSetRaw } from "../core/store";

const TR_PHRASES = [
  "the quick brown fox jumps over the lazy dog", "a journey of a thousand miles begins with a single step",
  "the pc is one of the most fundamental open machines", "practice every day and your fingers will learn the keys",
  "code is read far more often than it is ever written", "neon lights flicker across the quiet arcade at night",
  "the robot counted every coin inside the treasure chest", "a calm mind solves puzzles faster than a rushed one",
  "the workshop hummed as the engine roared to life", "every great program began as a single line of code",
  "the galaxy stretched endlessly beyond the blue planet", "she typed the final word and pressed enter with a smile",
  "precision matters when every keystroke moves the timer forward", "the driver checked the mirrors before entering the next corner",
  "small improvements each day can build remarkable typing speed", "the workshop lights reflected across the polished metal floor",
  "keep your hands relaxed and let your fingers find the rhythm", "the server finished compiling the project just before midnight",
  "a clean line through the corner is faster than a rushed entry", "the mechanic replaced the worn tire before the final practice run",
  "bright pixels danced across the screen as the program came alive", "the rain started falling just as the race entered its final lap",
  "good code should be clear enough for another person to maintain", "the engineer watched the telemetry while the driver chased a faster lap",
  "every mistake is useful when you slow down and understand what happened", "the keyboard clicked steadily while the room stayed completely quiet",
  "the tiny robot followed the line and avoided every obstacle", "the final sector was faster because the driver carried more momentum",
  "practice turns difficult sentences into patterns your hands remember", "the workbench connects many small tools into one creative workspace",
  "precision and rhythm turn difficult typing into confident muscle memory", "the telemetry screen flickered as the engineer adjusted the brake bias",
  "a clean architecture makes complex systems easier to understand and repair", "the driver waited for the perfect apex before committing to full throttle",
  "small details create the difference between a functional machine and a great one", "the circuit lights came alive while the pit crew prepared the car for launch",
  "every carefully placed component gives the finished machine another layer of character", "the keyboard became a control panel as the operator moved through the command sequence",
  "good engineering balances performance reliability simplicity and careful testing", "the final lap demanded patience because speed without control is difficult to recover",
  "the baker folded warm cinnamon into the dough before sunrise", "a lone hiker followed the misty trail up to the quiet ridge",
  "waves rolled across the harbor while the fishing boats drifted home", "the drummer counted four beats and the whole band joined in",
  "the astronaut floated past the window and watched the earth turn", "fresh basil and ripe tomatoes grew along the sunny garden fence",
  "the detective studied the muddy footprints beside the old lighthouse", "thunder rolled over the valley as the first drops hit the roof",
  "the striker dodged two defenders and curled the ball into the net", "a paper map and a thermos of cocoa made the long road feel short",
];

/* ------------------------------ finger guide model ------------------------------ */
type Pt = [number, number];
const FNAME: Record<string, string> = { lp: "left pinky", lr: "left ring finger", lm: "left middle finger", li: "left index finger", ri: "right index finger", rm: "right middle finger", rr: "right ring finger", rp: "right pinky", t: "thumb" };
const FMAP: Record<string, string> = {};
[["1qaz", "lp"], ["2wsx", "lr"], ["3edc", "lm"], ["45rtfgvb", "li"], ["67yuhjnm", "ri"], ["8ik,", "rm"], ["9ol.", "rr"], ["0p;/'", "rp"]].forEach((g) => {
  for (let i = 0; i < g[0]!.length; i++) FMAP[g[0]!.charAt(i)] = g[1]!;
});
FMAP[" "] = "t";
const SHIFTED: Record<string, string> = { "!": "1", "?": "/", ":": ";", '"': "'" };
const GROWS: [number, number, string][] = [[6, 20, "qwertyuiop"], [46, 30, "asdfghjkl;'"], [86, 50, "zxcvbnm,./"]];
const KPOS: Record<string, { x: number; y: number }> = {};
GROWS.forEach((r) => { for (let i = 0; i < r[2].length; i++) KPOS[r[2].charAt(i)] = { x: r[1] + i * 40 + 18, y: r[0] + 18 }; });
KPOS[" "] = { x: 228, y: 143 };

interface HandDef { wrist: Pt; A: Pt; B: Pt; C: Pt; D: Pt; E: Pt; F: Pt; cA1: Pt; cA2: Pt; cD1: Pt; cD2: Pt; top: Pt; f: Record<string, { K: Pt; T: Pt; w: number }> }
const HAND_DEF: Record<"l" | "r", HandDef> = {} as any;
(["l", "r"] as const).forEach((sd) => {
  const mx = (p: Pt): Pt => (sd === "r" ? [456 - p[0], p[1]] : [p[0], p[1]]);
  const d: HandDef = {
    wrist: mx([106, 238]), A: mx([58, 150]), B: mx([66, 238]), C: mx([62, 272]), D: mx([166, 156]), E: mx([146, 238]), F: mx([150, 272]),
    cA1: mx([50, 182]), cA2: mx([56, 214]), cD1: mx([170, 186]), cD2: mx([156, 214]), top: mx([112, 136]), f: {},
  };
  ([["p", [70, 144], [48, 66], 21], ["r", [98, 154], [88, 66], 23], ["m", [126, 160], [128, 66], 23], ["i", [154, 154], [168, 66], 23], ["t", [140, 226], [206, 178], 24]] as [string, Pt, Pt, number][]).forEach((g) => {
    d.f[sd + g[0]] = { K: mx(g[1]), T: mx(g[2]), w: g[3] };
  });
  HAND_DEF[sd] = d;
});

function fingerD(b: Pt, t: Pt, w: number) {
  const cx = b[0] + (t[0] - b[0]) * 0.25, cy = t[1] + (b[1] - t[1]) * 0.45, N = 14;
  const L: Pt[] = [], R: Pt[] = [], tipArc: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const tt = i / N, mt = 1 - tt;
    const px = mt * mt * b[0] + 2 * mt * tt * cx + tt * tt * t[0];
    const py = mt * mt * b[1] + 2 * mt * tt * cy + tt * tt * t[1];
    let dx = 2 * mt * (cx - b[0]) + 2 * tt * (t[0] - cx), dy = 2 * mt * (cy - b[1]) + 2 * tt * (t[1] - cy);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    const nx = -dy, ny = dx, hw = (w / 2) * (1 - 0.2 * tt);
    L.push([px + nx * hw, py + ny * hw]);
    R.push([px - nx * hw, py - ny * hw]);
    if (i === N) {
      for (let a = 1; a < 6; a++) {
        const th = (Math.PI * a) / 6;
        tipArc.push([px + hw * (nx * Math.cos(th) + dx * Math.sin(th)), py + hw * (ny * Math.cos(th) + dy * Math.sin(th))]);
      }
    }
  }
  const pts = L.concat(tipArc).concat(R.reverse());
  return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
}

interface GuideState { label: string; next: string | null; on: string[]; act: { f: string; tip: Pt } | null }
function guideState(ch: string, hasErr: boolean): GuideState {
  const on: string[] = [];
  let act: GuideState["act"] = null;
  const light = (f: string, tip: Pt | null) => {
    const k = f === "t" ? "rt" : f;
    on.push(k);
    if (tip) act = { f: k, tip };
  };
  if (hasErr) { light("rp", [452, 26]); return { label: "Mistake spotted. Press <b>Backspace</b> with your <b>right pinky</b> to fix it.", next: null, on, act }; }
  if (!ch) return { label: "Phrase complete. <b>Nice work.</b>", next: null, on, act };
  let base = ch, shift = false;
  const low = ch.toLowerCase();
  if (SHIFTED[ch]) { base = SHIFTED[ch]!; shift = true; }
  else if (ch !== low && FMAP[low]) { base = low; shift = true; }
  const f = FMAP[base];
  const esc = (c: string) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c);
  if (!f) return { label: "Type <b>" + esc(ch) + "</b>", next: null, on, act };
  const kp = KPOS[base];
  light(f, kp ? [kp.x, kp.y + (base === " " ? 8 : 2)] : null);
  let sf: string | null = null;
  if (shift) { sf = f.charAt(0) === "l" ? "rp" : "lp"; light(sf, null); }
  const nm = base === " " ? "Space" : base.toUpperCase();
  const label = shift
    ? "Hold <b>Shift</b> with your <b>" + FNAME[sf!] + "</b>, then press <b>" + esc(ch) + "</b> with your <b>" + FNAME[f] + "</b>"
    : "Press <b>" + nm + "</b> with your <b>" + FNAME[f] + "</b>";
  return { label, next: base, on, act };
}

function handPaths(act: GuideState["act"]) {
  const out: Record<string, string> = {};
  (["l", "r"] as const).forEach((sd) => {
    const def = HAND_DEF[sd];
    let tx = 0, ty = 0, th = 0, af: string | null = null;
    if (act && act.f.charAt(0) === sd) {
      const fd0 = def.f[act.f];
      if (fd0) {
        const dx = act.tip[0] - fd0.T[0], dy = act.tip[1] - fd0.T[1];
        th = Math.max(-0.2, Math.min(0.2, dx * 0.0016));
        tx = dx * 0.28;
        ty = dy * 0.5;
        af = act.f;
      }
    }
    const W = def.wrist, c = Math.cos(th), s2 = Math.sin(th);
    const P = (p: Pt): Pt => { const x = p[0] - W[0], y = p[1] - W[1]; return [W[0] + x * c - y * s2 + tx, W[1] + x * s2 + y * c + ty]; };
    const pt = (p: Pt) => { const q = P(p); return q[0].toFixed(1) + " " + q[1].toFixed(1); };
    out["fill" + sd] = "M" + pt(def.A) + " C" + pt(def.cA1) + " " + pt(def.cA2) + " " + pt(def.B) + " L" + pt(def.E) + " C" + pt(def.cD2) + " " + pt(def.cD1) + " " + pt(def.D) + " Q" + pt(def.top) + " " + pt(def.A) + " Z";
    out["ea" + sd] = "M" + pt(def.A) + " C" + pt(def.cA1) + " " + pt(def.cA2) + " " + pt(def.B) + " L" + pt(def.C);
    out["ed" + sd] = "M" + pt(def.D) + " C" + pt(def.cD1) + " " + pt(def.cD2) + " " + pt(def.E) + " L" + pt(def.F);
    Object.keys(def.f).forEach((fk) => {
      const fd = def.f[fk]!;
      const K = P(fd.K), T = fk === af ? act!.tip : P(fd.T);
      out[fk] = fingerD(K, T, fd.w);
    });
  });
  return out;
}

const gEsc = (c: string) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c);

function FingerGuide({ ch, err }: { ch: string; err: boolean }) {
  const gs = useMemo(() => guideState(ch, err), [ch, err]);
  const d = useMemo(() => handPaths(gs.act), [gs]);
  return (
    <>
      <div className="tr-guide-label" id="tr-guide-label" dangerouslySetInnerHTML={{ __html: gs.label }} />
      <div id="tr-guide-svg">
        <svg viewBox="0 0 480 272" xmlns="http://www.w3.org/2000/svg" aria-label="Finger guide keyboard">
          <defs>
            <linearGradient id="trHandFade" gradientUnits="userSpaceOnUse" x1="0" y1="205" x2="0" y2="272">
              <stop offset="0" stopColor="#3b404a" />
              <stop offset="1" stopColor="#3b404a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="hand">
            {(["l", "r"] as const).map((sd) => (
              <g key={sd} style={{ display: "contents" }}>
                <path className="pfill" data-h={sd} d={d["fill" + sd]} style={{ d: `path('${d["fill" + sd]}')` } as any} />
                <path className="edge" data-h={sd} data-e="a" d={d["ea" + sd]} style={{ d: `path('${d["ea" + sd]}')` } as any} />
                <path className="edge" data-h={sd} data-e="d" d={d["ed" + sd]} style={{ d: `path('${d["ed" + sd]}')` } as any} />
              </g>
            ))}
            {["p", "r", "m", "i", "t"].map((k) =>
              (["l", "r"] as const).map((sd) => (
                <path key={sd + k} className={"fg" + (gs.on.indexOf(sd + k) >= 0 ? " on" : "")} data-f={sd + k} d={d[sd + k]} style={{ d: `path('${d[sd + k]}')` } as any} />
              )),
            )}
          </g>
          <g className="kb">
            {GROWS.map((r) =>
              r[2].split("").map((chr, i) => {
                const x = r[1] + i * 40, y = r[0];
                return (
                  <g key={chr} className={"k" + (gs.next === chr ? " next" : "")} data-k={gEsc(chr)}>
                    <rect x={x} y={y} width={36} height={36} rx={6} />
                    {chr === "f" || chr === "j" ? <rect className="bump" x={x + 13} y={y + 28} width={10} height={2} rx={1} /> : null}
                    <text x={x + 18} y={y + 23}>{chr}</text>
                  </g>
                );
              }),
            )}
            <g className={"k" + (gs.next === " " ? " next" : "")} data-k=" ">
              <rect x={120} y={126} width={216} height={34} rx={6} />
            </g>
          </g>
        </svg>
      </div>
    </>
  );
}

/* -------------------------------- Type Rush -------------------------------- */
interface Hist { text: string; acc: number; wpm: number; errors: number }

export function TypeRush() {
  const [phrase, setPhrase] = useState(() => TR_PHRASES[Math.floor(Math.random() * TR_PHRASES.length)]!);
  const [typed, setTyped] = useState("");
  const [runActive, setRunActive] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [placeholder, setPlaceholder] = useState("Press Start, then type the whole phrase…");
  const [dim, setDim] = useState(false);
  const [startLabel, setStartLabel] = useState("Start");
  const [history, setHistory] = useState<Hist[]>([]);
  const [guideOn, setGuideOn] = useState(() => lsGetRaw("wb_tr_guide") !== "0");
  const [best, setBest] = useState(() => (getProfile().highScores.typeRush && getProfile().highScores.typeRush!.wpm) || 0);
  const [tot, setTot] = useState({ keys: 0, errs: 0, words: 0 });
  // Per-phrase counters live in a ref (the original mutated a state object).
  const st = useRef({ phrase, started: 0 as number | null, finished: false, errors: 0, keystrokes: 0, typedLen: 0, runActive: false, tk: 0, te: 0, tw: 0, count: 0 });
  const inp = useRef<HTMLTextAreaElement>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  useEffect(() => { st.current.phrase = phrase; }, [phrase]);

  function pick() {
    let p: string;
    do { p = TR_PHRASES[Math.floor(Math.random() * TR_PHRASES.length)]!; } while (p === st.current.phrase && TR_PHRASES.length > 1);
    st.current.phrase = p;
    setPhrase(p);
  }
  function startPhrase() {
    pick();
    const s = st.current;
    s.started = Date.now(); s.finished = false; s.errors = 0; s.keystrokes = 0; s.typedLen = 0;
    setTyped("");
    setInputDisabled(false);
    setDim(false);
    setTimeout(() => inp.current?.focus(), 0);
    rerender();
  }
  function addHistory() {
    const s = st.current;
    const acc = s.keystrokes > 0 ? Math.round((100 * (s.keystrokes - s.errors)) / s.keystrokes) : 100;
    let wpm = 0;
    if (s.started) { const el = (Date.now() - s.started) / 60000; if (el > 0) wpm = Math.round(s.keystrokes / 5 / el); }
    const entry: Hist = { text: s.phrase, acc: Math.max(0, acc), wpm, errors: s.errors };
    try {
      const tq = 'Type this phrase cleanly: "' + entry.text + '"';
      if (entry.acc < 90) wbWeak.log("Type Rush", tq, entry.text); else wbWeak.ok("Type Rush", tq);
    } catch { /* ignore */ }
    setHistory((h) => [entry, ...h]);
  }
  function finishPhrase() {
    const s = st.current;
    s.finished = true;
    s.tk += s.keystrokes; s.te += s.errors;
    s.tw += s.phrase.split(/\s+/).length; s.count++;
    setTot({ keys: s.tk, errs: s.te, words: s.tw });
    try {
      ensureProfileShape();
      const p = getProfile();
      if (!p.highScores.typeRush) p.highScores.typeRush = {};
      let el = (Date.now() - s.started!) / 60000;
      if (el <= 0) el = 0.0001;
      const wpm = Math.round(s.keystrokes / 5 / el);
      if (wpm > (p.highScores.typeRush!.wpm || 0)) p.highScores.typeRush!.wpm = wpm;
      setBest(p.highScores.typeRush!.wpm || 0);
      trackGamePlayed("typeRush");
      saveProfile();
    } catch { /* ignore */ }
    addHistory();
    setInputDisabled(true);
    setDim(true);
    setTimeout(() => { if (s.runActive) startPhrase(); }, 800);
  }
  function startRun() {
    const s = st.current;
    s.runActive = true; s.tk = 0; s.te = 0; s.tw = 0; s.count = 0;
    setRunActive(true);
    setTot({ keys: 0, errs: 0, words: 0 });
    setHistory([]);
    setStartLabel("Restart");
    try { const b = getProfile().highScores.typeRush; if (b) setBest(b.wpm || 0); } catch { /* ignore */ }
    startPhrase();
  }
  function endRun() {
    st.current.runActive = false;
    setRunActive(false);
    setInputDisabled(true);
    setPlaceholder("Run ended.");
    try { trackGamePlayed("typeRush"); saveProfile(); checkAchievements(); } catch { /* ignore */ }
  }
  function onInput(val: string) {
    const s = st.current;
    if (!s.started || s.finished || !s.runActive) return;
    let errs = 0;
    for (let i = 0; i < val.length; i++) if (val[i] !== s.phrase[i]) errs++;
    if (val.length > s.typedLen) s.keystrokes += val.length - s.typedLen;
    s.typedLen = val.length;
    s.errors = errs;
    setTyped(val);
    if (val === s.phrase) finishPhrase();
  }

  // Derived live stats
  const s = st.current;
  let wpm = 0, acc = 100, prog = 0;
  if (s.started) {
    let el = (Date.now() - s.started) / 60000;
    if (el <= 0) el = 0.0001;
    wpm = Math.round(s.keystrokes / 5 / el);
    acc = s.keystrokes > 0 ? Math.round((100 * (s.keystrokes - s.errors)) / s.keystrokes) : 100;
    prog = Math.round((100 * (s.typedLen || 0)) / phrase.length);
  }
  const ovAcc = tot.keys > 0 ? Math.round((100 * (tot.keys - tot.errs)) / tot.keys) : 100;

  // Phrase rendering (word wrappers keep whole words together)
  const nodes: React.ReactNode[] = [];
  let wordChars: React.ReactNode[] = [];
  const flushWord = (k: number) => { if (wordChars.length) { nodes.push(<span className="w" key={"w" + k}>{wordChars}</span>); wordChars = []; } };
  for (let i = 0; i < phrase.length; i++) {
    const ch = phrase[i]!;
    let cls = "c";
    if (i < typed.length) cls += typed[i] === ch ? " ok" : " bad";
    else if (i === typed.length) cls += " cur";
    if (ch === " ") { flushWord(i); nodes.push(<span className={cls + " sp"} key={i}>&nbsp;</span>); }
    else wordChars.push(<span className={cls} key={i}>{ch}</span>);
  }
  flushWord(phrase.length);

  const guideCh = phrase.charAt(typed.length);
  const guideErr = typed !== phrase.slice(0, typed.length);

  return (
    <G519Shell
      title={<span className="tr-title-ring"><span className="tr-title-text">Type Rush</span></span>}
      sub="Type the full phrase — every letter and space counts. A new phrase starts automatically."
      className="tr-shell"
    >
      <div className="type-rush-hero">
        <div className="trh-kicker">Typing Performance Lab</div>
        <h4>TYPE FASTER. TYPE CLEANER.</h4>
        <p>Build speed without sacrificing accuracy. Every space counts, your history stays visible, and your best WPM is tracked.</p>
        <div className="tr-live-badge">LIVE METRICS</div>
      </div>
      <div className="tr-run-wrap">
        <div className="tr-sidebar" id="tr-sidebar">
          <div className="tr-sidebar-head">Completed Phrases</div>
          <div className="tr-sidebar-list" id="tr-history">
            {history.map((h, i) => (
              <div className="tr-hist-item" key={history.length - i}>
                <div className="tr-hist-text">{h.text.length > 40 ? h.text.substring(0, 37) + "..." : h.text}</div>
                <div className="tr-hist-stats">
                  Acc: <b>{h.acc}%</b> · {h.wpm} WPM{h.errors > 0 ? <> <span className="tr-hist-err">({h.errors} err)</span></> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="tr-main">
          <div className="tr-overall" id="tr-overall">
            <span>Overall Accuracy: <b id="tr-ov-acc">{Math.max(0, ovAcc)}%</b></span>
            <span>Words Typed: <b id="tr-ov-words">{tot.words}</b></span>
            <span>Best WPM: <b id="tr-best">{best}</b></span>
          </div>
          <div className="type-stats">
            <span>WPM: <b id="tr-wpm">{wpm}</b></span>
            <span>Accuracy: <b id="tr-acc">{Math.max(0, acc)}%</b></span>
            <span>Progress: <b id="tr-prog">{prog}%</b></span>
          </div>
          <div className="tr-phrase" id="tr-phrase" style={{ opacity: dim ? 0.5 : 1 }}>{nodes}</div>
          <div className="tr-guide" id="tr-guide" hidden={!guideOn}>
            {guideOn && <FingerGuide ch={guideCh} err={guideErr} />}
          </div>
          <textarea
            className="type-input" id="tr-input" ref={inp} autoComplete="off" spellCheck={false} rows={2}
            placeholder={placeholder} disabled={inputDisabled} value={typed}
            onChange={(e) => onInput(e.target.value)}
          />
          <div className="g519-btnrow">
            <button className="type-btn" id="tr-start" onClick={startRun}>{startLabel}</button>{" "}
            <button className="type-btn ghost" id="tr-stop" onClick={endRun} disabled={false}>End Run</button>{" "}
            <button
              className="type-btn ghost" id="tr-guide-toggle" type="button"
              onClick={() => {
                const next = !guideOn;
                setGuideOn(next);
                lsSetRaw("wb_tr_guide", next ? "1" : "0");
                setTimeout(() => { if (inp.current && !inp.current.disabled) inp.current.focus(); }, 0);
              }}
            >
              Finger Guide: {guideOn ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>
    </G519Shell>
  );
}
