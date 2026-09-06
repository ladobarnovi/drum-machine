/**
 * Reading values back out of something this app did not write.
 *
 * A shared beat arrives from a URL a stranger composed; a session comes back
 * out of `localStorage`, where anything could have happened to it. Both are
 * parsed JSON — `unknown` in the type system and genuinely unknown in fact — so
 * every field is checked on the way in rather than cast and hoped for.
 *
 * `patternShare` and `sessionAutosave` each had their own copy of these two,
 * byte for byte.
 */

/** Whether a parsed value is a plain object with fields to read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A finite number, or the fallback for anything else.
 *
 * Finite rather than merely numeric: `JSON.parse` cannot produce NaN or
 * Infinity, but a hand-edited value in dev tools can, and one reaching an
 * `AudioParam` takes the node with it.
 */
export function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** A string, or the fallback for anything else. */
export function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
