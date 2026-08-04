export const CHANNEL_COUNT = 16;
export const STEPS_PER_BEAT = 4;

export const MIN_STEPS = 1;
export const MAX_STEPS = 64;
export const DEFAULT_STEP_COUNT = 16;

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
};

export const DEFAULT_MASTER_REVERB: MasterReverb = {
  enabled: false,
  decaySeconds: DEFAULT_REVERB_DECAY_SECONDS,
  toneHz: DEFAULT_REVERB_TONE_HZ,
  level: DEFAULT_VOLUME,
};

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

export const MAX_CHANNEL_NAME_LENGTH = 24;

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
  steps: boolean[];
  /** Steps in this channel's cycle. Channels wrap independently. */
  length: number;
  /** Linear gain applied to every hit on this channel. */
  volume: number;
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
  /** Silences this channel on its own. */
  muted: boolean;
  /** While any channel is soloed, every channel that isn't goes silent. */
  soloed: boolean;
  /** Modulation applied to every hit on this channel. */
  lfo: ChannelLfo;
  sample: SampleState;
};

export function channelIdForIndex(index: number): string {
  return `channel-${index + 1}`;
}

export function createInitialChannels(): Channel[] {
  return Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
    id: channelIdForIndex(index),
    label: `Ch. ${index + 1}`,
    name: `Ch. ${index + 1}`,
    steps: Array<boolean>(MAX_STEPS).fill(false),
    length: DEFAULT_STEP_COUNT,
    volume: DEFAULT_VOLUME,
    pitch: DEFAULT_PITCH,
    lowCutHz: DEFAULT_LOW_CUT_HZ,
    highCutHz: DEFAULT_HIGH_CUT_HZ,
    attackSeconds: DEFAULT_ATTACK_SECONDS,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    delaySend: DEFAULT_SEND,
    reverbSend: DEFAULT_SEND,
    muted: false,
    soloed: false,
    lfo: DEFAULT_CHANNEL_LFO,
    sample: { status: "empty" },
  }));
}

/**
 * The per-hit audio settings a channel plays with. Shared by the scheduler and
 * by one-off previews so an audition sounds exactly like the sequenced hit.
 */
export function triggerOptionsForChannel(channel: Channel) {
  // Dropped when it would move nothing, so a switched-off LFO costs no nodes.
  const lfo = isLfoBypassed(channel.lfo) ? undefined : channel.lfo;

  return {
    gain: clampVolume(channel.volume),
    playbackRate: playbackRateForPitch(channel.pitch),
    // Undefined skips the filter node entirely when it would be inaudible —
    // unless the LFO is pointed at that cut, since modulation needs a node to
    // land on and a cut parked at its bypass extreme still has room to sweep.
    lowCutHz:
      isLowCutBypassed(channel.lowCutHz) && lfo?.destination !== "lowCut"
        ? undefined
        : clampFrequency(channel.lowCutHz),
    highCutHz:
      isHighCutBypassed(channel.highCutHz) && lfo?.destination !== "highCut"
        ? undefined
        : clampFrequency(channel.highCutHz),
    attackSeconds: isAttackBypassed(channel.attackSeconds)
      ? undefined
      : clampAttack(channel.attackSeconds),
    decaySeconds: isDecayBypassed(channel.decaySeconds)
      ? undefined
      : clampDecay(channel.decaySeconds),
    // A closed send costs nothing to skip, so the tap node is never built.
    delaySend: isSendClosed(channel.delaySend)
      ? undefined
      : clampSend(channel.delaySend),
    reverbSend: isSendClosed(channel.reverbSend)
      ? undefined
      : clampSend(channel.reverbSend),
    lfo,
  };
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
 */
export function applyStepFill(
  steps: boolean[],
  length: number,
  fill: StepFill,
): boolean[] {
  const playing = clampLength(length);
  return steps.map((active, index) =>
    index < playing ? fillHitsStep(fill, index) : active,
  );
}

/** Empties the steps a channel plays, leaving anything past `length` alone. */
export function clearSteps(steps: boolean[], length: number): boolean[] {
  const playing = clampLength(length);
  return steps.map((active, index) => (index < playing ? false : active));
}

/** True when the played steps are exactly what `fill` would write. */
export function matchesStepFill(
  steps: boolean[],
  length: number,
  fill: StepFill,
): boolean {
  const playing = clampLength(length);
  return steps.every(
    (active, index) => index >= playing || active === fillHitsStep(fill, index),
  );
}

/** True while the channel has at least one hit inside the steps it plays. */
export function hasActiveSteps(steps: boolean[], length: number): boolean {
  const playing = clampLength(length);
  return steps.some((active, index) => active && index < playing);
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

export function clampPitch(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PITCH;
  return Math.min(Math.max(Math.round(value), MIN_PITCH), MAX_PITCH);
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
