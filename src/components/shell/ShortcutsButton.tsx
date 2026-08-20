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
      // `?` already carries Shift on every layout that has to press it for the
      // character, so asking for the modifier as well would turn the shortcut
      // off wherever the key is unshifted.
      if (event.key !== "?") return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
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
