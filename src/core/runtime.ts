/** Runtime shims from the original 5.17.0 feature pack. Import this before anything else runs. */
const w = window as any;

// Defensive fullscreen: swallow the rejection when fullscreen is requested without a user gesture / inside restricted frames.
try {
  const origFS = Element.prototype.requestFullscreen;
  if (origFS) {
    Element.prototype.requestFullscreen = function (this: Element, ...args: any[]) {
      try {
        const p = (origFS as any).apply(this, args);
        if (p && typeof p.catch === "function") p.catch(() => {});
        return p;
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }
} catch { /* ignore */ }

// Active-system counters shown in Developer options (approximate counts of RAF loops and intervals).
w.__wbRaf = 0;
w.__wbTimers = 0;
w.__wbDemoOn = false;
try {
  const oRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb: FrameRequestCallback) {
    w.__wbRaf++;
    return oRaf.call(window, (t: number) => { w.__wbRaf = Math.max(0, w.__wbRaf - 1); return cb(t); });
  };
  const oSi = window.setInterval, oCi = window.clearInterval;
  window.setInterval = function (...a: any[]) { w.__wbTimers++; return (oSi as any).apply(window, a); } as any;
  window.clearInterval = function (id?: number) { w.__wbTimers = Math.max(0, w.__wbTimers - 1); return (oCi as any).apply(window, arguments as any); } as any;
} catch { /* ignore */ }

export {};
