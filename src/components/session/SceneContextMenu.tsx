"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

type SceneContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onSaveScene: () => void;
  /** Disabled while the slot is empty — there is no name to change yet. */
  renameDisabled: boolean;
  onRenameScene: () => void;
  /** Disabled once the slot is already empty; nothing left to drop. */
  clearDisabled: boolean;
  onClearScene: () => void;
};

/** The menu a right click on a scene slot raises. */
export default function SceneContextMenu({
  x,
  y,
  onClose,
  onSaveScene,
  renameDisabled,
  onRenameScene,
  clearDisabled,
  onClearScene,
}: SceneContextMenuProps) {
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} label="Scene actions" onClose={onClose}>
      <ContextMenuItem onClick={run(onSaveScene)}>
        Save mutes here
      </ContextMenuItem>

      <ContextMenuItem disabled={renameDisabled} onClick={run(onRenameScene)}>
        Rename
      </ContextMenuItem>

      <ContextMenuItem disabled={clearDisabled} onClick={run(onClearScene)}>
        Clear
      </ContextMenuItem>
    </ContextMenu>
  );
}
