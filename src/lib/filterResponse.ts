import {
  MAX_FILTER_HZ,
  MIN_FILTER_HZ,
  MIN_RESONANCE,
  clampFrequency,
  filterStages,
  resonanceToQ,
  sliderToFrequency,
} from "./sequencer";

/**
 * The shape of a channel's two cut filters, as something that can be drawn.
 *
 * Worked out here rather than read off the audio graph, and deliberately so:
 * `BiquadFilterNode.getFrequencyResponse` would need an AudioContext, which
 * does not exist until the first gesture, and the nodes it would have to be
 * asked about are built per hit and gone again — so a graph fed from them
 * would be blank on load, blank between hits, and would show whatever the last
 * hit happened to be rather than what the knobs are set to now.
 *
 * These are the analog prototypes the biquads are derived from rather than the
 * digital filters themselves. The two agree everywhere that matters — the
 * corner, the slope, the height of the resonant peak — and part company only
 * in the last octave below Nyquist, where the bilinear transform warps the
 * digital response and the sample rate would have to come into it. For a
 * picture of where the filter is sitting, the prototype is the honest curve and
 * the one that does not change shape on a different sound card.
 */

/** How far above 0 dB the plot reaches: a hair over the tallest peak full
 *  resonance can make, so a maxed corner sits just inside the frame. */
export const MAX_RESPONSE_DB = 20;

/**
 * And how far below. Deep enough that the slope leaving a cutoff reads as a
 * slope rather than as a cliff, shallow enough that the passband — the part
 * anyone is actually reading — is not squeezed into the top eighth of the plot.
 */
export const MIN_RESPONSE_DB = -40;

/**
 * How many points the curve is sampled at across the spectrum.
 *
 * Enough that a resonant peak — which at full Q is only a fraction of an octave
 * wide — is drawn as a peak rather than clipped off by two samples straddling
 * it. They are spread evenly in *slider* position rather than in Hz, so the
 * detail follows the ear and the x axis is the same log scale the cutoff
 * controls already ride.
 */
const CURVE_POINTS = 192;

/** One plotted point: where it is, and how loud the filter is there. */
export type ResponsePoint = {
  hz: number;
  /** Position across the plot, 0..1, on the same log scale the knobs use. */
  position: number;
  db: number;
};

/**
 * The Q a section with nothing dialled into it runs at — Butterworth, taken
 * from the same conversion the audio graph uses so the flat sections of a
 * steep cut are drawn exactly as they sound.
 */
const FLAT_Q = resonanceToQ(MIN_RESONANCE);

/**
 * The magnitude of one two-pole section at `hz`, as a linear gain.
 *
 * One function for both types because they share a denominator — the resonant
 * part, which is what `q` shapes — and differ only in the numerator: a lowpass
 * passes what is below the corner, a highpass what is above, and each is the
 * other read from the far end of the spectrum.
 */
function sectionMagnitude(
  ratio: number,
  q: number,
  type: "highpass" | "lowpass",
): number {
  const squared = ratio * ratio;

  const denominator = Math.sqrt(
    Math.pow(1 - squared, 2) + Math.pow(ratio / q, 2),
  );
  // Only reachable at a corner of exactly 0 Hz, which `clampFrequency` rules
  // out — guarded anyway so a stray value draws a flat line rather than NaN.
  if (denominator === 0) return 1;

  return (type === "lowpass" ? 1 : squared) / denominator;
}

/** The magnitude of a single pole — the 6 dB/oct half of an odd slope. */
function poleMagnitude(ratio: number, type: "highpass" | "lowpass"): number {
  const denominator = Math.sqrt(1 + ratio * ratio);
  return (type === "lowpass" ? 1 : ratio) / denominator;
}

/**
 * A whole cut at `hz`: however many sections its slope is built from, in
 * series, which for magnitudes means multiplied together.
 *
 * The resonance rides the first section alone and the rest run flat, exactly as
 * the voice wires them — so a peak stays one peak of the height the knob says,
 * whether the cut behind it is falling away at 12 dB/oct or 24.
 */
function cutMagnitude(
  hz: number,
  cutoffHz: number,
  q: number,
  type: "highpass" | "lowpass",
  slope: number,
): number {
  // Normalised frequency: 1 is exactly at the corner, which is where the
  // resonant peak sits and where a section is down to `q` times its passband
  // level.
  const ratio = hz / clampFrequency(cutoffHz);
  const { biquads, onePole } = filterStages(slope);

  let gain = 1;
  for (let section = 0; section < biquads; section += 1) {
    gain *= sectionMagnitude(ratio, section === 0 ? q : FLAT_Q, type);
  }
  if (onePole) gain *= poleMagnitude(ratio, type);

  return gain;
}

/**
 * How loud the pair of cuts is at one frequency, in dB.
 *
 * The two are in series in the voice, so their magnitudes multiply — which in
 * dB is the sum, and is why a band squeezed between two nearby cutoffs loses
 * ground to both at once rather than to whichever is closer.
 */
export function responseDbAt(
  hz: number,
  lowCutHz: number,
  lowCutResonance: number,
  highCutHz: number,
  highCutResonance: number,
  slope: number,
): number {
  const gain =
    cutMagnitude(
      hz,
      lowCutHz,
      resonanceToQ(lowCutResonance),
      "highpass",
      slope,
    ) *
    cutMagnitude(
      hz,
      highCutHz,
      resonanceToQ(highCutResonance),
      "lowpass",
      slope,
    );

  // Floored rather than allowed to run off to -Infinity where both cuts have
  // shut the band down completely, so the path has a number to draw.
  return Math.max(20 * Math.log10(Math.max(gain, 1e-6)), MIN_RESPONSE_DB);
}

/**
 * The whole curve, from MIN_FILTER_HZ to MAX_FILTER_HZ.
 *
 * Each point carries its own position across the plot as well as its frequency,
 * so the caller draws the path without having to know how the x axis is scaled.
 */
export function filterResponseCurve(
  lowCutHz: number,
  lowCutResonance: number,
  highCutHz: number,
  highCutResonance: number,
  slope: number,
): ResponsePoint[] {
  return Array.from({ length: CURVE_POINTS }, (_, index) => {
    const position = index / (CURVE_POINTS - 1);
    // The ends are pinned exactly, so the curve reaches both edges of the frame
    // rather than stopping a rounding error short of them.
    const hz =
      index === 0
        ? MIN_FILTER_HZ
        : index === CURVE_POINTS - 1
          ? MAX_FILTER_HZ
          : sliderToFrequency(position);

    return {
      hz,
      position,
      db: responseDbAt(
        hz,
        lowCutHz,
        lowCutResonance,
        highCutHz,
        highCutResonance,
        slope,
      ),
    };
  });
}

/**
 * How far up the plot a level sits, as a fraction — 0 at the top of the frame,
 * 1 at the bottom, which is the direction SVG counts in.
 */
export function responseDepth(db: number): number {
  const span = MAX_RESPONSE_DB - MIN_RESPONSE_DB;
  return Math.min(Math.max((MAX_RESPONSE_DB - db) / span, 0), 1);
}
