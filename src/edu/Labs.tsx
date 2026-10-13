import { useEffect, useRef, useState } from "react";
import { G519Shell } from "../core/overlay";
import { wbWeak } from "../features/weak";

/* ------------------------------- Python Lab ------------------------------- */
const SAMPLE = 'background("black")\ncircle(200, 150, 60, "cyan")\nrect(120, 220, 160, 30, "amber")\nline(60, 60, 340, 60, "purple")\ntext(200, 100, "Hello Workbench", "white")';
const PAL: Record<string, string> = { black: "#0b0e16", white: "#ffffff", cyan: "#5fd4c7", amber: "#e0a458", purple: "#9d7bd8", red: "#ff6b6b", green: "#8be88a", blue: "#6fa8dc", yellow: "#e8c98a", pink: "#e88ad0" };
const colorOf = (c?: string) => {
  if (!c) return "#5fd4c7";
  c = c.replace(/["']/g, "").trim().toLowerCase();
  return PAL[c] || c;
};

export function PythonLab() {
  const [code, setCode] = useState(SAMPLE);
  const [help, setHelp] = useState("");
  const cv = useRef<HTMLCanvasElement>(null);

  function run(src = code) {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#5fd4c7";
    ctx.fillStyle = "#5fd4c7";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    let ok = 0, bad = 0;
    for (const raw of src.split("\n")) {
      const line = raw.trim();
      if (!line || line.indexOf("#") === 0) continue;
      let m: RegExpMatchArray | null;
      if ((m = line.match(/^background\s*\(\s*(.+?)\s*\)\s*$/i))) { ctx.fillStyle = colorOf(m[1]); ctx.fillRect(0, 0, c.width, c.height); ok++; }
      else if ((m = line.match(/^circle\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(.+?)\s*\)\s*$/i))) { ctx.beginPath(); ctx.fillStyle = colorOf(m[4]); ctx.arc(+m[1]!, +m[2]!, Math.max(1, +m[3]!), 0, Math.PI * 2); ctx.fill(); ok++; }
      else if ((m = line.match(/^rect\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(.+?)\s*\)\s*$/i))) { ctx.fillStyle = colorOf(m[5]); ctx.fillRect(+m[1]!, +m[2]!, +m[3]!, +m[4]!); ok++; }
      else if ((m = line.match(/^line\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(.+?)\s*\)\s*$/i))) { ctx.beginPath(); ctx.strokeStyle = colorOf(m[5]); ctx.moveTo(+m[1]!, +m[2]!); ctx.lineTo(+m[3]!, +m[4]!); ctx.stroke(); ok++; }
      else if ((m = line.match(/^text\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)\s*$/i))) { ctx.fillStyle = colorOf(m[4]); ctx.fillText(m[3]!.replace(/["']/g, ""), +m[1]!, +m[2]!); ok++; }
      else if ((m = line.match(/^width\s*\(\s*(\d+)\s*\)\s*$/i))) { ctx.lineWidth = Math.max(1, +m[1]!); ok++; }
      else bad++;
    }
    setHelp(bad
      ? "Ran " + ok + " command" + (ok === 1 ? "" : "s") + ", " + bad + " line" + (bad === 1 ? "" : "s") + " not recognized."
      : "Ran " + ok + " command" + (ok === 1 ? "" : "s") + " OK ✓");
  }
  useEffect(() => { run(SAMPLE); }, []); // draw the sample immediately

  const cmd = (sig: string, desc: string, ex: React.ReactNode, first = false) => (
    <div style={first ? undefined : { marginTop: 6 }}>
      <b style={{ color: "var(--cyan)" }}>{sig}</b> — {desc}<br /><span style={{ color: "var(--muted)" }}>{ex}</span>
    </div>
  );
  return (
    <G519Shell title="🐍 Python Lab" sub="Visual drawing module — type graphics commands and press Run.">
      <div className="py-box">
        <details className="py-tutorial" id="py-tut">
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--amber)", fontWeight: 600, padding: "8px 0" }}>📖 Tutorial — How to use Python Lab</summary>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, padding: "8px 0" }}>
            <p style={{ margin: "0 0 10px", color: "var(--text)" }}>Python Lab lets you draw on a canvas by typing simple commands, one per line. Think of it like giving instructions to a robot artist.</p>
            <p style={{ margin: "0 0 8px", color: "var(--text)", fontWeight: 600 }}>Available commands:</p>
            <div style={{ background: "#0f1320", border: "1px solid var(--line)", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 11, lineHeight: 1.9 }}>
              {cmd("background(color)", "Fill the entire canvas with a color.", 'Example: background("black")', true)}
              {cmd("circle(x, y, radius, color)", "Draw a filled circle.", <>x = horizontal position, y = vertical position, radius = size<br />Example: circle(200, 150, 60, "cyan")</>)}
              {cmd("rect(x, y, width, height, color)", "Draw a filled rectangle.", <>x, y = top-left corner; width, height = size<br />Example: rect(120, 220, 160, 30, "amber")</>)}
              {cmd("line(x1, y1, x2, y2, color)", "Draw a line from one point to another.", <>x1, y1 = start point; x2, y2 = end point<br />Example: line(60, 60, 340, 60, "purple")</>)}
              {cmd("text(x, y, message, color)", "Write text on the canvas.", <>x, y = position of the text; message must be in quotes<br />Example: text(200, 100, "Hello Workbench", "white")</>)}
              {cmd("width(pixels)", "Set the line thickness for subsequent lines.", "Example: width(5)")}
            </div>
            <p style={{ margin: "10px 0 6px", color: "var(--text)", fontWeight: 600 }}>Colors available:</p>
            <p style={{ margin: "0 0 10px" }}>black, white, cyan, amber, purple, red, green, blue, yellow, pink</p>
            <p style={{ margin: "0 0 6px", color: "var(--text)", fontWeight: 600 }}>Tips:</p>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>The canvas is 400 wide and 300 tall — keep coordinates in that range.</li>
              <li>Top-left corner is (0, 0). X goes right, Y goes down.</li>
              <li>Lines starting with # are comments and are ignored.</li>
              <li>Commands run top-to-bottom, so later commands draw on top of earlier ones.</li>
              <li>Colors must be in quotes, like "red". Numbers do not need quotes.</li>
            </ul>
          </div>
        </details>
        <p className="py-hint">Whitelisted commands: <b>background, circle, rect, line, text, width</b>. Colors: black, white, cyan, amber, purple, red, green, blue, yellow, pink. Click Run.</p>
        <textarea className="py-code" id="py-code" rows={7} value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="g519-btnrow">
          <button className="type-btn" id="py-run" onClick={() => run()}>▶ Run</button>{" "}
          <button
            className="type-btn ghost" id="py-clear"
            onClick={() => {
              const c = cv.current;
              if (c) { const ctx = c.getContext("2d")!; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height); }
              setHelp("Canvas cleared.");
            }}
          >Clear canvas</button>
        </div>
        <canvas id="py-canvas" ref={cv} width={400} height={300} className="py-canvas" />
        <p className="py-help" id="py-help">{help}</p>
      </div>
    </G519Shell>
  );
}

/* --------------------------------- Spanish --------------------------------- */
const DECKS: Record<string, [string, string][]> = {
  Basics: [["hola", "hello"], ["gracias", "thank you"], ["por favor", "please"], ["adiós", "goodbye"], ["amigo", "friend"], ["familia", "family"]],
  Travel: [["aeropuerto", "airport"], ["hotel", "hotel"], ["billete", "ticket"], ["tren", "train"], ["izquierda", "left"], ["derecha", "right"]],
  Food: [["agua", "water"], ["pan", "bread"], ["queso", "cheese"], ["manzana", "apple"], ["comida", "food"], ["desayuno", "breakfast"]],
  // Defined in the original but not offered in its deck picker; kept for parity.
  Phrases: [
    ["¿Cómo estás?", "How are you?"], ["Estoy bien, gracias.", "I am fine, thank you."], ["¿Cómo te llamas?", "What is your name?"], ["Me llamo...", "My name is..."],
    ["Mucho gusto.", "Nice to meet you."], ["¿Dónde está el baño?", "Where is the bathroom?"], ["¿Cuánto cuesta?", "How much does it cost?"],
    ["Quisiera un café, por favor.", "I would like a coffee, please."], ["No entiendo.", "I do not understand."], ["¿Puede repetir, por favor?", "Can you repeat, please?"],
    ["¿Habla inglés?", "Do you speak English?"], ["Estoy aprendiendo español.", "I am learning Spanish."], ["Necesito ayuda.", "I need help."], ["¿Qué hora es?", "What time is it?"],
    ["Tengo una pregunta.", "I have a question."], ["¿Dónde está la estación?", "Where is the station?"], ["Hasta luego.", "See you later."], ["Nos vemos mañana.", "See you tomorrow."],
    ["Que tengas un buen día.", "Have a good day."], ["¡Vamos!", "Let’s go!"],
  ],
};

function makeSpanishQ(deck: string) {
  const d = DECKS[deck]!;
  const correct = d[Math.floor(Math.random() * d.length)]!;
  const opts = [correct[1]];
  while (opts.length < 4) {
    const x = d[Math.floor(Math.random() * d.length)]![1];
    if (!opts.includes(x)) opts.push(x);
  }
  opts.sort(() => Math.random() - 0.5);
  return { word: correct[0], answer: correct[1], opts };
}

export function SpanishLab() {
  const [deck, setDeck] = useState("Basics");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [q, setQ] = useState(() => makeSpanishQ("Basics"));
  const [feedback, setFeedback] = useState("");
  const cur = DECKS[deck]![idx % DECKS[deck]!.length]!;

  return (
    <G519Shell title="🇪🇸 Spanish" sub="Quizlet-inspired vocabulary study: flashcards, decks, and quick checks.">
      <div className="study-shell">
        <div className="study-card">
          <h4>🇪🇸 Flashcards</h4>
          <div className="study-muted">Choose a deck, then tap the card to reveal the meaning. Use Next to keep studying.</div>
          <select id="es-deck" value={deck} onChange={(e) => { setDeck(e.target.value); setIdx(0); setRevealed(false); setQ(makeSpanishQ(e.target.value)); setFeedback(""); }}
            style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 9, background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)" }}>
            <option>Basics</option><option>Travel</option><option>Food</option>
          </select>
          <div className={"flashcard" + (revealed ? " revealed" : "")} id="es-card" style={{ marginTop: 12 }} onClick={() => setRevealed((r) => !r)}>
            <div>
              <div className="fc-small">Spanish</div>
              <div className="fc-main" id="es-front">{cur[0]}</div>
              <div className="fc-answer" id="es-back">{cur[1]}</div>
              <div className="fc-small">tap to flip</div>
            </div>
          </div>
          <div className="study-actions"><button className="primary" id="es-next" onClick={() => { setIdx((i) => i + 1); setRevealed(false); }}>Next card</button></div>
        </div>
        <div className="study-card">
          <h4>Quick Quiz</h4>
          <div className="study-muted">Pick the English meaning of the Spanish word.</div>
          <div className="study-question" id="es-q">{q.word}</div>
          <div className="study-options" id="es-options">
            {q.opts.map((x) => (
              <button key={x} className="study-option" onClick={() => {
                try {
                  if (x === q.answer) wbWeak.ok("Spanish", q.word);
                  else wbWeak.log("Spanish", 'What does "' + q.word + '" mean?', q.answer);
                } catch { /* ignore */ }
                setFeedback(x === q.answer ? "Correct — nice work." : "Not quite — try another card and remember the context.");
              }}>{x}</button>
            ))}
          </div>
          <div className="study-feedback" id="es-feedback">{feedback}</div>
          <div className="study-actions"><button className="primary" id="es-newq" onClick={() => { setQ(makeSpanishQ(deck)); setFeedback(""); }}>New question</button></div>
        </div>
      </div>
    </G519Shell>
  );
}

/* --------------------------------- Algebra --------------------------------- */
type Q = [string, string[], string, string[], string];
const LEVELS: Record<string, { cards: string[][]; qs: Q[] }> = {
  "Algebra 1": {
    cards: [
      ["2x + 4 = 10", "x = 3", "Subtract 4 from both sides.", "Then divide both sides by 2."],
      ["y = 2x + 1", "slope = 2", "Compare the equation with y = mx + b.", "The coefficient of x is the slope."],
      ["x² - 9", "(x - 3)(x + 3)", "Recognize a difference of squares.", "Factor using a² - b² = (a-b)(a+b)."],
      ["3(x + 2) = 15", "x = 3", "Divide both sides by 3.", "Subtract 2 to isolate x."],
      ["x / 4 = 5", "x = 20", "Multiply both sides by 4.", "This clears the denominator and isolates x."],
      ["x + 7 > 12", "x > 5", "Subtract 7 from both sides.", "The inequality direction stays the same because we did not multiply or divide by a negative."],
    ],
    qs: [
      ["3x + 2 = 14", ["2", "4", "6", "8"], "4", ["Subtract 2 from both sides: 3x = 12.", "Divide by 3: x = 4."], "The goal is to isolate x while keeping both sides balanced."],
      ["5x - 10 = 20", ["4", "5", "6", "8"], "6", ["Add 10 to both sides: 5x = 30.", "Divide by 5: x = 6."], "Undo subtraction first, then undo multiplication."],
      ["x² = 49", ["5", "6", "7", "8"], "7", ["Take the principal square root of 49.", "√49 = 7."], "For this introductory problem, compare the positive square root with the choices."],
      ["2(x + 3)=14", ["3", "4", "5", "6"], "4", ["Divide both sides by 2: x + 3 = 7.", "Subtract 3: x = 4."], "Undo the outside multiplication before isolating the variable."],
      ["y = -3x + 2", ["-3", "2", "3", "-2"], "-3", ["Compare with y = mx + b.", "The coefficient of x is m, so m = -3."], "Slope is the number multiplying x in slope-intercept form."],
    ],
  },
  "Algebra 2": {
    cards: [
      ["x² - 5x + 6 = 0", "x = 2, 3", "Factor the quadratic as (x - 2)(x - 3).", "Set each factor equal to zero."],
      ["f(x)=x²-4x+3", "vertex: (2, -1)", "Use x = -b/(2a) to find the axis of symmetry.", "Evaluate f(2) to get the vertex y-value."],
      ["2ˣ = 16", "x = 4", "Rewrite 16 as 2⁴.", "Equal bases give equal exponents."],
      ["log₂(32)", "5", "Ask which exponent on 2 produces 32.", "Since 2⁵ = 32, the logarithm is 5."],
      ["x² + 2x - 8", "(x + 4)(x - 2)", "Find two numbers that multiply to -8 and add to 2.", "Those numbers are 4 and -2."],
      ["(x² - 9)/(x - 3)", "x + 3, x ≠ 3", "Factor the numerator as (x - 3)(x + 3).", "Cancel the common factor, while keeping the original restriction x ≠ 3."],
    ],
    qs: [
      ["x² - 5x + 6 = 0", ["x=1,6", "x=2,3", "x=-2,-3", "x=3,4"], "x=2,3", ["Factor: (x - 2)(x - 3) = 0.", "Set each factor equal to zero: x = 2 or x = 3."], "Factoring a quadratic can turn one equation into two simpler equations."],
      ["f(x)=x²-4x+3: vertex?", ["(2,-1)", "(4,3)", "(-2,-1)", "(2,1)"], "(2,-1)", ["The axis is x = -(-4)/(2·1) = 2.", "Evaluate f(2): 4 - 8 + 3 = -1."], "For a quadratic, the vertex lies on the axis of symmetry."],
      ["2ˣ = 16", ["2", "3", "4", "5"], "4", ["Rewrite 16 as 2⁴.", "Equal bases mean x = 4."], "Look for a common exponential base before solving."],
      ["log₂(32)", ["3", "4", "5", "6"], "5", ["Ask 2 raised to what power equals 32?", "2⁵ = 32."], "A logarithm asks for the exponent needed to produce the given value."],
      ["x² + 2x - 8 = 0", ["x=-4,2", "x=-2,4", "x=1,8", "x=-1,8"], "x=-4,2", ["Factor: (x + 4)(x - 2) = 0.", "So x = -4 or x = 2."], "For ax²+bx+c, look for factors whose product is c and sum is b."],
    ],
  },
};

export function AlgebraLab() {
  const [level, setLevel] = useState("Algebra 1");
  const [idx, setIdx] = useState(0);
  const [qi, setQi] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [explain, setExplain] = useState<React.ReactNode>(
    <><h5>How it works</h5><div className="alg-why">Answer the problem to reveal the steps and why the method works.</div></>,
  );
  const L = LEVELS[level]!;
  const q = L.qs[(qi - 1) % L.qs.length]!;
  const c = L.cards[idx % L.cards.length]!;

  const reset = (lv: string) => {
    setLevel(lv); setIdx(0); setQi(1); setRevealed(false);
    setExplain(<><h5>How it works</h5><div className="alg-why">Answer the problem to reveal the steps and why the method works.</div></>);
  };
  const newQ = () => {
    setQi((n) => n + 1);
    setExplain(<><h5>How it works</h5><div className="alg-why">Answer the problem to reveal the steps and why the method works.</div></>);
  };
  const answer = (x: string) => {
    const correct = x === q[2];
    try {
      if (correct) wbWeak.ok("Algebra", q[0]); else wbWeak.log("Algebra", q[0], q[2]);
    } catch { /* ignore */ }
    const title = correct ? "✓ Correct answer" : "↺ Learn from this answer";
    const result = correct ? "Answer: " + q[2] : "Correct result: " + q[2];
    const note = correct ? "The same method can be reused on similar problems." : "Compare your choice with each step above, then try the problem again.";
    setExplain(
      <>
        <h5>{title}</h5>
        <div className="alg-why"><b>Why:</b> {q[4]}</div>
        {q[3].map((s, i) => (<div className="alg-step" key={i}><b>{i + 1}</b><span>{s}</span></div>))}
        <div className="alg-result">{result}</div>
        <div className="alg-answer-note">{note}</div>
      </>,
    );
  };

  return (
    <G519Shell title="∑ Algebra Study Lab" sub="Choose Algebra 1 or Algebra 2. Both levels use flashcards, worked examples, and guided practice.">
      <div className="alg-level-tabs">
        <button className={"alg-level-tab" + (level === "Algebra 1" ? " active" : "")} data-level="Algebra 1" onClick={() => reset("Algebra 1")}>Algebra 1 · Lower Level</button>
        <button className={"alg-level-tab" + (level === "Algebra 2" ? " active" : "")} data-level="Algebra 2" onClick={() => reset("Algebra 2")}>Algebra 2 · Upper Level</button>
      </div>
      <div className="alg-layout">
        <div>
          <div className="study-shell" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="study-card">
              <h4 id="alg-title">∑ {level} Study Deck</h4>
              <div className="study-muted" id="alg-subtitle">
                {level === "Algebra 1" ? "Foundations: equations, slope, factoring, exponents, and inequalities." : "Upper level: quadratics, functions, logarithms, and algebraic expressions."}
              </div>
              <div className={"flashcard" + (revealed ? " revealed" : "")} id="alg-card" style={{ marginTop: 12 }} onClick={() => setRevealed((r) => !r)}>
                <div>
                  <div className="fc-small">Problem</div>
                  <div className="fc-main" id="alg-front">{c[0]}</div>
                  <div className="fc-answer" id="alg-back">{c[1] + " · " + c[2] + " " + c[3]}</div>
                  <div className="fc-small">tap to reveal solution</div>
                </div>
              </div>
              <div className="study-actions"><button className="primary" id="alg-next" onClick={() => { setIdx((i) => i + 1); setRevealed(false); }}>Next example</button></div>
            </div>
            <div className="study-card">
              <h4>Practice Check</h4>
              <div className="study-muted">Choose an answer. The explanation panel on the right will show the steps and the reason behind them.</div>
              <div className="study-question" id="alg-q" style={{ marginTop: 14 }}>{q[0]}</div>
              <div className="study-options" id="alg-options">
                {q[1].map((x) => (<button key={qi + x} className="study-option" onClick={() => answer(x)}>{x}</button>))}
              </div>
              <div className="study-actions"><button className="primary" id="alg-newq" onClick={newQ}>New problem</button></div>
            </div>
          </div>
        </div>
        <aside className="alg-explain" id="alg-explain">{explain}</aside>
      </div>
    </G519Shell>
  );
}
