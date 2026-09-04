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

/**
 * Input types where a keystroke isn't text, so a shortcut may safely claim it.
 * Space in a number or range field does nothing useful natively.
 */
const NON_TEXT_INPUT_TYPES = new Set([
  "range",
  "number",
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "color",
]);

/**
 * True when the event target is somewhere the user is typing, so Space still
 * inserts a space in the channel-name field instead of toggling playback.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  switch (target.tagName) {
    case "TEXTAREA":
    case "SELECT":
      return true;
    case "INPUT":
      return !NON_TEXT_INPUT_TYPES.has((target as HTMLInputElement).type);
    default:
      return false;
  }
}

/** Human-readable shortcut for a channel index, for tooltips. */
export function shortcutLabelForIndex(index: number): string | null {
  if (index < 0 || index >= SHORTCUT_BANK_SIZE * 2) return null;
  const digit = (index % SHORTCUT_BANK_SIZE) + 1;
  return index < SHORTCUT_BANK_SIZE ? `Ctrl+${digit}` : `Ctrl+Shift+${digit}`;
}

/**
 * Every shortcut the machine answers to, written down.
 *
 * They were all real and none of them were listed: the channel digits showed
 * up in a pad's tooltip, and the other dozen — the transport, the filter
 * bypass, the two ways into a step, the whole of what a knob does under the
 * arrow keys — could only be found by trying them. A shortcut nobody can
 * discover is one nobody uses, which is the same as not having built it.
 *
 * A table rather than prose in the dialog, so the list is one thing to keep
 * current when a binding moves. It cannot enforce that — the handlers are
 * spread across the hooks and the widgets that own them — but it does put the
 * whole set in one place to check against.
 */
export type Shortcut = {
  /** The chord, one cap per entry: `["Ctrl", "F"]` prints Ctrl + F. */
  keys: string[];
  description: string;
};

export type ShortcutGroup = {
  title: string;
  shortcuts: Shortcut[];
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Transport",
    shortcuts: [
      { keys: ["Space"], description: "Play or stop, unless you are typing" },
    ],
  },
  {
    title: "Channels",
    shortcuts: [
      { keys: ["Ctrl", "1…8"], description: "Select channels 1 to 8" },
      {
        keys: ["Ctrl", "Shift", "1…8"],
        description: "Select channels 9 to 16",
      },
      {
        keys: ["Alt", "Click"],
        description: "Audition a pad without running the transport",
      },
    ],
  },
  {
    title: "Scenes",
    shortcuts: [
      { keys: ["Alt", "1…8"], description: "Recall a saved scene" },
      {
        keys: ["Right-click"],
        description: "Save the live mutes into a slot, rename it, or clear it",
      },
    ],
  },
  {
    title: "Steps",
    shortcuts: [
      { keys: ["Click"], description: "Switch a step on or off" },
      {
        keys: ["Hold"],
        description: "Open a step for editing — or Shift + click",
      },
      { keys: ["Shift", "Enter"], description: "Open the focused step" },
      {
        keys: ["Drag ↑↓"],
        description: "Set what the Swipe switch is pointed at",
      },
      { keys: ["↑", "↓"], description: "The same, on the focused step" },
    ],
  },
  {
    title: "Master",
    shortcuts: [
      {
        keys: ["Ctrl", "F"],
        description: "Bypass or re-engage the master filter",
      },
    ],
  },
  {
    title: "Knobs, sliders and trim handles",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Move by one step — or ← and →" },
      { keys: ["Page ↑", "Page ↓"], description: "Move by ten" },
      {
        keys: ["Home", "End"],
        description: "Jump to either end of the travel",
      },
      { keys: ["Shift", "Drag"], description: "Fine adjustment" },
    ],
  },
  {
    title: "Menus and dialogs",
    shortcuts: [
      {
        keys: ["Right-click"],
        description:
          "Open a menu — on pads, steps, pattern and scene slots, knobs and sliders",
      },
      { keys: ["Shift", "F10"], description: "The same, from the keyboard" },
      { keys: ["↑", "↓"], description: "Move between menu items" },
      { keys: ["Esc"], description: "Close a menu or dialog" },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ keys: ["?"], description: "Open this list" }],
  },
];
