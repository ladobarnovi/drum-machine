"use client";

import ActionMenu from "@/components/ui/ActionMenu";

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
  return (
    <ActionMenu
      x={x}
      y={y}
      label="Pattern actions"
      onClose={onClose}
      items={[
        { label: "Save Pattern", onSelect: onSavePattern },
        {
          label: "Delete Pattern",
          disabled: deleteDisabled,
          onSelect: onDeletePattern,
        },
      ]}
    />
  );
}
