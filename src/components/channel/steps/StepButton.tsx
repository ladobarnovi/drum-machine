"use client";

type StepButtonProps = {
  active: boolean;
  isCurrent: boolean;
  isDownbeat: boolean;
  label: string;
  onToggle: () => void;
};

export default function StepButton({
  active,
  isCurrent,
  isDownbeat,
  label,
  onToggle,
}: StepButtonProps) {
  const fill = active
    ? "border-accent-soft bg-accent hover:bg-accent-soft"
    : isDownbeat
      ? "border-step-beat-edge bg-step-beat hover:bg-step-beat-hover"
      : "border-step-edge bg-step hover:bg-step-hover";
  const playhead = isCurrent
    ? "ring-select ring-offset-surface ring-2 ring-offset-1"
    : "";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onToggle}
      className={`h-12 flex-1 rounded border transition-colors ${fill} ${playhead}`}
    />
  );
}
