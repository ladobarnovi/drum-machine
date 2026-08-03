"use client";

import { channelDisplayName, type Channel } from "@/lib/sequencer";
import { shortcutLabelForIndex } from "@/lib/shortcuts";

type ChannelPadProps = {
  channel: Channel;
  /** Position in the grid, used to derive the keyboard shortcut hint. */
  index: number;
  isSelected: boolean;
  onSelect: () => void;
};

export default function ChannelPad({
  channel,
  index,
  isSelected,
  onSelect,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);
  const shortcut = shortcutLabelForIndex(index);

  const selection = isSelected
    ? "border-sky-400 bg-sky-50 dark:bg-sky-950/40"
    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select channel ${displayName}`}
      title={shortcut ? `${displayName} (${shortcut})` : displayName}
      className={`rounded-md border p-2 text-center transition-colors sm:p-3 ${selection}`}
    >
      <span className="block truncate text-xs font-semibold sm:text-sm">
        {displayName}
      </span>
    </button>
  );
}
