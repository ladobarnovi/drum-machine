"use client";

import type { ReactNode } from "react";

type PlotFrameProps = {
  /** The plot's own coordinate space, which the SVG stretches to fill. */
  width: number;
  height: number;
  /**
   * Read by screen readers. Omitted for a plot that says nothing a control
   * beside it does not already say, which is then hidden outright rather than
   * announced as an unlabelled image.
   */
  label?: string;
  /** The SVG the plot is drawn as. */
  children: ReactNode;
  /**
   * HTML laid over the plot — stage letters, a destination readout. Kept out of
   * the SVG because a glyph drawn into a space stretched to an arbitrary width
   * comes out smeared.
   */
  overlay?: ReactNode;
};

/**
 * The bordered card every plot in the channel editor is drawn on: the filter
 * response, the envelope, the LFO and the three FX tiles.
 *
 * All four had the same frame and the same SVG shell written out. Sharing them
 * is what keeps the row of tiles and the graphs above reading as one set of
 * pictures rather than as four that happen to look similar.
 *
 * `preserveAspectRatio="none"` on purpose: these are shape overviews, not plots
 * anyone measures a value off, so they stretch to whatever width they are given.
 * Every stroke inside is non-scaling, so nothing comes out thicker in one
 * direction than the other for it.
 */
export default function PlotFrame({
  width,
  height,
  label,
  children,
  overlay,
}: PlotFrameProps) {
  return (
    <div className="border-line bg-panel relative h-16 overflow-hidden rounded border md:h-24">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        {...(label
          ? { role: "img", "aria-label": label }
          : { "aria-hidden": true })}
        className="text-audio size-full"
      >
        {children}
      </svg>

      {overlay}
    </div>
  );
}
