"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  clearMidiCcBinding,
  getMidiCcMapSnapshot,
  getMidiLearnSnapshot,
  getServerMidiCcMapSnapshot,
  getServerMidiLearnSnapshot,
  registerMidiControl,
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
 * Wires one control into the shared MIDI CC map: registers its live range and
 * setter so an incoming CC can reach it (see `lib/midiCcMap`), and reads back
 * whether it's mapped or currently the one being learned.
 *
 * Returns null while `mapId` is undefined, so a caller can pass the same hook
 * result straight through to a knob or slider whether or not this particular
 * instance is MIDI-mappable at all.
 */
export function useMidiLearnControl(
  mapId: string | undefined,
  min: number,
  max: number,
  onChange: (value: number) => void,
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

  // Read through a ref rather than depended on directly, so a caller passing
  // a fresh inline closure every render — which every one of these controls
  // does — doesn't re-register the control on every render along with it.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapId) return;
    return registerMidiControl(mapId, min, max, (value) =>
      onChangeRef.current(value),
    );
  }, [mapId, min, max]);

  if (!mapId) return null;

  return {
    cc: ccMap[mapId] ?? null,
    isLearning: learningMapId === mapId,
    startLearn: () => startMidiLearn(mapId),
    cancelLearn: stopMidiLearn,
    clearBinding: () => clearMidiCcBinding(mapId),
  };
}
