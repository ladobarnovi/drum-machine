"use client";

export const FX_SIDEBAR_ID = "fx-sidebar";
export const CONTROLS_SIDEBAR_ID = "controls-sidebar";

/**
 * Which edge the rail is pinned to, only meaningful from `lg` up — below that
 * this renders in normal document flow, not against either edge.
 */
const SIDE_CLASSES = {
  left: "lg:left-0 lg:border-r",
  right: "lg:right-0 lg:border-l",
} as const;

type SidebarProps = {
  id: string;
  side: "left" | "right";
  /** Names the rail for assistive tech, e.g. "Effects". */
  label: string;
  /**
   * Whether this is the page showing below `lg`, where the machine displays
   * Settings, Main or FX one at a time instead of three rails side by side.
   * Ignored from `lg` up, where the rail is always on screen.
   */
  mobileActive: boolean;
  children: React.ReactNode;
};

/**
 * Rail pinned to one edge of the viewport from `lg` up, alongside the main
 * column exactly as before. Below that it is one of three pages sharing the
 * same slot between the header and the footer nav, in normal document flow
 * rather than sliding in over the content — switching to it is a navigation,
 * not opening a drawer, so nothing here needs a backdrop or an escape hatch
 * back out.
 */
export default function Sidebar({
  id,
  side,
  label,
  mobileActive,
  children,
}: SidebarProps) {
  return (
    <aside
      id={id}
      aria-label={label}
      className={`quiet-scrollbar border-line bg-surface w-full min-h-0 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 ${SIDE_CLASSES[side]} ${
        mobileActive ? "flex flex-1" : "hidden"
      }`}
    >
      {children}
    </aside>
  );
}
