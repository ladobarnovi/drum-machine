"use client";

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
}: RailSliderProps) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-baseline justify-between">
        <span>{label}</span>
        <span className="text-neutral-500 tabular-nums dark:text-neutral-400">
          {readout}
        </span>
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
