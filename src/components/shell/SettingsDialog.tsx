"use client";

import MidiMappingsPanel, {
  type MidiMappingsSettings,
} from "@/components/shell/MidiMappingsPanel";
import MidiSettingsPanel, {
  type MidiSettings,
} from "@/components/shell/MidiSettingsPanel";
import ShortcutsPanel from "@/components/shell/ShortcutsPanel";
import SoundSettingsPanel, {
  type SoundSettings,
} from "@/components/shell/SoundSettingsPanel";
import ThemeSettingsPanel from "@/components/shell/ThemeSettingsPanel";
import Modal from "@/components/ui/Modal";
import RailTabs, { type RailTab } from "@/components/ui/RailTabs";

/** The id `SettingsButton` targets to open straight on the shortcut list. */
export const SHORTCUTS_TAB_ID = "shortcuts-settings";

type SettingsDialogProps = {
  midi: MidiSettings;
  mappings: MidiMappingsSettings;
  sound: SoundSettings;
  /** Which tab shows first; defaults to MIDI. */
  initialTabId?: string;
  onClose: () => void;
};

/**
 * Everything set once and then left alone: what the machine is plugged into —
 * which controller plays it and whose clock it keeps, and which speakers it
 * comes out of — what it looks like while it does, and what its keys do.
 *
 * A dialog rather than bands in the rail, because all of it is settled when
 * the gear is and then left alone — it took four controls, a grid of swatches
 * and two paragraphs of explanation out of the space reachable while playing,
 * to say something that only matters before the first bar. The shortcut list
 * belongs by the same reasoning even though nothing on it is ever "set" —
 * it's consulted, not configured, but just as rarely and just as unrelated to
 * the next hit.
 *
 * Tabbed rather than stacked for the same reason `RailTabs` exists at all:
 * MIDI, sound, theme and shortcuts are separate errands, and whichever one
 * was opened for shouldn't arrive with the others' controls above it.
 *
 * Left open on a pick, like `SampleLibraryDialog` — choosing an input and then
 * the clock that goes with it is one sitting, not two visits.
 */
export default function SettingsDialog({
  midi,
  mappings,
  sound,
  initialTabId,
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
    /*
     * Last, because it is the only one that isn't about a device: the strip
     * runs from what is plugged in down to what the page happens to look like.
     * Always here, though — unlike MIDI and sound, no browser can be without
     * it, and it is the reason this band shows at all in the ones that are.
     */
    {
      id: "theme-settings",
      label: "Theme",
      panel: <ThemeSettingsPanel />,
    },
    /*
     * Last of all: everything above changes what the machine does or looks
     * like, while this only explains it. Always here, unlike MIDI's — a
     * keyboard is the one piece of gear no browser can lack.
     */
    {
      id: SHORTCUTS_TAB_ID,
      label: "Shortcuts",
      panel: <ShortcutsPanel />,
    },
  ];

  return (
    <Modal
      title="Settings"
      subtitle="What this machine is plugged into, how it looks, and what its keys do"
      closeLabel="Close settings"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="border-edge hover:bg-raised ml-auto shrink-0 cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors"
        >
          Done
        </button>
      }
    >
      <RailTabs label="Settings" tabs={tabs} initialTabId={initialTabId} />
    </Modal>
  );
}
