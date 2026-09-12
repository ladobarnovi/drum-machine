"use client";

import { useTransientFlag } from "@/hooks/useTransientFlag";

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
  const [justSaved, confirmSaved] = useTransientFlag(SAVED_LABEL_MS);

  const handleSave = () => {
    onSave();
    confirmSaved();
  };

  // Both buttons are sized to their widest label, so the header doesn't shift
  // when Save confirms or when Recall comes out of its disabled state.
  const buttonClass = "btn min-w-20";

  return (
    <div className="flex items-center gap-2">
      {/* What the pair is for, since neither verb says on its own what is being
          saved or recalled. Off the phone, where the header has no room for a
          word that only labels two buttons already sitting together. */}
      <span className="text-muted hidden text-[10px] tracking-[0.11em] uppercase sm:inline">
        Snapshot
      </span>

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
