"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "./RailSlider";
import {
  MAX_REVERB_DECAY_SECONDS,
  MAX_VOLUME,
  MIN_REVERB_DECAY_SECONDS,
  MIN_VOLUME,
  clampReverbDecay,
  clampVolume,
  formatFrequency,
  formatSeconds,
  frequencyToSlider,
  isHighCutBypassed,
  sliderToFrequency,
  type MasterReverb,
} from "@/lib/sequencer";

type MasterReverbControlsProps = {
  reverb: MasterReverb;
  onChange: (reverb: MasterReverb) => void;
};

/**
 * The reverb bus, fed by the channel sends exactly as the delay is.
 *
 * Tone is a lowpass on the tail rather than on the way in, which is what lets a
 * long reverb sit behind a kit: the space stays audible while the hats stop
 * smearing across it.
 */
export default function MasterReverbControls({
  reverb,
  onChange,
}: MasterReverbControlsProps) {
  return (
    <MasterFxSection
      title="Reverb"
      toggleLabel="Master reverb"
      enabled={reverb.enabled}
      onToggle={() => onChange({ ...reverb, enabled: !reverb.enabled })}
    >
      <RailSlider
        label="Decay"
        ariaLabel="Master reverb decay"
        min={MIN_REVERB_DECAY_SECONDS}
        max={MAX_REVERB_DECAY_SECONDS}
        step={0.1}
        value={reverb.decaySeconds}
        readout={formatSeconds(reverb.decaySeconds)}
        onChange={(value) =>
          onChange({ ...reverb, decaySeconds: clampReverbDecay(value) })
        }
      />

      {/* Shares the cutoff scale the filters use, so the readout is a real Hz. */}
      <RailSlider
        label="Tone"
        ariaLabel="Master reverb tone"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(reverb.toneHz)}
        readout={
          isHighCutBypassed(reverb.toneHz)
            ? "Open"
            : formatFrequency(reverb.toneHz)
        }
        onChange={(position) =>
          onChange({ ...reverb, toneHz: sliderToFrequency(position) })
        }
      />

      <RailSlider
        label="Level"
        ariaLabel="Master reverb level"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={reverb.level}
        readout={`${Math.round(reverb.level * 100)}%`}
        onChange={(value) => onChange({ ...reverb, level: clampVolume(value) })}
      />
    </MasterFxSection>
  );
}
