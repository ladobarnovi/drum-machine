"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type StepContextMenuProps = {
  /** Where the triggering click landed, in viewport coordinates. */
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

/**
 * The menu a right click (or long press, on touch) raises over a step.
 *
 * Positioned at the click itself rather than docked to an edge, the way the
 * app's other overlay — the sidebar drawer — is: a context menu reads as
 * pointing at the thing it was raised on, and losing that would leave every
 * action here unlabelled as to which step it means. Clamped into the
 * viewport after measuring itself, since a step near any edge of the grid
 * would otherwise raise a menu partly off screen.
 */
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const { width, height } = menu.getBoundingClientRect();
    const margin = 4;
    setPosition({
      left: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    });
  }, [x, y]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Keyboard users land straight on the menu rather than having to tab back
  // into it from wherever the trigger left focus.
  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
  }, []);

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  const itemClass =
    "hover:bg-raised rounded px-3 py-1.5 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

  return (
    <>
      {/* Invisible: a context menu reads as pointing at the step, and dimming
          the grid behind it the way the drawer's backdrop does would make it
          look like something bigger had opened. */}
      <button
        type="button"
        aria-label="Close step menu"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="fixed inset-0 z-30"
      />

      <div
        ref={menuRef}
        role="menu"
        aria-label="Step actions"
        className="border-line bg-surface fixed z-40 flex w-36 flex-col gap-0.5 rounded-md border p-1"
        style={{ left: position.left, top: position.top }}
      >
        <button
          type="button"
          role="menuitem"
          disabled={clearDisabled}
          onClick={run(onClearStep)}
          className={itemClass}
        >
          Clear Step
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={run(onEditStep)}
          className={itemClass}
        >
          Edit Step
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={run(onCopyStep)}
          className={itemClass}
        >
          Copy
        </button>

        <button
          type="button"
          role="menuitem"
          disabled={pasteDisabled}
          onClick={run(onPasteStep)}
          className={itemClass}
        >
          Paste
        </button>
      </div>
    </>
  );
}
