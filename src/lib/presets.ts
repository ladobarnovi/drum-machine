export type PresetSlot = {
  /** Channel name applied when the preset loads. */
  channelName: string;
  /** Sample filename inside the preset's directory. */
  file: string;
};

export type Preset = {
  id: string;
  name: string;
  /** Public directory holding this preset's samples. Unused when it has none. */
  directory: string;
  /**
   * One slot per channel, in order, starting at channel 1. Empty for a preset
   * that loads nothing — see `PRESET_EMPTY`.
   */
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

export const PRESET_808: Preset = {
  id: "808",
  name: "808",
  directory: "/presets/808",
  slots: [
    { channelName: "Kick", file: "Kick 808.wav" },
    { channelName: "Snare", file: "Snare 808.wav" },
    { channelName: "Low Tom", file: "Tom 808 Low.wav" },
    { channelName: "Mid Tom", file: "Tom 808 Mid.wav" },
    { channelName: "High Tom", file: "Tom 808 Hi.wav" },
    { channelName: "Rim Shot", file: "Rim 808.wav" },
    { channelName: "Clap", file: "Clap 808.wav" },
    { channelName: "Hihat Closed", file: "Hihat Closed 808.wav" },
    { channelName: "Hihat Open", file: "Hihat Open 808.wav" },
    { channelName: "Maracas", file: "Maracas 808.wav" },
    { channelName: "Shaker", file: "Shaker 808.wav" },
    { channelName: "Cowbell", file: "Cowbell 808.wav" },
    { channelName: "Cymbal", file: "Cymbal 808.wav" },
  ],
};

/**
 * The blank kit: no slots and no directory of its own, because it is defined by
 * what it takes away rather than by what it loads. Picking it empties every
 * channel — samples and patterns both — which is the one thing the other kits
 * can't do, since they only ever write over the channels they reach.
 */
export const PRESET_EMPTY: Preset = {
  id: "empty",
  name: "Empty",
  directory: "",
  slots: [],
};

/**
 * Every kit on offer, in the order the picker lists them. The blank one comes
 * last: it is what you reach for to start over, not something to play.
 */
export const PRESETS: Preset[] = [PRESET_909, PRESET_808, PRESET_EMPTY];

/**
 * The kit the machine loads itself with on startup, so the page opens on
 * something that plays rather than on sixteen empty channels. First in
 * `PRESETS`, which is what the picker opens showing.
 */
export const DEFAULT_PRESET: Preset = PRESET_909;

/**
 * Sample filenames contain spaces, so the segment is encoded for the URL.
 * `preset.directory` is root-relative, so the deployed base path (e.g.
 * "/drum-machine" on GitHub Pages) has to be prepended by hand — Next.js
 * only rewrites `next/link` and `next/image`, not plain fetch URLs.
 */
export function presetSlotUrl(preset: Preset, slot: PresetSlot): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${preset.directory}/${encodeURIComponent(slot.file)}`;
}
