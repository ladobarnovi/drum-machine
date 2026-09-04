"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getScenesSnapshot,
  getServerScenesSnapshot,
  setScenes as setStoredScenes,
  subscribeToScenes,
} from "@/lib/sceneStore";
import { captureScene, clampSceneName, type Scene } from "@/lib/scenes";
import type { Channel } from "@/lib/sequencer";

/**
 * The eight scene slots, read straight from the external store in
 * `lib/sceneStore` (see there for why), plus the three ways to change one.
 *
 * Nothing here tracks which scene is current. That is derived from the live
 * channels by `activeSceneIndex` wherever it is shown, so there is no marker
 * to keep in step with a mute button someone pressed by hand — unlike
 * `useBanks`, which does have to clear its own.
 */
export function useScenes() {
  const scenes = useSyncExternalStore(
    subscribeToScenes,
    getScenesSnapshot,
    getServerScenesSnapshot,
  );

  const writeScene = useCallback(
    (sceneIndex: number, scene: Scene | null) => {
      setStoredScenes(
        scenes.map((current, index) =>
          index === sceneIndex ? scene : current,
        ),
      );
    },
    [scenes],
  );

  /**
   * Captures the live mutes into a slot, keeping whatever it was already
   * called — saving over a scene you have named should not cost you the name.
   */
  const saveScene = useCallback(
    (sceneIndex: number, channels: Channel[]) => {
      writeScene(
        sceneIndex,
        captureScene(channels, scenes[sceneIndex]?.name ?? ""),
      );
    },
    [scenes, writeScene],
  );

  const renameScene = useCallback(
    (sceneIndex: number, name: string) => {
      const scene = scenes[sceneIndex];
      // Nothing to name until something is saved there: a name on an empty
      // slot would be a scene that silences nothing, which is not the same
      // thing as a slot nobody has used.
      if (!scene) return;
      writeScene(sceneIndex, { ...scene, name: clampSceneName(name) });
    },
    [scenes, writeScene],
  );

  const clearScene = useCallback(
    (sceneIndex: number) => {
      writeScene(sceneIndex, null);
    },
    [writeScene],
  );

  return { scenes, saveScene, renameScene, clearScene };
}
