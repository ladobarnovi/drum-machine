"use client";

import { useSyncExternalStore } from "react";

import {
  clearMidiCcBinding,
  getMidiCcMapSnapshot,
  getMidiLearnSnapshot,
  getServerMidiCcMapSnapshot,
  getServerMidiLearnSnapshot,
  startMidiLearn,
  stopMidiLearn,
  subscribeToMidiCcMap,
  subscribeToMidiLearn,
} from "@/lib/midiCcMap";

export type MidiLearnControl = {
  /** The CC number currently bound to this control, or null if unmapped. */
  cc: number | null;
  /** True while this is the control waiting for the next CC to bind to. */
  isLearning: boolean;
  /** Starts listening for the next incoming CC and binds it here. */
  startLearn: () => void;
  /** Stops listening, leaving whatever was already bound untouched. */
  cancelLearn: () => void;
  /** Drops this control's binding, if it has one. */
  clearBinding: () => void;
};

/**
 * Reads back what a control's MIDI binding currently is — which CC it answers
 * to, and whether it's the one waiting to learn the next one — and offers the
 * three gestures that change it.
 *
 * Only the binding, deliberately. What an incoming CC actually *does* is wired
 * up once in `useMidiParameterRegistry`, against the state rather than against
 * the widget, so that a mapping keeps working while this control is off screen
 * on a closed tab or belongs to a channel that isn't the selected one.
 *
 * Returns null while `mapId` is undefined, so a caller can pass the same hook
 * result straight through to a knob or slider whether or not this particular
 * instance is MIDI-mappable at all.
 */
export function useMidiLearnControl(
  mapId: string | undefined,
): MidiLearnControl | null {
  const ccMap = useSyncExternalStore(
    subscribeToMidiCcMap,
    getMidiCcMapSnapshot,
    getServerMidiCcMapSnapshot,
  );
  const learningMapId = useSyncExternalStore(
    subscribeToMidiLearn,
    getMidiLearnSnapshot,
    getServerMidiLearnSnapshot,
  );

  if (!mapId) return null;

  return {
    cc: ccMap[mapId] ?? null,
    isLearning: learningMapId === mapId,
    startLearn: () => startMidiLearn(mapId),
    cancelLearn: stopMidiLearn,
    clearBinding: () => clearMidiCcBinding(mapId),
  };
}
