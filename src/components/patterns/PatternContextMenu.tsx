"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

type PatternContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onSavePattern: () => void;
  /** Disabled once the slot is already empty — there is nothing left to drop. */
  deleteDisabled: boolean;
  onDeletePattern: () => void;
};

/** The menu a right click on a pattern slot raises. */
export default function PatternContextMenu({
  x,
  y,
  onClose,
  onSavePattern,
  deleteDisabled,
  onDeletePattern,
}: PatternContextMenuProps) {
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} label="Pattern actions" onClose={onClose}>
      <ContextMenuItem onClick={run(onSavePattern)}>
        Save Pattern
      </ContextMenuItem>

      <ContextMenuItem disabled={deleteDisabled} onClick={run(onDeletePattern)}>
        Delete Pattern
      </ContextMenuItem>
    </ContextMenu>
  );
}
