import { CHANNEL_COUNT } from "@/lib/sequencer";

/**
 * Where the mapped channels start on an incoming keyboard or pad controller,
 * in the same numbering General MIDI drum maps and most drum-focused gear
 * already use: 36 is "C1", the note a kick sits on from the MPC to Ableton's
 * own default drum rack. Channel 1 lands there and the rest climb
 * chromatically above it, so a 16-pad controller lines up one pad per channel
 * with nothing to configure.
 */
export const MIDI_BASE_NOTE = 36;

/** One past the last note this mapping reaches, exclusive. */
export const MIDI_MAX_NOTE = MIDI_BASE_NOTE + CHANNEL_COUNT;

export type MidiMessage =
  | { type: "noteon"; note: number; velocity: number }
  | { type: "noteoff"; note: number }
  | { type: "other" };

/**
 * Decodes a raw Web MIDI message's bytes into the one thing this machine
 * listens for. Everything that isn't a note is `"other"` — clock, CC and
 * program-change bytes all fall through here rather than needing their own
 * cases nobody reads yet.
 */
export function parseMidiMessage(data: Uint8Array | null): MidiMessage {
  if (!data || data.length < 2) return { type: "other" };

  // The high nibble is the message type; the low nibble is the MIDI channel,
  // which this machine doesn't distinguish between — a controller sending on
  // channel 10 works exactly like one sending on channel 1.
  const status = data[0] & 0xf0;
  const note = data[1];
  const velocity = data.length > 2 ? data[2] : 0;

  // A note-on with zero velocity is the running-status trick most MIDI gear
  // uses to mean "note off" without a second status byte, so it's folded into
  // the same case as an explicit 0x80.
  if (status === 0x90 && velocity > 0) return { type: "noteon", note, velocity };
  if (status === 0x90 || status === 0x80) return { type: "noteoff", note };
  return { type: "other" };
}

/** Which channel index a note number plays, or null outside the mapped range. */
export function channelIndexForMidiNote(note: number): number | null {
  const index = note - MIDI_BASE_NOTE;
  return index >= 0 && index < CHANNEL_COUNT ? index : null;
}

/**
 * MIDI velocity (0..127) as the same 0..1 fraction a step's own velocity
 * already is, so a note played softly attenuates a hit exactly as a quiet
 * step would.
 */
export function midiVelocityToGain(velocity: number): number {
  return Math.min(Math.max(velocity, 0), 127) / 127;
}

/** True in any browser that implements the Web MIDI API. */
export function isMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

export const MIDI_INPUT_STORAGE_KEY = "drum-machine-midi-input";
export const MIDI_OUTPUT_STORAGE_KEY = "drum-machine-midi-output";

/**
 * The single-byte System Real-Time messages MIDI clock is built from. None of
 * the three carry data bytes — the status byte is the whole message.
 */
export const MIDI_CLOCK = 0xf8;
export const MIDI_START = 0xfa;
export const MIDI_STOP = 0xfc;

/**
 * How many clock pulses the MIDI standard packs into one quarter note. Fixed
 * by the spec itself rather than a setting — every device that follows MIDI
 * clock already agrees this is 24, and picking anything else would just be
 * wrong rather than a different flavour of right.
 */
export const MIDI_CLOCK_PPQ = 24;

/**
 * Seconds between clock pulses at a given tempo. Straight and BPM-only, unlike
 * a step's own duration in `lib/sequencer`: MIDI clock exists to broadcast
 * tempo to other gear, and a pulse train that followed this machine's own
 * swing would hand a slaved device an uneven "tempo" that was never dialled
 * in — swing is a feel applied to *this* machine's steps, not something the
 * clock it broadcasts is supposed to carry.
 */
export function secondsPerMidiClockPulse(bpm: number): number {
  return 60 / bpm / MIDI_CLOCK_PPQ;
}
