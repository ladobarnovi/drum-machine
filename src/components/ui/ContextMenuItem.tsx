"use client";

import type { ReactNode } from "react";

type ContextMenuItemProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/** One action inside a `ContextMenu`. */
export default function ContextMenuItem({
  onClick,
  disabled,
  children,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="hover:bg-raised rounded px-3 py-1.5 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
