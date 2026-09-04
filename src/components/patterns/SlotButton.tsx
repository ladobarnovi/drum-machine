"use client";

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";

import {
  HOLD_MS,
  contextMenuAnchor,
  isContextMenuKey,
} from "@/lib/contextMenu";

/** How far a held press may wander before it counts as a scroll instead. */
const HOLD_SLOP_PX = 6;

type SlotButtonProps = {
  /** What is shown inside the slot itself: a bank letter, "A-1", or a scene number. */
  displayText: string;
  /** Which color token fills the slot once it holds something. */
  variant: "pattern" | "bank" | "scene";
  /**
   * Whether the slot holds something: a saved pattern, a saved scene, or — for
   * a bank — any pattern at all.
   */
  filled: boolean;
  /** The slot currently loaded (a pattern), browsed (a bank), or in force (a scene). */
  active: boolean;
  onClick: () => void;
  /** Right click: raises the slot action menu. Patterns and scenes; banks have none yet. */
  onContextMenu?: (x: number, y: number) => void;
  /** What the slot is called, for its title and its accessible name. */
  label: string;
};

const FILL_CLASS: Record<SlotButtonProps["variant"], string> = {
  pattern: "bg-pattern text-on-accent border-transparent",
  bank: "bg-bank text-on-accent border-transparent",
  scene: "bg-scene text-on-accent border-transparent",
};

/**
 * One slot of a pattern, bank or scene grid — the same size and rhythm as a
 * channel pad, just carrying a color of its own rather than a sample. An empty slot
 * stays neutral, like an unlit toggle; a slot holding something is filled
 * solid, the same way mute and solo are; the slot currently loaded, browsed
 * or in force carries the ring `StepButton` puts on the playing step, laid over
 * the fill rather than replacing it, so both facts stay visible at once.
 */
export default function SlotButton({
  displayText,
  variant,
  filled,
  active,
  onClick,
  onContextMenu,
  label,
}: SlotButtonProps) {
  /** The press being held, from `pointerdown` until it is let go or gives up. */
  const holdRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    timeout: number;
  } | null>(null);
  /** Set once a hold has raised the menu, so the click it ends with is eaten. */
  const suppressClickRef = useRef(false);

  const cancelHold = useCallback(() => {
    const hold = holdRef.current;
    if (!hold) return;
    window.clearTimeout(hold.timeout);
    holdRef.current = null;
  }, []);

  // A slot unmounted mid-press — a bank switched underneath one, say — must
  // not leave a timer that fires into a menu nobody can be shown.
  useEffect(() => cancelHold, [cancelHold]);

  /**
   * A press held still, which is how a touch screen asks for the menu: it has
   * neither the right button nor the menu key the other two ways in need.
   *
   * Only for touch and pen. A mouse is turned away because it already has the
   * direct equivalent one button over, and a slow, deliberate click on a slot
   * is far likelier to be someone loading a pattern than someone asking for
   * its menu — a hold that answered the mouse too would spring a menu on them
   * for taking their time.
   */
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onContextMenu || event.pointerType === "mouse") return;

    // A press that never produced its click would otherwise leave this set and
    // swallow the next one.
    suppressClickRef.current = false;
    cancelHold();

    const { pointerId, clientX: x, clientY: y } = event;
    const timeout = window.setTimeout(() => {
      holdRef.current = null;
      suppressClickRef.current = true;
      onContextMenu(x, y);
    }, HOLD_MS);

    holdRef.current = { pointerId, x, y, timeout };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const hold = holdRef.current;
    if (!hold || hold.pointerId !== event.pointerId) return;

    // Wandered far enough to be the page being scrolled rather than a slot
    // being held, so the finger is given back to the scroller.
    if (
      Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > HOLD_SLOP_PX
    ) {
      cancelHold();
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const hold = holdRef.current;
    if (!hold || hold.pointerId !== event.pointerId) return;
    cancelHold();
  };

  /**
   * The menu from a right click — and the place a touch screen's own long
   * press is turned away.
   *
   * The default is always prevented, because on a phone this fires from the
   * same press `handlePointerDown` is already timing, and letting it through
   * would raise the browser's own menu over the one this slot just opened.
   * `button` is what tells the two apart: a real right click reports 2, while
   * the one a long press synthesises reports 0.
   */
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!onContextMenu) return;
    event.preventDefault();
    if (event.button !== 2) return;

    onContextMenu(event.clientX, event.clientY);
  };

  /** Swallowed when a hold already answered this press with the menu. */
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onClick();
  };

  /**
   * The same menu, from the keyboard. Enter and Space already reach `onClick`
   * on a native button — which saves on an empty pattern slot, same as a left
   * click — so this covers rename, copy and clear instead.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!onContextMenu || !isContextMenuKey(event)) return;

    event.preventDefault();
    const { x, y } = contextMenuAnchor(event.currentTarget);
    onContextMenu(x, y);
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`aspect-square rounded-md border transition-colors ${fill} ${activeRing}`}
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-pressed={active}
        aria-label={`${label}${filled ? "" : ", empty"}`}
        title={label}
        // A held press is the slot's menu, so the browser must not also read it
        // as the start of a text selection or a callout on the digit inside.
        className="hover:bg-pad-hover flex h-full w-full cursor-pointer touch-manipulation items-center justify-center rounded text-xs font-semibold transition-colors select-none"
      >
        {displayText}
      </button>
    </div>
  );
}
