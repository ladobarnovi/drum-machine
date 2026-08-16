"use client";

import { useEffect } from "react";

import type { MidiInputDevice } from "@/hooks/useMidiInput";
import type { MidiOutputDevice } from "@/hooks/useMidiClockOutput";
import type { MidiClockSource } from "@/lib/midi";

const NONE_OPTION = "";
const INTERNAL_OPTION = "internal";
const EXTERNAL_OPTION = "external";

export type MidiSettings = {
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

type MidiSettingsDialogProps = MidiSettings & {
  onClose: () => void;
};

/**
 * Picks which MIDI input plays the kit and which output follows its tempo —
 * a pad controller or keyboard on one side, a synth or drum machine slaved to
 * this one's clock on the other.
 *
 * A dialog rather than a band in the rail, because this is patched once when
 * the gear is plugged in and then left alone: it took four controls and two
 * paragraphs of explanation out of the space reachable while playing, to say
 * something that only matters before the first bar.
 *
 * Left open on a pick, like `SampleLibraryDialog` — choosing an input and then
 * the clock that goes with it is one sitting, not two visits.
 */
export default function MidiSettingsDialog({
  inputs,
  selectedInputId,
  onSelectInput,
  outputs,
  selectedOutputId,
  onSelectOutput,
  clockSource,
  onClockSourceChange,
  estimatedBpm,
  onClose,
}: MidiSettingsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/*
        Dimmed and covering the page, matching the sample library: everything
        underneath is out of reach until this is closed.
      */}
      <button
        type="button"
        aria-label="Close MIDI settings"
        onClick={onClose}
        className="bg-backdrop fixed inset-0 z-50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="MIDI settings"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="border-line bg-surface pointer-events-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border shadow-lg">
          <div className="border-line flex items-start gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">MIDI</h2>
              <p className="text-muted mt-0.5 truncate text-xs">
                Devices and clock
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close MIDI settings"
              className="text-muted hover:bg-raised hover:text-fg -mt-1 shrink-0 rounded px-2 py-1 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="quiet-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1 text-xs">
              <span>Input</span>
              <select
                value={selectedInputId ?? NONE_OPTION}
                autoFocus
                onChange={(event) =>
                  onSelectInput(
                    event.target.value === NONE_OPTION
                      ? null
                      : event.target.value,
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
                    event.target.value === NONE_OPTION
                      ? null
                      : event.target.value,
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
          </div>

          <div className="border-line flex items-center justify-end border-t p-3">
            <button
              type="button"
              onClick={onClose}
              className="border-edge hover:bg-raised shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
