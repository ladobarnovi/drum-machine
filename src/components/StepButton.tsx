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
    ? "border-orange-400 bg-orange-500 hover:bg-orange-400"
    : isDownbeat
      ? "border-neutral-300 bg-neutral-200 hover:bg-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
      : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700";
  const playhead = isCurrent
    ? "ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-neutral-900"
    : "";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onToggle}
      className={`h-9 flex-1 rounded border transition-colors ${fill} ${playhead}`}
    />
  );
}
