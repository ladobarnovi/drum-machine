"use client";

import { useState } from "react";

import ChannelControls, {
  type ChokeOption,
  type StepEdit,
} from "./ChannelControls";
import ChannelNameInput from "./ChannelNameInput";
import SampleModeControls from "./SampleModeControls";
import SampleSlot from "./SampleSlot";
import SampleSourceMenu, { type SampleSourceAnchor } from "./SampleSourceMenu";
import Waveform from "./Waveform";
import StepGrid from "./steps/StepGrid";
import StepPatternControls from "./steps/StepPatternControls";
import Accordion from "@/components/ui/Accordion";
import RotaryKnob from "@/components/ui/RotaryKnob";
import { channelMidiMapId } from "@/lib/midiParameters";
import type { LibraryEntry } from "@/lib/sampleLibrary";
import {
  DEFAULT_STEP_PROBABILITY,
  DEFAULT_STEP_REPEAT,
  DEFAULT_STEP_SLICE,
  DEFAULT_STEP_TIMING,
  DEFAULT_STEP_VELOCITY,
  MAX_PAN,
  MAX_PITCH,
  MAX_STEP_PROBABILITY,
  MAX_STEP_REPEAT,
  MAX_STEP_TIMING,
  MAX_STEP_VELOCITY,
  MAX_VOLUME,
  MIN_PAN,
  MIN_PITCH,
  MIN_STEP_PROBABILITY,
  MIN_STEP_REPEAT,
  MIN_STEP_TIMING,
  MIN_STEP_VELOCITY,
  MIN_VOLUME,
  channelDisplayName,
  clampPan,
  clampPitch,
  clampStepSlice,
  clampVolume,
  formatPan,
  formatPitch,
  formatProbability,
  formatSeconds,
  formatStepRepeat,
  formatStepSlice,
  formatStepTiming,
  formatVelocity,
  isSliced,
  randomInRange,
  resolveSwipeTarget,
  swipeTargetsFor,
  type Channel,
  type LockableParameter,
  type SampleMode,
  type SliceCount,
  type StepFill,
  type StepLocks,
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
  /** One of the bundled samples, picked in the library browser. */
  onLoadLibrarySample: (entry: LibraryEntry) => void;
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
  /**
   * Gain, pan and pitch, resolved the same way `settings` is for the Channel
   * Params accordion — the channel's own values, or an open step's. Repeated
   * here rather than left to that accordion alone, since reaching for the
   * sample and its level in the same glance is the point of a knob row sitting
   * right under the waveform.
   */
  volume: number;
  pan: number;
  pitch: number;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onPitchChange: (pitch: number) => void;
  /** Rerolls one of Gain, Pan or Pitch across every active step. */
  onRandomizeParameter: (key: LockableParameter, randomize: () => number) => void;
  /** Drops every override of one of Gain, Pan or Pitch, pattern-wide. */
  onClearLockedParameter: (key: LockableParameter) => void;
  /** Set while one step is being edited, so these three knobs mark their locks
   * the same way the accordion's sliders do. */
  locks?: StepLocks;
  onClearLock?: (key: LockableParameter) => void;
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
  onStepProbabilityChange: (stepIndex: number, probability: number) => void;
  onStepRepeatChange: (stepIndex: number, repeatCount: number) => void;
  onStepTimingChange: (stepIndex: number, timingOffset: number) => void;
  onStepContextMenu: (stepIndex: number, x: number, y: number) => void;
  onSwipeTargetChange: (target: SwipeTarget) => void;
  onApplyStepFill: (fill: StepFill) => void;
  onNudgeSteps: (offset: number) => void;
  onClearSteps: () => void;
  onInvertSteps: () => void;
  onHumanizeSteps: () => void;
  onLengthChange: (length: number) => void;
};

/** The per-channel sliders. */
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
  onChokedByChange: (channelId: string) => void;
};

type ChannelEditorProps = ChannelEditorBaseProps &
  (SampleSectionProps | SequencerSectionProps | ControlsSectionProps);

/** One section of the currently selected channel's editor. */
export default function ChannelEditor(props: ChannelEditorProps) {
  const { channel } = props;
  const displayName = channelDisplayName(channel);

  /**
   * Where the sample-source menu is up, or null while it is shut. Held here
   * rather than inside either control that raises it, because both the strip
   * and the slot do and there is only ever one menu between them. Declared for
   * all three sections, since a hook cannot sit behind the branch below — the
   * other two simply never raise it.
   */
  const [sourceMenu, setSourceMenu] = useState<SampleSourceAnchor | null>(null);

  if (props.showSampleOnly) {
    // Only a loaded file has a length to place Start and End against — on any
    // other status the two knobs still turn, but read out against nothing.
    const durationSeconds =
      channel.sample.status === "loaded" ? channel.sample.durationSeconds : 0;

    // Same shape as `ChannelFilterSection`'s: absent locks means an unlocked
    // row, present locks means every knob gets its mark and its clear button.
    const lockProps = (key: LockableParameter) =>
      props.locks
        ? {
            locked: props.locks[key] !== undefined,
            onClearLock: () => props.onClearLock?.(key),
          }
        : {};

    // No `Card` here, unlike before: this section now shares its card with
    // the Filter and Env tabs it sits alongside in `SampleEditorTabsSection`,
    // the same way `showSequencerOnly` below shares its card with Patterns
    // and Banks.
    return (
      <>
        <Waveform
          sample={channel.sample}
          channelLabel={displayName}
          onLoadRequest={setSourceMenu}
          menuOpen={sourceMenu?.from === "waveform"}
          start={channel.sampleStart}
          end={channel.sampleEnd}
          onStartChange={props.onSampleStartChange}
          onEndChange={props.onSampleEndChange}
          reversed={channel.sampleReversed}
          mode={channel.sampleMode}
          sliceCount={channel.sliceCount}
          highlightSlice={props.highlightSlice}
          onReset={props.onSampleTrimReset}
          getPlayhead={props.getPlayhead}
        />

        {/*
          Start and End ride the same 0..1 file fraction the waveform's own
          trim handles do, so dragging a handle and turning its knob move the
          same number — a knob is just a second grip on it, for placing a cut
          finer than a drag across the strip allows. Gain, Pan and Pitch sit
          beside them because the sample and its level are one decision in
          practice, not two panels apart.
        */}
        <div className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-4 sm:gap-x-6">
          <RotaryKnob
            label="Start"
            ariaLabel="Sample start"
            min={0}
            max={1}
            step={0.001}
            value={channel.sampleStart}
            readout={formatSeconds(channel.sampleStart * durationSeconds)}
            onChange={props.onSampleStartChange}
          />

          <RotaryKnob
            label="End"
            ariaLabel="Sample end"
            min={0}
            max={1}
            step={0.001}
            value={channel.sampleEnd}
            readout={formatSeconds(channel.sampleEnd * durationSeconds)}
            onChange={props.onSampleEndChange}
          />

          <RotaryKnob
            label="Gain"
            ariaLabel="Volume"
            min={MIN_VOLUME}
            max={MAX_VOLUME}
            step={0.01}
            value={props.volume}
            readout={`${Math.round(props.volume * 100)}%`}
            onChange={(value) => props.onVolumeChange(clampVolume(value))}
            {...lockProps("volume")}
            midiMapId={channelMidiMapId(channel.id, "volume")}
            onRandomize={() =>
              props.onRandomizeParameter("volume", () =>
                clampVolume(randomInRange(MIN_VOLUME, MAX_VOLUME)),
              )
            }
            onClearLocks={() => props.onClearLockedParameter("volume")}
          />

          <RotaryKnob
            label="Pan"
            ariaLabel="Pan"
            min={MIN_PAN}
            max={MAX_PAN}
            step={0.01}
            value={props.pan}
            readout={formatPan(props.pan)}
            onChange={(value) => props.onPanChange(clampPan(value))}
            {...lockProps("pan")}
            midiMapId={channelMidiMapId(channel.id, "pan")}
            onRandomize={() =>
              props.onRandomizeParameter("pan", () =>
                clampPan(randomInRange(MIN_PAN, MAX_PAN)),
              )
            }
            onClearLocks={() => props.onClearLockedParameter("pan")}
          />

          <RotaryKnob
            label="Pitch"
            ariaLabel="Pitch"
            min={MIN_PITCH}
            max={MAX_PITCH}
            step={1}
            value={props.pitch}
            readout={formatPitch(props.pitch)}
            onChange={(value) => props.onPitchChange(clampPitch(value))}
            {...lockProps("pitch")}
            midiMapId={channelMidiMapId(channel.id, "pitch")}
            onRandomize={() =>
              props.onRandomizeParameter("pitch", () =>
                clampPitch(randomInRange(MIN_PITCH, MAX_PITCH)),
              )
            }
            onClearLocks={() => props.onClearLockedParameter("pitch")}
          />
        </div>

        {/*
          What a hit is, how many parts it's cut into, and which way it's
          read — under the knobs rather than under the strip, now that the
          strip has knobs of its own sitting between the two.
        */}
        <SampleModeControls
          mode={channel.sampleMode}
          onModeChange={props.onSampleModeChange}
          sliceCount={channel.sliceCount}
          onSliceCountChange={props.onSliceCountChange}
          reversed={channel.sampleReversed}
          onReversedChange={props.onSampleReversedChange}
        />

        <div className="flex flex-wrap items-center gap-3">
          <ChannelNameInput
            name={channel.name}
            fallback={channel.label}
            onNameChange={props.onNameChange}
          />

          <SampleSlot
            channelLabel={displayName}
            sample={channel.sample}
            onOpenSourceMenu={setSourceMenu}
            menuOpen={sourceMenu?.from === "slot"}
            onRemove={props.onRemove}
          />
        </div>

        {/* Raised by the strip above and the slot beside it both, so it is
            mounted once here rather than inside either. */}
        <SampleSourceMenu
          channelLabel={displayName}
          currentSampleId={
            channel.sample.status === "loaded"
              ? channel.sample.libraryId
              : undefined
          }
          anchor={sourceMenu}
          onClose={() => setSourceMenu(null)}
          onUpload={props.onUpload}
          onLoadLibrarySample={props.onLoadLibrarySample}
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

    // The step the grid below has open, if any — held by index so the knobs
    // below can write back to it the same way the grid's own gestures do.
    const editingStepIndex = props.editingStep;
    const openStep =
      editingStepIndex === null ? null : channel.steps[editingStepIndex];

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

        {/*
          Only up while a step is held open — the same condition that puts the
          grid into edit mode in the first place.
        */}
        {openStep && editingStepIndex !== null && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold">
              {`Step ${editingStepIndex + 1}`}
            </h3>

            <div className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-4 sm:gap-x-6">
              <RotaryKnob
                label="Velocity"
                min={MIN_STEP_VELOCITY}
                max={MAX_STEP_VELOCITY}
                step={0.01}
                value={openStep.velocity}
                readout={formatVelocity(openStep.velocity)}
                onChange={(velocity) =>
                  props.onStepVelocityChange(editingStepIndex, velocity)
                }
                locked={openStep.velocity < MAX_STEP_VELOCITY}
                onClearLock={() =>
                  props.onStepVelocityChange(
                    editingStepIndex,
                    DEFAULT_STEP_VELOCITY,
                  )
                }
              />

              <RotaryKnob
                label="Repeat"
                min={MIN_STEP_REPEAT}
                max={MAX_STEP_REPEAT}
                step={1}
                value={openStep.repeatCount}
                readout={formatStepRepeat(openStep.repeatCount)}
                onChange={(repeatCount) =>
                  props.onStepRepeatChange(editingStepIndex, repeatCount)
                }
                locked={openStep.repeatCount > MIN_STEP_REPEAT}
                onClearLock={() =>
                  props.onStepRepeatChange(
                    editingStepIndex,
                    DEFAULT_STEP_REPEAT,
                  )
                }
              />

              <RotaryKnob
                label="Probability"
                min={MIN_STEP_PROBABILITY}
                max={MAX_STEP_PROBABILITY}
                step={0.01}
                value={openStep.probability}
                readout={formatProbability(openStep.probability)}
                onChange={(probability) =>
                  props.onStepProbabilityChange(editingStepIndex, probability)
                }
                locked={openStep.probability < MAX_STEP_PROBABILITY}
                onClearLock={() =>
                  props.onStepProbabilityChange(
                    editingStepIndex,
                    DEFAULT_STEP_PROBABILITY,
                  )
                }
              />

              <RotaryKnob
                label="Timing"
                ariaLabel="Step timing offset"
                min={MIN_STEP_TIMING}
                max={MAX_STEP_TIMING}
                step={0.001}
                value={openStep.timingOffset}
                readout={formatStepTiming(openStep.timingOffset)}
                onChange={(timingOffset) =>
                  props.onStepTimingChange(editingStepIndex, timingOffset)
                }
                locked={openStep.timingOffset !== DEFAULT_STEP_TIMING}
                onClearLock={() =>
                  props.onStepTimingChange(
                    editingStepIndex,
                    DEFAULT_STEP_TIMING,
                  )
                }
              />

              {/*
                Kept in the row rather than pulled from it on a one shot, so
                the knob count doesn't jump as a channel is sliced and
                unsliced — only greyed out, the same as a bypassed filter
                cutoff, since there is no part of an unsliced sample for it
                to point at.
              */}
              {(() => {
                if (sliceCount === null) {
                  return (
                    <RotaryKnob
                      label="Position"
                      min={0}
                      max={1}
                      step={1}
                      value={0}
                      readout="—"
                      onChange={() => {}}
                      disabled
                    />
                  );
                }

                const slice = clampStepSlice(openStep.slice, sliceCount);
                return (
                  <RotaryKnob
                    label="Position"
                    min={1}
                    max={sliceCount}
                    step={1}
                    value={slice + 1}
                    readout={formatStepSlice(slice, sliceCount)}
                    onChange={(value) =>
                      props.onStepSliceChange(editingStepIndex, value - 1)
                    }
                    locked={slice > DEFAULT_STEP_SLICE}
                    onClearLock={() =>
                      props.onStepSliceChange(
                        editingStepIndex,
                        DEFAULT_STEP_SLICE,
                      )
                    }
                  />
                );
              })()}
            </div>
          </div>
        )}

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

  // One accordion rather than two: the LFO that used to sit in a second one
  // under this now has a tab of its own up in `SampleEditorTabsSection`, where
  // it is drawn as well as dialled in.
  return (
    <Accordion title="Channel Params">
      <ChannelControls
        volume={settings.volume}
        pan={settings.pan}
        pitch={settings.pitch}
        lowCutHz={settings.lowCutHz}
        highCutHz={settings.highCutHz}
        attackSeconds={settings.attackSeconds}
        decaySeconds={settings.decaySeconds}
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
        onChokedByChange={props.onChokedByChange}
      />
    </Accordion>
  );
}
