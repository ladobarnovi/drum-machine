export const CHANNEL_COUNT = 16;
export const STEPS_PER_BEAT = 4;

export const MIN_STEPS = 1;
export const MAX_STEPS = 64;
export const DEFAULT_STEP_COUNT = 16;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 300;

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1.5;
export const DEFAULT_VOLUME = 1;

/** Pitch offset in semitones; ±24 is two octaves either way. */
export const MIN_PITCH = -24;
export const MAX_PITCH = 24;
export const DEFAULT_PITCH = 0;

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
    sample: { status: "empty" },
  }));
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

export function clampPitch(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PITCH;
  return Math.min(Math.max(Math.round(value), MIN_PITCH), MAX_PITCH);
}

/** Semitone offset as a playback-rate multiplier (12 semitones = 2x). */
export function playbackRateForPitch(semitones: number): number {
  return Math.pow(2, clampPitch(semitones) / 12);
}

/**
 * Length of a single 16th-note step. BPM is clamped so a stray input value
 * (0, empty, or absurdly large) can never produce a broken step duration.
 */
export function secondsPerStep(bpm: number): number {
  const safeBpm = Math.min(Math.max(bpm, MIN_BPM), MAX_BPM);
  return 60 / safeBpm / STEPS_PER_BEAT;
}

export function isDownbeat(stepIndex: number): boolean {
  return stepIndex % STEPS_PER_BEAT === 0;
}
