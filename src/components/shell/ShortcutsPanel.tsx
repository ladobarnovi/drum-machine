"use client";

import { SHORTCUT_GROUPS } from "@/lib/shortcuts";

/**
 * Every keystroke and gesture the machine answers to, from the table in
 * `lib/shortcuts`. The reference half of `SettingsDialog`, alongside the
 * pickers for what the machine is plugged into and how it looks: a list of
 * keys is a preference about the page in the same way — asked for once in a
 * while rather than reached for mid-bar — and it used to hold a permanent
 * band of its own in the controls rail to say so.
 *
 * Grouped by what is being played rather than by which key is pressed, since
 * the question this is opened with is "what can I do to a step" far more often
 * than "what does F10 do".
 *
 * The description leads and the keys follow, which is the order the question
 * arrives in and the order a screen reader should read it: what it does, then
 * how to ask for it.
 */
export default function ShortcutsPanel() {
  return (
    <div className="flex flex-col gap-4">
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-1.5 text-xs font-semibold">{group.title}</h3>

          <ul className="flex flex-col gap-1">
            {group.shortcuts.map((shortcut) => (
              <li
                key={`${group.title}:${shortcut.description}`}
                className="flex items-baseline gap-3 text-xs"
              >
                <span className="text-muted min-w-0 flex-1">
                  {shortcut.description}
                </span>

                <span className="flex shrink-0 items-baseline gap-1">
                  {shortcut.keys.map((key, index) => (
                    <span key={key} className="flex items-baseline gap-1">
                      {/* Between caps rather than inside them, so the
                          separator doesn't read as part of either key. */}
                      {index > 0 && (
                        <span aria-hidden className="text-muted">
                          +
                        </span>
                      )}
                      <kbd className="border-edge bg-field rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
