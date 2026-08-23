"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import { MAX_VOLUME, MIN_VOLUME, clampVolume } from "@/lib/sequencer";

type MasterVolumeControlsProps = {
  volume: number;
  onChange: (volume: number) => void;
};

/**
 * The output fader, at the foot of the Master FX tab: it is the last thing the
 * mix passes through, so it sits under the stages that shaped it, boxed like
 * them — the chain reads as one series of stages, and a bare slider under three
 * bordered ones would look like something that had fallen out of the tab.
 *
 * The one thing it does without is the bypass button: there is no version of
 * the mix with the volume switched out, and pulling the slider to zero is
 * already what silencing it means.
 *
 * It runs to 150% like every other level here, so a quiet kit can be brought up
 * rather than only ever turned down.
 */
export default function MasterVolumeControls({
  volume,
  onChange,
}: MasterVolumeControlsProps) {
  return (
    <MasterFxSection title="Output">
      <RailSlider
        label="Volume"
        ariaLabel="Master volume"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={volume}
        readout={`${Math.round(volume * 100)}%`}
        onChange={(value) => onChange(clampVolume(value))}
        midiMapId="master:volume"
      />
    </MasterFxSection>
  );
}
