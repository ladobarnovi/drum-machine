export const STEP_COUNT = 16;
export const CHANNEL_COUNT = 8;
export const STEPS_PER_BEAT = 4;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 300;

/** Per-channel sample loading state. */
export type SampleState =
  | { status: "empty" }
  | { status: "loading"; name: string }
  | { status: "loaded"; name: string }
  | { status: "error"; message: string };

export type Channel = {
  id: string;
  label: string;
  steps: boolean[];
  sample: SampleState;
};

export function createInitialChannels(): Channel[] {
  return Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
    id: `channel-${index + 1}`,
    label: String(index + 1),
    steps: Array<boolean>(STEP_COUNT).fill(false),
    sample: { status: "empty" },
  }));
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
