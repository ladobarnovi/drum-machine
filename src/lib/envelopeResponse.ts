import {
  clampAttack,
  clampDecay,
  clampRelease,
  clampSustain,
  isAttackBypassed,
  isDecayBypassed,
  isReleaseBypassed,
  isSustainBypassed,
} from "./sequencer";

/**
 * The shape of a channel's amplitude envelope, as something that can be
 * drawn — worked out here rather than read off the audio graph, for the same
 * reason `filterResponse.ts` is: the gain node `trigger` builds is fresh per
 * hit and gone again, so a picture fed from one would be blank between hits.
 *
 * The bypass logic mirrors `triggerOptionsForChannel` exactly, so a stage
 * only appears here when it would actually be heard: decay bypassed draws a
 * flat hold rather than a fall nothing plays, and so on down the chain.
 */

/** One plotted point: where it is across the plot, and how loud. */
export type EnvelopePoint = {
  /** Position across the plot, 0..1. */
  position: number;
  /** Gain at that point, 0..1. */
  level: number;
};

/** Where each stage's region ends, 0..1 across the plot. */
export type EnvelopeStagePositions = {
  attackEnd: number;
  /** Equal to `attackEnd` when there is no decay stage to draw. */
  decayEnd: number;
  /** Equal to `decayEnd` when there is no sustain plateau to draw. */
  sustainEnd: number;
  /** Always 1: whichever stage is last fills the rest of the plot. */
  releaseEnd: number;
};

/**
 * How wide the sustain plateau — or an unshaped ring-out — is drawn.
 *
 * Neither has a time of its own: a one-shot voice holds there for however
 * long whatever comes next takes, not for a duration anyone dialled in. The
 * picture gives that hold a width to sit in rather than none at all, the way
 * a hand-drawn envelope diagram would.
 */
const VISUAL_HOLD_SECONDS = 0.3;

/** Floors the plotted width, so a fully bypassed envelope still has a total
 *  to divide the plot by instead of a division by zero. */
const MIN_TOTAL_SECONDS = 0.01;

/** Mirrors `DECAY_FLOOR` in `useSampleBank` — an exponential ramp can
 *  approach zero but never reach it, so the curve bends against the same
 *  non-zero bottom the real automation does. */
const ENVELOPE_FLOOR = 0.0001;

const CURVE_POINTS = 128;

type ResolvedEnvelope = {
  attack: number;
  /** Undefined stands for "rings out unshaped", exactly as at trigger time. */
  decay: number | undefined;
  sustain: number | undefined;
  release: number | undefined;
};

function resolveEnvelope(
  attackSeconds: number,
  decaySeconds: number,
  sustainLevel: number,
  releaseSeconds: number,
): ResolvedEnvelope {
  const attack = isAttackBypassed(attackSeconds)
    ? 0
    : clampAttack(attackSeconds);
  const decay = isDecayBypassed(decaySeconds)
    ? undefined
    : clampDecay(decaySeconds);
  // Each later stage is dropped whenever the one before it is, the same
  // chain `triggerOptionsForChannel` resolves — sustain means nothing
  // without decay to fall to it, release nothing without sustain to fall
  // from.
  const sustain =
    decay === undefined || isSustainBypassed(sustainLevel)
      ? undefined
      : clampSustain(sustainLevel);
  const release =
    sustain === undefined || isReleaseBypassed(releaseSeconds)
      ? undefined
      : clampRelease(releaseSeconds);

  return { attack, decay, sustain, release };
}

function envelopeTotalSeconds(envelope: ResolvedEnvelope): number {
  const { attack, decay, sustain, release } = envelope;

  if (decay === undefined) {
    return Math.max(attack + VISUAL_HOLD_SECONDS, MIN_TOTAL_SECONDS);
  }
  if (sustain === undefined) {
    return Math.max(attack + decay, MIN_TOTAL_SECONDS);
  }
  if (release === undefined) {
    return Math.max(attack + decay + VISUAL_HOLD_SECONDS, MIN_TOTAL_SECONDS);
  }
  return Math.max(
    attack + decay + VISUAL_HOLD_SECONDS + release,
    MIN_TOTAL_SECONDS,
  );
}

/**
 * Geometric interpolation between `from` and `to` — the shape
 * `exponentialRampToValueAtTime` draws in the real envelope. Floored on both
 * ends, since neither side of a log-scale ramp can be zero, and snapped to
 * the true target at the end, where the audio graph itself switches to a
 * hard `setValueAtTime` to actually reach it.
 */
function rampLevel(from: number, to: number, fraction: number): number {
  if (fraction >= 1) return to;
  if (fraction <= 0) return from;

  const safeFrom = Math.max(from, ENVELOPE_FLOOR);
  const safeTo = Math.max(to, ENVELOPE_FLOOR);
  return safeFrom * Math.pow(safeTo / safeFrom, fraction);
}

function levelAtSeconds(seconds: number, envelope: ResolvedEnvelope): number {
  const { attack, decay, sustain, release } = envelope;

  if (seconds <= attack) {
    return attack <= 0 ? 1 : seconds / attack;
  }
  if (decay === undefined) return 1;

  const decayEnd = attack + decay;
  if (seconds <= decayEnd) {
    const fraction = (seconds - attack) / decay;
    return rampLevel(1, sustain ?? 0, fraction);
  }
  if (sustain === undefined) return 0;
  if (release === undefined) return sustain;

  const sustainEnd = decayEnd + VISUAL_HOLD_SECONDS;
  if (seconds <= sustainEnd) return sustain;

  const fraction = (seconds - sustainEnd) / release;
  return rampLevel(sustain, 0, fraction);
}

/** Where each stage's region ends, for `EnvelopeGraph` to mark. */
export function envelopeStagePositions(
  attackSeconds: number,
  decaySeconds: number,
  sustainLevel: number,
  releaseSeconds: number,
): EnvelopeStagePositions {
  const envelope = resolveEnvelope(
    attackSeconds,
    decaySeconds,
    sustainLevel,
    releaseSeconds,
  );
  const total = envelopeTotalSeconds(envelope);

  const attackEnd = envelope.attack / total;

  const decayEnd =
    envelope.decay === undefined
      ? attackEnd
      : (envelope.attack + envelope.decay) / total;

  const sustainEnd =
    envelope.sustain === undefined
      ? decayEnd
      : decayEnd + VISUAL_HOLD_SECONDS / total;

  return { attackEnd, decayEnd, sustainEnd, releaseEnd: 1 };
}

/**
 * The envelope's shape from onset to silence, for `EnvelopeGraph` to draw.
 *
 * Attack and decay follow the exact ramps `trigger` schedules — linear for
 * the fade in, exponential for the fall away — so the curve shown is the
 * curve heard; release does the same, falling from the sustain level rather
 * than from decay's old floor.
 */
export function envelopeCurve(
  attackSeconds: number,
  decaySeconds: number,
  sustainLevel: number,
  releaseSeconds: number,
): EnvelopePoint[] {
  const envelope = resolveEnvelope(
    attackSeconds,
    decaySeconds,
    sustainLevel,
    releaseSeconds,
  );
  const total = envelopeTotalSeconds(envelope);

  return Array.from({ length: CURVE_POINTS }, (_, index) => {
    const position = index / (CURVE_POINTS - 1);
    const seconds = position * total;
    return { position, level: levelAtSeconds(seconds, envelope) };
  });
}
