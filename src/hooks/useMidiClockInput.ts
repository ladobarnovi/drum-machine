"use client";

import { useCallback, useRef, useState } from "react";

import {
  MIDI_CLOCK_ESTIMATE_WINDOW,
  estimateBpmFromPulseTimestamps,
} from "@/lib/midi";

/**
 * How long without a pulse before the estimate is dropped rather than left
 * showing a tempo nothing is actually sending any more.
 */
const SIGNAL_TIMEOUT_MS = 2000;

/**
 * How many incoming pulses pass between one published estimate and the next.
 * The window is recomputed on every pulse regardless — this only throttles
 * how often that recomputed value actually reaches a render, since a naive
 * publish-every-pulse would mean state updates at up to 48 a second, deep
 * into the range where they cost more than the number is worth updating.
 * Six is a quarter of a beat: still every fraction of a second at any normal
 * tempo, just not every single one of the 24 pulses that make it up.
 */
const PUBLISH_EVERY_N_PULSES = 6;

/**
 * Turns the clock pulses arriving from `useMidiInput` into a live tempo
 * estimate, for slaving this machine's own transport to another device's
 * (see `lib/midi` for the maths and `MidiControls` for where the estimate is
 * shown and switched to).
 *
 * Tracks pulses whenever they arrive, independent of whether external clock
 * is actually the machine's chosen tempo source right now — so the moment it
 * is switched on, there's already a recent estimate waiting rather than a
 * blank readout for the next quarter note.
 */
export function useMidiClockInput() {
  const [estimatedBpm, setEstimatedBpm] = useState<number | null>(null);

  const timestampsRef = useRef<number[]>([]);
  const pulseCountRef = useRef(0);
  const staleTimeoutRef = useRef<number | null>(null);

  const handleClockTick = useCallback((timestampMs: number) => {
    const buffer = timestampsRef.current;
    buffer.push(timestampMs);
    if (buffer.length > MIDI_CLOCK_ESTIMATE_WINDOW) buffer.shift();
    pulseCountRef.current += 1;

    // Restarts on every pulse, so the estimate only ever goes stale after a
    // real gap in the clock — a device unplugged or switched off mid-bar —
    // rather than on some fixed schedule that has nothing to do with whether
    // pulses are still arriving.
    if (staleTimeoutRef.current !== null) {
      window.clearTimeout(staleTimeoutRef.current);
    }
    staleTimeoutRef.current = window.setTimeout(() => {
      timestampsRef.current = [];
      setEstimatedBpm(null);
    }, SIGNAL_TIMEOUT_MS);

    if (pulseCountRef.current % PUBLISH_EVERY_N_PULSES !== 0) return;

    const estimate = estimateBpmFromPulseTimestamps(buffer);
    if (estimate !== null) setEstimatedBpm(Math.round(estimate));
  }, []);

  return { estimatedBpm, handleClockTick };
}
