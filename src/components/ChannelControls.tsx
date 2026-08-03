"use client";

import {
  MAX_PITCH,
  MAX_VOLUME,
  MIN_PITCH,
  MIN_VOLUME,
  clampPitch,
  clampVolume,
} from "@/lib/sequencer";

type ChannelControlsProps = {
  volume: number;
  pitch: number;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
};

/** Volume (linear gain) and pitch (semitones) for the selected channel. */
export default function ChannelControls({
  volume,
  pitch,
  onVolumeChange,
  onPitchChange,
}: ChannelControlsProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <label className="flex items-center gap-2 text-xs">
        <span className="w-12 shrink-0">Volume</span>
        <input
          type="range"
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          step={0.01}
          value={volume}
          onChange={(event) =>
            onVolumeChange(clampVolume(Number(event.target.value)))
          }
          className="w-32 accent-orange-500"
        />
        <span className="w-10 shrink-0 text-right text-neutral-500 tabular-nums dark:text-neutral-400">
          {Math.round(volume * 100)}%
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs">
        <span className="w-12 shrink-0">Pitch</span>
        <input
          type="range"
          min={MIN_PITCH}
          max={MAX_PITCH}
          step={1}
          value={pitch}
          onChange={(event) =>
            onPitchChange(clampPitch(Number(event.target.value)))
          }
          className="w-32 accent-orange-500"
        />
        <span className="w-10 shrink-0 text-right text-neutral-500 tabular-nums dark:text-neutral-400">
          {pitch > 0 ? `+${pitch}` : pitch} st
        </span>
      </label>
    </div>
  );
}
