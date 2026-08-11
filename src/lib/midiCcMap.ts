import { ccValueToRange } from "@/lib/midi";

/** A control's stable identity, e.g. `"master:drive:amount"`. */
export type MidiMapId = string;

/** Which CC number each mapped control listens to. */
export type MidiCcMap = Record<MidiMapId, number>;

const STORAGE_KEY = "drum-machine-midi-cc-map";

function loadFromStorage(): MidiCcMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as MidiCcMap;
  } catch {
    return null;
  }
}

function persist(map: MidiCcMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Some privacy modes refuse storage outright. The mapping still works
    // for this visit; it just won't be waiting next time.
  }
}

/*
 * The bindings live outside React state, in the same spirit as the theme and
 * the pattern banks: the server has no way of knowing what was mapped, so the
 * first client render has to match its empty output exactly, and only after
 * that can the saved bindings take over.
 */

const SERVER_SNAPSHOT: MidiCcMap = {};

let ccMap: MidiCcMap = SERVER_SNAPSHOT;
let hydrated = false;
const mapListeners = new Set<() => void>();

function notifyMap(): void {
  for (const listener of mapListeners) listener();
}

function hydrateMap(): void {
  if (hydrated) return;
  hydrated = true;

  const saved = loadFromStorage();
  if (saved) {
    ccMap = saved;
    notifyMap();
  }
}

export function subscribeToMidiCcMap(onChange: () => void): () => void {
  mapListeners.add(onChange);
  hydrateMap();

  return () => {
    mapListeners.delete(onChange);
  };
}

export function getMidiCcMapSnapshot(): MidiCcMap {
  return ccMap;
}

export function getServerMidiCcMapSnapshot(): MidiCcMap {
  return SERVER_SNAPSHOT;
}

/**
 * Binds `mapId` to `cc`, stealing it from whatever else was already bound to
 * that same CC — one knob on the controller drives one control here, so a
 * second control learning the same number is a reassignment rather than a
 * second listener quietly appearing on it.
 */
export function setMidiCcBinding(mapId: MidiMapId, cc: number): void {
  const next: MidiCcMap = {};
  for (const [key, value] of Object.entries(ccMap)) {
    if (value !== cc) next[key] = value;
  }
  next[mapId] = cc;

  ccMap = next;
  persist(ccMap);
  notifyMap();
}

export function clearMidiCcBinding(mapId: MidiMapId): void {
  if (!(mapId in ccMap)) return;

  const next = { ...ccMap };
  delete next[mapId];

  ccMap = next;
  persist(ccMap);
  notifyMap();
}

function mapIdForCc(cc: number): MidiMapId | null {
  for (const [key, value] of Object.entries(ccMap)) {
    if (value === cc) return key;
  }
  return null;
}

/*
 * Which control, if any, is currently waiting to be bound to the next CC that
 * arrives. Ephemeral rather than persisted — nothing about "the user is
 * mid-gesture on this one knob right now" belongs in `localStorage` — and
 * shared the same way: a module-level singleton with the smallest store shape
 * `useSyncExternalStore` needs, rather than state threaded down through every
 * component between `DrumMachine` and whichever knob was clicked.
 */

let learningMapId: MidiMapId | null = null;
const learnListeners = new Set<() => void>();

function notifyLearn(): void {
  for (const listener of learnListeners) listener();
}

export function subscribeToMidiLearn(onChange: () => void): () => void {
  learnListeners.add(onChange);
  return () => {
    learnListeners.delete(onChange);
  };
}

export function getMidiLearnSnapshot(): MidiMapId | null {
  return learningMapId;
}

export function getServerMidiLearnSnapshot(): MidiMapId | null {
  return null;
}

export function startMidiLearn(mapId: MidiMapId): void {
  learningMapId = mapId;
  notifyLearn();
}

export function stopMidiLearn(): void {
  if (learningMapId === null) return;
  learningMapId = null;
  notifyLearn();
}

/**
 * The live range and setter for every mapped control currently on screen,
 * keyed the same way the bindings are. Plain and imperative rather than React
 * state: it exists only to be read the instant a CC arrives, and a control
 * switching tabs or unmounting has to fall out of it immediately rather than
 * waiting on a render that has no reason to happen otherwise.
 */
type RegisteredControl = {
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const registry = new Map<MidiMapId, RegisteredControl>();

/** Registers a mounted control's current range and setter; returns its cleanup. */
export function registerMidiControl(
  mapId: MidiMapId,
  min: number,
  max: number,
  onChange: (value: number) => void,
): () => void {
  const entry: RegisteredControl = { min, max, onChange };
  registry.set(mapId, entry);

  return () => {
    // Only clears the slot if this registration is still the one sitting in
    // it — guards against an unmount's cleanup running after a re-mount (a
    // tab switch, say) has already registered the control's new instance.
    if (registry.get(mapId) === entry) registry.delete(mapId);
  };
}

/**
 * What every incoming CC message does: bind it to whichever control is
 * currently learning, or — the ordinary case — apply it to whatever control
 * is already bound to that number, scaled onto that control's own range.
 *
 * A CC for a mapId with nothing mounted right now (a control on a hidden FX
 * tab, say) is a no-op: the binding is still there in storage, waiting for
 * that control to register again.
 */
export function handleIncomingCc(controller: number, value: number): void {
  if (learningMapId !== null) {
    setMidiCcBinding(learningMapId, controller);
    stopMidiLearn();
    return;
  }

  const mapId = mapIdForCc(controller);
  if (mapId === null) return;

  const entry = registry.get(mapId);
  if (!entry) return;

  entry.onChange(ccValueToRange(value, entry.min, entry.max));
}
