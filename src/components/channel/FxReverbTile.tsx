"use client";

import FxBaseline from "./FxBaseline";
import FxSource from "./FxSource";
import FxTile from "./FxTile";
import { BASELINE, cycleSeconds, toX, toY } from "./fxTileGeometry";
import { reverbPicture } from "@/lib/fxResponse";

/** A hit and the wash behind it, shimmering as it spreads out. */
export default function FxReverbTile({ send }: { send: number }) {
  const { source, tail, grains } = reverbPicture(send);
  const cycle = cycleSeconds(send, 3.6, 2);

  // Closed along the baseline, so the tail reads as a body of sound rather
  // than as a line with two sides.
  const wash =
    tail.length === 0
      ? null
      : `${tail
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${toX(point.position)} ${toY(point.level)}`,
          )
          .join(
            " ",
          )} L ${toX(tail[tail.length - 1].position)} ${BASELINE} L ${toX(
          tail[0].position,
        )} ${BASELINE} Z`;

  return (
    <FxTile label="Reverb">
      <FxBaseline />
      <FxSource position={source.position} />

      {wash && <path d={wash} fill="currentColor" opacity={0.16} />}

      {grains.map((grain) => (
        <line
          key={grain.position}
          x1={toX(grain.position)}
          y1={BASELINE}
          x2={toX(grain.position)}
          y2={toY(grain.level)}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeOpacity={0.5}
          vectorEffect="non-scaling-stroke"
          className="fx-pulse"
          style={{
            animationDuration: `${cycle}s`,
            // Off its distance from the hit rather than off its index, so the
            // shimmer runs outward through the tail instead of flickering at
            // random across it.
            animationDelay: `${grain.position * cycle * 0.8}s`,
          }}
        />
      ))}
    </FxTile>
  );
}
