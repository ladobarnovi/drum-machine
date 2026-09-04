"use client";

import { useEffect } from "react";

import { shortcutDigitFromCode } from "@/lib/shortcuts";

type UseSceneShortcutsOptions = {
  sceneCount: number;
  onRecallScene: (index: number) => void;
};

/**
 * Alt+1..8 recalls a scene, from either the number row or the numpad.
 *
 * Alt because Ctrl+digit is already the channel selector and Ctrl+Shift+digit
 * its second bank — the two chords a scene would otherwise be reaching for.
 * Bound to the window like the rest, so a scene is reachable while a knob
 * still has focus; Alt+digit types nothing, so there is no text entry to
 * guard against the way Space has to be.
 */
export function useSceneShortcuts({
  sceneCount,
  onRecallScene,
}: UseSceneShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt on its own: adding Ctrl would collide with the channel digits,
      // and Meta combos belong to the OS.
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const digit = shortcutDigitFromCode(event.code);
      if (digit === null) return;

      const index = digit - 1;
      if (index >= sceneCount) return;

      // Alt+digit is a menu accelerator in some browsers, and on Windows it
      // moves focus to the menu bar. Claimed here so it doesn't do both.
      event.preventDefault();
      onRecallScene(index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRecallScene, sceneCount]);
}
