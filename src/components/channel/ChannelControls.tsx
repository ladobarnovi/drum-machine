"use client";

import ControlSlider from "@/components/ui/ControlSlider";
import {
  DEFAULT_STEP_PROBABILITY,
  DEFAULT_STEP_REPEAT,
  DEFAULT_STEP_VELOCITY,
  MAX_PAN,
  MAX_PITCH,
  MAX_SEND,
  MAX_STEP_PROBABILITY,
  MAX_STEP_REPEAT,
  MAX_STEP_VELOCITY,
  MAX_VOLUME,
  MIN_PAN,
  MIN_PITCH,
  MIN_SEND,
  MIN_STEP_PROBABILITY,
  MIN_STEP_REPEAT,
  MIN_STEP_VELOCITY,
  MIN_VOLUME,
  attackToSlider,
  clampPan,
  clampPitch,
  clampSend,
  clampVolume,
  decayToSlider,
  formatFrequency,
  formatPan,
  formatPitch,
  formatProbability,
  formatSeconds,
  formatStepRepeat,
  formatVelocity,
  frequencyToSlider,
  isAttackBypassed,
  isDecayBypassed,
  isHighCutBypassed,
  isLowCutBypassed,
  sliderToAttack,
  sliderToDecay,
  sliderToFrequency,
  type LockableParameter,
  type StepLocks,
} from "@/lib/sequencer";

/** One channel offered as a choke source: its id, under the name on its pad. */
export type ChokeOption = {
  id: string;
  name: string;
};

/**
 * What the panel is given while a single step is open for editing. Its presence
 * is the whole of the mode: the sliders above are the same controls either way,
 * and this only changes what they are pointed at.
 */
export type StepEdit = {
  /** Which step is open, counted from 0. */
  index: number;
  velocity: number;
  /** Chance this step fires when its turn comes, 0..1. */
  probability: number;
  /** How many times this step retriggers within its own duration. */
  repeatCount: number;
  /** Which of the parameters this step overrides. */
  locks: StepLocks;
  onVelocityChange: (velocity: number) => void;
  onProbabilityChange: (probability: number) => void;
  onRepeatChange: (repeatCount: number) => void;
  onClearLock: (key: LockableParameter) => void;
  onClearLocks: () => void;
};

type ChannelControlsProps = {
  volume: number;
  pan: number;
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
  /** Set while one step is being edited; absent while the channel is. */
  stepEdit?: StepEdit;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
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
 * Volume, pan, pitch, filters, the amplitude envelope, the two send amounts,
 * and the choke source — for the channel, or for one step of it.
 *
 * The values arrive already resolved: while a step is open the caller hands
 * down that step's overrides in place of the channel's own settings, so the
 * sliders show what the step is about to be played with and nothing here has to
 * know which of the two it is looking at. `stepEdit` only adds what the channel
 * has no equivalent of — the velocity, and the marks saying which rows have
 * been overridden.
 */
export default function ChannelControls({
  volume,
  pan,
  pitch,
  lowCutHz,
  highCutHz,
  attackSeconds,
  decaySeconds,
  delaySend,
  reverbSend,
  chokedBy,
  chokeOptions,
  stepEdit,
  onVolumeChange,
  onPanChange,
  onPitchChange,
  onLowCutChange,
  onHighCutChange,
  onAttackChange,
  onDecayChange,
  onDelaySendChange,
  onReverbSendChange,
  onChokedByChange,
}: ChannelControlsProps) {
  /**
   * What a lockable slider needs to show its state. Handed to every one of them
   * while a step is open — including the ones with nothing locked, since it is
   * passing the clear handler at all that reserves the column and keeps the
   * rows from shifting sideways as locks come and go.
   */
  const lockProps = (key: LockableParameter) =>
    stepEdit
      ? {
          locked: stepEdit.locks[key] !== undefined,
          onClearLock: () => stepEdit.onClearLock(key),
        }
      : {};

  const hasLocks =
    stepEdit !== undefined && Object.keys(stepEdit.locks).length > 0;

  return (
    <section className="border-line flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xs font-semibold">
          {stepEdit ? `Step ${stepEdit.index + 1}` : "Params"}
        </h2>

        {stepEdit && (
          <>
            {/* Said plainly, because the two controls this panel holds that a
                step cannot override are otherwise indistinguishable from the
                ones it can. */}
            <p className="text-muted text-xs">
              This step only — choke and the LFO stay per channel.
            </p>

            <button
              type="button"
              onClick={stepEdit.onClearLocks}
              disabled={!hasLocks}
              className="border-edge hover:bg-raised ml-auto rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear locks
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {/*
          First, and only here: how hard the step is hit is the one thing on
          this panel a channel has no equivalent of, and it is what the swipe on
          the grid has just been setting. Its clear button resets the accent
          rather than dropping a lock — velocity is part of every step, not an
          override sitting on top of one — which is why it is marked whenever it
          is anywhere below full.
        */}
        {stepEdit && (
          <ControlSlider
            label="Velocity"
            min={MIN_STEP_VELOCITY}
            max={MAX_STEP_VELOCITY}
            step={0.01}
            value={stepEdit.velocity}
            readout={formatVelocity(stepEdit.velocity)}
            onChange={stepEdit.onVelocityChange}
            locked={stepEdit.velocity < MAX_STEP_VELOCITY}
            onClearLock={() => stepEdit.onVelocityChange(DEFAULT_STEP_VELOCITY)}
          />
        )}

        {/* Chance the step fires at all, marked whenever it isn't a sure thing. */}
        {stepEdit && (
          <ControlSlider
            label="Probability"
            min={MIN_STEP_PROBABILITY}
            max={MAX_STEP_PROBABILITY}
            step={0.01}
            value={stepEdit.probability}
            readout={formatProbability(stepEdit.probability)}
            onChange={stepEdit.onProbabilityChange}
            locked={stepEdit.probability < MAX_STEP_PROBABILITY}
            onClearLock={() =>
              stepEdit.onProbabilityChange(DEFAULT_STEP_PROBABILITY)
            }
          />
        )}

        {/* How many times the step retriggers within its own length. */}
        {stepEdit && (
          <ControlSlider
            label="Repeat"
            min={MIN_STEP_REPEAT}
            max={MAX_STEP_REPEAT}
            step={1}
            value={stepEdit.repeatCount}
            readout={formatStepRepeat(stepEdit.repeatCount)}
            onChange={stepEdit.onRepeatChange}
            locked={stepEdit.repeatCount > MIN_STEP_REPEAT}
            onClearLock={() => stepEdit.onRepeatChange(DEFAULT_STEP_REPEAT)}
          />
        )}

        <ControlSlider
          label="Volume"
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          step={0.01}
          value={volume}
          readout={`${Math.round(volume * 100)}%`}
          onChange={(value) => onVolumeChange(clampVolume(value))}
          {...lockProps("volume")}
        />

        {/* Straight after the volume, which is the other half of placing a
            channel in a mix: how loud it is, and where it is. */}
        <ControlSlider
          label="Pan"
          min={MIN_PAN}
          max={MAX_PAN}
          step={0.01}
          value={pan}
          readout={formatPan(pan)}
          onChange={(value) => onPanChange(clampPan(value))}
          {...lockProps("pan")}
        />

        <ControlSlider
          label="Pitch"
          min={MIN_PITCH}
          max={MAX_PITCH}
          step={1}
          value={pitch}
          readout={formatPitch(pitch)}
          onChange={(value) => onPitchChange(clampPitch(value))}
          {...lockProps("pitch")}
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
          {...lockProps("lowCutHz")}
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
          {...lockProps("highCutHz")}
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
          {...lockProps("attackSeconds")}
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
          {...lockProps("decaySeconds")}
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
          {...lockProps("delaySend")}
        />

        <ControlSlider
          label="Reverb"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={reverbSend}
          readout={`${Math.round(reverbSend * 100)}%`}
          onChange={(value) => onReverbSendChange(clampSend(value))}
          {...lockProps("reverbSend")}
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
