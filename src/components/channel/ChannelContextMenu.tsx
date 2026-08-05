"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

type ChannelContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onClearPattern: () => void;
  onCopyPattern: () => void;
  /** Disabled while no pattern has been copied yet. */
  pastePatternDisabled: boolean;
  onPastePattern: () => void;
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
  onClearPattern,
  onCopyPattern,
  pastePatternDisabled,
  onPastePattern,
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
      <ContextMenuItem onClick={run(onClearPattern)}>
        Clear Pattern
      </ContextMenuItem>

      <ContextMenuItem onClick={run(onCopyPattern)}>
        Copy Pattern
      </ContextMenuItem>

      <ContextMenuItem
        disabled={pastePatternDisabled}
        onClick={run(onPastePattern)}
      >
        Paste Pattern
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
