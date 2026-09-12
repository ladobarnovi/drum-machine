"use client";

import { useRef, useState } from "react";

export type RailTab = {
  id: string;
  label: string;
  panel: React.ReactNode;
};

type RailTabsProps = {
  /**
   * Put on the section itself, for anything that needs to find this card on
   * the page — the step-edit bar scrolls back to one by id.
   */
  id?: string;
  /** Names the tab strip for a screen reader, e.g. "Effects". */
  label: string;
  /** At least one; the first is what shows until another is picked. */
  tabs: RailTab[];
  /**
   * Opens on this tab instead of the first, for a caller that knows which one
   * the reader is after — the `?` shortcut jumping straight past MIDI and
   * Sound to the shortcut list it was pressed to find. Falls back to the
   * first tab if the id doesn't match any of them.
   */
  initialTabId?: string;
  /**
   * Shown at the right-hand end of the strip, opposite the tabs: what the card
   * is currently pointed at, where that is not something the tabs themselves
   * say — which channel is being edited, how much of a pattern is on. Outside
   * the tablist, since it is neither a tab nor selectable.
   */
  aside?: React.ReactNode;
  /**
   * Where the strip is standing. "rail" (the default) sits loose in a sidebar
   * or a dialog; "panel" is the header of a bordered card. The tabs themselves
   * are drawn the same either way — only what surrounds them differs.
   */
  variant?: "rail" | "panel";
};

/*
 * A tab is its label and a rule under the one you are on — no pill, no fill.
 * The strip's own hairline runs the width of the card, and the selected tab's
 * border is pulled down onto it by `-mb-px` so the amber replaces that stretch
 * of the rule rather than sitting a pixel above it.
 */
const TAB_BUTTON_CLASS =
  "-mb-px shrink-0 border-b border-transparent pb-2.5 text-[11px] font-medium tracking-[0.09em] uppercase transition-colors";

// "rail" sits loose in a sidebar or a dialog, where the strip only has to
// separate itself from the panel below it. "panel" is the header of a bordered
// card, so its strip carries that card's own padding.
const CONTAINER_CLASS: Record<"rail" | "panel", string> = {
  rail: "flex flex-col gap-4",
  panel: "border-line flex flex-col rounded-md border",
};

const TABLIST_CLASS: Record<"rail" | "panel", string> = {
  rail: "border-line border-b",
  panel: "border-line border-b px-4 pt-3.5",
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
export default function RailTabs({
  id,
  label,
  tabs,
  initialTabId,
  aside,
  variant = "rail",
}: RailTabsProps) {
  const [activeId, setActiveId] = useState(
    tabs.find((tab) => tab.id === initialTabId)?.id ?? tabs[0].id,
  );
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
    <section id={id} className={CONTAINER_CLASS[variant]}>
      <div
        className={`flex items-end justify-between gap-4 ${TABLIST_CLASS[variant]}`}
      >
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className="flex gap-4 sm:gap-5"
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
                className={`${TAB_BUTTON_CLASS} ${
                  isActive
                    ? "border-accent text-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {aside && <div className="shrink-0 pb-2.5">{aside}</div>}
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
