"use client";

import { useEffect } from "react";

export const SIDEBAR_ID = "controls-sidebar";

type SidebarProps = {
  /** Only meaningful below `md`, where the sidebar is an overlay drawer. */
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Control rail pinned to the left edge of the viewport. From `md` up it is
 * always on screen; below that it slides in over the content as a drawer.
 */
export default function Sidebar({ isOpen, onClose, children }: SidebarProps) {
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

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close controls"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-neutral-900/40 md:hidden"
        />
      )}

      <aside
        id={SIDEBAR_ID}
        // `invisible` keeps the off-screen drawer out of the tab order; it is
        // in the transition so it only takes effect once the slide-out ends.
        // `md:visible` overrides it from `md` up, where the rail is permanent.
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col gap-6 overflow-y-auto border-r border-neutral-200 bg-white p-6 transition-[transform,visibility] duration-200 ease-out md:visible md:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900 ${
          isOpen ? "translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        {children}
      </aside>
    </>
  );
}
