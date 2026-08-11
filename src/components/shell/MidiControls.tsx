"use client";

import RailGroup from "@/components/ui/RailGroup";
import type { MidiInputDevice } from "@/hooks/useMidiInput";
import type { MidiOutputDevice } from "@/hooks/useMidiClockOutput";

const NONE_OPTION = "";

type MidiControlsProps = {
  supported: boolean;
  inputs: MidiInputDevice[];
  selectedInputId: string | null;
  onSelectInput: (id: string | null) => void;
  outputs: MidiOutputDevice[];
  selectedOutputId: string | null;
  onSelectOutput: (id: string | null) => void;
};

/**
 * Picks which MIDI input plays the kit and which output follows its tempo —
 * a pad controller or keyboard on one side, a synth or drum machine slaved to
 * this one's clock on the other.
 *
 * Renders nothing outside a browser that implements Web MIDI — Safari and
 * Firefox chief among them — so the rail shows nothing for a control that
 * could never do anything there, the same way `ServiceWorkerRegistrar` stays
 * quiet where there's no service worker to register.
 */
export default function MidiControls({
  supported,
  inputs,
  selectedInputId,
  onSelectInput,
  outputs,
  selectedOutputId,
  onSelectOutput,
}: MidiControlsProps) {
  if (!supported) return null;

  return (
    <RailGroup title="MIDI">
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
      </label>

      <p className="text-muted text-xs">
        Notes 36–51 (C1–D#2 on most controllers) play channels 1–16.
      </p>

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
      </label>

      <p className="text-muted text-xs">
        Sends clock and start/stop, so another device can follow this
        machine&rsquo;s tempo and transport.
      </p>
    </RailGroup>
  );
}
