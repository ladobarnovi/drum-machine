"use client";

import MidiBadge from "@/components/ui/MidiBadge";
import MidiLearnMenu from "@/components/ui/MidiLearnMenu";
import { useMidiLearnMenu } from "@/hooks/useMidiLearnMenu";
import { clamp } from "@/lib/sequencer";

type ControlSliderProps = {
  label: string;
  /** Spelt out for screen readers where the visible label is a shorthand. */
  ariaLabel?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Formatted readout, e.g. "1.2 kHz" or "40%". */
  readout: string;
  onChange: (value: number) => void;
  /**
   * Whether this control is overridden on the step being edited. Only ever set
   * while a step is open.
   */
  locked?: boolean;
  /**
   * Drops that override. Passing it reserves the button's place beside the
   * readout, so a column of sliders keeps its rhythm whether or not any of
   * them happen to be locked — pass it to all of them or to none.
   */
  onClearLock?: () => void;
  /**
   * Shown rather than hidden, so a panel keeps its count and its layout even
   * where one control has nothing to set — a channel with no slices to
   * position a hit within, say.
   */
  disabled?: boolean;
  /**
   * This slider's identity in the MIDI CC map (see `lib/midiCcMap`). Left
   * undefined, the row has no MIDI behaviour at all — right-click does
   * nothing special, and it renders exactly as it always has.
   */
  midiMapId?: string;
  /**
   * Rerolls this parameter across every active step, offered in the same
   * right-click menu as the MIDI options. Left undefined for a control nothing
   * can lock — Start and End, say — where there is no per-step value for a
   * random one to mean anything.
   */
  onRandomize?: () => void;
  /**
   * Drops every override of this parameter, pattern-wide — the undo for
   * `onRandomize`, and for a lock set by hand on any step. Distinct from
   * `onClearLock` above: that one is the × beside the readout, and only ever
   * clears the single step currently open for editing.
   */
  onClearLocks?: () => void;
};

/**
 * Where the lit stretch of track starts and ends, as the two percentages the
 * stylesheet paints its gradient between.
 *
 * A control that runs through zero — pan, pitch — is lit from the centre out,
 * so the fill says how far from nothing the value is rather than how far from
 * the left edge. Everything else fills from its own start, where the left edge
 * *is* nothing.
 */
export function fillBounds(value: number, min: number, max: number) {
  const range = max - min;
  if (range <= 0) return { start: 0, end: 0 };

  const fraction = (clamp(value, min, max) - min) / range;
  const origin = min < 0 && max > 0 ? -min / range : 0;

  return {
    start: Math.min(origin, fraction) * 100,
    end: Math.max(origin, fraction) * 100,
  };
}

/**
 * One parameter of the machine: its name, what it is set to, and a hairline of
 * track under the two. Every control that takes a number wears this — the
 * channel's own parameters and the master rail's stages alike — so a value is
 * set the same way wherever it is met.
 *
 * A real `<input type="range">` rather than a div with the slider role: the
 * keyboard, the drag and the announcement all come with it, and the design's
 * track is thin enough to be a matter of paint rather than of geometry (see
 * the range block in `globals.css`).
 */
export default function ControlSlider({
  label,
  ariaLabel,
  min,
  max,
  step,
  value,
  readout,
  locked = false,
  onClearLock,
  disabled = false,
  midiMapId,
  onChange,
  onRandomize,
  onClearLocks,
}: ControlSliderProps) {
  const midiMenu = useMidiLearnMenu(midiMapId);
  const fill = fillBounds(value, min, max);

  return (
    <>
      <label
        onContextMenu={midiMenu?.onContextMenu}
        title={midiMenu?.title}
        className={`flex flex-col gap-1 ${disabled ? "opacity-40" : ""}`}
      >
        <span className="flex items-baseline justify-between gap-2">
          {/* Locked labels take the colour of what is being looked at, so an
              overridden row can be picked out of the panel at a glance. */}
          <span
            className={`flex items-center gap-1 text-[10px] tracking-[0.11em] uppercase ${
              locked ? "text-select" : "text-muted"
            }`}
          >
            {label}

            {midiMenu?.showBadge && (
              <MidiBadge label={ariaLabel ?? label} menu={midiMenu} />
            )}
          </span>

          <span className="flex items-center gap-0.5">
            <span className="font-mono text-xs tabular-nums">{readout}</span>

            {!disabled && onClearLock && locked && (
              <button
                type="button"
                onClick={onClearLock}
                aria-label={`Clear ${label} lock`}
                title={`Clear ${label} lock`}
                className="text-select hover:bg-raised rounded px-0.5 text-[10px] leading-none"
              >
                ×
              </button>
            )}
          </span>
        </span>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={ariaLabel ?? label}
          // The readout, not the raw number underneath it: several of these
          // travel on a 0..1 position rather than in the unit they display, so
          // a screen reader left to announce `value` would say "0.62" for a
          // cutoff the panel is calling 1.2 kHz. Same string either way.
          aria-valuetext={readout}
          style={
            {
              "--fill-start": `${fill.start}%`,
              "--fill-end": `${fill.end}%`,
            } as React.CSSProperties
          }
        />
      </label>

      {/* Outside the label on purpose: a click on a menu item within one would
          be forwarded to the slider as though the track had been clicked. */}
      {midiMenu && (
        <MidiLearnMenu
          label={ariaLabel ?? label}
          menu={midiMenu}
          onRandomize={onRandomize}
          onClearLocks={onClearLocks}
        />
      )}
    </>
  );
}
