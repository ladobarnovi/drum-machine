"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A flag that goes true when raised and falls back on its own.
 *
 * The "Saved" that a button shows for a moment after it is pressed. Four
 * components had this written out: the flag, a timeout ref, an unmount effect
 * clearing it, and a raise that restarts rather than extends.
 *
 * Restarting matters. Pressing Save twice in quick succession should confirm
 * twice, and leaving the first timer to run would let the second press go
 * unacknowledged.
 *
 * @param durationMs How long the flag stays raised.
 */
export function useTransientFlag(durationMs: number) {
  const [raised, setRaised] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropped on unmount, so a pending fall can't set state on a component that
  // has gone.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const raise = useCallback(() => {
    setRaised(true);

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setRaised(false), durationMs);
  }, [durationMs]);

  /**
   * Drops it early, cancelling the pending fall. For the arm-then-confirm case,
   * where acting on the raised flag has to clear it rather than wait it out.
   */
  const lower = useCallback(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setRaised(false);
  }, []);

  return [raised, raise, lower] as const;
}
