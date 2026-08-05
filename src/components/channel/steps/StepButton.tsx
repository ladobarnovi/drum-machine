"use client";

import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  clampStepVelocity,
  formatVelocity,
  hasStepLocks,
  type Step,
} from "@/lib/sequencer";

/** How long a press has to be held still before it opens the step for editing. */
const HOLD_MS = 350;

/** How far a press may wander before it counts as a swipe rather than a click. */
const DRAG_SLOP_PX = 6;

/**
 * Vertical travel that covers the whole velocity range. Roughly a thumb's
 * comfortable reach, and well over the button's own height, so the swing is
 * fine enough to land on a particular accent rather than snapping between ends.
 */
const VELOCITY_TRAVEL_PX = 120;

/** How far one press of an arrow key moves the velocity. */
const VELOCITY_KEY_STEP = 1 / 8;

/** A press in progress, from `pointerdown` until the pointer is let go. */
type Gesture = {
  pointerId: number;
  startY: number;
  startVelocity: number;
  /** Set once the press has become a hold or a swipe rather than a click. */
  engaged: boolean;
  holdTimeout: number | null;
};

type StepButtonProps = {
  step: Step;
  isCurrent: boolean;
  isDownbeat: boolean;
  /** Whether this is the step the controls panel is currently editing. */
  isEditing: boolean;
  label: string;
  /** A plain click: toggles the step, or closes whichever step is open. */
  onClick: () => void;
  /** A held press or a swipe: opens this step for editing. */
  onHold: () => void;
  onVelocityChange: (velocity: number) => void;
};

/**
 * One step of the grid.
 *
 * Three gestures share the button. A click toggles it, as it always has; a
 * press held still opens it for editing; and a vertical swipe sets how hard it
 * is hit. The swipe engages on its own rather than waiting the hold out, since
 * reaching for a velocity is already a deliberate move and making it wait would
 * put a third of a second in front of every accent — the hold is what is left
 * for a press that goes nowhere.
 */
export default function StepButton({
  step,
  isCurrent,
  isDownbeat,
  isEditing,
  label,
  onClick,
  onHold,
  onVelocityChange,
}: StepButtonProps) {
  const gestureRef = useRef<Gesture | null>(null);

  /**
   * Set when a press turns into a gesture, so the click the browser fires on
   * release can be dropped — a swipe that happened to end over the button must
   * not also read as the click that closes the editor it just opened.
   */
  const suppressClickRef = useRef(false);

  const engage = useCallback(() => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.engaged) return;

    if (gesture.holdTimeout !== null) {
      window.clearTimeout(gesture.holdTimeout);
      gesture.holdTimeout = null;
    }

    gesture.engaged = true;
    suppressClickRef.current = true;
    onHold();
  }, [onHold]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    // Anything but the primary button is somebody else's gesture.
    if (event.button !== 0) return;

    // Captured so a swipe that wanders off the button keeps reporting to it.
    event.currentTarget.setPointerCapture(event.pointerId);

    // A press that never produced its click — one released away from the
    // button, say — would otherwise leave this set and swallow the next one.
    suppressClickRef.current = false;

    const gesture: Gesture = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVelocity: step.velocity,
      engaged: false,
      holdTimeout: null,
    };
    gestureRef.current = gesture;

    // Shift is the way in without the wait, and the same door the keyboard
    // uses below: a gesture reachable only by holding still for a third of a
    // second is not one every input device can perform.
    if (event.shiftKey) {
      engage();
      return;
    }

    gesture.holdTimeout = window.setTimeout(engage, HOLD_MS);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const travel = gesture.startY - event.clientY;
    if (!gesture.engaged && Math.abs(travel) < DRAG_SLOP_PX) return;
    engage();

    // Measured from where the press started rather than accumulated step by
    // step, so the velocity tracks the finger exactly and swiping back up
    // returns it to where it was rather than to somewhere near it.
    onVelocityChange(gesture.startVelocity + travel / VELOCITY_TRAVEL_PX);
  };

  const endGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.holdTimeout !== null) {
      window.clearTimeout(gesture.holdTimeout);
    }
    gestureRef.current = null;
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onClick();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onVelocityChange(
        step.velocity +
          (event.key === "ArrowUp" ? VELOCITY_KEY_STEP : -VELOCITY_KEY_STEP),
      );
      return;
    }

    // The keyboard's stand-in for a held press. Enter on its own already fires
    // the click that toggles, hence the modifier and the prevented default.
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      onHold();
    }
  };

  const velocity = clampStepVelocity(step.velocity);
  const locked = hasStepLocks(step);

  const surface = isDownbeat
    ? "bg-step-beat hover:bg-step-beat-hover"
    : "bg-step hover:bg-step-hover";

  // The background stays the step's own even when it is on, so the accent fill
  // below reads against it as a level rather than as a plain lit button.
  const border = step.on
    ? "border-accent-soft"
    : isDownbeat
      ? "border-step-beat-edge"
      : "border-step-edge";

  // Both markers are `--select`, the colour for whatever is being looked at, so
  // what tells them apart is the shape: the playhead rings the step from
  // outside, the step being edited is outlined from within.
  const playhead = isCurrent
    ? "ring-select ring-offset-surface ring-2 ring-offset-1"
    : "";
  const editing = isEditing ? "outline-select -outline-offset-2 outline-2" : "";

  return (
    <button
      type="button"
      aria-label={`${label}, ${step.on ? formatVelocity(velocity) : "off"}${
        locked ? ", locked" : ""
      }`}
      aria-pressed={step.on}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // A long press on a touch screen otherwise raises the context menu on top
      // of the editor that same press has just opened.
      onContextMenu={(event) => event.preventDefault()}
      // `touch-none` keeps the browser from claiming a vertical drag for
      // scrolling, which would swallow the swipe before it arrived. Scrolling
      // from inside the grid means starting the drag off a step, which the gaps
      // between them leave room for.
      className={`group relative h-12 flex-1 touch-none overflow-hidden rounded border transition-colors select-none ${surface} ${border} ${playhead} ${editing}`}
    >
      {step.on && (
        <span
          aria-hidden
          className="bg-accent group-hover:bg-accent-soft absolute inset-x-0 bottom-0 transition-colors"
          // Inline, and deliberately not transitioned: the fill has to track a
          // dragging finger exactly rather than chase it.
          style={{ height: `${velocity * 100}%` }}
        />
      )}

      {locked && (
        <span
          aria-hidden
          className="bg-select ring-surface absolute top-1 right-1 size-1.5 rounded-full ring-1"
        />
      )}
    </button>
  );
}
