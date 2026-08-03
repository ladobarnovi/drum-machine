"use client";

import { channelDisplayName, type Channel } from "@/lib/sequencer";

type ChannelPadProps = {
  channel: Channel;
  isSelected: boolean;
  onSelect: () => void;
};

export default function ChannelPad({
  channel,
  isSelected,
  onSelect,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);

  const selection = isSelected
    ? "border-sky-400 bg-sky-50 dark:bg-sky-950/40"
    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select channel ${displayName}`}
      title={displayName}
      className={`rounded-md border p-3 text-left transition-colors ${selection}`}
    >
      <span className="block truncate text-sm font-semibold">
        {displayName}
      </span>
    </button>
  );
}
