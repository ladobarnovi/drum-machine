"use client";

import PlotFrame from "./PlotFrame";
import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH, linePath, toX } from "./plotGeometry";

import { memo, useMemo } from "react";

import {
  envelopeActiveStages,
  envelopeCurve,
  envelopeStagePositions,
} from "@/lib/envelopeResponse";
import {
  formatSeconds,
  formatSustain,
  isAttackBypassed,
  isDecayBypassed,
  isReleaseBypassed,
  isSustainBypassed,
} from "@/lib/sequencer";

type EnvelopeGraphProps = {
  attackSeconds: number;
  decaySeconds: number;
  sustainLevel: number;
  releaseSeconds: number;
};

/** The plot's own coordinate space. Stretched to fill whatever width it gets. */

type Stage = {
  id: string;
  tag: string;
  start: number;
  end: number;
};

/**
 * The selected channel's amplitude envelope, as a picture with its four
 * controls under it — the same pairing `FilterGraph` makes with its knobs.
 *
 * Attack and decay ride the exact ramps the voice is scheduled with, so the
 * bend in the curve is the bend the ear hears rather than a stand-in shape.
 * Sustain has no time of its own — nothing here says how long a hit is
 * held — so its plateau is drawn a fixed width purely to give the level
 * somewhere to sit before release, where there is one, takes it back down.
 */
function EnvelopeGraph({
  attackSeconds,
  decaySeconds,
  sustainLevel,
  releaseSeconds,
}: EnvelopeGraphProps) {
  // Held against the four stage times: the curve is sampled at over a hundred
  // points, and the transport re-renders this card on every step whether or not
  // the envelope has moved.
  const curve = useMemo(
    () =>
      envelopeCurve(attackSeconds, decaySeconds, sustainLevel, releaseSeconds),
    [attackSeconds, decaySeconds, sustainLevel, releaseSeconds],
  );
  const positions = envelopeStagePositions(
    attackSeconds,
    decaySeconds,
    sustainLevel,
    releaseSeconds,
  );
  const active = envelopeActiveStages(
    attackSeconds,
    decaySeconds,
    sustainLevel,
    releaseSeconds,
  );

  const toY = (level: number) => (1 - level) * VIEWBOX_HEIGHT;

  const line = linePath(
    curve,
    (point) => toX(point.position),
    (point) => toY(point.level),
  );

  // The same outline closed along the bottom of the frame, so the envelope
  // reads as a shape with weight rather than as a line with two sides.
  const area = `${line} L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} Z`;

  // Decay, sustain and release are only worth a tag while they are actually
  // shaping the hit — without that check, a fully bypassed envelope would
  // have its whole flat ring-out mistaken for a release stage, since
  // `envelopeCurve` draws the two as the same flat line.
  const candidates: Stage[] = [
    { id: "attack", tag: "A", start: 0, end: positions.attackEnd },
    active.decay && {
      id: "decay",
      tag: "D",
      start: positions.attackEnd,
      end: positions.decayEnd,
    },
    active.sustain && {
      id: "sustain",
      tag: "S",
      start: positions.decayEnd,
      end: positions.sustainEnd,
    },
    active.release && {
      id: "release",
      tag: "R",
      start: positions.sustainEnd,
      end: positions.releaseEnd,
    },
  ].filter((stage): stage is Stage => Boolean(stage));

  // Only regions wider than a rounding error are worth a tag — a bypassed
  // stage collapses to zero width and would otherwise stack its letter on
  // top of whichever neighbour is still open.
  const stages = candidates.filter((stage) => stage.end - stage.start > 0.01);

  // The dividers are just the internal boundaries between the stages that
  // are actually being drawn, so a bypassed stage draws no line for it either.
  const dividers = stages.slice(1).map((stage) => stage.start);

  return (
    <PlotFrame
      width={VIEWBOX_WIDTH}
      height={VIEWBOX_HEIGHT}
      overlay={
        <>
          {/* One letter per stage, centred in its own region along the bottom —
            HTML over the plot for the same reason `FilterGraph`'s tags are: a
            letter drawn into a plot stretched to an arbitrary width would come
            out smeared. */}
          {stages.map((stage) => (
            <span
              key={stage.id}
              aria-hidden
              className="text-muted pointer-events-none absolute bottom-0.5 text-[9px] font-semibold"
              style={{
                left: `${((stage.start + stage.end) / 2) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {stage.tag}
            </span>
          ))}
        </>
      }
      label={`Amplitude envelope. Attack ${
        isAttackBypassed(attackSeconds) ? "off" : formatSeconds(attackSeconds)
      }, decay ${
        isDecayBypassed(decaySeconds) ? "off" : formatSeconds(decaySeconds)
      }, sustain ${
        isSustainBypassed(sustainLevel) ? "off" : formatSustain(sustainLevel)
      }, release ${
        isReleaseBypassed(releaseSeconds)
          ? "off"
          : formatSeconds(releaseSeconds)
      }.`}
    >
      {dividers.map((position) => (
        <line
          key={position}
          x1={toX(position)}
          y1={0}
          x2={toX(position)}
          y2={VIEWBOX_HEIGHT}
          stroke="var(--fg)"
          strokeWidth={1}
          opacity={0.1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <path d={area} fill="currentColor" opacity={0.18} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </PlotFrame>
  );
}

/**
 * Memoised because the transport re-renders the card this sits in on every
 * step, and none of what it draws changes with the playhead — only with the
 * values it is handed.
 */
export default memo(EnvelopeGraph);
