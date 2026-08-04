"use client";

import type { SampleState } from "@/lib/sequencer";

type WaveformProps = {
  sample: SampleState;
};

const VIEWBOX_HEIGHT = 100;

/** Builds a filled, centre-mirrored outline: left-to-right on top, back along the bottom. */
function buildPath(peaks: number[]): string {
  const half = VIEWBOX_HEIGHT / 2;
  const top = peaks.map((peak, index) => `L ${index} ${half - peak * half}`);
  const bottom = [];
  for (let index = peaks.length - 1; index >= 0; index--) {
    bottom.push(`L ${index} ${half + peaks[index] * half}`);
  }
  return `M 0 ${half} ${top.join(" ")} ${bottom.join(" ")} Z`;
}

export default function Waveform({ sample }: WaveformProps) {
  const frame =
    "border-line bg-panel flex h-20 items-center justify-center overflow-hidden rounded border";
  const message = "text-muted text-xs";

  if (sample.status === "loading") {
    return (
      <div className={frame}>
        <span className={message}>Loading…</span>
      </div>
    );
  }

  if (sample.status === "error") {
    return (
      <div className={frame}>
        <span className="text-danger text-xs">{sample.message}</span>
      </div>
    );
  }

  if (sample.status === "empty" || sample.peaks.length === 0) {
    return (
      <div className={frame}>
        <span className={message}>
          {sample.status === "empty" ? "No sample loaded" : "No waveform"}
        </span>
      </div>
    );
  }

  return (
    <div className={`${frame} relative`}>
      <svg
        viewBox={`0 0 ${sample.peaks.length} ${VIEWBOX_HEIGHT}`}
        // Stretch freely: the strip is a shape overview, not a to-scale plot.
        preserveAspectRatio="none"
        aria-label={`Waveform for ${sample.name}`}
        role="img"
        className="text-accent h-full w-full"
      >
        <line
          x1={0}
          y1={VIEWBOX_HEIGHT / 2}
          x2={sample.peaks.length}
          y2={VIEWBOX_HEIGHT / 2}
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.35}
          vectorEffect="non-scaling-stroke"
        />
        <path d={buildPath(sample.peaks)} fill="currentColor" />
      </svg>

      <span className="bg-surface/70 text-muted absolute right-1.5 bottom-1 rounded px-1 text-[10px] tabular-nums">
        {sample.durationSeconds.toFixed(2)}s
      </span>
    </div>
  );
}
