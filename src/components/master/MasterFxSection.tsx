"use client";

/**
 * The bypass button is all-or-nothing: a stage that can be switched out needs
 * every one of these, and one that can't — the output fader — takes none of
 * them. Spelt as a union rather than four loose optionals so a stage can't be
 * written with an `enabled` that nothing can toggle.
 */
type MasterFxSectionToggle =
  | {
      /** Names the bypass button on its own, e.g. "Master drive". */
      toggleLabel: string;
      /** Keyboard shortcut for the bypass button, e.g. "Ctrl+F", shown as a tooltip. */
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
        as a different kind of thing rather than as the last stage.
      */}
      <div className="flex items-center justify-between">
        {/*
          Top level within its rail, like the group headings on the other one:
          the boxes now sit directly in a tab panel, which is named by its tab
          rather than by a heading of its own.
        */}
        <h2 className="text-xs font-semibold">{title}</h2>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={enabled}
            aria-label={toggleLabel}
            title={shortcut ? `${toggleLabel} (${shortcut})` : toggleLabel}
            className={`rounded border px-2 py-0.5 text-[10px] leading-4 font-semibold transition-colors ${
              enabled
                ? "border-accent bg-accent text-on-accent"
                : "border-edge text-muted hover:bg-raised"
            }`}
          >
            {enabled ? "On" : "Off"}
          </button>
        )}
      </div>

      {children}
    </section>
  );
}
