import { BANKS_STORAGE_KEY, createInitialBanks, type Bank } from "./patterns";

function loadBanksFromStorage(): Bank[] | null {
  try {
    const raw = localStorage.getItem(BANKS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // A minimal shape check, so a corrupted or pre-feature value can't crash
    // the app — it just falls back to sixteen empty banks.
    if (!Array.isArray(parsed)) return null;
    return parsed as Bank[];
  } catch {
    return null;
  }
}

function persistBanks(saved: Bank[]): void {
  try {
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Some privacy modes refuse storage outright. The banks still work for
    // this visit; they just won't be waiting next time.
  }
}

/*
 * Banks live outside React state, in the same spirit as the theme in
 * `lib/themes.ts`: the server has no way of knowing what was saved, so the
 * first client render has to match its empty output exactly, and only after
 * that can the real, persisted banks take over. `useSyncExternalStore` is
 * what lets that swap happen without a `setState` racing the paint.
 *
 * Unlike the theme, there's no inline script writing the saved value before
 * React loads — 256 patterns' worth of JSON isn't worth blocking the first
 * paint on — so hydration happens the first time anything subscribes,
 * moments after mount instead of before it.
 */

const SERVER_SNAPSHOT: Bank[] = createInitialBanks();

let banks: Bank[] = SERVER_SNAPSHOT;
let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;

  const saved = loadBanksFromStorage();
  if (saved) {
    banks = saved;
    notify();
  }
}

export function subscribeToBanks(onChange: () => void): () => void {
  listeners.add(onChange);
  // The first subscriber is what triggers the read, so it happens once,
  // client-side only, and never during server rendering.
  hydrate();

  return () => {
    listeners.delete(onChange);
  };
}

export function getBanksSnapshot(): Bank[] {
  return banks;
}

/** What the server rendered, and what the first client render has to match. */
export function getServerBanksSnapshot(): Bank[] {
  return SERVER_SNAPSHOT;
}

/** Replaces the banks wholesale, persists them, and tells every subscriber. */
export function setBanks(next: Bank[]): void {
  banks = next;
  persistBanks(banks);
  notify();
}
