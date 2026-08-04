"use client";

import { useEffect } from "react";

type UseMasterFilterShortcutsOptions = {
  onToggle: () => void;
};

/**
 * Ctrl+F bypasses or re-engages the master filter.
 *
 * Ctrl+letter types nothing into a text field, so — like the channel-select
 * shortcuts — this is bound to the window and fires regardless of what has
 * focus, with no need to special-case text entry.
 */
export function useMasterFilterShortcuts({
  onToggle,
}: UseMasterFilterShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyF") return;
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }

      // Ctrl+F would otherwise open the browser's find bar.
      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);
}
