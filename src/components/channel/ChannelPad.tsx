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
  /** Hands the level bar to the loop that drives it; see `useChannelMeters`. */
  meterRef: (element: HTMLElement | null) => void;
  onSelect: () => void;
  /** Plays the channel's sample once, independently of the transport. */
  onPreview: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  /** A right click anywhere on the pad: raises the channel's action menu. */
  onContextMenu: (x: number, y: number) => void;
};

const TOGGLE_BASE =
  "flex-1 rounded border py-0.5 text-[10px] leading-4 font-semibold transition-colors cursor-pointer";
const TOGGLE_OFF = "border-edge text-muted hover:bg-raised";

export default function ChannelPad({
  channel,
  index,
  isSelected,
  isSilenced,
  isTriggered,
  meterRef,
  onSelect,
  onPreview,
  onToggleMute,
  onToggleSolo,
  onContextMenu,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);
  const shortcut = shortcutLabelForIndex(index);

  // Alt+click auditions the channel on top of selecting it, so a sample can be
  // heard without running the transport.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onSelect();
    if (event.altKey) onPreview();
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onContextMenu(event.clientX, event.clientY);
  };

  const selection = isSelected ? "border-select bg-select-soft" : "border-edge";

  // A hit lights the pad instantly and then fades out, so a repeat reads as a
  // fresh pulse rather than one long glow. Carried on the ring, which leaves
  // the border and background to the selected state.
  const trigger = isTriggered
    ? "ring-accent-soft duration-0"
    : "ring-accent-soft/0 duration-300";

  return (
    // aspect-square keeps a pad at least as tall as it is wide; the grid row can
    // still stretch it further if the contents ever need more room.
    <div
      onContextMenu={handleContextMenu}
      className={`flex aspect-square flex-col gap-1 rounded-md border p-1.5 ring-2 transition sm:p-2 ${selection} ${trigger}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-label={`Select channel ${displayName}`}
        title={`${shortcut ? `${displayName} (${shortcut})` : displayName}\nAlt+click to preview`}
        // A neutral overlay so the hover reads the same on the selected pad's tint.
        className={`hover:bg-pad-hover flex flex-1 cursor-pointer items-center justify-center rounded px-1 text-xs font-semibold transition-colors sm:text-sm ${isSilenced ? "opacity-40" : ""}`}
      >
        <span className="min-w-0 truncate">{displayName}</span>
      </button>

      {/* Between the name and the toggles, which is the order a mixer strip
          reads in: what the channel is, how hard it is going, what it is doing.

          Hidden from assistive technology outright, like the master meters: a
          bar that moves sixty times a second cannot be read out usefully, and a
          channel that is or isn't sounding is already said by its mute and solo
          buttons below. */}
      <span
        aria-hidden
        className="bg-field border-edge relative block h-1.5 overflow-hidden rounded-full border"
      >
        <span
          ref={meterRef}
          // Owned by the meter loop from here on, and set once here so a pad
          // that has never been heard starts empty rather than full.
          style={{ transform: "scaleX(0)" }}
          className="bg-accent data-[over=true]:bg-danger absolute inset-0 origin-left"
        />
      </span>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={channel.muted}
          aria-label={`Mute channel ${displayName}`}
          title={`Mute ${displayName}`}
          className={`${TOGGLE_BASE} ${
            channel.muted ? "border-mute bg-mute text-on-accent" : TOGGLE_OFF
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
            channel.soloed ? "border-solo bg-solo text-on-accent" : TOGGLE_OFF
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}
