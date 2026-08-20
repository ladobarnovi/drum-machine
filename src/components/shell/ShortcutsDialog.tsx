"use client";

import Modal from "@/components/ui/Modal";
import { SHORTCUT_GROUPS } from "@/lib/shortcuts";

type ShortcutsDialogProps = {
  onClose: () => void;
};

/**
 * Every keystroke and gesture the machine answers to, from the table in
 * `lib/shortcuts`.
 *
 * Grouped by what is being played rather than by which key is pressed, since
 * the question this is opened with is "what can I do to a step" far more often
 * than "what does F10 do".
 *
 * The description leads and the keys follow, which is the order the question
 * arrives in and the order a screen reader should read it: what it does, then
 * how to ask for it.
 */
export default function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  return (
    <Modal
      title="Keyboard shortcuts"
      subtitle="And the gestures that have no key"
      closeLabel="Close keyboard shortcuts"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="border-edge hover:bg-raised ml-auto shrink-0 cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors"
        >
          Done
        </button>
      }
    >
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
    </Modal>
  );
}
