"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

type StepContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  /** Disabled once the step is already off with default parameters. */
  clearDisabled: boolean;
  onClearStep: () => void;
  onEditStep: () => void;
  onCopyStep: () => void;
  /** Disabled while nothing has been copied yet. */
  pasteDisabled: boolean;
  onPasteStep: () => void;
};

/** The menu a right click (or long press, on touch) raises over a step. */
export default function StepContextMenu({
  x,
  y,
  onClose,
  clearDisabled,
  onClearStep,
  onEditStep,
  onCopyStep,
  pasteDisabled,
  onPasteStep,
}: StepContextMenuProps) {
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} label="Step actions" onClose={onClose}>
      <ContextMenuItem disabled={clearDisabled} onClick={run(onClearStep)}>
        Clear Step
      </ContextMenuItem>

      <ContextMenuItem onClick={run(onEditStep)}>Edit Step</ContextMenuItem>

      <ContextMenuItem onClick={run(onCopyStep)}>Copy</ContextMenuItem>

      <ContextMenuItem disabled={pasteDisabled} onClick={run(onPasteStep)}>
        Paste
      </ContextMenuItem>
    </ContextMenu>
  );
}
