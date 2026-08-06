"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  CHANNEL_METER_FLOOR_DB,
  amplitudeToDecibels,
  decayChannelLevel,
  isChannelMeterOver,
  levelToMeter,
} from "@/lib/sequencer";

type UseChannelMetersOptions = {
  /** Reads a channel's loudest recent sample, as a linear amplitude. */
  getChannelLevel: (channelId: string) => number;
};

/**
 * Drives every channel's level bar from one animation frame.
 *
 * One loop for all sixteen rather than a loop inside each pad: the meters all
 * want reading at the same instant against the same elapsed time, and sixteen
 * `requestAnimationFrame` callbacks would be sixteen timers doing a sixteenth
 * of this work each.
 *
 * Nothing here goes through React state, for the reason the gain reduction
 * meter already sets out — and rather more so at sixteen bars, since the pads
 * re-render on every step as it is to move the trigger highlight. The pads hand
 * their bar elements over instead and the loop writes to them directly.
 */
export function useChannelMeters({ getChannelLevel }: UseChannelMetersOptions) {
  /** The bar element of every mounted pad, by channel id. */
  const barsRef = useRef(new Map<string, HTMLElement>());
  /**
   * One ref callback per channel, kept so the same function comes back on every
   * render. A fresh one each time would have React detach and reattach every
   * bar on every step, which is the one thing this loop is avoiding.
   */
  const registrarsRef = useRef(
    new Map<string, (element: HTMLElement | null) => void>(),
  );

  const registerMeter = useCallback((channelId: string) => {
    const existing = registrarsRef.current.get(channelId);
    if (existing) return existing;

    const register = (element: HTMLElement | null) => {
      if (element) barsRef.current.set(channelId, element);
      else barsRef.current.delete(channelId);
    };

    registrarsRef.current.set(channelId, register);
    return register;
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    /** Where each bar has fallen to, in dB. Silent until a channel is heard. */
    const displayed = new Map<string, number>();

    const tick = (now: number) => {
      const elapsedSeconds = (now - previous) / 1000;
      previous = now;

      for (const [channelId, bar] of barsRef.current) {
        const was = displayed.get(channelId) ?? CHANNEL_METER_FLOOR_DB;
        const db = decayChannelLevel(
          was,
          amplitudeToDecibels(getChannelLevel(channelId)),
          elapsedSeconds,
        );

        // A bar that was already empty and has nothing to show is left alone
        // rather than written the same value again, so an idle machine — or one
        // playing four channels out of sixteen — costs no style recalculation
        // for the pads that are silent.
        if (db === was && db <= CHANNEL_METER_FLOOR_DB) continue;
        displayed.set(channelId, db);

        // scaleX rather than width: a transform is composited, where sixteen
        // width changes a frame would be sixteen layouts.
        bar.style.transform = `scaleX(${levelToMeter(db)})`;

        const over = isChannelMeterOver(db) ? "true" : "false";
        if (bar.dataset.over !== over) bar.dataset.over = over;
      }

      frame = requestAnimationFrame(tick);
    };

    // requestAnimationFrame rather than a timer, so a backgrounded tab stops
    // asking the audio thread for numbers nobody is looking at.
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getChannelLevel]);

  return registerMeter;
}
