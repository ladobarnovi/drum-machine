"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  AUDIO_OUTPUT_STORAGE_KEY,
  SYSTEM_DEFAULT_SINK_ID,
  isAudioOutputSelectionSupported,
  listAudioOutputs,
  requestAudioOutputNames,
  type AudioOutputDevice,
} from "@/lib/audioOutput";

/** No-op: a browser's `setSinkId` support doesn't change mid-session. */
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

type UseAudioOutputOptions = {
  /**
   * Hands the chosen sink to the audio graph. Applied to the live context if
   * there is one and remembered for the one that gets built otherwise, exactly
   * as the master stages' `apply*` functions do — see `useSampleBank`.
   */
  applyAudioOutput: (sinkId: string) => void;
};

/**
 * Chooses which speakers, interface or headphones the machine plays out of,
 * for the browsers that can be told (see `lib/audioOutput`).
 *
 * The list is re-read on `devicechange`, so plugging in an interface mid-session
 * puts it in the picker without a reload — and pulling one out that was being
 * played through drops it from the list, leaving the selection pointing at
 * something gone until the system default is picked back up.
 */
export function useAudioOutput({ applyAudioOutput }: UseAudioOutputOptions) {
  const supported = useSyncExternalStore(
    subscribe,
    isAudioOutputSelectionSupported,
    getServerSnapshot,
  );

  const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
  const [namesHidden, setNamesHidden] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState(
    SYSTEM_DEFAULT_SINK_ID,
  );

  const refresh = useCallback(async () => {
    const list = await listAudioOutputs();
    setOutputs(list.devices);
    setNamesHidden(list.namesHidden);
    return list.devices;
  }, []);

  // Restores a previous session's choice once there is something to restore it
  // onto, the way `useMidiInput` does: a saved id with no matching device is
  // left alone rather than handed to `setSinkId` to reject.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    const sync = async () => {
      const devices = await refresh();
      if (cancelled || restoredRef.current) return;
      restoredRef.current = true;

      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY);
      } catch {
        // Some privacy modes refuse storage outright; nothing to restore.
      }
      if (!savedId || !devices.some((device) => device.id === savedId)) return;

      setSelectedOutputId(savedId);
      applyAudioOutput(savedId);
    };

    void sync();

    // Fires on plug and unplug alike, and after the names are unlocked.
    const handleDeviceChange = () => void refresh();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [applyAudioOutput, refresh, supported]);

  const selectOutput = useCallback(
    (id: string) => {
      setSelectedOutputId(id);
      applyAudioOutput(id);

      try {
        if (id === SYSTEM_DEFAULT_SINK_ID) {
          localStorage.removeItem(AUDIO_OUTPUT_STORAGE_KEY);
        } else {
          localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, id);
        }
      } catch {
        // Still selected for this visit; it just won't be waiting next time.
      }
    },
    [applyAudioOutput],
  );

  const revealNames = useCallback(async () => {
    const granted = await requestAudioOutputNames();
    if (granted) await refresh();
    return granted;
  }, [refresh]);

  return {
    supported,
    outputs,
    selectedOutputId,
    selectOutput,
    namesHidden,
    revealNames,
  };
}
