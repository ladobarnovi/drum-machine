"use client";

import { useState } from "react";

import {
  SYSTEM_DEFAULT_SINK_ID,
  type AudioOutputDevice,
} from "@/lib/audioOutput";

export type SoundSettings = {
  /** False where `AudioContext.setSinkId` is missing — Safari, Firefox. */
  supported: boolean;
  outputs: AudioOutputDevice[];
  selectedOutputId: string;
  onSelectOutput: (id: string) => void;
  /** True while the browser is withholding the device names. */
  namesHidden: boolean;
  /** Resolves false if the prompt was dismissed or refused. */
  onRevealNames: () => Promise<boolean>;
};

/**
 * Picks the speakers, headphones or interface the machine plays out of, for
 * the browsers that can be told (see `lib/audioOutput`).
 *
 * The audio half of `SettingsDialog`. Worth having next to the MIDI pickers
 * rather than left to the operating system: a drum machine is usually one of
 * several things making noise on the computer, and sending it to the interface
 * the monitors are plugged into while everything else stays on the built-in
 * speakers is a decision about this machine, not about the whole desktop.
 */
export default function SoundSettingsPanel({
  supported,
  outputs,
  selectedOutputId,
  onSelectOutput,
  namesHidden,
  onRevealNames,
}: SoundSettings) {
  const [revealing, setRevealing] = useState(false);
  const [refused, setRefused] = useState(false);

  if (!supported) {
    return (
      <p className="text-muted text-xs">
        This browser always plays out of the system&rsquo;s default device, so
        there is nothing to choose. Chrome and Edge can route elsewhere.
      </p>
    );
  }

  const handleReveal = async () => {
    setRevealing(true);
    const granted = await onRevealNames();
    setRevealing(false);
    setRefused(!granted);
  };

  return (
    <>
      <label className="flex flex-col gap-1 text-xs">
        <span>Output device</span>
        <select
          value={selectedOutputId}
          onChange={(event) => onSelectOutput(event.target.value)}
          aria-label="Audio output device"
          className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
        >
          <option value={SYSTEM_DEFAULT_SINK_ID}>System default</option>
          {outputs.map((output) => (
            <option key={output.id} value={output.id}>
              {output.name}
            </option>
          ))}
        </select>
        <span className="text-muted">
          Where this machine plays. System default follows whatever the computer
          is set to; anything else sends it there and leaves the rest of the
          desktop where it is.
        </span>
      </label>

      {/*
        Only while there is something the names would actually fix. Kept as a
        button rather than run on open: unlocking them costs a microphone
        prompt, and one nobody asked for is its own kind of rude.
      */}
      {namesHidden && (
        <div className="border-line flex flex-col gap-2 rounded-md border p-3">
          <p className="text-muted text-xs">
            The browser hides device names until it has been given audio access
            once. Granting it names the outputs above — nothing is recorded.
          </p>

          <button
            type="button"
            onClick={() => void handleReveal()}
            disabled={revealing}
            className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60"
          >
            {revealing ? "Waiting for permission…" : "Show device names"}
          </button>

          {refused && (
            <p className="text-muted text-xs">
              Access was refused, so the outputs stay numbered. They still work
              — it&rsquo;s a matter of trying them.
            </p>
          )}
        </div>
      )}
    </>
  );
}
