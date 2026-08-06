"use client";

import LengthControl from "./LengthControl";
import Accordion from "@/components/ui/Accordion";
import {
  HUMANIZE_VELOCITY_AMOUNT,
  STEP_FILLS,
  STEP_LENGTH_PRESETS,
  SWIPE_TARGETS,
  SWIPE_TARGET_LABELS,
  hasActiveSteps,
  matchesStepFill,
  type Step,
  type StepFill,
  type SwipeTarget,
} from "@/lib/sequencer";

type StepPatternControlsProps = {
  /** Full MAX_STEPS-long pattern; only the first `length` steps are written. */
  steps: Step[];
  length: number;
  /** Which parameter a vertical swipe on the grid above is currently writing. */
  swipeTarget: SwipeTarget;
  onApplyFill: (fill: StepFill) => void;
  /** Steps to slide the pattern by: positive later, negative earlier. */
  onNudge: (offset: number) => void;
  onClear: () => void;
  /** Flips the played steps: hits off, silences on. */
  onInvert: () => void;
  /** Scatters the velocity of every hit, for a less machine-even pattern. */
  onHumanize: () => void;
  onLengthChange: (length: number) => void;
  onSwipeTargetChange: (target: SwipeTarget) => void;
};

/**
 * Writes the grid below without clicking through it, in three labelled groups:
 * the length decides how much grid there is, the suggestions put a rhythm on
 * it, and the actions move or wipe whatever is already there.
 *
 * The step count sits in this section rather than up with the sample, because
 * it is the one control every button here answers to: it decides how far a
 * fill is written and how far a nudge wraps. It heads the section for the same
 * reason — it is the thing the rest of the controls are measured against.
 *
 * A fill button stays lit while the pattern is still exactly what it wrote, so
 * the row doubles as a readout of what is programmed — and nudging a fill off
 * the beat drops the light, which is the honest answer once the rhythm has
 * been moved. Clear is what makes a fill reversible: without it, undoing a
 * busy one would mean switching off every step by hand. It sits with the
 * nudges rather than with the fills, as the other thing you do to a pattern
 * once one is written.
 *
 * The swipe target is the odd group out and comes last because of it: the three
 * above write the pattern, where that one only decides what a gesture on the
 * grid means. It lives here anyway rather than anywhere else, because it is
 * still a thing you set about the grid directly above it.
 */
export default function StepPatternControls({
  steps,
  length,
  swipeTarget,
  onApplyFill,
  onNudge,
  onClear,
  onInvert,
  onHumanize,
  onLengthChange,
  onSwipeTargetChange,
}: StepPatternControlsProps) {
  // An empty pattern is deliberately never a match: on a channel too short to
  // reach a fill's first hit, writing it changes nothing, and lighting the
  // button up would claim a rhythm that isn't there. Nothing to nudge or
  // clear either, so the same test disables both. Invert is the exception:
  // flipping an empty pattern fills it, so it stays live.
  const hasHits = hasActiveSteps(steps, length);

  // Read off the constant rather than written into the label, so the two can't
  // drift if the scatter is ever widened or narrowed.
  const humanizePercent = Math.round(HUMANIZE_VELOCITY_AMOUNT * 100);

  const actionClass =
    "border-edge hover:bg-raised rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  // Shared by the lengths and the fills: both are buttons that stay lit while
  // the pattern is still what they set, so they read as one kind of control.
  const toggleClass = (isActive: boolean) =>
    `rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
      isActive
        ? "border-accent bg-accent text-on-accent"
        : "border-edge hover:bg-raised"
    }`;

  // Each group is a heading over its row, so the gap inside a group has to stay
  // tighter than the gap between them — otherwise a heading floats midway and
  // stops reading as the label for the row beneath it.
  const groupClass = "flex flex-col gap-2";
  const headingClass = "text-xs font-semibold";

  return (
    <Accordion title="Sequencer Options" defaultOpen={false}>
      <div className={groupClass}>
        <h2 className={headingClass}>Length</h2>

        {/*
          Field and presets side by side, since they set the same number two
          ways: type any count, or take one of the usual ones. Field first,
          because the presets read as shortcuts past it. The presets are sized
          to the widest of them so the row is even, and labelled in full for
          screen readers, where a bare "32" would say nothing.
        */}
        <div className="flex flex-wrap items-center gap-3">
          <LengthControl length={length} onLengthChange={onLengthChange} />

          <div className="flex flex-wrap gap-2">
            {STEP_LENGTH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onLengthChange(preset)}
                aria-pressed={length === preset}
                aria-label={`${preset} steps`}
                className={`w-10 ${toggleClass(length === preset)}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={groupClass}>
        <h2 className={headingClass}>Fills</h2>

        <div className="flex flex-wrap gap-2">
          {STEP_FILLS.map((fill) => {
            const isActive = hasHits && matchesStepFill(steps, length, fill);

            return (
              <button
                key={fill.id}
                type="button"
                onClick={() => onApplyFill(fill)}
                aria-pressed={isActive}
                className={toggleClass(isActive)}
              >
                {fill.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={groupClass}>
        <h2 className={headingClass}>Actions</h2>

        {/* Earlier before later, so the pair reads left to right the way the
            pattern moves. The signs alone are ambiguous read aloud, hence the
            spelt-out labels. Clear last, as the one that throws work away. */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNudge(-1)}
            disabled={!hasHits}
            aria-label="Nudge pattern one step earlier"
            className={actionClass}
          >
            Nudge −
          </button>

          <button
            type="button"
            onClick={() => onNudge(1)}
            disabled={!hasHits}
            aria-label="Nudge pattern one step later"
            className={actionClass}
          >
            Nudge +
          </button>

          {/* The one action with something to do on an empty pattern — it
              fills every step — so it stays enabled where the others grey out. */}
          <button
            type="button"
            onClick={onInvert}
            aria-label="Invert pattern: switch every step to its opposite"
            className={actionClass}
          >
            Invert
          </button>

          {/* Spelt out, because the button names an effect rather than an
              edit: what it actually does to the pattern is only visible in the
              step shading afterwards. */}
          <button
            type="button"
            onClick={onHumanize}
            disabled={!hasHits}
            aria-label={`Humanize pattern: vary the velocity of every hit by up to ${humanizePercent}%`}
            className={actionClass}
          >
            Humanize
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={!hasHits}
            className={actionClass}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={groupClass}>
        <h2 className={headingClass}>Swipe</h2>

        {/* Spelt out under the heading, because a swipe is the one thing on
            this page that cannot be discovered by looking at it — there is
            nothing on a step button that says it can be dragged. */}
        <p className="text-muted text-xs">
          Hold a step to open it, and drag up or down to set its{" "}
          {SWIPE_TARGET_LABELS[swipeTarget].toLowerCase()}.
        </p>

        <div className="flex flex-wrap gap-2">
          {SWIPE_TARGETS.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onSwipeTargetChange(target)}
              aria-pressed={swipeTarget === target}
              className={toggleClass(swipeTarget === target)}
            >
              {SWIPE_TARGET_LABELS[target]}
            </button>
          ))}
        </div>
      </div>
    </Accordion>
  );
}
