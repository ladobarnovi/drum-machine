"use client";

import RailGroup from "./RailGroup";
import RailSlider from "./RailSlider";
import { MAX_VOLUME, MIN_VOLUME, clampVolume } from "@/lib/sequencer";

type MasterVolumeControlsProps = {
  volume: number;
  onChange: (volume: number) => void;
};

/**
 * The output fader. Unlike the master stages in the other rail this gets no
 * bypass button and no box: there is no version of the mix with the volume
 * switched out, and pulling the slider to zero is already what silencing it
 * means.
 *
 * It runs to 150% like every other level here, so a quiet kit can be brought up
 * rather than only ever turned down.
 */
export default function MasterVolumeControls({
  volume,
  onChange,
}: MasterVolumeControlsProps) {
  return (
    <RailGroup title="Output">
      <RailSlider
        label="Volume"
        ariaLabel="Master volume"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={volume}
        readout={`${Math.round(volume * 100)}%`}
        onChange={(value) => onChange(clampVolume(value))}
      />
    </RailGroup>
  );
}
