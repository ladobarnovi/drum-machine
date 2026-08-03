"use client";

import StepButton from "./StepButton";
import { isDownbeat } from "@/lib/sequencer";

type StepRowProps = {
  channelLabel: string;
  steps: boolean[];
  currentStep: number | null;
  onToggleStep: (stepIndex: number) => void;
};

export default function StepRow({
  channelLabel,
  steps,
  currentStep,
  onToggleStep,
}: StepRowProps) {
  return (
    <div className="flex flex-1 gap-1">
      {steps.map((active, stepIndex) => (
        <div
          key={stepIndex}
          className={`flex flex-1 ${isDownbeat(stepIndex) && stepIndex > 0 ? "ml-2" : ""}`}
        >
          <StepButton
            active={active}
            isCurrent={currentStep === stepIndex}
            isDownbeat={isDownbeat(stepIndex)}
            label={`Channel ${channelLabel} step ${stepIndex + 1}`}
            onToggle={() => onToggleStep(stepIndex)}
          />
        </div>
      ))}
    </div>
  );
}
