/**
 * The keyboard's way of asking for a context menu, and where to put one when
 * it does.
 *
 * Every grid in the machine that answers a right click — the channel pads, the
 * steps, the pattern slots — now answers these two keystrokes as well, which
 * is what puts copy, paste and save within reach of a keyboard at all. Kept
 * here rather than written out three times, so a grid cannot end up honouring
 * one of the pair and not the other.
 */

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
