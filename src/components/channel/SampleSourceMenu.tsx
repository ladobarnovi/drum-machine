"use client";

import { useRef, useState } from "react";

import SampleLibraryDialog from "./SampleLibraryDialog";
import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";
import type { LibraryEntry } from "@/lib/sampleLibrary";

/**
 * Where the menu was raised, and by which of the two controls that can raise
 * it — the slot under the strip, or the empty strip itself. Which one matters
 * only so that the one pressed is the one reading as expanded.
 */
export type SampleSourceAnchor = {
  x: number;
  y: number;
  from: "slot" | "waveform";
};

/**
 * The point a press on either control is anchored at: under it, or under the
 * pointer within it when there was one. Keyboard activation reports no
 * coordinates at all (`detail` 0), which is what the fallback is for.
 */
export function anchorFromEvent(
  event: React.MouseEvent<HTMLElement>,
  from: SampleSourceAnchor["from"],
): SampleSourceAnchor {
  const { left, bottom } = event.currentTarget.getBoundingClientRect();
  return event.detail === 0
    ? { x: left, y: bottom + 4, from }
    : { x: event.clientX, y: event.clientY + 4, from };
}

type SampleSourceMenuProps = {
  channelLabel: string;
  /** Library id of the sample the channel is playing, if it came from there. */
  currentSampleId?: string;
  /** Set while the menu is up; null closes it. */
  anchor: SampleSourceAnchor | null;
  onClose: () => void;
  onUpload: (file: File) => void;
  onLoadLibrarySample: (entry: LibraryEntry) => void;
};

/**
 * The two ways to fill a slot, and everything they need: the menu offering
 * them, the file dialog one opens, and the library browser the other does.
 *
 * One of these per channel editor rather than one per control, because two
 * things now ask the same question — the slot under the waveform, and the
 * empty strip above it, which is the first place anyone looks when a channel
 * has nothing on it. Both raise this; neither owns it.
 */
export default function SampleSourceMenu({
  channelLabel,
  currentSampleId,
  anchor,
  onClose,
  onUpload,
  onLoadLibrarySample,
}: SampleSourceMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (file) onUpload(file);
  }

  return (
    <>
      {/* Rendered whether or not the menu is up, so the press that opens the
          file dialog has something to click that was already there. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleChange}
        aria-label={`Upload sample for channel ${channelLabel}`}
        className="hidden"
      />

      {anchor && (
        <ContextMenu
          x={anchor.x}
          y={anchor.y}
          label={`Sample source for channel ${channelLabel}`}
          width="w-44"
          onClose={onClose}
        >
          <ContextMenuItem
            onClick={() => {
              onClose();
              setLibraryOpen(true);
            }}
          >
            Load from library…
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
              onClose();
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
          currentSampleId={currentSampleId}
          onSelect={onLoadLibrarySample}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </>
  );
}
