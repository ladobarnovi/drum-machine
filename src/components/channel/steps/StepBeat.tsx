"use client";

import StepButton from "./StepButton";
import {
  STEPS_PER_BEAT,
  isDownbeat,
  type Step,
  type SwipeTarget,
} from "@/lib/sequencer";

type StepBeatProps = {
  channelLabel: string;
  /** Steps in this beat, at most STEPS_PER_BEAT of them. */
  steps: Step[];
  /** The channel's own pitch, which a step plays at unless it locks its own. */
  channelPitch: number;
  /** Which parameter a vertical swipe on the grid is currently writing. */
  swipeTarget: SwipeTarget;
  /** Index of this beat's first step within the whole pattern. */
  offset: number;
  currentStep: number | null;
  /** The step the controls panel is editing, or null while none is open. */
  editingStep: number | null;
  onStepClick: (stepIndex: number) => void;
  onStepHold: (stepIndex: number) => void;
  onStepVelocityChange: (stepIndex: number, velocity: number) => void;
  onStepPitchChange: (stepIndex: number, semitones: number) => void;
};

/**
 * One beat: up to STEPS_PER_BEAT steps. A partial beat (when the channel length
 * isn't a multiple of the beat) is padded with empty slots so every button keeps
 * the same width.
 */
export default function StepBeat({
  channelLabel,
  steps,
  channelPitch,
  swipeTarget,
  offset,
  currentStep,
  editingStep,
  onStepClick,
  onStepHold,
  onStepVelocityChange,
  onStepPitchChange,
}: StepBeatProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: STEPS_PER_BEAT }, (_, slot) => {
        if (slot >= steps.length) {
          return <div key={slot} aria-hidden className="flex-1" />;
        }

        const stepIndex = offset + slot;
        return (
          <StepButton
            key={slot}
            step={steps[slot]}
            channelPitch={channelPitch}
            swipeTarget={swipeTarget}
            isCurrent={currentStep === stepIndex}
            isDownbeat={isDownbeat(stepIndex)}
            isEditing={editingStep === stepIndex}
            label={`Channel ${channelLabel} step ${stepIndex + 1}`}
            onClick={() => onStepClick(stepIndex)}
            onHold={() => onStepHold(stepIndex)}
            onVelocityChange={(velocity) =>
              onStepVelocityChange(stepIndex, velocity)
            }
            onPitchChange={(semitones) =>
              onStepPitchChange(stepIndex, semitones)
            }
          />
        );
      })}
    </div>
  );
}
