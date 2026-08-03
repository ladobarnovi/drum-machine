"use client";

import { MAX_BPM, MIN_BPM } from "@/lib/sequencer";

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
  function handleBpmChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) onBpmChange(value);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onTogglePlay}
        // Stay enabled while playing so the transport can always be stopped.
        disabled={!isPlaying && !canPlay}
        className="w-20 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      <label className="flex items-center gap-2 text-sm">
        BPM
        <input
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={handleBpmChange}
          className="w-20 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
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
