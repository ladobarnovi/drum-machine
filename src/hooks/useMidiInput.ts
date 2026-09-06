"use client";

import { useEffect } from "react";

import { useLatest } from "@/hooks/useLatest";
import { useRememberedDeviceId } from "@/hooks/useRememberedDeviceId";
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
  /** Called with the controller number and 0..127 value for each CC message. */
  onControlChange?: (controller: number, value: number) => void;
  /**
   * Called with the message's own timestamp for each incoming clock pulse —
   * `MIDIMessageEvent.timeStamp`, the same clock `performance.now()` reads,
   * rather than whatever moment this callback happens to run on, since
   * estimating a tempo from the gaps between pulses only works if the
   * timestamps are the ones the browser actually received the bytes at.
   */
  onClockTick?: (timestampMs: number) => void;
  /** Called on an incoming Start or Continue — this machine has no paused
   *  position to resume from, so both mean the same thing here: begin. */
  onTransportStart?: () => void;
  onTransportStop?: () => void;
};

/**
 * Listens for MIDI messages from a chosen input port: notes are mapped onto
 * the sixteen channels (see `lib/midi`) so a pad controller or a keyboard can
 * play the kit the way its own pads already do; control changes are handed
 * to `onControlChange` for whatever's mapped to them (see `lib/midiCcMap`);
 * and clock/transport bytes are handed to `onClockTick`/`onTransportStart`/
 * `onTransportStop` for following another device's tempo (see
 * `useMidiClockInput`). One physical device, one cable, all three at once —
 * a controller's pads, knobs and clock out already share it.
 */
export function useMidiInput({
  access,
  onNoteOn,
  onControlChange,
  onClockTick,
  onTransportStart,
  onTransportStop,
}: UseMidiInputOptions) {
  const { supported, inputs, inputPortsRef } = access;
  const [selectedInputId, selectInput] = useRememberedDeviceId(
    MIDI_INPUT_STORAGE_KEY,
    inputs,
    (id) => inputPortsRef.current.has(id),
  );
  // Read through refs so the port's handler below is bound once and still calls
  // the current callbacks; listing them as dependencies would rebind on every
  // render of the machine above.
  const onNoteOnRef = useLatest(onNoteOn);
  const onControlChangeRef = useLatest(onControlChange);
  const onClockTickRef = useLatest(onClockTick);
  const onTransportStartRef = useLatest(onTransportStart);
  const onTransportStopRef = useLatest(onTransportStop);

  // Attaches the listener to whichever port is selected, and only that one —
  // a controller left plugged in but not chosen stays silent.
  useEffect(() => {
    const input = selectedInputId
      ? inputPortsRef.current.get(selectedInputId)
      : null;
    if (!input) return;

    input.onmidimessage = (event) => {
      const message = parseMidiMessage(event.data);

      switch (message.type) {
        case "noteon": {
          const channelIndex = channelIndexForMidiNote(message.note);
          if (channelIndex === null) return;
          onNoteOnRef.current(
            channelIndex,
            midiVelocityToGain(message.velocity),
          );
          return;
        }
        case "cc":
          onControlChangeRef.current?.(message.controller, message.value);
          return;
        case "clock":
          onClockTickRef.current?.(event.timeStamp);
          return;
        case "start":
        case "continue":
          onTransportStartRef.current?.();
          return;
        case "stop":
          onTransportStopRef.current?.();
          return;
        default:
          return;
      }
    };

    return () => {
      input.onmidimessage = null;
    };
  }, [
    selectedInputId,
    inputs,
    inputPortsRef,
    onClockTickRef,
    onControlChangeRef,
    onNoteOnRef,
    onTransportStartRef,
    onTransportStopRef,
  ]);

  return { supported, inputs, selectedInputId, selectInput };
}
