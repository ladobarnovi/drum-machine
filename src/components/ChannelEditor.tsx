"use client";

import ChannelControls from "./ChannelControls";
import ChannelLfoControls from "./ChannelLfoControls";
import ChannelNameInput from "./ChannelNameInput";
import SampleSlot from "./SampleSlot";
import StepGrid from "./StepGrid";
import StepPatternControls from "./StepPatternControls";
import Waveform from "./Waveform";
import {
  channelDisplayName,
  type Channel,
  type ChannelLfo,
  type StepFill,
} from "@/lib/sequencer";

type ChannelEditorProps = {
  channel: Channel;
  currentStep?: number | null;
  onToggleStep?: (stepIndex: number) => void;
  onApplyStepFill?: (fill: StepFill) => void;
  onNudgeSteps?: (offset: number) => void;
  onClearSteps?: () => void;
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  onLengthChange?: (length: number) => void;
  onVolumeChange?: (volume: number) => void;
  onPitchChange?: (pitch: number) => void;
  onNameChange?: (name: string) => void;
  onLowCutChange?: (hz: number) => void;
  onHighCutChange?: (hz: number) => void;
  onAttackChange?: (seconds: number) => void;
  onDecayChange?: (seconds: number) => void;
  onDelaySendChange?: (amount: number) => void;
  onReverbSendChange?: (amount: number) => void;
  onLfoChange?: (lfo: ChannelLfo) => void;
  showSampleOnly?: boolean;
  showSequencerOnly?: boolean;
  showControlsOnly?: boolean;
};

/** Sample controls, length, and step grid for the currently selected channel. */
export default function ChannelEditor({
  channel,
  currentStep,
  onToggleStep,
  onApplyStepFill,
  onNudgeSteps,
  onClearSteps,
  onUpload,
  onRemove,
  onLengthChange,
  onVolumeChange,
  onPitchChange,
  onNameChange,
  onLowCutChange,
  onHighCutChange,
  onAttackChange,
  onDecayChange,
  onDelaySendChange,
  onReverbSendChange,
  onLfoChange,
  showSampleOnly,
  showSequencerOnly,
  showControlsOnly,
}: ChannelEditorProps) {
  const displayName = channelDisplayName(channel);

  return (
    // No fill: the border alone is enough to group a card, and a tint behind
    // the step grid and the sliders competed with the controls sitting on it.
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      {showSampleOnly ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ChannelNameInput
              name={channel.name}
              fallback={channel.label}
              onNameChange={onNameChange}
            />

            <SampleSlot
              channelLabel={displayName}
              sample={channel.sample}
              onUpload={onUpload}
              onRemove={onRemove}
            />
          </div>

          <Waveform sample={channel.sample} />
        </>
      ) : showSequencerOnly ? (
        <>
          <StepGrid
            channelLabel={displayName}
            steps={channel.steps}
            length={channel.length}
            currentStep={currentStep}
            onToggleStep={onToggleStep}
          />

          <StepPatternControls
            steps={channel.steps}
            length={channel.length}
            onApplyFill={onApplyStepFill}
            onNudge={onNudgeSteps}
            onClear={onClearSteps}
            onLengthChange={onLengthChange}
          />
        </>
      ) : showControlsOnly ? (
        <>
          <ChannelControls
            volume={channel.volume}
            pitch={channel.pitch}
            lowCutHz={channel.lowCutHz}
            highCutHz={channel.highCutHz}
            attackSeconds={channel.attackSeconds}
            decaySeconds={channel.decaySeconds}
            delaySend={channel.delaySend}
            reverbSend={channel.reverbSend}
            onVolumeChange={onVolumeChange}
            onPitchChange={onPitchChange}
            onLowCutChange={onLowCutChange}
            onHighCutChange={onHighCutChange}
            onAttackChange={onAttackChange}
            onDecayChange={onDecayChange}
            onDelaySendChange={onDelaySendChange}
            onReverbSendChange={onReverbSendChange}
          />

          <ChannelLfoControls lfo={channel.lfo} onChange={onLfoChange} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ChannelNameInput
              name={channel.name}
              fallback={channel.label}
              onNameChange={onNameChange}
            />

            <SampleSlot
              channelLabel={displayName}
              sample={channel.sample}
              onUpload={onUpload}
              onRemove={onRemove}
            />
          </div>

          <Waveform sample={channel.sample} />

          <ChannelControls
            volume={channel.volume}
            pitch={channel.pitch}
            lowCutHz={channel.lowCutHz}
            highCutHz={channel.highCutHz}
            attackSeconds={channel.attackSeconds}
            decaySeconds={channel.decaySeconds}
            delaySend={channel.delaySend}
            reverbSend={channel.reverbSend}
            onVolumeChange={onVolumeChange}
            onPitchChange={onPitchChange}
            onLowCutChange={onLowCutChange}
            onHighCutChange={onHighCutChange}
            onAttackChange={onAttackChange}
            onDecayChange={onDecayChange}
            onDelaySendChange={onDelaySendChange}
            onReverbSendChange={onReverbSendChange}
          />

          <ChannelLfoControls lfo={channel.lfo} onChange={onLfoChange} />

          {/* Sits directly above the grid it writes, so the effect of a press is
              the next thing read. */}
          <StepPatternControls
            steps={channel.steps}
            length={channel.length}
            onApplyFill={onApplyStepFill}
            onNudge={onNudgeSteps}
            onClear={onClearSteps}
            onLengthChange={onLengthChange}
          />

          <StepGrid
            channelLabel={displayName}
            steps={channel.steps}
            length={channel.length}
            currentStep={currentStep}
            onToggleStep={onToggleStep}
          />
        </>
      )}
    </div>
  );
}
