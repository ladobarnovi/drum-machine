"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { MidiMappingsSettings } from "@/components/shell/MidiMappingsPanel";
import type { MidiSettings } from "@/components/shell/MidiSettingsPanel";
import SettingsDialog, {
  SHORTCUTS_TAB_ID,
} from "@/components/shell/SettingsDialog";
import type { SoundSettings } from "@/components/shell/SoundSettingsPanel";
import RailGroup from "@/components/ui/RailGroup";
import { SYSTEM_DEFAULT_SINK_ID } from "@/lib/audioOutput";
import { isTextEntryTarget } from "@/lib/shortcuts";
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
 *
 * Also the way in to the shortcut list, which used to be a band of its own
 * lower in the rail. It moved in once the theme did — a permanent share of
 * the space reachable while playing was already hard to justify for a picker
 * touched once, and harder still for a second control next to it that isn't
 * touched at all, only read. The `?` key still opens straight to it, same as
 * before, just landing on a tab now instead of a dialog of its own; the
 * listener stays here rather than up in the machine because this component is
 * mounted at every width — the rail is hidden below `xl`, never unmounted —
 * so the key works on the Main page and the FX page as readily as on Settings.
 */
export default function SettingsButton({
  midi,
  mappings,
  sound,
}: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTabId, setInitialTabId] = useState<string | undefined>();
  const themeId = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Left to the OS, which claims this one on macOS.
      if (event.metaKey) return;

      /*
       * Two ways of asking, because one is not enough to cover a keyboard.
       *
       * The character first, however the layout arrives at it — and
       * deliberately without turning Ctrl or Alt away, which is what broke
       * this to begin with: plenty of layouts put `?` behind AltGr, and
       * Windows reports AltGr as Ctrl and Alt held together. Refusing those
       * modifiers switched the shortcut off for every one of them.
       *
       * Then the physical key, for the other half of the problem: on a layout
       * that puts something else on Shift+Slash, the character above never
       * appears, but the key under the finger is still the one the US-shaped
       * hint on the button is pointing at. `code` is what the channel digits
       * use, and for the same reason — it does not move with the layout.
       */
      const asksForHelp =
        event.key === "?" ||
        (event.code === "Slash" &&
          event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey);

      if (!asksForHelp) return;
      if (isTextEntryTarget(event.target)) return;

      event.preventDefault();
      setInitialTabId(SHORTCUTS_TAB_ID);
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        onClick={() => {
          setInitialTabId(undefined);
          setIsOpen(true);
        }}
        className="border-edge hover:bg-raised flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Settings
        <kbd
          aria-hidden
          className="border-edge bg-field rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium"
        >
          ?
        </kbd>
      </button>

      <p className="text-muted text-xs">{summary.join(" · ")}</p>

      {isOpen && (
        <SettingsDialog
          midi={midi}
          mappings={mappings}
          sound={sound}
          initialTabId={initialTabId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </RailGroup>
  );
}
