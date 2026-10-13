// Browser-side helpers for comparing the original Block World with the port (load with: await (0,eval)(await (await fetch('/harness.js')).text())).
// Works on /orig-dbg and /new-dbg (see serve.ts). Events are dispatched at element centres through elementFromPoint, so a button that is
// covered by another element fails the same way it would for a real mouse.
window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.__ev = (t, x, y, names, extra) => {
  const o = Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, view: window, pointerId: 1, pointerType: "mouse", isPrimary: true }, extra || {});
  names.forEach((n) => t.dispatchEvent(new (n.startsWith("pointer") ? PointerEvent : MouseEvent)(n, o)));
};
window.__click = (el) => {
  if (typeof el === "string") el = document.getElementById(el);
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y);
  __ev(t, x, y, ["pointerover", "mouseover", "pointermove", "mousemove", "pointerdown", "mousedown", "pointerup", "mouseup", "click"]);
  return t === el || el.contains(t);
};
window.__cv = (x, y, names) => {
  const t = document.elementFromPoint(x, y);
  __ev(t, x, y, names || ["pointermove", "mousemove"]);
  return t.id || t.tagName;
};
window.__key = (code, k) => ["keydown", "keyup"].forEach((n) => window.dispatchEvent(new KeyboardEvent(n, { code, key: k || code, bubbles: true })));
window.__txt = () => (document.getElementById("world-status") || {}).textContent;
window.__enter = async (mode) => {
  HTMLInputElement.prototype.click = function () { window.__fileClicked = (window.__fileClicked || 0) + 1; };
  [...document.querySelectorAll(".tabbtn")].find((b) => b.getAttribute("data-target") === "tab-arcade").click();
  await __sleep(500);
  [...document.querySelectorAll("#tab-arcade button")].find((b) => b.textContent.includes("Block World")).click();
  await __sleep(800);
  document.querySelector('#mode-select-overlay [data-mode="' + mode + '"]').click();
  await __sleep(2500);
  return { canvas: [...document.querySelectorAll("#tab-world canvas")].map((c) => c.width + "x" + c.height), dbg: !!window.__dbg, mode: window.__dbg && window.__dbg.mode };
};
window.__st = () => {
  const pf = __dbg.pf();
  return pf ? { wood: pf.wood, iron: pf.iron, b: (pf.buildings || []).length, defs: __dbg2.defs.length } : null;
};
window.__findOk = async () => {
  for (let y = 250; y <= 520; y += 20) for (let x = 250; x <= 760; x += 20) { __cv(x, y); await __sleep(25); if (__dbg2.ok) return [x, y]; }
  return null;
};
window.__buildTest = async (btn) => {
  const pf = __dbg.pf(); pf.wood = 900; pf.iron = 300; await __sleep(300);
  const b0 = __st(), clicked = __click(btn); await __sleep(200);
  const placing = __dbg2.placing, spot = await __findOk();
  let placed = null;
  if (spot) { __cv(spot[0], spot[1], ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]); await __sleep(300); placed = __st(); }
  return btn + " clicked=" + clicked + " placing=" + placing + " spot=" + spot + " b:" + (b0 && b0.b) + "->" + (placed && placed.b) + " defs:" + (b0 && b0.defs) + "->" + (placed && placed.defs) + " wood:" + (b0 && b0.wood) + "->" + (placed && placed.wood);
};
// Layout/style fingerprint of every element with an id (plus the Block World classes) so two builds can be diffed.
window.__collect = () => {
  const o = {};
  document.querySelectorAll("body [id], #tab-world *, #bw-instr *").forEach((e, i) => {
    if (e.closest("#tab-start,#tab-edu,#tab-videos,#tab-ai,#tab-data,#tab-dev,#tab-arcade,svg")) return;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const key = e.id || (e.className && typeof e.className === "string" ? e.tagName + "." + e.className.split(" ")[0] + "#" + i : e.tagName + "#" + i);
    o[key] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), cs.display, cs.pointerEvents, cs.zIndex, cs.visibility, cs.opacity, cs.position, cs.cursor, cs.fontSize, cs.color, cs.backgroundColor].join("|");
  });
  return o;
};
window.__post = async (name, obj) => (await fetch("/save?name=" + name, { method: "POST", body: JSON.stringify(obj) })).text();
true;
