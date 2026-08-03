"use client";

import { useEffect } from "react";

import { isTextEntryTarget } from "@/lib/shortcuts";

type UseTransportShortcutsOptions = {
  onTogglePlay: () => void;
};

/** Space starts and stops playback, except while the user is typing. */
export function useTransportShortcuts({
  onTogglePlay,
}: UseTransportShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      // Holding Space would otherwise toggle over and over.
      if (event.repeat) return;
      if (isTextEntryTarget(event.target)) return;

      // Space would otherwise scroll the page, and re-activate whichever
      // step button or pad currently has focus.
      event.preventDefault();
      onTogglePlay();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePlay]);
}
