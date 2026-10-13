import { Value } from "./store";

/**
 * Late-bound hooks between features that the original wired through window.* globals.
 * The World and Assistant modules register themselves here when they mount.
 */
export const worldBridge = {
  /** Download the complete save bundle (world + arcade + AI + study). */
  exportBundle: (() => {}) as () => void,
  /** Load a parsed save / bundle into the world. May throw on bad data. */
  importData: ((_d: any) => {}) as (d: any) => void,
  /** Number of placed blocks (Developer panel "Blocks placed"). */
  blockCount: (() => 0) as () => number,
  /** Highest legacy/infinite "day" reached, shown on the User/Saves tab. */
  day: new Value<number>(1),
};

export const assistantBridge = {
  /** Current backend id (for Dev panel + save bundle). */
  backend: new Value<string>("local-tiny"),
  getHistory: (() => []) as () => { role: string; content: string }[],
  setHistory: ((_h: { role: string; content: string }[]) => {}) as (h: { role: string; content: string }[]) => void,
  getSettings: (() => ({ backend: "local-tiny", homeAddress: "", homeModel: "" })) as () => { backend: string; homeAddress: string; homeModel: string },
  lastReply: (() => "") as () => string,
  addMessage: ((_role: string, _text: string) => {}) as (role: string, text: string) => void,
  tokens: ((t: string) => Math.ceil(String(t || "").length / 4)) as (t: string) => number,
};
