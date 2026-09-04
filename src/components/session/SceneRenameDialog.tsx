"use client";

import { useEffect, useRef, useState } from "react";

import Modal from "@/components/ui/Modal";
import { MAX_SCENE_NAME_LENGTH, clampSceneName } from "@/lib/scenes";

type SceneRenameDialogProps = {
  /** What the slot is called now, and what the field opens holding. */
  name: string;
  /** Its numbered fallback, shown as the placeholder once the field is cleared. */
  fallback: string;
  onRename: (name: string) => void;
  onClose: () => void;
};

/**
 * Naming a scene.
 *
 * A dialog rather than an inline field, because the slot it names is a 34px
 * square with a digit in it — there is nowhere on it to type. Clearing the
 * field is how a scene goes back to being called Scene 3, which is why the
 * fallback is the placeholder rather than something the field is refilled
 * with.
 */
export default function SceneRenameDialog({
  name,
  fallback,
  onRename,
  onClose,
}: SceneRenameDialogProps) {
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * Focus is put on the field here rather than left to `autoFocus`, which does
   * not survive the way the dialog opens: `Modal` calls `showModal`, and the
   * browser answers that by focusing the first thing in the panel — which is
   * the close button in its header. React had already honoured `autoFocus` by
   * then, so the field was focused and then quietly focused away from, and the
   * dialog opened with the caret nowhere. Effects in a child run before the
   * parent's, so `showModal` has already happened by the time this does, and
   * this is the last word.
   *
   * Selected rather than only focused, since the field opens holding the name
   * the scene already has: typing should replace it, the way renaming anything
   * else does.
   */
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    onRename(draft);
    onClose();
  };

  return (
    <Modal
      title="Rename scene"
      subtitle="What this slot is called wherever it is shown."
      closeLabel="Close rename scene"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={commit}
          className="bg-invert text-on-invert cursor-pointer rounded px-3 py-1.5 text-sm font-semibold"
        >
          Save
        </button>
      }
    >
      <label className="flex flex-col gap-2 text-xs">
        Name
        <input
          type="text"
          value={draft}
          placeholder={fallback}
          maxLength={MAX_SCENE_NAME_LENGTH}
          ref={inputRef}
          onChange={(event) => setDraft(clampSceneName(event.target.value))}
          // Enter is what a one-field dialog is expected to answer to, and
          // there is no form here to do it on its own.
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          className="border-edge bg-field w-full rounded border px-2 py-1 text-sm font-semibold"
        />
      </label>
    </Modal>
  );
}
