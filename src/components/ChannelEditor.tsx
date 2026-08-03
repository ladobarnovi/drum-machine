"use client";

import ChannelControls from "./ChannelControls";
import ChannelNameInput from "./ChannelNameInput";
import LengthControl from "./LengthControl";
import SampleSlot from "./SampleSlot";
import StepGrid from "./StepGrid";
import Waveform from "./Waveform";
import { channelDisplayName, type Channel } from "@/lib/sequencer";

type ChannelEditorProps = {
  channel: Channel;
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onLengthChange: (length: number) => void;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
  onNameChange: (name: string) => void;
  onLowCutChange: (hz: number) => void;
  onHighCutChange: (hz: number) => void;
};

/** Sample controls, length, and step grid for the currently selected channel. */
export default function ChannelEditor({
  channel,
  currentStep,
  onToggleStep,
  onUpload,
  onRemove,
  onLengthChange,
  onVolumeChange,
  onPitchChange,
  onNameChange,
  onLowCutChange,
  onHighCutChange,
}: ChannelEditorProps) {
  const displayName = channelDisplayName(channel);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-3">
        <ChannelNameInput
          name={channel.name}
          fallback={channel.label}
          onNameChange={onNameChange}
        />

        <SampleSlot
          channelLabel={displayName}
          sample={channel.sample}
          onUpload={onUpload}
          onRemove={onRemove}
        />

        <LengthControl
          length={channel.length}
          onLengthChange={onLengthChange}
        />
      </div>

      <Waveform sample={channel.sample} />

      <ChannelControls
        volume={channel.volume}
        pitch={channel.pitch}
        lowCutHz={channel.lowCutHz}
        highCutHz={channel.highCutHz}
        onVolumeChange={onVolumeChange}
        onPitchChange={onPitchChange}
        onLowCutChange={onLowCutChange}
        onHighCutChange={onHighCutChange}
      />

      <StepGrid
        channelLabel={displayName}
        steps={channel.steps}
        length={channel.length}
        currentStep={currentStep}
        onToggleStep={onToggleStep}
      />
    </div>
  );
}
