"use client";

import { useRef, useState } from "react";

export type RailTab = {
  id: string;
  label: string;
  panel: React.ReactNode;
};

type RailTabsProps = {
  /** Names the tab strip for a screen reader, e.g. "Effects". */
  label: string;
  /** At least one; the first is what shows until another is picked. */
  tabs: RailTab[];
  /**
   * "rail" (the default) is sized for the narrow FX sidebar this component
   * started in. "panel" is sized for a full page column — larger, sentence
   * case rather than small caps — for the Sequencer/Patterns/Banks switcher,
   * which has no rail to fit inside.
   */
  variant?: "rail" | "panel";
};

const TAB_BUTTON_CLASS: Record<"rail" | "panel", string> = {
  rail: "px-2 py-1 text-[10px] font-semibold tracking-wide uppercase",
  panel: "px-3 py-1.5 text-xs font-semibold sm:text-sm",
};

// "rail" sits loose in the sidebar column, so its strip is a pill of its own.
// "panel" sits inside a bordered card, so its strip fuses into that card as a
// header instead of nesting a second bordered box inside the first.
const CONTAINER_CLASS: Record<"rail" | "panel", string> = {
  rail: "flex flex-col gap-3",
  panel: "border-line flex flex-col rounded-md border",
};

const TABLIST_CLASS: Record<"rail" | "panel", string> = {
  rail: "border-line rounded-md border p-1",
  panel: "border-line border-b p-2",
};

const TABPANEL_CLASS: Record<"rail" | "panel", string> = {
  rail: "flex flex-col gap-3",
  panel: "flex flex-col gap-3 p-4",
};

/**
 * A rail's worth of controls split across tabs, where `RailGroup` would stack
 * the same content in labelled bands.
 *
 * Worth the switch where the bands are long enough that reaching the lower one
 * means scrolling past the upper one every time: the effects rail carries six
 * stages of several sliders each, and a tab strip turns finding the compressor
 * from a scroll into a click.
 *
 * Only the open panel is rendered. Everything a stage holds lives above this in
 * the machine's own state and the audio graph, so a panel that is not on screen
 * has nothing to lose by not existing — and mounting all of them to keep them
 * hidden would leave the rail's scroll height set by the longest one.
 */
export default function RailTabs({ label, tabs, variant = "rail" }: RailTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Falls back to the first tab rather than to nothing, so a tab removed from
  // under the selection can never leave the rail blank.
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId),
  );
  const active = tabs[activeIndex];

  /**
   * The arrow keys move between tabs and take the focus with them, which is
   * what the tab pattern asks for: only the selected tab is in the page's tab
   * order, so the arrows are the only way to reach the others from the
   * keyboard.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    let next = activeIndex;
    if (offset !== 0) {
      // Wrapped, so the ends of the strip run into each other rather than
      // stopping dead.
      next = (activeIndex + offset + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    // The arrows would otherwise scroll the rail out from under the strip.
    event.preventDefault();
    setActiveId(tabs[next].id);
    buttonsRef.current[next]?.focus();
  };

  return (
    <section className={CONTAINER_CLASS[variant]}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className={`flex gap-1 ${TABLIST_CLASS[variant]}`}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === active.id;

          return (
            <button
              key={tab.id}
              ref={(button) => {
                buttonsRef.current[index] = button;
              }}
              type="button"
              role="tab"
              id={`${tab.id}-tab`}
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              // Roving, so Tab lands on the strip once and moves on rather than
              // walking through every tab on the way into the panel.
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={`flex-1 rounded transition-colors ${TAB_BUTTON_CLASS[variant]} ${
                isActive
                  ? "bg-accent text-on-accent"
                  : "text-muted hover:bg-raised"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${active.id}-panel`}
        aria-labelledby={`${active.id}-tab`}
        className={TABPANEL_CLASS[variant]}
      >
        {active.panel}
      </div>
    </section>
  );
}
