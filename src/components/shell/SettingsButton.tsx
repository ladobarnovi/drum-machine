"use client";

import { useState, useSyncExternalStore } from "react";

import type { MidiMappingsSettings } from "@/components/shell/MidiMappingsPanel";
import type { MidiSettings } from "@/components/shell/MidiSettingsPanel";
import SettingsDialog from "@/components/shell/SettingsDialog";
import type { SoundSettings } from "@/components/shell/SoundSettingsPanel";
import RailGroup from "@/components/ui/RailGroup";
import { SYSTEM_DEFAULT_SINK_ID } from "@/lib/audioOutput";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
  themeById,
} from "@/lib/themes";

type SettingsButtonProps = {
  midi: MidiSettings;
  mappings: MidiMappingsSettings;
  sound: SoundSettings;
};

/**
 * The settings band in the controls rail: what's patched and what the page is
 * wearing right now, and a way in to change either. The pickers themselves
 * live in `SettingsDialog` — they are set once when the gear is plugged in,
 * so they earn a click rather than a permanent share of the rail.
 *
 * Always shown, unlike when this band held nothing but the device pickers: the
 * theme is in here now, and every browser has one, so the button can no longer
 * open on a dialog with nothing in it worth showing.
 */
export default function SettingsButton({
  midi,
  mappings,
  sound,
}: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const themeId = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

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
   * answers "is anything patched, whose time are we keeping, where is this
   * coming out, and what am I looking at?" without opening anything.
   *
   * Anything left at its default says nothing — a line reading "System default"
   * every time would be noise around the one visit where it doesn't. The theme
   * is the exception: there is no default face, only whichever one is on, and
   * naming it is what keeps this line from being blank on the browsers where
   * none of the rest of it can be answered at all.
   */
  const summary: string[] = [];
  if (midiInputName) summary.push(`MIDI in ${midiInputName}`);
  if (midiOutputName) summary.push(`MIDI out ${midiOutputName}`);
  if (midi.clockSource === "external") summary.push("External clock");
  if (soundOutputName) summary.push(`Sound ${soundOutputName}`);
  // Only where something could have been connected: in a browser that can
  // neither speak MIDI nor route audio, "nothing connected" reads as a fault
  // rather than as the plain fact that there was never anything to connect.
  if (summary.length === 0 && (midi.supported || sound.supported)) {
    summary.push("Nothing connected");
  }
  summary.push(themeById(themeId).name);

  return (
    <RailGroup title="Settings">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Settings
      </button>

      <p className="text-muted text-xs">{summary.join(" · ")}</p>

      {isOpen && (
        <SettingsDialog
          midi={midi}
          mappings={mappings}
          sound={sound}
          onClose={() => setIsOpen(false)}
        />
      )}
    </RailGroup>
  );
}
