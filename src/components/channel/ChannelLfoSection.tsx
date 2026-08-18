"use client";

import LfoGraph from "./LfoGraph";
import RotaryKnob from "@/components/ui/RotaryKnob";
import { channelMidiMapId } from "@/lib/midiParameters";
import {
  LFO_DESTINATIONS,
  LFO_DESTINATION_LABELS,
  LFO_SHAPES,
  LFO_SHAPE_LABELS,
  MAX_LFO_AMOUNT,
  MIN_LFO_AMOUNT,
  clampLfoAmount,
  clampLfoDestination,
  clampLfoShape,
  formatLfoAmount,
  formatLfoRate,
  lfoRateToSlider,
  sliderToLfoRate,
  type ChannelLfo,
} from "@/lib/sequencer";

type ChannelLfoSectionProps = {
  /** Whose LFO this is, so a MIDI mapping binds to that channel's knobs
   *  rather than to whichever channel happens to be selected. */
  channelId: string;
  /** The selected channel's modulation source. */
  lfo: ChannelLfo;
  onChange: (lfo: ChannelLfo) => void;
};

/**
 * How the selected channel's parameters *move*, as a picture with the controls
 * that shape it underneath — where the three tabs either side of it set where a
 * parameter sits, this one sets where it goes.
 *
 * The whole LFO is here and nowhere else, the way the FX tab's sends are: it
 * used to be an accordion of its own down in the controls column, and a wave
 * belongs beside a picture of itself rather than two panels away from one.
 *
 * The one thing this tab does not carry that its neighbours do is the step
 * business — no locks, no following the playhead. That is not an omission but
 * `LOCKABLE_PARAMETERS` showing through: free running shares one set of nodes
 * across every hit on the channel, so an LFO has nothing per-step to give and a
 * step has nothing of it to override.
 */
export default function ChannelLfoSection({
  channelId,
  lfo,
  onChange,
}: ChannelLfoSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <LfoGraph lfo={lfo} />

      {/* Rate and amount are the two continuous values, so they get the knobs
          the neighbouring tabs give theirs; everything else the LFO has is a
          choice from a short list and sits in the band below. */}
      <div className="grid grid-cols-2 justify-items-center gap-x-2 gap-y-4 sm:gap-x-8">
        {/* Rate rides the same 0..1 log scale its slider always has, so the
            knob's travel matches and the readout shows the real rate. */}
        <RotaryKnob
          label="Rate"
          ariaLabel="LFO rate"
          min={0}
          max={1}
          step={0.001}
          value={lfoRateToSlider(lfo.rateHz)}
          readout={formatLfoRate(lfo.rateHz)}
          onChange={(position) =>
            onChange({ ...lfo, rateHz: sliderToLfoRate(position) })
          }
          midiMapId={channelMidiMapId(channelId, "lfo:rate")}
        />

        {/* The readout is in the destination's own unit, so the same knob reads
            as semitones, octaves or a depth depending on where it is pointed. */}
        <RotaryKnob
          label="Amount"
          ariaLabel="LFO amount"
          min={MIN_LFO_AMOUNT}
          max={MAX_LFO_AMOUNT}
          step={0.01}
          value={lfo.amount}
          readout={formatLfoAmount(lfo)}
          onChange={(value) =>
            onChange({ ...lfo, amount: clampLfoAmount(value) })
          }
          midiMapId={channelMidiMapId(channelId, "lfo:amount")}
        />
      </div>

      {/*
        The three choices, as the lists they were before this tab existed: none
        of them is a thing that can be turned, and between them they decide what
        the two knobs above are dialling in — which is why they read as one band
        across the foot of the card rather than as three separate rows.
      */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
        <ChoiceSelect
          label="Shape"
          ariaLabel="LFO shape"
          value={lfo.shape}
          options={LFO_SHAPES.map((shape) => ({
            value: shape,
            label: LFO_SHAPE_LABELS[shape],
          }))}
          onSelect={(value) =>
            onChange({ ...lfo, shape: clampLfoShape(value) })
          }
        />

        <ChoiceSelect
          label="Target"
          ariaLabel="LFO destination"
          value={lfo.destination}
          options={LFO_DESTINATIONS.map((destination) => ({
            value: destination,
            label: LFO_DESTINATION_LABELS[destination],
          }))}
          onSelect={(value) =>
            onChange({ ...lfo, destination: clampLfoDestination(value) })
          }
        />

        {/*
          Off, and the two modes, as one three-way list: whether the LFO runs at
          all and whether its shape belongs to the hit or to the channel are one
          decision in practice — you come to this list to answer "what is this
          LFO doing", and "nothing" is one of the answers.

          Switching off leaves the mode where it was rather than resetting it,
          so a channel switched off and back on comes back the way it went.
        */}
        <ChoiceSelect
          label="Mode"
          ariaLabel="LFO mode"
          value={!lfo.enabled ? "off" : lfo.retrigger ? "retrigger" : "free"}
          options={[
            { value: "off", label: "Off" },
            { value: "retrigger", label: "Retrigger" },
            { value: "free", label: "Free running" },
          ]}
          onSelect={(value) =>
            onChange({
              ...lfo,
              enabled: value !== "off",
              retrigger:
                value === "off" ? lfo.retrigger : value === "retrigger",
            })
          }
        />
      </div>
    </div>
  );
}

type ChoiceSelectProps = {
  label: string;
  /** Spelt out for screen readers, where the visible label is a shorthand. */
  ariaLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
};

/**
 * One labelled list, exactly one of whose options is taken.
 *
 * The label sits above its list rather than beside it, so three of these side
 * by side line their lists up as one band and each one gets the card's full
 * column width to show a value in — a Mode reading "Free running" beside its
 * own label would be the widest thing on the card.
 *
 * Small caps for the label, matching the tag in the corner of the plot above:
 * these name a control rather than say anything themselves, and reading as
 * captions is what keeps the values the loudest thing in the band.
 */
function ChoiceSelect({
  label,
  ariaLabel,
  value,
  options,
  onSelect,
}: ChoiceSelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted text-[9px] font-semibold tracking-wide uppercase">
        {label}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onSelect(event.target.value)}
          aria-label={ariaLabel}
          // Stripped of the platform's own arrow so the control is the same
          // shape on every system, and given one of its own below — the border
          // picking up the accent on hover and on focus the way the knobs above
          // light their arcs.
          className="border-edge bg-field hover:border-accent w-full cursor-pointer appearance-none rounded border py-1.5 pr-7 pl-2.5 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <svg
          viewBox="0 0 10 6"
          aria-hidden
          className="text-muted pointer-events-none absolute top-1/2 right-2.5 h-1.5 w-2.5 -translate-y-1/2"
        >
          <path
            d="M1 1 L5 5 L9 1"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
