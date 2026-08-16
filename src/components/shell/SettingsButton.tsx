"use client";

import { useState } from "react";

import type { MidiSettings } from "@/components/shell/MidiSettingsPanel";
import SettingsDialog from "@/components/shell/SettingsDialog";
import type { SoundSettings } from "@/components/shell/SoundSettingsPanel";
import RailGroup from "@/components/ui/RailGroup";
import { SYSTEM_DEFAULT_SINK_ID } from "@/lib/audioOutput";

type SettingsButtonProps = {
  midi: MidiSettings;
  sound: SoundSettings;
};

/**
 * The devices band in the controls rail: what's patched right now, and a way
 * in to change it. The pickers themselves live in `SettingsDialog` — they are
 * set once when the gear is plugged in, so they earn a click rather than a
 * permanent share of the rail.
 *
 * Renders nothing at all in a browser that can neither speak MIDI nor route
 * audio anywhere — Safari and Firefox as things stand — so the rail shows
 * nothing for a control that could never do anything there, the same way
 * `ServiceWorkerRegistrar` stays quiet where there's no service worker to
 * register.
 */
export default function SettingsButton({ midi, sound }: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!midi.supported && !sound.supported) return null;

  const midiInputName = midi.inputs.find(
    (input) => input.id === midi.selectedInputId,
  )?.name;
  const midiOutputName = midi.outputs.find(
    (output) => output.id === midi.selectedOutputId,
  )?.name;
  const soundOutputName =
    sound.selectedOutputId === SYSTEM_DEFAULT_SINK_ID
      ? undefined
      : sound.outputs.find((output) => output.id === sound.selectedOutputId)
          ?.name;

  /**
   * Stands in for the pickers now that they're a click away, so the rail still
   * answers "is anything patched, whose time are we keeping, and where is this
   * coming out?" without opening anything.
   *
   * Anything left at its default says nothing — a line reading "System default"
   * every time would be noise around the one visit where it doesn't.
   */
  const summary: string[] = [];
  if (midiInputName) summary.push(`MIDI in ${midiInputName}`);
  if (midiOutputName) summary.push(`MIDI out ${midiOutputName}`);
  if (midi.clockSource === "external") summary.push("External clock");
  if (soundOutputName) summary.push(`Sound ${soundOutputName}`);

  return (
    <RailGroup title="Devices">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Device settings
      </button>

      <p className="text-muted text-xs">
        {summary.length > 0 ? summary.join(" · ") : "Nothing connected"}
      </p>

      {isOpen && (
        <SettingsDialog
          midi={midi}
          sound={sound}
          onClose={() => setIsOpen(false)}
        />
      )}
    </RailGroup>
  );
}
