"use client";

import type { MouseEvent } from "react";

type SlotButtonProps = {
  /** 0-based position in the grid; shown as a 1-based number. */
  index: number;
  /** Which color token fills the slot once it holds something. */
  variant: "pattern" | "bank";
  /** Whether the slot holds a saved pattern (or, for a bank, any pattern at all). */
  filled: boolean;
  /** The slot currently loaded (a pattern) or being browsed (a bank). */
  active: boolean;
  onClick: () => void;
  /** Right click: raises the slot's action menu. Patterns only — banks have none yet. */
  onContextMenu?: (x: number, y: number) => void;
  /** What the slot is called, for its title and its accessible name. */
  label: string;
};

const FILL_CLASS: Record<SlotButtonProps["variant"], string> = {
  pattern: "bg-pattern text-on-accent border-transparent",
  bank: "bg-bank text-on-accent border-transparent",
};

/**
 * One slot of a pattern or bank grid — the same size and rhythm as a channel
 * pad, just carrying a color of its own rather than a sample. An empty slot
 * stays neutral, like an unlit toggle; a slot holding something is filled
 * solid, the same way mute and solo are; the slot currently loaded or
 * browsed carries the ring `StepButton` puts on the playing step, laid over
 * the fill rather than replacing it, so both facts stay visible at once.
 */
export default function SlotButton({
  index,
  variant,
  filled,
  active,
  onClick,
  onContextMenu,
  label,
}: SlotButtonProps) {
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!onContextMenu) return;
    event.preventDefault();
    onContextMenu(event.clientX, event.clientY);
  };

  const fill = filled
    ? FILL_CLASS[variant]
    : "border-edge text-muted hover:bg-raised";
  const activeRing = active
    ? "ring-select ring-offset-surface ring-2 ring-offset-1"
    : "";

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`aspect-square rounded-md border transition-colors ${fill} ${activeRing}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={`${label}${filled ? "" : ", empty"}`}
        title={label}
        className="hover:bg-pad-hover flex h-full w-full cursor-pointer items-center justify-center rounded text-xs font-semibold transition-colors"
      >
        {index + 1}
      </button>
    </div>
  );
}
