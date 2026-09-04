"use client";

import { useEffect, useRef, useState } from "react";

import SlotButton from "./SlotButton";
import { patternLabel, type Bank } from "@/lib/patterns";

type PatternGridProps = {
  /** Position of the bank being browsed, for the A-1, A-2… labels. */
  bankIndex: number;
  /** The bank currently being browsed. */
  bank: Bank;
  /** Which slot of this bank is currently loaded, or null if none is. */
  activePatternIndex: number | null;
  onLoad: (index: number) => void;
  /** Saves the live pattern into the given slot — always an empty one here. */
  onSave: (index: number) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
};

/** How long the button's own confirmation shows, matching `SnapshotControls`. */
const SAVED_LABEL_MS = 1200;

/** The sixteen pattern slots of the browsed bank. */
export default function PatternGrid({
  bankIndex,
  bank,
  activePatternIndex,
  onLoad,
  onSave,
  onContextMenu,
}: PatternGridProps) {
  const firstEmptyIndex = bank.patterns.findIndex(
    (pattern) => pattern === null,
  );

  const [justSaved, setJustSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSaveClick = () => {
    if (firstEmptyIndex === -1) return;
    onSave(firstEmptyIndex);
    setJustSaved(true);

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setJustSaved(false), SAVED_LABEL_MS);
  };

  return (
    <div className="flex flex-col gap-3">
      {/*
        The discoverable route to saving a pattern: a left click on an empty
        slot below does the same thing, but a full-looking grid gives no clue
        which slots those are, and this always works from the same spot.
      */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={firstEmptyIndex === -1}
          title={
            firstEmptyIndex === -1
              ? "This bank is full — right-click a slot to overwrite it."
              : `Save the live pattern to ${patternLabel(bankIndex, firstEmptyIndex)}.`
          }
          className="border-edge hover:bg-raised min-w-28 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {justSaved ? "Saved" : "Save pattern"}
        </button>
        {firstEmptyIndex === -1 && (
          <p className="text-muted text-xs">
            This bank is full — right-click a slot to overwrite it.
          </p>
        )}
      </div>

      <div
        role="group"
        aria-label="Patterns"
        className="grid grid-cols-4 gap-2 sm:grid-cols-8"
      >
        {bank.patterns.map((pattern, index) => (
          <SlotButton
            key={index}
            displayText={patternLabel(bankIndex, index)}
            variant="pattern"
            filled={pattern !== null}
            active={activePatternIndex === index}
            label={`Pattern ${patternLabel(bankIndex, index)}`}
            // A filled slot loads; an empty one saves the live pattern there —
            // there's no competing meaning for a click on nothing. Right click
            // still opens the menu, for rename, copy and clear.
            onClick={() => (pattern ? onLoad(index) : onSave(index))}
            onContextMenu={(x, y) => onContextMenu(index, x, y)}
          />
        ))}
      </div>

      <p className="text-muted text-xs">
        Click an empty slot to save there. Right-click (or press and hold) any
        slot to rename, copy or clear it.
      </p>
    </div>
  );
}
