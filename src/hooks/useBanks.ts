"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import {
  getBanksSnapshot,
  getServerBanksSnapshot,
  setBanks as setStoredBanks,
  subscribeToBanks,
} from "@/lib/bankStore";
import { capturePattern, type Pattern } from "@/lib/patterns";
import type { Channel } from "@/lib/sequencer";

export type ActivePatternRef = { bankIndex: number; patternIndex: number };

/**
 * Sixteen banks of sixteen patterns each. The banks themselves are read
 * straight from the external store in `lib/bankStore` (see there for why);
 * this hook adds the two pieces of state that are session-only rather than
 * persisted — which bank is being browsed, and which slot is currently
 * loaded — plus the mutation helpers, scoped to whichever bank that is.
 */
export function useBanks() {
  const banks = useSyncExternalStore(
    subscribeToBanks,
    getBanksSnapshot,
    getServerBanksSnapshot,
  );
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [activePattern, setActivePattern] = useState<ActivePatternRef | null>(
    null,
  );

  const selectBank = useCallback((index: number) => {
    setSelectedBankIndex(index);
  }, []);

  /** The pattern in the browsed bank's given slot, or null for an empty one. */
  const getPattern = useCallback(
    (patternIndex: number): Pattern | null =>
      banks[selectedBankIndex]?.patterns[patternIndex] ?? null,
    [banks, selectedBankIndex],
  );

  /** Captures the live kit into the browsed bank's given slot. */
  const savePattern = useCallback(
    (patternIndex: number, channels: Channel[]) => {
      const captured = capturePattern(channels);

      setStoredBanks(
        banks.map((bank, bankIndex) => {
          if (bankIndex !== selectedBankIndex) return bank;
          const patterns = [...bank.patterns];
          patterns[patternIndex] = captured;
          return { patterns };
        }),
      );
      setActivePattern({ bankIndex: selectedBankIndex, patternIndex });
    },
    [banks, selectedBankIndex],
  );

  const deletePattern = useCallback(
    (patternIndex: number) => {
      setStoredBanks(
        banks.map((bank, bankIndex) => {
          if (bankIndex !== selectedBankIndex) return bank;
          const patterns = [...bank.patterns];
          patterns[patternIndex] = null;
          return { patterns };
        }),
      );

      // Clears the active marker only if the slot just emptied was the one it
      // pointed at — deleting some other saved pattern shouldn't disturb what
      // the live grid is currently showing as loaded.
      setActivePattern((current) =>
        current?.bankIndex === selectedBankIndex &&
        current?.patternIndex === patternIndex
          ? null
          : current,
      );
    },
    [banks, selectedBankIndex],
  );

  /** Marks a slot in the browsed bank as the one currently loaded. */
  const markPatternActive = useCallback(
    (patternIndex: number) => {
      setActivePattern({ bankIndex: selectedBankIndex, patternIndex });
    },
    [selectedBankIndex],
  );

  return {
    banks,
    selectedBankIndex,
    selectBank,
    activePattern,
    getPattern,
    savePattern,
    deletePattern,
    markPatternActive,
  };
}
