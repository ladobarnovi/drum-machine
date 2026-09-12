"use client";

import ChoiceSelect from "@/components/channel/ChoiceSelect";
import Switch from "@/components/ui/Switch";
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

/**
 * What a hit is (one shot or sliced), how many parts it's cut into while
 * slicing, and which way through the file it's read.
 *
 * Mode and Parts are lists rather than segmented buttons, like every other
 * discrete setting on a channel: the label sits over its list, the two line up
 * as one band at the head of the column, and neither has to shrink its wording
 * to fit inside a button. Reverse is a different kind of thing — not a third
 * value alongside them but a flag that applies whichever of the two is chosen —
 * which is why it keeps the shape of a switch.
 */
export default function SampleModeControls({
  mode,
  onModeChange,
  sliceCount,
  onSliceCountChange,
  reversed,
  onReversedChange,
}: SampleModeControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <ChoiceSelect
          label="Mode"
          ariaLabel="Sample mode"
          value={mode}
          options={SAMPLE_MODES.map((option) => ({
            value: option,
            label: SAMPLE_MODE_LABELS[option],
          }))}
          onSelect={(value) => onModeChange(value as SampleMode)}
        />

        {/* Only alongside the mode that has parts to count, rather than greyed
            out under a one shot where the number would decide nothing. */}
        {isSliced(mode) && (
          <ChoiceSelect
            label="Parts"
            ariaLabel="Slice count"
            value={String(sliceCount)}
            options={SLICE_COUNTS.map((count) => ({
              value: String(count),
              label: String(count),
            }))}
            onSelect={(value) =>
              onSliceCountChange(Number(value) as SliceCount)
            }
          />
        )}
      </div>

      <label className="flex items-center justify-between gap-2">
        <span className="text-muted text-[10px] tracking-[0.11em] uppercase">
          Reverse
        </span>

        <Switch
          checked={reversed}
          label="Play sample in reverse"
          onChange={onReversedChange}
        />
      </label>
    </div>
  );
}
