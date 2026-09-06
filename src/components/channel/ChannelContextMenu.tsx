"use client";

import ActionMenu from "@/components/ui/ActionMenu";

type ChannelContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onClearSteps: () => void;
  onCopySteps: () => void;
  /** Disabled while no steps have been copied yet. */
  pasteStepsDisabled: boolean;
  onPasteSteps: () => void;
  /** Disabled while the channel has no sample loaded to copy. */
  copySampleDisabled: boolean;
  onCopySample: () => void;
  /** Disabled while no sample has been copied yet. */
  pasteSampleDisabled: boolean;
  onPasteSample: () => void;
  muted: boolean;
  onToggleMute: () => void;
  soloed: boolean;
  onToggleSolo: () => void;
};

/** The menu a right click on a channel pad raises. */
export default function ChannelContextMenu({
  x,
  y,
  onClose,
  onClearSteps,
  onCopySteps,
  pasteStepsDisabled,
  onPasteSteps,
  copySampleDisabled,
  onCopySample,
  pasteSampleDisabled,
  onPasteSample,
  muted,
  onToggleMute,
  soloed,
  onToggleSolo,
}: ChannelContextMenuProps) {
  return (
    <ActionMenu
      x={x}
      y={y}
      label="Channel actions"
      onClose={onClose}
      width="w-44"
      items={[
        { label: "Clear Steps", onSelect: onClearSteps },
        { label: "Copy Steps", onSelect: onCopySteps },
        {
          label: "Paste Steps",
          disabled: pasteStepsDisabled,
          onSelect: onPasteSteps,
        },
        "divider",
        {
          label: "Copy Sample",
          disabled: copySampleDisabled,
          onSelect: onCopySample,
        },
        {
          label: "Paste Sample",
          disabled: pasteSampleDisabled,
          onSelect: onPasteSample,
        },
        "divider",
        { label: muted ? "Unmute" : "Mute", onSelect: onToggleMute },
        { label: soloed ? "Unsolo" : "Solo", onSelect: onToggleSolo },
      ]}
    />
  );
}
