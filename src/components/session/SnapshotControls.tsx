"use client";

import { useEffect, useRef, useState } from "react";

type SnapshotControlsProps = {
  /** False until something has been saved, which is all Recall has to go on. */
  hasSnapshot: boolean;
  onSave: () => void;
  onRecall: () => void;
};

/**
 * How long Save confirms for. Long enough to be read, short enough that the
 * button is back to its own label before it is reached for again.
 */
const SAVED_LABEL_MS = 1200;

/**
 * Save and Recall for the parameter snapshot, in the header beside the
 * transport: the point of a snapshot is to be taken while a mix is being ridden,
 * so both buttons stay on screen wherever the page has been scrolled to.
 *
 * Saving looks like nothing happened — the state it writes is invisible — so the
 * button says so itself for a moment. The first save also switches Recall on,
 * which is what stops it from being pressed with nothing to go back to.
 */
export default function SnapshotControls({
  hasSnapshot,
  onSave,
  onRecall,
}: SnapshotControlsProps) {
  const [justSaved, setJustSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropped on unmount, so a pending confirmation can't set state on a button
  // that has gone.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSave = () => {
    onSave();
    setJustSaved(true);

    // Restarted rather than left to run, so saving twice in quick succession
    // confirms twice instead of the second press going unacknowledged.
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setJustSaved(false), SAVED_LABEL_MS);
  };

  // Both buttons are sized to their widest label, so the header doesn't shift
  // when Save confirms or when Recall comes out of its disabled state.
  const buttonClass =
    "border-edge hover:bg-raised min-w-16 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSave}
        title="Save every channel's parameters, the master FX and the output level. Patterns and samples aren't part of it."
        className={buttonClass}
      >
        {justSaved ? "Saved" : "Save"}
      </button>

      <button
        type="button"
        onClick={onRecall}
        disabled={!hasSnapshot}
        title={
          hasSnapshot
            ? "Put every channel parameter, the master FX and the output level back to the last save."
            : "Save a snapshot first."
        }
        className={buttonClass}
      >
        Recall
      </button>
    </div>
  );
}
