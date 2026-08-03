"use client";

import { channelDisplayName, type Channel } from "@/lib/sequencer";
import { shortcutLabelForIndex } from "@/lib/shortcuts";

type ChannelPadProps = {
  channel: Channel;
  /** Position in the grid, used to derive the keyboard shortcut hint. */
  index: number;
  isSelected: boolean;
  /** True when nothing from this channel is heard, by its own mute or another channel's solo. */
  isSilenced: boolean;
  onSelect: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
};

const TOGGLE_BASE =
  "flex-1 rounded border py-0.5 text-[10px] leading-4 font-semibold transition-colors";
const TOGGLE_OFF =
  "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800";

export default function ChannelPad({
  channel,
  index,
  isSelected,
  isSilenced,
  onSelect,
  onToggleMute,
  onToggleSolo,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);
  const shortcut = shortcutLabelForIndex(index);

  const selection = isSelected
    ? "border-sky-400 bg-sky-50 dark:bg-sky-950/40"
    : "border-neutral-300 dark:border-neutral-700";

  return (
    <div
      className={`flex flex-col gap-1 rounded-md border p-1.5 transition-colors sm:p-2 ${selection}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Select channel ${displayName}`}
        title={shortcut ? `${displayName} (${shortcut})` : displayName}
        // A neutral overlay so the hover reads the same on the selected pad's tint.
        className={`block w-full truncate rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:bg-black/5 sm:text-sm dark:hover:bg-white/10 ${isSilenced ? "opacity-40" : ""}`}
      >
        {displayName}
      </button>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={channel.muted}
          aria-label={`Mute channel ${displayName}`}
          title={`Mute ${displayName}`}
          className={`${TOGGLE_BASE} ${
            channel.muted
              ? "border-amber-500 bg-amber-500 text-white"
              : TOGGLE_OFF
          }`}
        >
          M
        </button>

        <button
          type="button"
          onClick={onToggleSolo}
          aria-pressed={channel.soloed}
          aria-label={`Solo channel ${displayName}`}
          title={`Solo ${displayName}`}
          className={`${TOGGLE_BASE} ${
            channel.soloed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : TOGGLE_OFF
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}
