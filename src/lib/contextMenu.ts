/**
 * The ways of asking for a context menu that are not a right click, and where
 * to put one when they are used.
 *
 * Every grid in the machine that answers a right click — the channel pads, the
 * steps, the pattern slots — now answers these two keystrokes as well, which
 * is what puts copy, paste and save within reach of a keyboard at all. Kept
 * here rather than written out three times, so a grid cannot end up honouring
 * one of the pair and not the other.
 *
 * A touch screen has neither a right button nor a menu key, which is what
 * `HOLD_MS` below is for.
 */

/**
 * How long a press has to be held still before it stops being a tap.
 *
 * One number for the whole machine rather than one per grid, because it is a
 * feel rather than a setting: a hold that opened a step in a third of a second
 * and a scene slot in half of one would read as the second grid being slow to
 * answer, not as two deliberately different gestures. The step grid holds to
 * open a step for editing and the slots hold to raise their menu — different
 * destinations, the same press to get there.
 */
export const HOLD_MS = 350;

/**
 * True for the two keystrokes that mean "menu, please": the dedicated key
 * where a keyboard has one, and Shift+F10 where it doesn't. Both are what
 * Windows and the major screen readers already send, so this is the shortcut
 * the user has rather than one this app made up.
 */
export function isContextMenuKey(event: {
  key: string;
  shiftKey: boolean;
}): boolean {
  return event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");
}

/**
 * Where a menu raised from the keyboard belongs: the bottom-left corner of the
 * control that raised it, so it hangs off the thing it acts on the way a
 * pointer-raised one hangs off the pointer.
 *
 * A menu opened this way has no coordinates of its own to go on — a keystroke
 * reports none — and dropping it at the last known mouse position would put it
 * across the room from the step being edited.
 */
export function contextMenuAnchor(element: HTMLElement): {
  x: number;
  y: number;
} {
  const { left, bottom } = element.getBoundingClientRect();
  return { x: left, y: bottom };
}
