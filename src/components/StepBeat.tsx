"use client";

import StepButton from "./StepButton";
import { STEPS_PER_BEAT, isDownbeat } from "@/lib/sequencer";

type StepBeatProps = {
  channelLabel: string;
  /** Steps in this beat, at most STEPS_PER_BEAT of them. */
  steps: boolean[];
  /** Index of this beat's first step within the whole pattern. */
  offset: number;
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
};

/**
 * One beat: up to STEPS_PER_BEAT steps. A partial beat (when the channel length
 * isn't a multiple of the beat) is padded with empty slots so every button keeps
 * the same width.
 */
export default function StepBeat({
  channelLabel,
  steps,
  offset,
  currentStep,
  onToggleStep,
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
            active={steps[slot]}
            isCurrent={currentStep === stepIndex}
            isDownbeat={isDownbeat(stepIndex)}
            label={`Channel ${channelLabel} step ${stepIndex + 1}`}
            onToggle={() => onToggleStep(stepIndex)}
          />
        );
      })}
    </div>
  );
}
