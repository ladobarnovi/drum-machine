/**
 * The coordinate space the FX tab's three tiles are drawn in, and the handful
 * of conversions every one of them measures against.
 *
 * Shared rather than per tile: the tiles sit side by side in one row, so a
 * baseline or a headroom that drifted between them would read as a difference
 * in what the effects are doing rather than as a difference in how they were
 * drawn.
 */

/** Each tile's own coordinate space. Stretched to fill whatever width it gets. */
export const VIEWBOX_WIDTH = 100;
export const VIEWBOX_HEIGHT = 40;

/** Keeps the drawing off the frame, and out from under the tile's own name. */
export const PADDING = 4;
export const HEADROOM = 0.82;

export const BASELINE = VIEWBOX_HEIGHT - PADDING;

export const toX = (position: number) => position * VIEWBOX_WIDTH;
export const toY = (level: number) =>
  BASELINE - level * HEADROOM * (VIEWBOX_HEIGHT - 2 * PADDING);

/**
 * How long one turn of each tile's motion takes, in seconds — slow and lazy at
 * a send barely open, quick and busy at one wide open. Nothing is animated at
 * all below that, so a closed send is a still picture rather than a slow one.
 */
export const cycleSeconds = (
  amount: number,
  atClosed: number,
  atOpen: number,
) => atClosed + amount * (atOpen - atClosed);
