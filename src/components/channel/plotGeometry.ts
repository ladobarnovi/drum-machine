/**
 * The coordinate space the filter, envelope and LFO graphs share, and the path
 * builder all three measure against.
 *
 * One space rather than three: the graphs sit in the same stack of tabs at the
 * same size, so a viewBox that drifted between them would show as a difference
 * in what the channel is doing rather than in how it was drawn. The FX tiles
 * keep their own, smaller space in `fxTileGeometry` — they are a row of three
 * at a different scale.
 */
export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 400;

export const toX = (position: number) => position * VIEWBOX_WIDTH;

/**
 * An open outline through `points`.
 *
 * The vertical mapping is the caller's: an envelope reads its level from the
 * top, the filter converts decibels to a depth, and the LFO swings either side
 * of a centre line.
 */
export function linePath<T>(
  points: T[],
  x: (point: T) => number,
  y: (point: T) => number,
): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(point)} ${y(point)}`)
    .join(" ");
}
