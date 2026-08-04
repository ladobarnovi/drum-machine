"use client";

import TransportSlider from "./TransportSlider";
import {
  MAX_BPM,
  MAX_SWING,
  MIN_BPM,
  MIN_SWING,
  clampBpm,
  clampSwing,
  formatSwing,
} from "@/lib/sequencer";

type TransportProps = {
  isPlaying: boolean;
  bpm: number;
  swing: number;
  /** False when no channel has a sample loaded yet. */
  canPlay: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swing: number) => void;
};

/**
 * Play, tempo, and feel, laid out as a row for the header. These are the
 * controls reached for while a pattern is being written, so they live on screen
 * next to the title rather than in the rail with the effects.
 */
export default function Transport({
  isPlaying,
  bpm,
  swing,
  canPlay,
  onTogglePlay,
  onBpmChange,
  onSwingChange,
}: TransportProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {!canPlay && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Load a sample on any channel to start.
        </span>
      )}

      <button
        type="button"
        onClick={onTogglePlay}
        // Stay enabled while playing so the transport can always be stopped.
        disabled={!isPlaying && !canPlay}
        className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      <TransportSlider
        label="BPM"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        readout={String(bpm)}
        onChange={(value) => onBpmChange(clampBpm(value))}
      />

      <TransportSlider
        label="Swing"
        min={MIN_SWING}
        max={MAX_SWING}
        step={0.01}
        value={swing}
        readout={formatSwing(swing)}
        onChange={(value) => onSwingChange(clampSwing(value))}
      />
    </div>
  );
}
