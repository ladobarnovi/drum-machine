"use client";

import { MAX_STEPS, MIN_STEPS, clampLength } from "@/lib/sequencer";

type LengthControlProps = {
  length: number;
  onLengthChange: (length: number) => void;
};

export default function LengthControl({
  length,
  onLengthChange,
}: LengthControlProps) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs">
      Steps
      <input
        type="number"
        min={MIN_STEPS}
        max={MAX_STEPS}
        value={length}
        // Clamped on the way in: this value indexes the pattern directly.
        onChange={(event) =>
          onLengthChange(clampLength(Number(event.target.value)))
        }
        className="w-16 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
      />
    </label>
  );
}
