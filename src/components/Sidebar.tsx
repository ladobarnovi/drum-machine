"use client";

import { useEffect } from "react";

export const FX_SIDEBAR_ID = "fx-sidebar";
export const CONTROLS_SIDEBAR_ID = "controls-sidebar";

/**
 * Which edge the rail is pinned to, and which way it leaves the screen. Written
 * out in full rather than composed from fragments, so Tailwind sees every class
 * it has to generate in the source.
 */
const SIDE_CLASSES = {
  left: { edge: "left-0 border-r", offscreen: "-translate-x-full" },
  right: { edge: "right-0 border-l", offscreen: "translate-x-full" },
} as const;

type SidebarProps = {
  id: string;
  side: "left" | "right";
  /** Names the rail in the backdrop's label, e.g. "Close effects". */
  label: string;
  /** Only meaningful below `lg`, where the sidebar is an overlay drawer. */
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Rail pinned to one edge of the viewport. From `lg` up it is always on screen;
 * below that it slides in over the content as a drawer. Two of them flank the
 * page — what drives the machine on the left, what it is put through on the
 * right — and `lg` is where both fit beside the pattern rather than on top of
 * it.
 */
export default function Sidebar({
  id,
  side,
  label,
  isOpen,
  onClose,
  children,
}: SidebarProps) {
  // The header's toggle sits under the backdrop while the drawer is open, so
  // Escape is the keyboard way back out.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { edge, offscreen } = SIDE_CLASSES[side];

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={onClose}
          className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden"
        />
      )}

      <aside
        id={id}
        // `invisible` keeps the off-screen drawer out of the tab order; it is
        // in the transition so it only takes effect once the slide-out ends.
        // `lg:visible` overrides it from `lg` up, where the rail is permanent.
        // Wider as a drawer than as a rail: nothing shares the screen with it
        // on a phone, so the controls get the extra room. It stops short of the
        // full width to leave a strip of backdrop to tap back out through.
        // From `lg` it narrows to the width the page's own padding clears.
        className={`quiet-scrollbar fixed inset-y-0 z-40 flex w-80 max-w-[85%] flex-col gap-6 overflow-y-auto border-neutral-200 bg-white p-6 transition-[transform,visibility] duration-200 ease-out lg:visible lg:w-64 lg:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900 ${edge} ${
          isOpen ? "translate-x-0" : `invisible ${offscreen}`
        }`}
      >
        {children}
      </aside>
    </>
  );
}
