import {
  MAX_DRIVE,
  MAX_FEEDBACK,
  MAX_LFO_AMOUNT,
  MAX_PAN,
  MAX_PHASER_DEPTH,
  MAX_PHASER_FEEDBACK,
  MAX_PITCH,
  MAX_RESONANCE,
  MAX_SEND,
  MAX_SUSTAIN_LEVEL,
  MAX_VOLUME,
  MIN_DRIVE,
  MIN_FEEDBACK,
  MIN_LFO_AMOUNT,
  MIN_PAN,
  MIN_PHASER_DEPTH,
  MIN_PHASER_FEEDBACK,
  MIN_PITCH,
  MIN_RESONANCE,
  MIN_SEND,
  MIN_SUSTAIN_LEVEL,
  MIN_VOLUME,
  MAX_COMPRESSOR_ATTACK_SECONDS,
  MAX_COMPRESSOR_RELEASE_SECONDS,
  MAX_DELAY_SECONDS,
  MAX_RATIO,
  MAX_REVERB_DECAY_SECONDS,
  MAX_THRESHOLD_DB,
  MIN_COMPRESSOR_ATTACK_SECONDS,
  MIN_COMPRESSOR_RELEASE_SECONDS,
  MIN_DELAY_SECONDS,
  MIN_RATIO,
  MIN_REVERB_DECAY_SECONDS,
  MIN_THRESHOLD_DB,
  clampCompressorAttack,
  clampCompressorRelease,
  clampDelaySeconds,
  clampDrive,
  clampFeedback,
  clampLfoAmount,
  clampPan,
  clampPhaserDepth,
  clampPhaserFeedback,
  clampPitch,
  clampRatio,
  clampResonance,
  clampReverbDecay,
  clampSend,
  clampSustain,
  clampThresholdDb,
  clampVolume,
  sliderToAttack,
  sliderToDecay,
  sliderToFrequency,
  sliderToLfoRate,
  sliderToPhaserRate,
  sliderToRelease,
  type Channel,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
} from "@/lib/sequencer";

/**
 * Every parameter a MIDI CC can drive, described once and away from the
 * widgets that happen to show it.
 *
 * The ranges and conversions here are deliberately the same ones the knobs and
 * sliders use — a cutoff is a 0..1 log position rather than a raw Hz, because
 * that is the travel the panel gives it and a mapped knob should sweep the way
 * the on-screen one does. What they are *not* is owned by those widgets: a
 * control that isn't rendered right now, because its tab is closed or because
 * it belongs to a channel that isn't the selected one, is still a parameter
 * this machine has and still something an incoming CC has every right to move.
 * That is the whole reason this table exists apart from the components (see
 * `useMidiParameterRegistry`).
 */

/** One channel parameter: the range a CC maps onto, and how to write it. */
export type ChannelMidiParameter = {
  min: number;
  max: number;
  /** The patch to apply, given the value and the channel as it stands. */
  write: (value: number, channel: Channel) => Partial<Channel>;
};

/**
 * Keyed by the suffix that follows the channel's id in a map id, so
 * `"filter:lowCutHz"` on `channel-1` is `"channel-1:filter:lowCutHz"`.
 */
export const CHANNEL_MIDI_PARAMETERS: Record<string, ChannelMidiParameter> = {
  volume: {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value) => ({ volume: clampVolume(value) }),
  },
  pan: {
    min: MIN_PAN,
    max: MAX_PAN,
    write: (value) => ({ pan: clampPan(value) }),
  },
  pitch: {
    min: MIN_PITCH,
    max: MAX_PITCH,
    write: (value) => ({ pitch: clampPitch(value) }),
  },

  "filter:lowCutHz": {
    min: 0,
    max: 1,
    write: (position) => ({ lowCutHz: sliderToFrequency(position) }),
  },
  "filter:lowCutResonance": {
    min: MIN_RESONANCE,
    max: MAX_RESONANCE,
    write: (value) => ({ lowCutResonance: clampResonance(value) }),
  },
  "filter:highCutHz": {
    min: 0,
    max: 1,
    write: (position) => ({ highCutHz: sliderToFrequency(position) }),
  },
  "filter:highCutResonance": {
    min: MIN_RESONANCE,
    max: MAX_RESONANCE,
    write: (value) => ({ highCutResonance: clampResonance(value) }),
  },

  "envelope:attack": {
    min: 0,
    max: 1,
    write: (position) => ({ attackSeconds: sliderToAttack(position) }),
  },
  "envelope:decay": {
    min: 0,
    max: 1,
    write: (position) => ({ decaySeconds: sliderToDecay(position) }),
  },
  "envelope:sustain": {
    min: MIN_SUSTAIN_LEVEL,
    max: MAX_SUSTAIN_LEVEL,
    write: (value) => ({ sustainLevel: clampSustain(value) }),
  },
  "envelope:release": {
    min: 0,
    max: 1,
    write: (position) => ({ releaseSeconds: sliderToRelease(position) }),
  },

  "fx:delaySend": {
    min: MIN_SEND,
    max: MAX_SEND,
    write: (value) => ({ delaySend: clampSend(value) }),
  },
  "fx:reverbSend": {
    min: MIN_SEND,
    max: MAX_SEND,
    write: (value) => ({ reverbSend: clampSend(value) }),
  },
  "fx:phaserSend": {
    min: MIN_SEND,
    max: MAX_SEND,
    write: (value) => ({ phaserSend: clampSend(value) }),
  },

  // The two that need the channel as it stands: an LFO is one nested object,
  // so moving the rate has to carry the shape and destination along with it.
  "lfo:rate": {
    min: 0,
    max: 1,
    write: (position, channel) => ({
      lfo: { ...channel.lfo, rateHz: sliderToLfoRate(position) },
    }),
  },
  "lfo:amount": {
    min: MIN_LFO_AMOUNT,
    max: MAX_LFO_AMOUNT,
    write: (value, channel) => ({
      lfo: { ...channel.lfo, amount: clampLfoAmount(value) },
    }),
  },
};

/** A channel control's identity in the CC map, scoped to the channel it belongs to. */
export function channelMidiMapId(channelId: string, suffix: string): string {
  return `${channelId}:${suffix}`;
}

/** One master parameter, over whichever of the master groups holds it. */
export type MasterMidiParameter<T> = {
  min: number;
  max: number;
  write: (value: number, current: T) => T;
};

export const MASTER_VOLUME_MAP_ID = "master:volume";

export const MASTER_DRIVE_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterDrive>
> = {
  "master:drive:amount": {
    min: MIN_DRIVE,
    max: MAX_DRIVE,
    write: (value, drive) => ({ ...drive, amount: clampDrive(value) }),
  },
  "master:drive:level": {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value, drive) => ({ ...drive, level: clampVolume(value) }),
  },
};

export const MASTER_FILTER_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterFilter>
> = {
  "master:filter:lowCut": {
    min: 0,
    max: 1,
    write: (position, filter) => ({
      ...filter,
      lowCutHz: sliderToFrequency(position),
    }),
  },
  "master:filter:highCut": {
    min: 0,
    max: 1,
    write: (position, filter) => ({
      ...filter,
      highCutHz: sliderToFrequency(position),
    }),
  },
};

export const MASTER_DELAY_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterDelay>
> = {
  "master:delay:time": {
    min: MIN_DELAY_SECONDS,
    max: MAX_DELAY_SECONDS,
    write: (value, delay) => ({
      ...delay,
      timeSeconds: clampDelaySeconds(value),
    }),
  },
  "master:delay:feedback": {
    min: MIN_FEEDBACK,
    max: MAX_FEEDBACK,
    write: (value, delay) => ({ ...delay, feedback: clampFeedback(value) }),
  },
  "master:delay:tone": {
    min: 0,
    max: 1,
    write: (position, delay) => ({
      ...delay,
      toneHz: sliderToFrequency(position),
    }),
  },
  "master:delay:level": {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value, delay) => ({ ...delay, level: clampVolume(value) }),
  },
  "master:delay:reverbSend": {
    min: MIN_SEND,
    max: MAX_SEND,
    write: (value, delay) => ({ ...delay, reverbSend: clampSend(value) }),
  },
};

export const MASTER_REVERB_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterReverb>
> = {
  "master:reverb:decay": {
    min: MIN_REVERB_DECAY_SECONDS,
    max: MAX_REVERB_DECAY_SECONDS,
    write: (value, reverb) => ({
      ...reverb,
      decaySeconds: clampReverbDecay(value),
    }),
  },
  "master:reverb:tone": {
    min: 0,
    max: 1,
    write: (position, reverb) => ({
      ...reverb,
      toneHz: sliderToFrequency(position),
    }),
  },
  "master:reverb:level": {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value, reverb) => ({ ...reverb, level: clampVolume(value) }),
  },
  "master:reverb:phaserSend": {
    min: MIN_SEND,
    max: MAX_SEND,
    write: (value, reverb) => ({ ...reverb, phaserSend: clampSend(value) }),
  },
};

export const MASTER_PHASER_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterPhaser>
> = {
  "master:phaser:rate": {
    min: 0,
    max: 1,
    write: (position, phaser) => ({
      ...phaser,
      rateHz: sliderToPhaserRate(position),
    }),
  },
  "master:phaser:depth": {
    min: MIN_PHASER_DEPTH,
    max: MAX_PHASER_DEPTH,
    write: (value, phaser) => ({ ...phaser, depth: clampPhaserDepth(value) }),
  },
  "master:phaser:feedback": {
    min: MIN_PHASER_FEEDBACK,
    max: MAX_PHASER_FEEDBACK,
    write: (value, phaser) => ({
      ...phaser,
      feedback: clampPhaserFeedback(value),
    }),
  },
  "master:phaser:level": {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value, phaser) => ({ ...phaser, level: clampVolume(value) }),
  },
};

export const MASTER_COMPRESSOR_PARAMETERS: Record<
  string,
  MasterMidiParameter<MasterCompressor>
> = {
  "master:compressor:threshold": {
    min: MIN_THRESHOLD_DB,
    max: MAX_THRESHOLD_DB,
    write: (value, compressor) => ({
      ...compressor,
      thresholdDb: clampThresholdDb(value),
    }),
  },
  "master:compressor:ratio": {
    min: MIN_RATIO,
    max: MAX_RATIO,
    write: (value, compressor) => ({
      ...compressor,
      ratio: clampRatio(value),
    }),
  },
  "master:compressor:attack": {
    min: MIN_COMPRESSOR_ATTACK_SECONDS,
    max: MAX_COMPRESSOR_ATTACK_SECONDS,
    write: (value, compressor) => ({
      ...compressor,
      attackSeconds: clampCompressorAttack(value),
    }),
  },
  "master:compressor:release": {
    min: MIN_COMPRESSOR_RELEASE_SECONDS,
    max: MAX_COMPRESSOR_RELEASE_SECONDS,
    write: (value, compressor) => ({
      ...compressor,
      releaseSeconds: clampCompressorRelease(value),
    }),
  },
  "master:compressor:makeup": {
    min: MIN_VOLUME,
    max: MAX_VOLUME,
    write: (value, compressor) => ({
      ...compressor,
      level: clampVolume(value),
    }),
  },
};
