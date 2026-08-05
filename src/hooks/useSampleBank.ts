"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  COMPRESSOR_KNEE_DB,
  DEFAULT_BPM,
  DEFAULT_DELAY_TONE_HZ,
  DEFAULT_HIGH_CUT_HZ,
  DEFAULT_LOW_CUT_HZ,
  DEFAULT_MASTER_COMPRESSOR,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_REVERB_TONE_HZ,
  DEFAULT_SAMPLE_END,
  DEFAULT_SAMPLE_REVERSED,
  DEFAULT_SAMPLE_START,
  LFO_FILTER_RANGE_OCTAVES,
  LFO_PITCH_RANGE_SEMITONES,
  MAX_DELAY_LINE_SECONDS,
  clampCompressorAttack,
  clampCompressorRelease,
  clampDrive,
  clampFeedback,
  clampFrequency,
  clampLfoAmount,
  clampLfoRate,
  clampRatio,
  clampReverbDecay,
  clampSampleEnd,
  clampSampleStart,
  clampSend,
  clampThresholdDb,
  clampVolume,
  delayTimeSeconds,
  isSampleTrimmed,
  type ChannelLfo,
  type DriveType,
  type LfoShape,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterReverb,
} from "@/lib/sequencer";

type TriggerOptions = {
  /** Linear gain for this hit. */
  gain?: number;
  /** Stereo placement, -1 to 1. Omit to leave the hit centred and mono. */
  pan?: number;
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
  /** Whether another channel can cut this hit short. Omit when nothing can. */
  chokeable?: boolean;
  /**
   * Where in the buffer the hit starts and stops, as fractions of the whole
   * file. Omit either one to play the sample from its start, or to its end.
   */
  sampleStart?: number;
  sampleEnd?: number;
  /** Reads the region back to front. Omit to play the sample forwards. */
  sampleReversed?: boolean;
  /** Modulation running for the length of this hit. Omit for none. */
  lfo?: ChannelLfo;
};

/**
 * A hit that something can cut short, held from the moment it is scheduled until
 * it ends. Only channels with a choke source register one: every other voice is
 * fire-and-forget, and keeping a handle on it would be bookkeeping for a cut
 * that can never come.
 */
type Voice = {
  source: AudioBufferSourceNode;
  /** Where a choke writes its fade. Nothing else ever touches this gain. */
  fade: GainNode;
  /** When the voice starts on the audio clock. */
  startTime: number;
  /** When the voice already ends, if its decay scheduled a stop. */
  releaseTime: number | null;
  /** Set once a choke is scheduled, so a second one can't re-open the fade. */
  choked: boolean;
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
 * How many samples the scope reads at once — about 46 ms at 44.1 kHz.
 *
 * Long enough that the shape of a hit is visible rather than a slice through
 * its middle, short enough that a kick at any usable tempo is still one event
 * crossing the screen rather than a smear of several.
 */
const SCOPE_FFT_SIZE = 2048;

/**
 * Where a decay ramp lands before the voice is cut. An exponential curve is the
 * one that sounds like a drum dying away, but it can only approach zero, so it
 * runs down to -80 dB — inaudible — and is snapped to silence from there.
 */
const DECAY_FLOOR = 0.0001;

/**
 * How long a choked voice takes to fade before it is cut. Cutting a buffer
 * outright is a step to silence, which clicks; a few milliseconds is enough to
 * avoid that while still reading as one sound taking another away rather than as
 * a fade of its own.
 */
const CHOKE_FADE_SECONDS = 0.005;

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

/**
 * Cents in the units the LFO's depths are expressed in. Pitch and cutoff are
 * both modulated through a `detune` param, which is measured in cents, so a
 * swing is the same musical interval up as it is down however high or low the
 * parameter it is riding happens to sit.
 */
const CENTS_PER_SEMITONE = 100;
const CENTS_PER_OCTAVE = 1200;

/**
 * Steps in the sample-and-hold table. Long enough that looping it doesn't read
 * as a repeating figure, short enough that the table stays a few hundred
 * kilobytes.
 */
const RANDOM_LFO_STEPS = 32;

/**
 * How long one step of that table lasts at playback rate 1. A voice sets its
 * LFO rate by playing the table faster or slower, so this only fixes where that
 * ratio sits — chosen so the usable rates land within a couple of octaves of
 * 1x, where resampling can't smear the steps into ramps.
 */
const RANDOM_LFO_HOLD_SECONDS = 0.1;

/**
 * One random value per step, held flat across it. Playing this back as a buffer
 * is what lets a random shape be an LFO like any other — a signal that can be
 * connected to an AudioParam — where there is no oscillator type for it.
 */
function createRandomLfoTable(context: AudioContext): AudioBuffer {
  const rate = context.sampleRate;
  const holdFrames = Math.max(1, Math.round(rate * RANDOM_LFO_HOLD_SECONDS));
  const table = context.createBuffer(1, RANDOM_LFO_STEPS * holdFrames, rate);
  const samples = table.getChannelData(0);

  for (let step = 0; step < RANDOM_LFO_STEPS; step += 1) {
    samples.fill(
      Math.random() * 2 - 1,
      step * holdFrames,
      (step + 1) * holdFrames,
    );
  }

  return table;
}

type LfoSource = OscillatorNode | AudioBufferSourceNode;

/**
 * A voice's modulation source, swinging ±1 at its output whatever the shape.
 * The table is taken as a getter so the periodic shapes never build one.
 */
function createLfoSource(
  context: AudioContext,
  { shape, rateHz }: ChannelLfo,
  randomTable: () => AudioBuffer,
): LfoSource {
  const rate = clampLfoRate(rateHz);

  if (shape === "random") {
    const source = context.createBufferSource();
    source.buffer = randomTable();
    source.loop = true;
    // One held value per cycle: a step lasts RANDOM_LFO_HOLD_SECONDS at rate 1,
    // so the rate that makes it last 1/`rate` instead is the product of the two.
    source.playbackRate.value = rate * RANDOM_LFO_HOLD_SECONDS;
    return source;
  }

  const oscillator = context.createOscillator();
  // The periodic shapes are named after the oscillator types that produce them.
  oscillator.type = shape;
  oscillator.frequency.value = rate;
  return oscillator;
}

/**
 * Starts an LFO. The periodic shapes start from phase zero, which is what makes
 * every retriggered hit sweep identically; sample-and-hold enters its table at
 * a random point instead, so repeated hits don't all walk the same sequence of
 * values and a random shape stays random across the bar.
 */
function startLfoSource(source: LfoSource, time: number) {
  if ("buffer" in source) {
    source.start(time, Math.random() * (source.buffer?.duration ?? 0));
  } else {
    source.start(time);
  }
}

/**
 * A channel's free-running LFO: one source per channel, left running once it is
 * built. Carrying its phase across hits is the whole point of the mode, so it
 * deliberately outlives every voice that taps it.
 */
type ChannelLfoNodes = {
  source: LfoSource;
  /** The shape `source` was built for. A change to it means a new node. */
  shape: LfoShape;
  /**
   * Where voices tap the LFO. Kept across a source swap so a shape change can
   * be made underneath voices that are already holding on to it.
   */
  output: GainNode;
};

/**
 * The channel's continuous LFO, built on the first hit that asks for one.
 *
 * Settings are pushed in from here rather than from an effect, because a hit is
 * the only moment the channel's own LFO settings reach the audio layer: a rate
 * moved mid-pattern therefore lands on the next hit, which at any usable tempo
 * is a step away.
 */
function ensureChannelLfo(
  context: AudioContext,
  lfos: Map<string, ChannelLfoNodes>,
  channelId: string,
  lfo: ChannelLfo,
  randomTable: () => AudioBuffer,
): ChannelLfoNodes {
  const now = context.currentTime;
  const existing = lfos.get(channelId);

  if (!existing) {
    const output = context.createGain();
    const source = createLfoSource(context, lfo, randomTable);
    source.connect(output);
    startLfoSource(source, now);

    const nodes: ChannelLfoNodes = { source, shape: lfo.shape, output };
    lfos.set(channelId, nodes);
    return nodes;
  }

  // A running oscillator would take a new type on its own, but crossing to or
  // from sample-and-hold is a different kind of node entirely — so rather than
  // split the two cases, any shape change simply swaps the source out behind
  // the output the voices are already tapping. Resetting the phase on a change
  // the user just made is not something anyone is listening for.
  if (existing.shape !== lfo.shape) {
    existing.source.stop();
    existing.source.disconnect();
    existing.source = createLfoSource(context, lfo, randomTable);
    existing.source.connect(existing.output);
    startLfoSource(existing.source, now);
    existing.shape = lfo.shape;
    return existing;
  }

  // Ramped rather than set: a rate step on a sounding LFO is audible as a click
  // on the destination it is riding.
  const rate = clampLfoRate(lfo.rateHz);
  if ("buffer" in existing.source) {
    rampTo(existing.source.playbackRate, rate * RANDOM_LFO_HOLD_SECONDS, now);
  } else {
    rampTo(existing.source.frequency, rate, now);
  }

  return existing;
}

/**
 * Drops a channel's continuous LFO once nothing is asking for one.
 *
 * Only the source is torn down. The output node is left connected, because
 * voices that are still tapping it remove their own connection when they end,
 * and pulling it out from under them here would make that cleanup throw.
 */
function releaseChannelLfo(
  lfos: Map<string, ChannelLfoNodes>,
  channelId: string,
) {
  const nodes = lfos.get(channelId);
  if (!nodes) return;

  nodes.source.stop();
  nodes.source.disconnect();
  lfos.delete(channelId);
}

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
  /** The filter stage's output, where the compressor picks the signal up. */
  filterOut: GainNode;
  compressor: DynamicsCompressorNode;
  /** Makeup gain, to put back what the compressor took off. */
  makeup: GainNode;
  compressed: GainNode;
  uncompressed: GainNode;
  /**
   * Where the scope reads the mix. Tapped off the fader rather than spliced
   * into the chain, so it observes without being in the way of anything: an
   * analyser with nothing connected to its output still sees everything sent
   * to it.
   */
  analyser: AnalyserNode;
  /**
   * The output fader, last before the destination. It sits downstream of where
   * the send returns rejoin, so it scales the whole mix — repeats and tail
   * included — without touching the delay's feedback loop gain.
   */
  output: GainNode;

  /** Where channel delay sends land. */
  delayBus: GainNode;
  delayLine: DelayNode;
  feedback: GainNode;
  /** Damping inside the feedback loop, so each repeat is darker than the last. */
  delayTone: BiquadFilterNode;
  /** The delay's return level, and its whole bypass. */
  delayLevel: GainNode;
  /** How much of the delay's return is passed on to the reverb bus. */
  delayToReverb: GainNode;

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
        (Math.random() * 2 - 1) * Math.pow(1 - i / length, REVERB_DECAY_CURVE);
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

/**
 * The same audio, read back to front.
 *
 * A whole second buffer rather than a negative playback rate, because there is
 * no such thing: a source node only ever reads forwards, so playing a sample
 * backwards means holding one that already is. The copy costs the file's own
 * size in memory and a pass over its frames, which is why callers cache it
 * rather than building one per hit.
 */
function reverseBuffer(
  context: AudioContext,
  buffer: AudioBuffer,
): AudioBuffer {
  const reversed = context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const from = buffer.getChannelData(channel);
    const into = reversed.getChannelData(channel);
    const last = from.length - 1;
    for (let frame = 0; frame <= last; frame += 1) {
      into[frame] = from[last - frame];
    }
  }

  return reversed;
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
  const filterOut = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const makeup = context.createGain();
  const compressed = context.createGain();
  const uncompressed = context.createGain();
  const analyser = context.createAnalyser();
  const output = context.createGain();
  const delayBus = context.createGain();
  const delayLine = context.createDelay(MAX_DELAY_LINE_SECONDS);
  const feedback = context.createGain();
  const delayTone = createCutFilter(context, "lowpass", DEFAULT_DELAY_TONE_HZ);
  const delayLevel = context.createGain();
  const delayToReverb = context.createGain();
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
  filtered.connect(filterOut);

  driveOut.connect(unfiltered);
  unfiltered.connect(filterOut);

  // The compressor is last of the three, so it is levelling what the drive and
  // the cuts have already made rather than a mix that is about to change under
  // it. Crossfaded around like the others, and its makeup gain sits inside that
  // crossfade so bypassing takes the compression and the level it was made up
  // with together — the same promise the drive stage's own level makes.
  filterOut.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(compressed);
  compressed.connect(output);

  filterOut.connect(uncompressed);
  uncompressed.connect(output);

  // The knee is fixed, so it is set once here rather than pushed across on
  // every change like the params that have sliders.
  compressor.knee.value = COMPRESSOR_KNEE_DB;

  // The compressor stays fed even while it is crossfaded out, which is what
  // lets the meter show what the stage would be doing before it is switched
  // in — the same promise the rail's other bypassed controls make.
  //
  // Every path lands on the fader rather than on the destination, so the master
  // level is the one thing everything passes through on the way out.
  output.connect(context.destination);

  // And the scope hangs off the far end of it, so what it draws is what is
  // actually leaving the machine — the fader included, which is what makes
  // pulling the master down show on the screen rather than beside it.
  analyser.fftSize = SCOPE_FFT_SIZE;
  output.connect(analyser);

  // The delay's own output is what feeds the loop, so the return level sets how
  // loud the repeats are without changing how many of them there are. A cycle
  // is legal here only because a DelayNode sits in it — the spec mutes any
  // other feedback loop outright — and `feedback` is held below unity so the
  // repeats always die away.
  //
  // The tone filter sits inside that loop, with both the return and the
  // feedback taken after it, so every trip round darkens the repeat once more
  // and the echoes recede instead of ringing on as bright as they arrived. It
  // is a Butterworth, so it has no resonant peak and no frequency ever sees a
  // loop gain above `feedback` — a filter that peaked could push the loop past
  // unity at its resonance while the slider still read well under it.
  delayBus.connect(delayLine);
  delayLine.connect(delayTone);
  delayTone.connect(feedback);
  feedback.connect(delayLine);
  delayTone.connect(delayLevel);

  // Damping sits after the convolver rather than before it, so it darkens the
  // tail itself instead of just the signal being fed into the room.
  reverbBus.connect(convolver);
  convolver.connect(damping);
  damping.connect(reverbLevel);

  // The delay's own send into the reverb, so the repeats can be given a space
  // rather than sitting flat against the dry mix. Tapped after the return level
  // for the same reason the channel sends are post-fader: pulling the repeats
  // down takes their share of the tail with them, and switching the delay off
  // takes both. Nothing downstream of the reverb reaches the delay bus, so this
  // adds no second feedback path.
  delayLevel.connect(delayToReverb);
  delayToReverb.connect(reverbBus);

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
  compressed.gain.value = 0;
  uncompressed.gain.value = 1;
  // Sends are parallel, so silencing the return *is* the bypass.
  delayLevel.gain.value = 0;
  reverbLevel.gain.value = 0;
  // Matches the closed default, so the first ramp doesn't start from unity.
  delayToReverb.gain.value = 0;

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
    filterOut,
    compressor,
    makeup,
    compressed,
    uncompressed,
    analyser,
    output,
    delayBus,
    delayLine,
    feedback,
    delayTone,
    delayLevel,
    delayToReverb,
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
 * Time, feedback and tone keep tracking while the bus is switched off, so a
 * delay can be dialled in silently and then brought up. Silencing the return is
 * the whole of the bypass: the dry mix never passed through here to begin with,
 * and the send on into the reverb hangs off the return, so it goes quiet too.
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
  rampTo(chain.delayTone.frequency, clampFrequency(delay.toneHz), now);
  rampTo(
    chain.delayLevel.gain,
    delay.enabled ? clampVolume(delay.level) : 0,
    now,
  );
  rampTo(chain.delayToReverb.gain, clampSend(delay.reverbSend), now);
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

function applyCompressor(
  context: AudioContext,
  chain: MasterChain,
  compressor: MasterCompressor,
) {
  const now = context.currentTime;

  rampTo(
    chain.compressor.threshold,
    clampThresholdDb(compressor.thresholdDb),
    now,
  );
  rampTo(chain.compressor.ratio, clampRatio(compressor.ratio), now);
  rampTo(
    chain.compressor.attack,
    clampCompressorAttack(compressor.attackSeconds),
    now,
  );
  rampTo(
    chain.compressor.release,
    clampCompressorRelease(compressor.releaseSeconds),
    now,
  );
  rampTo(chain.makeup.gain, clampVolume(compressor.level), now);
  rampTo(chain.compressed.gain, compressor.enabled ? 1 : 0, now);
  rampTo(chain.uncompressed.gain, compressor.enabled ? 0 : 1, now);
}

/**
 * Ramped like every other gain here, so dragging the fader is a fade rather
 * than a staircase of steps, each of which would click.
 */
function applyVolume(
  context: AudioContext,
  chain: MasterChain,
  volume: number,
) {
  rampTo(chain.output.gain, clampVolume(volume), context.currentTime);
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
  // The back-to-front copy of every sample a channel is playing reversed, built
  // on first use. Keyed by the forward buffer rather than by channel id, so two
  // channels pointed at one sample — a pasted copy — share the one reversal,
  // and a buffer that has been replaced takes its copy with it when it goes.
  const reversedBuffersRef = useRef(new WeakMap<AudioBuffer, AudioBuffer>());
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
  const compressorRef = useRef<MasterCompressor>(DEFAULT_MASTER_COMPRESSOR);
  // The scope's read buffer, built on first use and then reused every frame.
  const waveformRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const volumeRef = useRef(DEFAULT_MASTER_VOLUME);
  // The sample-and-hold table, built on first use and then shared by every
  // voice: it runs to a few hundred kilobytes, and a fresh one per hit would
  // allocate that on every step of every channel using a random LFO.
  const randomLfoRef = useRef<AudioBuffer | null>(null);
  // The continuous LFO of every channel currently running one, by channel id.
  const channelLfosRef = useRef(new Map<string, ChannelLfoNodes>());
  // The sounding voices of every channel something chokes, by channel id. Each
  // voice removes itself as it ends, so this only ever holds what is still
  // audible and there is nothing to sweep up.
  const voicesRef = useRef(new Map<string, Set<Voice>>());

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
      applyCompressor(context, chain, compressorRef.current);
      applyVolume(context, chain, volumeRef.current);
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

  /** Points the compressor at `compressor`, creating no context of its own. */
  const applyMasterCompressor = useCallback((compressor: MasterCompressor) => {
    compressorRef.current = compressor;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyCompressor(context, chain, compressor);
  }, []);

  /**
   * How much the compressor is pulling the mix down right now, in dB — zero or
   * negative, and zero before there is a context to ask.
   *
   * A getter rather than state: this is read once a frame by the meter, and
   * putting it through React would re-render the whole rail sixty times a
   * second to move one bar.
   */
  const getGainReduction = useCallback(() => {
    return masterRef.current?.compressor.reduction ?? 0;
  }, []);

  /**
   * The last window of samples leaving the machine, as bytes about a midpoint
   * of 128, or null before there is a context to ask.
   *
   * The buffer is owned here and handed back rather than filled for the caller,
   * so the scope neither has to know how many samples it is about to be given
   * nor allocate a couple of kilobytes on every frame it draws.
   */
  const getWaveform = useCallback(() => {
    const chain = masterRef.current;
    if (!chain) return null;

    const samples = (waveformRef.current ??= new Uint8Array(
      chain.analyser.fftSize,
    ));
    chain.analyser.getByteTimeDomainData(samples);
    return samples;
  }, []);

  /** Points the output fader at `volume`, creating no context of its own. */
  const applyMasterVolume = useCallback((volume: number) => {
    volumeRef.current = volume;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyVolume(context, chain, volume);
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

  /** The decoded buffer behind a channel's sample, e.g. to hand off to a copy. */
  const getSampleBuffer = useCallback(
    (channelId: string) => buffersRef.current.get(channelId),
    [],
  );

  /**
   * Points `channelId` at an already-decoded buffer, e.g. pasting a copied
   * sample. Safe to share one `AudioBuffer` across channels — it is only ever
   * read from during playback, never written to.
   */
  const setSampleBuffer = useCallback(
    (channelId: string, buffer: AudioBuffer) => {
      buffersRef.current.set(channelId, buffer);
    },
    [],
  );

  /** Schedules the channel's sample to play at `time` on the audio clock. */
  const trigger = useCallback(
    (
      channelId: string,
      time: number,
      {
        gain = 1,
        pan,
        playbackRate = 1,
        lowCutHz,
        highCutHz,
        attackSeconds,
        decaySeconds,
        delaySend,
        reverbSend,
        chokeable = false,
        sampleStart = DEFAULT_SAMPLE_START,
        sampleEnd = DEFAULT_SAMPLE_END,
        sampleReversed = DEFAULT_SAMPLE_REVERSED,
        lfo,
      }: TriggerOptions = {},
    ) => {
      const context = contextRef.current;
      const master = masterRef.current;
      const forward = buffersRef.current.get(channelId);
      if (!context || !master || !forward) return;

      // Reversed on the first hit that asks for it, and kept: the pass over the
      // frames is far too much to do while a step is being scheduled, and a
      // channel left reversed would pay it again on every hit.
      let buffer = forward;
      if (sampleReversed) {
        const cache = reversedBuffersRef.current;
        buffer = cache.get(forward) ?? reverseBuffer(context, forward);
        cache.set(forward, buffer);
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      // Fresh nodes per hit, so a knob move never retunes an already-playing note.
      let tail: AudioNode = source;

      // Everything the voice has to let go of when it ends, run as one handler:
      // `onended` is a single slot and more than one thing can need cleaning up.
      const onEnded: Array<() => void> = [];

      // A choked channel's voices run through a gain node of their own, which is
      // where the fade before the cut is written. It cannot ride `gainNode`
      // below: a volume LFO is summed into that param, so pulling its base value
      // down would leave the modulation still swinging above silence. First in
      // the chain, so the cut takes the sends and the envelope with it.
      let fade: GainNode | null = null;

      if (chokeable) {
        fade = context.createGain();
        tail.connect(fade);
        tail = fade;
      }

      // Held rather than folded into `tail`, since an LFO aimed at a cut needs
      // that particular filter back to modulate it.
      let highpass: BiquadFilterNode | null = null;
      let lowpass: BiquadFilterNode | null = null;

      if (lowCutHz !== undefined) {
        highpass = createCutFilter(context, "highpass", lowCutHz);
        tail.connect(highpass);
        tail = highpass;
      }

      if (highCutHz !== undefined) {
        lowpass = createCutFilter(context, "lowpass", highCutHz);
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

      // Upstream of the volume node, so the sends tapped off it below are panned
      // with the channel: a tom hard right should reach the delay from the right
      // as well, rather than being placed in the dry mix and then quietly
      // recentred by its own repeats.
      //
      // Set rather than ramped, unlike the master params: this is a fresh node
      // built for one hit and nothing is sounding through it yet, so there is no
      // value to move away from and nothing to click.
      if (pan !== undefined) {
        const panner = context.createStereoPanner();
        panner.pan.value = pan;
        tail.connect(panner);
        tail = panner;
      }

      // A volume LFO is written into the voice's own gain rather than given a
      // node of its own: an AudioParam sums its base value with whatever is
      // connected to it, so offsetting the base down by half the depth here is
      // what lets the swing come back up to the channel's level at its peak
      // instead of pushing past it, and down to silence at full depth.
      const tremolo =
        lfo?.destination === "volume" ? clampLfoAmount(lfo.amount) / 2 : 0;

      const gainNode = context.createGain();
      gainNode.gain.value = gain * (1 - tremolo);

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

      // A channel keeps a continuous LFO only while something is tapping it, so
      // switching the section off — or back to retriggering — releases it, and
      // the phase starts fresh whenever free mode is next asked for.
      if (!lfo || lfo.retrigger) {
        releaseChannelLfo(channelLfosRef.current, channelId);
      }

      if (lfo) {
        const amount = clampLfoAmount(lfo.amount);
        const randomTable = () =>
          (randomLfoRef.current ??= createRandomLfoTable(context));

        // The LFO swings ±1; this scales that into the destination's own unit.
        const depth = context.createGain();

        if (lfo.retrigger) {
          // An LFO of this voice's own, started with it, so every hit sweeps
          // the same way rather than catching a continuous one wherever it had
          // drifted to by the time the step came round.
          const modulator = createLfoSource(context, lfo, randomTable);
          modulator.connect(depth);
          startLfoSource(modulator, time);

          // Nothing stops an oscillator on its own, and one left running holds
          // every node it feeds alive with it. The voice's own end — the decay
          // below, or the buffer simply running out — is the moment there is no
          // longer anything to modulate.
          onEnded.push(() => modulator.stop());
        } else {
          const channelLfo = ensureChannelLfo(
            context,
            channelLfosRef.current,
            channelId,
            lfo,
            randomTable,
          );
          channelLfo.output.connect(depth);

          // The tap has to come back out when the voice ends. The LFO outlives
          // the voice, so a connection left in place would keep that voice —
          // and everything downstream of it — alive and processing for good.
          onEnded.push(() => {
            channelLfo.output.disconnect(depth);
            depth.disconnect();
          });
        }

        switch (lfo.destination) {
          case "pitch":
            // Into `detune` rather than `playbackRate`, which is a ratio: an
            // equal swing in cents is an equal interval either way, where an
            // equal swing in rate would bend further up than down.
            depth.gain.value =
              amount * LFO_PITCH_RANGE_SEMITONES * CENTS_PER_SEMITONE;
            depth.connect(source.detune);
            break;

          case "volume":
            depth.gain.value = gain * tremolo;
            depth.connect(gainNode.gain);
            break;

          // The filter this rides always exists: `triggerOptionsForChannel`
          // builds the cut an LFO is pointed at even where it would otherwise
          // be bypassed. The check is for callers that pass their own options.
          case "lowCut":
            depth.gain.value =
              amount * LFO_FILTER_RANGE_OCTAVES * CENTS_PER_OCTAVE;
            if (highpass) depth.connect(highpass.detune);
            break;

          case "highCut":
            depth.gain.value =
              amount * LFO_FILTER_RANGE_OCTAVES * CENTS_PER_OCTAVE;
            if (lowpass) depth.connect(lowpass.detune);
            break;
        }
      }

      // Registered before it starts, so a choke scheduled for this same instant
      // can already see it and decide — by its start time — to leave it alone.
      if (fade) {
        const voice: Voice = {
          source,
          fade,
          startTime: time,
          releaseTime,
          choked: false,
        };

        const voices = voicesRef.current;
        const sounding = voices.get(channelId);
        if (sounding) {
          sounding.add(voice);
        } else {
          voices.set(channelId, new Set([voice]));
        }

        onEnded.push(() => {
          const live = voices.get(channelId);
          live?.delete(voice);
          // The channel's set goes with its last voice, so a kit that stops
          // playing leaves nothing behind here.
          if (live?.size === 0) voices.delete(channelId);
        });
      }

      if (onEnded.length > 0) {
        source.onended = () => {
          for (const cleanUp of onEnded) cleanUp();
        };
      }

      // Trimming is done by the source itself rather than by scheduling a stop:
      // the offset and the duration are read in the buffer's own frames, so the
      // region holds its place whatever the playback rate is — a hit tuned down
      // an octave plays the same slice of the file, twice as slowly, exactly as
      // a hardware sampler does. A stop scheduled in wall-clock seconds could
      // not follow that, and a pitch LFO moves the rate while the hit sounds.
      if (isSampleTrimmed(sampleStart, sampleEnd)) {
        const start = clampSampleStart(sampleStart, sampleEnd);
        const end = clampSampleEnd(sampleEnd, sampleStart);

        // The handles are fractions of the file as it was loaded, so against a
        // reversed buffer they have to be mirrored: what was the last third of
        // the file is the first third of the copy. The span is the same either
        // way — the same slice of audio, read the other way round.
        source.start(
          time,
          (sampleReversed ? 1 - end : start) * buffer.duration,
          (end - start) * buffer.duration,
        );
      } else {
        source.start(time);
      }

      // Past the decay there is nothing left to hear, so the voice is released
      // rather than left running silently until the buffer ends.
      if (releaseTime !== null) {
        source.stop(releaseTime);
      }
    },
    [],
  );

  /**
   * Cuts short whatever `channelIds` are still sounding, at `time` on the audio
   * clock — an open hat taken away by the pedal, which is what a choke is for.
   *
   * Voices that start at `time` or later are left alone. That is what lets a
   * channel and the channel that chokes it land on the same step: the hit being
   * scheduled for that instant survives, and only what was already ringing goes.
   */
  const choke = useCallback((channelIds: string[], time: number) => {
    // Nothing can be sounding before there is a context, so there is nothing to
    // cut and nothing to remember either.
    if (!contextRef.current) return;

    for (const channelId of channelIds) {
      const sounding = voicesRef.current.get(channelId);
      if (!sounding) continue;

      for (const voice of sounding) {
        if (voice.choked || voice.startTime >= time) continue;
        voice.choked = true;

        // The fade node's gain is untouched otherwise, so unity is what it is
        // holding when the ramp starts and there is nothing to anchor against.
        const cutAt = time + CHOKE_FADE_SECONDS;
        voice.fade.gain.setValueAtTime(1, time);
        voice.fade.gain.linearRampToValueAtTime(0, cutAt);

        // Never later than the voice was already going to end, so a choke can
        // only ever shorten a hit — a short decay still finishes when it would.
        voice.source.stop(Math.min(cutAt, voice.releaseTime ?? cutAt));
      }
    }
  }, []);

  return {
    ensureContext,
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    applyMasterCompressor,
    getGainReduction,
    getWaveform,
    applyMasterVolume,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    getSampleBuffer,
    setSampleBuffer,
    trigger,
    choke,
  };
}
