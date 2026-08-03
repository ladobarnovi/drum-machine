"use client";

import ControlSlider from "./ControlSlider";
import {
  MAX_PITCH,
  MAX_VOLUME,
  MIN_PITCH,
  MIN_VOLUME,
  clampPitch,
  clampVolume,
  formatFrequency,
  frequencyToSlider,
  isHighCutBypassed,
  isLowCutBypassed,
  sliderToFrequency,
} from "@/lib/sequencer";

type ChannelControlsProps = {
  volume: number;
  pitch: number;
  lowCutHz: number;
  highCutHz: number;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
  onLowCutChange: (hz: number) => void;
  onHighCutChange: (hz: number) => void;
};

/** Volume, pitch, and the two cutoff filters for the selected channel. */
export default function ChannelControls({
  volume,
  pitch,
  lowCutHz,
  highCutHz,
  onVolumeChange,
  onPitchChange,
  onLowCutChange,
  onHighCutChange,
}: ChannelControlsProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <ControlSlider
        label="Volume"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={volume}
        readout={`${Math.round(volume * 100)}%`}
        onChange={(value) => onVolumeChange(clampVolume(value))}
      />

      <ControlSlider
        label="Pitch"
        min={MIN_PITCH}
        max={MAX_PITCH}
        step={1}
        value={pitch}
        readout={`${pitch > 0 ? `+${pitch}` : pitch} st`}
        onChange={(value) => onPitchChange(clampPitch(value))}
      />

      {/* Cutoffs ride a 0..1 log scale, so the readout shows the real frequency. */}
      <ControlSlider
        label="Low cut"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(lowCutHz)}
        readout={isLowCutBypassed(lowCutHz) ? "Off" : formatFrequency(lowCutHz)}
        onChange={(position) => onLowCutChange(sliderToFrequency(position))}
      />

      <ControlSlider
        label="High cut"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(highCutHz)}
        readout={
          isHighCutBypassed(highCutHz) ? "Off" : formatFrequency(highCutHz)
        }
        onChange={(position) => onHighCutChange(sliderToFrequency(position))}
      />
    </div>
  );
}
