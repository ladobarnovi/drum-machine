"use client";

import type { CSSProperties } from "react";

import { lfoCurve, lfoScrollSeconds } from "@/lib/lfoResponse";
import {
  LFO_DESTINATION_LABELS,
  LFO_SHAPE_LABELS,
  formatLfoAmount,
  formatLfoRate,
  isLfoBypassed,
  type ChannelLfo,
} from "@/lib/sequencer";

type LfoGraphProps = {
  lfo: ChannelLfo;
};

/** The plot's own coordinate space. Stretched to fill whatever width it gets. */
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 400;

/** Where the unmodulated value sits, and how far a full swing gets from it. */
const CENTRE = VIEWBOX_HEIGHT / 2;
/** Keeps the crest of a full swing off the frame, and clear of the tag. */
const PADDING = 28;

const toX = (position: number) => position * VIEWBOX_WIDTH;
const toY = (level: number) => CENTRE - level * (CENTRE - PADDING);

/**
 * The selected channel's LFO, as the wave it is actually putting out — the LFO
 * tab's answer to `EnvelopeGraph` and `FilterGraph`.
 *
 * Every control on the tab is in the picture. The shape is the shape; the rate
 * decides how many cycles fit across the plot, so turning it up packs the wave
 * tighter the way a faster modulation is packed against a hit; the amount is
 * how far the wave swings off the line down the middle, which is where the
 * destination sits when the LFO is doing nothing to it; and the destination
 * itself is named in the corner with the swing in its own units, since a wave
 * with nothing to move is only half a picture.
 *
 * The mode is the one thing carried by motion rather than by shape, because
 * that is what the mode is. Retriggered, every hit restarts the wave from phase
 * zero, so what is drawn is what each hit gets — a fixed shape, held still.
 * Free running, one continuous LFO runs underneath the pattern and each hit
 * taps it wherever it has got to, so the wave scrolls: two copies laid end to
 * end and slid by exactly one copy's width, the same seamless trick
 * `FxGraph`'s phaser tile turns.
 *
 * A bypassed LFO — switched off, or swung by nothing — is drawn dim and still,
 * so a tab that is doing nothing to the channel looks like it.
 */
export default function LfoGraph({ lfo }: LfoGraphProps) {
  const curve = lfoCurve(lfo.shape, lfo.rateHz, lfo.amount);
  const bypassed = isLfoBypassed(lfo);
  // Only free running scrolls, and only while it is actually modulating
  // something: a switched-off LFO drifting across the plot would be claiming
  // to do something it is not.
  const scrolling = !bypassed && !lfo.retrigger;
  const scroll = lfoScrollSeconds(lfo.rateHz);

  const line = curve
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toX(point.position)} ${toY(point.level)}`,
    )
    .join(" ");

  // The same outline closed onto the centre line rather than onto the floor of
  // the frame, so the wave reads as a swing either side of where the parameter
  // rests instead of as a level standing on nothing.
  // (`line` opens with its own `M`, which is dropped here so the outline is
  // picked up from the centre line rather than started at the first point.)
  const area = `M ${toX(curve[0].position)} ${CENTRE} L${line.slice(1)} L ${toX(
    curve[curve.length - 1].position,
  )} ${CENTRE} Z`;

  return (
    <div className="border-line bg-panel relative h-16 overflow-hidden rounded border md:h-24">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        // Stretch freely, as the other three graphs do: every stroke below is
        // non-scaling, so nothing comes out thicker in one direction than in
        // the other for it.
        preserveAspectRatio="none"
        role="img"
        aria-label={`${LFO_SHAPE_LABELS[lfo.shape]} LFO at ${formatLfoRate(
          lfo.rateHz,
        )}, ${formatLfoAmount(lfo)} to ${LFO_DESTINATION_LABELS[
          lfo.destination
        ].toLowerCase()}, ${lfo.retrigger ? "retriggered" : "free running"}${
          bypassed ? ", off" : ""
        }.`}
        className="text-accent size-full"
      >
        {/* Where the destination sits with the LFO doing nothing to it, so the
            depth of the swing is read against something rather than guessed. */}
        <line
          x1={0}
          y1={CENTRE}
          x2={VIEWBOX_WIDTH}
          y2={CENTRE}
          stroke="var(--fg)"
          strokeWidth={1}
          opacity={0.1}
          vectorEffect="non-scaling-stroke"
        />

        <g
          className={scrolling ? "fx-sweep" : undefined}
          style={
            scrolling
              ? ({
                  animationDuration: `${scroll}s`,
                  // Handed to the keyframes in the same user units the viewBox
                  // is measured in, rather than written into them, so the slide
                  // can never drift from the width above.
                  "--fx-sweep-width": `${VIEWBOX_WIDTH}px`,
                } as CSSProperties)
              : undefined
          }
          opacity={bypassed ? 0.35 : 1}
        >
          {/* One copy is the whole picture while nothing is moving; the second
              only exists to fill the gap the first leaves as it slides off. */}
          {(scrolling ? [0, VIEWBOX_WIDTH] : [0]).map((offset) => (
            <g
              key={offset}
              transform={offset === 0 ? undefined : `translate(${offset} 0)`}
            >
              <path d={area} fill="currentColor" opacity={0.18} />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
      </svg>

      {/* What the wave is moving, and by how much — HTML over the plot for the
          same reason `EnvelopeGraph`'s stage letters are: a glyph drawn into a
          plot stretched to an arbitrary width comes out smeared. */}
      <span className="text-muted pointer-events-none absolute top-1 right-1.5 text-[9px] font-semibold tracking-wide uppercase">
        {LFO_DESTINATION_LABELS[lfo.destination]} {formatLfoAmount(lfo)}
      </span>
    </div>
  );
}
