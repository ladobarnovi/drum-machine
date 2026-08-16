"use client";

import type { MouseEvent } from "react";

import { useMidiLearnControl } from "@/hooks/useMidiLearnControl";

type ControlSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "80%" or "1.2 kHz". */
  readout: string;
  onChange: (value: number) => void;
  /**
   * Whether this control is overridden on the step being edited. Only ever set
   * while a step is open, so an ordinary channel slider is unchanged.
   */
  locked?: boolean;
  /**
   * Drops that override. Passing it is what puts the clear button's column
   * beside the row, so every slider in a panel keeps its width whether or not
   * it happens to be locked — pass it to all of them or to none.
   */
  onClearLock?: () => void;
  /**
   * This slider's identity in the MIDI CC map (see `lib/midiCcMap`). Left
   * undefined, the row has no MIDI behaviour at all — right-click does
   * nothing special, and it renders exactly as it always has.
   */
  midiMapId?: string;
};

export default function ControlSlider({
  label,
  min,
  max,
  step,
  value,
  readout,
  onChange,
  locked = false,
  onClearLock,
  midiMapId,
}: ControlSliderProps) {
  const midiLearn = useMidiLearnControl(midiMapId, min, max, onChange);

  /**
   * A right click, while this row has a MIDI identity: starts listening for
   * the next CC, clears an existing binding, or cancels listening — whichever
   * currently applies, so one gesture covers all three without a menu.
   */
  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
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

  const slider = (
    <>
      {/* Locked labels take the colour of what is being looked at, so the
          overridden rows can be picked out of the panel at a glance. */}
      <span
        className={`flex w-14 shrink-0 items-center gap-1 ${locked ? "text-select" : ""}`}
      >
        {label}

        {/* A MIDI dot: solid once mapped, pulsing while listening for the CC
            that will map it. Absent otherwise. */}
        {midiLearn && (midiLearn.cc !== null || midiLearn.isLearning) && (
          <span
            aria-hidden
            className={`bg-accent inline-block size-1.5 shrink-0 rounded-full ${
              midiLearn.isLearning ? "animate-pulse" : ""
            }`}
          />
        )}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="flex-1 sm:w-32 sm:flex-none"
      />
      <span className="text-muted w-16 shrink-0 text-right tabular-nums">
        {readout}
      </span>
    </>
  );

  if (!onClearLock) {
    return (
      <label
        onContextMenu={handleContextMenu}
        title={midiTitle}
        className="flex items-center gap-2 text-xs"
      >
        {slider}
      </label>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <label
        onContextMenu={handleContextMenu}
        title={midiTitle}
        className="flex flex-1 items-center gap-2"
      >
        {slider}
      </label>

      {/* Held open even when there is nothing to clear, so the rows of a panel
          stay aligned as locks come and go under them. */}
      <span className="flex w-4 shrink-0 justify-center">
        {locked && (
          <button
            type="button"
            onClick={onClearLock}
            aria-label={`Clear ${label} lock`}
            title={`Clear ${label} lock`}
            className="text-select hover:bg-raised rounded px-1 leading-none"
          >
            ×
          </button>
        )}
      </span>
    </div>
  );
}
