"use client";

import ChannelPad from "./ChannelPad";
import type { Channel } from "@/lib/sequencer";

type ChannelGridProps = {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
};

export default function ChannelGrid({
  channels,
  selectedChannelId,
  onSelectChannel,
}: ChannelGridProps) {
  return (
    <div
      role="group"
      aria-label="Channels"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {channels.map((channel) => (
        <ChannelPad
          key={channel.id}
          channel={channel}
          isSelected={channel.id === selectedChannelId}
          onSelect={() => onSelectChannel(channel.id)}
        />
      ))}
    </div>
  );
}
