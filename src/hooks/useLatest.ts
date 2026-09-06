"use client";

import { useEffect, useRef } from "react";

/**
 * A ref that always holds the most recent `value`.
 *
 * For the callbacks that things outside React reach for: a MIDI port's
 * `onmidimessage`, a scheduler pump, a `setTimeout`. Those live longer than the
 * render that set them up, so closing over a prop would pin them to whatever it
 * was at the time — but listing the prop as a dependency would tear the
 * listener down and rebuild it on every render instead.
 *
 * Written out by hand this is a `useRef` and a `useEffect` per value, and there
 * were nine of them across the MIDI and transport hooks; `useMidiInput` alone
 * had five in a row.
 *
 * The write happens after commit, so a caller that fires between a render and
 * its effects sees the previous value — fine for the event handlers this is
 * for, and worth knowing before using it for anything else.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
