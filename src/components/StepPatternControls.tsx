"use client";

import LengthControl from "./LengthControl";
import {
  STEP_FILLS,
  hasActiveSteps,
  matchesStepFill,
  type StepFill,
} from "@/lib/sequencer";

type StepPatternControlsProps = {
  /** Full MAX_STEPS-long pattern; only the first `length` steps are written. */
  steps: boolean[];
  length: number;
  onApplyFill: (fill: StepFill) => void;
  /** Steps to slide the pattern by: positive later, negative earlier. */
  onNudge: (offset: number) => void;
  onClear: () => void;
  onLengthChange: (length: number) => void;
};

/**
 * Writes the grid below without clicking through it, in two rows: the fills
 * put a rhythm there, and the nudges move whatever is there against the beat.
 *
 * The step count sits in the header rather than up with the sample, because
 * it is the one control every button here answers to: it decides how far a
 * fill is written and how far a nudge wraps.
 *
 * A fill button stays lit while the pattern is still exactly what it wrote, so
 * the row doubles as a readout of what is programmed — and nudging a fill off
 * the beat drops the light, which is the honest answer once the rhythm has
 * been moved. Clear is what makes a fill reversible: without it, undoing a
 * busy one would mean switching off every step by hand.
 */
export default function StepPatternControls({
  steps,
  length,
  onApplyFill,
  onNudge,
  onClear,
  onLengthChange,
}: StepPatternControlsProps) {
  // An empty pattern is deliberately never a match: on a channel too short to
  // reach a fill's first hit, writing it changes nothing, and lighting the
  // button up would claim a rhythm that isn't there. Nothing to nudge or
  // clear either, so the same test disables both.
  const hasHits = hasActiveSteps(steps, length);

  const actionClass =
    "rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <section className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-semibold">Pattern</h2>

          <LengthControl length={length} onLengthChange={onLengthChange} />
        </div>

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

      {/* Earlier before later, so the pair reads left to right the way the
          pattern moves. The signs alone are ambiguous read aloud, hence the
          spelt-out labels. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNudge(-1)}
          disabled={!hasHits}
          aria-label="Nudge pattern one step earlier"
          className={actionClass}
        >
          Nudge −
        </button>

        <button
          type="button"
          onClick={() => onNudge(1)}
          disabled={!hasHits}
          aria-label="Nudge pattern one step later"
          className={actionClass}
        >
          Nudge +
        </button>
      </div>
    </section>
  );
}
