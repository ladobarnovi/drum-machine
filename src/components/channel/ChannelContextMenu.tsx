"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

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

const dividerClass = "border-line my-0.5 border-t";

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
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <ContextMenu
      x={x}
      y={y}
      label="Channel actions"
      onClose={onClose}
      width="w-44"
    >
      <ContextMenuItem onClick={run(onClearSteps)}>
        Clear Steps
      </ContextMenuItem>

      <ContextMenuItem onClick={run(onCopySteps)}>
        Copy Steps
      </ContextMenuItem>

      <ContextMenuItem
        disabled={pasteStepsDisabled}
        onClick={run(onPasteSteps)}
      >
        Paste Steps
      </ContextMenuItem>

      <div className={dividerClass} aria-hidden />

      <ContextMenuItem
        disabled={copySampleDisabled}
        onClick={run(onCopySample)}
      >
        Copy Sample
      </ContextMenuItem>

      <ContextMenuItem
        disabled={pasteSampleDisabled}
        onClick={run(onPasteSample)}
      >
        Paste Sample
      </ContextMenuItem>

      <div className={dividerClass} aria-hidden />

      <ContextMenuItem onClick={run(onToggleMute)}>
        {muted ? "Unmute" : "Mute"}
      </ContextMenuItem>

      <ContextMenuItem onClick={run(onToggleSolo)}>
        {soloed ? "Unsolo" : "Solo"}
      </ContextMenuItem>
    </ContextMenu>
  );
}
