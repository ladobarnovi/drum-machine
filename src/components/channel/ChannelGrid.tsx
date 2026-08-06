"use client";

import ChannelPad from "./ChannelPad";
import { useChannelMeters } from "@/hooks/useChannelMeters";
import {
  hasSoloedChannel,
  isChannelAudible,
  type Channel,
} from "@/lib/sequencer";

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

  return (
    <div
      role="group"
      aria-label="Channels"
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {channels.map((channel, index) => (
        <ChannelPad
          key={channel.id}
          channel={channel}
          index={index}
          isSelected={channel.id === selectedChannelId}
          isSilenced={!isChannelAudible(channel, soloActive)}
          isTriggered={flashedChannelIds.has(channel.id)}
          meterRef={registerMeter(channel.id)}
          onSelect={() => onSelectChannel(channel.id)}
          onPreview={() => onPreviewChannel(channel.id)}
          onToggleMute={() => onToggleMute(channel.id)}
          onToggleSolo={() => onToggleSolo(channel.id)}
          onContextMenu={(x, y) => onChannelContextMenu(channel.id, x, y)}
        />
      ))}
    </div>
  );
}
