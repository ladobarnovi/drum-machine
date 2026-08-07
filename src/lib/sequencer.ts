export const CHANNEL_COUNT = 16;
export const STEPS_PER_BEAT = 4;

export const MIN_STEPS = 1;
export const MAX_STEPS = 64;
export const DEFAULT_STEP_COUNT = 16;

/**
 * The lengths one click away, each twice the one before it: a beat, two beats,
 * a bar of 4/4, then two bars and four. Doublings because that is what a
 * channel is nearly always set to — the lengths that stay in phase with the
 * rest of the machine.
 *
 * Deliberately not the whole range. Everything between them is still typed
 * into the step field, which is what keeps a deliberately odd length like 7 or
 * 13 — the reason channels wrap independently at all — reachable.
 */
export const STEP_LENGTH_PRESETS = [4, 8, 16, 32, 64] as const;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 200;

/**
 * How far the off-grid 16th notes (the "e" and "a" of each beat) are pushed
 * late, as a fraction of a step's duration. At 0 every step falls on a
 * straight grid; the ceiling stops well short of 1, where a delayed step
 * would land on top of the next one.
 */
export const MIN_SWING = 0;
export const MAX_SWING = 0.75;
/** Straight timing, so swing only shuffles the beat once asked to. */
export const DEFAULT_SWING = 0;

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1.5;
export const DEFAULT_VOLUME = 1;

/**
 * Where the channel sits across the stereo image: -1 hard left, +1 hard right,
 * 0 dead centre.
 *
 * The full width is on offer rather than a safer range, because a drum machine
 * is where hard-panned hats and toms belong; the default is the centre, which
 * is where every channel already sat before there was such a thing as pan.
 */
export const MIN_PAN = -1;
export const MAX_PAN = 1;
export const DEFAULT_PAN = 0;

/** Pitch offset in semitones; ±12 is one octave either way. */
export const MIN_PITCH = -12;
export const MAX_PITCH = 12;
export const DEFAULT_PITCH = 0;

/** Filter cutoffs span the audible range. */
export const MIN_FILTER_HZ = 20;
export const MAX_FILTER_HZ = 20000;
/** Defaults sit at the extremes, where both filters are bypassed. */
export const DEFAULT_LOW_CUT_HZ = MIN_FILTER_HZ;
export const DEFAULT_HIGH_CUT_HZ = MAX_FILTER_HZ;

/**
 * Amplitude envelope times, in seconds. Attack fades the hit in; decay then
 * runs it back down to silence, so the two together set how long a voice lasts.
 */
export const MIN_ATTACK_SECONDS = 0;
export const MAX_ATTACK_SECONDS = 0.5;
export const MIN_DECAY_SECONDS = 0.005;
export const MAX_DECAY_SECONDS = 2;
/** Defaults sit at the extremes, where the envelope is bypassed. */
export const DEFAULT_ATTACK_SECONDS = MIN_ATTACK_SECONDS;
export const DEFAULT_DECAY_SECONDS = MAX_DECAY_SECONDS;

/**
 * How much of a channel is tapped off to a send bus. Sends are taken after the
 * channel's own volume, so turning a channel down takes its delay and reverb
 * with it and the balance of the mix survives the move.
 */
export const MIN_SEND = 0;
export const MAX_SEND = 1;
/** Sends start closed, so a fresh kit is dry until something is dialled in. */
export const DEFAULT_SEND = 0;

/**
 * Delay times, in seconds. The floor is above the few milliseconds where a
 * delay stops being an echo and starts being a comb filter; the ceiling is two
 * seconds, which is a whole bar of 4/4 at 120 BPM.
 */
export const MIN_DELAY_SECONDS = 0.02;
export const MAX_DELAY_SECONDS = 2;
/** A dotted eighth at 120 BPM — the setting delay is most often reached for. */
export const DEFAULT_DELAY_SECONDS = 0.375;

/**
 * Note values the delay can lock to, ordered shortest first. Straight, dotted
 * (`d`, one and a half times as long) and triplet (`t`, two thirds as long)
 * forms are interleaved, so the list reads as a straight run from shortest to
 * longest rather than as three separate families.
 */
export const DELAY_DIVISIONS = [
  "1/32",
  "1/16t",
  "1/16",
  "1/8t",
  "1/16d",
  "1/8",
  "1/4t",
  "1/8d",
  "1/4",
  "1/4d",
  "1/2",
  "1/1",
] as const;

export type DelayDivision = (typeof DELAY_DIVISIONS)[number];

/** A dotted eighth, matching DEFAULT_DELAY_SECONDS at the default tempo. */
export const DEFAULT_DELAY_DIVISION: DelayDivision = "1/8d";

/**
 * How long each division lasts, in beats — meaning quarter notes, which is what
 * BPM counts. Everything else about tempo sync falls out of this table.
 */
export const DELAY_DIVISION_BEATS: Record<DelayDivision, number> = {
  "1/32": 0.125,
  "1/16t": 1 / 6,
  "1/16": 0.25,
  "1/8t": 1 / 3,
  "1/16d": 0.375,
  "1/8": 0.5,
  "1/4t": 2 / 3,
  "1/8d": 0.75,
  "1/4": 1,
  "1/4d": 1.5,
  "1/2": 2,
  "1/1": 4,
};

/** Rail labels. Kept short: the sidebar select is only so wide. */
export const DELAY_DIVISION_LABELS: Record<DelayDivision, string> = {
  "1/32": "1/32",
  "1/16t": "1/16 T",
  "1/16": "1/16",
  "1/8t": "1/8 T",
  "1/16d": "1/16 D",
  "1/8": "1/8",
  "1/4t": "1/4 T",
  "1/8d": "1/8 D",
  "1/4": "1/4",
  "1/4d": "1/4 D",
  "1/2": "1/2",
  "1/1": "1/1",
};

/**
 * How much the delay line has to be able to hold, which is fixed when the node
 * is built. Sized to the longest division at the slowest tempo — a whole note
 * at MIN_BPM — because a synced time is deliberately not capped at
 * MAX_DELAY_SECONDS: capping it would silently put the delay out of time,
 * which is the one thing sync exists to prevent.
 */
export const MAX_DELAY_LINE_SECONDS = Math.max(
  MAX_DELAY_SECONDS,
  Math.max(...Object.values(DELAY_DIVISION_BEATS)) * (60 / MIN_BPM),
);

/**
 * How much of the delay's output is fed back in. Strictly below 1: at unity the
 * loop would sustain forever and past it the repeats would grow without bound
 * until the output clipped.
 */
export const MIN_FEEDBACK = 0;
export const MAX_FEEDBACK = 0.9;
export const DEFAULT_FEEDBACK = 0.35;

/**
 * Lowpass on the delay's repeats. It sits inside the feedback loop, so each
 * repeat passes it once more than the one before and the echoes darken as they
 * recede — the tape-delay sound, and the reason a delay can be busy without
 * crowding the top end of the mix.
 *
 * That compounding is why it defaults higher than the reverb's tone: by the
 * fourth repeat this cutoff has been applied four times over.
 */
export const DEFAULT_DELAY_TONE_HZ = 8000;

/** How long the reverb tail takes to fall away, in seconds. */
export const MIN_REVERB_DECAY_SECONDS = 0.2;
export const MAX_REVERB_DECAY_SECONDS = 8;
export const DEFAULT_REVERB_DECAY_SECONDS = 2;

/**
 * Lowpass on the reverb's output. Darkening the tail is what keeps a reverb
 * sitting behind a kit instead of washing over the hats, so it defaults part
 * way down rather than wide open.
 */
export const DEFAULT_REVERB_TONE_HZ = 6000;

/** How hard the summed channels are pushed into saturation. */
export const MIN_DRIVE = 0;
export const MAX_DRIVE = 1;
export const DEFAULT_DRIVE = 0.35;

/**
 * The saturation shapes on offer, ordered from tamest to wildest.
 *
 * Every shape is the identity line at amount 0, so the Amount slider keeps its
 * meaning across all of them. Soft, tube, and hard also pass full scale through
 * unchanged, so switching between those three is a change of character rather
 * than of level; fold is louder or quieter depending on where its folding lands
 * a peak, and is meant to be reached for knowing that.
 */
export const DRIVE_TYPES = ["soft", "tube", "hard", "fold"] as const;

export type DriveType = (typeof DRIVE_TYPES)[number];

export const DEFAULT_DRIVE_TYPE: DriveType = "soft";

/** Rail labels. Kept short: the sidebar select is only so wide. */
export const DRIVE_TYPE_LABELS: Record<DriveType, string> = {
  soft: "Soft",
  tube: "Tube",
  hard: "Hard",
  fold: "Fold",
};

/**
 * Saturation stage on the sum of every channel, wired like a pedal: `level` is
 * the stage's own output, so bypassing takes the drive and the level with it
 * and leaves the untouched sum to compare against.
 */
export type MasterDrive = {
  enabled: boolean;
  /** Which saturation shape the stage runs. */
  type: DriveType;
  /** 0..1. At 0 the stage is linear, so only the level is heard. */
  amount: number;
  /** Linear output gain, on the same scale as a channel's volume. */
  level: number;
};

/** Starts bypassed, already dialled in so switching it on does something. */
export const DEFAULT_MASTER_DRIVE: MasterDrive = {
  enabled: false,
  type: DEFAULT_DRIVE_TYPE,
  amount: DEFAULT_DRIVE,
  level: DEFAULT_VOLUME,
};

/**
 * The low- and high-cut pair on the mix, last in the master chain: it filters
 * what the drive stage put out, so the harmonics saturation adds are cut rather
 * than fed back into it.
 */
export type MasterFilter = {
  enabled: boolean;
  /** Highpass cutoff; at MIN_FILTER_HZ the filter is flat. */
  lowCutHz: number;
  /** Lowpass cutoff; at MAX_FILTER_HZ the filter is flat. */
  highCutHz: number;
};

/**
 * Starts bypassed and flat. Unlike drive, a master filter is a control you
 * sweep, so switching it in should be silent until a cutoff is moved.
 */
export const DEFAULT_MASTER_FILTER: MasterFilter = {
  enabled: false,
  lowCutHz: DEFAULT_LOW_CUT_HZ,
  highCutHz: DEFAULT_HIGH_CUT_HZ,
};

/**
 * The delay bus. Unlike drive and filter this is a *send* effect: nothing is
 * routed through it, channels tap a copy of themselves into it, and its output
 * is mixed back alongside the dry signal. So `level` is the whole of the
 * bypass — at zero the bus is simply not heard, and the dry mix is untouched.
 */
export type MasterDelay = {
  enabled: boolean;
  /** When set, `division` decides the time and `timeSeconds` is left alone. */
  synced: boolean;
  /** The note value the delay locks to while synced. */
  division: DelayDivision;
  /** Time between repeats while running free. */
  timeSeconds: number;
  /** How much of each repeat feeds the next one. */
  feedback: number;
  /** Lowpass cutoff on the repeats; at MAX_FILTER_HZ they are undamped. */
  toneHz: number;
  /** Return level, on the same scale as a channel's volume. */
  level: number;
  /**
   * How much of the return is tapped on into the reverb bus, so the repeats can
   * be given a space of their own. Taken after `level`, exactly as the channel
   * sends are taken after a channel's volume.
   */
  reverbSend: number;
};

/**
 * Starts silent but already dialled in, so raising a channel's send after
 * switching the bus on is enough to hear something.
 *
 * Synced by default: a delay that drifts against the pattern is almost never
 * what is wanted on a drum machine, and the free time is kept alongside so
 * switching to it lands somewhere sensible.
 */
export const DEFAULT_MASTER_DELAY: MasterDelay = {
  enabled: false,
  synced: true,
  division: DEFAULT_DELAY_DIVISION,
  timeSeconds: DEFAULT_DELAY_SECONDS,
  feedback: DEFAULT_FEEDBACK,
  toneHz: DEFAULT_DELAY_TONE_HZ,
  level: DEFAULT_VOLUME,
  // Closed, like a channel's sends: the delay is dry until it is asked not to be.
  reverbSend: DEFAULT_SEND,
};

/** The reverb bus, sent to and returned exactly like the delay. */
export type MasterReverb = {
  enabled: boolean;
  /** How long the tail takes to fall away. */
  decaySeconds: number;
  /** Lowpass cutoff on the tail; at MAX_FILTER_HZ the tail is undamped. */
  toneHz: number;
  /** Return level, on the same scale as a channel's volume. */
  level: number;
  /**
   * How much of the return is tapped on into the phaser bus, so the tail can be
   * set moving rather than sitting still behind the kit. Taken after `level`,
   * exactly as the delay's own send into this bus is.
   */
  phaserSend: number;
};

export const DEFAULT_MASTER_REVERB: MasterReverb = {
  enabled: false,
  decaySeconds: DEFAULT_REVERB_DECAY_SECONDS,
  toneHz: DEFAULT_REVERB_TONE_HZ,
  level: DEFAULT_VOLUME,
  // Closed, like every other send here: nothing feeds the phaser until asked.
  phaserSend: DEFAULT_SEND,
};

/**
 * How many allpass stages the phaser runs. Each *pair* of stages puts one notch
 * in the sum with the dry signal, so these read as 1, 2, 3 and 4 notches —
 * fewer is the broad, obvious sweep, more is the dense, vocal one.
 *
 * Even numbers only, and a short list rather than a slider: an odd count moves
 * the notches without adding one, which is a distinction nobody wants to hunt
 * for on a rail.
 */
export const PHASER_STAGE_COUNTS = [2, 4, 6, 8] as const;

export type PhaserStages = (typeof PHASER_STAGE_COUNTS)[number];

/** Four stages — two notches, which is the classic pedal. */
export const DEFAULT_PHASER_STAGES: PhaserStages = 4;

/** Rail labels. Kept short: the sidebar select is only so wide. */
export const PHASER_STAGE_LABELS: Record<PhaserStages, string> = {
  2: "2 · 1 notch",
  4: "4 · 2 notches",
  6: "6 · 3 notches",
  8: "8 · 4 notches",
};

/**
 * Where the notches sit at the bottom of the sweep, and where the topmost one
 * reaches. The band is the midrange rather than the whole spectrum: a notch
 * below this is felt as a loss of weight rather than heard as movement, and one
 * above it is lost among the hats.
 */
export const MIN_PHASER_HZ = 200;
export const MAX_PHASER_HZ = 1600;

/** How far full depth sweeps the notches, either way, in octaves. */
export const PHASER_SWEEP_OCTAVES = 2;

/**
 * How fast the sweep runs, in Hz. The floor is slow enough that a phase takes
 * most of a minute to come round — the drifting setting a phaser is left on;
 * the ceiling is where the sweep stops reading as movement and starts adding a
 * warble of its own.
 */
export const MIN_PHASER_RATE_HZ = 0.02;
export const MAX_PHASER_RATE_HZ = 8;
/** Roughly a cycle every two bars at the default tempo. */
export const DEFAULT_PHASER_RATE_HZ = 0.25;

/** How much of the sweep's range the LFO actually covers. */
export const MIN_PHASER_DEPTH = 0;
export const MAX_PHASER_DEPTH = 1;
export const DEFAULT_PHASER_DEPTH = 0.7;

/**
 * How much of the last allpass stage is fed back into the first. Feedback is
 * what sharpens the notches into the resonant, whistling character a phaser is
 * reached for; the ceiling is short of unity so the emphasis can never run away
 * with the bus.
 */
export const MIN_PHASER_FEEDBACK = 0;
export const MAX_PHASER_FEEDBACK = 0.7;
export const DEFAULT_PHASER_FEEDBACK = 0.35;

/**
 * The phaser bus. A send like the delay and the reverb, and — this being an
 * allpass effect — one that leans on that more than they do: what comes back is
 * the same signal with its phase turned, and the notches only exist once it is
 * summed with the dry mix at the master input. So the deepest phasing is a
 * channel sent wide open against a return at unity, and pulling either one down
 * shallows the notches rather than turning the effect off.
 *
 * Fed by the channels, and by the reverb bus, so a tail can be set moving.
 */
export type MasterPhaser = {
  enabled: boolean;
  /** How many allpass stages the signal passes, so how many notches there are. */
  stages: PhaserStages;
  /** Cycles per second of the sweep. */
  rateHz: number;
  /** 0..1, scaled into PHASER_SWEEP_OCTAVES either way. */
  depth: number;
  /** How much of the chain's output is fed back into it. */
  feedback: number;
  /** Return level, and the whole of the bypass. */
  level: number;
};

/** Starts silent but already dialled in, exactly like the other two buses. */
export const DEFAULT_MASTER_PHASER: MasterPhaser = {
  enabled: false,
  stages: DEFAULT_PHASER_STAGES,
  rateHz: DEFAULT_PHASER_RATE_HZ,
  depth: DEFAULT_PHASER_DEPTH,
  feedback: DEFAULT_PHASER_FEEDBACK,
  level: DEFAULT_VOLUME,
};

/**
 * Compressor threshold, in dB below full scale. Above it the mix is pulled
 * down, below it nothing happens at all — so this is what decides how much of
 * the material the stage acts on rather than how hard it acts.
 */
export const MIN_THRESHOLD_DB = -60;
export const MAX_THRESHOLD_DB = 0;
export const DEFAULT_THRESHOLD_DB = -18;

/** How hard it pulls: at 4, four dB over the threshold come out as one. */
export const MIN_RATIO = 1;
export const MAX_RATIO = 20;
export const DEFAULT_RATIO = 4;

/**
 * How quickly the compressor reacts. The ceiling is well short of the second
 * Web Audio allows: past a couple of hundred milliseconds a bus compressor has
 * stopped catching drum transients altogether, which is the whole of its job
 * here. The default lets the very front of a hit through before clamping down,
 * which is what keeps a compressed kit sounding hit rather than squashed.
 */
export const MIN_COMPRESSOR_ATTACK_SECONDS = 0;
export const MAX_COMPRESSOR_ATTACK_SECONDS = 0.2;
export const DEFAULT_COMPRESSOR_ATTACK_SECONDS = 0.005;

/**
 * How long it takes to let go. Long enough to ride a bar at slow tempos, and
 * floored above zero because a release that fast pumps on every waveform cycle
 * and reads as distortion rather than as compression.
 */
export const MIN_COMPRESSOR_RELEASE_SECONDS = 0.01;
export const MAX_COMPRESSOR_RELEASE_SECONDS = 1;
export const DEFAULT_COMPRESSOR_RELEASE_SECONDS = 0.15;

/**
 * Width of the soft knee, in dB — how gradually the ratio comes in around the
 * threshold rather than all at once.
 *
 * Fixed rather than given a slider: it is the control reached for last, the
 * rail is already the longest thing on the page, and a moderate knee is what
 * makes a bus compressor sound like glue instead of like a limiter.
 */
export const COMPRESSOR_KNEE_DB = 6;

/**
 * How much reduction fills the meter, in dB.
 *
 * Twenty, which is well past where a drum bus is usually worked: three to ten
 * is the range most of this stage's life is spent in, and a scale that only
 * just contained the loudest possible reading would leave all of that crammed
 * into the first third of the bar.
 */
export const METER_RANGE_DB = 20;

/**
 * How fast the meter climbs back towards zero, in dB per second. Slow enough
 * that a hit stays legible after it has passed, fast enough that the bar is
 * never reporting compression that finished a moment ago.
 */
export const METER_RECOVERY_DB_PER_SECOND = 24;

/**
 * The compressor on the mix, sitting after the filter and before the fader, so
 * it works on everything the stages above have already done — the send returns
 * included, since those rejoin at the master input.
 */
export type MasterCompressor = {
  enabled: boolean;
  thresholdDb: number;
  ratio: number;
  attackSeconds: number;
  releaseSeconds: number;
  /** Makeup gain, on the same scale as a channel's volume. */
  level: number;
};

/** Starts bypassed, already dialled in so switching it on does something. */
export const DEFAULT_MASTER_COMPRESSOR: MasterCompressor = {
  enabled: false,
  thresholdDb: DEFAULT_THRESHOLD_DB,
  ratio: DEFAULT_RATIO,
  attackSeconds: DEFAULT_COMPRESSOR_ATTACK_SECONDS,
  releaseSeconds: DEFAULT_COMPRESSOR_RELEASE_SECONDS,
  level: DEFAULT_VOLUME,
};

export function clampThresholdDb(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_THRESHOLD_DB;
  return Math.min(Math.max(value, MIN_THRESHOLD_DB), MAX_THRESHOLD_DB);
}

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RATIO;
  return Math.min(Math.max(value, MIN_RATIO), MAX_RATIO);
}

export function clampCompressorAttack(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COMPRESSOR_ATTACK_SECONDS;
  return Math.min(
    Math.max(value, MIN_COMPRESSOR_ATTACK_SECONDS),
    MAX_COMPRESSOR_ATTACK_SECONDS,
  );
}

export function clampCompressorRelease(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COMPRESSOR_RELEASE_SECONDS;
  return Math.min(
    Math.max(value, MIN_COMPRESSOR_RELEASE_SECONDS),
    MAX_COMPRESSOR_RELEASE_SECONDS,
  );
}

/**
 * How far along the meter a reduction reads, as a fraction of its width.
 *
 * Reduction arrives from the compressor as zero or a negative number of dB, and
 * comes back here as a positive 0..1 — a meter fills, so the further it fills
 * the more is being taken off, whichever way the number was signed.
 */
export function reductionToMeter(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, -db) / METER_RANGE_DB);
}

/**
 * How far the needle has fallen back by now, given where it was.
 *
 * A meter driven straight from the compressor is unreadable on drums: reduction
 * tracks the envelope of each hit, so it snaps back to nothing between them
 * faster than the eye can follow and the bar reads as a flicker rather than as
 * a level. Falling instantly and climbing back at a fixed rate is the standard
 * fix, and it is what makes the depth of a hit legible after the hit has gone.
 */
export function decayReduction(
  displayedDb: number,
  reductionDb: number,
  elapsedSeconds: number,
): number {
  const recovered = Math.min(
    0,
    displayedDb + METER_RECOVERY_DB_PER_SECOND * Math.max(0, elapsedSeconds),
  );
  // Whichever is deeper wins, so a new hit takes the needle down at once.
  return Math.min(recovered, Math.min(0, reductionDb));
}

export function formatDecibels(db: number): string {
  return `${Math.round(db)} dB`;
}

export function formatRatio(ratio: number): string {
  const clamped = clampRatio(ratio);
  return `${clamped < 10 ? clamped.toFixed(1) : Math.round(clamped)}:1`;
}

/**
 * The bottom of a channel's own meter, in dB below full scale.
 *
 * Shallower than a hardware channel meter, which is the point: this bar is a
 * few pixels tall with no scale printed beside it, so what matters is how much
 * of it one hit differs from the next by. A dB scale compresses the loud end —
 * half amplitude is only 6 dB down — so the deeper the floor, the more of the
 * range a drum kit actually uses ends up crowded into the top of the bar. At
 * 36 dB, 6 dB of difference is a sixth of the bar's length, which is a
 * difference you can see across the grid at a glance.
 *
 * Deep enough to keep the quiet end: a step at MIN_STEP_VELOCITY sits 26 dB
 * down, which still reads as roughly a quarter of the bar rather than as
 * nothing at all.
 *
 * It is also what silence reads as, so nothing here ever has to carry a
 * `-Infinity` around.
 */
export const CHANNEL_METER_FLOOR_DB = -36;

/**
 * How fast a channel meter falls back towards the floor, in dB per second.
 *
 * The whole of the ballistics: a level meter rises instantly and falls back,
 * which is the opposite way up from the compressor's meter above but the same
 * trick for the same reason — a drum hit is over in a few tens of milliseconds,
 * and a bar that tracked it honestly in both directions would be a flicker.
 *
 * The rate is set by what the machine plays rather than by meter convention. A
 * 16th note at 120 BPM is 125 ms, so a bar that took much longer than that to
 * empty would still be most of the way up when the next hit arrived, and a busy
 * channel would sit pinned near the top reading nothing at all. At this rate a
 * full-scale hit empties in 0.3 s: consecutive 16ths each read as their own
 * pulse, and a hit on every beat falls all the way back in between.
 */
export const CHANNEL_METER_FALL_DB_PER_SECOND = 120;

/**
 * Where a channel starts reading as over.
 *
 * A hair above full scale rather than at it, and that margin is the whole
 * point: a normalised sample peaks at exactly 0 dBFS by definition, so a kit of
 * them played at unity would sit permanently in the red saying nothing at all.
 * Above this the channel is being pushed past full scale by its own volume —
 * which the fader allows, since MAX_VOLUME is 1.5 — and that is worth knowing,
 * because it is the mix hitting the master stages hot rather than the sample
 * simply being loud.
 */
export const CHANNEL_METER_OVER_DB = 0.5;

/**
 * A linear peak amplitude as dB below full scale, floored rather than allowed
 * to run off to `-Infinity` at silence.
 *
 * Not clamped at the top: a channel can legitimately read above 0 dBFS here,
 * and hiding that is exactly what the meter exists not to do.
 */
export function amplitudeToDecibels(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return CHANNEL_METER_FLOOR_DB;
  return Math.max(20 * Math.log10(peak), CHANNEL_METER_FLOOR_DB);
}

/**
 * How far along a channel meter a level reads, as a fraction of its width.
 *
 * The scale is in dB rather than in amplitude. A linear bar would spend a drum
 * kit's entire dynamic range in its top fifth — half scale is only 6 dB down —
 * and the quiet end, where ghost notes and tails live, would be indistinguishable
 * from silence.
 */
export function levelToMeter(db: number): number {
  if (!Number.isFinite(db)) return 0;
  const aboveFloor = db - CHANNEL_METER_FLOOR_DB;
  return Math.min(1, Math.max(0, aboveFloor / -CHANNEL_METER_FLOOR_DB));
}

/**
 * Where the bar has fallen to by now, given where it was.
 *
 * The mirror of `decayReduction`: that one drops instantly and climbs back,
 * this one rises instantly and falls back, because a level and the reduction
 * taken off it move in opposite directions.
 */
export function decayChannelLevel(
  displayedDb: number,
  levelDb: number,
  elapsedSeconds: number,
): number {
  const fallen = Math.max(
    CHANNEL_METER_FLOOR_DB,
    displayedDb -
      CHANNEL_METER_FALL_DB_PER_SECOND * Math.max(0, elapsedSeconds),
  );
  // Whichever is louder wins, so a new hit takes the bar up at once.
  return Math.max(fallen, levelDb);
}

/** True while a channel is reading past full scale; see CHANNEL_METER_OVER_DB. */
export function isChannelMeterOver(db: number): boolean {
  return db >= CHANNEL_METER_OVER_DB;
}

/**
 * The output fader, last in the chain and the only master control with no
 * bypass — switching a volume off is what pulling it to zero already does.
 *
 * It is a bare number rather than an object like the stages above, because
 * there is nothing to keep alongside it: one linear gain, on the same scale as
 * a channel's volume, so unity sits at 100% and there is headroom above it.
 */
export const DEFAULT_MASTER_VOLUME = DEFAULT_VOLUME;

/**
 * The modulation shapes on offer. The four periodic ones are named after the
 * oscillator types that produce them; random is sample-and-hold — a fresh
 * random value each cycle, held flat until the next one — which no oscillator
 * type produces and which is built from a table of values instead.
 */
export const LFO_SHAPES = [
  "sine",
  "triangle",
  "sawtooth",
  "square",
  "random",
] as const;

export type LfoShape = (typeof LFO_SHAPES)[number];

export const DEFAULT_LFO_SHAPE: LfoShape = "sine";

export const LFO_SHAPE_LABELS: Record<LfoShape, string> = {
  sine: "Sine",
  triangle: "Triangle",
  sawtooth: "Saw",
  square: "Square",
  random: "Random",
};

/**
 * What the LFO is pointed at. Every destination is something the channel
 * already has a slider for, so the LFO moves a control that is on screen rather
 * than introducing a parameter that exists only while it is switched on.
 */
export const LFO_DESTINATIONS = [
  "pitch",
  "volume",
  "lowCut",
  "highCut",
] as const;

export type LfoDestination = (typeof LFO_DESTINATIONS)[number];

export const DEFAULT_LFO_DESTINATION: LfoDestination = "pitch";

export const LFO_DESTINATION_LABELS: Record<LfoDestination, string> = {
  pitch: "Pitch",
  volume: "Volume",
  lowCut: "Low cut",
  highCut: "High cut",
};

/**
 * Modulation rates, in Hz. The floor is slow enough that a hit only ever sees
 * part of a cycle, which reads as a sweep rather than as a wobble; the ceiling
 * is at the bottom of hearing, where the modulation stops being movement and
 * starts adding sidebands of its own.
 */
export const MIN_LFO_HZ = 0.1;
export const MAX_LFO_HZ = 20;
export const DEFAULT_LFO_HZ = 5;

/** How far the LFO swings its destination, as a fraction of the full range. */
export const MIN_LFO_AMOUNT = 0;
export const MAX_LFO_AMOUNT = 1;
export const DEFAULT_LFO_AMOUNT = 0.35;

/**
 * Peak deviation at full amount for the destinations measured in intervals. An
 * octave either way matches the pitch slider's own range; four is enough for a
 * cutoff sweep to read as one, since a filter has to move much further than a
 * pitch before the ear calls it a big move.
 */
export const LFO_PITCH_RANGE_SEMITONES = 12;
export const LFO_FILTER_RANGE_OCTAVES = 4;

/**
 * A channel's modulation source. One LFO with one destination: a channel here
 * is a single voice, and keeping the routing to a single choice is what lets
 * the section be read at a glance instead of traced.
 */
export type ChannelLfo = {
  enabled: boolean;
  shape: LfoShape;
  /** Cycles per second. */
  rateHz: number;
  /** 0..1, scaled into whatever unit the destination is measured in. */
  amount: number;
  destination: LfoDestination;
  /**
   * When set, every hit restarts the LFO from the top, so each one sweeps
   * identically. Cleared, the channel runs a single continuous LFO that hits
   * tap wherever it happens to have got to, so a slow shape drifts across the
   * pattern instead of resetting under each note.
   */
  retrigger: boolean;
};

/**
 * Starts bypassed, already dialled in so switching it on does something.
 *
 * Retriggered by default: a hit that sweeps the same way every time is the
 * predictable case, and hearing that first makes what free mode does obvious.
 */
export const DEFAULT_CHANNEL_LFO: ChannelLfo = {
  enabled: false,
  shape: DEFAULT_LFO_SHAPE,
  rateHz: DEFAULT_LFO_HZ,
  amount: DEFAULT_LFO_AMOUNT,
  destination: DEFAULT_LFO_DESTINATION,
  retrigger: true,
};

/** Per-channel sample loading state. */
export type SampleState =
  | { status: "empty" }
  | { status: "loading"; name: string }
  | {
      status: "loaded";
      name: string;
      /** Per-bucket peak amplitudes (0..1) for the waveform display. */
      peaks: number[];
      durationSeconds: number;
    }
  | { status: "error"; message: string };

/**
 * Where in a loaded sample playback starts and ends, as fractions of the whole
 * file rather than as a number of seconds.
 *
 * Fractions because that is the unit the waveform strip is already drawn in: it
 * stretches the whole file across its width whatever the file's length, so a
 * handle dragged halfway along means halfway through the sample at any duration
 * and the display never has to be converted into the setting to stay in step.
 * It also means the pair survive a pitch change, which moves how long the region
 * lasts without moving where in the sample it sits.
 */
export const DEFAULT_SAMPLE_START = 0;
export const DEFAULT_SAMPLE_END = 1;

/**
 * Which way through the file a hit reads. Forwards until asked otherwise, since
 * that is what the sample already is — reversing is an effect applied to it.
 */
export const DEFAULT_SAMPLE_REVERSED = false;

/**
 * The narrowest region the two handles may leave between them.
 *
 * Half a percent of the file, which on anything longer than a click is still
 * only a few milliseconds — narrow enough to trim a hit down to its transient.
 * The floor exists so the handles cannot be dragged through one another onto a
 * region that plays nothing: a channel that has silently stopped sounding is a
 * bad thing to have to work out from the mix.
 */
export const MIN_SAMPLE_SPAN = 0.005;

function clampFraction(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * The start handle, kept inside the file and behind the end handle.
 *
 * Each edge is clamped against where the other one currently is rather than the
 * two being validated as a pair, because that is how they are moved: one handle
 * at a time, with the other standing still. Dragging one into the other stops it
 * a span short instead of pushing it along, so the edge that was not grabbed
 * stays exactly where it was put.
 */
export function clampSampleStart(start: number, end: number): number {
  if (!Number.isFinite(start)) return DEFAULT_SAMPLE_START;
  const ceiling = clampFraction(end) - MIN_SAMPLE_SPAN;
  return Math.min(Math.max(start, 0), Math.max(ceiling, 0));
}

export function clampSampleEnd(end: number, start: number): number {
  if (!Number.isFinite(end)) return DEFAULT_SAMPLE_END;
  const floor = clampFraction(start) + MIN_SAMPLE_SPAN;
  return Math.max(Math.min(end, 1), Math.min(floor, 1));
}

/** True once the handles have been moved off the ends of the file. */
export function isSampleTrimmed(start: number, end: number): boolean {
  return start > DEFAULT_SAMPLE_START || end < DEFAULT_SAMPLE_END;
}

/** How long the region between the handles lasts, at playback rate 1. */
export function sampleSpanSeconds(
  start: number,
  end: number,
  durationSeconds: number,
): number {
  return (
    (clampSampleEnd(end, start) - clampSampleStart(start, end)) *
    durationSeconds
  );
}

/**
 * How a loaded sample is read.
 *
 * One shot is what a drum machine does before it does anything else: every hit
 * plays the whole trimmed region. Slicer divides that same region into equal
 * parts and hands the choice of which one to the pattern, so a single loaded
 * break can be re-ordered step by step rather than only re-triggered.
 *
 * A mode of its own rather than a slice count of one, because the two are
 * different things to the pattern above: in one shot a step's position means
 * nothing at all, and a count standing in for "not sliced" would leave every
 * step carrying a parameter that sometimes does nothing.
 */
export const SAMPLE_MODES = ["oneshot", "slicer"] as const;

export type SampleMode = (typeof SAMPLE_MODES)[number];

/** What a sample already is until it is asked to be something else. */
export const DEFAULT_SAMPLE_MODE: SampleMode = "oneshot";

export const SAMPLE_MODE_LABELS: Record<SampleMode, string> = {
  oneshot: "One shot",
  slicer: "Slicer",
};

/**
 * How many parts the region can be cut into.
 *
 * Doublings up to 16, which is the grid's own resolution — at that count a bar
 * of a break lands a slice on every 16th note, which is the chop a sliced
 * sample is nearly always reached for. 24 sits on the end for the triplet case:
 * a bar of 16th triplets, and the one useful count that is not a doubling.
 *
 * A short list rather than a slider, for the same reason the step lengths are
 * one: what these are for is dividing a bar, and the counts in between divide
 * nothing in particular.
 */
export const SLICE_COUNTS = [4, 8, 16, 24] as const;

export type SliceCount = (typeof SLICE_COUNTS)[number];

/** One slice per step of a 16-step channel — a bar cut into 16th notes. */
export const DEFAULT_SLICE_COUNT: SliceCount = 16;

/** Which slice a step fires, counted from 0: the first, until it is moved. */
export const DEFAULT_STEP_SLICE = 0;

/** Narrows the raw value a button hands back to a count that is on offer. */
export function clampSliceCount(value: number): SliceCount {
  const count = Number(value) as SliceCount;
  return SLICE_COUNTS.includes(count) ? count : DEFAULT_SLICE_COUNT;
}

/**
 * Which slice a step actually plays, given how many there are.
 *
 * Clamped on the way out rather than rewritten into the step when the count
 * changes, exactly as steps past a channel's `length` are left alone: dropping
 * from 24 slices to 8 and going back hands every step the position it was
 * given, and only what is out of reach in between is pulled in to the last one.
 */
export function clampStepSlice(value: number, sliceCount: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STEP_SLICE;
  const count = clampSliceCount(sliceCount);
  return Math.min(Math.max(Math.round(value), DEFAULT_STEP_SLICE), count - 1);
}

/** Counted from 1 wherever it is shown, the way a part of something is. */
export function formatStepSlice(slice: number, sliceCount: number): string {
  const count = clampSliceCount(sliceCount);
  return `${clampStepSlice(slice, count) + 1} / ${count}`;
}

/** True while a channel's sample is cut up rather than played whole. */
export function isSliced(mode: SampleMode): boolean {
  return mode === "slicer";
}

/** A stretch of a loaded file, as fractions of the whole of it. */
export type SampleRegion = { start: number; end: number };

/**
 * Where one slice sits in the file.
 *
 * The cuts divide the *trimmed* region rather than the whole file, which is
 * what makes trimming and slicing compose: the handles take the silence off the
 * front of a break, and the slices then land on the bar that is left instead of
 * being thrown out of step by whatever was in front of it.
 */
export function sliceRegion(
  start: number,
  end: number,
  sliceCount: number,
  slice: number,
): SampleRegion {
  const from = clampSampleStart(start, end);
  const to = clampSampleEnd(end, start);
  const count = clampSliceCount(sliceCount);
  const width = (to - from) / count;
  const index = clampStepSlice(slice, count);

  return { start: from + index * width, end: from + (index + 1) * width };
}

/**
 * Where the cuts fall inside the trimmed region, for the marks the waveform
 * draws. The outer two are left out: those are the trim handles, which the
 * strip already has its own way of showing.
 */
export function sliceBoundaries(
  start: number,
  end: number,
  sliceCount: number,
): number[] {
  const from = clampSampleStart(start, end);
  const to = clampSampleEnd(end, start);
  const count = clampSliceCount(sliceCount);

  return Array.from(
    { length: count - 1 },
    (_, index) => from + ((index + 1) / count) * (to - from),
  );
}

export const MAX_CHANNEL_NAME_LENGTH = 24;

/**
 * How hard a step is hit, as a fraction of the channel's own volume.
 *
 * Velocity only ever attenuates: full is the top of the range rather than its
 * middle, so a pattern with nothing accented sounds exactly as it did before
 * there was such a thing as velocity, and the headroom above unity stays where
 * it already is — on the channel's volume, which reaches MAX_VOLUME.
 *
 * The floor sits above silence on purpose. A step that is on but inaudible looks
 * exactly like one that is playing, and hunting through a pattern for the step
 * that was swiped down to nothing is a bad afternoon; `on` is what expresses
 * silence, and this is quiet enough to read as a ghost note without vanishing.
 */
export const MIN_STEP_VELOCITY = 0.05;
export const MAX_STEP_VELOCITY = 1;
export const DEFAULT_STEP_VELOCITY = MAX_STEP_VELOCITY;

/**
 * Chance a step fires when its turn comes round, as a fraction. At 1 (the
 * default) a step behaves exactly as it always has — every pass plays it; below
 * that it rolls the dice each time its tick comes up and sits out the times it
 * loses, which is what turns a fixed pattern into one that varies loop to loop.
 *
 * The floor is 0 rather than something above silence the way velocity's is:
 * a step that never fires is a legitimate thing to dial in — a hit saved for
 * later, muted by chance rather than by hand — and there is no meter to lose it
 * on the way to.
 */
export const MIN_STEP_PROBABILITY = 0;
export const MAX_STEP_PROBABILITY = 1;
export const DEFAULT_STEP_PROBABILITY = MAX_STEP_PROBABILITY;

/**
 * How many times a step retriggers within its own duration. At 1 (the
 * default) it fires once, like every step always has; above that it splits the
 * gap to the next step evenly and fires again on each subdivision, for the
 * rolls and ratchets a single hit can't make on its own.
 *
 * Capped at 4 rather than left open-ended: a step is already a 16th note, so a
 * repeat of 4 already reaches the 64th notes the grid's own top length maxes
 * out at, and going further would ask for a subdivision finer than the pattern
 * itself can express anywhere else.
 */
export const MIN_STEP_REPEAT = 1;
export const MAX_STEP_REPEAT = 4;
export const DEFAULT_STEP_REPEAT = MIN_STEP_REPEAT;

/**
 * The channel parameters a single step is allowed to override.
 *
 * Written as keys of `Channel` rather than as a list of their own, so the two
 * can never drift: a lock is by definition one of the channel's own settings,
 * standing in for it on one step. Every one of them is already applied per hit
 * by `trigger`, so a lock costs the audio layer nothing at all.
 *
 * Choke is left out — it is routing between channels rather than part of how a
 * hit sounds — and so is the LFO, whose free-running mode shares one set of
 * nodes across every hit on the channel and so has nothing per-step to give.
 */
export const LOCKABLE_PARAMETERS = [
  "volume",
  "pan",
  "pitch",
  "lowCutHz",
  "highCutHz",
  "attackSeconds",
  "decaySeconds",
  "delaySend",
  "reverbSend",
  "phaserSend",
] as const;

export type LockableParameter = (typeof LOCKABLE_PARAMETERS)[number];

export type StepLocks = Partial<Pick<Channel, LockableParameter>>;

/**
 * One step of a pattern.
 *
 * An object rather than a bare flag because a step now carries three separate
 * things, and keeping them in one value is what lets every pattern helper move
 * a step without knowing what is on it — `nudgeSteps` rotates locks and
 * velocities along with the rhythm for free, where parallel arrays would each
 * need their own rotation and the first one that got missed would be a silent
 * corruption.
 *
 * `on` is kept apart from the velocity rather than folded into it as a zero for
 * the same reason the pattern is always MAX_STEPS long: switching a step off is
 * not the same as throwing away what was dialled into it. Toggling it back on
 * returns the accent and the locks it had, and `invertSteps` stays exactly its
 * own undo.
 */
export type Step = {
  /** Whether the step fires at all. */
  on: boolean;
  /** How hard, as a fraction of the channel's volume. */
  velocity: number;
  /** Chance this step actually fires when its turn comes, 0..1. */
  probability: number;
  /** How many times this step retriggers within its own duration. */
  repeatCount: number;
  /**
   * Which slice of the sample this step fires, counted from 0.
   *
   * Meaningless while the channel is a one shot — nothing reads it there — and
   * kept anyway, for the same reason a switched-off step keeps its velocity:
   * turning slicing off and on again hands back the chop that was written
   * rather than a flattened copy of it.
   */
  slice: number;
  /**
   * What this step overrides, or undefined for a step that plays the channel as
   * its sliders show it. Left off rather than held as an empty object, since
   * most steps lock nothing and 64 of them across 16 channels is a thousand
   * allocations that would all say the same nothing.
   */
  locks?: StepLocks;
};

export function createStep(): Step {
  return {
    on: false,
    velocity: DEFAULT_STEP_VELOCITY,
    probability: DEFAULT_STEP_PROBABILITY,
    repeatCount: DEFAULT_STEP_REPEAT,
    slice: DEFAULT_STEP_SLICE,
  };
}

/** True once a step overrides at least one of the channel's parameters. */
export function hasStepLocks(step: Step): boolean {
  return step.locks !== undefined && Object.keys(step.locks).length > 0;
}

export function clampStepVelocity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STEP_VELOCITY;
  return Math.min(Math.max(value, MIN_STEP_VELOCITY), MAX_STEP_VELOCITY);
}

export function formatVelocity(value: number): string {
  return `${Math.round(clampStepVelocity(value) * 100)}%`;
}

export function clampStepProbability(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STEP_PROBABILITY;
  return Math.min(Math.max(value, MIN_STEP_PROBABILITY), MAX_STEP_PROBABILITY);
}

export function formatProbability(value: number): string {
  return `${Math.round(clampStepProbability(value) * 100)}%`;
}

/** Rolls the dice for one step: true more often the higher the probability. */
export function stepFires(probability: number): boolean {
  return Math.random() < clampStepProbability(probability);
}

export function clampStepRepeat(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STEP_REPEAT;
  return Math.min(
    Math.max(Math.round(value), MIN_STEP_REPEAT),
    MAX_STEP_REPEAT,
  );
}

export function formatStepRepeat(value: number): string {
  return `×${clampStepRepeat(value)}`;
}

/**
 * What a vertical swipe across a step writes.
 *
 * One target at a time rather than one per axis: a step button is a small thing
 * to aim at, and a gesture that meant two different things depending on which
 * way it drifted would land on the wrong one constantly. Which also makes the
 * switch itself the honest place to say what the grid is currently for —
 * knocking out a rhythm, or writing a line.
 */
export const SWIPE_TARGETS = ["velocity", "pitch", "slice"] as const;

export type SwipeTarget = (typeof SWIPE_TARGETS)[number];

/** Velocity, because a drum machine is what this is before it is anything else. */
export const DEFAULT_SWIPE_TARGET: SwipeTarget = "velocity";

export const SWIPE_TARGET_LABELS: Record<SwipeTarget, string> = {
  velocity: "Velocity",
  pitch: "Pitch",
  slice: "Position",
};

/**
 * Which targets a channel actually offers.
 *
 * Position is the one that depends on the sample rather than on the step: a one
 * shot has no parts to move a hit between, so it is left off the switch
 * entirely rather than offered and then quietly doing nothing.
 */
export function swipeTargetsFor(mode: SampleMode): SwipeTarget[] {
  return SWIPE_TARGETS.filter((target) => target !== "slice" || isSliced(mode));
}

/**
 * What a swipe on this channel's grid writes, given what its sample is.
 *
 * The target is held by the machine rather than by the channel — it is a choice
 * about what you are doing right now — so selecting a one shot while the grid is
 * pointed at Position leaves it aimed at something that channel hasn't got. It
 * falls back rather than sticking, and switching back to a sliced channel finds
 * Position still chosen.
 */
export function resolveSwipeTarget(
  target: SwipeTarget,
  mode: SampleMode,
): SwipeTarget {
  return swipeTargetsFor(mode).includes(target) ? target : DEFAULT_SWIPE_TARGET;
}

/**
 * What pitch a step actually plays at: its own lock, or the channel's pitch
 * where it has none.
 *
 * The asymmetry with velocity is the point. Velocity belongs to the step and
 * always has a value; pitch belongs to the channel, and a step only has one of
 * its own once something has been written there — so swiping pitch starts from
 * wherever the channel is tuned and leaves a lock behind, where swiping velocity
 * simply moves a number the step was already carrying.
 */
export function stepPitch(step: Step, channelPitch: number): number {
  return step.locks?.pitch ?? channelPitch;
}

export type Channel = {
  id: string;
  /** Immutable channel number, used as the fallback when `name` is blank. */
  label: string;
  /** User-editable channel name. May be empty while being typed. */
  name: string;
  /**
   * Always MAX_STEPS long. Only the first `length` steps play, so shrinking a
   * channel and growing it again preserves whatever was programmed past the end.
   */
  steps: Step[];
  /** Steps in this channel's cycle. Channels wrap independently. */
  length: number;
  /** Linear gain applied to every hit on this channel. */
  volume: number;
  /** Where this channel sits across the stereo image; at DEFAULT_PAN, centred. */
  pan: number;
  /** Pitch offset in semitones, applied via playback rate. */
  pitch: number;
  /** Highpass cutoff; at MIN_FILTER_HZ the filter is bypassed. */
  lowCutHz: number;
  /** Lowpass cutoff; at MAX_FILTER_HZ the filter is bypassed. */
  highCutHz: number;
  /** Fade-in time for each hit; at MIN_ATTACK_SECONDS the onset is instant. */
  attackSeconds: number;
  /**
   * How long a hit takes to fade to silence after the attack. At
   * MAX_DECAY_SECONDS the envelope is bypassed and the sample rings out in full.
   */
  decaySeconds: number;
  /** How much of this channel is tapped off to the delay bus. */
  delaySend: number;
  /** How much of this channel is tapped off to the reverb bus. */
  reverbSend: number;
  /** How much of this channel is tapped off to the phaser bus. */
  phaserSend: number;
  /** Silences this channel on its own. */
  muted: boolean;
  /** While any channel is soloed, every channel that isn't goes silent. */
  soloed: boolean;
  /**
   * The channel whose hits cut this one short, or null for none. Named for the
   * channel being *choked* rather than the one doing the choking, so the setting
   * sits on the channel it affects and one hit can silence several others.
   */
  chokedBy: string | null;
  /** Modulation applied to every hit on this channel. */
  lfo: ChannelLfo;
  sample: SampleState;
  /**
   * Where in the sample a hit starts, as a fraction of the whole file. Trimming
   * the front is what turns a recording with air in front of it into a hit that
   * lands on the beat.
   */
  sampleStart: number;
  /** Where a hit stops, as a fraction of the whole file. */
  sampleEnd: number;
  /**
   * Plays the trimmed region back to front. The edges keep their meaning — the
   * same slice of the file is heard, read the other way — so reversing a hit
   * cut to its transient gives that transient's tail leading into it, which is
   * the swell a reversed sample is wanted for.
   */
  sampleReversed: boolean;
  /**
   * Whether a hit plays the trimmed region whole, or one slice of it. In slicer
   * mode which slice is the step's to choose; everything else about the sample —
   * the trim, the direction, and the count below — stays the channel's.
   */
  sampleMode: SampleMode;
  /** How many parts the trimmed region is divided into while slicing. */
  sliceCount: SliceCount;
};

export function channelIdForIndex(index: number): string {
  return `channel-${index + 1}`;
}

export function createInitialChannels(): Channel[] {
  return Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
    id: channelIdForIndex(index),
    label: `Ch. ${index + 1}`,
    name: `Ch. ${index + 1}`,
    // Built one at a time rather than filled: `fill` would hand every step the
    // same object, and writing a velocity into one would write it into all 64.
    steps: Array.from({ length: MAX_STEPS }, createStep),
    length: DEFAULT_STEP_COUNT,
    volume: DEFAULT_VOLUME,
    pan: DEFAULT_PAN,
    pitch: DEFAULT_PITCH,
    lowCutHz: DEFAULT_LOW_CUT_HZ,
    highCutHz: DEFAULT_HIGH_CUT_HZ,
    attackSeconds: DEFAULT_ATTACK_SECONDS,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    delaySend: DEFAULT_SEND,
    reverbSend: DEFAULT_SEND,
    phaserSend: DEFAULT_SEND,
    muted: false,
    soloed: false,
    // Nothing chokes anything until it is asked to: a kit where hits cut each
    // other off is a routing decision, not a starting point.
    chokedBy: null,
    lfo: DEFAULT_CHANNEL_LFO,
    sample: { status: "empty" },
    // The whole file, so a sample plays in full until an edge is dragged in.
    sampleStart: DEFAULT_SAMPLE_START,
    sampleEnd: DEFAULT_SAMPLE_END,
    sampleReversed: DEFAULT_SAMPLE_REVERSED,
    // Whole hits, which is what a drum machine plays until it is told to chop.
    sampleMode: DEFAULT_SAMPLE_MODE,
    sliceCount: DEFAULT_SLICE_COUNT,
  }));
}

/**
 * A channel with nothing on it: no sample, no pattern, and the name back to the
 * channel number it started as. The trim goes with the sample, since the edges
 * it holds were dragged onto a file that is no longer there.
 *
 * How the channel *sounds* — volume, pitch, cuts, envelope, sends, routing and
 * the LFO — is deliberately kept. Emptying is for clearing away what was loaded
 * and what was written, not for undoing a mix; anyone wanting the sliders back
 * where they started can recall a snapshot.
 *
 * Every step is reset, not just the ones inside `length`, unlike `clearSteps`:
 * this is the whole channel going, so nothing is left waiting past the end for
 * a pattern that was made to be forgotten.
 */
export function emptyChannel(channel: Channel): Channel {
  return {
    ...channel,
    name: channel.label,
    steps: Array.from({ length: MAX_STEPS }, createStep),
    length: DEFAULT_STEP_COUNT,
    sample: { status: "empty" },
    sampleStart: DEFAULT_SAMPLE_START,
    sampleEnd: DEFAULT_SAMPLE_END,
    sampleReversed: DEFAULT_SAMPLE_REVERSED,
    // How the sample was cut up goes with the sample, like the trim: the slices
    // divided a file that is no longer in the slot.
    sampleMode: DEFAULT_SAMPLE_MODE,
    sliceCount: DEFAULT_SLICE_COUNT,
  };
}

/**
 * What a snapshot keeps for one channel: everything that shapes how the channel
 * *sounds*, and nothing about what it plays.
 *
 * The pattern, the length, the name and the loaded sample are deliberately left
 * out. Recalling is for putting a sound back where it was, so it must not undo
 * the writing done since — and a sample could not be restored from here anyway,
 * since the decoded audio lives outside React state.
 */
export type ChannelSnapshot = Pick<
  Channel,
  | "volume"
  | "pan"
  | "pitch"
  | "lowCutHz"
  | "highCutHz"
  | "attackSeconds"
  | "decaySeconds"
  | "delaySend"
  | "reverbSend"
  | "phaserSend"
  | "muted"
  | "soloed"
  | "chokedBy"
  | "lfo"
>;

/**
 * Every channel's parameters, all six master stages, and the output fader,
 * taken at one moment.
 *
 * Channels are keyed by id rather than held in order, so a snapshot lands on the
 * channel it was taken from however the list is read back. The master stages are
 * held as they are: each one is replaced wholesale on every change, so keeping
 * the object is keeping its values.
 *
 * The output fader is in here because a snapshot is a mix to come back to and
 * the master level is part of a mix — a recall that put every other level back
 * but left the last one where it was would not reproduce what was saved.
 */
export type ParameterSnapshot = {
  channels: Record<string, ChannelSnapshot>;
  drive: MasterDrive;
  filter: MasterFilter;
  delay: MasterDelay;
  reverb: MasterReverb;
  phaser: MasterPhaser;
  compressor: MasterCompressor;
  volume: number;
};

/**
 * Reads the parameters out of every channel. The nested LFO is copied rather
 * than referenced, so the snapshot is a value of its own from here on.
 */
export function captureChannelSnapshots(
  channels: Channel[],
): Record<string, ChannelSnapshot> {
  return Object.fromEntries(
    channels.map((channel) => [
      channel.id,
      {
        volume: channel.volume,
        pan: channel.pan,
        pitch: channel.pitch,
        lowCutHz: channel.lowCutHz,
        highCutHz: channel.highCutHz,
        attackSeconds: channel.attackSeconds,
        decaySeconds: channel.decaySeconds,
        delaySend: channel.delaySend,
        reverbSend: channel.reverbSend,
        phaserSend: channel.phaserSend,
        muted: channel.muted,
        soloed: channel.soloed,
        chokedBy: channel.chokedBy,
        lfo: { ...channel.lfo },
      },
    ]),
  );
}

/**
 * Writes the snapshot back over the channels, leaving everything it doesn't
 * cover exactly as it is. A channel the snapshot doesn't mention is returned
 * untouched, so recalling can never blank one out.
 */
export function applyChannelSnapshots(
  channels: Channel[],
  snapshots: Record<string, ChannelSnapshot>,
): Channel[] {
  return channels.map((channel) => {
    const saved = snapshots[channel.id];
    // Copied on the way out too, so recalling twice can't hand two channels the
    // same LFO object.
    return saved ? { ...channel, ...saved, lfo: { ...saved.lfo } } : channel;
  });
}

/**
 * What a channel sounds like on one particular step: its own settings, with
 * that step's locks standing in for the ones it overrides.
 *
 * Also what the controls panel reads while a step is open for editing, so the
 * sliders show the same values the step is about to be played with.
 */
export function channelSettingsForStep(
  channel: Channel,
  step: Step | null,
): Channel {
  // Only spread where the step actually overrides something, so the ordinary
  // case — a step that locks nothing — costs no allocation on every hit.
  return step?.locks ? { ...channel, ...step.locks } : channel;
}

/**
 * The stretch of the file one hit reads, or undefined when that is the whole of
 * it and the source can simply be started.
 *
 * A sliced channel always has one: every slice is a fraction of the file by
 * definition, so there is no case where slicing plays everything.
 */
export function sampleRegionForStep(
  channel: Channel,
  step?: Step,
): SampleRegion | undefined {
  if (isSliced(channel.sampleMode)) {
    return sliceRegion(
      channel.sampleStart,
      channel.sampleEnd,
      channel.sliceCount,
      // A preview passes no step, and hears what a step with nothing dialled
      // into it would: the first slice.
      step?.slice ?? DEFAULT_STEP_SLICE,
    );
  }

  if (!isSampleTrimmed(channel.sampleStart, channel.sampleEnd)) {
    return undefined;
  }

  return {
    start: clampSampleStart(channel.sampleStart, channel.sampleEnd),
    end: clampSampleEnd(channel.sampleEnd, channel.sampleStart),
  };
}

/**
 * The per-hit audio settings a channel plays with. Shared by the scheduler and
 * by one-off previews so an audition sounds exactly like the sequenced hit.
 *
 * `step` is the step being played, where there is one: its locks stand in for
 * the channel's settings and its velocity scales the hit. A preview passes none
 * and hears the channel exactly as the sliders show it.
 */
export function triggerOptionsForChannel(channel: Channel, step?: Step) {
  const settings = channelSettingsForStep(channel, step ?? null);
  const velocity = step
    ? clampStepVelocity(step.velocity)
    : DEFAULT_STEP_VELOCITY;

  // Dropped when it would move nothing, so a switched-off LFO costs no nodes.
  const lfo = isLfoBypassed(settings.lfo) ? undefined : settings.lfo;

  // Read off the channel rather than the resolved settings: what is in the slot
  // — the trim, the direction, and how the file is cut up — belongs to the
  // sample rather than to how one step of the pattern sounds, so none of it is
  // among the parameters a step is allowed to lock. A sliced step has its say
  // through `slice`, which picks one of those parts rather than moving them.
  const region = sampleRegionForStep(channel, step);

  return {
    // Velocity only attenuates, so this keeps the ceiling the channel volume
    // already had and a pattern with no accents in it is unchanged.
    gain: clampVolume(settings.volume) * velocity,
    // Left off in the centre, where a panner would only widen a mono voice to
    // no audible end.
    pan: isPanCentred(settings.pan) ? undefined : clampPan(settings.pan),
    playbackRate: playbackRateForPitch(settings.pitch),
    // Undefined skips the filter node entirely when it would be inaudible —
    // unless the LFO is pointed at that cut, since modulation needs a node to
    // land on and a cut parked at its bypass extreme still has room to sweep.
    lowCutHz:
      isLowCutBypassed(settings.lowCutHz) && lfo?.destination !== "lowCut"
        ? undefined
        : clampFrequency(settings.lowCutHz),
    highCutHz:
      isHighCutBypassed(settings.highCutHz) && lfo?.destination !== "highCut"
        ? undefined
        : clampFrequency(settings.highCutHz),
    attackSeconds: isAttackBypassed(settings.attackSeconds)
      ? undefined
      : clampAttack(settings.attackSeconds),
    decaySeconds: isDecayBypassed(settings.decaySeconds)
      ? undefined
      : clampDecay(settings.decaySeconds),
    // A closed send costs nothing to skip, so the tap node is never built.
    delaySend: isSendClosed(settings.delaySend)
      ? undefined
      : clampSend(settings.delaySend),
    reverbSend: isSendClosed(settings.reverbSend)
      ? undefined
      : clampSend(settings.reverbSend),
    phaserSend: isSendClosed(settings.phaserSend)
      ? undefined
      : clampSend(settings.phaserSend),
    // A voice only needs the node a choke fades when something can actually
    // choke it, so an unrouted channel costs nothing.
    chokeable: settings.chokedBy !== null,
    // Left off while the whole file is played, so an untrimmed one shot
    // schedules exactly the plain `start(time)` it always did.
    sampleStart: region?.start,
    sampleEnd: region?.end,
    // Off the channel too, and for the same reason: which way the file is read
    // is a property of the sample in the slot, not of one hit in the pattern.
    sampleReversed: channel.sampleReversed,
    lfo,
  };
}

/**
 * Every channel a hit on `sourceId` cuts short.
 *
 * Read from the choked channels rather than held on the choking one, so one hit
 * can silence any number of channels and no list has to be kept in step with a
 * setting that lives elsewhere.
 */
export function channelsChokedBy(
  channels: Channel[],
  sourceId: string,
): string[] {
  return channels
    .filter((channel) => channel.chokedBy === sourceId)
    .map((channel) => channel.id);
}

/**
 * Narrows the raw string a `<select>` hands back to a channel that still exists,
 * with the empty option meaning no choke at all.
 *
 * A channel is never allowed to choke itself: that would make every hit cut off
 * the one before it, which is a monophonic voice rather than the routing this
 * control is for.
 */
export function clampChokeSource(
  value: string,
  channels: Channel[],
  chokedId: string,
): string | null {
  if (!value || value === chokedId) return null;
  return channels.some((channel) => channel.id === value) ? value : null;
}

/** True once any channel is soloed, which silences all the others. */
export function hasSoloedChannel(channels: Channel[]): boolean {
  return channels.some((channel) => channel.soloed);
}

/**
 * Mute wins over solo, so each button keeps one meaning: mute always silences
 * its own channel, solo only decides which of the unmuted channels survive.
 */
export function isChannelAudible(
  channel: Channel,
  soloActive: boolean,
): boolean {
  return !channel.muted && (!soloActive || channel.soloed);
}

export function clampLength(value: number): number {
  if (!Number.isFinite(value)) return MIN_STEPS;
  return Math.min(Math.max(Math.round(value), MIN_STEPS), MAX_STEPS);
}

/**
 * One of the ready-made rhythms the fill buttons write.
 *
 * A fill is a repeating cycle rather than a fixed list of steps: `offsets` are
 * the hits inside one `period`, and the cycle simply keeps going for as long as
 * the channel is. That way a fill means the same thing at any length instead of
 * being tied to the 16 steps a channel happens to start with.
 */
export type StepFill = {
  id: string;
  label: string;
  /** Length of the repeating cycle, in steps. */
  period: number;
  /** Which steps within the cycle are hit, counted from 0. */
  offsets: number[];
};

/**
 * The fills on offer, ordered from sparsest to busiest. Periods are written in
 * terms of STEPS_PER_BEAT so they stay correct if the grid's resolution ever
 * changes: what each one means is a rhythm, not a number of steps.
 */
export const STEP_FILLS: StepFill[] = [
  /** Every beat — the pulse you would count out loud. */
  { id: "downbeat", label: "Downbeat", period: STEPS_PER_BEAT, offsets: [0] },
  /** Beats 2 and 4 of the bar, where the snare lands. */
  {
    id: "backbeat",
    label: "Backbeat",
    period: STEPS_PER_BEAT * 2,
    offsets: [STEPS_PER_BEAT],
  },
  /** The "&" halfway between beats — the downbeat's opposite half. */
  {
    id: "offbeat",
    label: "Offbeat",
    period: STEPS_PER_BEAT,
    offsets: [STEPS_PER_BEAT / 2],
  },
  /**
   * The tresillo: eight steps split 3 + 3 + 2 instead of evenly, so the hits
   * pull against the beat rather than sitting on it.
   */
  {
    id: "tresillo",
    label: "3 + 3 + 2",
    period: STEPS_PER_BEAT * 2,
    offsets: [0, 3, 6],
  },
  { id: "eighth", label: "8th", period: STEPS_PER_BEAT / 2, offsets: [0] },
  { id: "sixteenth", label: "16th", period: 1, offsets: [0] },
];

/** Whether a fill puts a hit on a given step of the pattern. */
function fillHitsStep(fill: StepFill, stepIndex: number): boolean {
  return fill.offsets.includes(stepIndex % fill.period);
}

/**
 * Writes a fill over the steps a channel actually plays.
 *
 * Steps past `length` are left exactly as they were, so a fill never reaches
 * the pattern a shortened channel is holding on to past its end — the same
 * promise editing a single step makes.
 *
 * Only `on` is written. A fill is a rhythm, and the velocity and the locks
 * dialled into a step are not part of one — so they stay put underneath it,
 * exactly as they do when a step is switched off by hand.
 */
export function applyStepFill(
  steps: Step[],
  length: number,
  fill: StepFill,
): Step[] {
  const playing = clampLength(length);
  return steps.map((step, index) => {
    if (index >= playing) return step;
    const on = fillHitsStep(fill, index);
    return step.on === on ? step : { ...step, on };
  });
}

/**
 * Empties the steps a channel plays, leaving anything past `length` alone.
 *
 * The one action on the pattern meant to throw work away, so it resets those
 * steps outright — velocities and locks with them — where switching a step off
 * by hand leaves both sitting underneath it.
 */
export function clearSteps(steps: Step[], length: number): Step[] {
  const playing = clampLength(length);
  return steps.map((step, index) => (index < playing ? createStep() : step));
}

/**
 * Flips every step a channel plays: hits fall silent, silences become hits.
 *
 * Steps past `length` are left alone, like every other pattern write, so the
 * pattern a shortened channel is holding on to past its end survives the flip.
 * That also makes inverting its own undo — pressing it twice hands back exactly
 * what you started with, so it is safe to try on a pattern worth keeping.
 *
 * Which is why only `on` is flipped: a step silenced here keeps the velocity and
 * the locks it was carrying, so the second press really does return the pattern
 * it was given rather than a flattened copy of it.
 */
export function invertSteps(steps: Step[], length: number): Step[] {
  const playing = clampLength(length);
  return steps.map((step, index) =>
    index < playing ? { ...step, on: !step.on } : step,
  );
}

/**
 * How far humanizing may move a step's velocity, either way, as a fraction of
 * the full velocity range.
 *
 * A tenth is deliberately small. Humanizing stands in for a player who is not
 * quite even rather than for one who is accenting: past this the scatter stops
 * reading as a hand on the pads and starts reading as a pattern that was
 * programmed with accents in it, which is what velocity is already for.
 */
export const HUMANIZE_VELOCITY_AMOUNT = 0.1;

/**
 * Scatters the velocity of every hit a channel plays, by up to
 * HUMANIZE_VELOCITY_AMOUNT either way.
 *
 * Only steps that are `on` are touched. Velocity on a silent step is what it
 * will be hit at once it is switched back on — the thing `invertSteps` and
 * toggling are careful to preserve — so humanizing a pattern would otherwise
 * quietly rewrite the parts of it that aren't playing.
 *
 * The swing is symmetric and clamped, which means a step already at full
 * velocity can only be moved down; on a pattern where nothing has been accented
 * yet that leaves roughly half the hits where they were. That is the honest
 * outcome rather than a flaw to design around: velocity only ever attenuates
 * here, so there is nothing above full to scatter into, and pressing again
 * walks the pattern further out — each press moves what the last one left.
 */
export function humanizeSteps(steps: Step[], length: number): Step[] {
  const playing = clampLength(length);
  return steps.map((step, index) => {
    if (index >= playing || !step.on) return step;

    const offset = (Math.random() * 2 - 1) * HUMANIZE_VELOCITY_AMOUNT;
    return { ...step, velocity: clampStepVelocity(step.velocity + offset) };
  });
}

/**
 * Slides the whole pattern along by `offset` steps — positive later, negative
 * earlier.
 *
 * It rotates rather than shifts: a hit pushed off the end comes back at the
 * start, so nudging is always reversible and repeatedly nudging walks the
 * pattern around its cycle instead of gradually emptying it.
 *
 * Whole steps move, so a nudged pattern carries its accents and its locks round
 * with it — the reason all three live in one array rather than three.
 */
export function nudgeSteps(
  steps: Step[],
  length: number,
  offset: number,
): Step[] {
  const playing = clampLength(length);
  return steps.map((step, index) => {
    if (index >= playing) return step;
    // Wrapped twice, since a backward nudge would otherwise index off the
    // front: JavaScript's % keeps the sign of the left operand.
    return steps[(((index - offset) % playing) + playing) % playing];
  });
}

/**
 * True when the played steps are exactly what `fill` would write.
 *
 * Only the rhythm is compared. A fill button stays lit as a readout of what is
 * programmed, and accenting one step of a backbeat has not stopped it being a
 * backbeat — dropping the light there would be the dishonest answer.
 */
export function matchesStepFill(
  steps: Step[],
  length: number,
  fill: StepFill,
): boolean {
  const playing = clampLength(length);
  return steps.every(
    (step, index) => index >= playing || step.on === fillHitsStep(fill, index),
  );
}

/** True while the channel has at least one hit inside the steps it plays. */
export function hasActiveSteps(steps: Step[], length: number): boolean {
  const playing = clampLength(length);
  return steps.some((step, index) => step.on && index < playing);
}

/** Replaces one step, handing back the rest of the pattern untouched. */
function withStep(
  steps: Step[],
  index: number,
  next: (step: Step) => Step,
): Step[] {
  return steps.map((step, i) => (i === index ? next(step) : step));
}

export function toggleStepAt(steps: Step[], index: number): Step[] {
  return withStep(steps, index, (step) => ({ ...step, on: !step.on }));
}

/**
 * Sets a step's velocity, switching it on if it wasn't.
 *
 * Reaching for a velocity is a request to hear that step, so dialling one into
 * a silent step and leaving it silent would answer the gesture with nothing.
 */
export function setStepVelocityAt(
  steps: Step[],
  index: number,
  velocity: number,
): Step[] {
  return withStep(steps, index, (step) => ({
    ...step,
    on: true,
    velocity: clampStepVelocity(velocity),
  }));
}

/**
 * Sets a step's probability, switching it on if it wasn't — the same reasoning
 * as velocity: dialling in a chance is a request to hear the step, not to leave
 * it silent regardless of what the dice would have said.
 */
export function setStepProbabilityAt(
  steps: Step[],
  index: number,
  probability: number,
): Step[] {
  return withStep(steps, index, (step) => ({
    ...step,
    on: true,
    probability: clampStepProbability(probability),
  }));
}

/** Sets how many times a step retriggers, switching it on if it wasn't. */
export function setStepRepeatAt(
  steps: Step[],
  index: number,
  repeatCount: number,
): Step[] {
  return withStep(steps, index, (step) => ({
    ...step,
    on: true,
    repeatCount: clampStepRepeat(repeatCount),
  }));
}

/**
 * Points a step at one slice of the sample, switching it on if it wasn't — the
 * same reasoning as the three above: choosing which part of a break to hear is
 * a request to hear it.
 */
export function setStepSliceAt(
  steps: Step[],
  index: number,
  slice: number,
  sliceCount: number,
): Step[] {
  return withStep(steps, index, (step) => ({
    ...step,
    on: true,
    slice: clampStepSlice(slice, sliceCount),
  }));
}

/** Overrides one of the channel's parameters on one step. */
export function setStepLockAt(
  steps: Step[],
  index: number,
  key: LockableParameter,
  value: number,
): Step[] {
  return withStep(steps, index, (step) => ({
    ...step,
    locks: { ...step.locks, [key]: value },
  }));
}

/**
 * Drops one override, putting that parameter back on the channel's own setting.
 * The last one to go takes the whole record with it, so `hasStepLocks` never
 * reports a step that is holding an empty object.
 */
export function clearStepLockAt(
  steps: Step[],
  index: number,
  key: LockableParameter,
): Step[] {
  return withStep(steps, index, (step) => {
    if (step.locks?.[key] === undefined) return step;

    const locks = { ...step.locks };
    delete locks[key];

    // Annotated, so `locks` is the optional property it is on a Step rather
    // than the required one this literal would otherwise be inferred to have.
    const next: Step = { ...step, locks };
    if (Object.keys(locks).length === 0) delete next.locks;
    return next;
  });
}

/** Drops every override on a step, back to the channel as its sliders show it. */
export function clearStepLocksAt(steps: Step[], index: number): Step[] {
  return withStep(steps, index, (step) => {
    if (!step.locks) return step;

    const next = { ...step };
    delete next.locks;
    return next;
  });
}

/** Resets one step to a freshly created one: off, default velocity, no locks. */
export function clearStepAt(steps: Step[], index: number): Step[] {
  return withStep(steps, index, () => createStep());
}

/** True while a step is already at `createStep`'s defaults, with nothing to clear. */
export function isStepCleared(step: Step): boolean {
  return (
    !step.on &&
    step.velocity === DEFAULT_STEP_VELOCITY &&
    step.probability === DEFAULT_STEP_PROBABILITY &&
    step.repeatCount === DEFAULT_STEP_REPEAT &&
    step.slice === DEFAULT_STEP_SLICE &&
    !hasStepLocks(step)
  );
}

/**
 * Overwrites one step with a copy of another, replacing it wholesale rather
 * than merging — a paste is a request for exactly what was copied, on, off,
 * velocity, and locks alike.
 */
export function pasteStepAt(
  steps: Step[],
  index: number,
  source: Step,
): Step[] {
  return withStep(steps, index, () => ({
    on: source.on,
    velocity: source.velocity,
    probability: source.probability,
    repeatCount: source.repeatCount,
    slice: source.slice,
    ...(source.locks ? { locks: { ...source.locks } } : {}),
  }));
}

/** What to show for a channel: its name, falling back to the channel number. */
export function channelDisplayName(channel: Channel): string {
  return channel.name.trim() || channel.label;
}

export function clampChannelName(value: string): string {
  return value.slice(0, MAX_CHANNEL_NAME_LENGTH);
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(Math.max(value, MIN_VOLUME), MAX_VOLUME);
}

export function clampPan(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAN;
  return Math.min(Math.max(value, MIN_PAN), MAX_PAN);
}

/**
 * A centred channel needs no panner at all, so the node is skipped entirely —
 * the same bargain the filters and the sends already make.
 *
 * Worth making here in particular: a StereoPannerNode turns a mono voice into a
 * stereo one, so leaving it in the path on a centred channel would double the
 * work every node downstream of it does for a placement that hasn't moved.
 */
export function isPanCentred(value: number): boolean {
  return clampPan(value) === DEFAULT_PAN;
}

/**
 * Which side, and how far over — "L 50%" rather than "-0.5", because nobody
 * hears a pan as a signed number. The centre is named rather than given a
 * percentage of nothing.
 */
export function formatPan(value: number): string {
  const clamped = clampPan(value);
  if (clamped === DEFAULT_PAN) return "C";
  return `${clamped < 0 ? "L" : "R"} ${Math.round(Math.abs(clamped) * 100)}%`;
}

export function clampDrive(value: number): number {
  if (!Number.isFinite(value)) return MIN_DRIVE;
  return Math.min(Math.max(value, MIN_DRIVE), MAX_DRIVE);
}

/** Narrows the raw string a `<select>` hands back to a known shape. */
export function clampDriveType(value: string): DriveType {
  return DRIVE_TYPES.includes(value as DriveType)
    ? (value as DriveType)
    : DEFAULT_DRIVE_TYPE;
}

export function clampSend(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SEND;
  return Math.min(Math.max(value, MIN_SEND), MAX_SEND);
}

/** A closed send feeds the bus nothing, so the tap is skipped entirely. */
export function isSendClosed(value: number): boolean {
  return clampSend(value) <= MIN_SEND;
}

export function clampDelaySeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DELAY_SECONDS;
  return Math.min(Math.max(value, MIN_DELAY_SECONDS), MAX_DELAY_SECONDS);
}

export function clampFeedback(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FEEDBACK;
  return Math.min(Math.max(value, MIN_FEEDBACK), MAX_FEEDBACK);
}

/** Narrows the raw string a `<select>` hands back to a known shape. */
export function clampDelayDivision(value: string): DelayDivision {
  return DELAY_DIVISIONS.includes(value as DelayDivision)
    ? (value as DelayDivision)
    : DEFAULT_DELAY_DIVISION;
}

/**
 * What the delay line is actually set to. A synced time is not clamped to
 * MAX_DELAY_SECONDS — the line is built long enough for the worst case
 * instead — because shortening it to fit would put the repeats out of time.
 */
export function delayTimeSeconds(delay: MasterDelay, bpm: number): number {
  if (!delay.synced) return clampDelaySeconds(delay.timeSeconds);
  return (
    DELAY_DIVISION_BEATS[clampDelayDivision(delay.division)] *
    secondsPerBeat(bpm)
  );
}

export function clampReverbDecay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REVERB_DECAY_SECONDS;
  return Math.min(
    Math.max(value, MIN_REVERB_DECAY_SECONDS),
    MAX_REVERB_DECAY_SECONDS,
  );
}

/** Narrows the raw string a `<select>` hands back to a stage count on offer. */
export function clampPhaserStages(value: string): PhaserStages {
  const stages = Number(value) as PhaserStages;
  return PHASER_STAGE_COUNTS.includes(stages) ? stages : DEFAULT_PHASER_STAGES;
}

export function clampPhaserRate(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PHASER_RATE_HZ;
  return Math.min(Math.max(value, MIN_PHASER_RATE_HZ), MAX_PHASER_RATE_HZ);
}

export function clampPhaserDepth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PHASER_DEPTH;
  return Math.min(Math.max(value, MIN_PHASER_DEPTH), MAX_PHASER_DEPTH);
}

export function clampPhaserFeedback(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PHASER_FEEDBACK;
  return Math.min(Math.max(value, MIN_PHASER_FEEDBACK), MAX_PHASER_FEEDBACK);
}

const PHASER_RATE_RATIO = MAX_PHASER_RATE_HZ / MIN_PHASER_RATE_HZ;

/**
 * Sweep rates map to a 0..1 slider position logarithmically, for the same
 * reason the LFO's do: this range spans nine octaves, and the slow end — where
 * a phaser spends most of its life — would be a sliver on a linear one.
 */
export function phaserRateToSlider(hz: number): number {
  return (
    Math.log(clampPhaserRate(hz) / MIN_PHASER_RATE_HZ) /
    Math.log(PHASER_RATE_RATIO)
  );
}

export function sliderToPhaserRate(position: number): number {
  const clamped = Math.min(Math.max(position, 0), 1);
  return clampPhaserRate(
    MIN_PHASER_RATE_HZ * Math.pow(PHASER_RATE_RATIO, clamped),
  );
}

/**
 * Slow sweeps read as a period rather than as a frequency — "8.0 s" is a wait
 * you can picture, where "0.13 Hz" is arithmetic — so below one cycle a second
 * the readout switches to how long a cycle takes.
 */
export function formatPhaserRate(hz: number): string {
  const clamped = clampPhaserRate(hz);
  return clamped < 1
    ? `${(1 / clamped).toFixed(1)} s`
    : `${clamped.toFixed(2)} Hz`;
}

export function clampPitch(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PITCH;
  return Math.min(Math.max(Math.round(value), MIN_PITCH), MAX_PITCH);
}

/** Signed, because an offset of 0 and an offset up read the same without it. */
export function formatPitch(semitones: number): string {
  const clamped = clampPitch(semitones);
  return `${clamped > 0 ? `+${clamped}` : clamped} st`;
}

/** Semitone offset as a playback-rate multiplier (12 semitones = 2x). */
export function playbackRateForPitch(semitones: number): number {
  return Math.pow(2, clampPitch(semitones) / 12);
}

export function clampFrequency(value: number): number {
  if (!Number.isFinite(value)) return MIN_FILTER_HZ;
  return Math.min(Math.max(Math.round(value), MIN_FILTER_HZ), MAX_FILTER_HZ);
}

const FILTER_HZ_RATIO = MAX_FILTER_HZ / MIN_FILTER_HZ;

/**
 * Cutoffs map to a 0..1 slider position logarithmically. A linear frequency
 * slider would cram everything musically useful into the leftmost sliver.
 */
export function frequencyToSlider(hz: number): number {
  return (
    Math.log(clampFrequency(hz) / MIN_FILTER_HZ) / Math.log(FILTER_HZ_RATIO)
  );
}

export function sliderToFrequency(position: number): number {
  const clamped = Math.min(Math.max(position, 0), 1);
  return clampFrequency(MIN_FILTER_HZ * Math.pow(FILTER_HZ_RATIO, clamped));
}

/** At the extremes the filter would be inaudible, so it is skipped entirely. */
export function isLowCutBypassed(hz: number): boolean {
  return clampFrequency(hz) <= MIN_FILTER_HZ;
}

export function isHighCutBypassed(hz: number): boolean {
  return clampFrequency(hz) >= MAX_FILTER_HZ;
}

export function formatFrequency(hz: number): string {
  const clamped = clampFrequency(hz);
  return clamped >= 1000
    ? `${(clamped / 1000).toFixed(1)} kHz`
    : `${clamped} Hz`;
}

export function clampAttack(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ATTACK_SECONDS;
  return Math.min(Math.max(value, MIN_ATTACK_SECONDS), MAX_ATTACK_SECONDS);
}

export function clampDecay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DECAY_SECONDS;
  return Math.min(Math.max(value, MIN_DECAY_SECONDS), MAX_DECAY_SECONDS);
}

/**
 * Envelope times map to a 0..1 slider position on a curve. Percussion lives in
 * the first few tens of milliseconds, which a linear slider would cram into a
 * sliver of the travel while the rest of it swept past unusably long times.
 */
const ENVELOPE_CURVE = 3;

function timeToSlider(seconds: number, min: number, max: number): number {
  return Math.pow((seconds - min) / (max - min), 1 / ENVELOPE_CURVE);
}

function sliderToTime(position: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(position, 0), 1);
  return min + (max - min) * Math.pow(clamped, ENVELOPE_CURVE);
}

export function attackToSlider(seconds: number): number {
  return timeToSlider(
    clampAttack(seconds),
    MIN_ATTACK_SECONDS,
    MAX_ATTACK_SECONDS,
  );
}

export function sliderToAttack(position: number): number {
  return sliderToTime(position, MIN_ATTACK_SECONDS, MAX_ATTACK_SECONDS);
}

export function decayToSlider(seconds: number): number {
  return timeToSlider(
    clampDecay(seconds),
    MIN_DECAY_SECONDS,
    MAX_DECAY_SECONDS,
  );
}

export function sliderToDecay(position: number): number {
  return sliderToTime(position, MIN_DECAY_SECONDS, MAX_DECAY_SECONDS);
}

/** An instant onset needs no ramp, so the envelope's attack stage is skipped. */
export function isAttackBypassed(seconds: number): boolean {
  return clampAttack(seconds) <= MIN_ATTACK_SECONDS;
}

/** At the top of the range the sample is left to ring out on its own. */
export function isDecayBypassed(seconds: number): boolean {
  return clampDecay(seconds) >= MAX_DECAY_SECONDS;
}

export function formatSeconds(seconds: number): string {
  return seconds >= 1
    ? `${seconds.toFixed(2)} s`
    : `${Math.round(seconds * 1000)} ms`;
}

/** Narrows the raw string a `<select>` hands back to a known shape. */
export function clampLfoShape(value: string): LfoShape {
  return LFO_SHAPES.includes(value as LfoShape)
    ? (value as LfoShape)
    : DEFAULT_LFO_SHAPE;
}

/** Narrows the raw string a `<select>` hands back to a known destination. */
export function clampLfoDestination(value: string): LfoDestination {
  return LFO_DESTINATIONS.includes(value as LfoDestination)
    ? (value as LfoDestination)
    : DEFAULT_LFO_DESTINATION;
}

export function clampLfoRate(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LFO_HZ;
  return Math.min(Math.max(value, MIN_LFO_HZ), MAX_LFO_HZ);
}

export function clampLfoAmount(value: number): number {
  if (!Number.isFinite(value)) return MIN_LFO_AMOUNT;
  return Math.min(Math.max(value, MIN_LFO_AMOUNT), MAX_LFO_AMOUNT);
}

const LFO_HZ_RATIO = MAX_LFO_HZ / MIN_LFO_HZ;

/**
 * Rates map to a 0..1 slider position logarithmically, for the same reason
 * cutoffs do: everything below 1 Hz is a two-hundredth of this range, and a
 * linear slider would leave the whole slow half of the LFO unreachable.
 */
export function lfoRateToSlider(hz: number): number {
  return Math.log(clampLfoRate(hz) / MIN_LFO_HZ) / Math.log(LFO_HZ_RATIO);
}

export function sliderToLfoRate(position: number): number {
  const clamped = Math.min(Math.max(position, 0), 1);
  return clampLfoRate(MIN_LFO_HZ * Math.pow(LFO_HZ_RATIO, clamped));
}

/** Two decimals below 10 Hz, where a hundredth is still a change worth seeing. */
export function formatLfoRate(hz: number): string {
  const clamped = clampLfoRate(hz);
  return `${clamped < 10 ? clamped.toFixed(2) : clamped.toFixed(1)} Hz`;
}

/**
 * What the amount comes to, which depends on where the LFO is pointed: an
 * interval either side of the pitch or the cutoff, or a tremolo depth, so the
 * one slider reads in the unit of whatever it is currently moving.
 */
export function formatLfoAmount(lfo: ChannelLfo): string {
  const amount = clampLfoAmount(lfo.amount);

  switch (lfo.destination) {
    case "pitch":
      return `±${(amount * LFO_PITCH_RANGE_SEMITONES).toFixed(1)} st`;
    case "volume":
      return `${Math.round(amount * 100)}%`;
    case "lowCut":
    case "highCut":
      return `±${(amount * LFO_FILTER_RANGE_OCTAVES).toFixed(1)} oct`;
  }
}

/** Switched off, or swinging nothing, so the modulation is skipped entirely. */
export function isLfoBypassed(lfo: ChannelLfo): boolean {
  return !lfo.enabled || clampLfoAmount(lfo.amount) <= MIN_LFO_AMOUNT;
}

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BPM;
  return Math.min(Math.max(value, MIN_BPM), MAX_BPM);
}

/**
 * Length of one beat — a quarter note, which is what BPM counts. BPM is clamped
 * so a stray input value (0, empty, or absurdly large) can never produce a
 * broken duration here or in anything derived from it.
 */
export function secondsPerBeat(bpm: number): number {
  return 60 / clampBpm(bpm);
}

/** Length of a single 16th-note step, on the straight grid (no swing). */
export function secondsPerStep(bpm: number): number {
  return secondsPerBeat(bpm) / STEPS_PER_BEAT;
}

export function isDownbeat(stepIndex: number): boolean {
  return stepIndex % STEPS_PER_BEAT === 0;
}

export function clampSwing(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SWING;
  return Math.min(Math.max(value, MIN_SWING), MAX_SWING);
}

export function formatSwing(value: number): string {
  return `${Math.round(clampSwing(value) * 100)}%`;
}

/**
 * How long to wait after `tick` before the next one fires. Swing keeps each
 * on-grid pair (the beat and the "&") exactly `2 * secondsPerStep` apart, so
 * lengthening the gap into an off-grid step ("e" or "a") and shortening the
 * gap back out of it by the same amount shuffles the off-grid note without
 * dragging the rest of the pattern off tempo.
 */
export function secondsToNextStep(
  tick: number,
  bpm: number,
  swing: number,
): number {
  const step = secondsPerStep(bpm);
  const amount = clampSwing(swing);
  if (amount <= MIN_SWING) return step;

  const nextStepIsOffGrid = (tick + 1) % 2 === 1;
  return step * (nextStepIsOffGrid ? 1 + amount : 1 - amount);
}

/**
 * When, relative to a step's own start, each of its repeats fires — always
 * starting with 0, so the first entry lands exactly on the step's own scheduled
 * time and every hit after it is purely additional.
 *
 * The repeats split `stepDurationSeconds` — the gap to the *next* step, swing
 * included — into equal slices rather than spacing themselves at some fixed
 * rate, so a roll always finishes before the following step starts however
 * long that gap happens to be, and speeds up or slows down with the tempo and
 * the swing exactly as a single hit already does.
 */
export function repeatOffsets(
  count: number,
  stepDurationSeconds: number,
): number[] {
  const repeats = clampStepRepeat(count);
  return Array.from(
    { length: repeats },
    (_, index) => (index / repeats) * stepDurationSeconds,
  );
}
