"use client";

import MidiBadge from "@/components/ui/MidiBadge";
import MidiLearnMenu from "@/components/ui/MidiLearnMenu";
import { useMidiLearnMenu } from "@/hooks/useMidiLearnMenu";

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
  const midiMenu = useMidiLearnMenu(midiMapId);

  return (
    <>
      <label
        onContextMenu={midiMenu?.onContextMenu}
        title={midiMenu?.title}
        className="flex flex-col gap-1 text-xs"
      >
        <span className="flex items-baseline justify-between">
          <span className="flex items-center gap-1">
            {label}

            {midiMenu?.showBadge && (
              <MidiBadge label={ariaLabel} menu={midiMenu} />
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

      {/* Outside the label on purpose: a click on a menu item within one would
          be forwarded to the slider as though the track had been clicked. */}
      {midiMenu && <MidiLearnMenu label={ariaLabel} menu={midiMenu} />}
    </>
  );
}
