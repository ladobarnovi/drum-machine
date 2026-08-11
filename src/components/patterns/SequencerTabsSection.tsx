"use client";

import BankGrid from "./BankGrid";
import PatternGrid from "./PatternGrid";
import ChannelEditor from "@/components/channel/ChannelEditor";
import RailTabs from "@/components/ui/RailTabs";
import type { Bank } from "@/lib/patterns";
import type { Channel, StepFill, SwipeTarget } from "@/lib/sequencer";

type SequencerTabsSectionProps = {
  channel: Channel;
  currentStep: number | null;
  editingStep: number | null;
  swipeTarget: SwipeTarget;
  onStepClick: (stepIndex: number) => void;
  onStepHold: (stepIndex: number) => void;
  onStepVelocityChange: (stepIndex: number, velocity: number) => void;
  onStepPitchChange: (stepIndex: number, semitones: number) => void;
  onStepSliceChange: (stepIndex: number, slice: number) => void;
  onStepProbabilityChange: (stepIndex: number, probability: number) => void;
  onStepRepeatChange: (stepIndex: number, repeatCount: number) => void;
  onStepContextMenu: (stepIndex: number, x: number, y: number) => void;
  onSwipeTargetChange: (target: SwipeTarget) => void;
  onApplyStepFill: (fill: StepFill) => void;
  onNudgeSteps: (offset: number) => void;
  onClearSteps: () => void;
  onInvertSteps: () => void;
  onHumanizeSteps: () => void;
  onLengthChange: (length: number) => void;

  banks: Bank[];
  selectedBankIndex: number;
  /** Which slot of the browsed bank is currently loaded, or null if none is. */
  activePatternIndex: number | null;
  onSelectBank: (index: number) => void;
  onLoadPattern: (index: number) => void;
  onPatternContextMenu: (index: number, x: number, y: number) => void;
};

/**
 * What used to be the plain "Sequencer" card is now three tabs sharing it:
 * the live step grid, the pattern slots of the bank being browsed, and the
 * bank slots themselves. One card rather than three, so switching tabs reads
 * as changing what you're looking at rather than moving to a different part
 * of the page.
 */
export default function SequencerTabsSection({
  channel,
  currentStep,
  editingStep,
  swipeTarget,
  onStepClick,
  onStepHold,
  onStepVelocityChange,
  onStepPitchChange,
  onStepSliceChange,
  onStepProbabilityChange,
  onStepRepeatChange,
  onStepContextMenu,
  onSwipeTargetChange,
  onApplyStepFill,
  onNudgeSteps,
  onClearSteps,
  onInvertSteps,
  onHumanizeSteps,
  onLengthChange,
  banks,
  selectedBankIndex,
  activePatternIndex,
  onSelectBank,
  onLoadPattern,
  onPatternContextMenu,
}: SequencerTabsSectionProps) {
  return (
    <RailTabs
      label="Sequencer view"
      variant="panel"
      tabs={[
        {
          id: "sequencer",
          label: "Sequencer",
          panel: (
            <ChannelEditor
              channel={channel}
              showSequencerOnly={true}
              currentStep={currentStep}
              editingStep={editingStep}
              swipeTarget={swipeTarget}
              onStepClick={onStepClick}
              onStepHold={onStepHold}
              onStepVelocityChange={onStepVelocityChange}
              onStepPitchChange={onStepPitchChange}
              onStepSliceChange={onStepSliceChange}
              onStepProbabilityChange={onStepProbabilityChange}
              onStepRepeatChange={onStepRepeatChange}
              onStepContextMenu={onStepContextMenu}
              onSwipeTargetChange={onSwipeTargetChange}
              onApplyStepFill={onApplyStepFill}
              onNudgeSteps={onNudgeSteps}
              onClearSteps={onClearSteps}
              onInvertSteps={onInvertSteps}
              onHumanizeSteps={onHumanizeSteps}
              onLengthChange={onLengthChange}
            />
          ),
        },
        {
          id: "patterns",
          label: "Patterns",
          panel: (
            <PatternGrid
              bankIndex={selectedBankIndex}
              bank={banks[selectedBankIndex]}
              activePatternIndex={activePatternIndex}
              onLoad={onLoadPattern}
              onContextMenu={onPatternContextMenu}
            />
          ),
        },
        {
          id: "banks",
          label: "Banks",
          panel: (
            <BankGrid
              banks={banks}
              selectedBankIndex={selectedBankIndex}
              onSelect={onSelectBank}
            />
          ),
        },
      ]}
    />
  );
}
