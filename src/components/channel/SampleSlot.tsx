"use client";

import { useRef, useState } from "react";

import SampleLibraryDialog from "./SampleLibraryDialog";
import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";
import type { LibraryEntry } from "@/lib/sampleLibrary";
import type { SampleState } from "@/lib/sequencer";

type SampleSlotProps = {
  channelLabel: string;
  sample: SampleState;
  onUpload: (file: File) => void;
  onLoadLibrarySample: (entry: LibraryEntry) => void;
  onRemove: () => void;
};

function statusText(sample: SampleState) {
  switch (sample.status) {
    case "loaded":
      return sample.name;
    case "loading":
      return "Loading…";
    case "error":
      return sample.message;
    case "empty":
      return "No sample";
  }
}

/**
 * What the channel is playing, and where a replacement comes from.
 *
 * The slot is one control rather than a Load button beside a line of text,
 * because there are two ways to fill it now — a file of your own, or one of
 * the bundled samples — and neither is the obvious default. Pressing what the
 * slot says offers both, which also gives the empty state something to do: "No
 * sample" used to be a label stating a fact, and is now the way out of it.
 */
export default function SampleSlot({
  channelLabel,
  sample,
  onUpload,
  onLoadLibrarySample,
  onRemove,
}: SampleSlotProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Where the menu was raised, or null while it is closed. */
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const hasSample = sample.status === "loaded";
  const libraryId = sample.status === "loaded" ? sample.libraryId : undefined;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (file) onUpload(file);
  }

  /**
   * Under the slot rather than at the pointer, unlike the right-click menus
   * this shares its shell with: it was raised by pressing a control, so it
   * belongs to that control and hangs off its edge the way a select's list
   * does.
   */
  function openMenu() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const { left, bottom } = trigger.getBoundingClientRect();
    setMenu({ x: left, y: bottom + 4 });
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        aria-label={`Sample for channel ${channelLabel}`}
        className="border-edge bg-field hover:bg-raised focus-visible:outline-accent flex min-w-0 flex-1 items-center gap-2 rounded border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          title={statusText(sample)}
          className={`min-w-0 flex-1 truncate text-left ${
            sample.status === "error"
              ? "text-danger"
              : hasSample
                ? ""
                : "text-muted"
          }`}
        >
          {statusText(sample)}
        </span>

        {/* The one mark that says this is a menu rather than a readout. */}
        <svg
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-muted size-2.5 shrink-0"
        >
          <path d="M1 1.5 L5 5 L9 1.5" />
        </svg>
      </button>

      {/* Kept out of the menu: emptying a slot is not another way of filling
          it, and burying it a press deeper would make undoing a mistake the
          slowest thing here. */}
      {hasSample && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove sample from channel ${channelLabel}`}
          className="text-muted hover:bg-raised hover:text-danger shrink-0 rounded px-1.5 text-sm"
        >
          ×
        </button>
      )}

      {/* Opened from the menu rather than wrapped round it in a label, since
          a menu item cannot be a file input and still read as one of two
          choices sitting side by side. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleChange}
        aria-label={`Upload sample for channel ${channelLabel}`}
        className="hidden"
      />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`Sample source for channel ${channelLabel}`}
          width="w-44"
          onClose={() => setMenu(null)}
        >
          <ContextMenuItem
            onClick={() => {
              setMenu(null);
              setLibraryOpen(true);
            }}
          >
            Load from library…
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
              setMenu(null);
              // Still inside the press that opened the menu as far as the
              // browser is concerned, which is what lets a click open the
              // file dialog at all.
              fileInputRef.current?.click();
            }}
          >
            Upload file…
          </ContextMenuItem>
        </ContextMenu>
      )}

      {libraryOpen && (
        <SampleLibraryDialog
          channelLabel={channelLabel}
          currentSampleId={libraryId}
          onSelect={onLoadLibrarySample}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}
