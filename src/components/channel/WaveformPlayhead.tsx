"use client";

import { useEffect, useRef } from "react";

import { onStrip } from "@/lib/waveform";

type WaveformPlayheadProps = {
  getPlayhead: () => number | null;
  reversed: boolean;
};

/**
 * The line that walks the strip with the hit, from one handle to the other.
 *
 * Nothing here goes through React state, for the same reason the gain reduction
 * meter keeps out of it: the position moves with the audio clock, and putting it
 * through a `useState` would re-render the whole sample card — the name, the
 * slot, the shape and both handles — sixty times a second to move one line.
 *
 * So the position is pulled once a frame and written straight to the node, and
 * only when it has actually changed: a channel sitting silent between hits is a
 * map lookup that misses and nothing else.
 */
export default function WaveformPlayhead({
  getPlayhead,
  reversed,
}: WaveformPlayheadProps) {
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let shown: string | null = null;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const line = lineRef.current;
      if (!line) return;

      const position = getPlayhead();
      // The empty string stands for silence, which is also what makes the two
      // writes below one decision: the line is put where the hit has reached and
      // shown, or it is cleared and hidden, and it can never be left visible at
      // wherever the last hit happened to stop.
      const left =
        position === null ? "" : `${onStrip(position, reversed) * 100}%`;
      if (left === shown) return;

      shown = left;
      line.style.left = left;
      line.style.opacity = position === null ? "0" : "1";
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getPlayhead, reversed]);

  return (
    // Hidden from assistive technology: it is a picture of a sound already
    // playing, and there is nothing here to read out or to operate.
    //
    // `--fg`, which is the one colour in a theme guaranteed to carry against
    // the panel behind the strip: the accent is what the shape is drawn in and
    // `--select` is already both handles, so a line taking either would have to
    // be read against the very thing it is crossing.
    <span
      ref={lineRef}
      aria-hidden
      className="bg-fg pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 opacity-0"
    />
  );
}
