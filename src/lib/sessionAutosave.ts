import {
  DEFAULT_ATTACK_SECONDS,
  DEFAULT_DECAY_SECONDS,
  DEFAULT_FILTER_SLOPE,
  DEFAULT_HIGH_CUT_HZ,
  DEFAULT_LOW_CUT_HZ,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_PAN,
  DEFAULT_PITCH,
  DEFAULT_RELEASE_SECONDS,
  DEFAULT_RESONANCE,
  DEFAULT_SEND,
  DEFAULT_SUSTAIN_LEVEL,
  DEFAULT_VOLUME,
  clampAttack,
  clampDecay,
  clampFilterSlope,
  clampFrequency,
  clampPan,
  clampPitch,
  clampRelease,
  clampResonance,
  clampSend,
  clampSustain,
  clampVolume,
  type Channel,
  type ChannelSnapshot,
  type ParameterSnapshot,
} from "./sequencer";
import {
  captureSharedBeat,
  decodeMaster,
  decodeSharedBeat,
  encodeLfo,
  encodeMaster,
  encodeSharedBeat,
  decodeLfo,
  type SharedBeat,
  type SharedMaster,
} from "./patternShare";

/**
 * The live machine as autosave sees it: everything a link already knows how to
 * carry, plus the two things a link deliberately leaves out — the output fader
 * and the header's held snapshot, both of which are this machine's business
 * and nobody else's.
 */
export type LiveSession = {
  channels: Channel[];
  bpm: number;
  swing: number;
  master: SharedMaster;
  masterVolume: number;
  snapshot: ParameterSnapshot | null;
};

export type RestoredSession = {
  beat: SharedBeat;
  masterVolume: number;
  snapshot: ParameterSnapshot | null;
};

/** Where the live machine is written between reloads. */
const STORAGE_KEY = "drum-machine-session";

const SESSION_VERSION = 1;

type StoredChannelSnapshot = {
  volume: number;
  pan: number;
  pitch: number;
  lowCutHz: number;
  lowCutResonance: number;
  highCutHz: number;
  highCutResonance: number;
  filterSlope: number;
  attackSeconds: number;
  decaySeconds: number;
  sustainLevel: number;
  releaseSeconds: number;
  delaySend: number;
  reverbSend: number;
  phaserSend: number;
  chokedBy: string | null;
  lfo: ReturnType<typeof encodeLfo>;
};

type StoredSnapshot = {
  channels: Record<string, StoredChannelSnapshot>;
  master: ReturnType<typeof encodeMaster>;
  volume: number;
};

type StoredSession = {
  v: number;
  /** Steps, mix, kit, tempo and swing — the same wire format a link carries. */
  beat: string;
  masterVolume: number;
  snapshot: StoredSnapshot | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * The header snapshot, packed with the same wire helpers a link uses for the
 * master rail and each channel's LFO — reusing their clamps rather than
 * writing a second set for values that mean exactly the same thing here.
 */
function encodeSnapshot(snapshot: ParameterSnapshot): StoredSnapshot {
  const channels: Record<string, StoredChannelSnapshot> = {};

  for (const [channelId, channel] of Object.entries(snapshot.channels)) {
    channels[channelId] = {
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
      chokedBy: channel.chokedBy,
      lfo: encodeLfo(channel.lfo),
    };
  }

  return {
    channels,
    master: encodeMaster({
      drive: snapshot.drive,
      filter: snapshot.filter,
      delay: snapshot.delay,
      reverb: snapshot.reverb,
      phaser: snapshot.phaser,
      compressor: snapshot.compressor,
    }),
    volume: snapshot.volume,
  };
}

function decodeChannelSnapshot(value: unknown): ChannelSnapshot {
  const raw = isRecord(value) ? value : {};

  return {
    volume: clampVolume(readNumber(raw.volume, DEFAULT_VOLUME)),
    pan: clampPan(readNumber(raw.pan, DEFAULT_PAN)),
    pitch: clampPitch(readNumber(raw.pitch, DEFAULT_PITCH)),
    lowCutHz: clampFrequency(readNumber(raw.lowCutHz, DEFAULT_LOW_CUT_HZ)),
    lowCutResonance: clampResonance(
      readNumber(raw.lowCutResonance, DEFAULT_RESONANCE),
    ),
    highCutHz: clampFrequency(readNumber(raw.highCutHz, DEFAULT_HIGH_CUT_HZ)),
    highCutResonance: clampResonance(
      readNumber(raw.highCutResonance, DEFAULT_RESONANCE),
    ),
    filterSlope: clampFilterSlope(
      readNumber(raw.filterSlope, DEFAULT_FILTER_SLOPE),
    ),
    attackSeconds: clampAttack(
      readNumber(raw.attackSeconds, DEFAULT_ATTACK_SECONDS),
    ),
    decaySeconds: clampDecay(readNumber(raw.decaySeconds, DEFAULT_DECAY_SECONDS)),
    sustainLevel: clampSustain(
      readNumber(raw.sustainLevel, DEFAULT_SUSTAIN_LEVEL),
    ),
    releaseSeconds: clampRelease(
      readNumber(raw.releaseSeconds, DEFAULT_RELEASE_SECONDS),
    ),
    delaySend: clampSend(readNumber(raw.delaySend, DEFAULT_SEND)),
    reverbSend: clampSend(readNumber(raw.reverbSend, DEFAULT_SEND)),
    phaserSend: clampSend(readNumber(raw.phaserSend, DEFAULT_SEND)),
    chokedBy: typeof raw.chokedBy === "string" ? raw.chokedBy : null,
    lfo: decodeLfo(raw.lfo),
  };
}

function decodeSnapshot(value: unknown): ParameterSnapshot | null {
  if (!isRecord(value) || !isRecord(value.channels)) return null;

  const channels: Record<string, ChannelSnapshot> = {};
  for (const [channelId, raw] of Object.entries(value.channels)) {
    channels[channelId] = decodeChannelSnapshot(raw);
  }

  const master = decodeMaster(value.master);

  return {
    channels,
    drive: master.drive,
    filter: master.filter,
    delay: master.delay,
    reverb: master.reverb,
    phaser: master.phaser,
    compressor: master.compressor,
    volume: clampVolume(readNumber(value.volume, DEFAULT_MASTER_VOLUME)),
  };
}

/**
 * Writes the live machine to `localStorage`, debounced by the caller.
 *
 * Never throws: a full quota or a private-browsing tab that refuses storage
 * just means this reload won't be the one that comes back — the machine
 * itself keeps playing either way.
 */
export async function saveSession(session: LiveSession): Promise<void> {
  if (typeof window === "undefined") return;

  const beat = captureSharedBeat(
    session.channels,
    session.bpm,
    session.swing,
    session.master,
  );

  const stored: StoredSession = {
    v: SESSION_VERSION,
    beat: await encodeSharedBeat(beat),
    masterVolume: session.masterVolume,
    snapshot: session.snapshot ? encodeSnapshot(session.snapshot) : null,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or storage disabled — nothing to recover from here.
  }
}

/**
 * Reads the session back, tolerant of anything a future version or a hand-
 * edited value in dev tools might have left behind — the same rule a link
 * follows, applied to a string this machine wrote for itself instead of one
 * that arrived from somewhere else.
 */
export async function loadSession(): Promise<RestoredSession | null> {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.beat !== "string") return null;

  const result = await decodeSharedBeat(parsed.beat);
  if (!result.ok) return null;

  return {
    beat: result.beat,
    masterVolume: clampVolume(
      readNumber(parsed.masterVolume, DEFAULT_MASTER_VOLUME),
    ),
    snapshot: decodeSnapshot(parsed.snapshot),
  };
}
