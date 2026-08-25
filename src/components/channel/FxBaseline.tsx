"use client";

import { BASELINE, VIEWBOX_WIDTH } from "./fxTileGeometry";

/** The floor the delay and reverb tiles stand their marks on. */
export default function FxBaseline() {
  return (
    <line
      x1={0}
      y1={BASELINE}
      x2={VIEWBOX_WIDTH}
      y2={BASELINE}
      stroke="var(--fg)"
      strokeWidth={1}
      opacity={0.1}
      vectorEffect="non-scaling-stroke"
    />
  );
}
