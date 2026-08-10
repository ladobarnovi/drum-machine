import type { Channel } from "./sequencer";

/**
 * The samples that ship with the machine.
 *
 * This is the one place filenames are written down: the kits in `presets.ts`
 * are lists of ids from here rather than lists of files of their own, and the
 * library browser lists the same entries a kit loads. A sample added below
 * therefore turns up in both without being spelled out twice.
 */

export type LibrarySample = {
  /**
   * Stable id, `<category>/<slug>`. Kits are written as lists of these, and a
   * channel remembers the one it loaded, so both point at a sample rather than
   * at a path — which is what lets the browser mark what a channel is already
   * playing without comparing filenames.
   */
  id: string;
  /**
   * What the browser lists it as, and the name a channel takes when it loads
   * it. Not the filename: `Tom 909 Lo.wav` is how the file happens to be
   * stored, "Low Tom" is what the thing is.
   */
  name: string;
  /** Filename inside the category's directory. */
  file: string;
};

export type SampleCategory = {
  id: string;
  name: string;
  /** One line under the heading, to say what the machine sounds like. */
  description: string;
  /** Public directory holding this category's files. */
  directory: string;
  /**
   * In kit order — kick, snare, toms, then everything that is hit with a
   * stick — rather than alphabetical, because that is the order a drummer
   * reaches for them in and because the kits are these lists taken from the
   * top.
   */
  samples: LibrarySample[];
};

/**
 * A sample and the category it came from. Nothing can be loaded from one
 * without the other — the file lives under the category's directory and takes
 * half its name from it — so the two travel together rather than as an id that
 * every caller would have to resolve again.
 */
export type LibraryEntry = {
  category: SampleCategory;
  sample: LibrarySample;
};

/** Ids are derived from names, so the tables below stay names and files. */
function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function defineCategory(
  category: Omit<SampleCategory, "samples">,
  samples: { name: string; file: string }[],
): SampleCategory {
  return {
    ...category,
    samples: samples.map(({ name, file }) => ({
      id: `${category.id}/${slug(name)}`,
      name,
      file,
    })),
  };
}

export const CATEGORY_909 = defineCategory(
  {
    id: "909",
    name: "909",
    description: "Bright and punchy — the house and techno kit.",
    directory: "/presets/909",
  },
  [
    { name: "Kick", file: "Kick 909.wav" },
    { name: "Snare", file: "Snare 909.wav" },
    { name: "Low Tom", file: "Tom 909 Lo.wav" },
    { name: "Mid Tom", file: "Tom 909 Mid.wav" },
    { name: "High Tom", file: "Tom 909 Hi.wav" },
    { name: "Rim Shot", file: "Rimshot 909.wav" },
    { name: "Clap", file: "Clap 909.wav" },
    { name: "Hihat Closed", file: "Hihat Closed 909.wav" },
    { name: "Hihat Open", file: "Hihat Open 909.wav" },
    { name: "Crash", file: "Crash 909.wav" },
    { name: "Ride", file: "Ride 909.wav" },
  ],
);

export const CATEGORY_808 = defineCategory(
  {
    id: "808",
    name: "808",
    description: "Deep and round, with tails that ring on.",
    directory: "/presets/808",
  },
  [
    { name: "Kick", file: "Kick 808.wav" },
    { name: "Snare", file: "Snare 808.wav" },
    { name: "Low Tom", file: "Tom 808 Low.wav" },
    { name: "Mid Tom", file: "Tom 808 Mid.wav" },
    { name: "High Tom", file: "Tom 808 Hi.wav" },
    { name: "Rim Shot", file: "Rim 808.wav" },
    { name: "Clap", file: "Clap 808.wav" },
    { name: "Hihat Closed", file: "Hihat Closed 808.wav" },
    { name: "Hihat Open", file: "Hihat Open 808.wav" },
    { name: "Maracas", file: "Maracas 808.wav" },
    { name: "Shaker", file: "Shaker 808.wav" },
    { name: "Cowbell", file: "Cowbell 808.wav" },
    { name: "Cymbal", file: "Cymbal 808.wav" },
  ],
);

/** Every category on offer, in the order the browser lists them. */
export const SAMPLE_LIBRARY: SampleCategory[] = [CATEGORY_909, CATEGORY_808];

/**
 * Built once at module load rather than searched each time: a kit resolves
 * every one of its slots through here on the way in, and the browser asks for
 * the loaded sample of whichever channel is selected on every render.
 */
const ENTRIES_BY_ID = new Map<string, LibraryEntry>(
  SAMPLE_LIBRARY.flatMap((category) =>
    category.samples.map(
      (sample) => [sample.id, { category, sample }] as const,
    ),
  ),
);

/** The sample an id names, or null when the library no longer has one. */
export function findLibrarySample(id: string): LibraryEntry | null {
  return ENTRIES_BY_ID.get(id) ?? null;
}

/**
 * What a loaded sample is called once it is out of the browser and sitting in a
 * slot, where the category heading that made "Kick" unambiguous is no longer
 * on screen.
 */
export function librarySampleLabel({ category, sample }: LibraryEntry): string {
  return `${sample.name} ${category.name}`;
}

/**
 * Filenames contain spaces, so the segment is encoded for the URL. The
 * directory is root-relative, so the deployed base path (e.g. "/drum-machine"
 * on GitHub Pages) has to be prepended by hand — Next.js only rewrites
 * `next/link` and `next/image`, not plain fetch URLs.
 */
export function librarySampleUrl({ category, sample }: LibraryEntry): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${category.directory}/${encodeURIComponent(sample.file)}`;
}

/**
 * Whether a channel's name came from a sample rather than from someone typing
 * it, and so should follow the next sample loaded into the slot.
 *
 * Three ways it can be the machine's name rather than the user's: the field is
 * empty, it still reads as the channel number it started as, or it is exactly
 * the name of the library sample the channel is playing — which is what a kit
 * and the browser both leave behind. Anything else was typed, and a slot
 * renaming itself out from under that would be the machine overruling a
 * decision someone made on purpose.
 */
export function channelNameFollowsSample(channel: Channel): boolean {
  const name = channel.name.trim();
  if (name === "" || name === channel.label) return true;

  const loadedId =
    channel.sample.status === "loaded" ? channel.sample.libraryId : undefined;
  if (!loadedId) return false;

  return findLibrarySample(loadedId)?.sample.name === name;
}
