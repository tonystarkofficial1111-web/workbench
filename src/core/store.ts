import { useSyncExternalStore } from "react";

/** Minimal change-notification primitive; React reads it with useEmitter(). */
export class Emitter {
  private listeners = new Set<() => void>();
  private version = 0;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getVersion = () => this.version;
  emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

/** Re-render the calling component whenever the emitter fires. */
export function useEmitter(e: Emitter): number {
  return useSyncExternalStore(e.subscribe, e.getVersion, e.getVersion);
}

/** Tiny observable value (replaces the original's globals + DOM-ID reads). */
export class Value<T> extends Emitter {
  constructor(private v: T) {
    super();
  }
  get = () => this.v;
  set(next: T) {
    if (Object.is(next, this.v)) return;
    this.v = next;
    this.emit();
  }
}

export function useValue<T>(val: Value<T>): T {
  useEmitter(val);
  return val.get();
}

/** Safe localStorage JSON helpers (the original wraps every access in try/catch). */
export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v == null ? fallback : (v as T);
  } catch {
    return fallback;
  }
}
export function lsSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function lsGetRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function lsSetRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
