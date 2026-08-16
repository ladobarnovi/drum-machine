"use client";

import { useState } from "react";

import MidiSettingsDialog, {
  type MidiSettings,
} from "@/components/shell/MidiSettingsDialog";
import RailGroup from "@/components/ui/RailGroup";

type MidiControlsProps = MidiSettings & {
  supported: boolean;
};

/**
 * The MIDI band in the controls rail: what's patched right now, and a way in
 * to change it. The pickers themselves live in `MidiSettingsDialog` — they are
 * set once when the gear is plugged in, so they earn a click rather than a
 * permanent share of the rail.
 *
 * Renders nothing outside a browser that implements Web MIDI — Safari and
 * Firefox chief among them — so the rail shows nothing for a control that
 * could never do anything there, the same way `ServiceWorkerRegistrar` stays
 * quiet where there's no service worker to register.
 */
export default function MidiControls({
  supported,
  ...settings
}: MidiControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!supported) return null;

  const { inputs, selectedInputId, outputs, selectedOutputId, clockSource } =
    settings;

  const inputName = inputs.find((input) => input.id === selectedInputId)?.name;
  const outputName = outputs.find(
    (output) => output.id === selectedOutputId,
  )?.name;

  /**
   * Stands in for the pickers now that they're a click away: the rail still
   * answers "is anything patched, and is this machine keeping its own time?"
   * without opening anything.
   */
  const summary: string[] = [];
  if (inputName) summary.push(`In ${inputName}`);
  if (outputName) summary.push(`Out ${outputName}`);
  if (clockSource === "external") summary.push("External clock");

  return (
    <RailGroup title="MIDI">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
      >
        MIDI settings
      </button>

      <p className="text-muted truncate text-xs">
        {summary.length > 0 ? summary.join(" · ") : "No devices connected"}
      </p>

      {isOpen && (
        <MidiSettingsDialog {...settings} onClose={() => setIsOpen(false)} />
      )}
    </RailGroup>
  );
}
