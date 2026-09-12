"use client";

import Switch from "@/components/ui/Switch";

/**
 * The bypass switch is all-or-nothing: a stage that can be switched out needs
 * every one of these, and one that can't — the output fader — takes none of
 * them. Spelt as a union rather than four loose optionals so a stage can't be
 * written with an `enabled` that nothing can toggle.
 */
type MasterFxSectionToggle =
  | {
      /** Names the bypass switch on its own, e.g. "Master drive". */
      toggleLabel: string;
      /** Keyboard shortcut for the bypass switch, e.g. "Ctrl+F", shown beside it. */
      shortcut?: string;
      enabled: boolean;
      onToggle: () => void;
    }
  | {
      toggleLabel?: never;
      shortcut?: never;
      enabled?: never;
      onToggle?: never;
    };

type MasterFxSectionProps = {
  title: string;
  children: React.ReactNode;
} & MasterFxSectionToggle;

/**
 * One stage of the master chain, boxed so the rail reads as a series of
 * separate stages rather than one long column of sliders. Stages are rendered
 * in signal-chain order, so the box that sits lower is heard later.
 *
 * The toggle bypasses the whole stage. Its controls stay live while bypassed,
 * so a setting can be dialled in before it is switched in. It is optional: the
 * output fader at the foot of the tab is part of the same chain and wears the
 * same box, but there is no version of the mix with the volume switched out,
 * so its header carries the title alone.
 */
export default function MasterFxSection({
  title,
  toggleLabel,
  shortcut,
  enabled,
  onToggle,
  children,
}: MasterFxSectionProps) {
  return (
    <section className="border-line flex flex-col gap-3 rounded-md border p-3">
      {/*
        Kept even with nothing on the right of it, so every box in the tab has
        its title on the same line at the same weight — a heading that shifted
        up by the height of a button on the one section without one would read
        as a different kind of thing rather than as the last stage. `min-h`
        holds the row open to the bypass switch's own height, so the title keeps
        the boxes' rhythm whether or not there is a switch beside it.
      */}
      <div className="flex min-h-5 items-center justify-between">
        {/*
          Top level within its rail, like the group headings on the other one:
          the boxes now sit directly in a tab panel, which is named by its tab
          rather than by a heading of its own.
        */}
        <h2 className="font-serif text-lg leading-none">{title}</h2>

        {onToggle && (
          <div className="flex items-center gap-2">
            {/* The key, beside the switch it works rather than only in the
                shortcut list, since this is the one control on the rail worth
                reaching for without the mouse mid-take. */}
            {shortcut && (
              <span className="text-muted font-mono text-[10px]">
                {shortcut}
              </span>
            )}

            {/* A switch rather than a button reading "On": whether a stage is
                in the signal is a flag, and the track-and-thumb shape says
                which way it is set without the word having to be read. */}
            <Switch
              checked={enabled ?? false}
              label={toggleLabel ?? ""}
              title={shortcut ? `${toggleLabel} (${shortcut})` : toggleLabel}
              size="md"
              onChange={onToggle}
            />
          </div>
        )}
      </div>

      {children}
    </section>
  );
}
