"use client";

import FilterGraph from "./FilterGraph";
import RotaryKnob from "@/components/ui/RotaryKnob";
import {
  FILTER_SLOPES,
  FILTER_SLOPE_LABELS,
  MAX_RESONANCE,
  MIN_RESONANCE,
  formatFrequency,
  formatResonance,
  frequencyToSlider,
  isHighCutBypassed,
  isLowCutBypassed,
  sliderToFrequency,
  type FilterSlope,
  type LockableParameter,
  type StepLocks,
} from "@/lib/sequencer";

/**
 * What the section is given while a single step is open for editing — the same
 * shape, and the same meaning, as `ChannelControls`' own `stepEdit`: the knobs
 * are the same controls either way, and this only says what they are pointed at.
 */
type FilterStepEdit = {
  /** Which step is open, counted from 0. */
  index: number;
  /** Which of the parameters this step overrides. */
  locks: StepLocks;
  onClearLock: (key: LockableParameter) => void;
};

type ChannelFilterSectionProps = {
  /** Whose filter this is, so the card says which channel it belongs to. */
  channelName: string;
  lowCutHz: number;
  lowCutResonance: number;
  highCutHz: number;
  highCutResonance: number;
  /** How steeply both cuts roll off. Always the channel's, never a step's. */
  filterSlope: FilterSlope;
  onLowCutChange: (hz: number) => void;
  onLowCutResonanceChange: (amount: number) => void;
  onHighCutChange: (hz: number) => void;
  onHighCutResonanceChange: (amount: number) => void;
  onFilterSlopeChange: (slope: FilterSlope) => void;
  /** Set while one step is being edited; absent while the channel is. */
  stepEdit?: FilterStepEdit;
};

/**
 * The selected channel's filter, as a picture with its four controls under it.
 *
 * The same two cutoffs the controls panel already has sliders for, plus a
 * resonance for each — deliberately the same settings rather than a second
 * filter of their own, so this card and the Filter group in the panel are two
 * views of one thing and moving either moves the other.
 *
 * The values arrive already resolved, exactly as the controls panel's do: while
 * a step is open the caller hands down that step's overrides in place of the
 * channel's own, so the graph draws what the step is about to be played with.
 */
export default function ChannelFilterSection({
  channelName,
  lowCutHz,
  lowCutResonance,
  highCutHz,
  highCutResonance,
  filterSlope,
  onLowCutChange,
  onLowCutResonanceChange,
  onHighCutChange,
  onHighCutResonanceChange,
  onFilterSlopeChange,
  stepEdit,
}: ChannelFilterSectionProps) {
  /**
   * What a lockable knob needs to show its state. Handed to every one of them
   * while a step is open — including the ones with nothing locked, since it is
   * passing the clear handler at all that reserves the row under the readout
   * and keeps the knobs from shifting as locks come and go.
   */
  const lockProps = (key: LockableParameter) =>
    stepEdit
      ? {
          locked: stepEdit.locks[key] !== undefined,
          onClearLock: () => stepEdit.onClearLock(key),
        }
      : {};

  return (
    <div className="border-line flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-xs font-semibold">Filter</h2>

        {/* Which channel is being shaped, since this card sits between two
            others that both name it and would otherwise be the only clue. */}
        <p className="text-muted text-xs">{channelName}</p>

        {/* Only the four knobs below follow the open step; the slope beside
            them is the channel's whatever is open, so which of the two a
            control is has to be said rather than inferred from the card. */}
        {stepEdit && (
          <p className="text-select text-xs">
            {`Knobs: step ${stepEdit.index + 1} only`}
          </p>
        )}

        {/*
          How steep the cuts are. A switch rather than a knob, and a short list
          rather than a range, because a slope is not a thing that can be turned
          continuously: it is 6 dB/oct per pole and there is no such thing as
          part of a pole, so what is on offer is two poles, three, or four.
        */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px]">
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

      <FilterGraph
        lowCutHz={lowCutHz}
        lowCutResonance={lowCutResonance}
        highCutHz={highCutHz}
        highCutResonance={highCutResonance}
        filterSlope={filterSlope}
      />

      {/*
        Each cut beside its own resonance, rather than the two cutoffs together
        and the two resonances after them: a resonance means nothing on its own
        — it is a property of the corner next to it — and pairing them is what
        makes that readable without a legend.
      */}
      <div className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-4 sm:gap-x-8">
        {/* The cutoffs ride the same 0..1 log scale their sliders do, so the
            knob's travel matches the panel's and the readout shows the real
            frequency. */}
        <RotaryKnob
          label="HPF"
          ariaLabel="Low cut frequency"
          min={0}
          max={1}
          step={0.001}
          value={frequencyToSlider(lowCutHz)}
          readout={
            isLowCutBypassed(lowCutHz) ? "Off" : formatFrequency(lowCutHz)
          }
          onChange={(position) => onLowCutChange(sliderToFrequency(position))}
          {...lockProps("lowCutHz")}
        />

        <RotaryKnob
          label="HPF Res"
          ariaLabel="Low cut resonance"
          min={MIN_RESONANCE}
          max={MAX_RESONANCE}
          step={0.01}
          value={lowCutResonance}
          readout={formatResonance(lowCutResonance)}
          onChange={onLowCutResonanceChange}
          {...lockProps("lowCutResonance")}
        />

        <RotaryKnob
          label="LPF"
          ariaLabel="High cut frequency"
          min={0}
          max={1}
          step={0.001}
          value={frequencyToSlider(highCutHz)}
          readout={
            isHighCutBypassed(highCutHz) ? "Off" : formatFrequency(highCutHz)
          }
          onChange={(position) => onHighCutChange(sliderToFrequency(position))}
          {...lockProps("highCutHz")}
        />

        <RotaryKnob
          label="LPF Res"
          ariaLabel="High cut resonance"
          min={MIN_RESONANCE}
          max={MAX_RESONANCE}
          step={0.01}
          value={highCutResonance}
          readout={formatResonance(highCutResonance)}
          onChange={onHighCutResonanceChange}
          {...lockProps("highCutResonance")}
        />
      </div>
    </div>
  );
}
