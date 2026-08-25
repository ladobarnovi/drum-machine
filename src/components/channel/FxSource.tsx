"use client";

import { BASELINE, toX, toY } from "./fxTileGeometry";

/**
 * The dry hit, in both tiles that have one — deliberately not in the accent,
 * since it is the signal the send is taken off rather than any part of what
 * the send does with it. A tile with nothing but this in it is a tile whose
 * send is shut.
 */
export default function FxSource({ position }: { position: number }) {
  return (
    <line
      x1={toX(position)}
      y1={BASELINE}
      x2={toX(position)}
      y2={toY(1)}
      stroke="var(--fg)"
      strokeWidth={3}
      strokeLinecap="round"
      opacity={0.25}
      vectorEffect="non-scaling-stroke"
    />
  );
}
