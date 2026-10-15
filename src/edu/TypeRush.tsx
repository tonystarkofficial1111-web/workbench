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

/* ------------------------------------------------------------------------------------------------------------------------------
 * Finger guide (5.64.0 redesign, TypingClub style): a full keyboard of soft rounded keys, and two simple flat hands drawn over its
 * lower half. Every finger is a rounded capsule from the palm to its home key; the finger for the next key turns light blue and reaches
 * that key, and its hand leans a little toward it. Shift, Backspace and the space bar are shown the same way.
 * ------------------------------------------------------------------------------------------------------------------------------ */
type Pt = [number, number];
const KU = 48, KH = 42, KG = 6;
const KB_ROWS: [string, string, number][][] = [
  [["`", "`", 1], ["1", "1", 1], ["2", "2", 1], ["3", "3", 1], ["4", "4", 1], ["5", "5", 1], ["6", "6", 1], ["7", "7", 1], ["8", "8", 1], ["9", "9", 1], ["0", "0", 1], ["-", "-", 1], ["=", "=", 1], ["bksp", "⌫", 2]],
  [["tab", "tab", 1.5], ["q", "q", 1], ["w", "w", 1], ["e", "e", 1], ["r", "r", 1], ["t", "t", 1], ["y", "y", 1], ["u", "u", 1], ["i", "i", 1], ["o", "o", 1], ["p", "p", 1], ["[", "[", 1], ["]", "]", 1], ["\\", "\\", 1.5]],
  [["caps", "caps", 1.75], ["a", "a", 1], ["s", "s", 1], ["d", "d", 1], ["f", "f", 1], ["g", "g", 1], ["h", "h", 1], ["j", "j", 1], ["k", "k", 1], ["l", "l", 1], [";", ";", 1], ["'", "'", 1], ["enter", "enter", 2.25]],
  [["shl", "shift", 2.25], ["z", "z", 1], ["x", "x", 1], ["c", "c", 1], ["v", "v", 1], ["b", "b", 1], ["n", "n", 1], ["m", "m", 1], [",", ",", 1], [".", ".", 1], ["/", "/", 1], ["shr", "shift", 2.75]],
  [["ctl", "ctrl", 1.5], ["alt", "alt", 1.5], [" ", "", 9], ["alr", "alt", 1.5], ["ctr", "ctrl", 1.5]],
];
interface KeyBox { k: string; x: number; y: number; w: number; cx: number; cy: number; label: string }
const KEYS: Record<string, KeyBox> = {};
const KEY_LIST: KeyBox[] = [];
KB_ROWS.forEach((row, r) => {
  let x = 0;
  row.forEach(([k, label, w]) => {
    const kw = w * KU - KG, box = { k, x, y: r * KU, w: kw, cx: x + kw / 2, cy: r * KU + KH / 2, label };
    KEYS[k] = box; KEY_LIST.push(box); x += w * KU;
  });
});
const KB_W = 15 * KU - KG, VB_H = 318;

const FNAME: Record<string, string> = { lp: "left pinky", lr: "left ring finger", lm: "left middle finger", li: "left index finger", ri: "right index finger", rm: "right middle finger", rr: "right ring finger", rp: "right pinky", lt: "left thumb", rt: "right thumb" };
const FMAP: Record<string, string> = {};
[["`1qaz", "lp"], ["2wsx", "lr"], ["3edc", "lm"], ["45rtfgvb", "li"], ["67yuhjnm", "ri"], ["8ik,", "rm"], ["9ol.", "rr"], ["0p;/'-=[]\\", "rp"]].forEach((g) => {
  for (let i = 0; i < g[0]!.length; i++) FMAP[g[0]!.charAt(i)] = g[1]!;
});
FMAP[" "] = "rt";
const SHIFTED: Record<string, string> = { "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "?": "/", ":": ";", '"': "'", "<": ",", ">": ".", "{": "[", "}": "]", "|": "\\", "~": "`" };

/** a hand: finger bases on top of the palm (below the keyboard), the fingertips resting on the home keys, the palm outline */
function handModel(sd: "l" | "r") {
  const ks = sd === "l" ? ["a", "s", "d", "f"] : ["j", "k", "l", ";"];
  const fs = sd === "l" ? ["p", "r", "m", "i"] : ["i", "m", "r", "p"];
  const base: Record<string, Pt> = {}, tip: Record<string, Pt> = {};
  ks.forEach((k, i) => {
    const key = KEYS[k]!, f = fs[i]!, outerness = sd === "l" ? 3 - i : i;     // 3 = pinky side
    const conv = (sd === "l" ? 1 : -1) * [-5, 2, 8, 15][outerness]!;          // the fingers converge a little toward the palm
    base[sd + f] = [key.cx + conv, [222, 214, 218, 230][outerness]!];
    tip[sd + f] = [key.cx, key.cy - 3];
  });
  const dir = sd === "l" ? 1 : -1, outer = base[sd + "p"]!, inner = base[sd + "i"]!;
  base[sd + "t"] = [inner[0] + dir * 30, 262];
  tip[sd + "t"] = [sd === "l" ? KEYS.v!.cx + 6 : KEYS.n!.cx - 6, KEYS[" "]!.cy - 1];
  const x0 = outer[0] - dir * 17, x1 = inner[0] + dir * 40;
  // palm: from below the pinky across to the thumb side and down out of the picture
  const palm: Pt[] = [[x0, 250], [outer[0] - dir * 4, 226], [inner[0] + dir * 10, 222], [x1, 246], [x1 + dir * 4, VB_H + 6], [x0 + dir * 2, VB_H + 6]];
  return { base, tip, palm };
}
const HANDS = { l: handModel("l"), r: handModel("r") };
const FKEYS = ["p", "r", "m", "i", "t"];

interface Guide { label: string; keys: Record<string, "next" | "mod" | "err">; reach: Record<string, Pt> }
const esc = (c: string) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c);

function guideFor(ch: string, hasErr: boolean): Guide {
  const g: Guide = { label: "", keys: {}, reach: {} };
  const reach = (f: string, k: string) => { const b = KEYS[k]; if (b) g.reach[f] = [b.cx, b.cy - 3]; };
  if (hasErr) {
    g.keys.bksp = "err"; reach("rp", "bksp");
    g.label = "Oops: press <b>Backspace</b> with your <b>right pinky</b>";
    return g;
  }
  if (!ch) { g.label = "Phrase complete. <b>Nice work!</b>"; return g; }
  let base = ch, shift = false;
  const low = ch.toLowerCase();
  if (SHIFTED[ch]) { base = SHIFTED[ch]!; shift = true; }
  else if (ch !== low && FMAP[low]) { base = low; shift = true; }
  const f = FMAP[base];
  if (!f) { g.label = "Type <b>" + esc(ch) + "</b>"; return g; }
  g.keys[base] = "next";
  if (base === " ") { const t = HANDS.r.tip.rt!; g.reach.rt = [t[0], t[1] + 2]; }   // the thumb presses down where it rests
  else reach(f, base);
  let sf = "";
  if (shift) { sf = f.charAt(0) === "l" ? "rp" : "lp"; const sk = sf === "rp" ? "shr" : "shl"; g.keys[sk] = "mod"; reach(sf, sk); }
  const nm = base === " " ? "Space" : base.toUpperCase();
  g.label = shift
    ? "Hold <b>Shift</b> with your <b>" + FNAME[sf] + "</b>, press <b>" + esc(ch) + "</b> with your <b>" + FNAME[f] + "</b>"
    : "Press <b>" + nm + "</b> with your <b>" + FNAME[f] + "</b>";
  return g;
}

const pts = (a: Pt[]) => a.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

function FingerGuide({ ch, err }: { ch: string; err: boolean }) {
  const g = useMemo(() => guideFor(ch, err), [ch, err]);
  // where every finger is this frame: a reaching finger goes to its key, its hand leans 20% of the way (the base follows)
  const hands = (["l", "r"] as const).map((sd) => {
    const H = HANDS[sd];
    let ox = 0, oy = 0;
    for (const f of FKEYS) { const k = sd + f, r = g.reach[k]; if (r && f !== "t") { ox = (r[0] - H.tip[k]![0]) * 0.42; oy = (r[1] - H.tip[k]![1]) * 0.3; } }
    const fingers = FKEYS.map((f) => {
      const k = sd + f, b = H.base[k]!, r = g.reach[k];
      const base: Pt = [b[0] + ox, b[1] + oy], tip: Pt = r ? r : [H.tip[k]![0] + ox, H.tip[k]![1] + oy];
      return { k, base, tip, w: f === "p" ? 27 : f === "t" ? 33 : 31, on: !!r };
    });
    const palm = H.palm.map((p) => [p[0] + ox, p[1] + oy] as Pt);
    return { sd, fingers, palm };
  });
  return (
    <div className="trx-guide">
      <div className="trx-guide-label" id="tr-guide-label" dangerouslySetInnerHTML={{ __html: g.label }} />
      <svg className="trx-kb" viewBox={`-8 -8 ${KB_W + 16} ${VB_H + 8}`} xmlns="http://www.w3.org/2000/svg" aria-label="Keyboard and finger guide">
        <defs>
          <linearGradient id="trxFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.72" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="trxMask"><rect x="-8" y="-8" width={KB_W + 16} height={VB_H + 8} fill="url(#trxFade)" /></mask>
        </defs>
        <rect className="trx-kb-case" x={-8} y={-8} width={KB_W + 16} height={5 * KU + 10} rx={14} />
        {KEY_LIST.map((b) => {
          const st = g.keys[b.k];
          return (
            <g key={b.k} className={"trx-key" + (st ? " " + st : "")} data-k={b.k}>
              <rect x={b.x} y={b.y} width={b.w} height={KH} rx={8} />
              {b.label ? <text x={b.x + (b.w > KU ? 12 : b.w / 2)} y={b.y + 27} textAnchor={b.w > KU ? "start" : "middle"} className={b.w > KU ? "mod" : ""}>{b.label}</text> : null}
              {b.k === "f" || b.k === "j" ? <rect className="bump" x={b.cx - 6} y={b.y + 33} width={12} height={2.5} rx={1.2} /> : null}
            </g>
          );
        })}
        <g className="trx-hands" mask="url(#trxMask)">
          {hands.map((h) => (
            <g key={h.sd} className="trx-hand">
              {/* outlines first, then the fills, so palm and fingers read as one shape */}
              <polygon className="ol" points={pts(h.palm)} strokeLinejoin="round" />
              {h.fingers.map((f) => <line key={"o" + f.k} className={"ol" + (f.on ? " on" : "")} x1={f.base[0]} y1={f.base[1]} x2={f.tip[0]} y2={f.tip[1]} strokeWidth={f.w + 3.5} strokeLinecap="round" />)}
              <polygon className="fill" points={pts(h.palm)} strokeLinejoin="round" />
              {h.fingers.map((f) => <line key={"f" + f.k} className={"fill" + (f.on ? " on" : "")} x1={f.base[0]} y1={f.base[1]} x2={f.tip[0]} y2={f.tip[1]} strokeWidth={f.w} strokeLinecap="round" />)}
              {h.fingers.map((f) => { const dx = f.tip[0] - f.base[0], dy = f.tip[1] - f.base[1], L = Math.hypot(dx, dy) || 1; const nx = f.tip[0] - (dx / L) * (f.w * 0.42), ny = f.tip[1] - (dy / L) * (f.w * 0.42); return <circle key={"n" + f.k} className={"nail" + (f.on ? " on" : "")} cx={nx} cy={ny} r={f.w * 0.24} />; })}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* -------------------------------- Type Rush -------------------------------- */
interface Hist { text: string; acc: number; wpm: number; errors: number }

export function TypeRush() {
  const [phrase, setPhrase] = useState(() => TR_PHRASES[Math.floor(Math.random() * TR_PHRASES.length)]!);
  const [typed, setTyped] = useState("");
  const [runActive, setRunActive] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [hint, setHint] = useState("Press Start, then type the phrase. Every letter and space counts.");
  const [dim, setDim] = useState(false);
  const [focused, setFocused] = useState(false);
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
  // the WPM figure keeps moving while you type
  useEffect(() => { if (!runActive) return; const iv = setInterval(rerender, 500); return () => clearInterval(iv); }, [runActive]);

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
    setHint("");
    try { const b = getProfile().highScores.typeRush; if (b) setBest(b.wpm || 0); } catch { /* ignore */ }
    startPhrase();
  }
  function endRun() {
    st.current.runActive = false;
    setRunActive(false);
    setInputDisabled(true);
    setHint("Run ended. Press Start for a new run.");
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
  if (s.started && runActive) {
    let el = (Date.now() - s.started) / 60000;
    if (el <= 0) el = 0.0001;
    wpm = s.keystrokes ? Math.round(s.keystrokes / 5 / el) : 0;
    acc = s.keystrokes > 0 ? Math.round((100 * (s.keystrokes - s.errors)) / s.keystrokes) : 100;
    prog = Math.round((100 * (s.typedLen || 0)) / phrase.length);
  }
  const ovAcc = tot.keys > 0 ? Math.round((100 * (tot.keys - tot.errs)) / tot.keys) : 100;

  // Phrase rendering: big letters, typed directly on the text (word wrappers keep whole words together)
  const nodes: React.ReactNode[] = [];
  let wordChars: React.ReactNode[] = [];
  const flushWord = (k: number) => { if (wordChars.length) { nodes.push(<span className="w" key={"w" + k}>{wordChars}</span>); wordChars = []; } };
  for (let i = 0; i < phrase.length; i++) {
    const ch = phrase[i]!;
    let cls = "c";
    if (i < typed.length) cls += typed[i] === ch ? " ok" : " bad";
    else if (i === typed.length && runActive) cls += " cur";
    // a space ends the word it follows (inside the same unbreakable group), so a wrapped line never starts with a space
    if (ch === " ") { wordChars.push(<span className={cls + " sp"} key={i}>&nbsp;</span>); flushWord(i); }
    else wordChars.push(<span className={cls} key={i}>{ch}</span>);
  }
  flushWord(phrase.length);

  const guideCh = phrase.charAt(typed.length);
  const guideErr = typed !== phrase.slice(0, typed.length);
  const focus = () => { if (inp.current && !inp.current.disabled) inp.current.focus(); };

  return (
    <G519Shell
      title={<span className="trx-title"><span className="trx-logo" aria-hidden="true">⌨</span>Type Rush</span>}
      sub="Type the phrase on the screen. Every letter and space counts; a new phrase starts by itself."
      className="trx"
    >
      <div className="trx-stats">
        <div className="trx-stat"><span>WPM</span><b id="tr-wpm">{wpm}</b></div>
        <div className="trx-stat"><span>Accuracy</span><b id="tr-acc">{Math.max(0, acc)}%</b></div>
        <div className="trx-stat"><span>Progress</span><b id="tr-prog">{prog}%</b></div>
        <div className="trx-stat best"><span>Best WPM</span><b id="tr-best">{best}</b></div>
      </div>

      <div className={"trx-card" + (runActive && !focused && !inputDisabled ? " blur" : "")} onClick={focus}>
        <div className="trx-phrase" id="tr-phrase" style={{ opacity: dim ? 0.45 : 1 }}>{nodes}</div>
        <div className="trx-bar"><i style={{ width: prog + "%" }} /></div>
        <textarea
          className="trx-input" id="tr-input" ref={inp} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} rows={1}
          aria-label="Type the phrase here" disabled={inputDisabled} value={typed}
          onChange={(e) => onInput(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {!runActive && hint ? <div className="trx-hint start">{hint}</div> : null}
        {runActive && !focused && !inputDisabled ? <div className="trx-hint small">Click here to keep typing</div> : null}
      </div>

      {guideOn ? <FingerGuide ch={guideCh} err={guideErr} /> : null}
      <div id="tr-guide" hidden />

      <div className="trx-actions">
        <button className="trx-btn primary" id="tr-start" type="button" onClick={startRun}>{startLabel}</button>
        <button className="trx-btn" id="tr-stop" type="button" onClick={endRun}>End run</button>
        <button
          className="trx-btn" id="tr-guide-toggle" type="button"
          onClick={() => {
            const next = !guideOn;
            setGuideOn(next);
            lsSetRaw("wb_tr_guide", next ? "1" : "0");
            setTimeout(focus, 0);
          }}
        >
          Finger guide: {guideOn ? "On" : "Off"}
        </button>
        <span className="trx-overall" id="tr-overall">
          Overall <b id="tr-ov-acc">{Math.max(0, ovAcc)}%</b> accuracy · <b id="tr-ov-words">{tot.words}</b> words
        </span>
      </div>

      <div className="trx-history" id="tr-sidebar">
        <div className="trx-history-head">Completed phrases</div>
        <div className="trx-history-list" id="tr-history">
          {history.length === 0 ? <span className="trx-empty">Your finished phrases will appear here.</span> : null}
          {history.map((h, i) => (
            <div className="trx-hist" key={history.length - i} title={h.text}>
              <span className="t">{h.text.length > 44 ? h.text.substring(0, 41) + "…" : h.text}</span>
              <span className="n"><b>{h.wpm}</b> WPM · <b className={h.acc < 90 ? "low" : ""}>{h.acc}%</b>{h.errors > 0 ? " · " + h.errors + " err" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </G519Shell>
  );
}
