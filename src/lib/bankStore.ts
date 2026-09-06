import { createPersistedStore } from "./persistedStore";
import { BANKS_STORAGE_KEY, createInitialBanks, type Bank } from "./patterns";

/*
 * Kept apart from the scenes next door because a pattern and a scene are
 * different things: patterns are filed in banks and deliberately hold no kit,
 * where a scene describes the kit itself.
 */
const store = createPersistedStore<Bank[]>({
  key: BANKS_STORAGE_KEY,
  initial: createInitialBanks,
  // A minimal shape check, so a corrupted or pre-feature value can't crash the
  // app — it just falls back to sixteen empty banks.
  parse: (value) => (Array.isArray(value) ? (value as Bank[]) : null),
});

export const subscribeToBanks = store.subscribe;
export const getBanksSnapshot = store.getSnapshot;
export const getServerBanksSnapshot = store.getServerSnapshot;
export const setBanks = store.set;
