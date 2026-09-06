"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";

/** A rule between groups of actions. */
const DIVIDER = "divider" as const;

export type ActionMenuItem =
  | typeof DIVIDER
  | {
      label: string;
      /** Greyed out and unselectable — there is nothing for it to act on. */
      disabled?: boolean;
      onSelect: () => void;
    };

type ActionMenuProps = {
  /** Where the triggering click landed, in viewport coordinates. */
  x: number;
  y: number;
  /** Read by screen readers; names what the menu belongs to. */
  label: string;
  onClose: () => void;
  /** Widens the panel for menus with longer item labels. */
  width?: string;
  items: ActionMenuItem[];
};

const DIVIDER_CLASS = "border-line my-0.5 border-t";

/**
 * A right-click menu as a list of actions.
 *
 * The four menus in the app — step, channel, pattern, scene — each spelled
 * their items out as markup and each carried the same helper to close after
 * acting. Choosing something from a menu always dismisses it, so that belongs
 * here rather than in every item's handler.
 */
export default function ActionMenu({
  x,
  y,
  label,
  onClose,
  width,
  items,
}: ActionMenuProps) {
  return (
    <ContextMenu x={x} y={y} label={label} onClose={onClose} width={width}>
      {items.map((item, index) =>
        item === DIVIDER ? (
          <div key={index} className={DIVIDER_CLASS} aria-hidden />
        ) : (
          <ContextMenuItem
            key={index}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            {item.label}
          </ContextMenuItem>
        ),
      )}
    </ContextMenu>
  );
}
