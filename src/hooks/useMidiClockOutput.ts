"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MidiAccess } from "@/hooks/useMidiAccess";
import {
  MIDI_CLOCK,
  MIDI_OUTPUT_STORAGE_KEY,
  MIDI_START,
  MIDI_STOP,
  secondsPerMidiClockPulse,
} from "@/lib/midi";

export type MidiOutputDevice = { id: string; name: string };

/** How far ahead pulses are queued, matching the audio scheduler's own lookahead. */
const SCHEDULE_AHEAD_TIME_S = 0.1;
/** How often the scheduler wakes up to look for pulses to queue. */
const SCHEDULER_INTERVAL_MS = 25;

type UseMidiClockOutputOptions = {
  /** Shared with `useMidiInput` rather than requested again here. */
  access: MidiAccess;
  isPlaying: boolean;
  bpm: number;
  ensureContext: () => AudioContext;
};

/**
 * Sends MIDI clock (24 pulses per quarter note) and Start/Stop to a chosen
 * output port, so external gear can follow this machine's tempo and
 * transport the way a slaved device follows a master clock.
 */
export function useMidiClockOutput({
  access,
  isPlaying,
  bpm,
  ensureContext,
}: UseMidiClockOutputOptions) {
  const { supported, outputs, outputPortsRef } = access;
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);

  const selectedPortRef = useRef<MIDIOutput | null>(null);
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Restores a previous session's choice once there is something to restore
  // it onto, exactly as `useMidiInput` does for its own selection.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || outputs.length === 0) return;
    restoredRef.current = true;

    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem(MIDI_OUTPUT_STORAGE_KEY);
    } catch {
      // Some privacy modes refuse storage outright; nothing to restore.
    }
    if (!savedId || !outputPortsRef.current.has(savedId)) return;

    // Deferred to a microtask rather than set synchronously here: this is a
    // reaction to the port list having just arrived, not a value derivable
    // from props on the spot, and queuing it is what keeps the effect itself
    // from also being the render that consumes its own update.
    const id = savedId;
    queueMicrotask(() => setSelectedOutputId(id));
  }, [outputs, outputPortsRef]);

  useEffect(() => {
    selectedPortRef.current = selectedOutputId
      ? (outputPortsRef.current.get(selectedOutputId) ?? null)
      : null;
  }, [selectedOutputId, outputs, outputPortsRef]);

  const selectOutput = useCallback(
    (id: string | null) => {
      setSelectedOutputId(id);
      try {
        if (id) localStorage.setItem(MIDI_OUTPUT_STORAGE_KEY, id);
        else localStorage.removeItem(MIDI_OUTPUT_STORAGE_KEY);
      } catch {
        // Still selected for this visit; it just won't be waiting next time.
      }

      // Lets a device chosen mid-playback join in right away, rather than
      // silently receiving clock with no Start ever having told it to listen.
      if (isPlaying && id) {
        outputPortsRef.current.get(id)?.send([MIDI_START]);
      }
    },
    [isPlaying, outputPortsRef],
  );

  // The steady 24-pulses-per-quarter-note train, on its own lookahead loop
  // rather than piggybacked on the step sequencer's: that one follows swing,
  // and MIDI clock exists to broadcast tempo, so a pulse train that followed
  // the swung grid would hand a slaved device an uneven "tempo" that was
  // never dialled in. The lookahead itself mirrors the audio scheduler's own
  // for the same reason it's there at all: queuing slightly ahead of the
  // audio clock is what keeps plain `setInterval` drift from being the thing
  // a slaved device hears as it slowly falls out of time.
  useEffect(() => {
    if (!isPlaying) return;

    const context = ensureContext();
    let nextPulseTime = context.currentTime;
    let cancelled = false;
    let timeoutId: number;

    const pump = () => {
      if (cancelled) return;

      while (nextPulseTime < context.currentTime + SCHEDULE_AHEAD_TIME_S) {
        const port = selectedPortRef.current;
        if (port) {
          // Audio-context time and a `setTimeout` delay are different
          // clocks, but the *gap* between "now" on one and a future point on
          // the other is the same real interval on both — which is what
          // turns a scheduled pulse into a wall-clock delay here.
          const delayMs = Math.max(
            0,
            (nextPulseTime - context.currentTime) * 1000,
          );
          window.setTimeout(() => port.send([MIDI_CLOCK]), delayMs);
        }
        nextPulseTime += secondsPerMidiClockPulse(bpmRef.current);
      }

      timeoutId = window.setTimeout(pump, SCHEDULER_INTERVAL_MS);
    };

    pump();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isPlaying, ensureContext]);

  // Start and Stop are single real-time bytes with nothing to queue ahead of
  // time, so this just fires the instant the transport flips rather than
  // going through the lookahead loop above.
  useEffect(() => {
    selectedPortRef.current?.send([isPlaying ? MIDI_START : MIDI_STOP]);
  }, [isPlaying]);

  return { supported, outputs, selectedOutputId, selectOutput };
}
