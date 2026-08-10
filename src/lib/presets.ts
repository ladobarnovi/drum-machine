import {
  CATEGORY_808,
  CATEGORY_909,
  findLibrarySample,
  type LibraryEntry,
} from "./sampleLibrary";

export type Preset = {
  id: string;
  name: string;
  /**
   * Library sample ids, one per channel, in order starting at channel 1. Ids
   * rather than filenames, so a kit and the library browser can never drift
   * apart: both name the same entries in `sampleLibrary.ts`. Empty for a kit
   * that loads nothing — see `PRESET_EMPTY`.
   */
  sampleIds: string[];
};

/**
 * Each of these two is simply its category taken in order, which is why the
 * list isn't written out again here: the categories are already kept in kit
 * order — kick, snare, toms, and down through the cymbals — so a kit that
 * listed them a second time would be a copy waiting to fall out of step. A kit
 * drawing on more than one category, or wanting a different order, would spell
 * its ids out instead.
 */
export const PRESET_909: Preset = {
  id: "909",
  name: "909",
  sampleIds: CATEGORY_909.samples.map((sample) => sample.id),
};

export const PRESET_808: Preset = {
  id: "808",
  name: "808",
  sampleIds: CATEGORY_808.samples.map((sample) => sample.id),
};

/**
 * The blank kit: no samples of its own, because it is defined by what it takes
 * away rather than by what it loads. Picking it empties every channel — samples
 * and patterns both — which is the one thing the other kits can't do, since
 * they only ever write over the channels they reach.
 */
export const PRESET_EMPTY: Preset = {
  id: "empty",
  name: "Empty",
  sampleIds: [],
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
 * What a kit actually loads: its ids resolved against the library, and any the
 * library no longer has dropped rather than left as a hole. Dropping keeps the
 * channels a kit fills contiguous, which is what the picker promises when it
 * says the kit fills channels 1 to n.
 */
export function presetEntries(preset: Preset): LibraryEntry[] {
  return preset.sampleIds
    .map((id) => findLibrarySample(id))
    .filter((entry): entry is LibraryEntry => entry !== null);
}
