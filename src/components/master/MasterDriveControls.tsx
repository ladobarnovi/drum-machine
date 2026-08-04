"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import {
  DRIVE_TYPES,
  DRIVE_TYPE_LABELS,
  MAX_DRIVE,
  MAX_VOLUME,
  MIN_DRIVE,
  MIN_VOLUME,
  clampDrive,
  clampDriveType,
  clampVolume,
  type MasterDrive,
} from "@/lib/sequencer";

type MasterDriveControlsProps = {
  drive: MasterDrive;
  onChange: (drive: MasterDrive) => void;
};

/**
 * Saturation across the whole mix, laid out like a pedal: the toggle bypasses
 * the amount and the volume together, so switching it off is a clean A/B
 * against the untouched sum.
 */
export default function MasterDriveControls({
  drive,
  onChange,
}: MasterDriveControlsProps) {
  return (
    <MasterFxSection
      title="Drive"
      toggleLabel="Master drive"
      enabled={drive.enabled}
      onToggle={() => onChange({ ...drive, enabled: !drive.enabled })}
    >
      {/* Type first: it decides what Amount is dialling in. */}
      <label className="flex flex-col gap-1 text-xs">
        <span>Type</span>
        <select
          value={drive.type}
          onChange={(event) =>
            onChange({ ...drive, type: clampDriveType(event.target.value) })
          }
          aria-label="Master drive type"
          className="border-edge bg-field w-full rounded border px-2 py-1"
        >
          {DRIVE_TYPES.map((type) => (
            <option key={type} value={type}>
              {DRIVE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <RailSlider
        label="Amount"
        ariaLabel="Master drive amount"
        min={MIN_DRIVE}
        max={MAX_DRIVE}
        step={0.01}
        value={drive.amount}
        readout={`${Math.round(drive.amount * 100)}%`}
        onChange={(value) => onChange({ ...drive, amount: clampDrive(value) })}
      />

      <RailSlider
        label="Volume"
        ariaLabel="Master drive volume"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={drive.level}
        readout={`${Math.round(drive.level * 100)}%`}
        onChange={(value) => onChange({ ...drive, level: clampVolume(value) })}
      />
    </MasterFxSection>
  );
}
