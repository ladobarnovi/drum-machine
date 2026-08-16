"use client";

import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { useMidiLearnControl } from "@/hooks/useMidiLearnControl";

type RotaryKnobProps = {
  label: string;
  /** Spelt out for screen readers where the visible label is a shorthand. */
  ariaLabel?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "1.2 kHz" or "40%". */
  readout: string;
  onChange: (value: number) => void;
  /**
   * Whether this control is overridden on the step being edited. Only ever set
   * while a step is open, exactly as on `ControlSlider`.
   */
  locked?: boolean;
  /**
   * Drops that override. Passing it reserves the button's row under the
   * readout, so a row of knobs keeps its height whether or not any of them
   * happen to be locked — pass it to all of them or to none.
   */
  onClearLock?: () => void;
  /**
   * Shown rather than hidden, so a row of knobs keeps its count and its
   * layout even where one of them has nothing to turn — a channel with no
   * slices to position a hit within, say. Takes both drag and keyboard out of
   * the loop rather than trusting the caller's `value`/`onChange` to already
   * be inert, since a knob otherwise stays draggable however meaningless the
   * number it would land on.
   */
  disabled?: boolean;
  /**
   * This knob's identity in the MIDI CC map (see `lib/midiCcMap`). Left
   * undefined, the knob has no MIDI behaviour at all — right-click does
   * nothing special, and it renders exactly as it always has.
   */
  midiMapId?: string;
};

/**
 * Where the travel starts and how far it goes, in degrees. SVG measures angles
 * from the positive x axis with y pointing down, so 135° is the 7:30 position
 * and 270° of it clockwise lands at 4:30 — the gap at the bottom that tells you
 * at a glance which end of a knob's travel is which.
 */
const START_ANGLE = 135;
const SWEEP_ANGLE = 270;

/** The arc's radius within the 100×100 viewBox, and where the pointer runs. */
const RADIUS = 40;
const POINTER_INNER = 14;
const POINTER_OUTER = 34;

/**
 * How far the pointer travels for the knob's whole range, in pixels — and how
 * far with Shift held.
 *
 * A knob has no track to aim along, so the sensitivity *is* the control: too
 * short and a cutoff cannot be placed, too long and crossing the range means
 * dragging off the bottom of the window. Roughly a screen's worth of movement
 * for the full sweep, with the fine ratio matching the one the waveform's trim
 * handles already offer to the keyboard.
 */
const DRAG_TRAVEL_PX = 200;
const FINE_DRAG_TRAVEL_PX = 2000;

/** A point on the knob's circle, in viewBox units. */
function pointAt(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  };
}

/**
 * An arc of the knob's travel, from the start of the sweep to `fraction` along
 * it. The same path serves the unlit track (at 1) and the lit part (at the
 * value), so the two can never be drawn on different circles.
 */
function arcPath(fraction: number): string {
  const end = START_ANGLE + fraction * SWEEP_ANGLE;
  const from = pointAt(START_ANGLE, RADIUS);
  const to = pointAt(end, RADIUS);
  // Anything past half the circle has to say so, or the renderer draws the
  // short way round instead.
  const largeArc = fraction * SWEEP_ANGLE > 180 ? 1 : 0;

  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

/**
 * A knob: the same contract as `ControlSlider`, driven by a vertical drag
 * rather than by a horizontal track.
 *
 * A div carrying the slider role by hand rather than an `<input type="range">`,
 * for the same reason the waveform's trim handles are: a range input cannot be
 * bent round a circle. Which means the keyboard has to be wired up explicitly —
 * the drag is the gesture this is for, but it must not be the only way in.
 */
export default function RotaryKnob({
  label,
  ariaLabel,
  min,
  max,
  step,
  value,
  readout,
  onChange,
  locked = false,
  onClearLock,
  disabled = false,
  midiMapId,
}: RotaryKnobProps) {
  const midiLearn = useMidiLearnControl(midiMapId, min, max, onChange);

  /**
   * Where the pointer was at the last move, and the unrounded value the drag
   * has reached.
   *
   * The raw value is carried rather than re-derived from the prop each move,
   * because the prop comes back snapped to `step`: on a knob whose step is
   * coarse relative to its travel, feeding the snapped value back in would
   * throw away every movement smaller than one step and the drag would stick.
   */
  const dragRef = useRef({ y: 0, raw: 0 });

  const range = max - min;

  const snap = (raw: number) => {
    const clamped = Math.min(Math.max(raw, min), max);
    if (step <= 0) return clamped;
    return Math.min(
      Math.max(Math.round((clamped - min) / step) * step + min, min),
      max,
    );
  };

  const fraction =
    range > 0 ? (Math.min(Math.max(value, min), max) - min) / range : 0;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    // Anything but the primary button is somebody else's gesture.
    if (event.button !== 0) return;

    // Captured so a drag that runs off the knob — or off the card — keeps
    // reporting here, and focused by hand, which a press on a div does not do.
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    dragRef.current = { y: event.clientY, raw: value };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    // Accumulated move by move rather than measured from where the drag began,
    // so picking up or letting go of Shift part way through changes what the
    // rest of the drag is worth instead of jumping the value.
    const travel = event.shiftKey ? FINE_DRAG_TRAVEL_PX : DRAG_TRAVEL_PX;
    // Up is more, which is the direction a knob is turned up in.
    const moved = dragRef.current.y - event.clientY;
    dragRef.current.y = event.clientY;
    dragRef.current.raw = Math.min(
      Math.max(dragRef.current.raw + (moved / travel) * range, min),
      max,
    );

    onChange(snap(dragRef.current.raw));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    // A hundredth of the range per press, or one step where the steps are
    // coarser than that — a knob with 24 positions should move by one of them
    // rather than by a fraction that rounds back to where it started.
    const distance = Math.max(step, range / 100);

    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        onChange(snap(value + distance));
        break;
      case "ArrowDown":
      case "ArrowLeft":
        onChange(snap(value - distance));
        break;
      case "PageUp":
        onChange(snap(value + distance * 10));
        break;
      case "PageDown":
        onChange(snap(value - distance * 10));
        break;
      case "Home":
        onChange(min);
        break;
      case "End":
        onChange(max);
        break;
      default:
        return;
    }

    // Only for the keys handled above, so nothing else on the page is swallowed.
    event.preventDefault();
  };

  /**
   * A right click, while this knob has a MIDI identity: starts listening for
   * the next CC, clears an existing binding, or cancels listening — whichever
   * of the three currently applies, so one gesture covers all of it rather
   * than needing a menu to choose between them.
   */
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!midiLearn) return;
    event.preventDefault();

    if (midiLearn.isLearning) {
      midiLearn.cancelLearn();
    } else if (midiLearn.cc !== null) {
      midiLearn.clearBinding();
    } else {
      midiLearn.startLearn();
    }
  };

  const midiTitle = !midiLearn
    ? undefined
    : midiLearn.isLearning
      ? "Listening for a MIDI CC — right-click to cancel"
      : midiLearn.cc !== null
        ? `Mapped to MIDI CC ${midiLearn.cc} — right-click to clear`
        : "Right-click to map a MIDI CC";

  const pointerFrom = pointAt(
    START_ANGLE + fraction * SWEEP_ANGLE,
    POINTER_INNER,
  );
  const pointerTo = pointAt(
    START_ANGLE + fraction * SWEEP_ANGLE,
    POINTER_OUTER,
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel ?? label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={readout}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        title={midiTitle}
        // `touch-none` keeps the browser from claiming the drag for scrolling,
        // which would swallow it before it arrived — the same reason the step
        // grid and the trim handles set it.
        className={`size-12 touch-none rounded-full outline-none select-none md:size-14 ${
          disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-ns-resize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        }`}
      >
        <svg viewBox="0 0 100 100" aria-hidden className="size-full">
          {/* The travel itself, unlit — the same circle the value rides, so the
              knob reads as a dial with a position on it rather than as an arc
              of unknown extent. */}
          <path
            d={arcPath(1)}
            fill="none"
            stroke="var(--edge)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* How far along it the value sits. Skipped outright at the very
              bottom of the range, where an arc of no length still paints a cap
              and would read as a value that isn't there — and outright while
              disabled, where the value isn't a level to read at all. */}
          {!disabled && fraction > 0.001 && (
            <path
              d={arcPath(fraction)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={8}
              strokeLinecap="round"
            />
          )}

          {/* The body, and the line across it. Two ways of saying the same
              thing on purpose: the arc is what makes small moves legible, the
              pointer is what can be read across the room. */}
          <circle
            cx={50}
            cy={50}
            r={POINTER_OUTER - 4}
            fill="var(--field)"
            stroke="var(--edge)"
            strokeWidth={2}
          />
          <line
            x1={pointerFrom.x}
            y1={pointerFrom.y}
            x2={pointerTo.x}
            y2={pointerTo.y}
            stroke="var(--fg)"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Locked labels take the colour of what is being looked at, so an
          overridden knob can be picked out of the row at a glance — the same
          mark `ControlSlider` puts on its rows. */}
      <span
        className={`flex items-center gap-1 text-center text-[10px] leading-tight ${
          disabled ? "text-muted opacity-40" : locked ? "text-select" : ""
        }`}
      >
        {label}

        {/* A MIDI dot: solid once mapped, pulsing while listening for the CC
            that will map it. Absent otherwise, so a knob with no MIDI
            identity — or one that's never been mapped — looks exactly as it
            always has. */}
        {midiLearn && (midiLearn.cc !== null || midiLearn.isLearning) && (
          <span
            aria-hidden
            className={`bg-accent inline-block size-1.5 rounded-full ${
              midiLearn.isLearning ? "animate-pulse" : ""
            }`}
          />
        )}
      </span>

      <div className="flex items-center gap-0.5">
        <span
          className={`text-muted text-[10px] tabular-nums ${disabled ? "opacity-40" : ""}`}
        >
          {readout}
        </span>

        {!disabled && onClearLock && locked && (
          <button
            type="button"
            onClick={onClearLock}
            aria-label={`Clear ${label} lock`}
            title={`Clear ${label} lock`}
            className="text-select hover:bg-raised rounded px-0.5 text-[10px] leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
