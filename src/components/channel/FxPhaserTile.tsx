"use client";

import type { CSSProperties } from "react";

import FxTile from "./FxTile";
import { VIEWBOX_WIDTH, cycleSeconds, toX, toY } from "./fxTileGeometry";
import { PHASER_FLAT_LEVEL, phaserCurve } from "@/lib/fxResponse";
import { isSendClosed } from "@/lib/sequencer";

/** A response with notches cut in it, sweeping the way a phaser's do. */
export default function FxPhaserTile({ send }: { send: number }) {
  const curve = phaserCurve(send);
  const closed = isSendClosed(send);
  const cycle = cycleSeconds(send, 7.5, 2.2);

  const line = curve
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toX(point.position)} ${toY(point.level)}`,
    )
    .join(" ");

  return (
    <FxTile label="Phaser">
      {/* What the response would be with nothing notched out of it, so the
          depth of the notches is read against something rather than guessed. */}
      <line
        x1={0}
        y1={toY(PHASER_FLAT_LEVEL)}
        x2={VIEWBOX_WIDTH}
        y2={toY(PHASER_FLAT_LEVEL)}
        stroke="var(--fg)"
        strokeWidth={1}
        opacity={0.1}
        vectorEffect="non-scaling-stroke"
      />

      {/*
        The sweep, and the whole reason the curve is drawn to a whole number of
        notches: two copies laid end to end, slid left by exactly one copy's
        width and looped, so the notches walk across the tile with no seam
        where the pass restarts. The slide is in the same user units the
        viewBox is measured in, handed to the keyframes rather than written
        into them so the distance can never drift from the width above.
      */}
      <g
        className={closed ? undefined : "fx-sweep"}
        style={
          closed
            ? undefined
            : ({
                animationDuration: `${cycle}s`,
                "--fx-sweep-width": `${VIEWBOX_WIDTH}px`,
              } as CSSProperties)
        }
      >
        {[0, VIEWBOX_WIDTH].map((offset) => (
          <path
            key={offset}
            d={line}
            transform={offset === 0 ? undefined : `translate(${offset} 0)`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            opacity={closed ? 0.3 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </FxTile>
  );
}
