"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  DEFAULT_BPM,
  DEFAULT_HIGH_CUT_HZ,
  DEFAULT_LOW_CUT_HZ,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_REVERB_TONE_HZ,
  MAX_DELAY_LINE_SECONDS,
  clampDrive,
  clampFeedback,
  clampFrequency,
  clampReverbDecay,
  clampSend,
  clampVolume,
  delayTimeSeconds,
  type DriveType,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterReverb,
} from "@/lib/sequencer";

type TriggerOptions = {
  /** Linear gain for this hit. */
  gain?: number;
  /** Playback rate multiplier; also changes pitch. */
  playbackRate?: number;
  /** Highpass cutoff in Hz. Omit to skip the filter entirely. */
  lowCutHz?: number;
  /** Lowpass cutoff in Hz. Omit to skip the filter entirely. */
  highCutHz?: number;
  /** Fade-in time in seconds. Omit for an instant onset. */
  attackSeconds?: number;
  /** Fade-out time in seconds, after the attack. Omit to let the sample ring out. */
  decaySeconds?: number;
  /** How much of this hit is tapped to the delay bus. Omit to send nothing. */
  delaySend?: number;
  /** How much of this hit is tapped to the reverb bus. Omit to send nothing. */
  reverbSend?: number;
};

/**
 * Butterworth response: maximally flat passband, so the cutoff rolls off with
 * no resonant peak at all.
 *
 * Careful — for lowpass/highpass, Web Audio's `Q` param is in *decibels*, and
 * the filter coefficients use a linear Q of `10^(Q/20)`. So the textbook
 * Butterworth value of 1/sqrt(2) has to be converted, not assigned directly;
 * passing 0.707 through would actually mean a linear Q of 1.08 and add
 * resonance. The default of 1 dB is a linear Q of 1.12, a ~1.96 dB bump at the
 * cutoff.
 */
const BUTTERWORTH_Q_DB = 20 * Math.log10(Math.SQRT1_2);

/** Points in the drive transfer curve. Plenty for a smooth-sounding knee. */
const DRIVE_CURVE_SAMPLES = 1024;

/** How hard full drive pushes into tanh before the curve is normalised. */
const MAX_DRIVE_GAIN = 25;

/**
 * Fold gain at full drive. Seven, not eight: the triangle's zero crossings land
 * on even multiples, so a gain of eight would map a full-scale peak onto
 * silence and swallow exactly the transients a drum bus is made of. Odd
 * multiples land on a fold peak instead, which keeps the level (the polarity
 * flips, which is not audible on its own).
 */
const MAX_FOLD_GAIN = 7;

/**
 * How much softer the tube shape's negative half is than its positive half.
 * The mismatch between the two halves is the whole effect, so this is the one
 * number that decides how "tube" it sounds.
 */
const TUBE_ASYMMETRY = 0.55;

/**
 * Drive is squared on its way to the shaper's input gain. Saturation builds
 * exponentially, so a linear map spends the whole effect in the first quarter
 * of the slider and leaves the rest of the travel doing nothing audible.
 */
function driveGain(amount: number): number {
  const clamped = clampDrive(amount);
  return clamped * clamped * MAX_DRIVE_GAIN;
}

/**
 * The same taper, but starting at unity instead of zero — what the shapes that
 * clip or fold need, since for them it is a gain into a fixed threshold rather
 * than a parameter of the curve itself.
 */
function thresholdGain(amount: number, max: number): number {
  const clamped = clampDrive(amount);
  return 1 + clamped * clamped * (max - 1);
}

/**
 * Maps one input sample to one output sample. Every shape is the identity at
 * amount 0 and none may leave -1..1, so the Amount slider reads the same
 * everywhere and no shape can clip the output on its own.
 *
 * The three saturating shapes also hold full scale in at full scale out, which
 * is what keeps a type change a change of character rather than of level. Fold
 * is the exception and cannot be otherwise: folding is by definition
 * non-monotonic, so where a peak lands depends on how far it was pushed.
 */
type Shaper = (x: number, amount: number) => number;

const SHAPERS: Record<DriveType, Shaper> = {
  /**
   * Symmetric tanh, normalised by `tanh(k)` rather than by the slope at zero.
   * That is what makes it get *louder* as it saturates: quiet material is
   * pushed up towards the asymptote while peaks stay put. Round and forgiving.
   */
  soft: (x, amount) => {
    const k = driveGain(amount);
    // tanh(k*x)/tanh(k) is 0/0 as k approaches 0; the limit there is x.
    return k < 1e-6 ? x : Math.tanh(k * x) / Math.tanh(k);
  },

  /**
   * tanh again, but each half normalised on its own, so both still reach full
   * scale while the negative half keeps a softer knee. A curve that treats up
   * and down differently is what puts *even* harmonics in the output, which is
   * the warmth people reach for; it also puts DC there, hence the DC blocker.
   */
  tube: (x, amount) => {
    const k = driveGain(amount);
    if (k < 1e-6) return x;
    const half = x >= 0 ? k : k * TUBE_ASYMMETRY;
    return Math.tanh(half * x) / Math.tanh(half);
  },

  /** Gain into a flat ceiling. No knee at all, so it buzzes where soft rounds. */
  hard: (x, amount) => {
    const driven = thresholdGain(amount, MAX_DRIVE_GAIN) * x;
    return Math.min(Math.max(driven, -1), 1);
  },

  /**
   * Triangle wavefolder: identity while |driven| stays inside 1, then mirrored
   * back on itself again and again past that. Unlike the others it is not
   * monotonic — loud input can come out quiet — which is why it sounds metallic
   * and unlike anything the per-channel controls can do.
   */
  fold: (x, amount) => {
    const driven = thresholdGain(amount, MAX_FOLD_GAIN) * x;
    // Wrapped into one period of 4, which the ramps below cover exactly.
    const wrapped = (((driven + 1) % 4) + 4) % 4;
    return wrapped <= 2 ? wrapped - 1 : 3 - wrapped;
  },
};

/** Gain moves ramp over this long, so nothing switches hard enough to click. */
const RAMP_SECONDS = 0.02;

/** Where the drive stage's DC blocker sits: below hearing, above 0 Hz. */
const DC_BLOCKER_HZ = 10;

/**
 * Where a decay ramp lands before the voice is cut. An exponential curve is the
 * one that sounds like a drum dying away, but it can only approach zero, so it
 * runs down to -80 dB — inaudible — and is snapped to silence from there.
 */
const DECAY_FLOOR = 0.0001;

/**
 * Delay time slides over this long rather than the usual ramp. Moving the read
 * head of a delay line that is already sounding resamples what is in it, so the
 * repeats bend in pitch on the way — the tape-delay sound. A ramp this slow
 * makes that a slide; the 20 ms used elsewhere would make it a chirp.
 */
const DELAY_TIME_RAMP_SECONDS = 0.12;

/**
 * Stereo, and built from two independent noise runs rather than one copied
 * twice. Decorrelated channels are what make the tail sound wide instead of
 * like a single sound pinned to the centre.
 */
const REVERB_IMPULSE_CHANNELS = 2;

/**
 * How sharply the impulse response falls away. Real rooms decay exponentially;
 * a plain linear fade reads as a burst of noise being cut off rather than as a
 * space, and the ear hears the difference immediately.
 */
const REVERB_DECAY_CURVE = 2.5;

/** The always-connected nodes every voice is summed through. */
type MasterChain = {
  /** Where voices connect. Feeds the driven and the clean path in parallel. */
  input: GainNode;
  shaper: WaveShaperNode;
  /**
   * The type and amount `shaper.curve` was last built for. Rebuilding the table
   * on every change would swap it mid-signal each time the volume slider moved,
   * which zippers; this lets the level ramp on its own.
   */
  curveKey: string;
  level: GainNode;
  driven: GainNode;
  clean: GainNode;
  /** The drive stage's output, where the filter stage picks the signal up. */
  driveOut: GainNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  filtered: GainNode;
  unfiltered: GainNode;

  /** Where channel delay sends land. */
  delayBus: GainNode;
  delayLine: DelayNode;
  feedback: GainNode;
  /** The delay's return level, and its whole bypass. */
  delayLevel: GainNode;

  /** Where channel reverb sends land. */
  reverbBus: GainNode;
  convolver: ConvolverNode;
  /** Damping on the tail, so a long reverb doesn't wash over the top end. */
  damping: BiquadFilterNode;
  /**
   * The decay `convolver.buffer` was last built for. Regenerating the impulse
   * costs a pass over a few hundred thousand samples, so it is only rebuilt
   * when the decay actually moves and not when the level slider does.
   */
  impulseKey: number;
  /** The reverb's return level, and its whole bypass. */
  reverbLevel: GainNode;
};

/**
 * Noise shaped by a decay envelope — the standard way to synthesise a plausible
 * reverb without shipping a recorded impulse response as a binary asset. It is
 * a dense, characterless space rather than a real room, which is what a drum
 * bus generally wants anyway.
 */
function createReverbImpulse(
  context: AudioContext,
  decaySeconds: number,
): AudioBuffer {
  const rate = context.sampleRate;
  // At least one frame: a zero-length buffer is not a legal AudioBuffer.
  const length = Math.max(1, Math.round(rate * clampReverbDecay(decaySeconds)));
  const impulse = context.createBuffer(REVERB_IMPULSE_CHANNELS, length, rate);

  for (let channel = 0; channel < REVERB_IMPULSE_CHANNELS; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      samples[i] =
        (Math.random() * 2 - 1) *
        Math.pow(1 - i / length, REVERB_DECAY_CURVE);
    }
  }

  return impulse;
}

/**
 * Samples a shape into the lookup table a WaveShaperNode reads. The node maps
 * an input of -1..1 across the whole table and pins anything beyond that to the
 * end points, so the table *is* the sound of the stage.
 */
// The explicit buffer type is what `WaveShaperNode.curve` asks for; a bare
// `Float32Array` widens to `ArrayBufferLike` and no longer assigns to it.
function driveCurve(
  type: DriveType,
  amount: number,
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(DRIVE_CURVE_SAMPLES);
  const shape = SHAPERS[type];

  for (let i = 0; i < DRIVE_CURVE_SAMPLES; i += 1) {
    const x = (i / (DRIVE_CURVE_SAMPLES - 1)) * 2 - 1;
    curve[i] = shape(x, amount);
  }

  return curve;
}

/** A Butterworth cut filter, used per hit and again across the master bus. */
function createCutFilter(
  context: AudioContext,
  type: "highpass" | "lowpass",
  frequency: number,
): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = BUTTERWORTH_Q_DB;
  return filter;
}

function createMasterChain(context: AudioContext): MasterChain {
  const input = context.createGain();
  const shaper = context.createWaveShaper();
  const dcBlocker = createCutFilter(context, "highpass", DC_BLOCKER_HZ);
  const level = context.createGain();
  const driven = context.createGain();
  const clean = context.createGain();
  const driveOut = context.createGain();
  const highpass = createCutFilter(context, "highpass", DEFAULT_LOW_CUT_HZ);
  const lowpass = createCutFilter(context, "lowpass", DEFAULT_HIGH_CUT_HZ);
  const filtered = context.createGain();
  const unfiltered = context.createGain();
  const delayBus = context.createGain();
  const delayLine = context.createDelay(MAX_DELAY_LINE_SECONDS);
  const feedback = context.createGain();
  const delayLevel = context.createGain();
  const reverbBus = context.createGain();
  const convolver = context.createConvolver();
  const damping = createCutFilter(context, "lowpass", DEFAULT_REVERB_TONE_HZ);
  const reverbLevel = context.createGain();

  // Saturation generates harmonics above Nyquist that would otherwise fold back
  // down as aliasing, which reads as a metallic ring rather than as distortion.
  shaper.oversample = "4x";

  // Both paths stay wired up and the bypass just crossfades between them.
  // Reconnecting live nodes instead would click on every toggle.
  input.connect(shaper);
  // An asymmetric shape puts a DC offset on its output, which eats headroom
  // silently and thumps when the stage is switched in. A highpass this low is
  // inaudible to the shapes that don't need it, so it stays in the path always.
  shaper.connect(dcBlocker);
  dcBlocker.connect(level);
  level.connect(driven);
  driven.connect(driveOut);

  input.connect(clean);
  clean.connect(driveOut);

  // The cuts hang off the drive stage's output rather than its input, so they
  // filter the harmonics saturation added instead of feeding them into it.
  // Bypassed the same way, by crossfading against the unfiltered signal.
  driveOut.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(filtered);
  filtered.connect(context.destination);

  driveOut.connect(unfiltered);
  unfiltered.connect(context.destination);

  // The delay's own output is what feeds the loop, so the return level sets how
  // loud the repeats are without changing how many of them there are. A cycle
  // is legal here only because a DelayNode sits in it — the spec mutes any
  // other feedback loop outright — and `feedback` is held below unity so the
  // repeats always die away.
  delayBus.connect(delayLine);
  delayLine.connect(feedback);
  feedback.connect(delayLine);
  delayLine.connect(delayLevel);

  // Damping sits after the convolver rather than before it, so it darkens the
  // tail itself instead of just the signal being fed into the room.
  reverbBus.connect(convolver);
  convolver.connect(damping);
  damping.connect(reverbLevel);

  // Both returns land on the master input, so the sends are summed with the dry
  // channels and the whole mix — repeats and tail included — is what the drive
  // and filter stages downstream then work on.
  delayLevel.connect(input);
  reverbLevel.connect(input);

  // Start bypassed to match the defaults, so the first ramp has somewhere
  // sensible to come from rather than passing both paths at unity.
  driven.gain.value = 0;
  clean.gain.value = 1;
  filtered.gain.value = 0;
  unfiltered.gain.value = 1;
  // Sends are parallel, so silencing the return *is* the bypass.
  delayLevel.gain.value = 0;
  reverbLevel.gain.value = 0;

  return {
    input,
    shaper,
    // No curve built yet, so the first apply always installs one.
    curveKey: "",
    level,
    driven,
    clean,
    driveOut,
    highpass,
    lowpass,
    filtered,
    unfiltered,
    delayBus,
    delayLine,
    feedback,
    delayLevel,
    reverbBus,
    convolver,
    damping,
    // No impulse built yet, so the first apply always installs one.
    impulseKey: 0,
    reverbLevel,
  };
}

function rampTo(
  param: AudioParam,
  value: number,
  now: number,
  seconds = RAMP_SECONDS,
) {
  param.cancelScheduledValues(now);
  // Anchor at the live value first, or the ramp would jump to wherever the
  // last scheduled segment left the param.
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

function applyDrive(
  context: AudioContext,
  chain: MasterChain,
  drive: MasterDrive,
) {
  const now = context.currentTime;

  const curveKey = `${drive.type}:${clampDrive(drive.amount)}`;
  if (chain.curveKey !== curveKey) {
    chain.shaper.curve = driveCurve(drive.type, drive.amount);
    chain.curveKey = curveKey;
  }

  rampTo(chain.level.gain, clampVolume(drive.level), now);
  rampTo(chain.driven.gain, drive.enabled ? 1 : 0, now);
  rampTo(chain.clean.gain, drive.enabled ? 0 : 1, now);
}

/**
 * Cutoffs are ramped rather than set, so dragging a slider sweeps the filter
 * instead of stepping it. They keep tracking while the stage is bypassed, so
 * switching it in lands on the cutoffs already shown in the rail.
 */
function applyFilter(
  context: AudioContext,
  chain: MasterChain,
  filter: MasterFilter,
) {
  const now = context.currentTime;

  rampTo(chain.highpass.frequency, clampFrequency(filter.lowCutHz), now);
  rampTo(chain.lowpass.frequency, clampFrequency(filter.highCutHz), now);
  rampTo(chain.filtered.gain, filter.enabled ? 1 : 0, now);
  rampTo(chain.unfiltered.gain, filter.enabled ? 0 : 1, now);
}

/**
 * Time and feedback keep tracking while the bus is switched off, so a delay can
 * be dialled in silently and then brought up. Silencing the return is the whole
 * of the bypass: the dry mix never passed through here to begin with.
 *
 * `bpm` is only read when the delay is synced, but it is taken always so that a
 * tempo change re-applies the stage and the repeats follow the transport.
 */
function applyDelay(
  context: AudioContext,
  chain: MasterChain,
  delay: MasterDelay,
  bpm: number,
) {
  const now = context.currentTime;

  rampTo(
    chain.delayLine.delayTime,
    delayTimeSeconds(delay, bpm),
    now,
    DELAY_TIME_RAMP_SECONDS,
  );
  rampTo(chain.feedback.gain, clampFeedback(delay.feedback), now);
  rampTo(
    chain.delayLevel.gain,
    delay.enabled ? clampVolume(delay.level) : 0,
    now,
  );
}

function applyReverb(
  context: AudioContext,
  chain: MasterChain,
  reverb: MasterReverb,
) {
  const now = context.currentTime;

  // Swapping the impulse resets whatever the convolver was still ringing out,
  // so a decay move cuts the current tail short. Acceptable for a knob that is
  // set rather than ridden, and the alternative — crossfading two convolvers —
  // costs a second one running permanently.
  const impulseKey = clampReverbDecay(reverb.decaySeconds);
  if (chain.impulseKey !== impulseKey) {
    chain.convolver.buffer = createReverbImpulse(context, impulseKey);
    chain.impulseKey = impulseKey;
  }

  rampTo(chain.damping.frequency, clampFrequency(reverb.toneHz), now);
  rampTo(
    chain.reverbLevel.gain,
    reverb.enabled ? clampVolume(reverb.level) : 0,
    now,
  );
}

/**
 * Owns the AudioContext and the decoded AudioBuffer for each channel.
 *
 * Buffers live in a ref rather than state: they are large binary objects that
 * nothing renders directly, so storing them would only cause needless renders.
 * Components decide what to display from the channel's `SampleState` instead.
 */
export function useSampleBank() {
  const contextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef(new Map<string, AudioBuffer>());
  const masterRef = useRef<MasterChain | null>(null);
  // Holds the latest settings even before there is a context to apply them to,
  // so a knob moved before the first gesture isn't lost.
  const driveRef = useRef<MasterDrive>(DEFAULT_MASTER_DRIVE);
  const filterRef = useRef<MasterFilter>(DEFAULT_MASTER_FILTER);
  const delayRef = useRef<MasterDelay>(DEFAULT_MASTER_DELAY);
  // Held alongside the delay so a synced time can still be resolved when the
  // chain is built, which happens long after the tempo was last set.
  const delayBpmRef = useRef(DEFAULT_BPM);
  const reverbRef = useRef<MasterReverb>(DEFAULT_MASTER_REVERB);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
    };
  }, []);

  /**
   * Creates the AudioContext and the master chain on first use. Only ever
   * called from a user gesture (file pick or Play), which is what browsers
   * require.
   */
  const ensureContext = useCallback(() => {
    let context = contextRef.current;

    if (!context) {
      context = new AudioContext();
      contextRef.current = context;

      const chain = createMasterChain(context);
      masterRef.current = chain;
      applyDrive(context, chain, driveRef.current);
      applyFilter(context, chain, filterRef.current);
      applyDelay(context, chain, delayRef.current, delayBpmRef.current);
      applyReverb(context, chain, reverbRef.current);
    }

    return context;
  }, []);

  /** Points the master drive stage at `drive`, creating no context of its own. */
  const applyMasterDrive = useCallback((drive: MasterDrive) => {
    driveRef.current = drive;

    const context = contextRef.current;
    const chain = masterRef.current;
    // Nothing to update yet; `ensureContext` applies this when it builds the chain.
    if (!context || !chain) return;

    applyDrive(context, chain, drive);
  }, []);

  /** Points the master filter stage at `filter`, creating no context of its own. */
  const applyMasterFilter = useCallback((filter: MasterFilter) => {
    filterRef.current = filter;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyFilter(context, chain, filter);
  }, []);

  /** Points the delay bus at `delay`, creating no context of its own. */
  const applyMasterDelay = useCallback((delay: MasterDelay, bpm: number) => {
    delayRef.current = delay;
    delayBpmRef.current = bpm;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyDelay(context, chain, delay, bpm);
  }, []);

  /** Points the reverb bus at `reverb`, creating no context of its own. */
  const applyMasterReverb = useCallback((reverb: MasterReverb) => {
    reverbRef.current = reverb;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyReverb(context, chain, reverb);
  }, []);

  /**
   * Decodes raw audio bytes into `channelId`'s slot and returns the buffer, so
   * callers can derive display data from it. Throws if the bytes aren't audio.
   */
  const decodeInto = useCallback(
    async (channelId: string, data: ArrayBuffer): Promise<AudioBuffer> => {
      const context = ensureContext();
      const audioBuffer = await context.decodeAudioData(data);
      buffersRef.current.set(channelId, audioBuffer);
      return audioBuffer;
    },
    [ensureContext],
  );

  /** Loads a user-picked file. */
  const loadSample = useCallback(
    async (channelId: string, file: File): Promise<AudioBuffer> =>
      decodeInto(channelId, await file.arrayBuffer()),
    [decodeInto],
  );

  /** Loads a bundled sample, e.g. a preset kit under `public/`. */
  const loadSampleFromUrl = useCallback(
    async (channelId: string, url: string): Promise<AudioBuffer> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      return decodeInto(channelId, await response.arrayBuffer());
    },
    [decodeInto],
  );

  const removeSample = useCallback((channelId: string) => {
    buffersRef.current.delete(channelId);
  }, []);

  /** Schedules the channel's sample to play at `time` on the audio clock. */
  const trigger = useCallback(
    (
      channelId: string,
      time: number,
      {
        gain = 1,
        playbackRate = 1,
        lowCutHz,
        highCutHz,
        attackSeconds,
        decaySeconds,
        delaySend,
        reverbSend,
      }: TriggerOptions = {},
    ) => {
      const context = contextRef.current;
      const master = masterRef.current;
      const buffer = buffersRef.current.get(channelId);
      if (!context || !master || !buffer) return;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      // Fresh nodes per hit, so a knob move never retunes an already-playing note.
      let tail: AudioNode = source;

      if (lowCutHz !== undefined) {
        const highpass = createCutFilter(context, "highpass", lowCutHz);
        tail.connect(highpass);
        tail = highpass;
      }

      if (highCutHz !== undefined) {
        const lowpass = createCutFilter(context, "lowpass", highCutHz);
        tail.connect(lowpass);
        tail = lowpass;
      }

      // When the decay ends. Held until after `source.start` below, because a
      // source that has not been started yet rejects `stop` outright.
      let releaseTime: number | null = null;

      // The envelope rides its own node rather than shaping the volume gain, so
      // its curve stays a plain 0..1 shape. Scaling it by the channel volume
      // would leave a silenced channel with a decay ramp running from zero,
      // which an exponential curve can't express.
      if (attackSeconds !== undefined || decaySeconds !== undefined) {
        const attack = attackSeconds ?? 0;
        const envelope = context.createGain();
        const level = envelope.gain;

        // Voices are scheduled ahead of the audio clock, so the envelope is
        // pinned to the hit's own start time rather than to `currentTime`.
        level.setValueAtTime(attack > 0 ? 0 : 1, time);
        if (attack > 0) {
          level.linearRampToValueAtTime(1, time + attack);
        }

        if (decaySeconds !== undefined) {
          releaseTime = time + attack + decaySeconds;
          level.exponentialRampToValueAtTime(DECAY_FLOOR, releaseTime);
          level.setValueAtTime(0, releaseTime);
        }

        tail.connect(envelope);
        tail = envelope;
      }

      const gainNode = context.createGain();
      gainNode.gain.value = gain;

      tail.connect(gainNode);
      // Into the master bus rather than the destination, so every voice is
      // summed before the drive stage sees it.
      gainNode.connect(master.input);

      // Sends are tapped off the volume node rather than off the raw source, so
      // they are post-fader: they carry the channel's envelope and filters, and
      // pulling a channel down takes its share of the delay and reverb with it.
      if (delaySend !== undefined) {
        const send = context.createGain();
        send.gain.value = clampSend(delaySend);
        gainNode.connect(send);
        send.connect(master.delayBus);
      }

      if (reverbSend !== undefined) {
        const send = context.createGain();
        send.gain.value = clampSend(reverbSend);
        gainNode.connect(send);
        send.connect(master.reverbBus);
      }

      source.start(time);

      // Past the decay there is nothing left to hear, so the voice is released
      // rather than left running silently until the buffer ends.
      if (releaseTime !== null) {
        source.stop(releaseTime);
      }
    },
    [],
  );

  return {
    ensureContext,
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    trigger,
  };
}
