"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import {
  formatFrequency,
  frequencyToSlider,
  isHighCutBypassed,
  isLowCutBypassed,
  sliderToFrequency,
  type MasterFilter,
} from "@/lib/sequencer";

type MasterFilterControlsProps = {
  filter: MasterFilter;
  onChange: (filter: MasterFilter) => void;
};

/**
 * Low and high cut on the whole mix, sitting after the drive stage: what these
 * filter is the saturated signal, harmonics and all.
 *
 * Same pair of cutoffs a channel has, so a sweep here reads the same way as one
 * on a single voice.
 */
export default function MasterFilterControls({
  filter,
  onChange,
}: MasterFilterControlsProps) {
  return (
    <MasterFxSection
      title="Filter"
      toggleLabel="Master filter"
      shortcut="Ctrl+F"
      enabled={filter.enabled}
      onToggle={() => onChange({ ...filter, enabled: !filter.enabled })}
    >
      {/* Cutoffs ride a 0..1 log scale, so the readout shows the real frequency. */}
      <RailSlider
        label="Low cut"
        ariaLabel="Master filter low cut"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(filter.lowCutHz)}
        readout={
          isLowCutBypassed(filter.lowCutHz)
            ? "Off"
            : formatFrequency(filter.lowCutHz)
        }
        onChange={(position) =>
          onChange({ ...filter, lowCutHz: sliderToFrequency(position) })
        }
      />

      <RailSlider
        label="High cut"
        ariaLabel="Master filter high cut"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(filter.highCutHz)}
        readout={
          isHighCutBypassed(filter.highCutHz)
            ? "Off"
            : formatFrequency(filter.highCutHz)
        }
        onChange={(position) =>
          onChange({ ...filter, highCutHz: sliderToFrequency(position) })
        }
      />
    </MasterFxSection>
  );
}
