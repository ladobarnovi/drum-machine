"use client";

import { MAX_STEPS, MIN_STEPS, clampLength } from "@/lib/sequencer";

type LengthControlProps = {
  length: number;
  onLengthChange: (length: number) => void;
};

/**
 * The free-entry half of the length row: any count the presets don't offer.
 * Unlabelled on screen because the heading above it already reads "Sequence
 * Length" — the aria-label carries that across for screen readers, where a
 * bare number field beside the presets would say nothing.
 */
export default function LengthControl({
  length,
  onLengthChange,
}: LengthControlProps) {
  return (
    <input
      type="number"
      min={MIN_STEPS}
      max={MAX_STEPS}
      value={length}
      aria-label="Sequence length in steps"
      // Clamped on the way in: this value indexes the pattern directly.
      onChange={(event) =>
        onLengthChange(clampLength(Number(event.target.value)))
      }
      className="border-edge bg-field w-16 rounded border px-2 py-1 text-xs"
    />
  );
}
