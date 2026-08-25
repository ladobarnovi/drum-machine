"use client";

import FxDelayTile from "./FxDelayTile";
import FxPhaserTile from "./FxPhaserTile";
import FxReverbTile from "./FxReverbTile";
import { isSendClosed } from "@/lib/sequencer";

type FxGraphProps = {
  delaySend: number;
  reverbSend: number;
  phaserSend: number;
};

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
      <FxDelayTile send={delaySend} />
      <FxReverbTile send={reverbSend} />
      <FxPhaserTile send={phaserSend} />
    </div>
  );
}

/** How a send reads in the row's label, matching the knobs' own readouts. */
function describe(send: number): string {
  return isSendClosed(send) ? "off" : `${Math.round(send * 100)}%`;
}
