"use client";

/**
 * Which edge the tab is pinned to, and which way its chevron points — inward,
 * the way the rail travels as it slides in. Written out in full rather than
 * composed from fragments, so Tailwind sees every class it has to generate in
 * the source.
 */
const SIDE_CLASSES = {
  left: {
    edge: "left-0 rounded-r-lg border-y border-r",
    chevron: "M7 4l6 6-6 6",
  },
  right: {
    edge: "right-0 rounded-l-lg border-y border-l",
    chevron: "M13 4l-6 6 6 6",
  },
} as const;

type SidebarTabProps = {
  side: "left" | "right";
  /** Names the rail in the button's label, e.g. "Show effects". */
  label: string;
  /** The rail this opens, for `aria-controls`. */
  controls: string;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * The handle that pulls a rail in below `lg`, where the rails are drawers. It
 * floats against its own edge at the middle of the viewport rather than sitting
 * in the header: half-way down the screen is where a thumb already is on a
 * phone, and it keeps the header for the machine's own controls.
 *
 * It sits below the drawer's backdrop, so opening one rail covers both tabs
 * along with everything else — the backdrop and Escape are the ways back out.
 */
export default function SidebarTab({
  side,
  label,
  controls,
  isOpen,
  onToggle,
}: SidebarTabProps) {
  const { edge, chevron } = SIDE_CLASSES[side];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={isOpen}
      aria-controls={controls}
      className={`border-edge bg-surface text-muted hover:bg-raised hover:text-fg fixed top-1/2 z-20 -translate-y-1/2 px-2 py-3 transition-colors lg:hidden ${edge}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5"
      >
        <path d={chevron} />
      </svg>
    </button>
  );
}
