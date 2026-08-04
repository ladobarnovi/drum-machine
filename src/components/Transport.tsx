"use client";

import RailGroup from "./RailGroup";
import RailSlider from "./RailSlider";
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
 * Play, tempo, and feel, stacked for the left-hand rail alongside the kit
 * picker and the output fader. These act on the whole pattern rather than on
 * one channel, so they sit off to the side rather than in among the steps.
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
    <RailGroup title="Transport">
      <button
        type="button"
        onClick={onTogglePlay}
        // Stay enabled while playing so the transport can always be stopped.
        disabled={!isPlaying && !canPlay}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      {/* Says why Play is dead rather than leaving it greyed out unexplained. */}
      {!canPlay && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Load a sample on any channel to start.
        </p>
      )}

      <RailSlider
        label="BPM"
        ariaLabel="BPM"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        readout={String(bpm)}
        onChange={(value) => onBpmChange(clampBpm(value))}
      />

      <RailSlider
        label="Swing"
        ariaLabel="Swing"
        min={MIN_SWING}
        max={MAX_SWING}
        step={0.01}
        value={swing}
        readout={formatSwing(swing)}
        onChange={(value) => onSwingChange(clampSwing(value))}
      />
    </RailGroup>
  );
}
