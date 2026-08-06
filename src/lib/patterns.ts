import {
  captureChannelSnapshots,
  type Channel,
  type ChannelSnapshot,
  type Step,
} from "./sequencer";

export const PATTERN_COUNT = 16;
export const BANK_COUNT = 16;

/** One letter per bank, A through P — BANK_COUNT of them, in order. */
const BANK_LETTERS = "ABCDEFGHIJKLMNOP";

/** How a bank is named wherever one is shown: A, B, C… */
export function bankLetter(bankIndex: number): string {
  return BANK_LETTERS.charAt(bankIndex);
}

/** How a pattern slot is named wherever one is shown: A-1, A-2… P-16. */
export function patternLabel(bankIndex: number, patternIndex: number): string {
  return `${bankLetter(bankIndex)}-${patternIndex + 1}`;
}

/** Follows `THEME_STORAGE_KEY`'s naming in `lib/themes.ts`. */
export const BANKS_STORAGE_KEY = "drum-machine-banks";

/**
 * What a pattern remembers of one channel: everything a `ChannelSnapshot`
 * does — how the channel sounds, muted/soloed/choke included — plus the steps
 * and the length that gives them their loop. The channel's identity and its
 * loaded sample are deliberately left out, exactly as they are for a
 * snapshot: the kit is shared across every pattern and bank, not carried by
 * each one.
 */
export type PatternChannel = ChannelSnapshot & {
  steps: Step[];
  length: number;
};

/** One saved arrangement: every channel's pattern state, keyed by channel id. */
export type Pattern = {
  channels: Record<string, PatternChannel>;
};

/** Sixteen pattern slots. `null` is an empty slot, not a pattern of silence. */
export type Bank = {
  patterns: (Pattern | null)[];
};

function cloneStep(step: Step): Step {
  return { ...step, locks: step.locks ? { ...step.locks } : undefined };
}

export function createEmptyBank(): Bank {
  return { patterns: Array.from({ length: PATTERN_COUNT }, () => null) };
}

export function createInitialBanks(): Bank[] {
  return Array.from({ length: BANK_COUNT }, createEmptyBank);
}

/** True once every one of a bank's sixteen slots holds nothing. */
export function isBankEmpty(bank: Bank): boolean {
  return bank.patterns.every((pattern) => pattern === null);
}

/**
 * Reads the whole kit into a pattern: every channel's sound, plus its steps
 * and length. Steps are cloned on the way in, so editing the live grid
 * afterwards can never reach back into a pattern already saved.
 */
export function capturePattern(channels: Channel[]): Pattern {
  const snapshots = captureChannelSnapshots(channels);

  return {
    channels: Object.fromEntries(
      channels.map((channel) => [
        channel.id,
        {
          ...snapshots[channel.id],
          steps: channel.steps.map(cloneStep),
          length: channel.length,
        },
      ]),
    ),
  };
}

/**
 * Writes a pattern back over the channels. A channel the pattern doesn't
 * mention — which shouldn't happen, since every pattern is captured from the
 * same fixed set of channels — is left untouched rather than blanked out,
 * exactly as `applyChannelSnapshots` leaves it. Copied on the way in for the
 * same reason `applyChannelSnapshots` copies the LFO: loading the same
 * pattern twice must not hand two channels the same steps or locks.
 */
export function applyPattern(channels: Channel[], pattern: Pattern): Channel[] {
  return channels.map((channel) => {
    const saved = pattern.channels[channel.id];
    if (!saved) return channel;
    return {
      ...channel,
      ...saved,
      lfo: { ...saved.lfo },
      steps: saved.steps.map(cloneStep),
    };
  });
}
