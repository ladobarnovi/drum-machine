import { createPersistedStore } from "./persistedStore";
import { SCENES_STORAGE_KEY, createInitialScenes, type Scenes } from "./scenes";

/*
 * Global rather than per-bank, the same way the kit is: a scene says which of
 * the sixteen channels are playing, and the kit is shared across every bank.
 */
const store = createPersistedStore<Scenes>({
  key: SCENES_STORAGE_KEY,
  initial: createInitialScenes,
  parse: (value) => (Array.isArray(value) ? (value as Scenes) : null),
});

export const subscribeToScenes = store.subscribe;
export const getScenesSnapshot = store.getSnapshot;
export const getServerScenesSnapshot = store.getServerSnapshot;
export const setScenes = store.set;
