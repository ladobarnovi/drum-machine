"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "./RailSlider";
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
