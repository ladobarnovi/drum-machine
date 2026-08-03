"use client";

import { useEffect } from "react";

import {
  channelIndexForShortcut,
  shortcutDigitFromCode,
} from "@/lib/shortcuts";

type UseChannelShortcutsOptions = {
  channelCount: number;
  onSelectChannelIndex: (index: number) => void;
};

/**
 * Ctrl+1..8 selects channels 1-8, Ctrl+Shift+1..8 selects channels 9-16, from
 * either the number row or the numpad.
 *
 * Bound to the window rather than a specific element so the shortcut works
 * while a control still has focus — Ctrl+digit types nothing, so there is
 * nothing to conflict with in the text inputs.
 */
export function useChannelShortcuts({
  channelCount,
  onSelectChannelIndex,
}: UseChannelShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl only: Alt and Meta combos belong to the OS or the browser.
      if (!event.ctrlKey || event.altKey || event.metaKey) return;

      const digit = shortcutDigitFromCode(event.code);
      if (digit === null) return;

      const index = channelIndexForShortcut(digit, event.shiftKey);
      if (index >= channelCount) return;

      event.preventDefault();
      onSelectChannelIndex(index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [channelCount, onSelectChannelIndex]);
}
