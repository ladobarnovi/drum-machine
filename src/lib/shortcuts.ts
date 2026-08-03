/** Channels are addressed in two banks of eight. */
export const SHORTCUT_BANK_SIZE = 8;

/**
 * Reads the digit off a keyboard event's `code`, covering both the number row
 * and the numpad.
 *
 * `code` rather than `key` on purpose: Shift rewrites the number row ("1" ->
 * "!") and NumLock rewrites the numpad ("1" -> "End"), while `code` stays
 * `Digit1`/`Numpad1` regardless. It's also layout-independent.
 */
export function shortcutDigitFromCode(code: string): number | null {
  const match = /^(?:Digit|Numpad)([1-8])$/.exec(code);
  return match ? Number(match[1]) : null;
}

/** Ctrl+1..8 hits the first bank; adding Shift hits the second. */
export function channelIndexForShortcut(
  digit: number,
  withShift: boolean,
): number {
  return (withShift ? SHORTCUT_BANK_SIZE : 0) + (digit - 1);
}

/** Human-readable shortcut for a channel index, for tooltips. */
export function shortcutLabelForIndex(index: number): string | null {
  if (index < 0 || index >= SHORTCUT_BANK_SIZE * 2) return null;
  const digit = (index % SHORTCUT_BANK_SIZE) + 1;
  return index < SHORTCUT_BANK_SIZE ? `Ctrl+${digit}` : `Ctrl+Shift+${digit}`;
}
