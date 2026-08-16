"use client";

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
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 400;

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
export default function EnvelopeGraph({
  attackSeconds,
  decaySeconds,
  sustainLevel,
  releaseSeconds,
}: EnvelopeGraphProps) {
  const curve = envelopeCurve(
    attackSeconds,
    decaySeconds,
    sustainLevel,
    releaseSeconds,
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

  const toX = (position: number) => position * VIEWBOX_WIDTH;
  const toY = (level: number) => (1 - level) * VIEWBOX_HEIGHT;

  const line = curve
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toX(point.position)} ${toY(point.level)}`,
    )
    .join(" ");

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
    <div className="border-line bg-panel relative h-16 overflow-hidden rounded border md:h-24">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        // Stretch freely: this is a shape overview like the filter's, not a
        // plot anyone is going to measure a time off. Every stroke below is
        // non-scaling, so nothing comes out thicker in one direction than the
        // other for it.
        preserveAspectRatio="none"
        role="img"
        aria-label={`Amplitude envelope. Attack ${
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
        className="text-accent size-full"
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
      </svg>

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
    </div>
  );
}
