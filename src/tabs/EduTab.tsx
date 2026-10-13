import { useEffect, useMemo, useRef, useState } from "react";
import { activeTab } from "../core/nav";
import { Value, useEmitter, useValue } from "../core/store";
import {
  addCard, clearCards, deleteCard, getCards, getDashboard, getNotes, saveNotes, setNotes, studyEvents, dueList, rate, cardId,
  type Card, type Note,
} from "../features/study";
import { wbWeak } from "../features/weak";
import { openOverlay } from "../core/overlay";
import { TypeRush } from "../edu/TypeRush";
import { PythonLab, SpanishLab, AlgebraLab } from "../edu/Labs";

/** Lets other tabs (Start "Review now") drive the Educational tab. */
export const eduRequest = new Value<{ open?: string; startReview?: boolean; n: number } | null>(null);

const CABS: { key: string; lab?: boolean; art: string; title: string; meta: string; ti?: boolean }[] = [
  { key: "notes", art: "DOC", title: "Study Notes", meta: "WRITE · ORGANIZE" },
  { key: "coding", art: "</>", title: "Coding Studio", meta: "BUILD · PREVIEW" },
  { key: "math", art: "Σ", title: "Math Lab", meta: "SOLVE · CHECK" },
  { key: "memory", art: "MEM", title: "Memory Deck", meta: "REVIEW · RECALL" },
  { key: "cad", art: "CAD", title: "Engineering", meta: "DESIGN · MEASURE" },
  { key: "dashboard", art: "DASH", title: "Student Desk", meta: "TRACK · FOCUS" },
  { key: "type", lab: true, art: "TYPE", title: "Type Rush", meta: "SPEED · ACCURACY" },
  { key: "python", lab: true, art: "PY", title: "Python Lab", meta: "CODE · DRAW" },
  { key: "spanish", lab: true, art: "ES", title: "Spanish", meta: "VOCAB · QUIZ" },
  { key: "algebra", lab: true, art: "TI", title: "Algebra 1 / 2", meta: "PRACTICE · REASON", ti: true },
];
const WORK_TABS = [["notes", "Study Notes"], ["coding", "Coding Studio"], ["math", "Math Lab"], ["memory", "Memorizing"], ["cad", "Engineering"], ["dashboard", "Student Dashboard"]] as const;

const LABS: Record<string, () => React.ReactNode> = {
  type: () => <TypeRush />,
  python: () => <PythonLab />,
  spanish: () => <SpanishLab />,
  algebra: () => <AlgebraLab />,
};
export const launchLab = (key: string) => {
  const f = LABS[key];
  if (f) openOverlay(f());
};

const evalExpr = (s: string): string => {
  try { return String(Function("return (" + s + ")")()); } catch { return "Invalid"; }
};
const num = (v: string) => parseFloat(v) || 0;

/* ------------------------------- Study Notes ------------------------------- */
function NotesPanel({ active }: { active: boolean }) {
  useEmitter(studyEvents);
  const notes = getNotes();
  const [current, setCurrent] = useState(-1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", tags: "", body: "", pinned: false });
  const [status, setStatus] = useState("Auto-save ready.");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [calc, setCalc] = useState("");
  const [calcOut, setCalcOut] = useState("—");
  const [txt, setTxt] = useState("");

  const list = notes
    .filter((n) => !q || (n.title + " " + n.tags + " " + n.body).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const load = (n: Note) => setForm({ title: n.title || "", tags: n.tags || "", body: n.body || "", pinned: !!n.pinned });
  const commit = (f: typeof form, cur: number) => {
    if (cur < 0) return;
    notes[cur] = { title: f.title, tags: f.tags, body: f.body, pinned: f.pinned, updatedAt: Date.now() };
    saveNotes();
    setStatus("Saved " + new Date().toLocaleTimeString());
  };
  const edit = (patch: Partial<typeof form>) => {
    const f = { ...form, ...patch };
    setForm(f);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(f, current), 350);
  };

  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-notes">
      <div className="notes-layout">
        <aside>
          <button id="notes-new" onClick={() => {
            notes.unshift({ title: "New Note", tags: "", body: "", pinned: false, updatedAt: Date.now() });
            setCurrent(0);
            load(notes[0]!);
            saveNotes();
          }}>+ New note</button>
          <input id="notes-search" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div id="notes-list">
            {list.map((n, i) => (
              <div key={notes.indexOf(n)} className={"note-row" + (i === current ? " active" : "")} onClick={() => { setCurrent(notes.indexOf(n)); load(n); }}>
                <b>{n.title || "Untitled"}</b>
                <small>{n.tags || "No tags"}</small>
              </div>
            ))}
          </div>
        </aside>
        <article>
          <input id="note-title" placeholder="Note title" value={form.title} onChange={(e) => edit({ title: e.target.value })} />
          <input id="note-tags" placeholder="Tags, comma separated" value={form.tags} onChange={(e) => edit({ tags: e.target.value })} />
          <label>
            <input id="note-pinned" type="checkbox" checked={form.pinned} onChange={(e) => edit({ pinned: e.target.checked })} /> Pinned
          </label>
          <textarea id="note-body" placeholder="Write your notes here. Markdown is supported as plain text and saved automatically." value={form.body} onChange={(e) => edit({ body: e.target.value })}></textarea>
          <small id="note-save-status">{status}</small>
          <div className="study-note-tools">
            <div className="note-tool-card">
              <h4>🧮 Quick Calculator</h4>
              <div className="note-tool-row">
                <input id="util-calc" placeholder="Example: (25*4)+12" value={calc} onChange={(e) => setCalc(e.target.value)} />
                <button id="util-calc-btn" type="button" onClick={() => { try { setCalcOut(String(Function("return (" + calc + ")")())); } catch { setCalcOut("Invalid"); } }}>Calculate</button>
              </div>
              <strong id="util-calc-out">{calcOut}</strong>
            </div>
            <div className="note-tool-card">
              <h4>🔤 Text Counter</h4>
              <textarea id="util-text" placeholder="Paste or type text…" value={txt} onChange={(e) => setTxt(e.target.value)}></textarea>
              <strong id="util-text-out">{txt.length + " characters · " + (txt.trim() ? txt.trim().split(/\s+/).length : 0) + " words"}</strong>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

/* ------------------------------- Coding Studio ------------------------------- */
const SNIPPETS: Record<string, string> = {
  HTML: "<!doctype html>\n<h1>Hello Workbench</h1>\n<p>Build your page here.</p>",
  CSS: "body { font-family: sans-serif; padding: 30px; }",
  JavaScript: "2 + 2",
  JSON: '[{"name":"Workbench","version":"5.37.0"}]',
  Python: 'print("Hello Workbench")',
};
const escHtml = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function CodingPanel({ active }: { active: boolean }) {
  const [lang, setLang] = useState("Python");
  const [code, setCode] = useState(SNIPPETS.Python!);
  const [doc, setDoc] = useState<string | undefined>(undefined);
  const run = () => {
    if (lang === "HTML") setDoc(code);
    else if (lang === "CSS") setDoc("<style>" + code + "</style><div>CSS preview</div>");
    else if (lang === "JavaScript") {
      const safe = JSON.stringify(code).replace(/<\//g, "<\\/");
      setDoc("<body><pre id=\"o\"></pre><scr" + "ipt>try{document.getElementById('o').textContent=String(eval(" + safe + "))}catch(e){document.getElementById('o').textContent=e}<\/scr" + "ipt></body>");
    } else if (lang === "JSON") {
      try { setDoc("<pre>" + escHtml(JSON.stringify(JSON.parse(code), null, 2)) + "</pre>"); } catch (e) { setDoc("<pre>" + escHtml(String(e)) + "</pre>"); }
    } else setDoc("<pre>Python runs here as an editor/preview placeholder. Connect a Python runtime to execute code.</pre>");
  };
  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-coding">
      <div className="coding-layout">
        <div className="coding-top">
          <select id="code-lang" value={lang} onChange={(e) => { setLang(e.target.value); setCode(SNIPPETS[e.target.value]!); }}>
            <option>Python</option><option>HTML</option><option>CSS</option><option>JavaScript</option><option>JSON</option>
          </select>
          <button id="code-run" onClick={run}>Run / Preview</button>
        </div>
        <textarea id="code-editor" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)}></textarea>
        <iframe id="code-preview" sandbox="allow-scripts" srcDoc={doc}></iframe>
      </div>
    </div>
  );
}

/* --------------------------------- Math Lab --------------------------------- */
function MathPanel({ active }: { active: boolean }) {
  const [calc, setCalc] = useState(""), [calcOut, setCalcOut] = useState("—");
  const [eq, setEq] = useState(""), [eqOut, setEqOut] = useState("—");
  const [unit, setUnit] = useState(""), [kind, setKind] = useState("mi-km"), [unitOut, setUnitOut] = useState("—");
  const [ma, setMa] = useState(""), [mb, setMb] = useState(""), [mOut, setMOut] = useState("—");
  const [stats, setStats] = useState(""), [statsOut, setStatsOut] = useState("—");
  const [geo, setGeo] = useState(""), [geoOut, setGeoOut] = useState("Circle area: —");
  const FAC: Record<string, number> = { "mi-km": 1.609344, "km-mi": 0.6213711922, "lb-kg": 0.45359237, "kg-lb": 2.2046226218 };
  const doUnit = (v: string, k: string) => setUnitOut((num(v) * FAC[k]!).toFixed(6));
  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-math">
      <div className="math-grid">
        <div className="math-card">
          <h3>Calculator</h3>
          <input id="math-calc" placeholder="2*(8+4)" value={calc} onChange={(e) => setCalc(e.target.value)} />
          <button id="math-calc-btn" onClick={() => { try { setCalcOut(String(Function("return (" + calc + ")")())); } catch { setCalcOut("Invalid expression"); } }}>Solve</button>
          <strong id="math-calc-out">{calcOut}</strong>
        </div>
        <div className="math-card">
          <h3>Equation Solver</h3>
          <input id="math-eq" placeholder="2x + 6 = 14" value={eq} onChange={(e) => setEq(e.target.value)} />
          <button id="math-eq-btn" onClick={() => {
            const m = eq.replace(/\s/g, "").match(/^([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)=([+-]?\d*\.?\d*)$/);
            if (!m) { setEqOut("Use ax+b=c"); return; }
            const a = parseFloat(m[1] || "1"), b = parseFloat(m[2] || "0"), c = parseFloat(m[3]!);
            setEqOut("x = " + ((c - b) / a).toFixed(6));
          }}>Solve x</button>
          <strong id="math-eq-out">{eqOut}</strong>
        </div>
        <div className="math-card">
          <h3>Unit Conversion</h3>
          <input id="math-unit" type="number" placeholder="100" value={unit} onChange={(e) => { setUnit(e.target.value); doUnit(e.target.value, kind); }} />
          <select id="math-unit-kind" value={kind} onChange={(e) => { setKind(e.target.value); doUnit(unit, e.target.value); }}>
            <option value="mi-km">miles → km</option><option value="km-mi">km → miles</option><option value="lb-kg">lb → kg</option><option value="kg-lb">kg → lb</option>
          </select>
          <strong id="math-unit-out">{unitOut}</strong>
        </div>
        <div className="math-card">
          <h3>Matrix Calculator</h3>
          <input id="matrix-a" placeholder="1,2;3,4" value={ma} onChange={(e) => setMa(e.target.value)} />
          <input id="matrix-b" placeholder="5,6;7,8" value={mb} onChange={(e) => setMb(e.target.value)} />
          <button id="matrix-add" onClick={() => {
            const p = (x: string) => x.split(";").map((r) => r.split(",").map(Number));
            try { const a = p(ma), b = p(mb); setMOut(a.map((r, i) => r.map((v, j) => v + b[i]![j]!).join(",")).join(";")); } catch { setMOut("Check matrix format"); }
          }}>A + B</button>
          <strong id="matrix-out">{mOut}</strong>
        </div>
        <div className="math-card">
          <h3>Statistics</h3>
          <input id="stats-data" placeholder="5, 8, 8, 10, 12" value={stats} onChange={(e) => {
            setStats(e.target.value);
            const a = e.target.value.split(",").map(Number).filter(Number.isFinite);
            if (!a.length) return;
            const mean = a.reduce((x, y) => x + y, 0) / a.length, sorted = a.slice().sort((x, y) => x - y), med = sorted[Math.floor((a.length - 1) / 2)];
            setStatsOut("Mean " + mean.toFixed(2) + " · Median " + med + " · Min " + sorted[0] + " · Max " + sorted[sorted.length - 1]);
          }} />
          <strong id="stats-out">{statsOut}</strong>
        </div>
        <div className="math-card">
          <h3>Geometry</h3>
          <input id="geo-r" type="number" placeholder="Radius" value={geo} onChange={(e) => { setGeo(e.target.value); const r = num(e.target.value); setGeoOut("Circle area: " + (Math.PI * r * r).toFixed(2)); }} />
          <strong id="geo-out">{geoOut}</strong>
        </div>
      </div>
      <div className="algebra-bridge">
        <button id="algebra-open" onClick={() => launchLab("algebra")}>Open Algebra 1 / 2</button>
        <span>Existing Algebra study content stays available here.</span>
      </div>
    </div>
  );
}

/* ------------------------------ Memory + review ------------------------------ */
const STOP = "about which their there these those would could should because between during through where while after before other another being having without within against".split(" ");
const shuf = <T,>(a: T[]) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};
function notePool() {
  const out: { s: string; a: string }[] = [];
  getNotes().forEach((n) => {
    ((n.title ? n.title + ". " : "") + (n.body || "")).split(/[.!?]+\s+|\n+/).forEach((s) => {
      s = s.replace(/^[\s\-*#>\d.)]+/, "").trim();
      if (s.length < 30 || s.length > 220 || s.split(/\s+/).length < 5) return;
      const w = (s.match(/[A-Za-z][A-Za-z'-]{4,}/g) || []).filter((x) => STOP.indexOf(x.toLowerCase()) < 0);
      if (!w.length) return;
      w.sort((a, b) => b.length - a.length);
      out.push({ s, a: w[0]! });
    });
  });
  return out;
}

function ReviewSection({ autoStart }: { autoStart: number }) {
  useEmitter(studyEvents);
  const due = dueList().length;
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [again, setAgain] = useState<Record<string, 1>>({});
  const [show, setShow] = useState(false);

  const start = () => { setQueue(dueList()); setAgain({}); setShow(false); };
  useEffect(() => { if (autoStart && due) start(); }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  let area: React.ReactNode = null;
  if (queue) {
    if (!queue.length) area = <p className="wb44-mu">✅ All caught up for today.</p>;
    else {
      const c = queue[0]!;
      const next = (q: "again" | "good" | "easy") => {
        rate(c, q, wbWeak);
        const rest = queue.slice(1);
        if (q === "again" && !again[cardId(c)]) { setAgain({ ...again, [cardId(c)]: 1 }); rest.push(c); }
        setQueue(rest);
        setShow(false);
      };
      area = (
        <>
          <small className="wb44-mu">{queue.length - 1} left after this</small>
          <div className="wb44-q">{c.front}</div>
          <div className="wb44-a" style={{ display: show ? "block" : "none" }}>{c.back}</div>
          <div className="wb44-row">
            {!show ? (
              <button className="wb44-btn" type="button" onClick={() => setShow(true)}>Show answer</button>
            ) : (
              <>
                <button className="wb44-btn bad" type="button" onClick={() => next("again")}>Again</button>
                <button className="wb44-btn" type="button" onClick={() => next("good")}>Good</button>
                <button className="wb44-btn" type="button" onClick={() => next("easy")}>Easy</button>
              </>
            )}
          </div>
        </>
      );
    }
  }
  return (
    <div className="wb44-sec">
      <h3>🔁 Spaced review — {due} due today</h3>
      <p className="wb44-mu">Missed cards return in 10 minutes; cards you know are pushed days out.</p>
      <button className="wb44-btn" type="button" id="wb44-go" disabled={!due} onClick={start}>Start review</button>
      <div>{area}</div>
    </div>
  );
}

function QuizSection() {
  const [qs, setQs] = useState<{ s: string; a: string }[] | null>(null);
  const [ans, setAns] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [opts, setOpts] = useState<string[]>([]);
  const [empty, setEmpty] = useState(false);

  const buildOpts = (x: { a: string }, allAns: string[]) => {
    const ds = shuf(allAns.filter((a) => a.toLowerCase() !== x.a.toLowerCase())).slice(0, 3);
    return shuf(ds.concat([x.a]));
  };
  const start = () => {
    const p = notePool(), seen: Record<string, 1> = {}, all: string[] = [];
    p.forEach((x) => { const k = x.a.toLowerCase(); if (!seen[k]) { seen[k] = 1; all.push(x.a); } });
    if (p.length < 2 || all.length < 4) { setEmpty(true); setQs(null); return; }
    setEmpty(false);
    const used: Record<string, 1> = {}, chosen: { s: string; a: string }[] = [];
    shuf(p).forEach((x) => { const k = x.a.toLowerCase(); if (chosen.length < 5 && !used[k]) { used[k] = 1; chosen.push(x); } });
    setQs(chosen); setAns(all); setI(0); setScore(0); setPicked(null); setMsg("");
    setOpts(buildOpts(chosen[0]!, all));
  };

  let body: React.ReactNode = null;
  if (empty) body = <p className="wb44-mu">Not enough note text yet — write a few full sentences in Study Notes first.</p>;
  else if (qs) {
    if (i >= qs.length) body = <p className="wb44-q">Score: {score} / {qs.length}</p>;
    else {
      const x = qs[i]!;
      const q = x.s.replace(new RegExp("\\b" + x.a + "\\b"), "_____");
      body = (
        <>
          <small className="wb44-mu">Question {i + 1} of {qs.length}</small>
          <div className="wb44-q">{q}</div>
          {opts.map((o) => (
            <button key={o} type="button" className={"wb44-btn wb44-opt" + (picked && o === x.a ? " ok" : "") + (picked === o && o !== x.a ? " bad" : "")} disabled={picked !== null}
              onClick={() => {
                setPicked(o);
                if (o === x.a) { setScore((s) => s + 1); setMsg("✅ Correct"); try { wbWeak.ok("Notes quiz", q); } catch { /* ignore */ } }
                else {
                  try { wbWeak.log("Notes quiz", q, x.a); } catch { /* ignore */ }
                  const f = "Fill in the blank: " + q;
                  if (!getCards().some((c) => c.front === f)) addCard(f, x.a);
                  setMsg("❌ It was “" + x.a + "”. Added to your flashcards.");
                }
              }}>{o}</button>
          ))}
          <p className="wb44-mu">{msg}</p>
          {picked !== null && (
            <button type="button" className="wb44-btn" onClick={() => {
              const n = i + 1;
              setI(n); setPicked(null); setMsg("");
              if (n < qs.length) setOpts(buildOpts(qs[n]!, ans));
            }}>{i + 1 < qs.length ? "Next" : "Finish"}</button>
          )}
        </>
      );
    }
  }
  return (
    <div className="wb44-sec">
      <h3>📝 Quiz from your study notes</h3>
      <p className="wb44-mu">Builds fill-in-the-blank questions from your saved notes. Wrong answers are added to your flashcards.</p>
      <button className="wb44-btn" type="button" onClick={start}>Make a 5-question quiz</button>
      <div>{body}</div>
    </div>
  );
}

function MemoryPanel({ autoStart, active }: { autoStart: number; active: boolean }) {
  useEmitter(studyEvents);
  const cards = getCards();
  const [front, setFront] = useState(""), [back, setBack] = useState("");
  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-memory">
      <div className="study-builder">
        <h3>🧠 Memorizing</h3>
        <p>Create flashcards and review them with local progress tracking.</p>
        <input id="fc-front" placeholder="Front / question" value={front} onChange={(e) => setFront(e.target.value)} />
        <input id="fc-back" placeholder="Back / answer" value={back} onChange={(e) => setBack(e.target.value)} />
        <button id="fc-add" onClick={() => { if (!front || !back) return; addCard(front, back); setFront(""); setBack(""); }}>Add card</button>
        <div id="fc-deck">
          {cards.length ? cards.map((c, i) => (
            <div className="fc-row" key={i}>
              <span>{c.front}</span><small>{c.back}</small>
              <button className="ghost" onClick={() => deleteCard(i)}>Delete</button>
            </div>
          )) : <p style={{ color: "var(--muted)" }}>No cards yet.</p>}
        </div>
        <button id="fc-clear" className="ghost" onClick={() => { if (confirm("Clear the local flashcard deck?")) clearCards(); }}>Clear deck</button>
      </div>
      <ReviewSection autoStart={autoStart} />
      <QuizSection />
    </div>
  );
}

/* ---------------------------------- Engineering ---------------------------------- */
function CadPanel({ active }: { active: boolean }) {
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const g = (k: string) => v[k] || "";
  const a = num(g("drive")), b = num(g("driven"));
  const spring = num(g("spring")), load = num(g("load"));
  const r = num(g("rpm2")), f = num(g("final"));
  const tire = g("tire").match(/(\d+)\/(\d+)R(\d+)/i);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = cv.current!;
    const cx = c.getContext("2d")!;
    const grid = () => {
      cx.clearRect(0, 0, c.width, c.height);
      cx.strokeStyle = "#182532";
      for (let x = 0; x < c.width; x += 26) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, c.height); cx.stroke(); }
      for (let y = 0; y < c.height; y += 26) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(c.width, y); cx.stroke(); }
    };
    grid();
    let drawing = false;
    c.onpointerdown = (e) => { drawing = true; cx.beginPath(); cx.moveTo(e.offsetX, e.offsetY); };
    c.onpointermove = (e) => { if (!drawing) return; cx.lineTo(e.offsetX, e.offsetY); cx.strokeStyle = "#5fd4c7"; cx.lineWidth = 2; cx.stroke(); };
    c.onpointerup = () => { drawing = false; };
  }, []);

  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-cad">
      <div className="cad-grid">
        <div className="math-card"><h3>Gear Ratio</h3>
          <input id="cad-drive" type="number" placeholder="Drive teeth" value={g("drive")} onChange={set("drive")} />
          <input id="cad-driven" type="number" placeholder="Driven teeth" value={g("driven")} onChange={set("driven")} />
          <strong id="cad-ratio">{a && b ? "Ratio " + (b / a).toFixed(3) + ":1" : "—"}</strong></div>
        <div className="math-card"><h3>Horsepower</h3>
          <input id="cad-torque" type="number" placeholder="Torque lb-ft" value={g("torque")} onChange={set("torque")} />
          <input id="cad-rpm" type="number" placeholder="RPM" value={g("rpm")} onChange={set("rpm")} />
          <strong id="cad-hp">{(g("torque") || g("rpm") ? ((num(g("torque")) * num(g("rpm"))) / 5252).toFixed(1) : "—") + " HP"}</strong></div>
        <div className="math-card"><h3>Tire Size</h3>
          <input id="cad-tire" placeholder="225/45R17" value={g("tire")} onChange={set("tire")} />
          <strong id="cad-tire-out">{g("tire") === "" ? "—" : tire ? "Sidewall " + (+tire[1]! * (+tire[2]! / 100)).toFixed(1) + " mm · " + tire[3] + " in wheel" : "Use 225/45R17 format"}</strong></div>
        <div className="math-card"><h3>RPM / Speed</h3>
          <input id="cad-rpm2" type="number" placeholder="RPM" value={g("rpm2")} onChange={set("rpm2")} />
          <input id="cad-final" type="number" step="0.01" placeholder="Final drive" value={g("final")} onChange={set("final")} />
          <strong id="cad-speed">{r && f ? (r / (f * 1)) * 0.00298 + " mph" : "— mph"}</strong></div>
        <div className="math-card"><h3>Suspension</h3>
          <input id="cad-spring" type="number" placeholder="Spring rate" value={g("spring")} onChange={set("spring")} />
          <input id="cad-load" type="number" placeholder="Corner load" value={g("load")} onChange={set("load")} />
          <strong id="cad-sag">{spring ? "Approx. deflection " + (load / spring).toFixed(3) + " in" : "—"}</strong></div>
        <div className="math-card"><h3>Basic CAD</h3>
          <canvas id="cad-canvas" ref={cv} width={520} height={260}></canvas>
          <p>Simple browser sketchpad for engineering concepts.</p></div>
      </div>
    </div>
  );
}

/* ----------------------------------- Dashboard ----------------------------------- */
function DashPanel({ active }: { active: boolean }) {
  useEmitter(studyEvents);
  const d = getDashboard();
  return (
    <div className={"edu-work-panel" + (active ? " active" : "")} id="edu-dashboard">
      <div className="student-dashboard">
        <div className="dash-card"><span>Assignments</span><strong id="dash-assignments">{d.assignments || 0}</strong></div>
        <div className="dash-card"><span>Study minutes</span><strong id="dash-minutes">{d.minutes || 0}</strong></div>
        <div className="dash-card"><span>Notes</span><strong id="dash-notes">{getNotes().length}</strong></div>
        <div className="dash-card"><span>Flashcards</span><strong id="dash-cards">{getCards().length}</strong></div>
        <div className="dash-card wide">
          <h3>Today's focus</h3>
          <textarea id="dash-focus" placeholder="What are you working on today?"></textarea>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------- Tab -------------------------------------- */
export function EduTab() {
  const tab = useValue(activeTab);
  const req = useValue(eduRequest);
  const [panel, setPanel] = useState("notes");
  const [sel, setSel] = useState("notes");
  const [review, setReview] = useState(0);

  useEffect(() => {
    if (!req) return;
    if (req.open) { setPanel(req.open); setSel(req.open); }
    if (req.startReview) setReview(req.n);
  }, [req]);

  const selTitle = useMemo(() => CABS.find((c) => c.key === sel)?.title || "", [sel]);

  return (
    <section id="tab-edu" className={"tab" + (tab === "tab-edu" ? " active" : "")}>
      <div className="edu-workspace">
        <div className="edu-hero">
          <div>
            <span className="edu-kicker">STUDENT WORKSPACE</span>
            <h2>Educational</h2>
            <p>Study, build, calculate, code, and organize school work without mixing it with the arcade.</p>
          </div>
          <div className="edu-status">LOCAL TOOLS · SAVE AS YOU GO</div>
        </div>
        <div className="edu-cabinet-wall" aria-label="Educational cabinets">
          {CABS.map((c) => (
            <button
              key={c.key}
              className={"edu-cab" + (c.lab ? " edu-cab-lab" : "") + (sel === c.key ? " edu-selected" : "")}
              {...(c.lab ? { "data-lab": c.key } : { "data-eduw": c.key })}
              type="button"
              aria-pressed={sel === c.key}
              onClick={() => {
                setSel(c.key);
                if (c.lab) launchLab(c.key);
                else setPanel(c.key);
              }}
            >
              <span className={"edu-cab-art" + (c.ti ? " edu-logo-ti" : "")} aria-hidden="true">{c.art}</span>
              <span className="edu-cab-title">{c.title}</span>
              <span className="edu-cab-meta">{c.meta}</span>
            </button>
          ))}
        </div>
        <div className="edu-cabinet-hint">
          <span>EDUCATIONAL CABINET ROW</span>
          <b>{selTitle ? "Selected: " + selTitle : "Choose a cabinet to open its workspace."}</b>
          <span>LOCAL · PRIVATE · SAVED IN BROWSER</span>
        </div>
        <div className="edu-work-tabs" aria-hidden="true">
          {WORK_TABS.map(([k, label]) => (
            <button key={k} className={"edu-work-tab" + (panel === k ? " active" : "")} data-eduw={k} type="button" onClick={() => setPanel(k)}>{label}</button>
          ))}
        </div>
        <NotesPanel active={panel === "notes"} />
        <CodingPanel active={panel === "coding"} />
        <MathPanel active={panel === "math"} />
        <MemoryPanel autoStart={review} active={panel === "memory"} />
        <CadPanel active={panel === "cad"} />
        <DashPanel active={panel === "dashboard"} />
      </div>
    </section>
  );
}
