"use client";

import type { MidiInputDevice } from "@/hooks/useMidiInput";
import type { MidiOutputDevice } from "@/hooks/useMidiClockOutput";
import type { MidiClockSource } from "@/lib/midi";

const NONE_OPTION = "";
const INTERNAL_OPTION = "internal";
const EXTERNAL_OPTION = "external";

export type MidiSettings = {
  /** False outside a browser that implements Web MIDI — Safari, Firefox. */
  supported: boolean;
  inputs: MidiInputDevice[];
  selectedInputId: string | null;
  onSelectInput: (id: string | null) => void;
  outputs: MidiOutputDevice[];
  selectedOutputId: string | null;
  onSelectOutput: (id: string | null) => void;
  /** Whether the transport follows the BPM slider or the incoming clock. */
  clockSource: MidiClockSource;
  onClockSourceChange: (source: MidiClockSource) => void;
  /** The live tempo read off the input, or null while nothing's arrived recently. */
  estimatedBpm: number | null;
};

/**
 * Picks which MIDI input plays the kit and which output follows its tempo —
 * a pad controller or keyboard on one side, a synth or drum machine slaved to
 * this one's clock on the other.
 *
 * The MIDI half of `SettingsDialog`.
 */
export default function MidiSettingsPanel({
  supported,
  inputs,
  selectedInputId,
  onSelectInput,
  outputs,
  selectedOutputId,
  onSelectOutput,
  clockSource,
  onClockSourceChange,
  estimatedBpm,
}: MidiSettings) {
  // Said plainly rather than shown as empty pickers: there is nothing to
  // choose here, and a disabled control would suggest there might be.
  if (!supported) {
    return (
      <p className="text-muted text-xs">
        This browser doesn&rsquo;t support Web MIDI, so there are no devices to
        connect. Chrome and Edge do.
      </p>
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-xs">
        <span>Input</span>
        <select
          value={selectedInputId ?? NONE_OPTION}
          onChange={(event) =>
            onSelectInput(
              event.target.value === NONE_OPTION ? null : event.target.value,
            )
          }
          aria-label="MIDI input"
          className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
        >
          <option value={NONE_OPTION}>
            {inputs.length === 0 ? "No devices found" : "None"}
          </option>
          {inputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </select>
        <span className="text-muted">
          Notes 36–51 (C1–D#2 on most controllers) play channels 1–16.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span>Clock source</span>
        <select
          value={clockSource}
          onChange={(event) =>
            onClockSourceChange(
              event.target.value === EXTERNAL_OPTION
                ? EXTERNAL_OPTION
                : INTERNAL_OPTION,
            )
          }
          aria-label="MIDI clock source"
          className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
        >
          <option value={INTERNAL_OPTION}>Internal</option>
          <option value={EXTERNAL_OPTION}>External</option>
        </select>

        {/* Only worth a line while it says something the select doesn't
            already: which way External is actually going right now. */}
        {clockSource === EXTERNAL_OPTION && (
          <span className="text-muted">
            {estimatedBpm !== null
              ? `Following incoming clock — ${estimatedBpm} BPM.`
              : "Waiting for a clock signal…"}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span>Output</span>
        <select
          value={selectedOutputId ?? NONE_OPTION}
          onChange={(event) =>
            onSelectOutput(
              event.target.value === NONE_OPTION ? null : event.target.value,
            )
          }
          aria-label="MIDI output"
          className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
        >
          <option value={NONE_OPTION}>
            {outputs.length === 0 ? "No devices found" : "None"}
          </option>
          {outputs.map((output) => (
            <option key={output.id} value={output.id}>
              {output.name}
            </option>
          ))}
        </select>
        <span className="text-muted">
          Sends clock and start/stop, so another device can follow this
          machine&rsquo;s tempo and transport.
        </span>
      </label>
    </>
  );
}
