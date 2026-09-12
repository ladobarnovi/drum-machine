"use client";

import { memo, type KeyboardEvent, type MouseEvent } from "react";

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
  /*
   * Each takes the channel it acts on rather than closing over it, so the grid
   * can hand the same function to all sixteen pads. Bound per pad, every one of
   * these would be a fresh closure on each render of the grid — which is what
   * `memo` below exists to stop mattering.
   */
  onSelect: (channelId: string) => void;
  /** Plays the channel's sample once, independently of the transport. */
  onPreview: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
  /** A right click anywhere on the pad: raises the channel's action menu. */
  onContextMenu: (channelId: string, x: number, y: number) => void;
};

const TOGGLE_BASE =
  "size-[17px] rounded-sm border font-mono text-[9px] leading-none transition-colors cursor-pointer";
const TOGGLE_OFF = "border-edge text-muted hover:bg-raised";

function ChannelPad({
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
    onSelect(channel.id);
    if (event.altKey) onPreview(channel.id);
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onContextMenu(channel.id, event.clientX, event.clientY);
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
    onContextMenu(channel.id, x, y);
  };

  // The selected pad is marked on its left edge rather than all the way round,
  // so it stays distinct from a pad lit by a hit — which takes the same colour,
  // there being only one accent, and says so with the ring instead.
  const selection = isSelected
    ? "border-select bg-select-soft border-l-[3px]"
    : "border-edge";

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
    // A strip rather than a square: the pad carries what a mixer channel does —
    // which slot it is, what is loaded, whether it is muted or soloed, and how
    // hard it is going — and four of those a row is what leaves room to read
    // any of it.
    <div
      onContextMenu={handleContextMenu}
      className={`flex flex-col justify-between rounded border ring-2 transition ${
        isCompact ? "aspect-square gap-1 p-1" : "h-[4.625rem] gap-2 p-2"
      } ${selection} ${emptyOutline} ${trigger}`}
    >
      <div className="flex min-h-0 flex-1 items-start justify-between gap-2">
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-pressed={isSelected}
          aria-label={`Select channel ${displayName}`}
          title={`${shortcut ? `${displayName} (${shortcut})` : displayName}
${hasSample ? "Alt+click to preview" : "No sample loaded"}`}
          // A neutral overlay so the hover reads the same on the selected pad's tint.
          className={`hover:bg-pad-hover flex min-w-0 flex-1 cursor-pointer flex-col rounded px-1 py-0.5 font-medium transition-colors ${
            isCompact
              ? "h-full items-center justify-center text-[9px]"
              : "items-start gap-0.5 text-left text-xs sm:text-sm"
          } ${isSilenced ? "opacity-40" : ""} ${hasSample ? "text-fg" : "text-muted"}`}
        >
          {/* Which slot this is, in the numbering the shortcuts and the MIDI
              map use. Off the compact pads, where there is no room for a second
              line and the position in the grid says it anyway. */}
          {!isCompact && (
            <span className="text-muted font-mono text-[9px] tracking-[0.06em]">
              {`CH ${String(index + 1).padStart(2, "0")}`}
            </span>
          )}

          <span className="max-w-full min-w-0 truncate">{displayName}</span>
        </button>

        {/* Beside the name rather than under it, so the meter can have the
            pad's full width at the foot. */}
        {!isCompact && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onToggleMute(channel.id)}
              aria-pressed={channel.muted}
              aria-label={`Mute channel ${displayName}`}
              title={`Mute ${displayName}`}
              className={`${TOGGLE_BASE} ${
                channel.muted
                  ? "border-mute bg-mute text-on-accent"
                  : TOGGLE_OFF
              }`}
            >
              M
            </button>

            <button
              type="button"
              onClick={() => onToggleSolo(channel.id)}
              aria-pressed={channel.soloed}
              aria-label={`Solo channel ${displayName}`}
              title={`Solo ${displayName}`}
              className={`${TOGGLE_BASE} ${
                channel.soloed
                  ? "border-solo bg-solo text-on-accent"
                  : TOGGLE_OFF
              }`}
            >
              S
            </button>
          </div>
        )}
      </div>

      {/* At the foot, under everything it is the level of — the order a mixer
          strip reads in: what the channel is, what it is doing, how hard it is
          going.

          Hidden from assistive technology outright, like the master meters: a
          bar that moves sixty times a second cannot be read out usefully, and a
          channel that is or isn't sounding is already said by its mute and solo
          buttons beside it. */}
      <span
        aria-hidden
        className="bg-field border-edge relative block h-1.5 shrink-0 overflow-hidden rounded-full border"
      >
        <span
          ref={meterRef}
          // Owned by the meter loop from here on, and set once here so a pad
          // that has never been heard starts empty rather than full.
          style={{ transform: "scaleX(0)" }}
          className="bg-audio data-[over=true]:bg-danger absolute inset-0 origin-left"
        />
      </span>
    </div>
  );
}

/**
 * Memoised: the grid above re-renders whenever any pad lights up, and there are
 * sixteen of these. With the handlers no longer bound per pad, the only pads
 * that re-render are the ones whose own channel, selection or trigger changed.
 */
export default memo(ChannelPad);
