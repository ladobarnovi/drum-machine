"use client";

import SampleSlot from "./SampleSlot";
import StepRow from "./StepRow";
import type { Channel } from "@/lib/sequencer";

type ChannelRowProps = {
  channel: Channel;
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

export default function ChannelRow({
  channel,
  currentStep,
  onToggleStep,
  onUpload,
  onRemove,
}: ChannelRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 shrink-0 text-right text-xs text-neutral-400 tabular-nums">
        {channel.label}
      </span>

      <SampleSlot
        channelLabel={channel.label}
        sample={channel.sample}
        onUpload={onUpload}
        onRemove={onRemove}
      />

      <StepRow
        channelLabel={channel.label}
        steps={channel.steps}
        currentStep={currentStep}
        onToggleStep={onToggleStep}
      />
    </div>
  );
}
