"use client";

import MidiMappingsPanel, {
  type MidiMappingsSettings,
} from "@/components/shell/MidiMappingsPanel";
import MidiSettingsPanel, {
  type MidiSettings,
} from "@/components/shell/MidiSettingsPanel";
import SoundSettingsPanel, {
  type SoundSettings,
} from "@/components/shell/SoundSettingsPanel";
import Modal from "@/components/ui/Modal";
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

  return (
    <Modal
      title="Devices"
      subtitle="What this machine is plugged into"
      closeLabel="Close device settings"
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
      <RailTabs label="Device settings" tabs={tabs} />
    </Modal>
  );
}
