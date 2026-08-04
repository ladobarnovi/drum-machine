"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long a pad stays fully lit after a hit. Short enough that consecutive
 * hits read as separate pulses rather than one continuous light, since the pad
 * starts fading as soon as this elapses.
 */
const FLASH_HOLD_MS = 90;

/** Shared empty value, so repeated clears don't force a render. */
const NO_FLASHES: ReadonlySet<string> = new Set();

type UseChannelFlashOptions = {
  ensureContext: () => AudioContext;
};

/**
 * Tracks which channels have just been heard, for the pad highlight.
 *
 * Hits are queued ahead of the audio clock, so a flash is held back until the
 * moment its sound is actually audible — the same lookahead correction the
 * transport applies to its playhead. Retriggering a channel mid-flash restarts
 * that channel's timer instead of letting the earlier hit cut the light short.
 */
export function useChannelFlash({ ensureContext }: UseChannelFlashOptions) {
  const [flashedChannelIds, setFlashedChannelIds] = useState(NO_FLASHES);

  /** Queued flash-on timers, kept only so they can be cancelled. */
  const onTimersRef = useRef(new Set<number>());
  /** The live flash-off timer per channel, so a retrigger can replace it. */
  const offTimersRef = useRef(new Map<string, number>());

  const clearFlashes = useCallback(() => {
    for (const timeoutId of onTimersRef.current) {
      window.clearTimeout(timeoutId);
    }
    onTimersRef.current.clear();

    for (const timeoutId of offTimersRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    offTimersRef.current.clear();

    setFlashedChannelIds(NO_FLASHES);
  }, []);

  useEffect(() => clearFlashes, [clearFlashes]);

  /** Lights `channelIds` when the audio scheduled for `time` reaches the ear. */
  const flashChannels = useCallback(
    (channelIds: readonly string[], time: number) => {
      if (channelIds.length === 0) return;

      // The context always exists by the time anything is scheduled: playback
      // and previews both create it from the gesture that starts them.
      const context = ensureContext();
      const delayMs = Math.max(0, (time - context.currentTime) * 1000);

      const onTimeoutId = window.setTimeout(() => {
        onTimersRef.current.delete(onTimeoutId);

        setFlashedChannelIds((previous) =>
          channelIds.every((channelId) => previous.has(channelId))
            ? previous
            : new Set([...previous, ...channelIds]),
        );

        for (const channelId of channelIds) {
          const pending = offTimersRef.current.get(channelId);
          if (pending !== undefined) window.clearTimeout(pending);

          const offTimeoutId = window.setTimeout(() => {
            offTimersRef.current.delete(channelId);
            setFlashedChannelIds((previous) => {
              if (!previous.has(channelId)) return previous;
              const next = new Set(previous);
              next.delete(channelId);
              return next;
            });
          }, FLASH_HOLD_MS);

          offTimersRef.current.set(channelId, offTimeoutId);
        }
      }, delayMs);

      onTimersRef.current.add(onTimeoutId);
    },
    [ensureContext],
  );

  return { flashedChannelIds, flashChannels, clearFlashes };
}
