import { findLibrarySample } from "./sampleLibrary";
import {
  CHANNEL_COUNT,
  DEFAULT_ATTACK_SECONDS,
  DEFAULT_BPM,
  DEFAULT_CHANNEL_LFO,
  DEFAULT_DECAY_SECONDS,
  DEFAULT_FILTER_SLOPE,
  DEFAULT_HIGH_CUT_HZ,
  DEFAULT_LOW_CUT_HZ,
  DEFAULT_MASTER_COMPRESSOR,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_PHASER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_PAN,
  DEFAULT_PITCH,
  DEFAULT_RELEASE_SECONDS,
  DEFAULT_RESONANCE,
  DEFAULT_SAMPLE_END,
  DEFAULT_SAMPLE_MODE,
  DEFAULT_SAMPLE_REVERSED,
  DEFAULT_SAMPLE_START,
  DEFAULT_SEND,
  DEFAULT_SLICE_COUNT,
  DEFAULT_STEP_COUNT,
  DEFAULT_SUSTAIN_LEVEL,
  DEFAULT_SWING,
  DEFAULT_VOLUME,
  LOCKABLE_PARAMETERS,
  MAX_STEPS,
  channelIdForIndex,
  clampAttack,
  clampBpm,
  clampChannelName,
  clampChokeSource,
  clampCompressorAttack,
  clampCompressorRelease,
  clampDecay,
  clampDelayDivision,
  clampDelaySeconds,
  clampDrive,
  clampDriveType,
  clampFeedback,
  clampFilterSlope,
  clampFrequency,
  clampLength,
  clampLfoAmount,
  clampLfoDestination,
  clampLfoRate,
  clampLfoShape,
  clampPan,
  clampPhaserDepth,
  clampPhaserFeedback,
  clampPhaserRate,
  clampPhaserStages,
  clampPitch,
  clampRatio,
  clampRelease,
  clampResonance,
  clampReverbDecay,
  clampSampleEnd,
  clampSampleMode,
  clampSampleStart,
  clampSend,
  clampSliceCount,
  clampStepProbability,
  clampStepRepeat,
  clampStepSlice,
  clampStepTiming,
  clampStepVelocity,
  clampSustain,
  clampSwing,
  clampThresholdDb,
  clampVolume,
  createStep,
  type Channel,
  type ChannelLfo,
  type ChannelSnapshot,
  type LockableParameter,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
  type SampleMode,
  type SliceCount,
  type Step,
  type StepLocks,
} from "./sequencer";

/**
 * Beats travelling by link.
 *
 * The unit here is deliberately larger than a `Pattern`. A pattern is steps and
 * mix and nothing else, because inside one machine the kit is shared across
 * every pattern and bank — see `lib/patterns.ts`, where leaving the sample out
 * is the whole point. A link has no such shared ground: whoever opens it has
 * their own kit loaded, or none, and a beat that arrived without saying what it
 * was played on would come out as someone else's samples in your pattern's
 * shape. So a shared beat carries the library sample each channel was playing,
 * the sample edits made to it, the tempo and the swing, on top of everything a
 * pattern already holds.
 *
 * What it cannot carry is an uploaded file. Those live only as decoded buffers
 * in the page that decoded them, and a link is a few hundred bytes of URL —
 * so a channel playing one travels as its settings and its steps, with the slot
 * left empty and named for what is missing. Saying so plainly on both ends is
 * better than a link that silently drops a third of the kit.
 */

/** One channel as a link carries it: a pattern's worth, plus what it played. */
export type SharedChannel = ChannelSnapshot & {
  steps: Step[];
  length: number;
  name: string;
  /**
   * Whether the channel was silent, and whether it was one of the ones being
   * soloed.
   *
   * Named here rather than inherited from `ChannelSnapshot`, which no longer
   * carries either — those went to scenes, since a pattern slot has no business
   * rewriting the mutes of the machine it lands in. A link is the other case:
   * it replaces the whole machine rather than joining one, so a channel the
   * sender had switched off has to arrive switched off or the beat is not the
   * beat they sent. The wire already carries both as `m` and `so`, and links
   * written before scenes existed are full of them, so this is also what keeps
   * those still playing the way they were built.
   */
  muted: boolean;
  soloed: boolean;
  sampleStart: number;
  sampleEnd: number;
  sampleReversed: boolean;
  sampleMode: SampleMode;
  sliceCount: SliceCount;
  /**
   * The bundled sample this channel was playing, when it was one. Absent for a
   * channel that was empty and for one playing an upload — the receiving end
   * tells those two apart by `missingSampleName`.
   */
  libraryId?: string;
  /**
   * What the sender's channel was called when the sample could not travel, so
   * the empty slot can say "Break.wav" rather than going quietly blank.
   */
  missingSampleName?: string;
};

/**
 * The six stages of the effects rail — the three sends and the three the whole
 * mix passes through — as a link carries them.
 *
 * The output fader is not among them, and the line is the one the machine
 * already draws: these six are the FX rail, where Volume sits in the controls
 * rail under Output. It is also the more useful line. The six shape what the
 * beat *sounds* like and travel with it for the same reason the kit does; the
 * fader only decides how loud it arrives, which is the listener's business and
 * not something a sender should be able to set from the other end.
 */
export type SharedMaster = {
  drive: MasterDrive;
  filter: MasterFilter;
  delay: MasterDelay;
  reverb: MasterReverb;
  phaser: MasterPhaser;
  compressor: MasterCompressor;
};

export type SharedBeat = {
  bpm: number;
  swing: number;
  master: SharedMaster;
  /** Keyed by channel id, like `Pattern`. Silent channels are left out. */
  channels: Record<string, SharedChannel>;
};

/**
 * The wire format's version, written into every link and checked on the way
 * back in.
 *
 * Links outlive deploys — someone posts one, it sits in a chat for a month, and
 * the machine has moved on by the time it is opened. A version is what lets
 * that link either still work or fail with something worth reading, rather than
 * being parsed hopefully into a beat that is subtly not the one that was sent.
 *
 * 2 added the master stages. A version 1 link still opens: it carries no master
 * block, and no block decodes to the six stages at their defaults — every one of
 * which is bypassed, so the beat is heard dry. That is the honest reading rather
 * than a lenient one. A link is the whole of what was sent, and an older one
 * simply never said what the mix was going through; leaving whatever the
 * receiving machine had switched on would put a stranger's reverb over it.
 */
const FORMAT_VERSION = 2;

/** Marks how the bytes were packed, so a link says how to read itself. */
const DEFLATED = "z";
const PLAIN = "u";

/** The fragment key a link's payload travels under, e.g. `#p=z7VZ…`. */
const SHARE_PARAM = "p";

/*
 * The wire shape.
 *
 * Short keys and absent defaults, both for the same reason: a link has to
 * survive being pasted into places that treat a URL as a word, and the
 * difference between a beat that fits in a chat message and one that gets
 * truncated is most of what this file is doing. A default sixteen-step channel
 * is sixteen steps of nothing to say; the encoder says nothing about it, and
 * the decoder puts the default back.
 *
 * Deflate then squeezes what is left, and is very good at the repetition that
 * remains — sixteen channels' worth of the same key names collapse to almost
 * nothing after the first. Which is why the keys are merely short rather than
 * packed into bits: the tighter scheme would buy bytes the compressor is
 * already getting, and cost the ability to read a payload while debugging one.
 */

type WireLocks = Partial<Record<LockableParameter, number>>;

/** A step at its defaults, off, which is most of them. */
type WireStep =
  | 0
  | {
      /** On. Present only when true, so an off step is `{}` plus whatever it kept. */
      o?: 1;
      v?: number;
      p?: number;
      r?: number;
      s?: number;
      t?: number;
      k?: WireLocks;
    };

type WireLfo = {
  e?: 1;
  s?: string;
  r?: number;
  a?: number;
  d?: string;
  /** Retrigger is on by default, so this marks it *off*. */
  f?: 1;
};

type WireChannel = {
  n?: string;
  k?: string;
  x?: string;
  l?: number;
  t?: WireStep[];
  vol?: number;
  pan?: number;
  pit?: number;
  lc?: number;
  lcr?: number;
  hc?: number;
  hcr?: number;
  fs?: number;
  at?: number;
  dc?: number;
  su?: number;
  re?: number;
  ds?: number;
  rs?: number;
  ps?: number;
  m?: 1;
  so?: 1;
  ch?: string;
  lfo?: WireLfo;
  ss?: number;
  se?: number;
  rv?: 1;
  sm?: string;
  sc?: number;
};

/*
 * The master stages. Each is written only as far as it differs from its own
 * default, and a stage that matches it outright is left out entirely — which is
 * every one of them on a machine nobody has touched the effects rail on, so the
 * six cost a link that isn't using them nothing at all.
 *
 * `enabled` is the exception worth naming: every stage ships bypassed, so `e: 1`
 * is what a switched-on stage says, and its absence is a stage left off.
 */

type WireDrive = { e?: 1; t?: string; a?: number; l?: number };
type WireFilter = { e?: 1; lc?: number; hc?: number };
type WireDelay = {
  e?: 1;
  /** Synced is the default, so this marks a delay running free. */
  f?: 1;
  d?: string;
  t?: number;
  fb?: number;
  pp?: 1;
  tn?: number;
  l?: number;
  rs?: number;
};
type WireReverb = { e?: 1; d?: number; tn?: number; l?: number; ps?: number };
type WirePhaser = {
  e?: 1;
  s?: number;
  r?: number;
  d?: number;
  fb?: number;
  l?: number;
};
type WireCompressor = {
  e?: 1;
  th?: number;
  ra?: number;
  a?: number;
  r?: number;
  l?: number;
};

type WireMaster = {
  dr?: WireDrive;
  fi?: WireFilter;
  dl?: WireDelay;
  rv?: WireReverb;
  ph?: WirePhaser;
  cp?: WireCompressor;
};

type WireBeat = {
  v: number;
  b?: number;
  s?: number;
  m?: WireMaster;
  /** Keyed by channel *index*, not id: "3" rather than "channel-4". */
  c: Record<string, WireChannel>;
};

/**
 * Rounds a float to something a link can afford.
 *
 * Every one of these values came off a slider and is on its way to an audio
 * parameter, where four decimal places is far below anything anyone can hear —
 * but `0.8200000000000001` is nineteen characters of payload, and a pattern
 * carries hundreds of them.
 */
function round(value: number, places = 4): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

/** Writes `value` only when it differs from what the decoder would assume. */
function unlessDefault<T>(value: T, fallback: T): T | undefined {
  return value === fallback ? undefined : value;
}

/**
 * Drops the keys that came out `undefined`.
 *
 * JSON has no use for them either way, but they are what `unlessDefault`
 * returns for everything already at its default, and leaving them in place
 * would have `Object.keys` disagree with what is actually being sent.
 */
function dropUndefined<T extends object>(wire: T): T {
  for (const key of Object.keys(wire) as (keyof T)[]) {
    if (wire[key] === undefined) delete wire[key];
  }
  return wire;
}

/** The same, reporting a wholly default object as nothing worth writing. */
function compact<T extends object>(wire: T): T | undefined {
  dropUndefined(wire);
  return Object.keys(wire).length === 0 ? undefined : wire;
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

/**
 * Reads the live machine into the shape a link carries.
 *
 * Only channels that would be heard: one playing a sample, or one with a step
 * switched on. A channel that is neither contributes silence, and sixteen of
 * those is most of a default machine — leaving them out is what keeps a
 * two-channel sketch's link short rather than making every link pay for the
 * fourteen slots nobody touched.
 */
export function captureSharedBeat(
  channels: Channel[],
  bpm: number,
  swing: number,
  master: SharedMaster,
): SharedBeat {
  const shared: Record<string, SharedChannel> = {};

  for (const channel of channels) {
    if (!carriesSomething(channel)) continue;

    const loaded = channel.sample.status === "loaded" ? channel.sample : null;
    const libraryId = loaded?.libraryId;

    shared[channel.id] = {
      volume: channel.volume,
      pan: channel.pan,
      pitch: channel.pitch,
      lowCutHz: channel.lowCutHz,
      lowCutResonance: channel.lowCutResonance,
      highCutHz: channel.highCutHz,
      highCutResonance: channel.highCutResonance,
      filterSlope: channel.filterSlope,
      attackSeconds: channel.attackSeconds,
      decaySeconds: channel.decaySeconds,
      sustainLevel: channel.sustainLevel,
      releaseSeconds: channel.releaseSeconds,
      delaySend: channel.delaySend,
      reverbSend: channel.reverbSend,
      phaserSend: channel.phaserSend,
      muted: channel.muted,
      soloed: channel.soloed,
      chokedBy: channel.chokedBy,
      lfo: { ...channel.lfo },
      steps: channel.steps.map((step) => ({
        ...step,
        locks: step.locks ? { ...step.locks } : undefined,
      })),
      length: channel.length,
      name: channel.name,
      sampleStart: channel.sampleStart,
      sampleEnd: channel.sampleEnd,
      sampleReversed: channel.sampleReversed,
      sampleMode: channel.sampleMode,
      sliceCount: channel.sliceCount,
      libraryId,
      // Only for a sample that was really there and cannot travel: an upload.
      missingSampleName: loaded && !libraryId ? loaded.name : undefined,
    };
  }

  return {
    bpm,
    swing,
    // Copied, so a stage moved after the link is built cannot reach back into
    // the beat that was captured — the same care the channels take over steps.
    master: {
      drive: { ...master.drive },
      filter: { ...master.filter },
      delay: { ...master.delay },
      reverb: { ...master.reverb },
      phaser: { ...master.phaser },
      compressor: { ...master.compressor },
    },
    channels: shared,
  };
}

/**
 * Whether a channel would be heard at all: a sample loaded, or a step switched
 * on. The one rule deciding both what goes into a link and whether there is a
 * link to make, so the Copy button cannot offer one that turns out empty.
 *
 * Looped rather than sliced: this is asked on every render to light the button,
 * and a slice of sixty-four per channel to answer a question that usually stops
 * at the first step is an allocation for nothing.
 */
function carriesSomething(channel: Channel): boolean {
  if (channel.sample.status === "loaded") return true;

  for (let index = 0; index < channel.length; index += 1) {
    if (channel.steps[index]?.on) return true;
  }

  return false;
}

/** True once the machine has something worth putting in a link. */
export function isWorthSharing(channels: Channel[]): boolean {
  return channels.some(carriesSomething);
}

/** The bundled samples a decoded beat asks for, in channel order. */
export function sharedBeatKit(
  beat: SharedBeat,
): { channelId: string; libraryId: string }[] {
  const kit: { channelId: string; libraryId: string }[] = [];

  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const channelId = channelIdForIndex(index);
    const libraryId = beat.channels[channelId]?.libraryId;
    if (libraryId) kit.push({ channelId, libraryId });
  }

  return kit;
}

/**
 * Writes a decoded beat over the live channels.
 *
 * Unlike `applyPattern`, a channel the beat does not mention is *emptied*
 * rather than left alone. The two are answering different questions: loading a
 * pattern happens inside a machine whose kit is the ground everything sits on,
 * where blanking an unmentioned channel would throw away a sound the pattern
 * had no business touching. A link is the opposite case — it is the whole of
 * what was sent, and anything the receiving machine already had is the thing
 * that would be heard by mistake. Someone opening a two-channel loop should
 * hear two channels, not those two over the eleven their last kit left running.
 *
 * The sample itself is left to the caller: what belongs on the channel is a
 * decoded buffer, which has to be fetched. This sets everything around it,
 * including the empty slot an upload leaves behind.
 */
/**
 * A shared channel with the two fields that are not a channel's taken off.
 *
 * `libraryId` and `missingSampleName` are the link's record of what the channel
 * *played*, which the caller turns into a fetch and a notice. Spreading them
 * onto a `Channel` along with everything else would leave every channel in the
 * machine carrying a stray pair of properties that nothing reads — and that the
 * next snapshot, pattern and bank would all copy along after it.
 *
 * Deleted from a copy rather than destructured past, which would mean naming
 * two bindings only to discard them.
 */
function channelStateOf(
  shared: SharedChannel,
): Omit<SharedChannel, "libraryId" | "missingSampleName"> {
  const state = { ...shared };
  delete state.libraryId;
  delete state.missingSampleName;
  return state;
}

export function applySharedBeat(
  channels: Channel[],
  beat: SharedBeat,
): Channel[] {
  return channels.map((channel) => {
    const shared = beat.channels[channel.id];

    if (!shared) {
      return {
        ...channel,
        name: channel.label,
        steps: Array.from({ length: MAX_STEPS }, createStep),
        length: DEFAULT_STEP_COUNT,
        sample: { status: "empty" as const },
        sampleStart: DEFAULT_SAMPLE_START,
        sampleEnd: DEFAULT_SAMPLE_END,
        sampleReversed: DEFAULT_SAMPLE_REVERSED,
        sampleMode: DEFAULT_SAMPLE_MODE,
        sliceCount: DEFAULT_SLICE_COUNT,
      };
    }

    const state = channelStateOf(shared);

    return {
      ...channel,
      ...state,
      // Re-checked here rather than at decode, because whether a choke source
      // is real is a question about this machine's channels, not about the
      // link — and only here are they in hand.
      chokedBy: clampChokeSource(state.chokedBy ?? "", channels, channel.id),
      lfo: { ...state.lfo },
      steps: state.steps.map((step) => ({
        ...step,
        locks: step.locks ? { ...step.locks } : undefined,
      })),
      // The slot is filled by the caller once the sample is decoded. Until
      // then it is empty, which is also where it stays for an upload.
      sample: { status: "empty" as const },
    };
  });
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

function encodeLocks(locks: StepLocks | undefined): WireLocks | undefined {
  if (!locks) return undefined;

  const wire: WireLocks = {};
  let count = 0;

  for (const parameter of LOCKABLE_PARAMETERS) {
    const value = locks[parameter];
    if (value === undefined) continue;
    wire[parameter] = round(value);
    count += 1;
  }

  return count > 0 ? wire : undefined;
}

function encodeStep(step: Step): WireStep {
  const blank = createStep();
  const wire: Exclude<WireStep, 0> = {};

  if (step.on) wire.o = 1;
  if (step.velocity !== blank.velocity) wire.v = round(step.velocity);
  if (step.probability !== blank.probability) wire.p = round(step.probability);
  if (step.repeatCount !== blank.repeatCount) wire.r = step.repeatCount;
  if (step.slice !== blank.slice) wire.s = step.slice;
  if (step.timingOffset !== blank.timingOffset) {
    wire.t = round(step.timingOffset, 5);
  }

  const locks = encodeLocks(step.locks);
  if (locks) wire.k = locks;

  return Object.keys(wire).length === 0 ? 0 : wire;
}

export function encodeLfo(lfo: ChannelLfo): WireLfo | undefined {
  const wire: WireLfo = {};

  if (lfo.enabled) wire.e = 1;
  if (lfo.shape !== DEFAULT_CHANNEL_LFO.shape) wire.s = lfo.shape;
  if (lfo.rateHz !== DEFAULT_CHANNEL_LFO.rateHz) wire.r = round(lfo.rateHz, 3);
  if (lfo.amount !== DEFAULT_CHANNEL_LFO.amount) wire.a = round(lfo.amount);
  if (lfo.destination !== DEFAULT_CHANNEL_LFO.destination) {
    wire.d = lfo.destination;
  }
  if (!lfo.retrigger) wire.f = 1;

  return Object.keys(wire).length === 0 ? undefined : wire;
}

function encodeChannel(shared: SharedChannel, label: string): WireChannel {
  const blank = createStep();
  const isBlankStep = (step: Step) =>
    !step.on &&
    step.velocity === blank.velocity &&
    step.probability === blank.probability &&
    step.repeatCount === blank.repeatCount &&
    step.slice === blank.slice &&
    step.timingOffset === blank.timingOffset &&
    !step.locks;

  /*
   * Only as far as the channel actually plays, and then only as far as the
   * last step with anything on it. A channel is always MAX_STEPS long in
   * memory so that shrinking and growing it preserves what was programmed
   * past the end — but that is a convenience for the person editing, not
   * something the link owes anyone. Sixteen played steps of a 64-slot array
   * is 48 zeroes nobody sent.
   */
  const played = shared.steps.slice(0, shared.length);
  let last = played.length - 1;
  while (last >= 0 && isBlankStep(played[last])) last -= 1;

  const wire: WireChannel = {
    n: unlessDefault(shared.name, label),
    k: shared.libraryId,
    x: shared.missingSampleName,
    l: unlessDefault(shared.length, DEFAULT_STEP_COUNT),
    vol: unlessDefault(round(shared.volume), DEFAULT_VOLUME),
    pan: unlessDefault(round(shared.pan), DEFAULT_PAN),
    pit: unlessDefault(round(shared.pitch, 2), DEFAULT_PITCH),
    lc: unlessDefault(Math.round(shared.lowCutHz), DEFAULT_LOW_CUT_HZ),
    lcr: unlessDefault(round(shared.lowCutResonance, 2), DEFAULT_RESONANCE),
    hc: unlessDefault(Math.round(shared.highCutHz), DEFAULT_HIGH_CUT_HZ),
    hcr: unlessDefault(round(shared.highCutResonance, 2), DEFAULT_RESONANCE),
    fs: unlessDefault(shared.filterSlope, DEFAULT_FILTER_SLOPE),
    at: unlessDefault(round(shared.attackSeconds, 5), DEFAULT_ATTACK_SECONDS),
    dc: unlessDefault(round(shared.decaySeconds, 5), DEFAULT_DECAY_SECONDS),
    su: unlessDefault(round(shared.sustainLevel), DEFAULT_SUSTAIN_LEVEL),
    re: unlessDefault(round(shared.releaseSeconds, 5), DEFAULT_RELEASE_SECONDS),
    ds: unlessDefault(round(shared.delaySend), DEFAULT_SEND),
    rs: unlessDefault(round(shared.reverbSend), DEFAULT_SEND),
    ps: unlessDefault(round(shared.phaserSend), DEFAULT_SEND),
    m: shared.muted ? 1 : undefined,
    so: shared.soloed ? 1 : undefined,
    ch: shared.chokedBy ?? undefined,
    lfo: encodeLfo(shared.lfo),
    ss: unlessDefault(round(shared.sampleStart), DEFAULT_SAMPLE_START),
    se: unlessDefault(round(shared.sampleEnd), DEFAULT_SAMPLE_END),
    rv: shared.sampleReversed ? 1 : undefined,
    sm: unlessDefault(shared.sampleMode, DEFAULT_SAMPLE_MODE),
    sc: unlessDefault(shared.sliceCount, DEFAULT_SLICE_COUNT),
  };

  if (last >= 0) wire.t = played.slice(0, last + 1).map(encodeStep);

  // Dropped here rather than guarded at each line above: the values read better
  // compared against the constant they came from, and JSON has no use for a key
  // whose value is `undefined` either way.
  //
  // `dropUndefined` rather than `compact`: a channel with nothing to say is
  // still a channel the beat mentions, and an entry in `c` is the only thing
  // saying so. Dropping it to `undefined` here would empty the slot on the way
  // back in.
  return dropUndefined(wire);
}

export function encodeMaster(master: SharedMaster): WireMaster | undefined {
  const { drive, filter, delay, reverb, phaser, compressor } = master;
  const D = DEFAULT_MASTER_DRIVE;
  const F = DEFAULT_MASTER_FILTER;
  const L = DEFAULT_MASTER_DELAY;
  const R = DEFAULT_MASTER_REVERB;
  const P = DEFAULT_MASTER_PHASER;
  const C = DEFAULT_MASTER_COMPRESSOR;

  return compact<WireMaster>({
    dr: compact<WireDrive>({
      e: drive.enabled ? 1 : undefined,
      t: unlessDefault(drive.type, D.type),
      a: unlessDefault(round(drive.amount), D.amount),
      l: unlessDefault(round(drive.level), D.level),
    }),
    fi: compact<WireFilter>({
      e: filter.enabled ? 1 : undefined,
      lc: unlessDefault(Math.round(filter.lowCutHz), F.lowCutHz),
      hc: unlessDefault(Math.round(filter.highCutHz), F.highCutHz),
    }),
    dl: compact<WireDelay>({
      e: delay.enabled ? 1 : undefined,
      f: delay.synced ? undefined : 1,
      d: unlessDefault(delay.division, L.division),
      t: unlessDefault(round(delay.timeSeconds, 5), L.timeSeconds),
      fb: unlessDefault(round(delay.feedback), L.feedback),
      pp: delay.pingPong ? 1 : undefined,
      tn: unlessDefault(Math.round(delay.toneHz), L.toneHz),
      l: unlessDefault(round(delay.level), L.level),
      rs: unlessDefault(round(delay.reverbSend), L.reverbSend),
    }),
    rv: compact<WireReverb>({
      e: reverb.enabled ? 1 : undefined,
      d: unlessDefault(round(reverb.decaySeconds, 3), R.decaySeconds),
      tn: unlessDefault(Math.round(reverb.toneHz), R.toneHz),
      l: unlessDefault(round(reverb.level), R.level),
      ps: unlessDefault(round(reverb.phaserSend), R.phaserSend),
    }),
    ph: compact<WirePhaser>({
      e: phaser.enabled ? 1 : undefined,
      s: unlessDefault(phaser.stages, P.stages),
      r: unlessDefault(round(phaser.rateHz, 3), P.rateHz),
      d: unlessDefault(round(phaser.depth), P.depth),
      fb: unlessDefault(round(phaser.feedback), P.feedback),
      l: unlessDefault(round(phaser.level), P.level),
    }),
    cp: compact<WireCompressor>({
      e: compressor.enabled ? 1 : undefined,
      th: unlessDefault(round(compressor.thresholdDb, 2), C.thresholdDb),
      ra: unlessDefault(round(compressor.ratio, 2), C.ratio),
      a: unlessDefault(round(compressor.attackSeconds, 5), C.attackSeconds),
      r: unlessDefault(round(compressor.releaseSeconds, 5), C.releaseSeconds),
      l: unlessDefault(round(compressor.level), C.level),
    }),
  });
}

function encodeBeat(beat: SharedBeat): WireBeat {
  const wire: WireBeat = { v: FORMAT_VERSION, c: {} };

  if (beat.bpm !== DEFAULT_BPM) wire.b = Math.round(beat.bpm);
  if (beat.swing !== DEFAULT_SWING) wire.s = round(beat.swing, 3);

  const master = encodeMaster(beat.master);
  if (master) wire.m = master;

  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const channelId = channelIdForIndex(index);
    const shared = beat.channels[channelId];
    if (!shared) continue;
    wire.c[String(index)] = encodeChannel(shared, `Ch. ${index + 1}`);
  }

  return wire;
}

// ---------------------------------------------------------------------------
// Bytes
// ---------------------------------------------------------------------------

/**
 * Base64 that survives a URL.
 *
 * The two characters standard base64 spends on `+` and `/` both mean something
 * else in a URL, and the `=` padding is dropped because its length is already
 * implied — all three are the ordinary base64url substitutions, done by hand
 * rather than pulled in, since it is three replacements.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  // Chunked rather than spread across one call: `String.fromCharCode(...bytes)`
  // passes every byte as its own argument, and a long enough pattern would hand
  // the engine an argument list past what it will take.
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Whether this browser can deflate. Every current one can, and a link made
 * without it still works everywhere — it is simply longer, which is the right
 * way round for a fallback.
 */
function canCompress(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Packs a beat into the token a link carries. */
export async function encodeSharedBeat(beat: SharedBeat): Promise<string> {
  const json = JSON.stringify(encodeBeat(beat));
  const bytes = new TextEncoder().encode(json);

  if (!canCompress()) return PLAIN + bytesToBase64Url(bytes);
  return DEFLATED + bytesToBase64Url(await deflate(bytes));
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

export type SharedBeatResult =
  { ok: true; beat: SharedBeat } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A finite number from the wire, or the fallback for anything else. */
function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function decodeLocks(value: unknown): StepLocks | undefined {
  if (!isRecord(value)) return undefined;

  const locks: StepLocks = {};
  let count = 0;

  /*
   * Driven by the known parameters rather than by the keys that arrived, so a
   * link cannot introduce a lock the machine has no meaning for — and each one
   * goes through the clamp that owns it, so it cannot introduce an out-of-range
   * value for a parameter it does have.
   */
  for (const parameter of LOCKABLE_PARAMETERS) {
    const raw = value[parameter];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;

    switch (parameter) {
      case "volume":
        locks.volume = clampVolume(raw);
        break;
      case "pan":
        locks.pan = clampPan(raw);
        break;
      case "pitch":
        locks.pitch = clampPitch(raw);
        break;
      case "lowCutHz":
        locks.lowCutHz = clampFrequency(raw);
        break;
      case "lowCutResonance":
        locks.lowCutResonance = clampResonance(raw);
        break;
      case "highCutHz":
        locks.highCutHz = clampFrequency(raw);
        break;
      case "highCutResonance":
        locks.highCutResonance = clampResonance(raw);
        break;
      case "attackSeconds":
        locks.attackSeconds = clampAttack(raw);
        break;
      case "decaySeconds":
        locks.decaySeconds = clampDecay(raw);
        break;
      case "sustainLevel":
        locks.sustainLevel = clampSustain(raw);
        break;
      case "releaseSeconds":
        locks.releaseSeconds = clampRelease(raw);
        break;
      case "delaySend":
        locks.delaySend = clampSend(raw);
        break;
      case "reverbSend":
        locks.reverbSend = clampSend(raw);
        break;
      case "phaserSend":
        locks.phaserSend = clampSend(raw);
        break;
    }

    count += 1;
  }

  return count > 0 ? locks : undefined;
}

function decodeStep(value: unknown, sliceCount: SliceCount): Step {
  const step = createStep();
  if (!isRecord(value)) return step;

  step.on = value.o === 1;
  step.velocity = clampStepVelocity(readNumber(value.v, step.velocity));
  step.probability = clampStepProbability(
    readNumber(value.p, step.probability),
  );
  step.repeatCount = clampStepRepeat(readNumber(value.r, step.repeatCount));
  step.slice = clampStepSlice(readNumber(value.s, step.slice), sliceCount);
  step.timingOffset = clampStepTiming(readNumber(value.t, step.timingOffset));

  const locks = decodeLocks(value.k);
  if (locks) step.locks = locks;

  return step;
}

export function decodeLfo(value: unknown): ChannelLfo {
  if (!isRecord(value)) return { ...DEFAULT_CHANNEL_LFO };

  return {
    enabled: value.e === 1,
    shape: clampLfoShape(readString(value.s, DEFAULT_CHANNEL_LFO.shape)),
    rateHz: clampLfoRate(readNumber(value.r, DEFAULT_CHANNEL_LFO.rateHz)),
    amount: clampLfoAmount(readNumber(value.a, DEFAULT_CHANNEL_LFO.amount)),
    destination: clampLfoDestination(
      readString(value.d, DEFAULT_CHANNEL_LFO.destination),
    ),
    retrigger: value.f !== 1,
  };
}

/**
 * The six stages a link asked for, laid over their defaults.
 *
 * Always answers with a full set, whatever turned up. A version 1 link has no
 * master block at all, and a version 2 link made on a machine whose effects rail
 * was never touched has none either — both mean the same thing, and both get six
 * bypassed stages, which is the beat heard dry.
 *
 * Every value goes back through the clamp that owns it, the same rule the
 * channels follow: a hand-edited link must not be able to put a negative decay
 * or a ratio of ten thousand into the audio graph.
 */
export function decodeMaster(value: unknown): SharedMaster {
  const wire = isRecord(value) ? value : {};
  const stage = (key: string): Record<string, unknown> =>
    isRecord(wire[key]) ? wire[key] : {};

  const dr = stage("dr");
  const fi = stage("fi");
  const dl = stage("dl");
  const rv = stage("rv");
  const ph = stage("ph");
  const cp = stage("cp");

  const D = DEFAULT_MASTER_DRIVE;
  const F = DEFAULT_MASTER_FILTER;
  const L = DEFAULT_MASTER_DELAY;
  const R = DEFAULT_MASTER_REVERB;
  const P = DEFAULT_MASTER_PHASER;
  const C = DEFAULT_MASTER_COMPRESSOR;

  return {
    drive: {
      enabled: dr.e === 1,
      type: clampDriveType(readString(dr.t, D.type)),
      amount: clampDrive(readNumber(dr.a, D.amount)),
      level: clampVolume(readNumber(dr.l, D.level)),
    },
    filter: {
      enabled: fi.e === 1,
      lowCutHz: clampFrequency(readNumber(fi.lc, F.lowCutHz)),
      highCutHz: clampFrequency(readNumber(fi.hc, F.highCutHz)),
    },
    delay: {
      enabled: dl.e === 1,
      // Synced is the default, so the flag marks a delay running free.
      synced: dl.f !== 1,
      division: clampDelayDivision(readString(dl.d, L.division)),
      timeSeconds: clampDelaySeconds(readNumber(dl.t, L.timeSeconds)),
      feedback: clampFeedback(readNumber(dl.fb, L.feedback)),
      pingPong: dl.pp === 1,
      toneHz: clampFrequency(readNumber(dl.tn, L.toneHz)),
      level: clampVolume(readNumber(dl.l, L.level)),
      reverbSend: clampSend(readNumber(dl.rs, L.reverbSend)),
    },
    reverb: {
      enabled: rv.e === 1,
      decaySeconds: clampReverbDecay(readNumber(rv.d, R.decaySeconds)),
      toneHz: clampFrequency(readNumber(rv.tn, R.toneHz)),
      level: clampVolume(readNumber(rv.l, R.level)),
      phaserSend: clampSend(readNumber(rv.ps, R.phaserSend)),
    },
    phaser: {
      enabled: ph.e === 1,
      // Written as a number and narrowed from a string, which is the shape the
      // `<select>` this normally comes from hands it over in.
      stages: clampPhaserStages(String(readNumber(ph.s, P.stages))),
      rateHz: clampPhaserRate(readNumber(ph.r, P.rateHz)),
      depth: clampPhaserDepth(readNumber(ph.d, P.depth)),
      feedback: clampPhaserFeedback(readNumber(ph.fb, P.feedback)),
      level: clampVolume(readNumber(ph.l, P.level)),
    },
    compressor: {
      enabled: cp.e === 1,
      thresholdDb: clampThresholdDb(readNumber(cp.th, C.thresholdDb)),
      ratio: clampRatio(readNumber(cp.ra, C.ratio)),
      attackSeconds: clampCompressorAttack(readNumber(cp.a, C.attackSeconds)),
      releaseSeconds: clampCompressorRelease(
        readNumber(cp.r, C.releaseSeconds),
      ),
      level: clampVolume(readNumber(cp.l, C.level)),
    },
  };
}

function decodeChannel(value: unknown, label: string): SharedChannel {
  const wire = isRecord(value) ? value : {};

  const length = clampLength(readNumber(wire.l, DEFAULT_STEP_COUNT));
  const sliceCount = clampSliceCount(readNumber(wire.sc, DEFAULT_SLICE_COUNT));

  const rawSteps = Array.isArray(wire.t) ? wire.t : [];
  // Always MAX_STEPS long, whatever the link sent: the machine's own invariant,
  // and the encoder deliberately stops writing at the last step that said
  // anything. Everything past that is a fresh default step.
  const steps = Array.from({ length: MAX_STEPS }, (_unused, index) =>
    index < rawSteps.length
      ? decodeStep(rawSteps[index], sliceCount)
      : createStep(),
  );

  const sampleStartRaw = readNumber(wire.ss, DEFAULT_SAMPLE_START);
  const sampleEndRaw = readNumber(wire.se, DEFAULT_SAMPLE_END);

  const libraryId = typeof wire.k === "string" ? wire.k : undefined;

  return {
    volume: clampVolume(readNumber(wire.vol, DEFAULT_VOLUME)),
    pan: clampPan(readNumber(wire.pan, DEFAULT_PAN)),
    pitch: clampPitch(readNumber(wire.pit, DEFAULT_PITCH)),
    lowCutHz: clampFrequency(readNumber(wire.lc, DEFAULT_LOW_CUT_HZ)),
    lowCutResonance: clampResonance(readNumber(wire.lcr, DEFAULT_RESONANCE)),
    highCutHz: clampFrequency(readNumber(wire.hc, DEFAULT_HIGH_CUT_HZ)),
    highCutResonance: clampResonance(readNumber(wire.hcr, DEFAULT_RESONANCE)),
    filterSlope: clampFilterSlope(readNumber(wire.fs, DEFAULT_FILTER_SLOPE)),
    attackSeconds: clampAttack(readNumber(wire.at, DEFAULT_ATTACK_SECONDS)),
    decaySeconds: clampDecay(readNumber(wire.dc, DEFAULT_DECAY_SECONDS)),
    sustainLevel: clampSustain(readNumber(wire.su, DEFAULT_SUSTAIN_LEVEL)),
    releaseSeconds: clampRelease(readNumber(wire.re, DEFAULT_RELEASE_SECONDS)),
    delaySend: clampSend(readNumber(wire.ds, DEFAULT_SEND)),
    reverbSend: clampSend(readNumber(wire.rs, DEFAULT_SEND)),
    phaserSend: clampSend(readNumber(wire.ps, DEFAULT_SEND)),
    muted: wire.m === 1,
    soloed: wire.so === 1,
    // Left as the raw string for `applySharedBeat`, which is where the
    // channels it has to name are actually in hand.
    chokedBy: typeof wire.ch === "string" ? wire.ch : null,
    lfo: decodeLfo(wire.lfo),
    steps,
    length,
    name: clampChannelName(readString(wire.n, label)),
    sampleStart: clampSampleStart(sampleStartRaw, sampleEndRaw),
    sampleEnd: clampSampleEnd(sampleEndRaw, sampleStartRaw),
    sampleReversed: wire.rv === 1,
    sampleMode: clampSampleMode(readString(wire.sm, DEFAULT_SAMPLE_MODE)),
    sliceCount,
    // Dropped if the library no longer has it — a sample can be renamed or
    // retired between the link being made and being opened, and a slot that
    // stays empty is better than one that fetches a 404 and shows an error.
    libraryId:
      libraryId && findLibrarySample(libraryId) ? libraryId : undefined,
    missingSampleName: typeof wire.x === "string" ? wire.x : undefined,
  };
}

/** Unpacks the token from a link. Never throws; says why instead. */
export async function decodeSharedBeat(
  token: string,
): Promise<SharedBeatResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "That link has nothing in it." };

  const marker = trimmed.charAt(0);
  const payload = trimmed.slice(1);

  if (marker !== DEFLATED && marker !== PLAIN) {
    return { ok: false, reason: "That doesn't look like a beat link." };
  }

  let json: string;
  try {
    const bytes = base64UrlToBytes(payload);
    const raw = marker === DEFLATED ? await inflate(bytes) : bytes;
    json = new TextDecoder().decode(raw);
  } catch {
    // Anything the browser threw on the way through — bad base64, bytes that
    // are not a deflate stream, a payload a chat app wrapped a line through.
    return { ok: false, reason: "That link is damaged or incomplete." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "That link is damaged or incomplete." };
  }

  if (!isRecord(parsed) || !isRecord(parsed.c)) {
    return { ok: false, reason: "That link is damaged or incomplete." };
  }

  const version = readNumber(parsed.v, 0);
  if (version > FORMAT_VERSION) {
    return {
      ok: false,
      reason: "That beat was made with a newer version. Reload and try again.",
    };
  }

  const channels: Record<string, SharedChannel> = {};
  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    const wire = parsed.c[String(index)];
    if (wire === undefined) continue;
    channels[channelIdForIndex(index)] = decodeChannel(
      wire,
      `Ch. ${index + 1}`,
    );
  }

  if (Object.keys(channels).length === 0) {
    return { ok: false, reason: "That link has no channels in it." };
  }

  return {
    ok: true,
    beat: {
      bpm: clampBpm(readNumber(parsed.b, DEFAULT_BPM)),
      swing: clampSwing(readNumber(parsed.s, DEFAULT_SWING)),
      master: decodeMaster(parsed.m),
      channels,
    },
  };
}

// ---------------------------------------------------------------------------
// The URL itself
// ---------------------------------------------------------------------------

/**
 * A link to this machine playing this beat.
 *
 * The payload rides in the fragment rather than the query for two reasons. It
 * never reaches a server — the app is a static export with no server to reach,
 * and a beat is nobody's business but the two people passing it — and a
 * fragment is the one part of a URL that a static host will not try to route.
 */
export function buildShareUrl(token: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${SHARE_PARAM}=${token}`;
}

/** The token in the address bar, if this page was opened from a link. */
export function readShareToken(): string | null {
  return tokenFromHash(window.location.hash);
}

function tokenFromHash(hash: string): string | null {
  const fragment = hash.replace(/^#/, "");
  if (!fragment) return null;

  const token = new URLSearchParams(fragment).get(SHARE_PARAM);
  return token && token.trim() ? token.trim() : null;
}

/**
 * Takes the payload back out of the address bar, once it has been loaded.
 *
 * `replaceState` rather than assigning to `location.hash`, which would push a
 * history entry and leave Back pointing at a link that would import all over
 * again. What is on screen after this is the machine, not the link — and the
 * beat is the user's to change from here, so the address should stop claiming
 * to describe it.
 */
export function clearShareToken(): void {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
}
