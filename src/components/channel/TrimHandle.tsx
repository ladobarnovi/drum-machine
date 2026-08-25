"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

/**
 * How far one press of an arrow key moves a handle, as a fraction of the file.
 *
 * A hundredth of the sample per press, so a handle crosses the strip in a
 * hundred presses rather than a thousand; the modifier below is what a
 * transient is actually placed with, and is offered for the same reason the
 * step grid offers Shift — a control reachable only by dragging is not one
 * every input device can work.
 */
const KEY_STEP = 0.01;
const FINE_KEY_STEP = 0.001;

type TrimHandleProps = {
  edge: "start" | "end";
  /**
   * Where this handle sits, as a fraction of the strip — which is the file read
   * left to right, or the file read backwards once it has been reversed.
   */
  position: number;
  /** How far into the strip that is, for the readout a screen reader speaks. */
  seconds: number;
  onChange: (fraction: number) => void;
  /** Where a pointer at `clientX` falls along the strip, as a fraction. */
  fractionAt: (clientX: number) => number;
};

/**
 * One edge of the played region, dragged along the strip.
 *
 * A div rather than an input: a range slider cannot be laid over a waveform at
 * an arbitrary height, and two of them side by side cannot express a pair of
 * edges that may not cross. So it carries the slider role by hand, which is
 * also what gets it the arrow keys — the drag is the gesture this is for, but
 * it must not be the only way in.
 */
export default function TrimHandle({
  edge,
  position,
  seconds,
  onChange,
  fractionAt,
}: TrimHandleProps) {
  /**
   * How far the handle sat from the pointer when it was grabbed. Dragging moves
   * it by that much less, so the edge tracks the pointer's own travel rather
   * than jumping under it — the grab area is wider than the line it draws, and
   * without this every press would first snap the edge to the middle of it.
   */
  const grabOffsetRef = useRef(0);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Anything but the primary button is somebody else's gesture.
    if (event.button !== 0) return;

    // Captured so a drag that runs off the strip — or off the card — keeps
    // reporting here, and focused by hand, which a press on a div does not do.
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    grabOffsetRef.current = position - fractionAt(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onChange(fractionAt(event.clientX) + grabOffsetRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const distance = event.shiftKey ? FINE_KEY_STEP : KEY_STEP;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        onChange(position - distance);
        break;
      case "ArrowRight":
      case "ArrowUp":
        onChange(position + distance);
        break;
      // The far ends, which is also how a handle is put back on its own.
      case "Home":
        onChange(0);
        break;
      case "End":
        onChange(1);
        break;
      default:
        return;
    }

    // Only for the keys handled above, so nothing else on the page is swallowed.
    event.preventDefault();
  };

  const label = edge === "start" ? "Sample start" : "Sample end";

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position * 100)}
      aria-valuetext={`${seconds.toFixed(2)} seconds`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      // `touch-none` keeps the browser from claiming the drag for scrolling,
      // which would swallow it before it arrived — the same reason the step
      // grid sets it. The strip is short, so the page still scrolls from
      // anywhere either side of the two handles.
      className="group absolute inset-y-0 flex w-4 -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center outline-none select-none"
      style={{ left: `${position * 100}%` }}
    >
      {/*
        `--select`, the colour of whatever is being looked at, rather than the
        accent the waveform itself is drawn in: an edge marker has to read
        against the shape it is cutting, not blend into it.
      */}
      {/* A cap at either end, so the line reads as something to take hold of
          rather than as a mark drawn on the waveform. */}
      <span aria-hidden className="bg-select size-1.5 shrink-0 rounded-sm" />
      <span
        aria-hidden
        className="bg-select w-0.5 flex-1 transition-[width] group-hover:w-1 group-focus-visible:w-1"
      />
      <span aria-hidden className="bg-select size-1.5 shrink-0 rounded-sm" />
    </div>
  );
}
