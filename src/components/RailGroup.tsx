"use client";

type RailGroupProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Labelled band in one of the side rails. The rails carry several of them — the
 * send buses channels feed by choice, the stages the whole mix passes through
 * whether it likes it or not, and the transport on the other side — so the boxes
 * read as distinct kinds of thing rather than one undifferentiated stack.
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
