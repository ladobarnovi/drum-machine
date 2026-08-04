"use client";

import type { MouseEvent } from "react";

import { channelDisplayName, type Channel } from "@/lib/sequencer";
import { shortcutLabelForIndex } from "@/lib/shortcuts";

type ChannelPadProps = {
  channel: Channel;
  /** Position in the grid, used to derive the keyboard shortcut hint. */
  index: number;
  isSelected: boolean;
  /** True when nothing from this channel is heard, by its own mute or another channel's solo. */
  isSilenced: boolean;
  /** True for a moment after one of this channel's hits is heard. */
  isTriggered: boolean;
  onSelect: () => void;
  /** Plays the channel's sample once, independently of the transport. */
  onPreview: () => void;
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
  isTriggered,
  onSelect,
  onPreview,
  onToggleMute,
  onToggleSolo,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);
  const shortcut = shortcutLabelForIndex(index);

  // Alt+click auditions the channel on top of selecting it, so a sample can be
  // heard without running the transport.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onSelect();
    if (event.altKey) onPreview();
  };

  const selection = isSelected
    ? "border-sky-400 bg-sky-50 dark:bg-sky-950/40"
    : "border-neutral-300 dark:border-neutral-700";

  // A hit lights the pad instantly and then fades out, so a repeat reads as a
  // fresh pulse rather than one long glow. Carried on the ring, which leaves
  // the border and background to the selected state.
  const trigger = isTriggered
    ? "ring-orange-400 duration-0"
    : "ring-orange-400/0 duration-300";

  return (
    // aspect-square keeps a pad at least as tall as it is wide; the grid row can
    // still stretch it further if the contents ever need more room.
    <div
      className={`flex aspect-square flex-col gap-1 rounded-md border p-1.5 ring-2 transition sm:p-2 ${selection} ${trigger}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-label={`Select channel ${displayName}`}
        title={`${shortcut ? `${displayName} (${shortcut})` : displayName}\nAlt+click to preview`}
        // A neutral overlay so the hover reads the same on the selected pad's tint.
        className={`flex flex-1 items-center justify-center rounded px-1 text-xs font-semibold transition-colors hover:bg-black/5 sm:text-sm dark:hover:bg-white/10 ${isSilenced ? "opacity-40" : ""}`}
      >
        <span className="min-w-0 truncate">{displayName}</span>
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
