/**
 * A value that outlives the page, kept outside React and read through
 * `useSyncExternalStore`.
 *
 * The banks, the scenes and the MIDI CC map were three copies of this file with
 * a word swapped. The shape they share is not incidental — it falls out of one
 * constraint. The server has no way of knowing what a visitor saved, so the
 * first client render has to match the server's empty output exactly, and only
 * after that can the saved value take over. `useSyncExternalStore` is what lets
 * that swap happen without a `setState` racing the paint, which is why none of
 * these live in React state to begin with.
 *
 * Hydration is deferred to the first subscriber rather than done at module load,
 * so the read happens once, on the client, and never during server rendering.
 * The theme takes the other route — an inline script before React loads — but it
 * is one short string; 256 patterns' worth of JSON is not worth blocking the
 * first paint on.
 */
type PersistedStore<T> = {
  /** Pass to `useSyncExternalStore`. Triggers the one-time read. */
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  /** What the server rendered, and what the first client render has to match. */
  getServerSnapshot: () => T;
  /** Replaces the value wholesale, persists it, and tells every subscriber. */
  set: (next: T) => void;
};

type PersistedStoreOptions<T> = {
  /** The `localStorage` key. */
  key: string;
  /** The value before anything is read — and the server's snapshot. */
  initial: () => T;
  /**
   * Narrows whatever `JSON.parse` returned, or rejects it.
   *
   * Returning `null` falls back to `initial`, which is what a corrupted or
   * pre-feature value should do: the app opens empty rather than not at all.
   * This is the only place a stored value is checked, so a store that wants
   * more than a shape probe does it here.
   */
  parse: (value: unknown) => T | null;
};

export function createPersistedStore<T>({
  key,
  initial,
  parse,
}: PersistedStoreOptions<T>): PersistedStore<T> {
  const serverSnapshot = initial();

  let current: T = serverSnapshot;
  let hydrated = false;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function read(): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return parse(JSON.parse(raw) as unknown);
    } catch {
      // Unreadable, unparseable, or storage refused outright — all of which
      // mean the same thing here: there is nothing to restore.
      return null;
    }
  }

  function write(value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Some privacy modes refuse storage, and a full quota reads the same.
      // The value still works for this visit; it just won't be waiting next
      // time.
    }
  }

  function hydrate(): void {
    if (hydrated) return;
    hydrated = true;

    const saved = read();
    if (saved === null) return;

    current = saved;
    notify();
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      hydrate();

      return () => {
        listeners.delete(onChange);
      };
    },
    getSnapshot: () => current,
    getServerSnapshot: () => serverSnapshot,
    set(next) {
      current = next;
      write(current);
      notify();
    },
  };
}
