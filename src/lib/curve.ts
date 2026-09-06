/**
 * The shape shared by everything the graphs draw.
 *
 * The envelope, the LFO and the FX tiles each declared this type, each sampled
 * it the same way, and two of them carried the same hash. What they compute is
 * genuinely different — geometric ADSR ramps, oscillator phase, decorative tile
 * pictures — so they stay separate modules; only the three idioms live here.
 *
 * `filterResponse` deliberately keeps its own point type: it works in decibels
 * against frequency, and converts to a 0..1 depth separately.
 */
export type CurvePoint = {
  /** 0..1 along the plot, left to right. */
  position: number;
  /**
   * How high the curve sits there. The range is the curve's own — 0..1 for a
   * level, -1..1 where it swings either side of a centre line — so each module
   * says which it means on the alias it exports.
   */
  level: number;
};

/**
 * Samples `levelAt` at `count` evenly spaced positions, endpoints included.
 *
 * `count - 1` intervals rather than `count`, so the last sample lands exactly
 * on 1 and the curve reaches the right-hand edge of its frame.
 */
export function sampleCurve(
  count: number,
  levelAt: (position: number) => number,
): CurvePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const position = index / (count - 1);
    return { position, level: levelAt(position) };
  });
}

/**
 * A deterministic 0..1 value from an integer.
 *
 * The fractional part of a large multiple of a sine — the usual trick for
 * something that has to look scattered but must be identical on every render,
 * since a plot that reshuffled itself each frame would read as movement the
 * parameter is not making. Not random, and not meant to be.
 */
export function hash01(index: number): number {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/** The same value across -1..1, for a curve that swings either side of centre. */
export function hashSigned(index: number): number {
  return 2 * hash01(index) - 1;
}
