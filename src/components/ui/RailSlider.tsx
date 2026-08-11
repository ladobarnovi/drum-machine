"use client";

import type { MouseEvent } from "react";

import { useMidiLearnControl } from "@/hooks/useMidiLearnControl";

type RailSliderProps = {
  label: string;
  /**
   * Names the control on its own, since the same label appears in more than one
   * master stage — e.g. "Master filter low cut".
   */
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "35%" or "1.2 kHz". */
  readout: string;
  onChange: (value: number) => void;
  /**
   * This slider's identity in the MIDI CC map (see `lib/midiCcMap`). Left
   * undefined, the row has no MIDI behaviour at all — right-click does
   * nothing special, and it renders exactly as it always has.
   */
  midiMapId?: string;
};

/**
 * Stacked slider sized for the sidebar rail, where `ControlSlider`'s label,
 * track, and readout would not fit on one line.
 */
export default function RailSlider({
  label,
  ariaLabel,
  min,
  max,
  step,
  value,
  readout,
  onChange,
  midiMapId,
}: RailSliderProps) {
  const midiLearn = useMidiLearnControl(midiMapId, min, max, onChange);

  /**
   * A right click, while this row has a MIDI identity: starts listening for
   * the next CC, clears an existing binding, or cancels listening — whichever
   * currently applies, so one gesture covers all three without a menu.
   */
  const handleContextMenu = (event: MouseEvent<HTMLLabelElement>) => {
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

  return (
    <label
      onContextMenu={handleContextMenu}
      title={midiTitle}
      className="flex flex-col gap-1 text-xs"
    >
      <span className="flex items-baseline justify-between">
        <span className="flex items-center gap-1">
          {label}

          {/* A MIDI dot: solid once mapped, pulsing while listening for the CC
              that will map it. Absent otherwise. */}
          {midiLearn && (midiLearn.cc !== null || midiLearn.isLearning) && (
            <span
              aria-hidden
              className={`bg-accent inline-block size-1.5 rounded-full ${
                midiLearn.isLearning ? "animate-pulse" : ""
              }`}
            />
          )}
        </span>
        <span className="text-muted tabular-nums">{readout}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={ariaLabel}
        className="w-full"
      />
    </label>
  );
}
