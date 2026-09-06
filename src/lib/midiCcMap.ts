import { ccValueToRange } from "@/lib/midi";
import { createPersistedStore } from "@/lib/persistedStore";

/** A control's stable identity, e.g. `"master:drive:amount"`. */
export type MidiMapId = string;

/** Which CC number each mapped control listens to. */
export type MidiCcMap = Record<MidiMapId, number>;

const STORAGE_KEY = "drum-machine-midi-cc-map";

/*
 * The bindings live outside React state for the reasons `lib/persistedStore`
 * gives: the server has no way of knowing what was mapped, so the first client
 * render has to match its empty output exactly, and only after that can the
 * saved bindings take over.
 */
const store = createPersistedStore<MidiCcMap>({
  key: STORAGE_KEY,
  initial: () => ({}),
  parse: (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as MidiCcMap)
      : null,
});

export const subscribeToMidiCcMap = store.subscribe;
export const getMidiCcMapSnapshot = store.getSnapshot;
export const getServerMidiCcMapSnapshot = store.getServerSnapshot;

/**
 * Binds `mapId` to `cc`, stealing it from whatever else was already bound to
 * that same CC — one knob on the controller drives one control here, so a
 * second control learning the same number is a reassignment rather than a
 * second listener quietly appearing on it.
 */
export function setMidiCcBinding(mapId: MidiMapId, cc: number): void {
  const next: MidiCcMap = {};
  for (const [key, value] of Object.entries(store.getSnapshot())) {
    if (value !== cc) next[key] = value;
  }
  next[mapId] = cc;

  store.set(next);
}

export function clearMidiCcBinding(mapId: MidiMapId): void {
  if (!(mapId in store.getSnapshot())) return;

  const next = { ...store.getSnapshot() };
  delete next[mapId];

  store.set(next);
}

/**
 * Drops every binding at once, for the mappings list's own reset. Kept apart
 * from clearing them one at a time because it is a different decision — "this
 * knob is on the wrong CC" against "start the controller over" — and because
 * the list is the one place all of them are visible enough for that to be an
 * informed one.
 */
export function clearAllMidiCcBindings(): void {
  if (Object.keys(store.getSnapshot()).length === 0) return;

  store.set({});
}

function mapIdForCc(cc: number): MidiMapId | null {
  for (const [key, value] of Object.entries(store.getSnapshot())) {
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
 * The range and setter for every mappable parameter, keyed the same way the
 * bindings are. Plain and imperative rather than React state: it exists only
 * to be read the instant a CC arrives, which is no business of the render
 * cycle's.
 *
 * Filled once by `useMidiParameterRegistry`, from the state layer, and not by
 * the knobs and sliders themselves — see the note on `handleIncomingCc`.
 */
type RegisteredControl = {
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const registry = new Map<MidiMapId, RegisteredControl>();

/** Registers one parameter's range and setter; returns its cleanup. */
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
    // it — guards against a cleanup running after a re-registration has
    // already replaced the entry, which would otherwise leave the slot empty.
    if (registry.get(mapId) === entry) registry.delete(mapId);
  };
}

/**
 * What every incoming CC message does: bind it to whichever control is
 * currently learning, or — the ordinary case — apply it to whatever control
 * is already bound to that number, scaled onto that control's own range.
 *
 * What is bound is a *parameter*, not the widget that happens to draw it: the
 * registry is filled from the state layer once and stays filled, so a knob
 * mapped on the Filter tab keeps working from the Env tab, and one mapped on
 * channel 1 goes on driving channel 1 while channel 5 is the one being looked
 * at. A CC for a mapId nothing has registered — a binding saved before that
 * parameter existed, say — is a no-op.
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
