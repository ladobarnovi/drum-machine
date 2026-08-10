"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SAMPLE_LIBRARY,
  type LibraryEntry,
  type LibrarySample,
} from "@/lib/sampleLibrary";

type SampleLibraryDialogProps = {
  /** The channel a pick lands on, named in the dialog so it can't be mistaken. */
  channelLabel: string;
  /** Library id of the sample the channel is playing, if it came from here. */
  currentSampleId?: string;
  onSelect: (entry: LibraryEntry) => void;
  onClose: () => void;
};

/**
 * The bundled samples, to be browsed and tried out.
 *
 * Picking one loads it and leaves the dialog open, rather than closing the way
 * a file picker would. Choosing a drum is not one decision made in advance but
 * a handful made by ear — three kicks tried before the fourth is the one — and
 * a dialog that shut on every pick would make hearing the next one a matter of
 * reopening it and finding your place again. The channel is auditioned on each
 * pick for the same reason, so the list is played rather than read.
 *
 * Grouped under a heading per machine, since which box a sound came out of is
 * most of what distinguishes it: every category has a kick in it, and "808" or
 * "909" beside the name is the whole of the difference.
 */
export default function SampleLibraryDialog({
  channelLabel,
  currentSampleId,
  onSelect,
  onClose,
}: SampleLibraryDialogProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /**
   * Categories with nothing matching are dropped whole rather than left as an
   * empty heading, so a search reads as a short list instead of as a page of
   * headings with the answer somewhere among them.
   */
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SAMPLE_LIBRARY;

    return SAMPLE_LIBRARY.map((category) => ({
      ...category,
      // Matched against the category's name as well as the sample's, so
      // typing "808" narrows to that machine without touching the list on
      // screen, and "kick" finds every kick across all of them.
      samples: category.name.toLowerCase().includes(needle)
        ? category.samples
        : category.samples.filter((sample) =>
            sample.name.toLowerCase().includes(needle),
          ),
    })).filter((category) => category.samples.length > 0);
  }, [query]);

  const isCurrent = (sample: LibrarySample) => sample.id === currentSampleId;

  return (
    <>
      {/*
        Dimmed, unlike the wash behind a context menu: this covers the page
        rather than pointing at one control on it, and everything underneath is
        out of reach until it is closed.
      */}
      <button
        type="button"
        aria-label="Close sample library"
        onClick={onClose}
        className="bg-backdrop fixed inset-0 z-50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sample library"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="border-line bg-surface pointer-events-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border shadow-lg">
          <div className="border-line flex items-start gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Sample library</h2>
              <p className="text-muted mt-0.5 truncate text-xs">
                Loading into {channelLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close sample library"
              className="text-muted hover:bg-raised hover:text-fg -mt-1 shrink-0 rounded px-2 py-1 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="border-line border-b p-3">
            <input
              type="search"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search samples"
              aria-label="Search samples"
              className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
            />
          </div>

          <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {results.length === 0 ? (
              <p className="text-muted px-1 py-6 text-center text-xs">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {results.map((category) => (
                  <section key={category.id}>
                    {/*
                      Sticky, so the machine a row belongs to stays on screen
                      once the list is longer than the panel and scrolling has
                      carried its heading off the top.
                    */}
                    <div className="bg-surface sticky top-0 z-10 pb-1.5">
                      <h3 className="text-xs font-semibold">{category.name}</h3>
                      <p className="text-muted text-[10px]">
                        {category.description}
                      </p>
                    </div>

                    <ul className="flex flex-col gap-0.5">
                      {category.samples.map((sample) => {
                        const current = isCurrent(sample);
                        return (
                          <li key={sample.id}>
                            <button
                              type="button"
                              onClick={() => onSelect({ category, sample })}
                              // Named for what pressing it does rather than
                              // left to read out as its contents, which under
                              // a heading nobody has to be told twice would
                              // be "Kick" and then, on the one already in the
                              // slot, "Kick Loaded".
                              aria-label={`Load ${sample.name} ${category.name}`}
                              aria-current={current}
                              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                current
                                  ? "bg-accent text-on-accent"
                                  : "hover:bg-raised"
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {sample.name}
                              </span>

                              {/* Only on the one already in the slot: the
                                  fill says which row that is, and this says
                                  what the fill means. */}
                              {current && (
                                <span className="shrink-0 text-[10px] font-medium">
                                  Loaded
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="border-line flex items-center justify-between gap-3 border-t p-3">
            <p className="text-muted text-[10px]">
              Each pick loads and plays straight away.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="border-edge hover:bg-raised shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
