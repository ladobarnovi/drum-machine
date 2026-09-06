"use client";

import ActionMenu from "@/components/ui/ActionMenu";

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
  return (
    <ActionMenu
      x={x}
      y={y}
      label="Scene actions"
      onClose={onClose}
      items={[
        { label: "Save mutes here", onSelect: onSaveScene },
        { label: "Rename", disabled: renameDisabled, onSelect: onRenameScene },
        { label: "Clear", disabled: clearDisabled, onSelect: onClearScene },
      ]}
    />
  );
}
