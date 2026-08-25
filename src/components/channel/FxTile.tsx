"use client";

import type { ReactNode } from "react";

import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./fxTileGeometry";

/**
 * The frame every tile shares: the well, the plot stretched to fill it, and
 * the effect's name in the corner.
 *
 * The name is HTML over the plot rather than text inside it, for the same
 * reason `EnvelopeGraph`'s stage letters are — a glyph drawn into a plot
 * stretched to an arbitrary width comes out smeared — and it sits top right
 * because that is the one corner `HEADROOM` keeps every tile's drawing out of.
 */
export default function FxTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
