"use client";

type TransportSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "120" or "58%". */
  readout: string;
  onChange: (value: number) => void;
};

/**
 * Inline slider sized for the header bar, where `ControlSlider`'s wide label
 * column and stretching track would push the transport off the row. The track
 * is fixed rather than fluid so the header keeps the same shape as the readout
 * changes width.
 */
export default function TransportSlider({
  label,
  min,
  max,
  step,
  value,
  readout,
  onChange,
}: TransportSliderProps) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-20 sm:w-28"
      />
      <span className="w-10 shrink-0 text-right text-neutral-500 tabular-nums dark:text-neutral-400">
        {readout}
      </span>
    </label>
  );
}
