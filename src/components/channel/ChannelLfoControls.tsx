"use client";

import ControlSlider from "@/components/ui/ControlSlider";
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

type ChannelLfoControlsProps = {
  lfo: ChannelLfo;
  onChange: (lfo: ChannelLfo) => void;
};

/**
 * The selected channel's modulation source, boxed off from the controls above
 * it: those set where a parameter sits, and this one sets how it moves, which
 * is a different enough thing to be worth reading separately.
 *
 * Mode decides whether the shape belongs to the hit or to the channel:
 * retriggered, every hit sweeps identically; free, one continuous LFO runs
 * underneath the pattern and each hit takes it wherever it has got to.
 */
export default function ChannelLfoControls({
  lfo,
  onChange,
}: ChannelLfoControlsProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold">LFO</h2>

        <button
          type="button"
          onClick={() => onChange({ ...lfo, enabled: !lfo.enabled })}
          aria-pressed={lfo.enabled}
          aria-label="Channel LFO"
          className={`rounded border px-2 py-0.5 text-[10px] leading-4 font-semibold transition-colors ${
            lfo.enabled
              ? "border-accent bg-accent text-on-accent"
              : "border-edge text-muted hover:bg-raised"
          }`}
        >
          {lfo.enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {/* The three choices first: between them they decide what the two
            sliders after them are dialling in. */}
        <label className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0">Shape</span>
          <select
            value={lfo.shape}
            onChange={(event) =>
              onChange({ ...lfo, shape: clampLfoShape(event.target.value) })
            }
            aria-label="LFO shape"
            className="border-edge bg-field w-32 rounded border px-2 py-1"
          >
            {LFO_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {LFO_SHAPE_LABELS[shape]}
              </option>
            ))}
          </select>
        </label>

        {/*
          Retrigger is a two-way choice rather than a switch on the shape, so
          it reads as one decision in the same list the others are made from.
        */}
        <label className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0">Mode</span>
          <select
            value={lfo.retrigger ? "retrigger" : "free"}
            onChange={(event) =>
              onChange({
                ...lfo,
                retrigger: event.target.value === "retrigger",
              })
            }
            aria-label="LFO mode"
            className="border-edge bg-field w-32 rounded border px-2 py-1"
          >
            <option value="retrigger">Retrigger</option>
            <option value="free">Free running</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0">Target</span>
          <select
            value={lfo.destination}
            onChange={(event) =>
              onChange({
                ...lfo,
                destination: clampLfoDestination(event.target.value),
              })
            }
            aria-label="LFO destination"
            className="border-edge bg-field w-32 rounded border px-2 py-1"
          >
            {LFO_DESTINATIONS.map((destination) => (
              <option key={destination} value={destination}>
                {LFO_DESTINATION_LABELS[destination]}
              </option>
            ))}
          </select>
        </label>

        {/* Rate rides a 0..1 log scale, so the readout shows the real rate. */}
        <ControlSlider
          label="Rate"
          min={0}
          max={1}
          step={0.001}
          value={lfoRateToSlider(lfo.rateHz)}
          readout={formatLfoRate(lfo.rateHz)}
          onChange={(position) =>
            onChange({ ...lfo, rateHz: sliderToLfoRate(position) })
          }
        />

        {/* The readout is in the target's own unit, so the same slider reads as
            semitones, octaves, or a depth depending on where it is pointed. */}
        <ControlSlider
          label="Amount"
          min={MIN_LFO_AMOUNT}
          max={MAX_LFO_AMOUNT}
          step={0.01}
          value={lfo.amount}
          readout={formatLfoAmount(lfo)}
          onChange={(value) =>
            onChange({ ...lfo, amount: clampLfoAmount(value) })
          }
        />
      </div>
    </section>
  );
}
