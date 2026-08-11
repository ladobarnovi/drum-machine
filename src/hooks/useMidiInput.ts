"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MidiAccess } from "@/hooks/useMidiAccess";
import {
  MIDI_INPUT_STORAGE_KEY,
  channelIndexForMidiNote,
  midiVelocityToGain,
  parseMidiMessage,
} from "@/lib/midi";

export type MidiInputDevice = { id: string; name: string };

type UseMidiInputOptions = {
  /** Shared with `useMidiClockOutput` rather than requested again here. */
  access: MidiAccess;
  /** Called with the channel index and a 0..1 velocity gain for each note played. */
  onNoteOn: (channelIndex: number, velocityGain: number) => void;
};

/**
 * Listens for MIDI note-on messages from a chosen input port and maps them
 * onto the sixteen channels (see `lib/midi`), so a pad controller or a
 * keyboard can play the kit the way its own pads already do.
 */
export function useMidiInput({ access, onNoteOn }: UseMidiInputOptions) {
  const { supported, inputs, inputPortsRef } = access;
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const onNoteOnRef = useRef(onNoteOn);
  useEffect(() => {
    onNoteOnRef.current = onNoteOn;
  }, [onNoteOn]);

  // Restores a previous session's choice once there is something to restore
  // it onto — a saved id with no matching port is left unselected rather than
  // picked up silently the moment a same-named device is plugged back in.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || inputs.length === 0) return;
    restoredRef.current = true;

    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem(MIDI_INPUT_STORAGE_KEY);
    } catch {
      // Some privacy modes refuse storage outright; nothing to restore.
    }
    if (!savedId || !inputPortsRef.current.has(savedId)) return;

    // Deferred to a microtask rather than set synchronously here: this is a
    // reaction to the port list having just arrived, not a value derivable
    // from props on the spot, and queuing it is what keeps the effect itself
    // from also being the render that consumes its own update.
    const id = savedId;
    queueMicrotask(() => setSelectedInputId(id));
  }, [inputs, inputPortsRef]);

  // Attaches the listener to whichever port is selected, and only that one —
  // a controller left plugged in but not chosen stays silent.
  useEffect(() => {
    const input = selectedInputId
      ? inputPortsRef.current.get(selectedInputId)
      : null;
    if (!input) return;

    input.onmidimessage = (event) => {
      const message = parseMidiMessage(event.data);
      if (message.type !== "noteon") return;

      const channelIndex = channelIndexForMidiNote(message.note);
      if (channelIndex === null) return;

      onNoteOnRef.current(channelIndex, midiVelocityToGain(message.velocity));
    };

    return () => {
      input.onmidimessage = null;
    };
  }, [selectedInputId, inputs, inputPortsRef]);

  const selectInput = useCallback((id: string | null) => {
    setSelectedInputId(id);
    try {
      if (id) localStorage.setItem(MIDI_INPUT_STORAGE_KEY, id);
      else localStorage.removeItem(MIDI_INPUT_STORAGE_KEY);
    } catch {
      // Still selected for this visit; it just won't be waiting next time.
    }
  }, []);

  return { supported, inputs, selectedInputId, selectInput };
}
