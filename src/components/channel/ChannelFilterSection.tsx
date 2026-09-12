"use client";

import {
  usePlayheadFollow,
  type PlayingStepRef,
  type StepEditRef,
} from "@/hooks/usePlayheadFollow";

import ChoiceSelect from "./ChoiceSelect";
import FilterGraph from "./FilterGraph";
import ControlSlider from "@/components/ui/ControlSlider";
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
 * what the sliders edit, and what the channel is sounding right now — and two
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
 * shape, and the same meaning, as `ChannelControls`' own `stepEdit`: the sliders
 * are the same controls either way, and this only says what they are pointed at.
 */
/**
 * The hit the channel is sounding right now, while the transport runs — the
 * step the card follows rather than one it edits.
 */
type ChannelFilterSectionProps = {
  /** Whose filter this is, so a MIDI mapping binds to that channel's sliders
   *  rather than to whichever channel happens to be selected. */
  channelId: string;
  /** What the sliders edit: the channel's own, or an open step's. */
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
  /** Rerolls one of the four sliders above across every active step. */
  onRandomizeParameter: (
    key: LockableParameter,
    randomize: () => number,
  ) => void;
  /** Drops every override of one of the four sliders above, pattern-wide. */
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
 * merely known about. The sliders go on writing what they always wrote — the
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
    // The picture on the left and what sets it on the right, which is the
    // arrangement every one of these tabs now takes: the curve is the wide
    // thing and the parameters are a column of rows, so stacking them would
    // leave the rows as wide as the plot and half of each one empty.
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
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
        slider holds the display still while pressing a slope button — which
        changes nothing a step can lock — leaves it following.
      */}
      <div className="flex flex-col gap-4">
        <div {...groupProps} className="flex flex-col gap-4">
          {/* The cutoffs ride a 0..1 log scale rather than the frequency itself,
            so the travel is even across the range and the readout shows the
            real frequency. */}
          <ControlSlider
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

          <ControlSlider
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

          <ControlSlider
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
            onChange={(position) =>
              onHighCutChange(sliderToFrequency(position))
            }
            {...lockProps("highCutHz")}
            midiMapId={channelMidiMapId(channelId, "filter:highCutHz")}
            onRandomize={() =>
              onRandomizeParameter("highCutHz", () =>
                sliderToFrequency(Math.random()),
              )
            }
            onClearLocks={() => onClearLockedParameter("highCutHz")}
          />

          <ControlSlider
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
          How steep the cuts are. A list rather than a range, because a slope is
          not a thing that can be set continuously: it is 6 dB/oct per pole and
          there is no such thing as part of a pole, so what is on offer is two
          poles, three, or four.

          At the foot of the column rather than beside the header: it is a
          channel-wide setting that shapes what the four rows above it are
          setting, so it reads as a footer to them rather than competing with
          the status text for the top row. Outside the focus group on purpose —
          it locks nothing, so setting it leaves the display following the
          playhead.
        */}
        <ChoiceSelect
          label="Slope — shared by both cuts"
          ariaLabel="Filter slope in decibels per octave"
          value={String(filterSlope)}
          options={FILTER_SLOPES.map((slope) => ({
            value: String(slope),
            label: `${FILTER_SLOPE_LABELS[slope]} dB/oct`,
          }))}
          onSelect={(value) =>
            onFilterSlopeChange(Number(value) as FilterSlope)
          }
        />
      </div>
    </div>
  );
}
