"use client";

import {
  SAMPLE_MODES,
  SAMPLE_MODE_LABELS,
  SLICE_COUNTS,
  isSliced,
  type SampleMode,
  type SliceCount,
} from "@/lib/sequencer";

type SampleModeControlsProps = {
  /** Whether a hit plays the whole trimmed region or one slice of it. */
  mode: SampleMode;
  onModeChange: (mode: SampleMode) => void;
  /** How many parts the region is divided into while slicing. */
  sliceCount: SliceCount;
  onSliceCountChange: (sliceCount: SliceCount) => void;
  /** Whether the region between the trim handles is read back to front. */
  reversed: boolean;
  onReversedChange: (reversed: boolean) => void;
};

// Shared by the mode pair and the slice counts, and the same shape the
// Reverse button below already had: these are all toggles that stay lit
// while they are what the sample is set to.
const toggleClass = (isActive: boolean) =>
  `rounded border px-2 py-0.5 font-medium transition-colors ${
    isActive
      ? "border-accent bg-accent text-on-accent"
      : "border-edge hover:bg-raised"
  }`;

/**
 * What a hit is (one shot or sliced), how many parts it's cut into while
 * slicing, and which way through the file it's read.
 *
 * Its own row rather than folded into `Waveform`, so it can sit under the
 * Start/End/Gain/Pan/Pitch knobs instead of directly under the strip — these
 * three still shape what the strip is showing, but they read as settings for
 * the sample as a whole rather than as chrome on the waveform picture itself.
 */
export default function SampleModeControls({
  mode,
  onModeChange,
  sliceCount,
  onSliceCountChange,
  reversed,
  onReversedChange,
}: SampleModeControlsProps) {
  const slicing = isSliced(mode);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px]">
      {/*
        What a hit is: the whole region, or one part of it. First in the row
        because it decides whether the rest of the row means anything at all.
      */}
      <div className="flex gap-1.5">
        {SAMPLE_MODES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onModeChange(option)}
            aria-pressed={mode === option}
            className={toggleClass(mode === option)}
          >
            {SAMPLE_MODE_LABELS[option]}
          </button>
        ))}
      </div>

      {/* Only alongside the mode that has parts to count, rather than greyed
          out under a one shot where the number would decide nothing. */}
      {slicing && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted">Parts</span>

          {SLICE_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onSliceCountChange(count)}
              aria-pressed={sliceCount === count}
              aria-label={`${count} slices`}
              className={`w-7 ${toggleClass(sliceCount === count)}`}
            >
              {count}
            </button>
          ))}
        </div>
      )}

      {/* Pushed to the far edge: it applies to a hit whichever mode the
          sample is in — a slice is read back to front exactly as a whole
          one shot is — so it belongs beside the pair rather than within it. */}
      <button
        type="button"
        onClick={() => onReversedChange(!reversed)}
        aria-pressed={reversed}
        aria-label="Play sample in reverse"
        className={`ml-auto ${toggleClass(reversed)}`}
      >
        Reverse
      </button>
    </div>
  );
}
