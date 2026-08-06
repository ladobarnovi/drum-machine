"use client";

import SlotButton from "./SlotButton";
import type { Bank } from "@/lib/patterns";

type PatternGridProps = {
  /** The bank currently being browsed. */
  bank: Bank;
  /** Which slot of this bank is currently loaded, or null if none is. */
  activePatternIndex: number | null;
  onLoad: (index: number) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
};

/** The sixteen pattern slots of the browsed bank. */
export default function PatternGrid({
  bank,
  activePatternIndex,
  onLoad,
  onContextMenu,
}: PatternGridProps) {
  return (
    <div
      role="group"
      aria-label="Patterns"
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {bank.patterns.map((pattern, index) => (
        <SlotButton
          key={index}
          index={index}
          variant="pattern"
          filled={pattern !== null}
          active={activePatternIndex === index}
          label={`Pattern ${index + 1}`}
          // Nothing to load out of an empty slot; right click still opens the
          // menu that can save one there.
          onClick={() => {
            if (pattern) onLoad(index);
          }}
          onContextMenu={(x, y) => onContextMenu(index, x, y)}
        />
      ))}
    </div>
  );
}
