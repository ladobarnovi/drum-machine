"use client";

import { useState, type FocusEvent } from "react";

import type { LockableParameter, StepLocks } from "@/lib/sequencer";

/** The step the controls panel is editing. */
export type StepEditRef = {
  /** Which step is open, counted from 0. */
  index: number;
  /** Which of the parameters this step overrides. */
  locks: StepLocks;
  onClearLock: (key: LockableParameter) => void;
};

/** The step currently being heard, and what it plays as. */
export type PlayingStepRef<T> = {
  /** Which step is being heard, counted from 0. */
  index: number;
  /** The values as that step actually plays them, locks applied. */
  settings: T;
  /** Which of them it overrides, so those can be marked as locks. */
  locks: StepLocks;
};

/** What a knob needs to show a lock, and to offer clearing it. */
type LockProps = {
  locked?: boolean;
  onClearLock?: () => void;
};

type UsePlayheadFollowOptions<T> = {
  /** The channel's own values — what is shown when nothing is being followed. */
  settings: T;
  /** The hit being heard, or null when the transport is not running. */
  playing: PlayingStepRef<T> | null;
  /** Set while a step is open for editing, which takes precedence. */
  stepEdit?: StepEditRef;
};

/**
 * Whether a card of knobs shows the channel's values or the hit being heard.
 *
 * The Filter, Env and FX cards each had this written out, identically: the
 * `adjusting` flag, the blur handler that ignores focus moving within the card,
 * the `following`/`shown` pair, and `lockProps`.
 *
 * Two rules decide it. A step open for editing wins outright — the panel is
 * scoped to that step, and following the playhead would drag it somewhere
 * nobody asked for. And following pauses while a knob is being worked, so a
 * value being set does not jump out from under the hand setting it; focus
 * moving between knobs inside the same card does not count as letting go, which
 * is what the blur check is for.
 */
export function usePlayheadFollow<T>({
  settings,
  playing,
  stepEdit,
}: UsePlayheadFollowOptions<T>) {
  const [adjusting, setAdjusting] = useState(false);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setAdjusting(false);
  };

  const following = !stepEdit && !adjusting ? (playing ?? null) : null;

  const lockProps = (key: LockableParameter): LockProps => {
    if (following) return { locked: following.locks[key] !== undefined };

    return stepEdit
      ? {
          locked: stepEdit.locks[key] !== undefined,
          onClearLock: () => stepEdit.onClearLock(key),
        }
      : {};
  };

  return {
    /** The hit being followed, or null when the card shows its own values. */
    following,
    /** What the knobs read out: the followed hit's values, or the channel's. */
    shown: following ? following.settings : settings,
    lockProps,
    /** Spread onto the wrapper around the knobs. */
    groupProps: {
      onFocus: () => setAdjusting(true),
      onBlur: handleBlur,
    },
  };
}
