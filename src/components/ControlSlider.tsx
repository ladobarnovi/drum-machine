"use client";

type ControlSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "80%" or "1.2 kHz". */
  readout: string;
  onChange: (value: number) => void;
};

export default function ControlSlider({
  label,
  min,
  max,
  step,
  value,
  readout,
  onChange,
}: ControlSliderProps) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-32 accent-orange-500"
      />
      <span className="w-16 shrink-0 text-right text-neutral-500 tabular-nums dark:text-neutral-400">
        {readout}
      </span>
    </label>
  );
}
