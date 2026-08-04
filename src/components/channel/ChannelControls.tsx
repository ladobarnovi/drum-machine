"use client";

import ControlSlider from "@/components/ui/ControlSlider";
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

/** One channel offered as a choke source: its id, under the name on its pad. */
export type ChokeOption = {
  id: string;
  name: string;
};

type ChannelControlsProps = {
  volume: number;
  pitch: number;
  lowCutHz: number;
  highCutHz: number;
  attackSeconds: number;
  decaySeconds: number;
  delaySend: number;
  reverbSend: number;
  chokedBy: string | null;
  /** Every channel that could choke this one — this channel is not among them. */
  chokeOptions: ChokeOption[];
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
  onLowCutChange: (hz: number) => void;
  onHighCutChange: (hz: number) => void;
  onAttackChange: (seconds: number) => void;
  onDecayChange: (seconds: number) => void;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
  /** The raw select value; empty means no choke. */
  onChokedByChange: (channelId: string) => void;
};

/**
 * Volume, pitch, filters, the amplitude envelope, the two send amounts, and the
 * choke source for the selected channel.
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
  chokedBy,
  chokeOptions,
  onVolumeChange,
  onPitchChange,
  onLowCutChange,
  onHighCutChange,
  onAttackChange,
  onDecayChange,
  onDelaySendChange,
  onReverbSendChange,
  onChokedByChange,
}: ChannelControlsProps) {
  return (
    <section className="border-line flex flex-col gap-3 rounded-md border p-3">
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

        {/*
          Last, with the sends, because it is the other thing here that is about
          where this channel sits against the rest of the kit rather than about
          how it sounds on its own. Empty by default, and the empty option is
          worded as what it does rather than left blank.
        */}
        <label className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0">Choke</span>
          <select
            value={chokedBy ?? ""}
            onChange={(event) => onChokedByChange(event.target.value)}
            aria-label="Choked by"
            className="border-edge bg-field w-32 rounded border px-2 py-1"
          >
            <option value="">None</option>
            {chokeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
