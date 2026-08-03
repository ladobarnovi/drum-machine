export const CHANNEL_COUNT = 16;
export const STEPS_PER_BEAT = 4;

export const MIN_STEPS = 1;
export const MAX_STEPS = 64;
export const DEFAULT_STEP_COUNT = 16;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 200;

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1.5;
export const DEFAULT_VOLUME = 1;

/** Pitch offset in semitones; ±24 is two octaves either way. */
export const MIN_PITCH = -24;
export const MAX_PITCH = 24;
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
  /** Silences this channel on its own. */
  muted: boolean;
  /** While any channel is soloed, every channel that isn't goes silent. */
  soloed: boolean;
  sample: SampleState;
};

export function channelIdForIndex(index: number): string {
  return `channel-${index + 1}`;
}

export function createInitialChannels(): Channel[] {
  return Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
    id: channelIdForIndex(index),
    label: String(index + 1),
    name: String(index + 1),
    steps: Array<boolean>(MAX_STEPS).fill(false),
    length: DEFAULT_STEP_COUNT,
    volume: DEFAULT_VOLUME,
    pitch: DEFAULT_PITCH,
    lowCutHz: DEFAULT_LOW_CUT_HZ,
    highCutHz: DEFAULT_HIGH_CUT_HZ,
    attackSeconds: DEFAULT_ATTACK_SECONDS,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    muted: false,
    soloed: false,
    sample: { status: "empty" },
  }));
}

/**
 * The per-hit audio settings a channel plays with. Shared by the scheduler and
 * by one-off previews so an audition sounds exactly like the sequenced hit.
 */
export function triggerOptionsForChannel(channel: Channel) {
  return {
    gain: clampVolume(channel.volume),
    playbackRate: playbackRateForPitch(channel.pitch),
    // Undefined skips the filter node entirely when it would be inaudible.
    lowCutHz: isLowCutBypassed(channel.lowCutHz)
      ? undefined
      : clampFrequency(channel.lowCutHz),
    highCutHz: isHighCutBypassed(channel.highCutHz)
      ? undefined
      : clampFrequency(channel.highCutHz),
    attackSeconds: isAttackBypassed(channel.attackSeconds)
      ? undefined
      : clampAttack(channel.attackSeconds),
    decaySeconds: isDecayBypassed(channel.decaySeconds)
      ? undefined
      : clampDecay(channel.decaySeconds),
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

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BPM;
  return Math.min(Math.max(value, MIN_BPM), MAX_BPM);
}

/**
 * Length of a single 16th-note step. BPM is clamped so a stray input value
 * (0, empty, or absurdly large) can never produce a broken step duration.
 */
export function secondsPerStep(bpm: number): number {
  return 60 / clampBpm(bpm) / STEPS_PER_BEAT;
}

export function isDownbeat(stepIndex: number): boolean {
  return stepIndex % STEPS_PER_BEAT === 0;
}
