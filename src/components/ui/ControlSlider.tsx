"use client";

type ControlSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "80%" or "1.2 kHz". */
  readout: string;
  onChange: (value: number) => void;
  /**
   * Whether this control is overridden on the step being edited. Only ever set
   * while a step is open, so an ordinary channel slider is unchanged.
   */
  locked?: boolean;
  /**
   * Drops that override. Passing it is what puts the clear button's column
   * beside the row, so every slider in a panel keeps its width whether or not
   * it happens to be locked — pass it to all of them or to none.
   */
  onClearLock?: () => void;
};

export default function ControlSlider({
  label,
  min,
  max,
  step,
  value,
  readout,
  onChange,
  locked = false,
  onClearLock,
}: ControlSliderProps) {
  const slider = (
    <>
      {/* Locked labels take the colour of what is being looked at, so the
          overridden rows can be picked out of the panel at a glance. */}
      <span className={`w-14 shrink-0 ${locked ? "text-select" : ""}`}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="flex-1 sm:w-32 sm:flex-none"
      />
      <span className="text-muted w-16 shrink-0 text-right tabular-nums">
        {readout}
      </span>
    </>
  );

  if (!onClearLock) {
    return <label className="flex items-center gap-2 text-xs">{slider}</label>;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="flex flex-1 items-center gap-2">{slider}</label>

      {/* Held open even when there is nothing to clear, so the rows of a panel
          stay aligned as locks come and go under them. */}
      <span className="flex w-4 shrink-0 justify-center">
        {locked && (
          <button
            type="button"
            onClick={onClearLock}
            aria-label={`Clear ${label} lock`}
            title={`Clear ${label} lock`}
            className="text-select hover:bg-raised rounded px-1 leading-none"
          >
            ×
          </button>
        )}
      </span>
    </div>
  );
}
