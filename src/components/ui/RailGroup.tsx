"use client";

type RailGroupProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Labelled band in one of the side rails. The controls rail carries several of
 * them — the transport, the kit, the settings — so they read as distinct kinds
 * of thing rather than one undifferentiated stack.
 *
 * The effects rail reaches for `RailTabs` instead: it carries enough stages
 * that stacking them all would make the lower ones a scroll away, and what
 * sits inside those tabs is boxed by `MasterFxSection` rather than banded.
 */
export default function RailGroup({ title, children }: RailGroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted text-[10px] font-semibold tracking-wide uppercase">
        {title}
      </h2>

      {children}
    </section>
  );
}
