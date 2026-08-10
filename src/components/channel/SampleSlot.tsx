"use client";

import { anchorFromEvent, type SampleSourceAnchor } from "./SampleSourceMenu";
import type { SampleState } from "@/lib/sequencer";

type SampleSlotProps = {
  channelLabel: string;
  sample: SampleState;
  /** Raises the shared source menu; the editor above owns it. */
  onOpenSourceMenu: (anchor: SampleSourceAnchor) => void;
  /** Whether that menu is up, and was raised from here. */
  menuOpen: boolean;
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
 * because there are two ways to fill it — a file of your own, or one of the
 * bundled samples — and neither is the obvious default. Pressing what the slot
 * says offers both, which also gives the empty state something to do: "No
 * sample" used to be a label stating a fact, and is now a way out of it.
 */
export default function SampleSlot({
  channelLabel,
  sample,
  onOpenSourceMenu,
  menuOpen,
  onRemove,
}: SampleSlotProps) {
  const hasSample = sample.status === "loaded";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        onClick={(event) => onOpenSourceMenu(anchorFromEvent(event, "slot"))}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
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
    </div>
  );
}
