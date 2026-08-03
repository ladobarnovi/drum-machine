"use client";

import {
  MAX_DRIVE,
  MAX_VOLUME,
  MIN_DRIVE,
  MIN_VOLUME,
  clampDrive,
  clampVolume,
  type MasterDrive,
} from "@/lib/sequencer";

type MasterDriveControlsProps = {
  drive: MasterDrive;
  onChange: (drive: MasterDrive) => void;
};

type RailSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "35%". */
  readout: string;
  onChange: (value: number) => void;
};

/**
 * Stacked slider sized for the sidebar rail, where `ControlSlider`'s label,
 * track, and readout would not fit on one line.
 */
function RailSlider({
  label,
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
        aria-label={`Drive ${label.toLowerCase()}`}
        className="w-full accent-orange-500"
      />
    </label>
  );
}

/**
 * Saturation across the whole mix, laid out like a pedal: the toggle bypasses
 * the amount and the volume together, so switching it off is a clean A/B
 * against the untouched sum.
 *
 * Both sliders stay live while bypassed, so a setting can be dialled in before
 * it is switched in.
 */
export default function MasterDriveControls({
  drive,
  onChange,
}: MasterDriveControlsProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold">Drive</h2>

        <button
          type="button"
          onClick={() => onChange({ ...drive, enabled: !drive.enabled })}
          aria-pressed={drive.enabled}
          aria-label="Master drive"
          className={`rounded border px-2 py-0.5 text-[10px] leading-4 font-semibold transition-colors ${
            drive.enabled
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }`}
        >
          {drive.enabled ? "On" : "Off"}
        </button>
      </div>

      <RailSlider
        label="Amount"
        min={MIN_DRIVE}
        max={MAX_DRIVE}
        step={0.01}
        value={drive.amount}
        readout={`${Math.round(drive.amount * 100)}%`}
        onChange={(value) =>
          onChange({ ...drive, amount: clampDrive(value) })
        }
      />

      <RailSlider
        label="Volume"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={drive.level}
        readout={`${Math.round(drive.level * 100)}%`}
        onChange={(value) => onChange({ ...drive, level: clampVolume(value) })}
      />
    </section>
  );
}
