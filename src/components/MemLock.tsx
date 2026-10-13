import { useEffect, useRef, useState } from "react";
import { useEmitter } from "../core/store";
import { authEvents, pendingAuth, resolveAuth, verifyCode } from "../features/memory";

/** Code prompt shown before any Assistant-memory change (original wbMemAuth). */
export function MemLock() {
  useEmitter(authEvents);
  const req = pendingAuth;
  const [err, setErr] = useState("");
  const [fails, setFails] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!req) return;
    setErr("");
    setFails(0);
    setBlockedUntil(0);
    const t = setTimeout(() => inp.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); resolveAuth(false); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey, true); };
  }, [req]);

  if (!req) return null;
  return (
    <div id="wb-memlock" role="dialog" aria-modal="true">
      <form
        className="wb-memlock-card"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (!e.nativeEvent.isTrusted) return; // a script cannot press the button for you
          if (Date.now() < blockedUntil) { setErr("Too many wrong codes. Wait a few seconds."); return; }
          const v = inp.current?.value || "";
          if (verifyCode(v)) { resolveAuth(true); return; }
          let f = fails + 1;
          if (inp.current) inp.current.value = "";
          if (f >= 5) { setBlockedUntil(Date.now() + 15000); f = 0; setErr("Too many wrong codes. Wait 15 seconds."); }
          else setErr("Incorrect code. Nothing was changed.");
          setFails(f);
          inp.current?.focus();
        }}
      >
        <h3>{"🔒"} Assistant memory is locked</h3>
        <p>Enter the code to {req.label}. Every change to the Assistant memory needs it, for anyone, including the AI.</p>
        <input ref={inp} type="password" placeholder="Code" autoComplete="off" aria-label="Code" />
        <div className="wb-memlock-err" aria-live="polite">{err}</div>
        <div className="wb-memlock-row">
          <button type="button" className="ghost" onClick={() => resolveAuth(false)}>Cancel</button>
          <button type="submit">Unlock and apply</button>
        </div>
      </form>
    </div>
  );
}
