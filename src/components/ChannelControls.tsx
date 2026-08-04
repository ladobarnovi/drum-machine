"use client";

import ControlSlider from "./ControlSlider";
import {
  MAX_PITCH,
  MAX_SEND,
  MAX_VOLUME,
  MIN_PITCH,
  MIN_SEND,
  MIN_VOLUME,
  attackToSlider,
  clampPitch,
  clampSend,
  clampVolume,
  decayToSlider,
  formatFrequency,
  formatSeconds,
  frequencyToSlider,
  isAttackBypassed,
  isDecayBypassed,
  isHighCutBypassed,
  isLowCutBypassed,
  sliderToAttack,
  sliderToDecay,
  sliderToFrequency,
} from "@/lib/sequencer";

type ChannelControlsProps = {
  volume: number;
  pitch: number;
  lowCutHz: number;
  highCutHz: number;
  attackSeconds: number;
  decaySeconds: number;
  delaySend: number;
  reverbSend: number;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
  onLowCutChange: (hz: number) => void;
  onHighCutChange: (hz: number) => void;
  onAttackChange: (seconds: number) => void;
  onDecayChange: (seconds: number) => void;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
};

/**
 * Volume, pitch, filters, the amplitude envelope, and the two send amounts for
 * the selected channel.
 */
export default function ChannelControls({
  volume,
  pitch,
  lowCutHz,
  highCutHz,
  attackSeconds,
  decaySeconds,
  delaySend,
  reverbSend,
  onVolumeChange,
  onPitchChange,
  onLowCutChange,
  onHighCutChange,
  onAttackChange,
  onDecayChange,
  onDelaySendChange,
  onReverbSendChange,
}: ChannelControlsProps) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <h2 className="text-xs font-semibold">Params</h2>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
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
          readout={
            isLowCutBypassed(lowCutHz) ? "Off" : formatFrequency(lowCutHz)
          }
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

        {/* Envelope times ride a 0..1 curve, so the readout shows the real time. */}
        <ControlSlider
          label="Attack"
          min={0}
          max={1}
          step={0.001}
          value={attackToSlider(attackSeconds)}
          readout={
            isAttackBypassed(attackSeconds)
              ? "Off"
              : formatSeconds(attackSeconds)
          }
          onChange={(position) => onAttackChange(sliderToAttack(position))}
        />

        <ControlSlider
          label="Decay"
          min={0}
          max={1}
          step={0.001}
          value={decayToSlider(decaySeconds)}
          readout={
            isDecayBypassed(decaySeconds) ? "Off" : formatSeconds(decaySeconds)
          }
          onChange={(position) => onDecayChange(sliderToDecay(position))}
        />

        {/* How much of this channel is fed to each master send bus. */}
        <ControlSlider
          label="Delay"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={delaySend}
          readout={`${Math.round(delaySend * 100)}%`}
          onChange={(value) => onDelaySendChange(clampSend(value))}
        />

        <ControlSlider
          label="Reverb"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={reverbSend}
          readout={`${Math.round(reverbSend * 100)}%`}
          onChange={(value) => onReverbSendChange(clampSend(value))}
        />
      </div>
    </section>
  );
}
