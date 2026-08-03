"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { secondsPerStep } from "@/lib/sequencer";

/** How often the scheduler wakes up to look for notes to queue. */
const SCHEDULER_INTERVAL_MS = 25;
/** How far ahead of the audio clock notes are queued. */
const SCHEDULE_AHEAD_TIME_S = 0.1;
/** Small offset so the first step isn't scheduled in the past. */
const START_DELAY_S = 0.05;

type UseSequencerOptions = {
  bpm: number;
  ensureContext: () => AudioContext;
  /** Called for each tick as it is queued, with its exact audio-clock time. */
  onStep: (tick: number, time: number) => void;
};

/**
 * Transport for the step grid.
 *
 * Uses the standard Web Audio lookahead pattern: a coarse timer queues notes
 * slightly ahead against the sample-accurate audio clock, so playback doesn't
 * drift the way `setInterval`-driven playback would. BPM and the step callback
 * are read through refs so edits apply mid-playback without restarting.
 *
 * Counts an absolute tick rather than a wrapped step index: channels each have
 * their own length, so every channel wraps this tick by its own cycle.
 */
export function useSequencer({
  bpm,
  ensureContext,
  onStep,
}: UseSequencerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState<number | null>(null);

  const bpmRef = useRef(bpm);
  const onStepRef = useRef(onStep);
  const nextTickRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const schedulerTimeoutRef = useRef<number | null>(null);
  const visualTimeoutsRef = useRef(new Set<number>());

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const clearTimers = useCallback(() => {
    if (schedulerTimeoutRef.current !== null) {
      window.clearTimeout(schedulerTimeoutRef.current);
      schedulerTimeoutRef.current = null;
    }
    for (const id of visualTimeoutsRef.current) {
      window.clearTimeout(id);
    }
    visualTimeoutsRef.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTick(null);
    clearTimers();
  }, [clearTimers]);

  const play = useCallback(() => {
    const context = ensureContext();
    if (context.state === "suspended") {
      void context.resume();
    }

    nextTickRef.current = 0;
    nextNoteTimeRef.current = context.currentTime + START_DELAY_S;
    setIsPlaying(true);

    const pump = () => {
      while (
        nextNoteTimeRef.current <
        context.currentTime + SCHEDULE_AHEAD_TIME_S
      ) {
        const tick = nextTickRef.current;
        const time = nextNoteTimeRef.current;

        onStepRef.current(tick, time);

        // Move the playhead highlight when the step is actually audible.
        const delayMs = Math.max(0, (time - context.currentTime) * 1000);
        const timeoutId = window.setTimeout(() => {
          visualTimeoutsRef.current.delete(timeoutId);
          setCurrentTick(tick);
        }, delayMs);
        visualTimeoutsRef.current.add(timeoutId);

        nextNoteTimeRef.current += secondsPerStep(bpmRef.current);
        nextTickRef.current = tick + 1;
      }

      schedulerTimeoutRef.current = window.setTimeout(
        pump,
        SCHEDULER_INTERVAL_MS,
      );
    };

    pump();
  }, [ensureContext]);

  return { isPlaying, currentTick, play, stop };
}
