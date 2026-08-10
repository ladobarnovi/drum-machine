"use client";

import type { EnvelopeSettings } from "./ChannelEnvelopeSection";
import ChannelEditor from "./ChannelEditor";
import ChannelEnvelopeSection from "./ChannelEnvelopeSection";
import ChannelFilterSection, {
  type FilterSettings,
} from "./ChannelFilterSection";
import ChannelFxSection, { type FxSettings } from "./ChannelFxSection";
import RailTabs from "@/components/ui/RailTabs";
import {
  channelDisplayName,
  type Channel,
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

  // FX tab — the three send amounts, pictured.
  fxSettings: FxSettings;
  playingFx?: PlayingRef<FxSettings> | null;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
  onPhaserSendChange: (amount: number) => void;

  /** Set while one step is open, so all three of those tabs scope to it. */
  stepEdit?: StepEditRef;
};

/**
 * What used to be two separate cards — the sample's waveform, and the filter
 * pictured beside its knobs — are now four tabs sharing one. Env came third:
 * the same envelope `ChannelControls`' Shaping group already has sliders for,
 * extended into a full attack/decay/sustain/release and paired with a picture
 * of its own. FX came fourth, and unlike the others it took its controls with
 * it rather than mirroring them — the three sends are here and nowhere else.
 *
 * One card rather than four, so switching between what the channel is
 * playing, what shape it comes out in, how its amplitude moves and where it
 * gets sent reads as changing what you're looking at rather than moving to a
 * different part of the page — the same trade `SequencerTabsSection` makes
 * for the step grid, patterns and banks below it.
 */
export default function SampleEditorTabsSection({
  channel,
  onUpload,
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
  fxSettings,
  playingFx,
  onDelaySendChange,
  onReverbSendChange,
  onPhaserSendChange,
  stepEdit,
}: SampleEditorTabsSectionProps) {
  const channelName = channelDisplayName(channel);

  return (
    <RailTabs
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
              channelName={channelName}
              settings={filterSettings}
              filterSlope={filterSlope}
              playing={playingFilter}
              onLowCutChange={onLowCutChange}
              onLowCutResonanceChange={onLowCutResonanceChange}
              onHighCutChange={onHighCutChange}
              onHighCutResonanceChange={onHighCutResonanceChange}
              onFilterSlopeChange={onFilterSlopeChange}
              stepEdit={stepEdit}
            />
          ),
        },
        {
          id: "env",
          label: "Env",
          panel: (
            <ChannelEnvelopeSection
              channelName={channelName}
              settings={envelopeSettings}
              playing={playingEnvelope}
              onAttackChange={onAttackChange}
              onDecayChange={onDecayChange}
              onSustainChange={onSustainChange}
              onReleaseChange={onReleaseChange}
              stepEdit={stepEdit}
            />
          ),
        },
        {
          id: "fx",
          label: "FX",
          panel: (
            <ChannelFxSection
              settings={fxSettings}
              playing={playingFx}
              onDelaySendChange={onDelaySendChange}
              onReverbSendChange={onReverbSendChange}
              onPhaserSendChange={onPhaserSendChange}
              stepEdit={stepEdit}
            />
          ),
        },
      ]}
    />
  );
}
