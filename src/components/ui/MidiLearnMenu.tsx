"use client";

import ContextMenu from "@/components/ui/ContextMenu";
import ContextMenuItem from "@/components/ui/ContextMenuItem";
import type { MidiLearnMenuState } from "@/hooks/useMidiLearnMenu";

type MidiLearnMenuProps = {
  /** What the control is called, so the menu says which one it belongs to. */
  label: string;
  menu: MidiLearnMenuState;
  /**
   * Rerolls the control's parameter across every active step. Appended below
   * the MIDI items rather than opening a menu of its own — the control has
   * one right click to give, and MIDI mapping and randomizing are both things
   * done to it rather than through it, so one menu naming both is a shorter
   * reach than a second gesture to discover. Left undefined for a control
   * nothing can lock, where the divider and the item are both dropped.
   */
  onRandomize?: () => void;
};

/**
 * The MIDI options for one control: take the next CC that arrives, or drop
 * the one already bound.
 *
 * Two items rather than one gesture that decides for itself, which is what
 * this replaced — see `useMidiLearnMenu`. Clearing is named and sits apart
 * from learning, so unmapping is something chosen off a list rather than
 * something that happens to a control already mapped.
 *
 * Renders nothing while the menu is closed, so a caller can hand it the hook's
 * state unconditionally.
 */
export default function MidiLearnMenu({
  label,
  menu,
  onRandomize,
}: MidiLearnMenuProps) {
  const { control, position, close } = menu;
  if (!position) return null;

  /** Every item closes the menu: each one ends the errand it was opened for. */
  const run = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <ContextMenu
      x={position.x}
      y={position.y}
      label={`MIDI options for ${label}`}
      onClose={close}
      width="w-44"
    >
      {control.isLearning ? (
        <ContextMenuItem onClick={run(control.cancelLearn)}>
          Stop listening
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={run(control.startLearn)}>
          {control.cc === null ? "Learn MIDI CC" : "Learn a new CC"}
        </ContextMenuItem>
      )}

      {/* Held in the menu rather than dropped from it when there is nothing
          to clear, so the two items keep their places and the one that throws
          a binding away is never where the eye expects the other. */}
      <ContextMenuItem
        onClick={run(control.clearBinding)}
        disabled={control.cc === null}
      >
        {control.cc === null ? "Clear mapping" : `Clear CC ${control.cc}`}
      </ContextMenuItem>

      {onRandomize && (
        <>
          <div className="border-line my-0.5 border-t" aria-hidden />

          <ContextMenuItem onClick={run(onRandomize)}>
            Randomize
          </ContextMenuItem>
        </>
      )}
    </ContextMenu>
  );
}
