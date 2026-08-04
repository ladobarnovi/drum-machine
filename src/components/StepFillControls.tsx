"use client";

import {
  STEP_FILLS,
  hasActiveSteps,
  matchesStepFill,
  type StepFill,
} from "@/lib/sequencer";

type StepFillControlsProps = {
  /** Full MAX_STEPS-long pattern; only the first `length` steps are written. */
  steps: boolean[];
  length: number;
  onApplyFill: (fill: StepFill) => void;
  onClear: () => void;
};

/**
 * One-click rhythms for the grid below.
 *
 * Each button overwrites the steps the channel plays, and stays lit while the
 * pattern is still exactly what it wrote, so the row doubles as a readout of
 * what is programmed. Clear is what makes a fill reversible: without it,
 * undoing a busy one would mean switching off every step by hand.
 */
export default function StepFillControls({
  steps,
  length,
  onApplyFill,
  onClear,
}: StepFillControlsProps) {
  // An empty pattern is deliberately never a match: on a channel too short to
  // reach a fill's first hit, writing it changes nothing, and lighting the
  // button up would claim a rhythm that isn't there.
  const hasHits = hasActiveSteps(steps, length);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold">Fill</h2>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasHits}
          className="rounded border border-neutral-300 px-2 py-0.5 text-[10px] leading-4 font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEP_FILLS.map((fill) => {
          const isActive = hasHits && matchesStepFill(steps, length, fill);

          return (
            <button
              key={fill.id}
              type="button"
              onClick={() => onApplyFill(fill)}
              aria-pressed={isActive}
              className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              }`}
            >
              {fill.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
