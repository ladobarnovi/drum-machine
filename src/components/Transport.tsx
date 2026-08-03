"use client";

import { MAX_BPM, MIN_BPM, clampBpm } from "@/lib/sequencer";

type TransportProps = {
  isPlaying: boolean;
  bpm: number;
  /** False when no channel has a sample loaded yet. */
  canPlay: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
};

export default function Transport({
  isPlaying,
  bpm,
  canPlay,
  onTogglePlay,
  onBpmChange,
}: TransportProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onTogglePlay}
        // Stay enabled while playing so the transport can always be stopped.
        disabled={!isPlaying && !canPlay}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-baseline justify-between">
          <span>BPM</span>
          <span className="text-neutral-500 tabular-nums dark:text-neutral-400">
            {bpm}
          </span>
        </span>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          value={bpm}
          onChange={(event) =>
            onBpmChange(clampBpm(Number(event.target.value)))
          }
          aria-label="BPM"
          className="w-full accent-orange-500"
        />
      </label>

      {!canPlay && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Load a sample on any channel to start.
        </span>
      )}
    </div>
  );
}
