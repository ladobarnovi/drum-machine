"use client";

type SwitchProps = {
  checked: boolean;
  /** Names the switch on its own, e.g. "Play sample in reverse". */
  label: string;
  onChange: (checked: boolean) => void;
  /**
   * "sm" is the inline size, for a flag sitting in a row of text. "md" is the
   * size a stage's bypass takes, where the switch is the only control on its
   * line and has to be findable from across the rail.
   */
  size?: "sm" | "md";
  title?: string;
};

const TRACK: Record<"sm" | "md", string> = {
  sm: "h-4 w-7",
  md: "h-5 w-9",
};

const THUMB: Record<"sm" | "md", string> = {
  sm: "size-2.5 top-0.5",
  md: "size-3.5 top-0.5",
};

const THUMB_ON: Record<"sm" | "md", string> = {
  sm: "translate-x-3.5",
  md: "translate-x-4.5",
};

/**
 * A flag that is either set or not, drawn as a track and a thumb: the shape
 * says so at a glance without the label having to be read, which is what
 * separates one of these from a button that happens to stay pressed.
 *
 * A `<span>` carrying the switch role rather than a checkbox, because none of
 * these are ever submitted anywhere and the native control cannot be drawn as
 * a track and a thumb without being hidden and replaced anyway. Which means the
 * keyboard has to be wired up by hand — Space and Enter, the two keys a switch
 * answers to.
 */
export default function Switch({
  checked,
  label,
  onChange,
  size = "sm",
  title,
}: SwitchProps) {
  return (
    <span
      role="switch"
      tabIndex={0}
      aria-checked={checked}
      aria-label={label}
      title={title}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        // Only for the keys handled above, so nothing else on the page is
        // swallowed — the same rule the sliders and the trim handles follow
        // for their own key handlers.
        event.preventDefault();
        onChange(!checked);
      }}
      className={`relative shrink-0 cursor-pointer rounded-full border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        TRACK[size]
      } ${checked ? "border-accent bg-accent" : "border-edge bg-field"}`}
    >
      <span
        aria-hidden
        className={`absolute rounded-full transition-transform ${THUMB[size]} ${
          checked ? `bg-on-accent ${THUMB_ON[size]}` : "bg-fg translate-x-0.5"
        }`}
      />
    </span>
  );
}
