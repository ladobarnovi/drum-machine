"use client";

import { memo } from "react";

import StepButton from "./StepButton";
import {
  STEPS_PER_BEAT,
  isDownbeat,
  type Step,
  type SwipeTarget,
} from "@/lib/sequencer";

type StepBeatProps = {
  channelLabel: string;
  /**
   * The channel's whole pattern. Handed down entire rather than sliced by the
   * grid, so this prop keeps its identity between renders and the memo below
   * has something stable to compare.
   */
  steps: Step[];
  /** How many of this beat's slots are inside the channel's length. */
  stepCount: number;
  /** The channel's own pitch, which a step plays at unless it locks its own. */
  channelPitch: number;
  /** How many slices a step chooses between, or null on a one-shot channel. */
  sliceCount: number | null;
  /** Which parameter a vertical swipe on the grid is currently writing. */
  swipeTarget: SwipeTarget;
  /** Index of this beat's first step within the whole pattern. */
  offset: number;
  /** The playhead, but only while it is inside this beat. Null otherwise. */
  currentStep: number | null;
  /**
   * The step the controls panel is editing, again only while it is one of
   * this beat's. Null otherwise.
   */
  editingStep: number | null;
  onStepClick: (stepIndex: number) => void;
  onStepHold: (stepIndex: number) => void;
  onStepVelocityChange: (stepIndex: number, velocity: number) => void;
  onStepPitchChange: (stepIndex: number, semitones: number) => void;
  onStepSliceChange: (stepIndex: number, slice: number) => void;
  onStepContextMenu: (stepIndex: number, x: number, y: number) => void;
};

/**
 * One beat: up to STEPS_PER_BEAT steps. A partial beat (when the channel length
 * isn't a multiple of the beat) is padded with empty slots so every button keeps
 * the same width.
 */
function StepBeat({
  channelLabel,
  steps,
  stepCount,
  channelPitch,
  sliceCount,
  swipeTarget,
  offset,
  currentStep,
  editingStep,
  onStepClick,
  onStepHold,
  onStepVelocityChange,
  onStepPitchChange,
  onStepSliceChange,
  onStepContextMenu,
}: StepBeatProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: STEPS_PER_BEAT }, (_, slot) => {
        if (slot >= stepCount) {
          return <div key={slot} aria-hidden className="flex-1" />;
        }

        const stepIndex = offset + slot;
        return (
          <StepButton
            key={slot}
            step={steps[stepIndex]}
            channelPitch={channelPitch}
            sliceCount={sliceCount}
            swipeTarget={swipeTarget}
            isCurrent={currentStep === stepIndex}
            isDownbeat={isDownbeat(stepIndex)}
            isEditing={editingStep === stepIndex}
            label={`Channel ${channelLabel} step ${stepIndex + 1}`}
            stepIndex={stepIndex}
            onClick={onStepClick}
            onHold={onStepHold}
            onVelocityChange={onStepVelocityChange}
            onPitchChange={onStepPitchChange}
            onSliceChange={onStepSliceChange}
            onContextMenu={onStepContextMenu}
          />
        );
      })}
    </div>
  );
}

/**
 * Memoised alongside the buttons it holds: the grid re-renders on every step of
 * the transport, and only the beat containing the playhead has anything new to
 * show.
 */
export default memo(StepBeat);
