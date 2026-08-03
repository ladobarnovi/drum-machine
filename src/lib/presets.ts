export type PresetSlot = {
  /** Channel name applied when the preset loads. */
  channelName: string;
  /** Sample filename inside the preset's directory. */
  file: string;
};

export type Preset = {
  id: string;
  name: string;
  /** Public directory holding this preset's samples. */
  directory: string;
  /** One slot per channel, in order, starting at channel 1. */
  slots: PresetSlot[];
};

export const PRESET_909: Preset = {
  id: "909",
  name: "909",
  directory: "/presets/909",
  slots: [
    { channelName: "Kick", file: "Kick 909.wav" },
    { channelName: "Snare", file: "Snare 909.wav" },
    { channelName: "Low Tom", file: "Tom 909 Lo.wav" },
    { channelName: "Mid Tom", file: "Tom 909 Mid.wav" },
    { channelName: "High Tom", file: "Tom 909 Hi.wav" },
    { channelName: "Rim Shot", file: "Rimshot 909.wav" },
    { channelName: "Clap", file: "Clap 909.wav" },
    { channelName: "Hihat Closed", file: "Hihat Closed 909.wav" },
    { channelName: "Hihat Open", file: "Hihat Open 909.wav" },
    { channelName: "Crash", file: "Crash 909.wav" },
    { channelName: "Ride", file: "Ride 909.wav" },
  ],
};

export const PRESETS: Preset[] = [PRESET_909];

/** Sample filenames contain spaces, so the segment is encoded for the URL. */
export function presetSlotUrl(preset: Preset, slot: PresetSlot): string {
  return `${preset.directory}/${encodeURIComponent(slot.file)}`;
}
