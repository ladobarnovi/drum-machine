"use client";

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
import Accordion from "@/components/ui/Accordion";
import {
  channelDisplayName,
  isSliced,
  resolveSwipeTarget,
  swipeTargetsFor,
  type Channel,
  type ChannelLfo,
  type SampleMode,
  type SliceCount,
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
  /** Whether a hit plays that region whole, or one slice of it. */
  onSampleModeChange: (mode: SampleMode) => void;
  onSliceCountChange: (sliceCount: SliceCount) => void;
  /**
   * The slice the step open for editing fires, so the strip can show which part
   * of the file the Position slider is pointed at. Null while no step is open.
   */
  highlightSlice: number | null;
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
  onStepSliceChange: (stepIndex: number, slice: number) => void;
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

/** One section of the currently selected channel's editor. */
export default function ChannelEditor(props: ChannelEditorProps) {
  const { channel } = props;
  const displayName = channelDisplayName(channel);

  if (props.showSampleOnly) {
    // No `Card` here, unlike before: this section now shares its card with
    // the Filter and Env tabs it sits alongside in `SampleEditorTabsSection`,
    // the same way `showSequencerOnly` below shares its card with Patterns
    // and Banks.
    return (
      <>
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
          mode={channel.sampleMode}
          onModeChange={props.onSampleModeChange}
          sliceCount={channel.sliceCount}
          onSliceCountChange={props.onSliceCountChange}
          highlightSlice={props.highlightSlice}
          onReset={props.onSampleTrimReset}
          getPlayhead={props.getPlayhead}
        />
      </>
    );
  }

  if (props.showSequencerOnly) {
    // What this channel's grid can be pointed at, and what it is pointed at
    // now. Resolved here rather than by the machine above, because the answer
    // comes from the sample in the slot — which this already has in hand —
    // while the target the machine holds is deliberately not a channel's to
    // own: it says what you are doing, not what this channel is.
    const swipeTargets = swipeTargetsFor(channel.sampleMode);
    const swipeTarget = resolveSwipeTarget(
      props.swipeTarget,
      channel.sampleMode,
    );

    // Null on a one shot, which is the whole of what takes the position off
    // the step buttons — there are no parts for a hit to be at.
    const sliceCount = isSliced(channel.sampleMode) ? channel.sliceCount : null;

    // No `Card` here, unlike the other two sections: this one shares its card
    // with the Patterns and Banks tabs it sits alongside, and that wrapper —
    // along with the tab strip that used to be this section's own "Sequencer"
    // heading — belongs to `SequencerTabsSection`, one level up.
    return (
      <>
        <StepGrid
          channelLabel={displayName}
          steps={channel.steps}
          channelPitch={channel.pitch}
          sliceCount={sliceCount}
          swipeTarget={swipeTarget}
          length={channel.length}
          currentStep={props.currentStep}
          editingStep={props.editingStep}
          onStepClick={props.onStepClick}
          onStepHold={props.onStepHold}
          onStepVelocityChange={props.onStepVelocityChange}
          onStepPitchChange={props.onStepPitchChange}
          onStepSliceChange={props.onStepSliceChange}
          onStepContextMenu={props.onStepContextMenu}
        />

        <StepPatternControls
          steps={channel.steps}
          length={channel.length}
          swipeTarget={swipeTarget}
          swipeTargets={swipeTargets}
          onApplyFill={props.onApplyStepFill}
          onNudge={props.onNudgeSteps}
          onClear={props.onClearSteps}
          onInvert={props.onInvertSteps}
          onHumanize={props.onHumanizeSteps}
          onLengthChange={props.onLengthChange}
          onSwipeTargetChange={props.onSwipeTargetChange}
        />
      </>
    );
  }

  // Every slider below reads from the resolved settings rather than from the
  // channel, so a locked parameter shows the step's value; the choke is the one
  // exception, since a step cannot override it and it would be a lie to show it
  // under a heading that says otherwise.
  const { settings } = props;

  return (
    <>
      <Accordion title="Channel Params">
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
      </Accordion>

      <Accordion title="Channel LFO" defaultOpen={false}>
        <ChannelLfoControls lfo={channel.lfo} onChange={props.onLfoChange} />
      </Accordion>
    </>
  );
}
