"use client";

import type { ReactNode } from "react";

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

/**
 * The editor is not one card but three, rendered into different places in the
 * layout — the sample lives in one sidebar, the controls in the other, and the
 * step grid between them. Which section this is decides which handlers it
 * needs, so the props are a union keyed on the section flag rather than one
 * flat list with everything optional: a section can then require exactly the
 * handlers it will actually call, and no call site has to pass the fifteen or
 * so that belong to the other two.
 *
 * Each variant also spells out the other flags as optional `false`. That is
 * what lets the flag be read on the union at all — a property missing from
 * some members cannot be used to narrow it — and it stops two sections being
 * asked for at once, which the old shape allowed and this one cannot express.
 */
type ChannelEditorBaseProps = {
  channel: Channel;
};

/** The channel's name, its sample slot, and the waveform under them. */
type SampleSectionProps = {
  showSampleOnly: true;
  showSequencerOnly?: false;
  showControlsOnly?: false;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onNameChange: (name: string) => void;
};

/** The step grid, and the pattern and length controls under it. */
type SequencerSectionProps = {
  showSampleOnly?: false;
  showSequencerOnly: true;
  showControlsOnly?: false;
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
  onApplyStepFill: (fill: StepFill) => void;
  onNudgeSteps: (offset: number) => void;
  onClearSteps: () => void;
  onInvertSteps: () => void;
  onLengthChange: (length: number) => void;
};

/** The per-channel sliders, and the LFO section under them. */
type ControlsSectionProps = {
  showSampleOnly?: false;
  showSequencerOnly?: false;
  showControlsOnly: true;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
  onLowCutChange: (hz: number) => void;
  onHighCutChange: (hz: number) => void;
  onAttackChange: (seconds: number) => void;
  onDecayChange: (seconds: number) => void;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
  onLfoChange: (lfo: ChannelLfo) => void;
};

type ChannelEditorProps = ChannelEditorBaseProps &
  (SampleSectionProps | SequencerSectionProps | ControlsSectionProps);

/**
 * No fill: the border alone is enough to group a card, and a tint behind the
 * step grid and the sliders competed with the controls sitting on it.
 */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="border-line flex flex-col gap-4 rounded-md border p-4">
      {children}
    </div>
  );
}

/** One section of the currently selected channel's editor. */
export default function ChannelEditor(props: ChannelEditorProps) {
  const { channel } = props;
  const displayName = channelDisplayName(channel);

  if (props.showSampleOnly) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <ChannelNameInput
            name={channel.name}
            fallback={channel.label}
            onNameChange={props.onNameChange}
          />

          <SampleSlot
            channelLabel={displayName}
            sample={channel.sample}
            onUpload={props.onUpload}
            onRemove={props.onRemove}
          />
        </div>

        <Waveform sample={channel.sample} />
      </Card>
    );
  }

  if (props.showSequencerOnly) {
    return (
      <Card>
        <StepGrid
          channelLabel={displayName}
          steps={channel.steps}
          length={channel.length}
          currentStep={props.currentStep}
          onToggleStep={props.onToggleStep}
        />

        <StepPatternControls
          steps={channel.steps}
          length={channel.length}
          onApplyFill={props.onApplyStepFill}
          onNudge={props.onNudgeSteps}
          onClear={props.onClearSteps}
          onInvert={props.onInvertSteps}
          onLengthChange={props.onLengthChange}
        />
      </Card>
    );
  }

  return (
    <Card>
      <ChannelControls
        volume={channel.volume}
        pitch={channel.pitch}
        lowCutHz={channel.lowCutHz}
        highCutHz={channel.highCutHz}
        attackSeconds={channel.attackSeconds}
        decaySeconds={channel.decaySeconds}
        delaySend={channel.delaySend}
        reverbSend={channel.reverbSend}
        onVolumeChange={props.onVolumeChange}
        onPitchChange={props.onPitchChange}
        onLowCutChange={props.onLowCutChange}
        onHighCutChange={props.onHighCutChange}
        onAttackChange={props.onAttackChange}
        onDecayChange={props.onDecayChange}
        onDelaySendChange={props.onDelaySendChange}
        onReverbSendChange={props.onReverbSendChange}
      />

      <ChannelLfoControls lfo={channel.lfo} onChange={props.onLfoChange} />
    </Card>
  );
}
