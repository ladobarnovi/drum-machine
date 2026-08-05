"use client";

type MasterFxSectionProps = {
  title: string;
  /** Names the bypass button on its own, e.g. "Master drive". */
  toggleLabel: string;
  /** Keyboard shortcut for the bypass button, e.g. "Ctrl+F", shown as a tooltip. */
  shortcut?: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

/**
 * One stage of the master chain, boxed so the rail reads as a series of
 * separate stages rather than one long column of sliders. Stages are rendered
 * in signal-chain order, so the box that sits lower is heard later.
 *
 * The toggle bypasses the whole stage. Its controls stay live while bypassed,
 * so a setting can be dialled in before it is switched in.
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
      <div className="flex items-center justify-between">
        {/*
          Top level within its rail, like the group headings on the other one:
          the boxes now sit directly in a tab panel, which is named by its tab
          rather than by a heading of its own.
        */}
        <h2 className="text-xs font-semibold">{title}</h2>

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
      </div>

      {children}
    </section>
  );
}
