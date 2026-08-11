"use client";

import StepBeat from "./StepBeat";
import { STEPS_PER_BEAT, type Step, type SwipeTarget } from "@/lib/sequencer";

type StepGridProps = {
  channelLabel: string;
  /** Full MAX_STEPS-long pattern; only the first `length` steps are shown. */
  steps: Step[];
  /** The channel's own pitch, which a step plays at unless it locks its own. */
  channelPitch: number;
  /** How many slices a step chooses between, or null on a one-shot channel. */
  sliceCount: number | null;
  /** Which parameter a vertical swipe on the grid is currently writing. */
  swipeTarget: SwipeTarget;
  length: number;
  currentStep: number | null;
  /** The step the controls panel is editing, or null while none is open. */
  editingStep: number | null;
  onStepClick: (stepIndex: number) => void;
  onStepHold: (stepIndex: number) => void;
  onStepVelocityChange: (stepIndex: number, velocity: number) => void;
  onStepPitchChange: (stepIndex: number, semitones: number) => void;
  onStepSliceChange: (stepIndex: number, slice: number) => void;
  onStepContextMenu: (stepIndex: number, x: number, y: number) => void;
};

/**
 * The selected channel's pattern, laid out as beats of STEPS_PER_BEAT.
 *
 * Beats flow in a responsive grid — 2 per row on mobile and 4 from `sm` up —
 * so a row holds 8 steps on small screens and 16 on wider ones. Equal-width
 * grid columns keep every step aligned regardless of the channel length.
 */
export default function StepGrid({
  channelLabel,
  steps,
  channelPitch,
  sliceCount,
  swipeTarget,
  length,
  currentStep,
  editingStep,
  onStepClick,
  onStepHold,
  onStepVelocityChange,
  onStepPitchChange,
  onStepSliceChange,
  onStepContextMenu,
}: StepGridProps) {
  const visible = steps.slice(0, length);
  const beatCount = Math.ceil(visible.length / STEPS_PER_BEAT);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: beatCount }, (_, beat) => {
          const offset = beat * STEPS_PER_BEAT;
          return (
            <StepBeat
              key={offset}
              channelLabel={channelLabel}
              steps={visible.slice(offset, offset + STEPS_PER_BEAT)}
              channelPitch={channelPitch}
              sliceCount={sliceCount}
              swipeTarget={swipeTarget}
              offset={offset}
              currentStep={currentStep}
              editingStep={editingStep}
              onStepClick={onStepClick}
              onStepHold={onStepHold}
              onStepVelocityChange={onStepVelocityChange}
              onStepPitchChange={onStepPitchChange}
              onStepSliceChange={onStepSliceChange}
              onStepContextMenu={onStepContextMenu}
            />
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        Press and hold to enter step edit mode for parameter locking
      </p>
    </>
  );
}
