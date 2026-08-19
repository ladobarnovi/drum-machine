"use client";

import type { MidiLearnMenuState } from "@/hooks/useMidiLearnMenu";

type MidiBadgeProps = {
  /** What the control is called, for the badge's own accessible name. */
  label: string;
  menu: MidiLearnMenuState;
};

/**
 * A mapped control's MIDI dot: solid once bound, pulsing while listening for
 * the CC that will bind it. Absent otherwise, so a control that has never been
 * mapped looks exactly as it always has.
 *
 * A button rather than the mark it used to be. The dot was already the one
 * place a binding was visible on the panel; making it the way in to the menu
 * means the binding can also be reached without a right button — which is the
 * whole of what a touch screen has to work with.
 *
 * Six pixels of dot inside a twenty-four pixel target: the negative margin
 * keeps the row spaced as though the dot were still the only thing here, while
 * the press has somewhere to land.
 */
export default function MidiBadge({ label, menu }: MidiBadgeProps) {
  const { control, onBadgeClick, title } = menu;

  return (
    <button
      type="button"
      onClick={onBadgeClick}
      title={title}
      aria-label={
        control.isLearning
          ? `${label}: listening for a MIDI CC`
          : `${label}: mapped to MIDI CC ${control.cc}`
      }
      className="-m-1.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full"
    >
      <span
        aria-hidden
        className={`bg-accent block size-1.5 rounded-full ${
          control.isLearning ? "animate-pulse" : ""
        }`}
      />
    </button>
  );
}
