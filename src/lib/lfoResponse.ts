import { clampLfoAmount, clampLfoRate, lfoRateToSlider } from "./sequencer";
import type { LfoShape } from "./sequencer";

/**
 * What a channel's LFO is putting out, as something that can be drawn — worked
 * out here rather than read off the audio graph, for the same reason
 * `envelopeResponse.ts` is: the modulation source is either built per voice and
 * gone again with it, or shared across a channel and only alive while something
 * on that channel is sounding, so a picture fed from one would be blank between
 * hits and blank altogether while the transport is stopped.
 *
 * The shapes are the ones the oscillator types actually produce, at the phase
 * they actually start from — a square that is high for its first half, a saw
 * that begins at rest and jumps at its midpoint — so the drawn wave is the wave
 * the destination rides rather than a stand-in for it. Sample-and-hold is the
 * exception in kind but not in behaviour: no oscillator produces it, so it is
 * one held value per cycle here just as it is one held value per cycle there.
 */

/**
 * One plotted point: where it is across the plot, and how far the LFO has swung
 * there — -1 at the bottom of its travel, +1 at the top, with the destination's
 * own dialled-in value sitting at 0.
 */
export type LfoPoint = {
  /** Position across the plot, 0..1. */
  position: number;
  /** Swing at that point, -1..1. */
  level: number;
};

/**
 * How many cycles the plot shows at the slowest rate and at the fastest.
 *
 * Whole numbers on purpose, exactly as `NOTCH_COUNT` in `fxResponse` is: the
 * curve then ends where it began, so `LfoGraph` can lay two copies end to end
 * and scroll them past without a seam where the pass restarts.
 */
const MIN_CYCLES = 1;
const MAX_CYCLES = 8;

/**
 * How finely each cycle of a continuously varying shape is sampled — fine
 * enough that a sine reads as a curve rather than as the polygon it is.
 *
 * The two shapes that hold and jump are not sampled at all: at one cycle across
 * the plot even this many samples would lay a square's edge over fifteen units
 * of width and draw it leaning, so those get their corners placed exactly
 * instead. See `steppedCurve`.
 */
const POINTS_PER_CYCLE = 64;

/**
 * How long one plot width takes to scroll past, in seconds, at its bounds.
 *
 * The real figure is honest arithmetic — the cycles on screen divided by the
 * rate — and it only needs holding back at the two ends: at 20 Hz eight cycles
 * cross in four tenths of a second, which is a blur rather than a rate, and at
 * 0.1 Hz a single cycle would take a minute and a half to arrive.
 */
const MIN_SCROLL_SECONDS = 0.6;
const MAX_SCROLL_SECONDS = 8;

/**
 * How many cycles of the shape the plot draws at a given rate.
 *
 * Read off the rate's slider position rather than off the rate itself, so the
 * count climbs evenly as the knob turns — the rate range spans two hundred to
 * one, and taken linearly the whole slow half of it would draw the same single
 * cycle.
 */
export function lfoCyclesShown(rateHz: number): number {
  const position = lfoRateToSlider(rateHz);
  return Math.round(MIN_CYCLES + position * (MAX_CYCLES - MIN_CYCLES));
}

/**
 * How long the wave takes to walk one plot width, for the free-running mode's
 * scroll. Retriggered, nothing scrolls at all — see `LfoGraph`.
 */
export function lfoScrollSeconds(rateHz: number): number {
  const seconds = lfoCyclesShown(rateHz) / clampLfoRate(rateHz);
  return Math.min(Math.max(seconds, MIN_SCROLL_SECONDS), MAX_SCROLL_SECONDS);
}

/**
 * The wave across one plot width: a whole number of cycles of `shape`, swung as
 * far as `amount` asks for.
 *
 * The amount scales the shape rather than clipping or offsetting it, which is
 * what the amount actually does — it is the depth of the swing, and a swing of
 * nothing is the flat line down the middle this returns at zero.
 */
export function lfoCurve(
  shape: LfoShape,
  rateHz: number,
  amount: number,
): LfoPoint[] {
  const cycles = lfoCyclesShown(rateHz);
  const depth = clampLfoAmount(amount);

  const shapePoints =
    shape === "square" || shape === "random"
      ? steppedCurve(shape, cycles)
      : sampledCurve(shape, cycles);

  return shapePoints.map((point) => ({
    position: point.position,
    level: depth * point.level,
  }));
}

/** The shapes that hold a level and jump between holds, and the rest. */
type SteppedShape = Extract<LfoShape, "square" | "random">;
type SmoothShape = Exclude<LfoShape, SteppedShape>;

/** The shapes that vary continuously, at ±1, taken at even intervals. */
function sampledCurve(shape: SmoothShape, cycles: number): LfoPoint[] {
  const points = cycles * POINTS_PER_CYCLE + 1;

  return Array.from({ length: points }, (_, index) => {
    const position = index / (points - 1);
    const phase = (position * cycles) % 1;
    return { position, level: levelAtPhase(shape, phase) };
  });
}

/**
 * The two shapes that hold a level and jump, at ±1 — as the corners themselves
 * rather than as samples of them.
 *
 * Every hold contributes the two ends of its own flat, so consecutive points
 * share a position wherever the shape jumps and the edge comes out exactly
 * vertical at any rate. The closing point is the run-up to the next cycle,
 * which is what puts the edge back at the far side of the plot: without it the
 * two copies `LfoGraph` lays end to end would meet at a level change with no
 * riser drawn between them, and the scroll would show one broken edge per pass.
 */
function steppedCurve(shape: SteppedShape, cycles: number): LfoPoint[] {
  // A square is two holds per cycle, sample-and-hold one; both are flat between
  // their own boundaries, so the whole shape is a list of levels held in turn.
  const holdsPerCycle = shape === "square" ? 2 : 1;
  const holds = cycles * holdsPerCycle;

  // A square's holds simply alternate, high for the first half of each cycle
  // and low for the second; sample-and-hold's are a fresh value per cycle,
  // wrapped so the closing point below asks for the one it opened with.
  const levelOfHold = (hold: number) =>
    shape === "square" ? (hold % 2 === 0 ? 1 : -1) : held(hold % cycles);

  const points: LfoPoint[] = [];

  for (let hold = 0; hold < holds; hold += 1) {
    const level = levelOfHold(hold);
    points.push({ position: hold / holds, level });
    points.push({ position: (hold + 1) / holds, level });
  }

  points.push({ position: 1, level: levelOfHold(0) });

  return points;
}

/** Where a continuously varying shape sits a given fraction through its own
 *  cycle, ±1. */
function levelAtPhase(shape: SmoothShape, phase: number): number {
  switch (shape) {
    case "sine":
      return Math.sin(2 * Math.PI * phase);
    // Both of these start at rest and rise, as their oscillators do — the
    // triangle turning at the quarter and three-quarter points, the saw
    // climbing to its crest by the midpoint and jumping to its trough there.
    case "triangle":
      return 4 * Math.abs(((phase + 0.75) % 1) - 0.5) - 1;
    case "sawtooth":
      return 2 * ((phase + 0.5) % 1) - 1;
  }
}

/**
 * The value sample-and-hold holds for a given cycle.
 *
 * Hashed from the cycle's number rather than actually drawn at random — the
 * same fixed-scatter trick `fxResponse` uses, and for the same reason: a plot
 * that reshuffled itself on every keystroke would read as noise in the UI
 * rather than as a picture of a shape. The audio side is free to be genuinely
 * random, since nobody is matching a heard value against a drawn one.
 */
function held(cycle: number): number {
  const value = Math.sin((cycle + 1) * 12.9898) * 43758.5453;
  return 2 * (value - Math.floor(value)) - 1;
}
