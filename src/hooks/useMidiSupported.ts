"use client";

import { useSyncExternalStore } from "react";

import { isMidiSupported } from "@/lib/midi";

/** No-op: a browser's Web MIDI support doesn't change mid-session. */
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the browser supports Web MIDI at all, read through
 * `useSyncExternalStore` rather than a plain state-and-effect pair — the same
 * way the theme and the pattern banks read their own browser-only state — so
 * the first client render already matches what the server rendered.
 * `navigator` doesn't exist there, and a mismatch here would fail hydration
 * outright rather than just warn about it.
 */
export function useMidiSupported(): boolean {
  return useSyncExternalStore(subscribe, isMidiSupported, getServerSnapshot);
}
