"use client";

import MidiBadge from "@/components/ui/MidiBadge";
import MidiLearnMenu from "@/components/ui/MidiLearnMenu";
import { useMidiLearnMenu } from "@/hooks/useMidiLearnMenu";

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
  const midiMenu = useMidiLearnMenu(midiMapId);

  const slider = (
    <>
      {/* Locked labels take the colour of what is being looked at, so the
          overridden rows can be picked out of the panel at a glance. */}
      <span
        className={`flex w-14 shrink-0 items-center gap-1 ${locked ? "text-select" : ""}`}
      >
        {label}

        {midiMenu?.showBadge && <MidiBadge label={label} menu={midiMenu} />}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        // The readout, not the raw number underneath it: several of these
        // travel on a 0..1 position rather than in the unit they display, so
        // a screen reader left to announce `value` would say "0.62" for a
        // cutoff the panel is calling 1.2 kHz. Same string either way.
        aria-valuetext={readout}
        className="flex-1 sm:w-32 sm:flex-none"
      />
      <span className="text-muted w-16 shrink-0 text-right tabular-nums">
        {readout}
      </span>
    </>
  );

  return (
    <>
      {!onClearLock ? (
        <label
          onContextMenu={midiMenu?.onContextMenu}
          title={midiMenu?.title}
          className="flex items-center gap-2 text-xs"
        >
          {slider}
        </label>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <label
            onContextMenu={midiMenu?.onContextMenu}
            title={midiMenu?.title}
            className="flex flex-1 items-center gap-2"
          >
            {slider}
          </label>

          {/* Held open even when there is nothing to clear, so the rows of a
              panel stay aligned as locks come and go under them. */}
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
      )}

      {/* Outside the label on purpose: a click on a menu item within one would
          be forwarded to the slider as though the track had been clicked. */}
      {midiMenu && <MidiLearnMenu label={label} menu={midiMenu} />}
    </>
  );
}
