"use client";

import type { EnvelopeSettings } from "./ChannelEnvelopeSection";
import ChannelEditor from "./ChannelEditor";
import ChannelEnvelopeSection from "./ChannelEnvelopeSection";
import ChannelFilterSection, {
  type FilterSettings,
} from "./ChannelFilterSection";
import ChannelFxSection, { type FxSettings } from "./ChannelFxSection";
import ChannelLfoSection from "./ChannelLfoSection";
import RailTabs from "@/components/ui/RailTabs";
import type { LibraryEntry } from "@/lib/sampleLibrary";
import {
  channelDisplayName,
  type Channel,
  type ChannelLfo,
  type FilterSlope,
  type LockableParameter,
  type SampleMode,
  type SliceCount,
  type StepLocks,
} from "@/lib/sequencer";

/**
 * Shared by the Filter, Env and FX tabs: the same step, if any, is open for
 * all of them, since a lock is a lock on the channel's settings regardless of
 * which tab happens to be showing it.
 */
type StepEditRef = {
  index: number;
  locks: StepLocks;
  onClearLock: (key: LockableParameter) => void;
};

type PlayingRef<Settings> = {
  index: number;
  settings: Settings;
  locks: StepLocks;
};

type SampleEditorTabsSectionProps = {
  channel: Channel;

  // Sample tab — the name, the slot, and the waveform under them.
  onUpload: (file: File) => void;
  onLoadLibrarySample: (entry: LibraryEntry) => void;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onSampleStartChange: (fraction: number) => void;
  onSampleEndChange: (fraction: number) => void;
  onSampleReversedChange: (reversed: boolean) => void;
  onSampleModeChange: (mode: SampleMode) => void;
  onSliceCountChange: (sliceCount: SliceCount) => void;
  highlightSlice: number | null;
  onSampleTrimReset: () => void;
  getPlayhead: () => number | null;
  // Sample tab — Gain, Pan and Pitch, the same three values the Channel
  // Params accordion edits, resolved against whichever step (if any) is open.
  volume: number;
  pan: number;
  pitch: number;
  onVolumeChange: (volume: number) => void;
  onPanChange: (pan: number) => void;
  onPitchChange: (pitch: number) => void;

  // Filter tab — the two cuts, pictured.
  filterSettings: FilterSettings;
  filterSlope: FilterSlope;
  playingFilter?: PlayingRef<FilterSettings> | null;
  onLowCutChange: (hz: number) => void;
  onLowCutResonanceChange: (amount: number) => void;
  onHighCutChange: (hz: number) => void;
  onHighCutResonanceChange: (amount: number) => void;
  onFilterSlopeChange: (slope: FilterSlope) => void;

  // Env tab — the amplitude envelope, pictured.
  envelopeSettings: EnvelopeSettings;
  playingEnvelope?: PlayingRef<EnvelopeSettings> | null;
  onAttackChange: (seconds: number) => void;
  onDecayChange: (seconds: number) => void;
  onSustainChange: (level: number) => void;
  onReleaseChange: (seconds: number) => void;

  // LFO tab — the modulation source, and the wave it puts out. One value
  // rather than a settings-and-handlers pair like the tabs either side, since
  // no step can lock any of it and the section always edits the channel's own.
  lfo: ChannelLfo;
  onLfoChange: (lfo: ChannelLfo) => void;

  // FX tab — the three send amounts, pictured.
  fxSettings: FxSettings;
  playingFx?: PlayingRef<FxSettings> | null;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
  onPhaserSendChange: (amount: number) => void;

  /**
   * Rerolls one lockable parameter across every active step of the pattern.
   * Shared by all four tabs that carry a lockable knob — Sample, Filter, Env
   * and FX — since Randomize always means the same thing wherever it's asked
   * for: scatter this one parameter across the hits that are already playing.
   */
  onRandomizeParameter: (key: LockableParameter, randomize: () => number) => void;
  /** Drops one lockable parameter's overrides everywhere in the pattern — the
   *  undo for Randomize, offered in the same menu. */
  onClearLockedParameter: (key: LockableParameter) => void;

  /** Set while one step is open, so all three of those tabs scope to it. */
  stepEdit?: StepEditRef;
};

/**
 * Names this card on the page. `StepEditBanner` scrolls back to it: the
 * controls it warns about are these, and on a phone they are a screen away
 * from the grid that opened them.
 */
export const SAMPLE_EDITOR_SECTION_ID = "sample-editor";

/**
 * What used to be two separate cards — the sample's waveform, and the filter
 * pictured beside its knobs — are now five tabs sharing one. Env came third:
 * the same envelope `ChannelControls`' Shaping group already has sliders for,
 * extended into a full attack/decay/sustain/release and paired with a picture
 * of its own. FX came last, and unlike the first three it took its controls
 * with it rather than mirroring them — the three sends are here and nowhere
 * else. LFO did the same, moving up out of an accordion of its own in the
 * controls column, and slots in between the two: it is the second half of how
 * a hit moves over its own length, and it is read against the envelope far
 * more often than against the sends.
 *
 * One card rather than five, so switching between what the channel is
 * playing, what shape it comes out in, how its amplitude moves, what is
 * modulating it and where it gets sent reads as changing what you're looking
 * at rather than moving to a different part of the page — the same trade
 * `SequencerTabsSection` makes for the step grid, patterns and banks below it.
 */
export default function SampleEditorTabsSection({
  channel,
  onUpload,
  onLoadLibrarySample,
  onRemove,
  onNameChange,
  onSampleStartChange,
  onSampleEndChange,
  onSampleReversedChange,
  onSampleModeChange,
  onSliceCountChange,
  highlightSlice,
  onSampleTrimReset,
  getPlayhead,
  volume,
  pan,
  pitch,
  onVolumeChange,
  onPanChange,
  onPitchChange,
  filterSettings,
  filterSlope,
  playingFilter,
  onLowCutChange,
  onLowCutResonanceChange,
  onHighCutChange,
  onHighCutResonanceChange,
  onFilterSlopeChange,
  envelopeSettings,
  playingEnvelope,
  onAttackChange,
  onDecayChange,
  onSustainChange,
  onReleaseChange,
  lfo,
  onLfoChange,
  fxSettings,
  playingFx,
  onDelaySendChange,
  onReverbSendChange,
  onPhaserSendChange,
  onRandomizeParameter,
  onClearLockedParameter,
  stepEdit,
}: SampleEditorTabsSectionProps) {
  const channelName = channelDisplayName(channel);

  return (
    <RailTabs
      id={SAMPLE_EDITOR_SECTION_ID}
      label="Sample editor view"
      variant="panel"
      tabs={[
        {
          id: "sample",
          label: "Sample",
          panel: (
            <ChannelEditor
              channel={channel}
              showSampleOnly={true}
              onUpload={onUpload}
              onLoadLibrarySample={onLoadLibrarySample}
              onRemove={onRemove}
              onNameChange={onNameChange}
              onSampleStartChange={onSampleStartChange}
              onSampleEndChange={onSampleEndChange}
              onSampleReversedChange={onSampleReversedChange}
              onSampleModeChange={onSampleModeChange}
              onSliceCountChange={onSliceCountChange}
              highlightSlice={highlightSlice}
              onSampleTrimReset={onSampleTrimReset}
              getPlayhead={getPlayhead}
              volume={volume}
              pan={pan}
              pitch={pitch}
              onVolumeChange={onVolumeChange}
              onPanChange={onPanChange}
              onPitchChange={onPitchChange}
              onRandomizeParameter={onRandomizeParameter}
              onClearLockedParameter={onClearLockedParameter}
              locks={stepEdit?.locks}
              onClearLock={stepEdit?.onClearLock}
            />
          ),
        },
        {
          id: "filter",
          label: "Filter",
          panel: (
            <ChannelFilterSection
              channelId={channel.id}
              channelName={channelName}
              settings={filterSettings}
              filterSlope={filterSlope}
              playing={playingFilter}
              onLowCutChange={onLowCutChange}
              onLowCutResonanceChange={onLowCutResonanceChange}
              onHighCutChange={onHighCutChange}
              onHighCutResonanceChange={onHighCutResonanceChange}
              onFilterSlopeChange={onFilterSlopeChange}
              onRandomizeParameter={onRandomizeParameter}
              onClearLockedParameter={onClearLockedParameter}
              stepEdit={stepEdit}
            />
          ),
        },
        {
          id: "env",
          label: "Env",
          panel: (
            <ChannelEnvelopeSection
              channelId={channel.id}
              channelName={channelName}
              settings={envelopeSettings}
              playing={playingEnvelope}
              onAttackChange={onAttackChange}
              onDecayChange={onDecayChange}
              onSustainChange={onSustainChange}
              onReleaseChange={onReleaseChange}
              onRandomizeParameter={onRandomizeParameter}
              onClearLockedParameter={onClearLockedParameter}
              stepEdit={stepEdit}
            />
          ),
        },
        {
          id: "lfo",
          label: "LFO",
          panel: (
            <ChannelLfoSection
              channelId={channel.id}
              lfo={lfo}
              onChange={onLfoChange}
            />
          ),
        },
        {
          id: "fx",
          label: "FX",
          panel: (
            <ChannelFxSection
              channelId={channel.id}
              settings={fxSettings}
              playing={playingFx}
              onDelaySendChange={onDelaySendChange}
              onReverbSendChange={onReverbSendChange}
              onPhaserSendChange={onPhaserSendChange}
              onRandomizeParameter={onRandomizeParameter}
              onClearLockedParameter={onClearLockedParameter}
              stepEdit={stepEdit}
            />
          ),
        },
      ]}
    />
  );
}
