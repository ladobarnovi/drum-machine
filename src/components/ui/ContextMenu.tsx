"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ContextMenuProps = {
  /** Where the triggering click landed, in viewport coordinates. */
  x: number;
  y: number;
  /** Read by screen readers; names what the menu belongs to. */
  label: string;
  onClose: () => void;
  /** Widens the panel for menus with longer item labels. */
  width?: string;
  children: ReactNode;
};

/**
 * The floating shell any right-click menu in the app is built from: positioned
 * at the click rather than docked to an edge, so it reads as pointing at the
 * thing it was raised on. Clamped into the viewport after measuring itself,
 * since a trigger near any edge of the page would otherwise raise a menu
 * partly off screen.
 *
 * The backdrop is deliberately invisible rather than the dimmed one a dialog
 * uses — a context menu is a small, local thing, and darkening the whole page
 * behind it would make it read as something bigger than it is.
 */
export default function ContextMenu({
  x,
  y,
  label,
  onClose,
  width = "w-36",
  children,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const { width: menuWidth, height } = menu.getBoundingClientRect();
    const margin = 4;
    setPosition({
      left: Math.max(
        margin,
        Math.min(x, window.innerWidth - menuWidth - margin),
      ),
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

  /**
   * Keyboard users land straight on the menu rather than having to tab back
   * into it from wherever the trigger left focus — and are put back on the
   * trigger when it closes.
   *
   * Restoring matters most for the keystroke that opens this: a menu reached
   * from a step, dismissed with Escape, that left focus on the body would cost
   * a walk back through the grid to reach the step it was just on. The guard
   * is for the trigger that has gone in the meantime — a pattern slot that
   * cleared, say — where forcing focus onto a detached node would drop it to
   * the body anyway.
   */
  useEffect(() => {
    const trigger = document.activeElement;

    menuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();

    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, []);

  /**
   * The arrows walk the items, which is what `role="menu"` promises: Tab moves
   * between controls on a page, but inside a menu it is the arrows that are
   * reached for, and a menu that only answered Tab would be one the keystroke
   * that opened it does not know how to drive.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(
      menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    let next: number;
    if (event.key === "ArrowDown") {
      // Wrapped, so the ends of a short list run into each other rather than
      // stopping dead — the same rule the tab strips follow.
      next = (current + 1 + items.length) % items.length;
    } else if (event.key === "ArrowUp") {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    } else {
      return;
    }

    // Only for the keys handled above: the arrows would otherwise scroll the
    // page out from under the menu.
    event.preventDefault();
    items[next].focus();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
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
        aria-label={label}
        onKeyDown={handleKeyDown}
        className={`border-line bg-surface fixed z-40 flex flex-col gap-0.5 rounded-md border p-1 ${width}`}
        style={{ left: position.left, top: position.top }}
      >
        {children}
      </div>
    </>
  );
}
