"use client";

import { useEffect, useRef, useState } from "react";

import { useMidiCcBindings } from "@/hooks/useMidiCcBindings";
import {
  clearAllMidiCcBindings,
  clearMidiCcBinding,
  stopMidiLearn,
} from "@/lib/midiCcMap";
import { midiMapLabel } from "@/lib/midiParameters";

export type MidiMappingsSettings = {
  /**
   * What each channel is currently called, keyed by channel id, so a binding
   * reads "Kick · HPF" rather than "channel-1 · HPF". Renaming a channel
   * renames its rows here with it.
   */
  channelNames: Record<string, string>;
};

/**
 * How long "Clear all" stays armed before it goes back to being an ordinary
 * button — long enough to mean it, short enough that a button left armed
 * across a distraction has disarmed itself by the time it is passed again.
 */
const ARMED_MS = 4000;

/**
 * Every CC this machine answers to, in one list.
 *
 * The bindings were only ever visible on the controls themselves, one dot at a
 * time, and only on whichever panel, tab and channel happened to be open —
 * which made "what is my controller actually driving?" a question you answered
 * by hovering forty sliders. A mapping you cannot find is a mapping you cannot
 * change, so they are gathered here where the devices are chosen, and each row
 * can drop its own.
 *
 * Sorted by CC rather than by parameter, because the controller is the thing
 * in front of you: the question asked here is almost always "what does this
 * knob do", and knobs are numbered.
 */
export default function MidiMappingsPanel({
  channelNames,
}: MidiMappingsSettings) {
  const { map, learningMapId } = useMidiCcBindings();
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropped on unmount, so a pending disarm can't set state on a button that
  // has gone with the dialog.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const disarm = () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setArmed(false);
  };

  /**
   * Two presses rather than one: this is the only control in the machine that
   * throws away every binding at once, and nothing here can be undone.
   */
  const handleClearAll = () => {
    if (armed) {
      clearAllMidiCcBindings();
      disarm();
      return;
    }

    setArmed(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setArmed(false), ARMED_MS);
  };

  const rows = Object.entries(map)
    .map(([mapId, cc]) => ({
      mapId,
      cc,
      label: midiMapLabel(mapId, channelNames),
    }))
    .sort((a, b) => a.cc - b.cc);

  return (
    <>
      {/*
        First, because while it is showing it is the only thing here that is
        about to change: the next CC to arrive lands on whatever is listening,
        and the list below is a picture of a moment that is already over.
      */}
      {learningMapId !== null && (
        <div className="border-accent flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
          <span
            aria-hidden
            className="bg-accent size-1.5 animate-pulse rounded-full"
          />
          <span className="min-w-0 flex-1 truncate">
            Listening for a CC — {midiMapLabel(learningMapId, channelNames)}
          </span>
          <button
            type="button"
            onClick={stopMidiLearn}
            className="border-edge hover:bg-raised shrink-0 cursor-pointer rounded border px-2 py-0.5 font-medium transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted text-xs">
          Nothing mapped yet. Right-click any slider or knob and choose
          &ldquo;Learn MIDI CC&rdquo;, then move the control you want it to
          follow.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {rows.map(({ mapId, cc, label }) => (
              <li
                key={mapId}
                className="border-line flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
              >
                <span className="text-muted w-12 shrink-0 tabular-nums">
                  CC {cc}
                </span>
                <span className="min-w-0 flex-1 truncate" title={label}>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => clearMidiCcBinding(mapId)}
                  aria-label={`Clear the MIDI mapping for ${label}`}
                  title={`Clear the MIDI mapping for ${label}`}
                  className="text-muted hover:bg-raised hover:text-fg flex size-6 shrink-0 cursor-pointer items-center justify-center rounded leading-none transition-colors"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted text-xs">
              {rows.length === 1 ? "1 mapping" : `${rows.length} mappings`}
            </p>

            <button
              type="button"
              onClick={handleClearAll}
              onBlur={disarm}
              className={`shrink-0 cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                armed
                  ? "border-danger text-danger"
                  : "border-edge hover:bg-raised"
              }`}
            >
              {armed ? "Clear all — press again" : "Clear all"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
