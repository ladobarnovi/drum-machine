"use client";

type ChoiceSelectProps = {
  label: string;
  /** Spelt out for screen readers, where the visible label is a shorthand. */
  ariaLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
};

/**
 * One labelled list, exactly one of whose options is taken.
 *
 * The label sits above its list rather than beside it, so three of these side
 * by side line their lists up as one band and each one gets the card's full
 * column width to show a value in — a Mode reading "Free running" beside its
 * own label would be the widest thing on the card.
 *
 * Small caps for the label, matching the tag in the corner of the plot above:
 * these name a control rather than say anything themselves, and reading as
 * captions is what keeps the values the loudest thing in the band.
 */
export default function ChoiceSelect({
  label,
  ariaLabel,
  value,
  options,
  onSelect,
}: ChoiceSelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted text-[9px] font-semibold tracking-wide uppercase">
        {label}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onSelect(event.target.value)}
          aria-label={ariaLabel}
          // Stripped of the platform's own arrow so the control is the same
          // shape on every system, and given one of its own below — the border
          // picking up the accent on hover and on focus the way the knobs above
          // light their arcs.
          className="border-edge bg-field hover:border-accent w-full cursor-pointer appearance-none rounded border py-1.5 pr-7 pl-2.5 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <svg
          viewBox="0 0 10 6"
          aria-hidden
          className="text-muted pointer-events-none absolute top-1/2 right-2.5 h-1.5 w-2.5 -translate-y-1/2"
        >
          <path
            d="M1 1 L5 5 L9 1"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
