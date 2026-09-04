import { SCENES_STORAGE_KEY, createInitialScenes, type Scenes } from "./scenes";

function loadScenesFromStorage(): Scenes | null {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // The same minimal shape check `lib/bankStore` makes, and for the same
    // reason: a corrupted or pre-feature value falls back to empty slots
    // rather than taking the app down with it.
    if (!Array.isArray(parsed)) return null;
    return parsed as Scenes;
  } catch {
    return null;
  }
}

function persistScenes(saved: Scenes): void {
  try {
    localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Some privacy modes refuse storage outright. The scenes still work for
    // this visit; they just won't be waiting next time.
  }
}

/*
 * Scenes live outside React state for exactly the reasons `lib/bankStore`
 * gives: the server cannot know what was saved, so the first client render has
 * to match its empty output, and `useSyncExternalStore` is what lets the real
 * value take over afterwards without a `setState` racing the paint.
 *
 * Kept in a store of their own rather than folded into the banks, because a
 * scene is not a pattern and does not live in one. Patterns are filed in banks
 * and deliberately hold no kit; a scene describes the kit itself — which
 * sixteen channels are playing — and the kit is shared across every bank. So
 * scenes are global, the same way the kit is.
 */

const SERVER_SNAPSHOT: Scenes = createInitialScenes();

let scenes: Scenes = SERVER_SNAPSHOT;
let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;

  const saved = loadScenesFromStorage();
  if (saved) {
    scenes = saved;
    notify();
  }
}

export function subscribeToScenes(onChange: () => void): () => void {
  listeners.add(onChange);
  // The first subscriber is what triggers the read, so it happens once,
  // client-side only, and never during server rendering.
  hydrate();

  return () => {
    listeners.delete(onChange);
  };
}

export function getScenesSnapshot(): Scenes {
  return scenes;
}

/** What the server rendered, and what the first client render has to match. */
export function getServerScenesSnapshot(): Scenes {
  return SERVER_SNAPSHOT;
}

/** Replaces the scenes wholesale, persists them, and tells every subscriber. */
export function setScenes(next: Scenes): void {
  scenes = next;
  persistScenes(scenes);
  notify();
}
