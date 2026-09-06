"use client";

import ActionMenu from "@/components/ui/ActionMenu";

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
  return (
    <ActionMenu
      x={x}
      y={y}
      label="Step actions"
      onClose={onClose}
      items={[
        { label: "Clear Step", disabled: clearDisabled, onSelect: onClearStep },
        { label: "Edit Step", onSelect: onEditStep },
        { label: "Copy", onSelect: onCopyStep },
        { label: "Paste", disabled: pasteDisabled, onSelect: onPasteStep },
      ]}
    />
  );
}
