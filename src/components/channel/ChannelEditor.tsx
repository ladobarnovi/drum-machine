"use client";

import type { ReactNode } from "react";

import ChannelControls, {
  type ChokeOption,
  type StepEdit,
} from "./ChannelControls";
import ChannelLfoControls from "./ChannelLfoControls";
import ChannelNameInput from "./ChannelNameInput";
import SampleSlot from "./SampleSlot";
import Waveform from "./Waveform";
import StepGrid from "./steps/StepGrid";
import StepPatternControls from "./steps/StepPatternControls";
import {
  channelDisplayName,
  type Channel,
  type ChannelLfo,
  type StepFill,
  type SwipeTarget,
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
  /** Where the waveform's two trim handles have been dragged to. */
  onSampleStartChange: (fraction: number) => void;
  onSampleEndChange: (fraction: number) => void;
  /** Which way through the file the trimmed region is read. */
  onSampleReversedChange: (reversed: boolean) => void;
  onSampleTrimReset: () => void;
  /** Where in the file this channel is being heard, for the waveform's line. */
  getPlayhead: () => number | null;
};

/** The step grid, and the pattern and length controls under it. */
type SequencerSectionProps = {
  showSampleOnly?: false;
  showSequencerOnly: true;
  showControlsOnly?: false;
  currentStep: number | null;
  /** The step the controls panel is editing, or null while none is open. */
  editingStep: number | null;
  /** Which parameter a vertical swipe on the grid is currently writing. */
  swipeTarget: SwipeTarget;
  onStepClick: (stepIndex: number) => void;
  onStepHold: (stepIndex: number) => void;
  onStepVelocityChange: (stepIndex: number, velocity: number) => void;
  onStepPitchChange: (stepIndex: number, semitones: number) => void;
  onStepContextMenu: (stepIndex: number, x: number, y: number) => void;
  onSwipeTargetChange: (target: SwipeTarget) => void;
  onApplyStepFill: (fill: StepFill) => void;
  onNudgeSteps: (offset: number) => void;
  onClearSteps: () => void;
  onInvertSteps: () => void;
  onHumanizeSteps: () => void;
  onLengthChange: (length: number) => void;
};

/** The per-channel sliders, and the LFO section under them. */
type ControlsSectionProps = {
  showSampleOnly?: false;
  showSequencerOnly?: false;
  showControlsOnly: true;
  /**
   * What the sliders show: the channel's own settings, or those of the step
   * being edited standing in for them. Resolved by the caller, which is the one
   * that knows which step — if any — is open.
   */
  settings: Channel;
  /** The other channels, any one of which could be this one's choke source. */
  chokeOptions: ChokeOption[];
  /** Set while one step is open, so the panel scopes itself to it. */
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
  onPhaserSendChange: (amount: number) => void;
  onChokedByChange: (channelId: string) => void;
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

        <Waveform
          sample={channel.sample}
          start={channel.sampleStart}
          end={channel.sampleEnd}
          onStartChange={props.onSampleStartChange}
          onEndChange={props.onSampleEndChange}
          reversed={channel.sampleReversed}
          onReversedChange={props.onSampleReversedChange}
          onReset={props.onSampleTrimReset}
          getPlayhead={props.getPlayhead}
        />
      </Card>
    );
  }

  if (props.showSequencerOnly) {
    return (
      <Card>
        <h3 className="text-xs font-semibold">Sequencer</h3>
        <StepGrid
          channelLabel={displayName}
          steps={channel.steps}
          channelPitch={channel.pitch}
          swipeTarget={props.swipeTarget}
          length={channel.length}
          currentStep={props.currentStep}
          editingStep={props.editingStep}
          onStepClick={props.onStepClick}
          onStepHold={props.onStepHold}
          onStepVelocityChange={props.onStepVelocityChange}
          onStepPitchChange={props.onStepPitchChange}
          onStepContextMenu={props.onStepContextMenu}
        />

        <StepPatternControls
          steps={channel.steps}
          length={channel.length}
          swipeTarget={props.swipeTarget}
          onApplyFill={props.onApplyStepFill}
          onNudge={props.onNudgeSteps}
          onClear={props.onClearSteps}
          onInvert={props.onInvertSteps}
          onHumanize={props.onHumanizeSteps}
          onLengthChange={props.onLengthChange}
          onSwipeTargetChange={props.onSwipeTargetChange}
        />
      </Card>
    );
  }

  // Every slider below reads from the resolved settings rather than from the
  // channel, so a locked parameter shows the step's value; the choke is the one
  // exception, since a step cannot override it and it would be a lie to show it
  // under a heading that says otherwise.
  const { settings } = props;

  return (
    <>
      <ChannelControls
        volume={settings.volume}
        pan={settings.pan}
        pitch={settings.pitch}
        lowCutHz={settings.lowCutHz}
        highCutHz={settings.highCutHz}
        attackSeconds={settings.attackSeconds}
        decaySeconds={settings.decaySeconds}
        delaySend={settings.delaySend}
        reverbSend={settings.reverbSend}
        phaserSend={settings.phaserSend}
        chokedBy={channel.chokedBy}
        chokeOptions={props.chokeOptions}
        stepEdit={props.stepEdit}
        onVolumeChange={props.onVolumeChange}
        onPanChange={props.onPanChange}
        onPitchChange={props.onPitchChange}
        onLowCutChange={props.onLowCutChange}
        onHighCutChange={props.onHighCutChange}
        onAttackChange={props.onAttackChange}
        onDecayChange={props.onDecayChange}
        onDelaySendChange={props.onDelaySendChange}
        onReverbSendChange={props.onReverbSendChange}
        onPhaserSendChange={props.onPhaserSendChange}
        onChokedByChange={props.onChokedByChange}
      />

      <ChannelLfoControls lfo={channel.lfo} onChange={props.onLfoChange} />
    </>
  );
}
