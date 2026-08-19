"use client";

import { useSyncExternalStore } from "react";

import {
  getMidiCcMapSnapshot,
  getMidiLearnSnapshot,
  getServerMidiCcMapSnapshot,
  getServerMidiLearnSnapshot,
  subscribeToMidiCcMap,
  subscribeToMidiLearn,
  type MidiCcMap,
  type MidiMapId,
} from "@/lib/midiCcMap";

export type MidiCcBindings = {
  /** Every mapped control, keyed by map id. */
  map: MidiCcMap;
  /** The control waiting to be bound to the next CC, or null if none is. */
  learningMapId: MidiMapId | null;
};

/**
 * The whole CC map at once, for the mappings list — where
 * `useMidiLearnControl` reads back a single control's binding for the widget
 * that draws it.
 *
 * The same two stores either way, subscribed to from the other end: a panel
 * that has to show every binding there is cannot be built out of one hook per
 * control, since which controls exist is exactly what it is trying to say.
 */
export function useMidiCcBindings(): MidiCcBindings {
  const map = useSyncExternalStore(
    subscribeToMidiCcMap,
    getMidiCcMapSnapshot,
    getServerMidiCcMapSnapshot,
  );
  const learningMapId = useSyncExternalStore(
    subscribeToMidiLearn,
    getMidiLearnSnapshot,
    getServerMidiLearnSnapshot,
  );

  return { map, learningMapId };
}
