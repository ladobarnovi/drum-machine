"use client";

import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import {
  DEFAULT_STEP_SLICE,
  MAX_STEP_PROBABILITY,
  MIN_STEP_REPEAT,
  clampStepSlice,
  clampStepVelocity,
  formatPitch,
  formatProbability,
  formatStepRepeat,
  formatStepSlice,
  formatVelocity,
  hasStepLocks,
  stepPitch,
  type Step,
  type SwipeTarget,
} from "@/lib/sequencer";

/** How long a press has to be held still before it opens the step for editing. */
const HOLD_MS = 350;

/** How far a press may wander before it counts as a swipe rather than a click. */
const DRAG_SLOP_PX = 6;

/**
 * How far the pointer travels for one unit of each target.
 *
 * Velocity is a 0..1 range, so its number is the whole sweep: roughly a thumb's
 * comfortable reach, and well over the button's own height, so the swing is fine
 * enough to land on a particular accent rather than snapping between the ends.
 *
 * Pitch is counted in semitones instead, so its number is per step of the scale.
 * Ten pixels apiece puts the full two octaves at a long, deliberate drag while
 * leaving a single semitone easy to stop on — which is what melodic writing
 * spends nearly all its time doing.
 *
 * Position is counted in slices, and takes pitch's number for the same reason:
 * both are a discrete index you have to land exactly on rather than a level you
 * sweep to taste, and at ten pixels a part even the longest chop on offer — 24
 * of them — is one deliberate drag from end to end.
 */
const SWIPE_TRAVEL_PX: Record<SwipeTarget, number> = {
  velocity: 120,
  pitch: 10,
  slice: 10,
};

/** How far one press of an arrow key moves each target. */
const SWIPE_KEY_STEP: Record<SwipeTarget, number> = {
  velocity: 1 / 8,
  pitch: 1,
  slice: 1,
};

/** A press in progress, from `pointerdown` until the pointer is let go. */
type Gesture = {
  pointerId: number;
  startY: number;
  /** Where the swiped parameter stood when the press began. */
  startValue: number;
  /** Set once the press has become a hold or a swipe rather than a click. */
  engaged: boolean;
  holdTimeout: number | null;
};

type StepButtonProps = {
  step: Step;
  /** The channel's own pitch, which a step plays at unless it locks its own. */
  channelPitch: number;
  /**
   * How many slices this step is choosing between, or null while the channel is
   * a one shot — which is the whole of what takes the position off the button.
   */
  sliceCount: number | null;
  /** Which parameter a vertical swipe on this grid is currently writing. */
  swipeTarget: SwipeTarget;
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
  onPitchChange: (semitones: number) => void;
  onSliceChange: (slice: number) => void;
  /** A right click: raises the step's action menu at the pointer. */
  onContextMenu: (x: number, y: number) => void;
};

/**
 * One step of the grid.
 *
 * Three gestures share the button. A click toggles it, as it always has; a
 * press held still opens it for editing; and a vertical swipe writes whichever
 * parameter the grid is currently pointed at. The swipe engages on its own
 * rather than waiting the hold out, since reaching for a value is already a
 * deliberate move and making it wait would put a third of a second in front of
 * every accent — the hold is what is left for a press that goes nowhere.
 */
export default function StepButton({
  step,
  channelPitch,
  sliceCount,
  swipeTarget,
  isCurrent,
  isDownbeat,
  isEditing,
  label,
  onClick,
  onHold,
  onVelocityChange,
  onPitchChange,
  onSliceChange,
  onContextMenu,
}: StepButtonProps) {
  const gestureRef = useRef<Gesture | null>(null);

  /**
   * Set when a press turns into a gesture, so the click the browser fires on
   * release can be dropped — a swipe that happened to end over the button must
   * not also read as the click that closes the editor it just opened.
   */
  const suppressClickRef = useRef(false);

  const pitch = stepPitch(step, channelPitch);

  // Resolved against the count in force rather than taken as stored, the same
  // way the Position slider resolves it: a step written past the current count
  // plays the last slice, and has to read as the one it plays.
  const slice =
    sliceCount === null
      ? DEFAULT_STEP_SLICE
      : clampStepSlice(step.slice, sliceCount);

  // What the swipe is currently holding, and where it goes. Read fresh on every
  // render rather than captured, so flipping the switch mid-session changes what
  // the next gesture writes without anything having to be torn down.
  //
  // Tables rather than a chain of ternaries, matching the two above: every
  // target is one row across all four, so adding one can't be half done.
  const swipeValues: Record<SwipeTarget, number> = {
    velocity: step.velocity,
    pitch,
    slice,
  };
  const swipeHandlers: Record<SwipeTarget, (value: number) => void> = {
    velocity: onVelocityChange,
    pitch: onPitchChange,
    slice: onSliceChange,
  };

  const swipeValue = swipeValues[swipeTarget];
  const onSwipeChange = swipeHandlers[swipeTarget];

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
      startValue: swipeValue,
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
    // step, so the value tracks the finger exactly and swiping back up returns
    // it to where it was rather than to somewhere near it.
    onSwipeChange(gesture.startValue + travel / SWIPE_TRAVEL_PX[swipeTarget]);
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

      const distance = SWIPE_KEY_STEP[swipeTarget];
      onSwipeChange(
        swipeValue + (event.key === "ArrowUp" ? distance : -distance),
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

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    // Always suppressed: on a touch screen this is the long press that would
    // otherwise land on top of the editor that same press just opened via
    // `onHold`, and the mouse button check below already tells a genuine
    // right click apart from that.
    event.preventDefault();
    if (event.button !== 2) return;

    onContextMenu(event.clientX, event.clientY);
  };

  const velocity = clampStepVelocity(step.velocity);
  const locked = hasStepLocks(step);
  // A second kind of override from a lock: not what the step sounds like, but
  // whether and how often it plays at all.
  const hasVariance =
    step.probability < MAX_STEP_PROBABILITY ||
    step.repeatCount > MIN_STEP_REPEAT;

  // Shown only while the grid is writing pitch, and only where there is a pitch
  // to read: in velocity mode the fill already says everything about a step, and
  // a number on all sixteen of them would be noise over the top of it.
  const showPitch = swipeTarget === "pitch" && step.on && pitch !== 0;

  /*
   * Shown on every hit of a sliced channel, whatever the grid is currently
   * writing — unlike the pitch above, and unlike it in both halves of the rule.
   *
   * Not mode-dependent, because a chop is only legible as a sequence: reading
   * which part follows which is the whole of what the grid is for once a sample
   * is in pieces, and hiding it outside one switch position would put that
   * behind a mode nobody would think to look in.
   *
   * And not hidden at the first slice either, where pitch hides at 0. A step
   * with no pitch of its own is playing the channel's, so the number would be
   * saying nothing; there is no such thing as a hit with no position, so a gap
   * in the row would read as a step that isn't sliced rather than as one at the
   * top of the file.
   */
  const showSlice = sliceCount !== null && step.on;

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
        step.locks?.pitch === undefined ? "" : `, ${formatPitch(pitch)}`
      }${locked ? ", locked" : ""}${
        step.probability < MAX_STEP_PROBABILITY
          ? `, ${formatProbability(step.probability)} chance`
          : ""
      }${
        step.repeatCount > MIN_STEP_REPEAT
          ? `, repeats ${formatStepRepeat(step.repeatCount)}`
          : ""
      }${showSlice ? `, position ${formatStepSlice(slice, sliceCount)}` : ""}`}
      aria-pressed={step.on}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      // `touch-none` keeps the browser from claiming a vertical drag for
      // scrolling, which would swallow the swipe before it arrived. Scrolling
      // from inside the grid means starting the drag off a step, which the gaps
      // between them leave room for.
      className={`group relative h-12 flex-1 cursor-pointer touch-none overflow-hidden rounded border transition-colors select-none ${surface} ${border} ${playhead} ${editing}`}
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

      {showPitch && (
        // On its own opaque chip rather than straight onto the button: the fill
        // behind it is a different colour at every height and in every theme,
        // and this is the one way the number is legible over all of them.
        <span
          aria-hidden
          className="bg-surface text-fg absolute inset-x-0 bottom-1 mx-auto w-fit rounded px-1 text-[10px] leading-tight font-semibold tabular-nums"
        >
          {pitch > 0 ? `+${pitch}` : pitch}
        </span>
      )}

      {showSlice && (
        // Dead centre, which is the one part of the button nothing else claims:
        // the two dots have the top corners, the pitch chip has the bottom, and
        // the fill sweeps up through the middle behind it. On its own opaque
        // chip for the same reason the pitch one is — the fill is a different
        // colour at every height and in every theme.
        //
        // Counted from 1, matching the Position slider: the row of numbers and
        // the readout under the sliders are the same figure read two ways, and
        // a grid saying 0 where the panel says "1 / 16" would be two answers.
        <span
          aria-hidden
          className="bg-surface text-fg absolute inset-0 m-auto h-fit w-fit rounded px-1 text-[10px] leading-tight font-semibold tabular-nums"
        >
          {slice + 1}
        </span>
      )}

      {locked && (
        <span
          aria-hidden
          className="bg-select ring-surface absolute top-1 right-1 size-1.5 rounded-full ring-1"
        />
      )}

      {/*
        Opposite corner from the lock dot, and outlined rather than filled: the
        same colour still reads as "this step differs from the default", but the
        shape keeps the two kinds of override — how it sounds, and whether or
        how often it plays at all — apart at a glance.
      */}
      {hasVariance && (
        <span
          aria-hidden
          className="border-select absolute top-1 left-1 size-1.5 rounded-full border bg-transparent"
        />
      )}
    </button>
  );
}
