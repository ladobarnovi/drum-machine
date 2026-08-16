"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  PHASER_FLAT_LEVEL,
  delayPicture,
  phaserCurve,
  reverbPicture,
} from "@/lib/fxResponse";
import { isSendClosed } from "@/lib/sequencer";

type FxGraphProps = {
  delaySend: number;
  reverbSend: number;
  phaserSend: number;
};

/** Each tile's own coordinate space. Stretched to fill whatever width it gets. */
const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 40;

/** Keeps the drawing off the frame, and out from under the tile's own name. */
const PADDING = 4;
const HEADROOM = 0.82;

const BASELINE = VIEWBOX_HEIGHT - PADDING;

const toX = (position: number) => position * VIEWBOX_WIDTH;
const toY = (level: number) =>
  BASELINE - level * HEADROOM * (VIEWBOX_HEIGHT - 2 * PADDING);

/**
 * How long one turn of each tile's motion takes, in seconds — slow and lazy at
 * a send barely open, quick and busy at one wide open. Nothing is animated at
 * all below that, so a closed send is a still picture rather than a slow one.
 */
const cycleSeconds = (amount: number, atClosed: number, atOpen: number) =>
  atClosed + amount * (atOpen - atClosed);

/**
 * What each send is doing to the channel, as three pictures — the FX tab's
 * answer to `FilterGraph` and `EnvelopeGraph`.
 *
 * Three tiles rather than one plot, because these are three separate taps to
 * three separate master buses rather than three parts of one shape: there is
 * no single curve they add up to, and drawing them into one frame would invent
 * a relationship between them that the signal path does not have. Each tile
 * instead sits directly above the knob that drives it, and shows the character
 * of its own effect — repeats off a hit, a tail behind one, notches across a
 * response — with the send amount deciding how much of it there is to see.
 *
 * The motion is the half of that a still frame cannot carry. It is CSS on
 * elements that are already drawn rather than a render loop, so a tile costs
 * nothing to keep moving, and it stops dead for anyone who has asked their
 * system for less of it.
 */
export default function FxGraph({
  delaySend,
  reverbSend,
  phaserSend,
}: FxGraphProps) {
  return (
    <div
      role="img"
      aria-label={`Effect sends. Delay ${describe(delaySend)}, reverb ${describe(
        reverbSend,
      )}, phaser ${describe(phaserSend)}.`}
      className="grid grid-cols-3 gap-2"
    >
      <DelayTile send={delaySend} />
      <ReverbTile send={reverbSend} />
      <PhaserTile send={phaserSend} />
    </div>
  );
}

/** How a send reads in the row's label, matching the knobs' own readouts. */
function describe(send: number): string {
  return isSendClosed(send) ? "off" : `${Math.round(send * 100)}%`;
}

/**
 * The frame every tile shares: the well, the plot stretched to fill it, and
 * the effect's name in the corner.
 *
 * The name is HTML over the plot rather than text inside it, for the same
 * reason `EnvelopeGraph`'s stage letters are — a glyph drawn into a plot
 * stretched to an arbitrary width comes out smeared — and it sits top right
 * because that is the one corner `HEADROOM` keeps every tile's drawing out of.
 */
function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-line bg-panel relative h-16 overflow-hidden rounded border md:h-24">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        // Stretch freely, as the other two graphs do: every stroke below is
        // non-scaling, so nothing comes out thicker in one direction than in
        // the other for it.
        preserveAspectRatio="none"
        aria-hidden
        className="text-accent size-full"
      >
        {children}
      </svg>

      <span className="text-muted pointer-events-none absolute top-1 right-1.5 text-[9px] font-semibold tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

/** The floor the delay and reverb tiles stand their marks on. */
function Baseline() {
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

/**
 * The dry hit, in both tiles that have one — deliberately not in the accent,
 * since it is the signal the send is taken off rather than any part of what
 * the send does with it. A tile with nothing but this in it is a tile whose
 * send is shut.
 */
function Source({ position }: { position: number }) {
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

/** A hit and its repeats, each one lighting as it arrives. */
function DelayTile({ send }: { send: number }) {
  const { source, echoes } = delayPicture(send);
  const moving = !isSendClosed(send);
  const cycle = cycleSeconds(send, 2.4, 1.3);

  return (
    <Tile label="Delay">
      <Baseline />
      <Source position={source.position} />

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
    </Tile>
  );
}

/** A hit and the wash behind it, shimmering as it spreads out. */
function ReverbTile({ send }: { send: number }) {
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
    <Tile label="Reverb">
      <Baseline />
      <Source position={source.position} />

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
    </Tile>
  );
}

/** A response with notches cut in it, sweeping the way a phaser's do. */
function PhaserTile({ send }: { send: number }) {
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
    <Tile label="Phaser">
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
    </Tile>
  );
}
