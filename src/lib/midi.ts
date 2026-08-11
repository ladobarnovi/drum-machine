import { CHANNEL_COUNT, clampBpm } from "@/lib/sequencer";

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
  | { type: "cc"; controller: number; value: number }
  | { type: "clock" }
  | { type: "start" }
  | { type: "stop" }
  | { type: "continue" }
  | { type: "other" };

/**
 * Decodes a raw Web MIDI message's bytes into the things this machine
 * listens for: notes, for triggering channels; control changes, for mapping
 * to a slider or knob; and the real-time clock/transport bytes, for
 * following another device's tempo. Everything else is `"other"` —
 * program-change bytes fall through here rather than needing their own case
 * nobody reads.
 */
export function parseMidiMessage(data: Uint8Array | null): MidiMessage {
  if (!data || data.length < 1) return { type: "other" };

  // System real-time messages are a single byte with no channel nibble at
  // all, so they're matched exactly rather than masked like the channel
  // messages below — masking 0xF8 the same way would collide it with 0xF0.
  const status = data[0];
  if (status === MIDI_CLOCK) return { type: "clock" };
  if (status === MIDI_START) return { type: "start" };
  if (status === MIDI_STOP) return { type: "stop" };
  if (status === MIDI_CONTINUE) return { type: "continue" };

  if (data.length < 2) return { type: "other" };

  // The high nibble is the message type; the low nibble is the MIDI channel,
  // which this machine doesn't distinguish between — a controller sending on
  // channel 10 works exactly like one sending on channel 1.
  const type = status & 0xf0;
  const data1 = data[1];
  const data2 = data.length > 2 ? data[2] : 0;

  // A note-on with zero velocity is the running-status trick most MIDI gear
  // uses to mean "note off" without a second status byte, so it's folded into
  // the same case as an explicit 0x80.
  if (type === 0x90 && data2 > 0) {
    return { type: "noteon", note: data1, velocity: data2 };
  }
  if (type === 0x90 || type === 0x80) return { type: "noteoff", note: data1 };
  if (type === 0xb0) return { type: "cc", controller: data1, value: data2 };
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

/** A MIDI CC value (0..127), scaled linearly onto whatever range a mapped control's own slider covers. */
export function ccValueToRange(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, 0), 127);
  return min + (clamped / 127) * (max - min);
}

/**
 * Where the transport's tempo comes from: the BPM slider, or an estimate
 * read off an incoming MIDI clock (see `useMidiClockInput`).
 */
export type MidiClockSource = "internal" | "external";

/** True in any browser that implements the Web MIDI API. */
export function isMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

export const MIDI_INPUT_STORAGE_KEY = "drum-machine-midi-input";
export const MIDI_OUTPUT_STORAGE_KEY = "drum-machine-midi-output";

/**
 * The single-byte System Real-Time messages MIDI clock and transport are
 * built from. None of the four carry data bytes — the status byte is the
 * whole message.
 */
export const MIDI_CLOCK = 0xf8;
export const MIDI_START = 0xfa;
export const MIDI_CONTINUE = 0xfb;
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

/**
 * How many incoming clock pulses a tempo estimate is drawn from — one
 * quarter note's worth. Long enough that the jitter between any two
 * individual pulses washes out, short enough that a tempo change on the
 * sending device is heard within a beat rather than a bar.
 */
export const MIDI_CLOCK_ESTIMATE_WINDOW = MIDI_CLOCK_PPQ;

/**
 * Turns a run of incoming clock-pulse timestamps (in the same units as
 * `performance.now()`) into a tempo.
 *
 * A least-squares fit of pulse index against timestamp, rather than just the
 * span between the oldest and the newest one divided by the count between
 * them — which sounds like it ought to differ from averaging the individual
 * gaps one at a time, but is exactly the same number: each interior
 * timestamp cancels out of that sum once as the end of one gap and once as
 * the start of the next, so the middle of the window wouldn't be pulling any
 * weight at all. A fit is what actually uses it — every pulse pulls the line
 * towards where it was really heard, so a longer window means less of any
 * one pulse's jitter left in the answer, not just a longer span to divide by.
 */
export function estimateBpmFromPulseTimestamps(
  timestampsMs: readonly number[],
): number | null {
  const count = timestampsMs.length;
  if (count < 2) return null;

  const meanIndex = (count - 1) / 2;
  const meanTime =
    timestampsMs.reduce((sum, value) => sum + value, 0) / count;

  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < count; index += 1) {
    const indexOffset = index - meanIndex;
    numerator += indexOffset * (timestampsMs[index] - meanTime);
    denominator += indexOffset * indexOffset;
  }
  if (denominator === 0) return null;

  const msPerPulse = numerator / denominator;
  if (msPerPulse <= 0) return null;

  return clampBpm(60000 / (msPerPulse * MIDI_CLOCK_PPQ));
}
