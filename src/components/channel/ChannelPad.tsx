"use client";

import type { KeyboardEvent, MouseEvent } from "react";

import { contextMenuAnchor, isContextMenuKey } from "@/lib/contextMenu";
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
  /** Half-size pad with the mute/solo row dropped, for the phone grid's compact view. */
  isCompact: boolean;
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
  isCompact,
  meterRef,
  onSelect,
  onPreview,
  onToggleMute,
  onToggleSolo,
  onContextMenu,
}: ChannelPadProps) {
  const displayName = channelDisplayName(channel);
  const shortcut = shortcutLabelForIndex(index);
  const hasSample = channel.sample.status === "loaded";

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

  /**
   * The same menu, from the keyboard. On the select button rather than on the
   * pad around it, because the button is the part that takes focus — the
   * wrapper only exists to catch the right click, which needs no focus of its
   * own.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isContextMenuKey(event)) return;

    event.preventDefault();
    const { x, y } = contextMenuAnchor(event.currentTarget);
    onContextMenu(x, y);
  };

  const selection = isSelected ? "border-select bg-select-soft" : "border-edge";

  // An unfilled slot reads as a dashed outline rather than a solid one, so a
  // glance at the strip tells loaded channels from placeholders without
  // having to click through each one to check.
  const emptyOutline = hasSample ? "" : "border-dashed";

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
      className={`flex aspect-square flex-col rounded-md border ring-2 transition ${
        isCompact ? "gap-0.5 p-1" : "gap-1 p-1.5 sm:p-2"
      } ${selection} ${emptyOutline} ${trigger}`}
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-pressed={isSelected}
        aria-label={`Select channel ${displayName}`}
        title={`${shortcut ? `${displayName} (${shortcut})` : displayName}\n${
          hasSample ? "Alt+click to preview" : "No sample loaded"
        }`}
        // A neutral overlay so the hover reads the same on the selected pad's tint.
        className={`hover:bg-pad-hover flex flex-1 cursor-pointer items-center justify-center rounded px-1 font-semibold transition-colors ${
          isCompact ? "text-[9px]" : "text-xs sm:text-sm"
        } ${isSilenced ? "opacity-40" : ""} ${hasSample ? "text-fg" : "text-muted"}`}
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

      {!isCompact && (
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
      )}
    </div>
  );
}
