"use client";

import { SAMPLE_EDITOR_SECTION_ID } from "@/components/channel/SampleEditorTabsSection";

type StepEditBannerProps = {
  /** Zero-based, shown one-based to match the grid and the knobs below it. */
  stepIndex: number;
  /** Whose step it is, since the grid only ever shows one channel at a time. */
  channelName: string;
  onClose: () => void;
};

/**
 * Says that a step is open, for as long as one is.
 *
 * Holding a step does something larger than the outline on the button admits:
 * it re-points the whole sample editor above — the gain, the two cutoffs, the
 * four envelope stages, the three sends — from the channel onto that one hit,
 * so a knob moved afterwards writes a lock rather than changing the drum. Which
 * of those two a turn of the filter means is the difference between shaping a
 * kit and shaping one beat of it, and until this bar there was nothing on
 * screen that said which mode you were in. The lock only announced itself
 * afterwards, by the label it had already changed colour.
 *
 * Its own row between the header and the scrolling pane, rather than a card
 * inside the pane, because a mode has to be visible from wherever the work is
 * being done: the steps are at the bottom of the column and the controls they
 * now write are at the top, and on a phone those are never on screen together.
 * Outside the scroller it cannot be scrolled away from at either end — which a
 * sticky card inside it would also manage, but only by bleeding out through
 * the pane's own padding to reach the edges.
 *
 * `role="status"` rather than `alert`: entering the mode was deliberate, so it
 * is worth saying once, politely, and not worth interrupting over.
 */
export default function StepEditBanner({
  stepIndex,
  channelName,
  onClose,
}: StepEditBannerProps) {
  /**
   * Scrolls the editor this bar is talking about back into view.
   *
   * Offered rather than done automatically on the hold itself: the step's own
   * knobs — velocity, probability, repeat, timing, position — sit directly
   * under the grid and are the ones reached for most, so jumping the page to
   * the tabs would carry both the grid and those knobs off screen to reach the
   * controls that are wanted less often.
   */
  const handleShowControls = () => {
    // Eased by default, since the jump can be the better part of a screen and
    // landing there without the travel makes it hard to tell you have moved
    // rather than that the page has changed under you. Instant where the
    // reader has asked for less motion, the same rule the FX tiles follow.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.getElementById(SAMPLE_EDITOR_SECTION_ID)?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  };

  const buttonClass =
    "shrink-0 cursor-pointer rounded border px-2.5 py-1 text-xs font-medium transition-colors";

  return (
    // Full-bleed bar outside, content aligned to the same column as the header
    // and the page below it inside — the pairing every band in this shell uses.
    <div role="status" className="border-select bg-surface shrink-0 border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6">
        <span
          aria-hidden
          className="bg-select size-1.5 shrink-0 rounded-full"
        />

        <p className="min-w-0 flex-1 text-xs">
          <span className="text-select font-semibold">
            Editing step {stepIndex + 1}
          </span>{" "}
          <span className="text-muted">
            — the {channelName} controls above now set this step alone.
          </span>
        </p>

        <button
          type="button"
          onClick={handleShowControls}
          className={`border-edge hover:bg-raised ${buttonClass}`}
        >
          Show controls
        </button>

        <button
          type="button"
          onClick={onClose}
          className={`border-select text-select hover:bg-raised ${buttonClass}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
