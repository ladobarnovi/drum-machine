"use client";

import { useEffect, useState } from "react";

import ShortcutsDialog from "@/components/shell/ShortcutsDialog";
import RailGroup from "@/components/ui/RailGroup";
import { isTextEntryTarget } from "@/lib/shortcuts";

/**
 * The way into the shortcut list, and the shortcut that opens it.
 *
 * A band of its own in the controls rail rather than a tab inside the device
 * settings, which is where this nearly went: that dialog renders nothing at
 * all in a browser that can neither speak MIDI nor route audio — Safari and
 * Firefox as things stand — and a help list is the last thing that should go
 * missing in the browsers whose users are most likely to be looking for it.
 * It is also a different question. What this machine is plugged into is set
 * once when the gear is; what its keys do is asked whenever one is forgotten.
 *
 * Last in the rail, beneath the theme, on the same reasoning that put the
 * theme there: the rail runs from what is reached for while playing down to
 * what is reached for once. The `?` cap on the button is doing the real work
 * of discovery — it teaches the shortcut at the one moment the reader is
 * already looking for it.
 *
 * The listener lives here rather than up in the machine because this component
 * is mounted at every width — the rail is hidden below `xl`, never unmounted —
 * so the key works on the Main page and the FX page as readily as on Settings.
 */
export default function ShortcutsButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Left to the OS, which claims this one on macOS.
      if (event.metaKey) return;

      /*
       * Two ways of asking, because one is not enough to cover a keyboard.
       *
       * The character first, however the layout arrives at it — and
       * deliberately without turning Ctrl or Alt away, which is what broke
       * this to begin with: plenty of layouts put `?` behind AltGr, and
       * Windows reports AltGr as Ctrl and Alt held together. Refusing those
       * modifiers switched the shortcut off for every one of them.
       *
       * Then the physical key, for the other half of the problem: on a layout
       * that puts something else on Shift+Slash, the character above never
       * appears, but the key under the finger is still the one the US-shaped
       * hint on the button is pointing at. `code` is what the channel digits
       * use, and for the same reason — it does not move with the layout.
       */
      const asksForHelp =
        event.key === "?" ||
        (event.code === "Slash" &&
          event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey);

      if (!asksForHelp) return;
      if (isTextEntryTarget(event.target)) return;

      event.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <RailGroup title="Help">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-edge hover:bg-raised flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Keyboard shortcuts
        <kbd
          aria-hidden
          className="border-edge bg-field rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium"
        >
          ?
        </kbd>
      </button>

      {isOpen && <ShortcutsDialog onClose={() => setIsOpen(false)} />}
    </RailGroup>
  );
}
