"use client";

import type { EnvelopeSettings } from "./ChannelEnvelopeSection";
import ChannelEditor from "./ChannelEditor";
import ChannelEnvelopeSection from "./ChannelEnvelopeSection";
import ChannelFilterSection, {
  type FilterSettings,
} from "./ChannelFilterSection";
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
 * Shared by the Filter and Env tabs: the same step, if any, is open for
 * both, since a lock is a lock on the channel's settings regardless of which
 * tab happens to be showing it.
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

  /** Set while one step is open, so the Filter and Env tabs both scope to it. */
  stepEdit?: StepEditRef;
};

/**
 * What used to be two separate cards — the sample's waveform, and the filter
 * pictured beside its knobs — are now three tabs sharing one, Env joining
 * them as a third: the same envelope `ChannelControls`' Shaping group already
 * has sliders for, extended into a full attack/decay/sustain/release and
 * paired with a picture of its own.
 *
 * One card rather than three, so switching between what the channel is
 * playing, what shape it comes out in, and how its amplitude moves reads as
 * changing what you're looking at rather than moving to a different part of
 * the page — the same trade `SequencerTabsSection` makes for the step grid,
 * patterns and banks below it.
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
  stepEdit,
}: SampleEditorTabsSectionProps) {
  const channelName = channelDisplayName(channel);

  return (
    <div className="border-line flex flex-col gap-4 rounded-md border p-4">
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
        ]}
      />
    </div>
  );
}
