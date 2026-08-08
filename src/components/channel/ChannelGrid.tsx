"use client";

import { useState } from "react";

import ChannelPad from "./ChannelPad";
import { useChannelMeters } from "@/hooks/useChannelMeters";
import {
  hasSoloedChannel,
  isChannelAudible,
  type Channel,
} from "@/lib/sequencer";

const VIEW_TOGGLE_BASE =
  "flex items-center justify-center rounded p-1 transition-colors cursor-pointer";
const VIEW_TOGGLE_ACTIVE = "bg-raised text-fg";
const VIEW_TOGGLE_INACTIVE = "text-muted hover:bg-raised hover:text-fg";

type ChannelGridProps = {
  channels: Channel[];
  selectedChannelId: string;
  /** Channels heard within the last instant, lit while they ring. */
  flashedChannelIds: ReadonlySet<string>;
  /** Reads a channel's current output level, for its meter. */
  getChannelLevel: (channelId: string) => number;
  onSelectChannel: (channelId: string) => void;
  onPreviewChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
  onChannelContextMenu: (channelId: string, x: number, y: number) => void;
};

export default function ChannelGrid({
  channels,
  selectedChannelId,
  flashedChannelIds,
  getChannelLevel,
  onSelectChannel,
  onPreviewChannel,
  onToggleMute,
  onToggleSolo,
  onChannelContextMenu,
}: ChannelGridProps) {
  const soloActive = hasSoloedChannel(channels);

  // The loop lives with the pads it drives rather than up in the machine, which
  // has no other use for it and re-renders on every step as it is.
  const registerMeter = useChannelMeters({ getChannelLevel });

  // Compact view is a small-screen convenience: it halves every pad and drops
  // mute/solo so a 16-channel kit stays reachable without scrolling on a
  // phone. The switch itself is hidden from `sm` up, where the grid already
  // lays out eight pads a row at full size and there is nothing to compact.
  const [isCompact, setIsCompact] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-muted text-[10px] font-semibold tracking-wide uppercase">
          Channels
        </h2>

        <div className="flex gap-1 sm:hidden">
          <button
            type="button"
            onClick={() => setIsCompact(false)}
            aria-pressed={!isCompact}
            aria-label="Full view"
            title="Full view"
            className={`${VIEW_TOGGLE_BASE} ${!isCompact ? VIEW_TOGGLE_ACTIVE : VIEW_TOGGLE_INACTIVE}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className="size-3.5"
            >
              <rect x="2" y="2" width="7" height="7" rx="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setIsCompact(true)}
            aria-pressed={isCompact}
            aria-label="Compact view"
            title="Compact view"
            className={`${VIEW_TOGGLE_BASE} ${isCompact ? VIEW_TOGGLE_ACTIVE : VIEW_TOGGLE_INACTIVE}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className="size-3.5"
            >
              <rect x="1" y="3" width="3.4" height="3.4" rx="0.8" />
              <rect x="5.9" y="3" width="3.4" height="3.4" rx="0.8" />
              <rect x="10.8" y="3" width="3.4" height="3.4" rx="0.8" />
              <rect x="15.7" y="3" width="3.4" height="3.4" rx="0.8" />
              <rect x="1" y="11.6" width="3.4" height="3.4" rx="0.8" />
              <rect x="5.9" y="11.6" width="3.4" height="3.4" rx="0.8" />
              <rect x="10.8" y="11.6" width="3.4" height="3.4" rx="0.8" />
              <rect x="15.7" y="11.6" width="3.4" height="3.4" rx="0.8" />
            </svg>
          </button>
        </div>
      </div>

      <div
        role="group"
        aria-label="Channels"
        className={
          isCompact
            ? "grid grid-cols-8 gap-1"
            : "grid grid-cols-4 gap-2 sm:grid-cols-8"
        }
      >
        {channels.map((channel, index) => (
          <ChannelPad
            key={channel.id}
            channel={channel}
            index={index}
            isSelected={channel.id === selectedChannelId}
            isSilenced={!isChannelAudible(channel, soloActive)}
            isTriggered={flashedChannelIds.has(channel.id)}
            isCompact={isCompact}
            meterRef={registerMeter(channel.id)}
            onSelect={() => onSelectChannel(channel.id)}
            onPreview={() => onPreviewChannel(channel.id)}
            onToggleMute={() => onToggleMute(channel.id)}
            onToggleSolo={() => onToggleSolo(channel.id)}
            onContextMenu={(x, y) => onChannelContextMenu(channel.id, x, y)}
          />
        ))}
      </div>
    </div>
  );
}
