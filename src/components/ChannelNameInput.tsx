"use client";

import { MAX_CHANNEL_NAME_LENGTH, clampChannelName } from "@/lib/sequencer";

type ChannelNameInputProps = {
  name: string;
  /** Shown as the placeholder when the name is cleared. */
  fallback: string;
  onNameChange: (name: string) => void;
};

export default function ChannelNameInput({
  name,
  fallback,
  onNameChange,
}: ChannelNameInputProps) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs">
      Name
      <input
        type="text"
        value={name}
        placeholder={fallback}
        maxLength={MAX_CHANNEL_NAME_LENGTH}
        onChange={(event) => onNameChange(clampChannelName(event.target.value))}
        className="border-edge bg-field w-32 rounded border px-2 py-1 text-sm font-semibold"
      />
    </label>
  );
}
