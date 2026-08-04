"use client";

import StepBeat from "./StepBeat";
import { STEPS_PER_BEAT } from "@/lib/sequencer";

type StepGridProps = {
  channelLabel: string;
  /** Full MAX_STEPS-long pattern; only the first `length` steps are shown. */
  steps: boolean[];
  length: number;
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
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
  length,
  currentStep,
  onToggleStep,
}: StepGridProps) {
  const visible = steps.slice(0, length);
  const beatCount = Math.ceil(visible.length / STEPS_PER_BEAT);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: beatCount }, (_, beat) => {
        const offset = beat * STEPS_PER_BEAT;
        return (
          <StepBeat
            key={offset}
            channelLabel={channelLabel}
            steps={visible.slice(offset, offset + STEPS_PER_BEAT)}
            offset={offset}
            currentStep={currentStep}
            onToggleStep={onToggleStep}
          />
        );
      })}
    </div>
  );
}
