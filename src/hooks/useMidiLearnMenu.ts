"use client";

import { useCallback, useState, type MouseEvent } from "react";

import {
  useMidiLearnControl,
  type MidiLearnControl,
} from "@/hooks/useMidiLearnControl";

/** Where a menu was raised, in viewport coordinates. */
export type MidiMenuPosition = { x: number; y: number };

export type MidiLearnMenuState = {
  control: MidiLearnControl;
  /** Where the menu is open, or null while it is closed. */
  position: MidiMenuPosition | null;
  /** A right click on the control: raises the menu at the pointer. */
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  /** A click on the control's MIDI badge: raises the menu under it. */
  onBadgeClick: (event: MouseEvent<HTMLElement>) => void;
  close: () => void;
  /** Whether this control has a binding worth drawing a badge for. */
  showBadge: boolean;
  /** The control's tooltip: what is bound, and how to get at it. */
  title: string;
};

/**
 * The MIDI menu a mappable control raises, and the state of the binding it
 * shows.
 *
 * A menu rather than the bare right click this replaced. That gesture did all
 * three things by itself — map, cancel, unmap — picking whichever the control
 * happened to be ready for, which made the same movement of the same finger
 * mean "bind this" one moment and "throw the binding away" the next. Naming
 * the two apart costs a click and is the difference between an action chosen
 * and an action guessed at, on a change nothing on the page can undo.
 *
 * The badge is the second way in, for a pointer that has no right button:
 * once a control is mapped its dot is a button onto this same menu, so a
 * mapping made at a desk can still be found and cleared on a phone.
 *
 * Returns null while `mapId` is undefined, matching `useMidiLearnControl`, so
 * a widget can pass its optional map id straight through whether or not this
 * particular instance is mappable at all.
 */
export function useMidiLearnMenu(
  mapId: string | undefined,
): MidiLearnMenuState | null {
  const control = useMidiLearnControl(mapId);
  const [position, setPosition] = useState<MidiMenuPosition | null>(null);

  const close = useCallback(() => setPosition(null), []);

  const onContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const onBadgeClick = useCallback((event: MouseEvent<HTMLElement>) => {
    // Both stopped on purpose. The badge sits inside the `<label>` that wraps
    // a slider, and a click left to run its course there would be forwarded on
    // to the input as if the track itself had been clicked.
    event.preventDefault();
    event.stopPropagation();

    // Under the dot rather than at the pointer, so the menu reads as belonging
    // to the badge that opened it however the badge was reached — a keyboard
    // press reports no useful coordinates of its own.
    const { left, bottom } = event.currentTarget.getBoundingClientRect();
    setPosition({ x: left, y: bottom + 4 });
  }, []);

  if (!control) return null;

  return {
    control,
    position,
    onContextMenu,
    onBadgeClick,
    close,
    showBadge: control.cc !== null || control.isLearning,
    title: control.isLearning
      ? "Listening for a MIDI CC…"
      : control.cc !== null
        ? `Mapped to MIDI CC ${control.cc} — right-click for options`
        : "Right-click to map a MIDI CC",
  };
}
