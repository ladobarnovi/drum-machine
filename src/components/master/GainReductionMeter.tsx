"use client";

import { useEffect, useRef } from "react";

import { decayReduction, reductionToMeter } from "@/lib/sequencer";

type GainReductionMeterProps = {
  /** Reads how much the compressor is taking off right now, in dB. */
  getReduction: () => number;
};

/**
 * How much the compressor is pulling the mix down, as a bar that fills from the
 * right.
 *
 * It runs from the right edge leftwards because that is the direction gain
 * reduction moves — the mix being pushed back down from unity — and the same
 * way the needle of a hardware meter swings. A bar growing rightwards from
 * nothing would read as a level, which is the opposite of what this shows.
 *
 * Nothing here goes through React state. Reduction is read once a frame, and a
 * `useState` would re-render the whole compressor section — five sliders and a
 * toggle — sixty times a second to move one bar and rewrite one number, so the
 * loop writes to the two nodes directly instead.
 */
export default function GainReductionMeter({
  getReduction,
}: GainReductionMeterProps) {
  const barRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let displayed = 0;

    const tick = (now: number) => {
      displayed = decayReduction(
        displayed,
        getReduction(),
        (now - previous) / 1000,
      );
      previous = now;

      const bar = barRef.current;
      if (bar) bar.style.width = `${reductionToMeter(displayed) * 100}%`;

      const readout = readoutRef.current;
      if (readout) {
        // A tenth of a dB is below what the ear notices and below what the bar
        // can show, so anything under it reads as nothing rather than as a
        // number twitching around zero while the machine sits idle.
        readout.textContent =
          displayed <= -0.1 ? `${displayed.toFixed(1)} dB` : "0 dB";
      }

      frame = requestAnimationFrame(tick);
    };

    // requestAnimationFrame rather than a timer, so a backgrounded tab stops
    // asking the audio thread for a number nobody is looking at.
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getReduction]);

  return (
    // Hidden from assistive technology outright. A figure that changes sixty
    // times a second cannot be read out usefully, and everything that decides
    // it is on the labelled sliders below.
    <div aria-hidden className="flex flex-col gap-1 text-xs">
      <span className="flex items-baseline justify-between">
        <span>Reduction</span>
        <span ref={readoutRef} className="text-muted tabular-nums">
          0 dB
        </span>
      </span>

      <span className="bg-field border-edge relative block h-2 overflow-hidden rounded-full border">
        <span
          ref={barRef}
          className="bg-accent absolute inset-y-0 right-0 w-0"
        />
      </span>
    </div>
  );
}
