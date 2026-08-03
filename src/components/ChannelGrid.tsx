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
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {channels.map((channel, index) => (
        <ChannelPad
          key={channel.id}
          channel={channel}
          index={index}
          isSelected={channel.id === selectedChannelId}
          onSelect={() => onSelectChannel(channel.id)}
        />
      ))}
    </div>
  );
}
