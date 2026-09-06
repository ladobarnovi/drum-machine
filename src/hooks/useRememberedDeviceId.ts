"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLatest } from "@/hooks/useLatest";

/**
 * Which device is selected, remembered across visits.
 *
 * Two rules, and both matter. A saved id is only restored once the device list
 * has actually arrived, and only if it names a port that is there now — so a
 * controller that has been unplugged leaves nothing selected rather than being
 * picked up silently the moment something with the same id appears. And the
 * restore is deferred to a microtask rather than set inside the effect, so the
 * effect reacting to the list is not also the render consuming its own update.
 *
 * `useMidiInput` and `useMidiClockOutput` had this written out twice, down to
 * the comments. `useAudioOutput` is deliberately not on it: its list arrives
 * from an await rather than a prop, and its selection is a sink id that is
 * never null, so the shapes only look alike from a distance.
 *
 * @param storageKey Where the id is kept.
 * @param devices The list whose arrival is what makes a restore possible.
 * @param isAvailable Whether a saved id names something currently connected.
 */
export function useRememberedDeviceId(
  storageKey: string,
  devices: readonly unknown[],
  isAvailable: (id: string) => boolean,
): [string | null, (id: string | null) => void] {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Through a ref: this is a closure over a ref-held port map, so it is a new
  // function every render and would restart the effect below each time.
  const isAvailableRef = useLatest(isAvailable);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || devices.length === 0) return;
    restoredRef.current = true;

    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem(storageKey);
    } catch {
      // Some privacy modes refuse storage outright; nothing to restore.
    }
    if (!savedId || !isAvailableRef.current(savedId)) return;

    const id = savedId;
    queueMicrotask(() => setSelectedId(id));
  }, [devices, storageKey, isAvailableRef]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      try {
        if (id) localStorage.setItem(storageKey, id);
        else localStorage.removeItem(storageKey);
      } catch {
        // Still selected for this visit; it just won't be waiting next time.
      }
    },
    [storageKey],
  );

  return [selectedId, select];
}
