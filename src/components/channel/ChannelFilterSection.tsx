"use client";

import {
  usePlayheadFollow,
  type PlayingStepRef,
  type StepEditRef,
} from "@/hooks/usePlayheadFollow";

import FilterGraph from "./FilterGraph";
import RotaryKnob from "@/components/ui/RotaryKnob";
import { channelMidiMapId } from "@/lib/midiParameters";
import {
  FILTER_SLOPES,
  FILTER_SLOPE_LABELS,
  MAX_RESONANCE,
  MIN_RESONANCE,
  clampResonance,
  formatFrequency,
  formatResonance,
  frequencyToSlider,
  isHighCutBypassed,
  isLowCutBypassed,
  randomInRange,
  sliderToFrequency,
  type FilterSlope,
  type LockableParameter,
} from "@/lib/sequencer";

/**
 * The four values this card shows, whoever they belong to.
 *
 * A type of its own because the card now has two sets of them in hand at once —
 * what the knobs edit, and what the channel is sounding right now — and two
 * parallel runs of four loose props would leave every read site working out
 * which run it was looking at.
 */
export type FilterSettings = {
  lowCutHz: number;
  lowCutResonance: number;
  highCutHz: number;
  highCutResonance: number;
};

/**
 * What the section is given while a single step is open for editing — the same
 * shape, and the same meaning, as `ChannelControls`' own `stepEdit`: the knobs
 * are the same controls either way, and this only says what they are pointed at.
 */
/**
 * The hit the channel is sounding right now, while the transport runs — the
 * step the card follows rather than one it edits.
 */
type ChannelFilterSectionProps = {
  /** Whose filter this is, so a MIDI mapping binds to that channel's knobs
   *  rather than to whichever channel happens to be selected. */
  channelId: string;
  /** What the knobs edit: the channel's own, or an open step's. */
  settings: FilterSettings;
  /** How steeply both cuts roll off. Always the channel's, never a step's. */
  filterSlope: FilterSlope;
  /**
   * What is currently being heard, or null while the transport is stopped —
   * or while it is running and the channel has no hits to sound.
   */
  playing?: PlayingStepRef<FilterSettings> | null;
  onLowCutChange: (hz: number) => void;
  onLowCutResonanceChange: (amount: number) => void;
  onHighCutChange: (hz: number) => void;
  onHighCutResonanceChange: (amount: number) => void;
  onFilterSlopeChange: (slope: FilterSlope) => void;
  /** Rerolls one of the four knobs above across every active step. */
  onRandomizeParameter: (key: LockableParameter, randomize: () => number) => void;
  /** Drops every override of one of the four knobs above, pattern-wide. */
  onClearLockedParameter: (key: LockableParameter) => void;
  /** Set while one step is being edited; absent while the channel is. */
  stepEdit?: StepEditRef;
};

/**
 * The selected channel's filter, as a picture with its four controls under it.
 *
 * The same two cutoffs the controls panel already has sliders for, plus a
 * resonance for each — deliberately the same settings rather than a second
 * filter of their own, so this card and the Filter group in the panel are two
 * views of one thing and moving either moves the other.
 *
 * What is shown, though, is not always what is edited. While the transport is
 * running the card follows the hit being heard, locks and all, so a pattern
 * that sweeps its cutoff step by step can be watched doing it rather than
 * merely known about. The knobs go on writing what they always wrote — the
 * channel, or the step held open — and the header says which of the three
 * things is on screen, since a card that quietly showed one and wrote the other
 * would be a trap.
 *
 * No card of its own, and no "Filter" heading either: this now shares both
 * with the Sample and Env tabs it sits alongside in `SampleEditorTabsSection`,
 * the same way `ChannelEditor`'s `showSequencerOnly` shares its card with
 * Patterns and Banks, and the tab strip already says which of the three this
 * is.
 */
export default function ChannelFilterSection({
  channelId,
  settings,
  filterSlope,
  playing,
  onLowCutChange,
  onLowCutResonanceChange,
  onHighCutChange,
  onHighCutResonanceChange,
  onFilterSlopeChange,
  onRandomizeParameter,
  onClearLockedParameter,
  stepEdit,
}: ChannelFilterSectionProps) {
  const { shown, lockProps, groupProps } = usePlayheadFollow({
    settings,
    playing: playing ?? null,
    stepEdit,
  });

  return (
    <div className="flex flex-col gap-4">
      <FilterGraph
        lowCutHz={shown.lowCutHz}
        lowCutResonance={shown.lowCutResonance}
        highCutHz={shown.highCutHz}
        highCutResonance={shown.highCutResonance}
        filterSlope={filterSlope}
      />

      {/*
        Each cut beside its own resonance, rather than the two cutoffs together
        and the two resonances after them: a resonance means nothing on its own
        — it is a property of the corner next to it — and pairing them is what
        makes that readable without a legend.

        The focus handlers sit on the row rather than on the card, so working a
        knob holds the display still while pressing a slope button — which
        changes nothing a step can lock — leaves it following.
      */}
      <div
        {...groupProps}
        className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-4 sm:gap-x-8"
      >
        {/* The cutoffs ride the same 0..1 log scale their sliders do, so the
            knob's travel matches the panel's and the readout shows the real
            frequency. */}
        <RotaryKnob
          label="HPF"
          ariaLabel="Low cut frequency"
          min={0}
          max={1}
          step={0.001}
          value={frequencyToSlider(shown.lowCutHz)}
          readout={
            isLowCutBypassed(shown.lowCutHz)
              ? "Off"
              : formatFrequency(shown.lowCutHz)
          }
          onChange={(position) => onLowCutChange(sliderToFrequency(position))}
          {...lockProps("lowCutHz")}
          midiMapId={channelMidiMapId(channelId, "filter:lowCutHz")}
          onRandomize={() =>
            onRandomizeParameter("lowCutHz", () =>
              sliderToFrequency(Math.random()),
            )
          }
          onClearLocks={() => onClearLockedParameter("lowCutHz")}
        />

        <RotaryKnob
          label="HPF Res"
          ariaLabel="Low cut resonance"
          min={MIN_RESONANCE}
          max={MAX_RESONANCE}
          step={0.01}
          value={shown.lowCutResonance}
          readout={formatResonance(shown.lowCutResonance)}
          onChange={onLowCutResonanceChange}
          {...lockProps("lowCutResonance")}
          midiMapId={channelMidiMapId(channelId, "filter:lowCutResonance")}
          onRandomize={() =>
            onRandomizeParameter("lowCutResonance", () =>
              clampResonance(randomInRange(MIN_RESONANCE, MAX_RESONANCE)),
            )
          }
          onClearLocks={() => onClearLockedParameter("lowCutResonance")}
        />

        <RotaryKnob
          label="LPF"
          ariaLabel="High cut frequency"
          min={0}
          max={1}
          step={0.001}
          value={frequencyToSlider(shown.highCutHz)}
          readout={
            isHighCutBypassed(shown.highCutHz)
              ? "Off"
              : formatFrequency(shown.highCutHz)
          }
          onChange={(position) => onHighCutChange(sliderToFrequency(position))}
          {...lockProps("highCutHz")}
          midiMapId={channelMidiMapId(channelId, "filter:highCutHz")}
          onRandomize={() =>
            onRandomizeParameter("highCutHz", () =>
              sliderToFrequency(Math.random()),
            )
          }
          onClearLocks={() => onClearLockedParameter("highCutHz")}
        />

        <RotaryKnob
          label="LPF Res"
          ariaLabel="High cut resonance"
          min={MIN_RESONANCE}
          max={MAX_RESONANCE}
          step={0.01}
          value={shown.highCutResonance}
          readout={formatResonance(shown.highCutResonance)}
          onChange={onHighCutResonanceChange}
          {...lockProps("highCutResonance")}
          midiMapId={channelMidiMapId(channelId, "filter:highCutResonance")}
          onRandomize={() =>
            onRandomizeParameter("highCutResonance", () =>
              clampResonance(randomInRange(MIN_RESONANCE, MAX_RESONANCE)),
            )
          }
          onClearLocks={() => onClearLockedParameter("highCutResonance")}
        />
      </div>

      {/*
        How steep the cuts are. A switch rather than a knob, and a short list
        rather than a range, because a slope is not a thing that can be turned
        continuously: it is 6 dB/oct per pole and there is no such thing as
        part of a pole, so what is on offer is two poles, three, or four.

        Below the knobs rather than beside the header: it is a channel-wide
        setting that shapes what the four knobs above it are turning, so it
        reads as a footer to them rather than competing with the status text
        for the top row.
      */}
      <div className="flex items-center justify-center gap-1.5 text-[10px]">
        <span className="text-muted">dB/oct</span>

        {FILTER_SLOPES.map((slope) => (
          <button
            key={slope}
            type="button"
            onClick={() => onFilterSlopeChange(slope)}
            aria-pressed={filterSlope === slope}
            aria-label={`${slope} decibels per octave`}
            className={`w-7 rounded border px-2 py-0.5 font-medium transition-colors ${
              filterSlope === slope
                ? "border-accent bg-accent text-on-accent"
                : "border-edge hover:bg-raised"
            }`}
          >
            {FILTER_SLOPE_LABELS[slope]}
          </button>
        ))}
      </div>
    </div>
  );
}
