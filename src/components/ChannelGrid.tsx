"use client";

import ChannelPad from "./ChannelPad";
import {
  hasSoloedChannel,
  isChannelAudible,
  type Channel,
} from "@/lib/sequencer";

type ChannelGridProps = {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
};

export default function ChannelGrid({
  channels,
  selectedChannelId,
  onSelectChannel,
  onToggleMute,
  onToggleSolo,
}: ChannelGridProps) {
  const soloActive = hasSoloedChannel(channels);

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
          onSelect={() => onSelectChannel(channel.id)}
          onToggleMute={() => onToggleMute(channel.id)}
          onToggleSolo={() => onToggleSolo(channel.id)}
        />
      ))}
    </div>
  );
}
