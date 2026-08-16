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

// The slice-count buttons: each individually bordered rather than merged
// into one control, since "how many parts" is a short list of values rather
// than a pair of opposite states with nothing in between.
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
 * Centred and set off by a top rule, the same footer treatment
 * `ChannelFilterSection` gives its dB/oct row under its own knob grid.
 *
 * One shot and Slicer share a single border rather than each carrying their
 * own — the same segmented shape `RailTabs` gives its strip — so the pair
 * reads as one control offering two states rather than two buttons that
 * happen to be adjacent. Reverse is a different kind of thing: not a third
 * state alongside them but an independent flag that applies whichever of the
 * two is chosen, which is why it takes the shape of a switch instead of a
 * matching button, set apart by a rule rather than sitting flush against the
 * pair.
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
    <div className="border-line flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t pt-3 text-[10px]">
      {/*
        What a hit is: the whole region, or one part of it. `radiogroup`
        rather than `aria-pressed` buttons, because the two are mutually
        exclusive settings rather than independent toggles — exactly one of
        them is always true, which a screen reader should hear the same way
        it hears any other single choice from a short list.
      */}
      <div
        role="radiogroup"
        aria-label="Sample mode"
        className="border-line flex gap-1 rounded-md border p-1"
      >
        {SAMPLE_MODES.map((option) => {
          const isActive = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onModeChange(option)}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                isActive
                  ? "bg-accent text-on-accent"
                  : "text-muted hover:bg-raised"
              }`}
            >
              {SAMPLE_MODE_LABELS[option]}
            </button>
          );
        })}
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

      {/* The rule that says Reverse is not a third segment of the group
          beside it, whatever the mode happens to be. */}
      <span aria-hidden className="bg-edge h-4 w-px" />

      <label className="flex items-center gap-1.5">
        <span className="text-muted">Reverse</span>

        {/* A switch rather than a button matching the pair's own shape: a
            direction is not a state chosen from a list, it's a flag that's
            either set or not, and the track-and-thumb shape says that at a
            glance without needing to be read. */}
        <span
          role="switch"
          tabIndex={0}
          aria-checked={reversed}
          aria-label="Play sample in reverse"
          onClick={() => onReversedChange(!reversed)}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            // Only for the keys handled above, so nothing else on the page
            // is swallowed — the same rule the knob and the trim handles
            // follow for their own key handlers.
            event.preventDefault();
            onReversedChange(!reversed);
          }}
          className={`relative h-4 w-7 shrink-0 cursor-pointer rounded-full border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            reversed ? "border-accent bg-accent" : "border-edge bg-field"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-0.5 size-2.5 rounded-full transition-transform ${
              reversed
                ? "bg-on-accent translate-x-3.5"
                : "bg-fg translate-x-0.5"
            }`}
          />
        </span>
      </label>
    </div>
  );
}
