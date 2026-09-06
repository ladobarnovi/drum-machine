"use client";

import { useCallback, useState } from "react";

/** Where a menu was raised, alongside whatever it was raised on. */
export type ContextMenuAnchor<T> = T & { x: number; y: number };

/**
 * One open-at-a-pointer menu: what it belongs to, and where it was raised.
 *
 * The step grid, the channel pads, the pattern slots and the scene slots each
 * had this written out — a `{…, x, y} | null` state, a callback that set it and
 * a callback that cleared it. `T` is the part that differs: `{ index: number }`
 * for the three that are addressed by slot, `{ channelId: string }` for the
 * pads.
 *
 * Held open one at a time per menu rather than in one shared slot, because they
 * are raised from different places and nothing in the UI wants two of them at
 * once — closing the others is the browser's job, not this hook's.
 */
export function useContextMenuAnchor<T>() {
  const [anchor, setAnchor] = useState<ContextMenuAnchor<T> | null>(null);

  const open = useCallback((target: T, x: number, y: number) => {
    setAnchor({ ...target, x, y });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  return { anchor, open, close };
}
