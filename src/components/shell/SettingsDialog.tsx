"use client";

import { useEffect } from "react";

import MidiMappingsPanel, {
  type MidiMappingsSettings,
} from "@/components/shell/MidiMappingsPanel";
import MidiSettingsPanel, {
  type MidiSettings,
} from "@/components/shell/MidiSettingsPanel";
import SoundSettingsPanel, {
  type SoundSettings,
} from "@/components/shell/SoundSettingsPanel";
import RailTabs, { type RailTab } from "@/components/ui/RailTabs";

type SettingsDialogProps = {
  midi: MidiSettings;
  mappings: MidiMappingsSettings;
  sound: SoundSettings;
  onClose: () => void;
};

/**
 * Everything about what the machine is plugged into: which controller plays
 * it and whose clock it keeps, and which speakers it comes out of.
 *
 * A dialog rather than bands in the rail, because this is patched once when
 * the gear is and then left alone — it took four controls and two paragraphs
 * of explanation out of the space reachable while playing, to say something
 * that only matters before the first bar.
 *
 * Tabbed rather than stacked for the same reason `RailTabs` exists at all:
 * MIDI and sound are separate errands, and whichever one was opened for
 * shouldn't arrive with the other one's controls above it.
 *
 * Left open on a pick, like `SampleLibraryDialog` — choosing an input and then
 * the clock that goes with it is one sitting, not two visits.
 */
export default function SettingsDialog({
  midi,
  mappings,
  sound,
  onClose,
}: SettingsDialogProps) {
  /*
   * Mappings sit next to the input that sends them, and only where there is
   * one: without Web MIDI there is no way a binding could have been made in
   * this browser, so the tab would open on an empty list explaining a gesture
   * that does nothing here.
   */
  const tabs: RailTab[] = [
    {
      id: "midi-settings",
      label: "MIDI",
      panel: <MidiSettingsPanel {...midi} />,
    },
    ...(midi.supported
      ? [
          {
            id: "midi-mappings",
            label: "Mappings",
            panel: <MidiMappingsPanel {...mappings} />,
          },
        ]
      : []),
    {
      id: "sound-settings",
      label: "Sound",
      panel: <SoundSettingsPanel {...sound} />,
    },
  ];

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
        aria-label="Close device settings"
        onClick={onClose}
        className="bg-backdrop fixed inset-0 z-50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Device settings"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="border-line bg-surface pointer-events-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border shadow-lg">
          <div className="border-line flex items-start gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Devices</h2>
              <p className="text-muted mt-0.5 truncate text-xs">
                What this machine is plugged into
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close device settings"
              className="text-muted hover:bg-raised hover:text-fg -mt-1 shrink-0 rounded px-2 py-1 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <RailTabs label="Device settings" tabs={tabs} />
          </div>

          <div className="border-line flex items-center justify-end border-t p-3">
            <button
              type="button"
              onClick={onClose}
              className="border-edge hover:bg-raised shrink-0 cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
