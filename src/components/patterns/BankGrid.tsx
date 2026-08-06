"use client";

import SlotButton from "./SlotButton";
import { isBankEmpty, type Bank } from "@/lib/patterns";

type BankGridProps = {
  banks: Bank[];
  selectedBankIndex: number;
  /** Only changes which bank's patterns are browsed — never touches playback. */
  onSelect: (index: number) => void;
};

/** The sixteen bank slots. No context menu yet — clicking only browses. */
export default function BankGrid({
  banks,
  selectedBankIndex,
  onSelect,
}: BankGridProps) {
  return (
    <div
      role="group"
      aria-label="Banks"
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {banks.map((bank, index) => (
        <SlotButton
          key={index}
          index={index}
          variant="bank"
          filled={!isBankEmpty(bank)}
          active={selectedBankIndex === index}
          label={`Bank ${index + 1}`}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
