import { clampSend } from "./sequencer";

/**
 * What the three send tiles in `FxGraph` are drawn from, worked out here
 * rather than in the component for the same reason `filterResponse.ts` and
 * `envelopeResponse.ts` are: the shapes are arithmetic, the tiles are markup,
 * and keeping them apart means either can be read without the other.
 *
 * These are pictures of a send rather than plots of one. A cutoff has a real
 * curve to draw and the filter's does; a send amount is one number, and what
 * it actually buys you is heard in the master bus it feeds, not in the channel
 * tap itself. So each tile draws the character of its effect — echoes off a
 * hit, a tail behind one, notches across a response — and lets the send amount
 * decide how much of it there is to see.
 */

/** One thing to draw: where it sits across the tile, 0..1, and how tall, 0..1. */
export type FxPoint = {
  position: number;
  level: number;
};

/** Where the dry hit stands in the delay and reverb tiles. */
const SOURCE_POSITION = 0.07;

/**
 * A level below which something is not worth drawing.
 *
 * Under this a mark is a smudge a pixel high that reads as dirt on the tile
 * rather than as a quiet repeat, so the picture stops one mark earlier
 * instead — which is what makes a send opening up add its echoes one at a
 * time as they rise past it.
 */
const VISIBLE_LEVEL = 0.04;

/* -------------------------------------------------------------------------
   Delay
   ---------------------------------------------------------------------- */

/** How many repeats the tile has room for before they run off its right edge. */
const MAX_ECHOES = 5;
/** The gap between one repeat and the next, as a fraction of the tile. */
const ECHO_GAP = 0.18;
/** How much of a repeat survives into the next one. */
const ECHO_FALLOFF = 0.66;

export type DelayPicture = {
  /** The dry hit the repeats come off. Always full height. */
  source: FxPoint;
  /** The repeats, loudest first, cut short where they stop being visible. */
  echoes: FxPoint[];
};

/**
 * A hit and its repeats, evenly spaced and falling away.
 *
 * The send scales the whole chain rather than lengthening it, which is what a
 * send actually does — how many repeats there are is the delay bus's feedback,
 * not this channel's business. Turning it up therefore lifts the later repeats
 * past `VISIBLE_LEVEL` one after another, so the tile grows a tail rather than
 * simply brightening.
 */
export function delayPicture(send: number): DelayPicture {
  const amount = clampSend(send);
  const echoes: FxPoint[] = [];

  for (let index = 0; index < MAX_ECHOES; index += 1) {
    const level = amount * Math.pow(ECHO_FALLOFF, index);
    if (level < VISIBLE_LEVEL) break;

    echoes.push({
      position: SOURCE_POSITION + (index + 1) * ECHO_GAP,
      level,
    });
  }

  return { source: { position: SOURCE_POSITION, level: 1 }, echoes };
}

/* -------------------------------------------------------------------------
   Reverb
   ---------------------------------------------------------------------- */

/** How far past the hit the tail reaches at a fully open send. */
const MAX_TAIL_LENGTH = 0.88;
/** How sharply the tail's energy falls across its own length. */
const TAIL_FALLOFF = 3.2;
/** How many points the wash's outline is drawn from. */
const TAIL_POINTS = 32;
/** The scattered reflections under it, at a closed and at an open send. */
const MIN_GRAINS = 6;
const MAX_GRAINS = 32;

export type ReverbPicture = {
  /** The dry hit the tail comes off. Always full height. */
  source: FxPoint;
  /** The outline of the tail's energy, left to right. Empty while closed. */
  tail: FxPoint[];
  /** Individual reflections scattered under that outline. */
  grains: FxPoint[];
};

/**
 * A hit and the wash behind it: a smooth decay outline with a scatter of
 * reflections under it.
 *
 * Both the height and the length of the tail follow the send, since those are
 * the two things a listener actually notices being turned up — a wetter
 * channel is both louder in the room and audible in it for longer.
 */
export function reverbPicture(send: number): ReverbPicture {
  const amount = clampSend(send);
  const source: FxPoint = { position: SOURCE_POSITION, level: 1 };

  if (amount < VISIBLE_LEVEL) return { source, tail: [], grains: [] };

  const length = amount * MAX_TAIL_LENGTH;
  /** The tail's height at a fraction along its own length. */
  const levelAt = (fraction: number) =>
    amount * Math.exp(-TAIL_FALLOFF * fraction);

  const tail = Array.from({ length: TAIL_POINTS }, (_, index) => {
    const fraction = index / (TAIL_POINTS - 1);
    return {
      position: SOURCE_POSITION + fraction * length,
      level: levelAt(fraction),
    };
  });

  const count = Math.round(MIN_GRAINS + amount * (MAX_GRAINS - MIN_GRAINS));
  const grains = Array.from({ length: count }, (_, index) => {
    // Scattered from the index rather than at random, so the same send draws
    // the same tile every render — a wash that reshuffled on every keystroke
    // would read as noise in the UI rather than as a picture of one.
    const fraction = scatter(index);
    return {
      position: SOURCE_POSITION + fraction * length,
      // Each reflection is somewhere under the outline rather than on it,
      // which is what gives the wash depth instead of a hard ceiling.
      level: levelAt(fraction) * (0.3 + 0.7 * scatter(index + 101)),
    };
  }).filter((grain) => grain.level >= VISIBLE_LEVEL * 0.5);

  return { source, tail, grains };
}

/* -------------------------------------------------------------------------
   Phaser
   ---------------------------------------------------------------------- */

/**
 * Where the response sits with nothing notched out of it, 0..1 up the tile.
 * Exported so `FxGraph` can rule a line at it and give the notches something
 * to be measured against.
 */
export const PHASER_FLAT_LEVEL = 0.74;
/** How deep the notches cut at a fully open send. */
const MAX_NOTCH_DEPTH = 0.62;
/**
 * How many notches cross the tile. A whole number on purpose: the curve then
 * ends exactly where it began, so `FxGraph` can lay two copies end to end and
 * sweep them past without a seam.
 */
const NOTCH_COUNT = 3;
/**
 * How narrow each notch is. Below 1 this pushes the curve towards its crest
 * everywhere except right at a zero, which is the shape a phaser's response
 * actually has — broad flat gain with a few thin bites taken out of it.
 */
const NOTCH_SHARPNESS = 0.35;
/** How many points the curve is drawn from. */
const CURVE_POINTS = 128;

/**
 * The phaser's response across one width of the tile — flat at a closed send,
 * and cut deeper as it opens.
 *
 * The sweep that makes a phaser a phaser is not in here: it is one animation
 * on the drawn curve rather than a phase this has to be re-run for, so the
 * shape is worked out once per value change and the motion costs nothing.
 */
export function phaserCurve(send: number): FxPoint[] {
  const depth = clampSend(send) * MAX_NOTCH_DEPTH;

  return Array.from({ length: CURVE_POINTS }, (_, index) => {
    const position = index / (CURVE_POINTS - 1);
    const crest = Math.pow(
      Math.abs(Math.sin(Math.PI * NOTCH_COUNT * position)),
      NOTCH_SHARPNESS,
    );

    return { position, level: PHASER_FLAT_LEVEL - depth * (1 - crest) };
  });
}

/**
 * A repeatable 0..1 from a whole number — the usual fractional-sine hash. A
 * fixed scatter rather than a random one, so a tile is the same picture every
 * time it is drawn instead of crawling under its own re-renders.
 */
function scatter(index: number): number {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
