"use client";

import FxBaseline from "./FxBaseline";
import FxSource from "./FxSource";
import FxTile from "./FxTile";
import { BASELINE, cycleSeconds, toX, toY } from "./fxTileGeometry";
import { delayPicture } from "@/lib/fxResponse";
import { isSendClosed } from "@/lib/sequencer";

/** A hit and its repeats, each one lighting as it arrives. */
export default function FxDelayTile({ send }: { send: number }) {
  const { source, echoes } = delayPicture(send);
  const moving = !isSendClosed(send);
  const cycle = cycleSeconds(send, 2.4, 1.3);

  return (
    <FxTile label="Delay">
      <FxBaseline />
      <FxSource position={source.position} />

      {echoes.map((echo, index) => (
        <line
          key={echo.position}
          x1={toX(echo.position)}
          y1={BASELINE}
          x2={toX(echo.position)}
          y2={toY(echo.level)}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          // The repeat's own level is carried by `stroke-opacity` and the
          // pulse by `opacity`, which multiply — so a quiet repeat brightens
          // in its turn without ever coming up as loud as the one before it.
          strokeOpacity={0.35 + 0.65 * echo.level}
          vectorEffect="non-scaling-stroke"
          className={moving ? "fx-pulse" : undefined}
          style={
            moving
              ? {
                  animationDuration: `${cycle}s`,
                  // Staggered down the chain, so the light travels away from
                  // the hit the way the repeats themselves do.
                  animationDelay: `${(index + 1) * cycle * 0.09}s`,
                }
              : undefined
          }
        />
      ))}
    </FxTile>
  );
}
